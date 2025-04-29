#!/usr/bin/env python3
import asyncio
import websockets
import json
import os
import time
import uuid
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger('blender-ws')
handler = RotatingFileHandler(
    'logs/websocket.log',
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
logger.addHandler(handler)

# Set up global variables
PORT = int(os.environ.get('WEBSOCKET_PORT', 4203))
HOST = os.environ.get('HOST', '0.0.0.0')
connected_clients = set()
mock_mode = os.environ.get('MOCK_BLENDER', 'false').lower() == 'true'

async def send_json(websocket, data):
    """Helper function to send JSON data"""
    await websocket.send(json.dumps(data))

async def handle_client(websocket):
    """Handle a WebSocket client connection"""
    client_id = str(uuid.uuid4())
    logger.info(f"New client connected: {client_id}")
    
    # Add client to connected clients
    connected_clients.add(websocket)
    
    try:
        # Send initial status
        await send_json(websocket, {
            "type": "status",
            "data": {
                "connected": True,
                "mode": "mock" if mock_mode else "real",
                "version": "Blender WebSocket Server v1.0"
            }
        })
        
        # Listen for messages
        async for message in websocket:
            try:
                # Parse message
                data = json.loads(message)
                command = data.get("command")
                logger.info(f"Received command: {command}")
                
                # Handle ping
                if command == "ping":
                    await send_json(websocket, {
                        "type": "pong",
                        "timestamp": time.time()
                    })
                
                # Handle execute
                elif command == "execute":
                    code = data.get("code", "")
                    if not code:
                        await send_json(websocket, {
                            "type": "error",
                            "error": "No code provided"
                        })
                        continue
                    
                    # Mock execution
                    logger.info(f"Executing code: {code[:50]}...")
                    
                    # Simulate processing time
                    await asyncio.sleep(0.5)
                    
                    # Send success response
                    await send_json(websocket, {
                        "type": "result",
                        "success": True,
                        "data": {
                            "output": f"Executed: {code[:50]}...",
                            "success": True,
                            "mocked": True
                        }
                    })
                
                # Handle other commands
                else:
                    await send_json(websocket, {
                        "type": "result",
                        "success": True,
                        "data": {
                            "message": f"Command '{command}' processed successfully",
                            "mocked": True
                        }
                    })
            
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received: {message[:100]}")
                await send_json(websocket, {
                    "type": "error",
                    "error": "Invalid JSON"
                })
            
            except Exception as e:
                logger.error(f"Error processing message: {str(e)}")
                await send_json(websocket, {
                    "type": "error",
                    "error": str(e)
                })
    
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"Client disconnected: {client_id}")
    
    except Exception as e:
        logger.error(f"Error in WebSocket handler: {str(e)}")
    
    finally:
        # Remove client from connected clients
        connected_clients.discard(websocket)
        logger.info(f"Client removed: {client_id}")

async def start_server():
    """Start the WebSocket server"""
    logger.info(f"Starting WebSocket server on {HOST}:{PORT}")
    
    # websockets v10+ simplified syntax for newer versions
    try:
        server = await websockets.serve(lambda ws: handle_client(ws), HOST, PORT)
        logger.info(f"WebSocket server running on ws://{HOST}:{PORT}")
        await asyncio.Future()  # Run forever
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}", exc_info=True)

def main():
    """Main entry point"""
    try:
        # Create logs directory if not exists
        os.makedirs('logs', exist_ok=True)
        
        # Start the WebSocket server
        asyncio.run(start_server())
    
    except KeyboardInterrupt:
        logger.info("Server stopped by keyboard interrupt")
    
    except Exception as e:
        logger.error(f"Error starting server: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code) 