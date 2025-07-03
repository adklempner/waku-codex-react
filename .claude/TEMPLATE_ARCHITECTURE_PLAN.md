# Waku-Codex React Template Architecture Plan

## Design Principles

1. **DRY (Don't Repeat Yourself)**
   - Single source of truth for all configurations
   - Reusable abstractions for common patterns
   - Composable hooks and components

2. **Functional React Best Practices**
   - Pure functional components
   - Custom hooks for logic encapsulation
   - Immutable state management
   - Effect management with proper cleanup

3. **Developer Experience**
   - TypeScript for type safety
   - Clear abstractions and interfaces
   - Comprehensive error boundaries
   - Built-in debugging tools
   - Minimal boilerplate

## Core Architecture

### 1. Service Layer Abstraction

```
/src/services/
├── waku/
│   ├── WakuService.ts         # Core Waku service class
│   ├── types.ts               # Waku-specific types
│   └── constants.ts           # Network configs, topics
├── codex/
│   ├── CodexService.ts        # Core Codex service class
│   ├── types.ts               # Codex-specific types
│   └── constants.ts           # API endpoints, configs
└── index.ts                   # Service factory exports
```

### 2. Hook Architecture

```
/src/hooks/
├── core/
│   ├── useService.ts          # Generic service hook factory
│   ├── useAsyncState.ts       # Async state management
│   └── useRetry.ts            # Retry logic abstraction
├── waku/
│   ├── useWaku.ts             # Main Waku hook
│   ├── useWakuMessages.ts     # Message subscription hook
│   └── useWakuStatus.ts       # Connection status hook
├── codex/
│   ├── useCodex.ts            # Main Codex hook
│   ├── useFileUpload.ts       # Upload with progress
│   └── useFileDownload.ts     # Download with progress
└── index.ts                   # Centralized exports
```

### 3. Context Architecture

```
/src/contexts/
├── providers/
│   ├── ServiceProvider.tsx     # Unified service provider
│   ├── ConfigProvider.tsx      # Configuration context
│   └── DebugProvider.tsx       # Debug tools context
├── hooks/
│   ├── useServices.ts          # Access all services
│   ├── useConfig.ts            # Access configuration
│   └── useDebug.ts             # Access debug tools
└── index.tsx                   # Root provider component
```

### 4. Component Library

```
/src/components/
├── status/
│   ├── ConnectionStatus.tsx    # Generic connection indicator
│   ├── ServiceHealth.tsx       # Service health dashboard
│   └── NetworkInfo.tsx         # Network statistics
├── transfer/
│   ├── FileUploader.tsx        # Drag-drop file upload
│   ├── FileDownloader.tsx      # Download manager
│   └── TransferProgress.tsx    # Progress indicator
├── debug/
│   ├── DebugPanel.tsx          # Unified debug interface
│   ├── MessageLog.tsx          # Message history viewer
│   └── ServiceConsole.tsx      # Service-specific console
└── ui/
    ├── Button.tsx              # Styled button component
    ├── Card.tsx                # Content card
    └── Modal.tsx               # Modal dialog
```

## Key Abstractions

### 1. Service Factory Pattern

```typescript
interface IService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  on(event: string, handler: Function): void;
  off(event: string, handler: Function): void;
}

class ServiceFactory {
  static create<T extends IService>(
    ServiceClass: new (...args: any[]) => T,
    config: ServiceConfig
  ): T {
    return new ServiceClass(config);
  }
}
```

### 2. Generic Hook Factory

```typescript
function createServiceHook<T extends IService>(
  serviceName: string,
  ServiceClass: new (...args: any[]) => T
) {
  return function useService(config?: Partial<ServiceConfig>) {
    const [service, setService] = useState<T | null>(null);
    const [status, setStatus] = useState<ServiceStatus>('idle');
    const [error, setError] = useState<Error | null>(null);
    
    // Generic connection logic
    // Generic error handling
    // Generic cleanup
    
    return { service, status, error, connect, disconnect };
  };
}
```

### 3. Message Protocol Abstraction

```typescript
interface MessageProtocol<T> {
  encode(message: T): Uint8Array;
  decode(data: Uint8Array): T;
  validate(message: T): boolean;
}

class ProtobufProtocol<T> implements MessageProtocol<T> {
  constructor(private schema: protobuf.Type) {}
  
  encode(message: T): Uint8Array {
    return this.schema.encode(message).finish();
  }
  
  decode(data: Uint8Array): T {
    return this.schema.decode(data) as T;
  }
  
  validate(message: T): boolean {
    return this.schema.verify(message) === null;
  }
}
```

### 4. Progress Tracking Abstraction

```typescript
interface ProgressTracker {
  start(total: number): void;
  update(current: number): void;
  complete(): void;
  onProgress(handler: (progress: number) => void): void;
}

class TransferProgress implements ProgressTracker {
  private handlers: Set<(progress: number) => void> = new Set();
  
  // Implementation
}
```

## Configuration Management

### 1. Environment Configuration

```typescript
interface AppConfig {
  waku: {
    bootstrap: string[];
    protocols: string[];
    networkConfig: {
      clusterID: number;
      shards: number[];
    };
  };
  codex: {
    endpoints: {
      local: string;
      remote: string;
    };
    auth?: {
      username: string;
      password: string;
    };
  };
  features: {
    debug: boolean;
    encryption: boolean;
  };
}
```

### 2. Runtime Configuration

```typescript
const ConfigProvider: React.FC = ({ children, overrides }) => {
  const config = useMemo(() => 
    mergeConfigs(defaultConfig, envConfig, overrides),
    [overrides]
  );
  
  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
};
```

## State Management Strategy

### 1. Service State

- Each service maintains its own internal state
- Exposed through hooks with standard interface
- No global state management library needed

### 2. Application State

- Use React Context for cross-cutting concerns
- Local component state for UI-specific data
- Custom hooks for complex state logic

### 3. Async State Pattern

```typescript
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

function useAsyncState<T>(
  asyncFn: () => Promise<T>,
  deps: DependencyList = []
): AsyncState<T> & { retry: () => void } {
  // Implementation with automatic error handling
  // and retry capability
}
```

## Error Handling Strategy

### 1. Service-Level Errors

```typescript
class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public service: string,
    public recoverable: boolean = true
  ) {
    super(message);
  }
}
```

### 2. UI Error Boundaries

```typescript
const ServiceErrorBoundary: React.FC = ({ children, fallback }) => {
  return (
    <ErrorBoundary
      fallback={fallback}
      onError={(error, errorInfo) => {
        if (error instanceof ServiceError && error.recoverable) {
          // Show retry UI
        } else {
          // Show error UI
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
```

## Developer Tools

### 1. Debug Panel

- Service connection status
- Message history
- Performance metrics
- Configuration viewer
- Manual service controls

### 2. Development Helpers

```typescript
// Development-only hooks
const useDevTools = () => {
  if (process.env.NODE_ENV === 'production') return null;
  
  return {
    logMessage: (service: string, message: any) => {},
    simulateError: (service: string) => {},
    clearCache: () => {},
  };
};
```

## Testing Strategy

### 1. Service Mocks

```typescript
class MockWakuService implements IWakuService {
  // Mock implementation for testing
}

class MockCodexService implements ICodexService {
  // Mock implementation for testing
}
```

### 2. Hook Testing Utilities

```typescript
const ServiceTestProvider: React.FC = ({ children, mocks }) => {
  return (
    <ServiceProvider services={mocks}>
      {children}
    </ServiceProvider>
  );
};
```

## File Structure Summary

```
/src/
├── services/          # Core service implementations
├── hooks/             # Reusable React hooks
├── contexts/          # React contexts and providers
├── components/        # UI component library
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
├── constants/         # App-wide constants
└── lib/               # Third-party integrations

/examples/             # Example applications
├── basic/             # Minimal example
├── advanced/          # Full-featured example
└── recipes/           # Common patterns

/docs/                 # Documentation
├── getting-started.md
├── api-reference.md
└── examples.md
```

## Implementation Priorities

1. **Phase 1: Core Services**
   - WakuService class
   - CodexService class
   - Service interfaces and types

2. **Phase 2: Hook Layer**
   - useWaku and useCodex hooks
   - Generic hook factories
   - Async state management

3. **Phase 3: Context Layer**
   - ServiceProvider
   - ConfigProvider
   - Error boundaries

4. **Phase 4: Component Library**
   - Connection status components
   - File transfer components
   - Debug tools

5. **Phase 5: Developer Experience**
   - TypeScript definitions
   - Documentation
   - Example applications