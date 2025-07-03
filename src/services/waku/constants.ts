export const DEFAULT_BOOTSTRAP_NODES = [
  "/dns4/waku-test.bloxy.one/tcp/8095/wss/p2p/16Uiu2HAmSZbDB7CusdRhgkD81VssRjQV5ZH13FbzCGcdnbbh6VwZ",
  "/dns4/vps-aaa00d52.vps.ovh.ca/tcp/8000/wss/p2p/16Uiu2HAm9PftGgHZwWE3wzdMde4m3kT2eYJFXLZfGoSED3gysofk",
  "/dns4/waku-42-1.bloxy.one/tcp/8000/wss/p2p/16Uiu2HAmV8y1exLbqWVQjytwsuTKXK4n3QvLUa4zAWF71nshejYo",
  "/dns4/waku-42-2.bloxy.one/tcp/8000/wss/p2p/16Uiu2HAmJRs6ypS3XEhkpV2sJb8SHtsgpBsTPzuA4X9zq5ExkEZj",
];

export const DEFAULT_NETWORK_CONFIG = {
  clusterId: 42,
  shards: [0],
};

export const DEFAULT_CONTENT_TOPIC = '/waku-codex/1/default/proto';

export const PEER_CHECK_INTERVAL = 5000; // 5 seconds
export const PEER_DISCOVERY_TIMEOUT = 15000; // 15 seconds