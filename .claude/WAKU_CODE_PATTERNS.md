# Waku Code Patterns and Implementation Details

## Hook Implementation Pattern

### useWaku Hook Structure
```typescript
const useWaku = (roomId: string, settingsContext: SettingsContextType) => {
  // State management
  const [node, setNode] = useState<LightNode | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [peerCount, setPeerCount] = useState(0);
  const [messages, setMessages] = useState<WakuFileMessage[]>([]);
  
  // Refs for cleanup
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const peerMonitorRef = useRef<NodeJS.Timeout | null>(null);
}
```

## Protobuf Message Schema

```javascript
// Define the protobuf schema
const FileMessage = new protobuf.Type("FileMessage")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("sender", 2, "string"))
  .add(new protobuf.Field("fileName", 3, "string"))
  .add(new protobuf.Field("fileSize", 4, "float"))
  .add(new protobuf.Field("fileType", 5, "string"))
  .add(new protobuf.Field("fileId", 6, "string"))
  .add(new protobuf.Field("isEncrypted", 7, "bool"))
  .add(new protobuf.Field("accessCondition", 8, "string"));

// Create root and add the message type
const root = new protobuf.Root().define("fileshare").add(FileMessage);
```

## Node Creation Pattern

```javascript
const startNode = async () => {
  const node = await createLightNode({
    networkConfig: {
      clusterID: 42,
      shards: [0],
    },
    defaultBootstrap: false,
  });
  
  await node.start();
  
  // Connect to bootstrap nodes with fallback
  for (const peer of bootstrapNodes) {
    try {
      await node.dial(peer);
      break; // Success, exit loop
    } catch (err) {
      console.warn(`Failed to connect to ${peer}:`, err);
    }
  }
};
```

## Message Sending Pattern

```javascript
const sendMessage = async (fileMessage: WakuFileMessage) => {
  const encoder = createEncoder({
    contentTopic: `/fileshare/1/room-${roomId}/proto`,
    ephemeral: true,
  });
  
  const protoMessage = root.lookupType("fileshare.FileMessage");
  const encoded = protoMessage.encode(protoMessage.create(fileMessage)).finish();
  
  await node.lightPush.send(encoder, {
    payload: encoded,
  });
};
```

## Message Subscription Pattern

```javascript
const subscribeToMessages = async () => {
  const decoder = createDecoder(`/fileshare/1/room-${roomId}/proto`);
  
  const subscription = await node.filter.createSubscription();
  
  const messageHandler = (wakuMessage: any) => {
    if (!wakuMessage.payload) return;
    
    const protoMessage = root.lookupType("fileshare.FileMessage");
    const decoded = protoMessage.decode(wakuMessage.payload);
    const message = protoMessage.toObject(decoded) as WakuFileMessage;
    
    // Filter out own messages
    if (message.sender !== SENDER_ID) {
      setMessages(prev => [...prev, message]);
    }
  };
  
  await subscription.subscribe([decoder], messageHandler);
  
  return () => subscription.unsubscribe([decoder]);
};
```

## Peer Monitoring Pattern

```javascript
useEffect(() => {
  if (!node) return;
  
  const monitorPeers = () => {
    const peers = node.libp2p.getConnections();
    setPeerCount(peers.length);
    
    if (peers.length === 0 && connectionStatus === 'connected') {
      // Attempt reconnection
      attemptReconnection();
    }
  };
  
  const interval = setInterval(monitorPeers, 5000);
  
  return () => clearInterval(interval);
}, [node, connectionStatus]);
```

## Context Provider Pattern

```typescript
export const WakuProvider: React.FC<WakuProviderProps> = ({ children, onFileReceived }) => {
  const settingsContext = useSettingsContext();
  const waku = useWaku(settingsContext.roomId, settingsContext);
  
  const sendFileMessage = useCallback(async (file: WakuFileMessage) => {
    if (!waku.isConnected) {
      throw new Error('Not connected to Waku network');
    }
    return waku.sendMessage(file);
  }, [waku]);
  
  // Handle incoming messages
  useEffect(() => {
    if (waku.messages.length > 0) {
      const latestMessage = waku.messages[waku.messages.length - 1];
      onFileReceived?.(latestMessage);
    }
  }, [waku.messages, onFileReceived]);
  
  return (
    <WakuContext.Provider value={{ ...waku, sendFileMessage }}>
      {children}
    </WakuContext.Provider>
  );
};
```

## Error Handling Patterns

```javascript
// Connection error handling
try {
  await waitForRemotePeer(node, [Protocols.LightPush, Protocols.Filter], 15000);
} catch (err) {
  setError('Failed to find peers. Please check your connection.');
  setConnectionStatus('disconnected');
  return;
}

// Send error handling
try {
  await node.lightPush.send(encoder, { payload: encoded });
} catch (err) {
  console.error('Failed to send message:', err);
  throw new Error('Failed to send message. Please try again.');
}
```

## Bootstrap Nodes Configuration

```javascript
const bootstrapNodes = [
  "/dns4/waku-test.bloxy.one/tcp/8095/wss/p2p/16Uiu2HAmSZbDB7CusdRhgkD81VssRjQV5ZH13FbzCGcdnbbh6VwZ",
  "/dns4/vps-aaa00d52.vps.ovh.ca/tcp/8000/wss/p2p/16Uiu2HAm9PftGgHZwWE3wzdMde4m3kT2eYJFXLZfGoSED3gysofk",
  "/dns4/waku-42-1.bloxy.one/tcp/8000/wss/p2p/16Uiu2HAmV8y1exLbqWVQjytwsuTKXK4n3QvLUa4zAWF71nshejYo",
  "/dns4/waku-42-2.bloxy.one/tcp/8000/wss/p2p/16Uiu2HAmJRs6ypS3XEhkpV2sJb8SHtsgpBsTPzuA4X9zq5ExkEZj",
];
```

## Key Implementation Notes

1. **Sender ID**: Uses tab-specific ID to filter own messages: `crypto.randomUUID().slice(0, 8)`
2. **Content Topic**: Follows format `/fileshare/1/room-${roomId}/proto`
3. **Network Config**: Always use cluster 42, shard 0
4. **Timeouts**: 15 seconds for peer discovery
5. **Peer Monitoring**: Check every 5 seconds
6. **Message Type**: All messages marked as ephemeral
7. **Cleanup**: Always unsubscribe and clear intervals on unmount