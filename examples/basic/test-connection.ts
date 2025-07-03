import { WakuService } from '../../src/services/waku/WakuService';

async function testWakuConnection() {
  console.log('🚀 Starting Waku connection test...\n');
  
  const waku = new WakuService({
    debug: true, // Enable debug logging
  });

  // Listen to status changes
  waku.on('statusChange', (status) => {
    console.log(`📊 Status changed: ${status}`);
  });

  waku.on('error', (error) => {
    console.error('❌ Error:', error.message);
  });

  waku.on('connect', () => {
    console.log('✅ Connected successfully!');
  });

  try {
    // Connect to Waku network
    console.log('🔌 Connecting to Waku network...');
    await waku.connect();
    
    // Wait a bit for peers to connect
    console.log('\n⏳ Waiting for peers...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check peer count
    const peerCount = waku.peers;
    console.log(`\n👥 Connected peers: ${peerCount}`);
    
    if (peerCount > 0) {
      console.log('✅ SUCCESS: At least one peer connected!');
      
      // Get detailed peer info
      const peers = await waku.getPeers();
      console.log('\n📋 Peer details:');
      peers.forEach((peer, idx) => {
        console.log(`  ${idx + 1}. ${peer.id} - ${peer.connected ? 'Connected' : 'Disconnected'}`);
      });
    } else {
      console.log('⚠️  WARNING: No peers connected yet');
    }
    
    // Keep connection alive for 10 more seconds
    console.log('\n⏱️  Keeping connection alive for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    // Disconnect
    console.log('\n🔌 Disconnecting...');
    await waku.disconnect();
    console.log('👋 Test complete!');
    process.exit(0);
  }
}

// Run the test
testWakuConnection().catch(console.error);