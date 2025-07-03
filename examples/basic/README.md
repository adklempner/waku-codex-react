# Basic Waku Connection Example

This example demonstrates the most basic usage of the Waku service - connecting to the network and monitoring peers.

## What it does

1. Connects to the Waku network using default bootstrap nodes
2. Displays the connection status
3. Shows the node ID once connected
4. Monitors and displays the peer count in real-time
5. Lists all connected peers with their IDs

## Running the example

```bash
npm run example:basic
```

Then open http://localhost:5173 in your browser.

## Expected behavior

1. Click "Connect to Waku Network"
2. Status should change from "idle" → "connecting" → "connected"
3. Within 15 seconds, you should see at least 1 peer connected
4. The peer count should update every second
5. Connected peer IDs will be listed

## Success criteria

- ✅ Status shows "connected"
- ✅ At least 1 peer is connected
- ✅ Node ID is displayed
- ✅ No errors in the console

## Troubleshooting

If no peers connect:
- Check your internet connection
- Ensure WebSocket connections are not blocked
- Try refreshing the page
- Check browser console for errors