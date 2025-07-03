import { IService, ServiceConfig, ServiceError } from './services';

export interface CodexConfig extends ServiceConfig {
  endpoint: string;
  endpointType: 'local' | 'remote';
  auth?: {
    username: string;
    password: string;
  };
  timeout?: number;
}

export interface NodeInfo {
  id: string;
  version: string;
  revision: string;
  codexVersion?: string;
  addrs?: string[];
}

export interface ICodexService extends IService {
  readonly nodeInfo?: NodeInfo;
  readonly endpointType: 'local' | 'remote';
  
  upload(
    file: File,
    options?: UploadOptions
  ): Promise<UploadResult>;
  
  download(
    cid: string,
    options?: DownloadOptions
  ): Promise<DownloadResult>;
  
  getNodeInfo(): Promise<NodeInfo>;
  checkHealth(): Promise<boolean>;
}

export interface UploadOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface UploadResult {
  cid: string;
  size: number;
}

export interface DownloadOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

export interface DownloadResult {
  data: ArrayBuffer;
  contentType?: string;
  fileName?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified?: number;
}

export class CodexError extends ServiceError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, 'codex', true, details);
  }
}