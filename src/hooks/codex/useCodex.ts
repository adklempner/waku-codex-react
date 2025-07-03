import { createServiceHook } from '@/hooks/core';
import { CodexService } from '@/services/codex';
import { CodexConfig } from '@/types';
import { DEFAULT_LOCAL_ENDPOINT, DEFAULT_TIMEOUT } from '@/services/codex/constants';

const defaultCodexConfig: CodexConfig = {
  id: 'codex-service',
  debug: false,
  endpoint: DEFAULT_LOCAL_ENDPOINT,
  endpointType: 'local',
  timeout: DEFAULT_TIMEOUT,
};

export const useCodex = createServiceHook(
  'codex',
  CodexService,
  defaultCodexConfig
);