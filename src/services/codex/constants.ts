export const DEFAULT_LOCAL_ENDPOINT = 'http://localhost:8080/api/codex';
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const STATUS_CACHE_DURATION = 30000; // 30 seconds

export const CODEX_API_PATHS = {
  INFO: '/v1/debug/info',
  UPLOAD: '/v1/data',
  DOWNLOAD: (cid: string) => `/v1/data/${cid}/network/stream`,
  METADATA: (cid: string) => `/v1/data/${cid}/network`,
} as const;