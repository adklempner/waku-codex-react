import { IService, ServiceConfig, ServiceError } from './services';

export interface WakuConfig extends ServiceConfig {
  bootstrap: string[];
  protocols: WakuProtocol[];
  networkConfig: {
    clusterId: number;
    shards: number[];
  };
  contentTopic?: string;
}

export type WakuProtocol = 'light-push' | 'filter' | 'store' | 'relay';

export interface PeerInfo {
  id: string;
  protocols: string[];
  connected: boolean;
}

export interface IWakuService extends IService {
  readonly nodeId?: string;
  readonly peers: number;
  
  subscribe<T>(
    topic: string,
    protocol: MessageProtocol<T>,
    handler: (message: T) => void
  ): Promise<() => void>;
  
  publish<T>(
    topic: string,
    protocol: MessageProtocol<T>,
    message: T
  ): Promise<void>;
  
  getPeers(): Promise<PeerInfo[]>;
}

export interface MessageProtocol<T> {
  readonly contentTopic: string;
  encode(message: T): Uint8Array;
  decode(data: Uint8Array): T;
  validate(message: unknown): message is T;
}

export abstract class BaseProtocol<T> implements MessageProtocol<T> {
  constructor(
    public readonly contentTopic: string,
    protected readonly validator: (msg: unknown) => msg is T
  ) {}
  
  abstract encode(message: T): Uint8Array;
  abstract decode(data: Uint8Array): T;
  
  validate(message: unknown): message is T {
    return this.validator(message);
  }
}

export class WakuError extends ServiceError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, 'waku', true, details);
  }
}