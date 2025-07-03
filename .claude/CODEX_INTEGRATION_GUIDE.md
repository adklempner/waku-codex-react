# Codex Integration Guide

## Overview

The reference implementation uses Codex as a decentralized storage layer for file storage and retrieval. Unlike traditional centralized storage, Codex provides distributed, content-addressed storage where files are identified by their content hash (CID).

## Core Codex Components

### 1. API Proxy (`/pages/api/codex/[...path].ts`)

The app uses a Next.js API route as a proxy to the Codex API:
- Handles authentication for remote Codex instances
- Forwards requests to the configured Codex endpoint
- Supports both local and remote Codex nodes

### 2. useCodex Hook (`/hooks/useCodex.ts`)

The main integration point that:
- Creates and manages a CodexClient instance
- Provides file upload/download functionality
- Monitors node status and connectivity
- Handles configuration switching between local/remote nodes

Key functions:
- `uploadFile()` - Uploads files to Codex storage
- `downloadFile()` - Retrieves files by CID
- `getNodeInfo()` - Gets Codex node status
- `checkStatus()` - Verifies node connectivity

### 3. CodexContext (`/context/CodexContext.tsx`)

Provides global Codex state management:
- Node connection status tracking
- File operation progress monitoring
- Error state management
- Configuration persistence

## Codex Configuration

### Environment Variables
```
NEXT_PUBLIC_CODEX_REMOTE_API_URL=https://api.demo.codex.storage/fileshareapp/api/codex
NEXT_PUBLIC_CODEX_LOCAL_API_URL=http://localhost:8080/api/codex
NEXT_PUBLIC_CODEX_REMOTE_API_USERNAME=fileshareapp
NEXT_PUBLIC_CODEX_REMOTE_API_PASSWORD=<password>
```

### API Endpoints
- **Local Mode**: Direct connection to local Codex node
- **Remote Mode**: Proxy through Next.js API with authentication

## Codex API Usage

### File Upload
```
POST /v1/data
Content-Type: application/octet-stream
Body: [file binary data]

Response: CID (Content Identifier)
```

### File Metadata
```
POST /v1/data/{cid}/network
Response: { manifest: { ... file metadata ... } }
```

### File Download
```
GET /v1/data/{cid}/network/stream
Response: [file binary stream]
```

### Node Status
```
GET /v1/debug/info
Response: { version, revision, spr, codex: { ... } }
```

## Integration Flow

1. **Initialization**
   - Create CodexClient with configured endpoint
   - Check node connectivity
   - Monitor status periodically

2. **File Upload**
   - Accept file from user input
   - Optionally encrypt with TACo
   - Upload to Codex via API
   - Receive CID for file identification
   - Share CID via Waku message

3. **File Download**
   - Receive CID from Waku message
   - Fetch file metadata from Codex
   - Stream file content
   - Optionally decrypt with TACo
   - Save to user's device

## UI Components

### Configuration
- **CodexConfigPanel** - Switch between local/remote nodes
- **NodeInfo** - Display node status and stats

### Status Monitoring
- **CodexDebugConsole** - Real-time operation logs
- Status indicators for connectivity

## Best Practices

1. **Error Handling**
   - Implement retry logic for failed uploads
   - Provide clear error messages to users
   - Handle network disconnections gracefully

2. **Performance**
   - Stream large files instead of loading into memory
   - Show upload/download progress
   - Implement request timeouts

3. **Security**
   - Use HTTPS for remote connections
   - Implement proper authentication
   - Validate CIDs before download

## Key Differences from Traditional Storage

1. **Content Addressing** - Files identified by content hash (CID)
2. **Decentralized** - No single point of failure
3. **Immutable** - Files cannot be modified after upload
4. **Distributed** - Files stored across multiple nodes

## Implementation Checklist

When implementing Codex in our project:
- [ ] Set up API proxy route for Codex requests
- [ ] Configure environment variables for endpoints
- [ ] Create CodexClient class with upload/download methods
- [ ] Implement useCodex hook for React integration
- [ ] Add CodexContext for global state management
- [ ] Create UI components for configuration
- [ ] Add progress tracking for file operations
- [ ] Implement error handling and retries
- [ ] Add status monitoring and debug tools
- [ ] Integrate with Waku for CID sharing