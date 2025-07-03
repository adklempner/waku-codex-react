import { useState, useCallback } from 'react';
import { useCodex } from './useCodex';
import { DownloadResult } from '@/types';

export interface DownloadState {
  id: string;
  cid: string;
  fileName?: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: Error;
}

export interface UseFileDownloadResult {
  downloads: DownloadState[];
  download: (cid: string, fileName?: string) => Promise<DownloadResult>;
  removeDownload: (downloadId: string) => void;
  clearDownloads: () => void;
}

let downloadIdCounter = 0;
const generateId = () => `download-${++downloadIdCounter}`;

export function useFileDownload(): UseFileDownloadResult {
  const { service: codex } = useCodex();
  const [downloads, setDownloads] = useState<Map<string, DownloadState>>(new Map());

  const download = useCallback(
    async (cid: string, fileName?: string) => {
      if (!codex) {
        throw new Error('Codex not connected');
      }

      const downloadId = generateId();

      setDownloads(prev => new Map(prev).set(downloadId, {
        id: downloadId,
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
        a.download = fileName || result.fileName || cid;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setDownloads(prev => {
          const next = new Map(prev);
          next.set(downloadId, {
            id: downloadId,
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
            id: downloadId,
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

  const removeDownload = useCallback((downloadId: string) => {
    setDownloads(prev => {
      const next = new Map(prev);
      next.delete(downloadId);
      return next;
    });
  }, []);

  const clearDownloads = useCallback(() => {
    setDownloads(new Map());
  }, []);

  return {
    downloads: Array.from(downloads.values()),
    download,
    removeDownload,
    clearDownloads,
  };
}