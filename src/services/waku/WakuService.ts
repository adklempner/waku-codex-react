import { createLightNode, waitForRemotePeer, createEncoder, createDecoder, Protocols } from '@waku/sdk';
import type { LightNode } from '@waku/sdk';
import { TypedEventEmitter } from '@/utils/TypedEventEmitter';
import {
  IWakuService,
  WakuConfig,
  ServiceStatus,
  ServiceEvents,
  MessageProtocol,
  PeerInfo,
  WakuError,
} from '@/types';
import {
  DEFAULT_BOOTSTRAP_NODES,
  DEFAULT_NETWORK_CONFIG,
  PEER_CHECK_INTERVAL,
  PEER_DISCOVERY_TIMEOUT,
} from './constants';

export class WakuService extends TypedEventEmitter<ServiceEvents> implements IWakuService {
  private node: LightNode | null = null;
  private _status: ServiceStatus = 'idle';
  private config: WakuConfig;
  private peerCheckInterval?: NodeJS.Timeout;
  private subscriptions = new Map<string, () => void>();

  constructor(config: Partial<WakuConfig> = {}) {
    super();
    this.config = {
      id: config.id || 'waku-service',
      debug: config.debug || false,
      bootstrap: config.bootstrap || DEFAULT_BOOTSTRAP_NODES,
      protocols: config.protocols || ['filter', 'light-push'],
      networkConfig: config.networkConfig || DEFAULT_NETWORK_CONFIG,
      contentTopic: config.contentTopic,
    };
  }

  get id(): string {
    return this.config.id!;
  }

  get status(): ServiceStatus {
    return this._status;
  }

  get nodeId(): string | undefined {
    return this.node?.libp2p.peerId.toString();
  }

  get peers(): number {
    if (!this.node) return 0;
    return this.node.libp2p.getConnections().length;
  }

  async connect(): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    try {
      this.setStatus('connecting');

      // Create light node
      this.node = await createLightNode({
        networkConfig: this.config.networkConfig,
        defaultBootstrap: false,
      });

      await this.node.start();

      // Connect to bootstrap nodes
      await this.connectToBootstrapNodes();

      // Wait for peers
      await this.waitForPeers();

      // Start peer monitoring
      this.startPeerMonitoring();

      this.setStatus('connected');
      this.emit('connect');
    } catch (error) {
      this.handleError(error as Error, 'CONNECTION_FAILED');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this._status === 'disconnected' || this._status === 'idle') {
      return;
    }

    try {
      // Clear subscriptions
      this.subscriptions.forEach(unsubscribe => unsubscribe());
      this.subscriptions.clear();

      // Stop peer monitoring
      if (this.peerCheckInterval) {
        clearInterval(this.peerCheckInterval);
        this.peerCheckInterval = undefined;
      }

      // Stop node
      if (this.node) {
        await this.node.stop();
        this.node = null;
      }

      this.setStatus('disconnected');
      this.emit('disconnect');
    } catch (error) {
      this.handleError(error as Error, 'DISCONNECT_FAILED');
      throw error;
    }
  }

  isConnected(): boolean {
    return this._status === 'connected' && this.node !== null;
  }

  async subscribe<T>(
    topic: string,
    protocol: MessageProtocol<T>,
    handler: (message: T) => void
  ): Promise<() => void> {
    if (!this.isConnected() || !this.node) {
      throw new WakuError('Not connected to Waku network', 'NOT_CONNECTED');
    }

    try {
      const decoder = createDecoder(protocol.contentTopic);
      
      const messageHandler = (wakuMessage: any) => {
        if (!wakuMessage.payload) return;

        try {
          const decoded = protocol.decode(wakuMessage.payload);
          if (protocol.validate(decoded)) {
            handler(decoded);
          } else if (this.config.debug) {
            console.warn('Invalid message received:', decoded);
          }
        } catch (error) {
          if (this.config.debug) {
            console.error('Error decoding message:', error);
          }
        }
      };

      const result = await this.node.filter.subscribe([decoder], messageHandler);

      if (!result.subscription || result.error) {
        throw new WakuError(
          'Failed to create subscription',
          'SUBSCRIBE_FAILED',
          { error: result.error }
        );
      }

      const unsubscribe = async () => {
        await result.subscription.unsubscribeAll();
        this.subscriptions.delete(topic);
      };

      this.subscriptions.set(topic, unsubscribe);
      return unsubscribe;
    } catch (error) {
      throw new WakuError(
        'Failed to subscribe to topic',
        'SUBSCRIBE_FAILED',
        { topic, error }
      );
    }
  }

  async publish<T>(
    topic: string,
    protocol: MessageProtocol<T>,
    message: T
  ): Promise<void> {
    if (!this.isConnected() || !this.node) {
      throw new WakuError('Not connected to Waku network', 'NOT_CONNECTED');
    }

    if (!protocol.validate(message)) {
      throw new WakuError('Invalid message format', 'INVALID_MESSAGE');
    }

    try {
      const encoder = createEncoder({
        contentTopic: protocol.contentTopic,
        ephemeral: true,
      });

      const payload = protocol.encode(message);

      await this.node.lightPush.send(encoder, { payload });
    } catch (error) {
      throw new WakuError(
        'Failed to publish message',
        'PUBLISH_FAILED',
        { topic, error }
      );
    }
  }

  async getPeers(): Promise<PeerInfo[]> {
    if (!this.node) return [];

    const connections = this.node.libp2p.getConnections();
    
    return connections.map(conn => ({
      id: conn.remotePeer.toString(),
      protocols: conn.remoteAddr.protoNames() || [],
      connected: conn.status === 'open',
    }));
  }

  private async connectToBootstrapNodes(): Promise<void> {
    if (!this.node) return;

    let connected = false;
    const errors: Error[] = [];

    for (const peer of this.config.bootstrap) {
      try {
        await this.node.dial(peer);
        connected = true;
        if (this.config.debug) {
          console.log(`Connected to bootstrap node: ${peer}`);
        }
        break;
      } catch (error) {
        errors.push(error as Error);
        if (this.config.debug) {
          console.warn(`Failed to connect to ${peer}:`, error);
        }
      }
    }

    if (!connected) {
      throw new WakuError(
        'Failed to connect to any bootstrap node',
        'BOOTSTRAP_FAILED',
        { errors }
      );
    }
  }

  private async waitForPeers(): Promise<void> {
    if (!this.node) return;

    try {
      await waitForRemotePeer(
        this.node,
        [Protocols.LightPush, Protocols.Filter],
        PEER_DISCOVERY_TIMEOUT
      );
    } catch (error) {
      throw new WakuError(
        'Failed to find peers',
        'PEER_DISCOVERY_FAILED',
        { error }
      );
    }
  }

  private startPeerMonitoring(): void {
    this.peerCheckInterval = setInterval(() => {
      if (!this.node) return;

      const peerCount = this.peers;
      
      if (peerCount === 0 && this._status === 'connected') {
        this.handleError(
          new Error('Lost connection to all peers'),
          'PEERS_LOST'
        );
        // Attempt reconnection
        this.attemptReconnection();
      }

      if (this.config.debug) {
        console.log(`Peer count: ${peerCount}`);
      }
    }, PEER_CHECK_INTERVAL);
  }

  private async attemptReconnection(): Promise<void> {
    try {
      await this.connectToBootstrapNodes();
      await this.waitForPeers();
      this.setStatus('connected');
    } catch (error) {
      this.handleError(error as Error, 'RECONNECTION_FAILED');
    }
  }

  private setStatus(status: ServiceStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.emit('statusChange', status);
    }
  }

  private handleError(error: Error, code: string): void {
    const wakuError = error instanceof WakuError
      ? error
      : new WakuError(error.message, code, { originalError: error });

    this.setStatus('error');
    this.emit('error', wakuError);

    if (this.config.debug) {
      console.error(`[WakuService] ${code}:`, error);
    }
  }
}