import { useState } from 'react';
import { useWaku, useCodex, useFileUpload, useFileDownload } from '@/hooks';
import './App.css';

function App() {
  const waku = useWaku();
  const codex = useCodex();
  const { uploads, upload } = useFileUpload();
  const { downloads, download } = useFileDownload();
  const [cid, setCid] = useState('');


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
      <h1>Waku-Codex React Template</h1>
      
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

export default App;