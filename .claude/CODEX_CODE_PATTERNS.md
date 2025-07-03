# Codex Code Patterns and Implementation Details

## CodexClient Implementation Pattern

### Singleton Instance Management
```typescript
let codexClientInstance: CodexClient | null = null;

export const getCodexClient = (settings: SettingsContextType): CodexClient => {
  if (!codexClientInstance || 
      codexClientInstance.nodeUrl !== settings.codexNodeUrl ||
      codexClientInstance.endpointType !== settings.codexEndpointType) {
    codexClientInstance = new CodexClient(settings);
  }
  return codexClientInstance;
};
```

### CodexClient Class Structure
```typescript
export class CodexClient {
  private nodeUrl: string;
  private endpointType: 'remote' | 'local';
  private lastStatusCheck: Date | null = null;
  private lastNodeActive: boolean = false;
  private readonly statusCacheDuration = 30000; // 30 seconds

  constructor(settings: SettingsContextType) {
    this.endpointType = settings.codexEndpointType;
    this.nodeUrl = this.getNodeUrl(settings);
  }
}
```

## API Proxy Pattern

```typescript
// /pages/api/codex/[...path].ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path || '';
  
  const apiUrl = `${process.env.NEXT_PUBLIC_CODEX_REMOTE_API_URL}/${pathString}`;
  
  // Handle file uploads with raw body
  const rawBody = await getRawBody(req);
  
  const response = await axios({
    method: req.method as Method,
    url: apiUrl,
    headers: {
      'Authorization': 'Basic ' + Buffer.from(
        `${username}:${password}`
      ).toString('base64'),
      ...preservedHeaders
    },
    data: rawBody,
    responseType: 'stream'
  });
}
```

## File Upload Pattern

```typescript
async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Progress tracking
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percentComplete = (event.loaded / event.total) * 100;
        onProgress(percentComplete);
      }
    };
    
    xhr.onload = () => {
      if (xhr.status === 200) {
        const result = this.parseUploadResponse(xhr.responseText);
        resolve(result);
      } else {
        reject(new Error(`Upload failed: ${xhr.statusText}`));
      }
    };
    
    xhr.open('POST', `${this.nodeUrl}/v1/data`);
    xhr.send(file);
  });
}
```

## Response Parsing Pattern

```typescript
private parseUploadResponse(responseText: string): UploadResponse {
  try {
    const jsonResponse = JSON.parse(responseText);
    
    // Try different response formats
    const fileId = jsonResponse.id || 
                  jsonResponse.cid || 
                  jsonResponse.data?.id || 
                  jsonResponse.data?.cid ||
                  responseText.trim();
    
    return {
      success: true,
      fileId: fileId,
      message: 'File uploaded successfully',
    };
  } catch (error) {
    // Fallback to plain text response
    return {
      success: true,
      fileId: responseText.trim(),
      message: 'File uploaded successfully',
    };
  }
}
```

## Status Check Pattern

```typescript
async isNodeActive(forceCheck: boolean = false): Promise<boolean> {
  // Cache check
  if (!forceCheck && this.lastStatusCheck) {
    const timeSinceLastCheck = Date.now() - this.lastStatusCheck.getTime();
    if (timeSinceLastCheck < this.statusCacheDuration) {
      return this.lastNodeActive;
    }
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${this.nodeUrl}/v1/debug/info`, {
      signal: controller.signal,
      ...this.getFetchOptions()
    });
    
    clearTimeout(timeoutId);
    
    const active = response.ok;
    this.lastNodeActive = active;
    this.lastStatusCheck = new Date();
    
    return active;
  } catch (error) {
    this.lastNodeActive = false;
    this.lastStatusCheck = new Date();
    return false;
  }
}
```

## Context Hook Pattern

```typescript
export const CodexProvider: React.FC<CodexProviderProps> = ({ children }) => {
  const settings = useSettingsContext();
  const { showToast } = useToast();
  const codex = useCodex(settings);
  
  // Check node status on mount and settings change
  useEffect(() => {
    const checkNodeStatus = async () => {
      const isActive = await codex.checkStatus();
      if (!isActive && settings.codexEndpointType === 'local') {
        showToast('Codex node is not reachable', 'error');
      }
    };
    
    checkNodeStatus();
  }, [settings.codexNodeUrl, settings.codexEndpointType]);
  
  return (
    <CodexContext.Provider value={codex}>
      {children}
    </CodexContext.Provider>
  );
};
```

## File Transfer Integration Pattern

```typescript
const handleUpload = async (file: File) => {
  try {
    setIsUploading(true);
    
    let uploadFile = file;
    let encryptionData = null;
    
    // Encrypt if needed
    if (encryptionEnabled && tacoContext) {
      const encrypted = await tacoContext.encryptFile(file, accessCondition);
      uploadFile = encrypted.file;
      encryptionData = encrypted;
    }
    
    // Upload to Codex
    const uploadResult = await codexContext.uploadFile(
      uploadFile, 
      (progress) => setUploadProgress(progress)
    );
    
    if (!uploadResult.success) {
      throw new Error(uploadResult.message);
    }
    
    // Share via Waku
    await wakuContext.sendFileMessage({
      timestamp: Date.now(),
      sender: settings.username,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      fileId: uploadResult.fileId,
      isEncrypted: encryptionEnabled,
      accessCondition: encryptionData?.accessCondition,
    });
    
  } finally {
    setIsUploading(false);
    setUploadProgress(0);
  }
};
```

## Error Handling Patterns

```typescript
// Network error detection
private isNetworkError(error: any): boolean {
  return error instanceof TypeError && 
         error.message.includes('Failed to fetch');
}

// Abort error detection
private isAbortError(error: any): boolean {
  return error instanceof DOMException && 
         error.name === 'AbortError';
}

// Generic error handling
try {
  const result = await this.makeRequest(endpoint, method, body);
  return result;
} catch (error) {
  if (this.isAbortError(error)) {
    throw new Error('Request timed out');
  }
  if (this.isNetworkError(error)) {
    throw new Error('Network error - is Codex node running?');
  }
  throw error;
}
```

## Configuration Management

```typescript
private getNodeUrl(settings: SettingsContextType): string {
  if (settings.codexEndpointType === 'remote') {
    return '/api/codex';
  }
  
  return settings.codexNodeUrl || 
         process.env.NEXT_PUBLIC_CODEX_LOCAL_API_URL || 
         'http://localhost:8080/api/codex';
}

private getFetchOptions(): RequestInit {
  return {
    mode: 'cors' as RequestMode,
    credentials: this.endpointType === 'remote' ? 'include' : 'same-origin',
    headers: {
      'Accept': 'application/json',
    },
  };
}
```

## Key Implementation Notes

1. **Singleton Pattern**: CodexClient uses singleton to prevent multiple instances
2. **Status Caching**: 30-second cache for node status to reduce API calls
3. **Dual Mode Support**: Seamless switching between local and remote endpoints
4. **Progress Tracking**: XMLHttpRequest used for upload progress monitoring
5. **Response Flexibility**: Handles multiple response formats from Codex API
6. **Error Recovery**: Comprehensive error detection and user-friendly messages
7. **Integration Points**: Clean interfaces with Waku and TACo contexts
8. **Type Safety**: Full TypeScript typing for all operations