import { useEffect, useState } from 'react';
import sdk, { Context } from '@farcaster/miniapp-sdk';

interface FarcasterMiniappProps {
  children: React.ReactNode;
  onReady?: (context: Context.MiniAppContext) => void;
  onError?: (error: Error) => void;
}

export function FarcasterMiniapp({ children, onReady, onError }: FarcasterMiniappProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [context, setContext] = useState<Context.MiniAppContext | null>(null);
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initializeFarcaster = async () => {
      try {
        // Check if we're running in a Farcaster miniapp
        const inMiniApp = await sdk.isInMiniApp();
        
        if (!mounted) return;
        
        setIsInMiniApp(inMiniApp);

        if (!inMiniApp) {
          // Not in a miniapp context - this is okay for development
          setIsLoading(false);
          return;
        }

        // Get the miniapp context
        const miniAppContext = await sdk.context;
        
        if (!mounted) return;

        setContext(miniAppContext);
        
        // Signal that the app is ready
        await sdk.actions.ready();
        
        setIsLoading(false);
        
        // Call the onReady callback if provided
        onReady?.(miniAppContext);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        
        if (mounted) {
          setError(error);
          setIsLoading(false);
          onError?.(error);
        }
      }
    };

    initializeFarcaster();

    return () => {
      mounted = false;
    };
  }, [onReady, onError]);

  // Show loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
          <p>Loading Farcaster miniapp...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, sans-serif',
        padding: '20px'
      }}>
        <div style={{ 
          textAlign: 'center',
          maxWidth: '400px',
          padding: '20px',
          backgroundColor: '#fee',
          borderRadius: '8px',
          border: '1px solid #fcc'
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>❌</div>
          <h3 style={{ color: '#c00', marginBottom: '10px' }}>Failed to load miniapp</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>{error.message}</p>
          <p style={{ color: '#999', fontSize: '12px', marginTop: '10px' }}>
            Make sure you're accessing this app through Farcaster.
          </p>
        </div>
      </div>
    );
  }

  // Show warning if not in miniapp context (development mode)
  if (!isInMiniApp) {
    return (
      <div>
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px',
          padding: '10px',
          marginBottom: '10px',
          fontSize: '14px',
          color: '#856404'
        }}>
          ⚠️ Not running in Farcaster miniapp context. Some features may be limited.
        </div>
        {children}
      </div>
    );
  }

  // Render children with context available
  return (
    <div data-farcaster-miniapp data-fid={context?.user?.fid}>
      {children}
    </div>
  );
}

// Hook to access Farcaster context in child components
export function useFarcasterContext() {
  const [context, setContext] = useState<Context.MiniAppContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInMiniApp, setIsInMiniApp] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadContext = async () => {
      try {
        const inMiniApp = await sdk.isInMiniApp();
        
        if (!mounted) return;
        
        setIsInMiniApp(inMiniApp);

        if (inMiniApp) {
          const miniAppContext = await sdk.context;
          if (mounted) {
            setContext(miniAppContext);
          }
        }
      } catch (error) {
        console.error('Failed to load Farcaster context:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadContext();

    return () => {
      mounted = false;
    };
  }, []);

  return { context, loading, isInMiniApp };
}