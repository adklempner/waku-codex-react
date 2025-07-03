import axios, { AxiosInstance } from 'axios';
import { TypedEventEmitter } from '@/utils/TypedEventEmitter';
import {
  ICodexService,
  CodexConfig,
  ServiceStatus,
  ServiceEvents,
  NodeInfo,
  UploadOptions,
  UploadResult,
  DownloadOptions,
  DownloadResult,
  CodexError,
} from '@/types';
import {
  DEFAULT_LOCAL_ENDPOINT,
  DEFAULT_TIMEOUT,
  STATUS_CACHE_DURATION,
  CODEX_API_PATHS,
} from './constants';

export class CodexService extends TypedEventEmitter<ServiceEvents> implements ICodexService {
  private client: AxiosInstance;
  private _status: ServiceStatus = 'idle';
  private config: CodexConfig;
  private _nodeInfo?: NodeInfo;
  private lastStatusCheck: Date | null = null;
  private lastNodeActive = false;

  constructor(config: Partial<CodexConfig> = {}) {
    super();
    this.config = {
      id: config.id || 'codex-service',
      debug: config.debug || false,
      endpoint: config.endpoint || DEFAULT_LOCAL_ENDPOINT,
      endpointType: config.endpointType || 'local',
      auth: config.auth,
      timeout: config.timeout || DEFAULT_TIMEOUT,
    };

    this.client = this.createClient();
  }

  get id(): string {
    return this.config.id!;
  }

  get status(): ServiceStatus {
    return this._status;
  }

  get nodeInfo(): NodeInfo | undefined {
    return this._nodeInfo;
  }

  get endpointType(): 'local' | 'remote' {
    return this.config.endpointType;
  }

  async connect(): Promise<void> {
    if (this._status === 'connected' || this._status === 'connecting') {
      return;
    }

    try {
      this.setStatus('connecting');

      // Check node health
      const isHealthy = await this.checkHealth();
      if (!isHealthy) {
        throw new CodexError('Codex node is not healthy', 'NODE_UNHEALTHY');
      }

      // Get node info
      this._nodeInfo = await this.getNodeInfo();

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

    this.setStatus('disconnected');
    this.emit('disconnect');
  }

  isConnected(): boolean {
    return this._status === 'connected';
  }

  async upload(file: File, options?: UploadOptions): Promise<UploadResult> {
    if (!this.isConnected()) {
      throw new CodexError('Not connected to Codex node', 'NOT_CONNECTED');
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Progress tracking
      if (options?.onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            options.onProgress!(percentComplete);
          }
        };
      }

      // Handle completion
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const result = this.parseUploadResponse(xhr.responseText);
            resolve(result);
          } catch (error) {
            reject(new CodexError(
              'Failed to parse upload response',
              'PARSE_ERROR',
              { response: xhr.responseText, error }
            ));
          }
        } else {
          reject(new CodexError(
            `Upload failed with status ${xhr.status}`,
            'UPLOAD_FAILED',
            { status: xhr.status, response: xhr.responseText }
          ));
        }
      };

      // Handle errors
      xhr.onerror = () => {
        reject(new CodexError('Network error during upload', 'NETWORK_ERROR'));
      };

      xhr.onabort = () => {
        reject(new CodexError('Upload aborted', 'UPLOAD_ABORTED'));
      };

      // Setup request
      xhr.open('POST', `${this.config.endpoint}${CODEX_API_PATHS.UPLOAD}`);
      
      // Add auth headers if needed
      if (this.config.auth && this.config.endpointType === 'remote') {
        const authString = btoa(`${this.config.auth.username}:${this.config.auth.password}`);
        xhr.setRequestHeader('Authorization', `Basic ${authString}`);
      }

      // Handle abort signal
      if (options?.signal) {
        options.signal.addEventListener('abort', () => xhr.abort());
      }

      // Send file
      xhr.send(file);
    });
  }

  async download(cid: string, options?: DownloadOptions): Promise<DownloadResult> {
    if (!this.isConnected()) {
      throw new CodexError('Not connected to Codex node', 'NOT_CONNECTED');
    }

    try {
      const response = await this.client.get(
        CODEX_API_PATHS.DOWNLOAD(cid),
        {
          responseType: 'arraybuffer',
          onDownloadProgress: options?.onProgress
            ? (progressEvent) => {
                if (progressEvent.total) {
                  const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
                  options.onProgress!(percentComplete);
                }
              }
            : undefined,
          signal: options?.signal,
        }
      );

      return {
        data: response.data,
        contentType: response.headers['content-type'],
        fileName: this.extractFileName(response.headers['content-disposition']),
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new CodexError(
          `Download failed: ${error.message}`,
          'DOWNLOAD_FAILED',
          { cid, error: error.response?.data }
        );
      }
      throw error;
    }
  }

  async getNodeInfo(): Promise<NodeInfo> {
    try {
      const response = await this.client.get(CODEX_API_PATHS.INFO);
      const data = response.data;

      return {
        id: data.id || data.peerId,
        version: data.version,
        revision: data.revision,
        codexVersion: data.codex?.version,
        addrs: data.addrs || data.addresses,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new CodexError(
          'Failed to get node info',
          'NODE_INFO_FAILED',
          { error: error.response?.data }
        );
      }
      throw error;
    }
  }

  async checkHealth(forceCheck = false): Promise<boolean> {
    // Use cache if available and not forcing
    if (!forceCheck && this.lastStatusCheck) {
      const timeSinceLastCheck = Date.now() - this.lastStatusCheck.getTime();
      if (timeSinceLastCheck < STATUS_CACHE_DURATION) {
        return this.lastNodeActive;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await this.client.get(CODEX_API_PATHS.INFO, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isActive = response.status === 200;
      this.lastNodeActive = isActive;
      this.lastStatusCheck = new Date();

      return isActive;
    } catch (error) {
      this.lastNodeActive = false;
      this.lastStatusCheck = new Date();
      return false;
    }
  }

  private createClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.endpoint,
      timeout: this.config.timeout,
      headers: {
        'Accept': 'application/json',
      },
    });

    // Add auth interceptor if needed
    if (this.config.auth && this.config.endpointType === 'remote') {
      client.interceptors.request.use((config) => {
        const authString = btoa(`${this.config.auth!.username}:${this.config.auth!.password}`);
        config.headers.Authorization = `Basic ${authString}`;
        return config;
      });
    }

    // Add debug logging if enabled
    if (this.config.debug) {
      client.interceptors.request.use((config) => {
        console.log(`[CodexService] Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      });

      client.interceptors.response.use(
        (response) => {
          console.log(`[CodexService] Response: ${response.status} ${response.config.url}`);
          return response;
        },
        (error) => {
          console.error(`[CodexService] Error: ${error.message}`);
          return Promise.reject(error);
        }
      );
    }

    return client;
  }

  private parseUploadResponse(responseText: string): UploadResult {
    try {
      const jsonResponse = JSON.parse(responseText);
      
      // Try different response formats
      const cid = jsonResponse.id || 
                  jsonResponse.cid || 
                  jsonResponse.data?.id || 
                  jsonResponse.data?.cid ||
                  responseText.trim();

      const size = jsonResponse.size || 
                   jsonResponse.data?.size || 
                   0;

      return { cid, size };
    } catch (error) {
      // Fallback to plain text response
      return {
        cid: responseText.trim(),
        size: 0,
      };
    }
  }

  private extractFileName(contentDisposition?: string): string | undefined {
    if (!contentDisposition) return undefined;

    const matches = /filename="?([^"]+)"?/.exec(contentDisposition);
    return matches?.[1];
  }

  private setStatus(status: ServiceStatus): void {
    if (this._status !== status) {
      this._status = status;
      this.emit('statusChange', status);
    }
  }

  private handleError(error: Error, code: string): void {
    const codexError = error instanceof CodexError
      ? error
      : new CodexError(error.message, code, { originalError: error });

    this.setStatus('error');
    this.emit('error', codexError);

    if (this.config.debug) {
      console.error(`[CodexService] ${code}:`, error);
    }
  }
}