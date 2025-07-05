import { useState } from 'react';
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

  const handleConnect = async () => {
    try {
      await waku.connect();
      await codex.connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await waku.disconnect();
      await codex.disconnect();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await upload(file);
      console.log('Upload complete:', result);
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

  return (
    <div className="app">
      <h1>Waku-Codex Farcaster MiniApp</h1>
      
      {isInMiniApp && context && (
        <div style={{ 
          background: '#f0f0ff', 
          padding: '10px', 
          borderRadius: '8px',
          marginBottom: '20px' 
        }}>
          <p>👋 Welcome, {context.user.displayName || context.user.username}!</p>
          <p style={{ fontSize: '12px', color: '#666' }}>
            FID: {context.user.fid}
          </p>
        </div>
      )}
      
      <div className="status-section">
        <h2>Service Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <span>Waku:</span>
            <span className={`status-badge ${waku.status}`}>{waku.status}</span>
            {waku.service && <span>({waku.service.peers} peers)</span>}
          </div>
          <div className="status-item">
            <span>Codex:</span>
            <span className={`status-badge ${codex.status}`}>{codex.status}</span>
          </div>
        </div>
        
        <div className="button-group">
          {(waku.status === 'idle' || waku.status === 'disconnected') && (
            <button onClick={handleConnect}>Connect Services</button>
          )}
          {(waku.status === 'connected' || codex.status === 'connected') && (
            <button onClick={handleDisconnect}>Disconnect</button>
          )}
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
                  <code className="cid">{upload.cid}</code>
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
    </div>
  );
}

export function MiniApp() {
  const handleReady = (context: Context.MiniAppContext) => {
    console.log('Farcaster miniapp ready!', context);
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