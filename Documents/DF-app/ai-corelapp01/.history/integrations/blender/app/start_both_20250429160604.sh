#!/bin/bash

# Print startup message
echo "Starting Blender Bridge servers..."

# Create logs directory if not exists
mkdir -p logs

# Start the WebSocket server in the background
echo "Starting WebSocket server on port $WEBSOCKET_PORT..."
python3 websocket_server.py &
WEBSOCKET_PID=$!

# Wait for WebSocket server to start
sleep 2

# Start the Flask server with disabled secondary websocket
echo "Starting REST API server on port $PORT..."
export DISABLE_SECONDARY_WEBSOCKET=true
python3 server.py

# If Flask server exits, also kill the WebSocket server
kill $WEBSOCKET_PID 