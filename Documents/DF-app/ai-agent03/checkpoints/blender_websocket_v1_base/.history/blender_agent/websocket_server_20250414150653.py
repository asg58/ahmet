#!/usr/bin/env python
# Blender WebSocket Server
# Run with: blender -b -P blender_agent/websocket_server.py

import asyncio
import json
import logging
import signal
import sys
import traceback
import websockets
import platform

# Make sure Blender's python environment has websockets installed
# You may need to install it in Blender's Python: 
# /path/to/blender/python/bin/pip install websockets

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger('blender-websocket-server')

# Import bpy here to ensure we're running inside Blender
try:
    import bpy
    logger.info("Successfully imported bpy, running inside Blender")
except ImportError:
    logger.error("Failed to import bpy. Make sure this script is run from within Blender")
    logger.error("Use: blender -b -P blender_agent/websocket_server.py")
    sys.exit(1)

# Port for the WebSocket server
PORT = 8765

class BlenderWebSocketServer:
    def __init__(self, host="localhost", port=PORT):
        self.host = host
        self.port = port
        self.clients = set()
        self.running = True
        
    async def handle_client(self, websocket, path):
        """Handle a client connection"""
        self.clients.add(websocket)
        try:
            logger.info(f"Client connected: {websocket.remote_address}")
            
            async for message in websocket:
                await self.process_message(websocket, message)
                
        except websockets.exceptions.ConnectionClosed:
            logger.info(f"Client disconnected: {websocket.remote_address}")
        finally:
            self.clients.remove(websocket)
            
    async def process_message(self, websocket, message):
        """Process incoming messages from clients"""
        try:
            # Parse the message as JSON
            data = json.loads(message)
            logger.info(f"Received message: {data['type'] if 'type' in data else 'unknown'}")
            
            # Handle different message types
            if data.get('type') == 'bpy_script':
                result = await self.execute_bpy_script(data.get('code', ''))
                await websocket.send(json.dumps(result))
            else:
                await websocket.send(json.dumps({
                    "status": "error",
                    "details": f"Unknown message type: {data.get('type')}"
                }))
                
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                "status": "error",
                "details": "Invalid JSON format"
            }))
        except Exception as e:
            logger.error(f"Error processing message: {e}")
            await websocket.send(json.dumps({
                "status": "error",
                "details": str(e)
            }))
            
    async def execute_bpy_script(self, code):
        """Execute Blender Python code"""
        if not code:
            return {"status": "error", "details": "No code provided"}
            
        logger.info(f"Executing Blender code")
        
        try:
            # Create a local namespace with bpy pre-imported
            local_namespace = {'bpy': bpy}
            
            # Execute the code in this namespace
            exec(code, globals(), local_namespace)
            
            return {
                "status": "ok",
                "details": "Code executed successfully"
            }
        except Exception as e:
            error_msg = f"Error executing code: {str(e)}"
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            
            return {
                "status": "error",
                "details": error_msg,
                "traceback": traceback.format_exc()
            }

    async def server_task(self):
        """Main server task"""
        server = await websockets.serve(
            self.handle_client, 
            self.host, 
            self.port
        )
        
        logger.info(f"Blender WebSocket Server started on ws://{self.host}:{self.port}")
        
        # Keep the server running
        while self.running:
            await asyncio.sleep(1)
        
        # Close the server
        server.close()
        await server.wait_closed()
        logger.info("Server closed")
            
    async def start_server(self):
        """Start the WebSocket server"""
        try:
            await self.server_task()
        except Exception as e:
            logger.error(f"Server error: {e}")
            logger.error(traceback.format_exc())

# Main function to start the server
async def main():
    server = BlenderWebSocketServer()
    await server.start_server()

# Start the server if running as a script
if __name__ == "__main__":
    try:
        # Set up asyncio
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by keyboard interrupt")
    except Exception as e:
        logger.error(f"Server error: {e}")
        logger.error(traceback.format_exc()) 