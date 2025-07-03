import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { IService, ServiceConfig, ServiceStatus } from '@/types';

export interface ServiceHookResult<T extends IService, C extends ServiceConfig = ServiceConfig> {
  service: T | null;
  status: ServiceStatus;
  error: Error | null;
  connect: (config?: Partial<C>) => Promise<void>;
  disconnect: () => Promise<void>;
}

export function createServiceHook<T extends IService, C extends ServiceConfig>(
  _serviceName: string,
  ServiceClass: new (config: C) => T,
  defaultConfig: C
): (config?: Partial<C>) => ServiceHookResult<T, C> {
  return function useService(overrideConfig?: Partial<C>): ServiceHookResult<T, C> {
    const [service, setService] = useState<T | null>(null);
    const [status, setStatus] = useState<ServiceStatus>('idle');
    const [error, setError] = useState<Error | null>(null);
    const serviceRef = useRef<T | null>(null);

    const config = useMemo(
      () => ({ ...defaultConfig, ...overrideConfig }),
      [overrideConfig]
    );

    const connect = useCallback(async (runtimeConfig?: Partial<C>) => {
      try {
        setStatus('connecting');
        setError(null);

        const finalConfig = { ...config, ...runtimeConfig };
        const newService = new ServiceClass(finalConfig as C);
        
        // Subscribe to status changes
        newService.on('statusChange', setStatus);
        newService.on('error', setError);

        await newService.connect();
        
        serviceRef.current = newService;
        setService(newService);
      } catch (err) {
        setError(err as Error);
        setStatus('error');
        throw err;
      }
    }, [config, ServiceClass]);

    const disconnect = useCallback(async () => {
      if (serviceRef.current) {
        try {
          await serviceRef.current.disconnect();
          
          // Clean up event listeners
          serviceRef.current.off('statusChange', setStatus);
          serviceRef.current.off('error', setError);
          
          serviceRef.current = null;
          setService(null);
          setStatus('disconnected');
        } catch (err) {
          setError(err as Error);
          throw err;
        }
      }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (serviceRef.current && serviceRef.current.isConnected()) {
          serviceRef.current.disconnect().catch(console.error);
        }
      };
    }, []);

    return {
      service,
      status,
      error,
      connect,
      disconnect,
    };
  };
}