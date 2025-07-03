import React, { useEffect, useState } from 'react';
import { useWaku } from '../../src/hooks/waku/useWaku';

export function BasicWakuConnection() {
  const waku = useWaku();
  const [peers, setPeers] = useState<number>(0);
  const [peersInfo, setPeersInfo] = useState<string[]>([]);

  // Monitor peer count
  useEffect(() => {
    if (!waku.service) return;

    const interval = setInterval(async () => {
      const peerCount = waku.service.peers;
      setPeers(peerCount);
      
      // Get detailed peer info
      try {
        const peerList = await waku.service.getPeers();
        setPeersInfo(peerList.map(p => `${p.id} (${p.connected ? 'connected' : 'disconnected'})`));
      } catch (error) {
        console.error('Failed to get peer info:', error);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [waku.service]);

  const handleConnect = async () => {
    try {
      console.log('Starting Waku connection...');
      await waku.connect();
      console.log('Waku connection initiated');
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await waku.disconnect();
      console.log('Disconnected from Waku');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Basic Waku Connection Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Status: {waku.status}</h2>
        {waku.service && (
          <>
            <p>Node ID: {waku.service.nodeId}</p>
            <p>Peer Count: {peers}</p>
          </>
        )}
      </div>

      <div style={{ marginBottom: '20px' }}>
        {waku.status === 'idle' || waku.status === 'disconnected' ? (
          <button onClick={handleConnect} style={{ padding: '10px 20px' }}>
            Connect to Waku Network
          </button>
        ) : (
          <button onClick={handleDisconnect} style={{ padding: '10px 20px' }}>
            Disconnect
          </button>
        )}
      </div>

      {waku.error && (
        <div style={{ color: 'red', marginBottom: '20px' }}>
          <h3>Error:</h3>
          <pre>{JSON.stringify(waku.error, null, 2)}</pre>
        </div>
      )}

      {peersInfo.length > 0 && (
        <div>
          <h3>Connected Peers:</h3>
          <ul>
            {peersInfo.map((peer, idx) => (
              <li key={idx}>{peer}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p>This example connects to the Waku network and monitors peer connections.</p>
        <p>A successful connection should show at least 1 peer within 15 seconds.</p>
      </div>
    </div>
  );
}