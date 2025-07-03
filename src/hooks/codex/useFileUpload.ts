import { useState, useCallback } from 'react';
import { useCodex } from './useCodex';
import { UploadResult } from '@/types';

export interface UploadState {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  cid?: string;
  error?: Error;
}

export interface UseFileUploadResult {
  uploads: UploadState[];
  upload: (file: File) => Promise<UploadResult>;
  removeUpload: (uploadId: string) => void;
  clearUploads: () => void;
}

let uploadIdCounter = 0;
const generateId = () => `upload-${++uploadIdCounter}`;

export function useFileUpload(): UseFileUploadResult {
  const { service: codex } = useCodex();
  const [uploads, setUploads] = useState<Map<string, UploadState>>(new Map());

  const upload = useCallback(
    async (file: File) => {
      if (!codex) {
        throw new Error('Codex not connected');
      }

      const uploadId = generateId();

      setUploads(prev => new Map(prev).set(uploadId, {
        id: uploadId,
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
            id: uploadId,
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
            id: uploadId,
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

  const clearUploads = useCallback(() => {
    setUploads(new Map());
  }, []);

  return {
    uploads: Array.from(uploads.values()),
    upload,
    removeUpload,
    clearUploads,
  };
}