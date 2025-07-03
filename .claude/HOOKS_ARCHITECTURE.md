# Reusable Hooks Architecture

## Design Principles

1. **Single Responsibility**: Each hook does one thing well
2. **Composability**: Hooks can be combined to create complex behaviors
3. **Testability**: Pure functions where possible, mockable dependencies
4. **Type Safety**: Full TypeScript support with inference
5. **Performance**: Built-in memoization and cleanup

## Core Hook Categories

### 1. Service Hooks

#### Base Service Hook Pattern
```typescript
// Generic service hook factory
export function createServiceHook<T extends IService, C extends ServiceConfig>(
  serviceName: string,
  ServiceClass: new (config: C) => T,
  defaultConfig: C
) {
  return function useService(overrideConfig?: Partial<C>) {
    const [service, setService] = useState<T | null>(null);
    const [status, setStatus] = useState<ServiceStatus>('idle');
    const [error, setError] = useState<Error | null>(null);
    
    const config = useMemo(
      () => ({ ...defaultConfig, ...overrideConfig }),
      [overrideConfig]
    );
    
    const connect = useCallback(async () => {
      try {
        setStatus('connecting');
        setError(null);
        
        const newService = new ServiceClass(config);
        await newService.connect();
        
        setService(newService);
        setStatus('connected');
      } catch (err) {
        setError(err as Error);
        setStatus('error');
      }
    }, [config]);
    
    const disconnect = useCallback(async () => {
      if (service) {
        await service.disconnect();
        setService(null);
        setStatus('disconnected');
      }
    }, [service]);
    
    useEffect(() => {
      return () => {
        service?.disconnect();
      };
    }, [service]);
    
    return { service, status, error, connect, disconnect };
  };
}
```

#### Waku-Specific Hooks
```typescript
// Main Waku hook
export const useWaku = createServiceHook('waku', WakuService, defaultWakuConfig);

// Message subscription hook
export function useWakuMessages<T>(
  topic: string,
  protocol: MessageProtocol<T>
) {
  const { service: waku } = useWaku();
  const [messages, setMessages] = useState<T[]>([]);
  
  useEffect(() => {
    if (!waku?.isConnected()) return;
    
    const unsubscribe = waku.subscribe(topic, protocol, (message) => {
      setMessages(prev => [...prev, message]);
    });
    
    return unsubscribe;
  }, [waku, topic, protocol]);
  
  const sendMessage = useCallback(
    async (message: T) => {
      if (!waku) throw new Error('Waku not connected');
      await waku.publish(topic, protocol, message);
    },
    [waku, topic, protocol]
  );
  
  const clearMessages = useCallback(() => setMessages([]), []);
  
  return { messages, sendMessage, clearMessages };
}

// Peer monitoring hook
export function useWakuPeers(interval = 5000) {
  const { service: waku } = useWaku();
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  
  useInterval(
    async () => {
      if (waku?.isConnected()) {
        const peerList = await waku.getPeers();
        setPeers(peerList);
      }
    },
    waku ? interval : null
  );
  
  return peers;
}
```

#### Codex-Specific Hooks
```typescript
// File upload hook with progress
export function useFileUpload() {
  const { service: codex } = useCodex();
  const [uploads, setUploads] = useState<Map<string, UploadState>>(new Map());
  
  const upload = useCallback(
    async (file: File) => {
      if (!codex) throw new Error('Codex not connected');
      
      const uploadId = generateId();
      
      setUploads(prev => new Map(prev).set(uploadId, {
        file,
        progress: 0,
        status: 'uploading',
      }));
      
      try {
        const result = await codex.upload(file, {
          onProgress: (progress) => {
            setUploads(prev => {
              const next = new Map(prev);
              const state = next.get(uploadId);
              if (state) {
                next.set(uploadId, { ...state, progress });
              }
              return next;
            });
          },
        });
        
        setUploads(prev => {
          const next = new Map(prev);
          next.set(uploadId, {
            file,
            progress: 100,
            status: 'completed',
            cid: result.cid,
          });
          return next;
        });
        
        return result;
      } catch (error) {
        setUploads(prev => {
          const next = new Map(prev);
          next.set(uploadId, {
            file,
            progress: 0,
            status: 'failed',
            error: error as Error,
          });
          return next;
        });
        throw error;
      }
    },
    [codex]
  );
  
  const removeUpload = useCallback((uploadId: string) => {
    setUploads(prev => {
      const next = new Map(prev);
      next.delete(uploadId);
      return next;
    });
  }, []);
  
  return { uploads: Array.from(uploads.values()), upload, removeUpload };
}

// File download hook
export function useFileDownload() {
  const { service: codex } = useCodex();
  const [downloads, setDownloads] = useState<Map<string, DownloadState>>(new Map());
  
  const download = useCallback(
    async (cid: string, fileName?: string) => {
      if (!codex) throw new Error('Codex not connected');
      
      const downloadId = generateId();
      
      setDownloads(prev => new Map(prev).set(downloadId, {
        cid,
        fileName,
        progress: 0,
        status: 'downloading',
      }));
      
      try {
        const result = await codex.download(cid, {
          onProgress: (progress) => {
            setDownloads(prev => {
              const next = new Map(prev);
              const state = next.get(downloadId);
              if (state) {
                next.set(downloadId, { ...state, progress });
              }
              return next;
            });
          },
        });
        
        // Trigger browser download
        const blob = new Blob([result.data]);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || cid;
        a.click();
        URL.revokeObjectURL(url);
        
        setDownloads(prev => {
          const next = new Map(prev);
          next.set(downloadId, {
            cid,
            fileName,
            progress: 100,
            status: 'completed',
          });
          return next;
        });
        
        return result;
      } catch (error) {
        setDownloads(prev => {
          const next = new Map(prev);
          next.set(downloadId, {
            cid,
            fileName,
            progress: 0,
            status: 'failed',
            error: error as Error,
          });
          return next;
        });
        throw error;
      }
    },
    [codex]
  );
  
  return { downloads: Array.from(downloads.values()), download };
}
```

### 2. State Management Hooks

```typescript
// Async state management
export function useAsyncState<T>(
  asyncFunction: () => Promise<T>,
  deps: DependencyList = []
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: false,
    error: null,
  });
  
  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const data = await asyncFunction();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  }, deps);
  
  return { ...state, execute, retry: execute };
}

// Local storage hook
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: { serialize?: (value: T) => string; deserialize?: (value: string) => T }
) {
  const serialize = options?.serialize || JSON.stringify;
  const deserialize = options?.deserialize || JSON.parse;
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? deserialize(item) : initialValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return initialValue;
    }
  });
  
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, serialize(valueToStore));
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, serialize, storedValue]
  );
  
  return [storedValue, setValue] as const;
}

// Previous value hook
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  }, [value]);
  
  return ref.current;
}
```

### 3. Effect Hooks

```typescript
// Interval hook with pause/resume
export function useInterval(
  callback: () => void | Promise<void>,
  delay: number | null
) {
  const savedCallback = useRef(callback);
  const intervalId = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  useEffect(() => {
    if (delay === null) return;
    
    const tick = async () => {
      await savedCallback.current();
    };
    
    intervalId.current = setInterval(tick, delay);
    
    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, [delay]);
  
  const pause = useCallback(() => {
    if (intervalId.current) {
      clearInterval(intervalId.current);
      intervalId.current = null;
    }
  }, []);
  
  const resume = useCallback(() => {
    if (delay !== null && !intervalId.current) {
      intervalId.current = setInterval(savedCallback.current, delay);
    }
  }, [delay]);
  
  return { pause, resume };
}

// Debounced value hook
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  
  return debouncedValue;
}

// Event listener hook
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: HTMLElement | Window = window,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler);
  
  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);
  
  useEffect(() => {
    const eventListener = (event: WindowEventMap[K]) => savedHandler.current(event);
    
    element.addEventListener(eventName, eventListener as EventListener, options);
    
    return () => {
      element.removeEventListener(eventName, eventListener as EventListener, options);
    };
  }, [eventName, element, options]);
}
```

### 4. UI Hooks

```typescript
// Click outside hook
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: () => void
) {
  const ref = useRef<T>(null);
  
  useEventListener('mousedown', (event) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      handler();
    }
  });
  
  return ref;
}

// Media query hook
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [query]);
  
  return matches;
}

// Clipboard hook
export function useClipboard() {
  const [copied, setCopied] = useState(false);
  
  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (error) {
      console.error('Failed to copy:', error);
      return false;
    }
  }, []);
  
  return { copy, copied };
}
```

### 5. Performance Hooks

```typescript
// Lazy loading hook
export function useLazyLoad<T>(
  loader: () => Promise<T>,
  dependencies: DependencyList = []
) {
  const [resource, setResource] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await loader();
      setResource(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, dependencies);
  
  return { resource, isLoading, error, load };
}

// Intersection observer hook
export function useIntersectionObserver<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit
) {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [node, setNode] = useState<T | null>(null);
  
  const observer = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(([entry]) => {
      setEntry(entry);
    }, options);
    
    if (node) observer.current.observe(node);
    
    return () => observer.current?.disconnect();
  }, [node, options]);
  
  return { ref: setNode, entry, isIntersecting: entry?.isIntersecting ?? false };
}
```

## Hook Composition Examples

```typescript
// Composed file sharing hook
export function useFileSharing() {
  const { service: waku } = useWaku();
  const { upload } = useFileUpload();
  const { sendMessage } = useWakuMessages<FileMessage>('file-sharing', fileProtocol);
  
  const shareFile = useCallback(
    async (file: File) => {
      // Upload to Codex
      const { cid } = await upload(file);
      
      // Share via Waku
      await sendMessage({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        cid,
        timestamp: Date.now(),
      });
      
      return cid;
    },
    [upload, sendMessage]
  );
  
  return { shareFile };
}

// Auto-reconnect wrapper
export function useAutoReconnect<T extends IService>(
  useService: () => ServiceHookResult<T>,
  maxRetries = 3,
  retryDelay = 5000
) {
  const service = useService();
  const [retryCount, setRetryCount] = useState(0);
  
  useEffect(() => {
    if (service.status === 'error' && retryCount < maxRetries) {
      const timer = setTimeout(() => {
        service.connect();
        setRetryCount(prev => prev + 1);
      }, retryDelay);
      
      return () => clearTimeout(timer);
    }
  }, [service.status, retryCount, maxRetries, retryDelay]);
  
  useEffect(() => {
    if (service.status === 'connected') {
      setRetryCount(0);
    }
  }, [service.status]);
  
  return service;
}
```

## Testing Utilities

```typescript
// Hook test wrapper
export function renderHookWithProviders<T>(
  hook: () => T,
  options?: {
    waku?: Partial<WakuConfig>;
    codex?: Partial<CodexConfig>;
  }
) {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <ServiceProvider waku={options?.waku} codex={options?.codex}>
      {children}
    </ServiceProvider>
  );
  
  return renderHook(hook, { wrapper });
}

// Mock service factory
export function createMockService<T extends IService>(
  overrides?: Partial<T>
): T {
  return {
    id: 'mock-service',
    status: 'connected',
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    isConnected: jest.fn().mockReturnValue(true),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    ...overrides,
  } as T;
}
```

This architecture provides:
1. **Reusable patterns** for common operations
2. **Type-safe** implementations
3. **Testable** hook logic
4. **Performance optimizations** built-in
5. **Composable** building blocks for complex features