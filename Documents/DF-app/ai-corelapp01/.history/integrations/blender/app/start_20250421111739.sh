#!/bin/bash

# Start Xvfb als virtueel X display voor Blender
echo "Starting Xvfb virtual display..."
Xvfb :1 -screen 0 1280x720x24 &
export DISPLAY=:1

# Wacht even tot Xvfb volledig is opgestart
sleep 2

# Controleer of Blender werkt
echo "Testing Blender installation..."
/opt/blender/blender --version

# Start de REST API en WebSocket server
echo "Starting Blender Bridge server on port $PORT and WebSocket server on port $WEBSOCKET_PORT"
python3 server.py 