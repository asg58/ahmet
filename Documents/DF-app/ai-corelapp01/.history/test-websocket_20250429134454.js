const WebSocket = require('ws');

console.log('Testing WebSocket connection to Blender bridge...');

// Try all possible endpoints that the server might be using
const endpoints = [
  'ws://localhost:4202',
  'ws://127.0.0.1:4202',
  'ws://host.docker.internal:4202',
  'ws://blender-bridge:4202',
];

// Track connection status
let connected = false;

// Try to connect to each endpoint
endpoints.forEach((endpoint) => {
  console.log(`Attempting to connect to ${endpoint}...`);
  
  const ws = new WebSocket(endpoint);
  
  ws.on('open', () => {
    console.log(`Successfully connected to ${endpoint}!`);
    connected = true;
    
    // Send a ping message
    console.log('Sending ping message...');
    ws.send(JSON.stringify({
      command: 'ping',
      timestamp: Date.now()
    }));
  });
  
  ws.on('message', (data) => {
    console.log(`Received message from ${endpoint}:`, data.toString());
    
    // Close connection after receiving a message
    ws.close();
    console.log('Connection closed.');
  });
  
  ws.on('error', (error) => {
    console.log(`Error connecting to ${endpoint}:`, error.message);
    // We don't need to close, it will be auto-closed on error
  });
});

// Check after 5 seconds if any connection was successful
setTimeout(() => {
  if (!connected) {
    console.log('Failed to connect to any WebSocket endpoint.');
    console.log('Make sure the Blender bridge WebSocket server is running on port 4202.');
  }
}, 5000); 