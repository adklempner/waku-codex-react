# Waku Integration Guide

## Overview

The reference implementation uses Waku SDK v0.0.31 for peer-to-peer messaging to coordinate file sharing between users. Files are stored in Codex, while Waku handles the real-time notification and metadata exchange.

## Core Waku Components

### 1. useWaku Hook (`/hooks/useWaku.ts`)

The main integration point that:
- Creates and manages a Waku light node
- Handles connection to bootstrap nodes
- Implements message encoding/decoding with Protobuf
- Manages subscription to content topics

Key functions:
- `startNode()` - Initializes Waku node and connects to network
- `stopNode()` - Cleanly shuts down the node
- `sendMessage()` - Sends file metadata messages
- `subscribeToMessages()` - Listens for incoming messages

### 2. WakuContext (`/context/WakuContext.tsx`)

Provides global Waku state management:
- Connection status tracking
- Peer count monitoring
- Error state management
- Room-based message isolation

### 3. Message Protocol

Uses Protobuf for message serialization with this structure:
```proto
message WakuFileMessage {
  timestamp: number;
  sender: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileId: string;
  isEncrypted?: boolean;
  accessCondition?: string;
}
```

## Waku Configuration

### Content Topic Format
`/fileshare/1/room-{roomId}/proto`
- Follows Waku naming convention
- Enables room-based message isolation

### Network Configuration
```javascript
{
  clusterID: 42,
  shards: [0],
  protocols: ['light-push', 'filter']
}
```

### Bootstrap Nodes
The app connects to multiple bootstrap nodes for redundancy:
- waku-test.bloxy.one
- vps-aaa00d52.vps.ovh.ca
- waku-42-1.bloxy.one
- waku-42-2.bloxy.one

## Integration Flow

1. **Initialization**
   - Create light node on app startup
   - Connect to bootstrap nodes
   - Subscribe to room's content topic

2. **File Sharing**
   - Upload file to Codex storage
   - Create WakuFileMessage with metadata
   - Broadcast message to room participants

3. **File Reception**
   - Receive WakuFileMessage via subscription
   - Display file info in UI
   - Enable download from Codex using fileId

## UI Components

### Status Indicators
- **WakuStatusIndicatorDot** - Visual connection status
- **WakuDebugConsole** - Message monitoring tool
- **WakuConfigPanel** - Node configuration UI

## Best Practices

1. **Error Handling**
   - Always check connection status before sending
   - Implement retry logic for failed connections
   - Provide user feedback for connection issues

2. **Performance**
   - Use light node for browser environments
   - Implement proper cleanup on unmount
   - Batch message processing when possible

3. **Security**
   - Validate all incoming messages
   - Sanitize message content before display
   - Use encryption for sensitive data

## Key Differences from Standard Waku Apps

1. **Codex Integration** - Waku only handles metadata, not file content
2. **Room-based Isolation** - Messages are scoped to specific rooms
3. **Encryption Support** - Optional Taco encryption for access control
4. **File-centric Protocol** - Custom message format for file sharing

## Implementation Checklist

When implementing Waku in our project:
- [ ] Install @waku/sdk and protobufjs dependencies
- [ ] Create useWaku hook with connection management
- [ ] Implement WakuContext for global state
- [ ] Define Protobuf message schema
- [ ] Add status indicators and debug tools
- [ ] Configure bootstrap nodes and network params
- [ ] Implement room-based topic subscriptions
- [ ] Add proper error handling and retries
- [ ] Create UI components for status and config