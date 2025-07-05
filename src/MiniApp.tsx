import { useState, useEffect } from 'react';
import sdk from '@farcaster/miniapp-sdk';
import { FarcasterMiniapp, useFarcasterContext } from './components/FarcasterMiniapp';
import { useWaku, useCodex, useFileUpload, useFileDownload } from '@/hooks';
import { Context } from '@farcaster/miniapp-sdk';
import './App.css';

function MiniAppContent() {
  const { context, isInMiniApp } = useFarcasterContext();
  const waku = useWaku();
  const codex = useCodex();
  const { uploads, upload } = useFileUpload();
  const { downloads, download } = useFileDownload();
  const [cid, setCid] = useState('');
  const [primaryButtonText, setPrimaryButtonText] = useState('Share');

  // Set up primary button when in miniapp
  useEffect(() => {
    if (!isInMiniApp) return;

    // Configure primary button
    sdk.actions.setPrimaryButton({
      text: primaryButtonText,
    });

    // Listen for button clicks
    const handlePrimaryClick = () => {
      // Share the most recent upload
      const lastUpload = uploads.find(u => u.status === 'completed' && u.cid);
      if (lastUpload && lastUpload.cid) {
        shareFile(lastUpload.cid, lastUpload.file.name);
      }
    };

    sdk.on('primaryButtonClicked', handlePrimaryClick);

    return () => {
      sdk.off('primaryButtonClicked', handlePrimaryClick);
    };
  }, [isInMiniApp, primaryButtonText, uploads]);

  const shareFile = async (cid: string, fileName: string) => {
    if (!isInMiniApp) return;

    try {
      // Compose a cast with the file info
      await sdk.actions.composeCast({
        text: `Check out this file I uploaded using Waku-Codex:\n\nFile: ${fileName}\nCID: ${cid}\n\nAccess it at rhetoric.space`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };


  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await upload(file);
      console.log('Upload complete:', result);
      
      // Update primary button when upload completes
      if (isInMiniApp && result.cid) {
        setPrimaryButtonText(`Share ${file.name}`);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleDownload = async () => {
    if (!cid) return;
    
    try {
      await download(cid);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  // Apply safe area insets if in miniapp
  const safeAreaStyle = isInMiniApp && context?.client?.safeAreaInsets ? {
    paddingTop: context.client.safeAreaInsets.top,
    paddingBottom: context.client.safeAreaInsets.bottom,
    paddingLeft: context.client.safeAreaInsets.left,
    paddingRight: context.client.safeAreaInsets.right,
  } : {};

  return (
    <div className="app" style={safeAreaStyle}>
      <h1>Waku-Codex {isInMiniApp ? 'Farcaster MiniApp' : 'App'}</h1>
      
      {isInMiniApp && context && (
        <div style={{ 
          background: '#f0f0ff', 
          padding: '10px', 
          borderRadius: '8px',
          marginBottom: '20px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              <p style={{ margin: 0 }}>
                👋 Welcome, {context.user.displayName || context.user.username}!
              </p>
              <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>
                FID: {context.user.fid}
              </p>
            </div>
          </div>
          
          {context.location && (
            <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
              Opened from: {context.location.type.replace(/_/g, ' ')}
            </p>
          )}
        </div>
      )}
      
      <div className="status-section">
        <h2>Service Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <span>Waku:</span>
            <span className={`status-badge ${waku.status}`}>{waku.status}</span>
            {waku.service && <span>({waku.service.peers} peers)</span>}
            <div className="service-buttons">
              {(waku.status === 'idle' || waku.status === 'disconnected') && (
                <button onClick={() => waku.connect()}>Connect Waku</button>
              )}
              {waku.status === 'connected' && (
                <button onClick={() => waku.disconnect()}>Disconnect Waku</button>
              )}
            </div>
          </div>
          <div className="status-item">
            <span>Codex:</span>
            <span className={`status-badge ${codex.status}`}>{codex.status}</span>
            <div className="service-buttons">
              {(codex.status === 'idle' || codex.status === 'disconnected') && (
                <button onClick={() => codex.connect()}>Connect Codex</button>
              )}
              {codex.status === 'connected' && (
                <button onClick={() => codex.disconnect()}>Disconnect Codex</button>
              )}
            </div>
          </div>
        </div>
        
        {(waku.error || codex.error) && (
          <div className="error-message">
            {waku.error && <p>Waku Error: {waku.error.message}</p>}
            {codex.error && <p>Codex Error: {codex.error.message}</p>}
          </div>
        )}
      </div>

      <div className="upload-section">
        <h2>File Upload</h2>
        <input
          type="file"
          onChange={handleFileSelect}
          disabled={codex.status !== 'connected'}
        />
        
        {uploads.length > 0 && (
          <div className="uploads-list">
            <h3>Uploads:</h3>
            {uploads.map(upload => (
              <div key={upload.id} className="upload-item">
                <span>{upload.file.name}</span>
                <span>{upload.status}</span>
                {upload.status === 'uploading' && (
                  <progress value={upload.progress} max="100" />
                )}
                {upload.cid && (
                  <>
                    <code className="cid">{upload.cid}</code>
                    {isInMiniApp && (
                      <button 
                        onClick={() => shareFile(upload.cid!, upload.file.name)}
                        style={{ 
                          padding: '4px 8px', 
                          fontSize: '12px',
                          marginLeft: '8px' 
                        }}
                      >
                        Share
                      </button>
                    )}
                  </>
                )}
                {upload.error && (
                  <span className="error">{upload.error.message}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="download-section">
        <h2>File Download</h2>
        <div className="download-form">
          <input
            type="text"
            placeholder="Enter CID"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            disabled={codex.status !== 'connected'}
          />
          <button 
            onClick={handleDownload}
            disabled={!cid || codex.status !== 'connected'}
          >
            Download
          </button>
        </div>
        
        {downloads.length > 0 && (
          <div className="downloads-list">
            <h3>Downloads:</h3>
            {downloads.map(download => (
              <div key={download.id} className="download-item">
                <span>{download.fileName || download.cid}</span>
                <span>{download.status}</span>
                {download.status === 'downloading' && (
                  <progress value={download.progress} max="100" />
                )}
                {download.error && (
                  <span className="error">{download.error.message}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {isInMiniApp && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          background: '#f9f9f9', 
          borderRadius: '8px',
          fontSize: '12px',
          color: '#666' 
        }}>
          <p style={{ margin: '0 0 5px 0' }}>
            <strong>MiniApp Features:</strong>
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Use the primary button at the top to share uploaded files</li>
            <li>Safe area insets are applied for mobile devices</li>
            <li>Your Farcaster profile is automatically loaded</li>
          </ul>
        </div>
      )}
    </div>
  );
}

export function MiniApp() {
  const handleReady = (context: Context.MiniAppContext) => {
    console.log('Farcaster miniapp ready!', context);
    
    // Log launch context
    console.log('Launched from:', context.location?.type);
    console.log('User:', context.user);
  };

  const handleError = (error: Error) => {
    console.error('Farcaster miniapp error:', error);
  };

  return (
    <FarcasterMiniapp onReady={handleReady} onError={handleError}>
      <MiniAppContent />
    </FarcasterMiniapp>
  );
}