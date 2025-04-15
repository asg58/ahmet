#!/usr/bin/env python3

"""
WebSocket server implementation for Blender automation.
This script must be run from within Blender as it requires the bpy module.
"""

import asyncio
import json
import logging
import platform
import signal
import sys
import traceback
import websockets
from typing import Any, Dict, Optional, Set, Tuple, Union

# Type hint for bpy module
try:
    import bpy  # type: ignore # bpy is only available in Blender
    BLENDER_AVAILABLE = True
except ImportError:
    BLENDER_AVAILABLE = False
    # Create a mock bpy module for type checking
    class MockBpy:
        """Mock bpy module for type checking outside of Blender."""
        class ops:
            class mesh:
                @staticmethod
                def primitive_cube_add(*args, **kwargs) -> None:
                    pass
            class object:
                @staticmethod
                def text_add(*args, **kwargs) -> None:
                    pass
            class wm:
                @staticmethod
                def save_as_mainfile(*args, **kwargs) -> None:
                    pass

    bpy = MockBpy()  # type: ignore

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

PORT = 8765

class BlenderWebSocketServer:
    """WebSocket server for Blender Python API communication."""
    
    def __init__(self, host='localhost', port=PORT):
        """Initialize the WebSocket server."""
        self.host = host
        self.port = port
        self.clients = set()
        self.running = True
    
    async def handle_client(self, websocket, path):
        """Handle a client connection."""
        self.clients.add(websocket)
        try:
            logger.info(f'Client connected: {websocket.remote_address}')
            async for message in websocket:
                await self.process_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            logger.info(f'Client disconnected: {websocket.remote_address}')
        finally:
            self.clients.remove(websocket)
    
    async def process_message(self, websocket, message):
        """Process incoming messages from clients."""
        try:
            data = json.loads(message)
            logger.info(f"Received message: {(data['type'] if 'type' in data else 'unknown')}")
            
            if data.get('type') == 'bpy_script':
                result = await self.execute_bpy_script(data.get('code', ''))
                await websocket.send(json.dumps(result))
            else:
                await websocket.send(json.dumps({
                    'status': 'error',
                    'details': f"Unknown message type: {data.get('type')}"
                }))
        except json.JSONDecodeError:
            await websocket.send(json.dumps({
                'status': 'error',
                'details': 'Invalid JSON format'
            }))
        except Exception as e:
            logger.error(f'Error processing message: {e}')
            await websocket.send(json.dumps({
                'status': 'error',
                'details': str(e)
            }))
    
    async def execute_bpy_script(self, code):
        """Execute Blender Python code."""
        if not code:
            return {'status': 'error', 'details': 'No code provided'}
        
        logger.info('Executing Blender code')
        try:
            local_namespace = {'bpy': bpy}
            exec(code, globals(), local_namespace)
            return {'status': 'ok', 'details': 'Code executed successfully'}
        except Exception as e:
            error_msg = f'Error executing code: {str(e)}'
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return {
                'status': 'error',
                'details': error_msg,
                'traceback': traceback.format_exc()
            }
    
    async def server_task(self):
        """Main server task."""
        server = await websockets.serve(self.handle_client, self.host, self.port)
        logger.info(f'Blender WebSocket Server started on ws://{self.host}:{self.port}')
        
        while self.running:
            await asyncio.sleep(1)
        
        server.close()
        await server.wait_closed()
        logger.info('Server closed')
    
    async def start_server(self):
        """Start the WebSocket server."""
        try:
            await self.server_task()
        except Exception as e:
            logger.error(f'Server error: {e}')
            logger.error(traceback.format_exc())

async def main():
    """Main function to start the server."""
    server = BlenderWebSocketServer()
    await server.start_server()

if __name__ == '__main__':
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info('Server stopped by keyboard interrupt')
    except Exception as e:
        logger.error(f'Server error: {e}')
        logger.error(traceback.format_exc())

