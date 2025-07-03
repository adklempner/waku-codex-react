# Core Abstractions and Interfaces

## Service Layer Interfaces

### Base Service Interface

```typescript
interface IService {
  readonly id: string;
  readonly status: ServiceStatus;
  
  connect(config?: ServiceConfig): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  on<E extends keyof ServiceEvents>(
    event: E, 
    handler: ServiceEvents[E]
  ): void;
  
  off<E extends keyof ServiceEvents>(
    event: E, 
    handler: ServiceEvents[E]
  ): void;
  
  emit<E extends keyof ServiceEvents>(
    event: E, 
    ...args: Parameters<ServiceEvents[E]>
  ): void;
}

type ServiceStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface ServiceEvents {
  statusChange: (status: ServiceStatus) => void;
  error: (error: ServiceError) => void;
  connect: () => void;
  disconnect: () => void;
}
```

### Waku Service Interface

```typescript
interface IWakuService extends IService {
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

interface WakuConfig extends ServiceConfig {
  bootstrap: string[];
  protocols: WakuProtocol[];
  networkConfig: {
    clusterID: number;
    shards: number[];
  };
}

interface PeerInfo {
  id: string;
  protocols: string[];
  connected: boolean;
}
```

### Codex Service Interface

```typescript
interface ICodexService extends IService {
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

interface CodexConfig extends ServiceConfig {
  endpoint: string;
  auth?: {
    username: string;
    password: string;
  };
  timeout?: number;
}

interface UploadOptions {
  onProgress?: (progress: number) => void;
  signal?: AbortSignal;
}

interface UploadResult {
  cid: string;
  size: number;
}
```

## Message Protocol Abstraction

```typescript
interface MessageProtocol<T> {
  readonly contentTopic: string;
  encode(message: T): Uint8Array;
  decode(data: Uint8Array): T;
  validate(message: unknown): message is T;
}

abstract class BaseProtocol<T> implements MessageProtocol<T> {
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
```

## Hook Abstractions

### Service Hook Factory

```typescript
interface ServiceHookResult<T extends IService> {
  service: T | null;
  status: ServiceStatus;
  error: Error | null;
  connect: (config?: Partial<ServiceConfig>) => Promise<void>;
  disconnect: () => Promise<void>;
}

function createServiceHook<T extends IService, C extends ServiceConfig>(
  serviceName: string,
  ServiceClass: new (config: C) => T,
  defaultConfig: C
): (config?: Partial<C>) => ServiceHookResult<T> {
  return function useService(overrides?: Partial<C>) {
    // Implementation
  };
}
```

### Async Operation Hook

```typescript
interface AsyncOperation<T, A extends any[] = []> {
  execute: (...args: A) => Promise<T>;
  data: T | null;
  loading: boolean;
  error: Error | null;
  reset: () => void;
}

function useAsyncOperation<T, A extends any[] = []>(
  operation: (...args: A) => Promise<T>,
  options?: AsyncOperationOptions
): AsyncOperation<T, A> {
  // Implementation with retry, debounce, etc.
}

interface AsyncOperationOptions {
  retry?: number;
  retryDelay?: number;
  debounce?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}
```

## Transfer Abstractions

### File Transfer Manager

```typescript
interface ITransferManager {
  upload(file: File, metadata?: FileMetadata): Promise<Transfer>;
  download(cid: string): Promise<Transfer>;
  getTransfer(id: string): Transfer | null;
  listTransfers(): Transfer[];
  cancelTransfer(id: string): void;
}

interface Transfer {
  id: string;
  type: 'upload' | 'download';
  status: TransferStatus;
  progress: number;
  file?: File;
  cid?: string;
  metadata?: FileMetadata;
  error?: Error;
}

type TransferStatus = 'pending' | 'active' | 'paused' | 'completed' | 'failed' | 'cancelled';

interface FileMetadata {
  name: string;
  size: number;
  type: string;
  encrypted?: boolean;
  [key: string]: any;
}
```

### Progress Tracking

```typescript
interface ProgressTracker {
  readonly progress: number;
  readonly total: number;
  readonly percentage: number;
  
  start(total: number): void;
  update(current: number): void;
  increment(amount?: number): void;
  complete(): void;
  reset(): void;
  
  subscribe(handler: ProgressHandler): () => void;
}

type ProgressHandler = (progress: ProgressInfo) => void;

interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
}
```

## Configuration Abstractions

### Configuration Schema

```typescript
interface AppConfig {
  services: {
    waku: WakuConfig;
    codex: CodexConfig;
  };
  features: FeatureFlags;
  debug: DebugConfig;
}

interface FeatureFlags {
  encryption: boolean;
  compression: boolean;
  analytics: boolean;
  [key: string]: boolean;
}

interface DebugConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  persistLogs: boolean;
  maxLogEntries: number;
}
```

### Configuration Provider

```typescript
interface IConfigProvider {
  get<K extends keyof AppConfig>(key: K): AppConfig[K];
  set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void;
  update(updates: Partial<AppConfig>): void;
  reset(): void;
  subscribe(handler: ConfigChangeHandler): () => void;
}

type ConfigChangeHandler = (config: AppConfig) => void;
```

## Error Handling Abstractions

### Service Errors

```typescript
abstract class ServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly service: string,
    public readonly recoverable: boolean = true,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
  
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      service: this.service,
      recoverable: this.recoverable,
      details: this.details
    };
  }
}

class WakuError extends ServiceError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, 'waku', true, details);
  }
}

class CodexError extends ServiceError {
  constructor(message: string, code: string, details?: any) {
    super(message, code, 'codex', true, details);
  }
}
```

### Error Recovery

```typescript
interface ErrorRecovery {
  canRecover(error: Error): boolean;
  recover(error: Error): Promise<void>;
  registerStrategy(
    errorType: new (...args: any[]) => Error,
    strategy: RecoveryStrategy
  ): void;
}

type RecoveryStrategy = (error: Error) => Promise<void>;
```

## Event System Abstractions

### Type-Safe Event Emitter

```typescript
class TypedEventEmitter<Events extends Record<string, any>> {
  private handlers = new Map<keyof Events, Set<Function>>();
  
  on<E extends keyof Events>(
    event: E,
    handler: Events[E]
  ): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }
  
  off<E extends keyof Events>(
    event: E,
    handler: Events[E]
  ): void {
    this.handlers.get(event)?.delete(handler);
  }
  
  emit<E extends keyof Events>(
    event: E,
    ...args: Parameters<Events[E]>
  ): void {
    this.handlers.get(event)?.forEach(handler => {
      handler(...args);
    });
  }
  
  once<E extends keyof Events>(
    event: E,
    handler: Events[E]
  ): void {
    const wrapper = (...args: any[]) => {
      handler(...args);
      this.off(event, wrapper as Events[E]);
    };
    this.on(event, wrapper as Events[E]);
  }
}
```

## Debug Abstractions

### Debug Logger

```typescript
interface IDebugLogger {
  log(level: LogLevel, service: string, message: string, data?: any): void;
  error(service: string, error: Error, context?: any): void;
  clear(): void;
  export(): LogEntry[];
  subscribe(handler: LogHandler): () => void;
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  service: string;
  message: string;
  data?: any;
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug';
type LogHandler = (entry: LogEntry) => void;
```

These abstractions provide:
1. **Type safety** throughout the application
2. **Consistent interfaces** for all services
3. **Reusable patterns** for common operations
4. **Extensibility** for future features
5. **Testability** through dependency injection