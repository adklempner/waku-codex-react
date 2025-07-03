import { createServiceHook } from '@/hooks/core';
import { WakuService } from '@/services/waku';
import { WakuConfig } from '@/types';
import { DEFAULT_BOOTSTRAP_NODES, DEFAULT_NETWORK_CONFIG } from '@/services/waku/constants';

const defaultWakuConfig: WakuConfig = {
  id: 'waku-service',
  debug: false,
  bootstrap: DEFAULT_BOOTSTRAP_NODES,
  protocols: ['filter', 'light-push'],
  networkConfig: DEFAULT_NETWORK_CONFIG,
};

export const useWaku = createServiceHook(
  'waku',
  WakuService,
  defaultWakuConfig
);