# Waku-Codex React Template

A clean, developer-friendly React template for building decentralized applications with Waku (P2P messaging) and Codex (distributed storage).

## Features

- **TypeScript First**: Full type safety throughout the application
- **Service Abstraction**: Clean interfaces for Waku and Codex services
- **React Hooks**: Custom hooks for all service interactions
- **DRY Principles**: Reusable patterns and minimal boilerplate
- **Developer Experience**: Built-in error handling, debugging tools, and clear APIs

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Architecture

### Service Layer
- `WakuService`: Handles P2P messaging via Waku protocol
- `CodexService`: Manages distributed file storage

### Hooks
- `useWaku()`: Connect and manage Waku service
- `useCodex()`: Connect and manage Codex service
- `useWakuMessages()`: Send and receive messages
- `useFileUpload()`: Upload files with progress tracking
- `useFileDownload()`: Download files from Codex

### Key Abstractions
- **Service Interface**: Common interface for all services
- **Message Protocol**: Type-safe message encoding/decoding
- **Error Handling**: Consistent error types across services

## Usage Example

```typescript
import { useWaku, useCodex, useFileUpload } from '@/hooks';

function MyApp() {
  const waku = useWaku();
  const codex = useCodex();
  const { upload } = useFileUpload();

  // Connect services
  const handleConnect = async () => {
    await waku.connect();
    await codex.connect();
  };

  // Upload a file
  const handleFileUpload = async (file: File) => {
    const result = await upload(file);
    console.log('File uploaded:', result.cid);
  };

  return (
    <div>
      <button onClick={handleConnect}>Connect</button>
      <input type="file" onChange={(e) => handleFileUpload(e.target.files[0])} />
    </div>
  );
}
```

## Configuration

### Waku Configuration
```typescript
const wakuConfig = {
  bootstrap: [...], // Bootstrap nodes
  protocols: ['filter', 'light-push'],
  networkConfig: {
    clusterID: 42,
    shards: [0]
  }
};
```

### Codex Configuration
```typescript
const codexConfig = {
  endpoint: 'http://localhost:8080/api/codex',
  endpointType: 'local', // or 'remote'
  timeout: 30000
};
```

## Development

### Project Structure
```
src/
├── services/      # Core service implementations
├── hooks/         # React hooks
├── types/         # TypeScript types
├── components/    # UI components
└── utils/         # Utilities
```

### Running Codex Locally

1. Download Codex from [codex.storage](https://codex.storage)
2. Start Codex node: `codex --api-port=8080`
3. Configure the app to use local endpoint

## Examples

### Basic Waku Connection
Validates that the Waku service can connect to the network:

```bash
npm run example:basic
```

Then open http://localhost:5173 to see the connection status and peer count.

## License

MIT