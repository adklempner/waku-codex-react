import { useState, useEffect, useCallback } from 'react';
import { MessageProtocol } from '@/types';
import { useWaku } from './useWaku';

export interface UseWakuMessagesResult<T> {
  messages: T[];
  sendMessage: (message: T) => Promise<void>;
  clearMessages: () => void;
  error: Error | null;
  sending: boolean;
}

export function useWakuMessages<T>(
  topic: string,
  protocol: MessageProtocol<T>
): UseWakuMessagesResult<T> {
  const { service: waku } = useWaku();
  const [messages, setMessages] = useState<T[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!waku?.isConnected()) return;

    let unsubscribe: (() => void) | null = null;

    const subscribe = async () => {
      try {
        unsubscribe = await waku.subscribe(topic, protocol, (message) => {
          setMessages(prev => [...prev, message]);
        });
      } catch (err) {
        setError(err as Error);
      }
    };

    subscribe();

    return () => {
      unsubscribe?.();
    };
  }, [waku, topic, protocol]);

  const sendMessage = useCallback(
    async (message: T) => {
      if (!waku) {
        throw new Error('Waku not connected');
      }

      setSending(true);
      setError(null);

      try {
        await waku.publish(topic, protocol, message);
      } catch (err) {
        setError(err as Error);
        throw err;
      } finally {
        setSending(false);
      }
    },
    [waku, topic, protocol]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    error,
    sending,
  };
}