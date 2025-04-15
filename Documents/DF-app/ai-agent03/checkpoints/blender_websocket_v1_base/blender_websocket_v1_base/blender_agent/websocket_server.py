import asyncio
import json
import logging
import platform
import signal
import sys
import traceback
import bpy
import websockets

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', handlers=[logging.StreamHandler()])
logger = logging.getLogger('blender-websocket-server')
try:
    import bpy
    logger.info('Successfully imported bpy, running inside Blender')
except ImportError:
    logger.error('Failed to import bpy. Make sure this script is run from within Blender')
    logger.error('Use: blender -b -P blender_agent/websocket_server.py')
    sys.exit(1)
PORT = 8765
class BlenderWebSocketServer:
    """BlenderWebSocketServer class."""

    def __init__(self, host='localhost', port=PORT):
        """__init__ function."""
        self.host = host
        self.port = port
        self.clients = set()
        self.running = True

    async def handle_client(self, websocket, path):
        """Handle a client connection"""
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
        """Process incoming messages from clients"""
        try:
            data = json.loads(message)
            logger.info(f"Received message: {(data['type'] if 'type' in data else 'unknown')}")
            if data.get('type') == 'bpy_script':
                result = await self.execute_bpy_script(data.get('code', ''))
                await websocket.send(json.dumps(result))
            else:
                await websocket.send(json.dumps({'status': 'error', 'details': f"Unknown message type: {data.get('type')}"}))
        except json.JSONDecodeError:
            await websocket.send(json.dumps({'status': 'error', 'details': 'Invalid JSON format'}))
        except Exception as e:
            logger.error(f'Error processing message: {e}')
            await websocket.send(json.dumps({'status': 'error', 'details': str(e)}))

    async def execute_bpy_script(self, code):
        """Execute Blender Python code"""
        if not code:
            return {'status': 'error', 'details': 'No code provided'}
        logger.info(f'Executing Blender code')
        try:
            local_namespace = {'bpy': bpy}
            exec(code, globals(), local_namespace)
            return {'status': 'ok', 'details': 'Code executed successfully'}
        except Exception as e:
            error_msg = f'Error executing code: {str(e)}'
            logger.error(error_msg)
            logger.error(traceback.format_exc())
            return {'status': 'error', 'details': error_msg, 'traceback': traceback.format_exc()}

    async def server_task(self):
        """Main server task"""
        server = await websockets.serve(self.handle_client, self.host, self.port)
        logger.info(f'Blender WebSocket Server started on ws://{self.host}:{self.port}')
        while self.running:
            await asyncio.sleep(1)
        server.close()
        await server.wait_closed()
        logger.info('Server closed')

    async def start_server(self):
        """Start the WebSocket server"""
        try:
            await self.server_task()
        except Exception as e:
            logger.error(f'Server error: {e}')
            logger.error(traceback.format_exc())
async def main():
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
asyncio
json
logging
signal
sys
traceback
websockets
platform
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s', handlers=[logging.StreamHandler()])
logger
logging.getLogger('blender-websocket-server')
logger.info('Successfully imported bpy, running inside Blender')
except ImportError:
    logger.error('Failed to import bpy. Make sure this script is run from within Blender')
    logger.error('Use: blender -b -P blender_agent/websocket_server.py')
    sys.exit(1)
PORT
8765
'BlenderWebSocketServer class.'
def __init__(self, host='localhost', port=PORT):
    """__init__ function."""
    self.host = host
    self.port = port
    self.clients = set()
    self.running = True
async def handle_client(self, websocket, path):
    """Handle a client connection"""
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
    """Process incoming messages from clients"""
    try:
        data = json.loads(message)
        logger.info(f"Received message: {(data['type'] if 'type' in data else 'unknown')}")
        if data.get('type') == 'bpy_script':
            result = await self.execute_bpy_script(data.get('code', ''))
            await websocket.send(json.dumps(result))
        else:
            await websocket.send(json.dumps({'status': 'error', 'details': f"Unknown message type: {data.get('type')}"}))
    except json.JSONDecodeError:
        await websocket.send(json.dumps({'status': 'error', 'details': 'Invalid JSON format'}))
    except Exception as e:
        logger.error(f'Error processing message: {e}')
        await websocket.send(json.dumps({'status': 'error', 'details': str(e)}))
async def execute_bpy_script(self, code):
    """Execute Blender Python code"""
    if not code:
        return {'status': 'error', 'details': 'No code provided'}
    logger.info(f'Executing Blender code')
    try:
        local_namespace = {'bpy': bpy}
        exec(code, globals(), local_namespace)
        return {'status': 'ok', 'details': 'Code executed successfully'}
    except Exception as e:
        error_msg = f'Error executing code: {str(e)}'
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        return {'status': 'error', 'details': error_msg, 'traceback': traceback.format_exc()}
async def server_task(self):
    """Main server task"""
    server = await websockets.serve(self.handle_client, self.host, self.port)
    logger.info(f'Blender WebSocket Server started on ws://{self.host}:{self.port}')
    while self.running:
        await asyncio.sleep(1)
    server.close()
    await server.wait_closed()
    logger.info('Server closed')
async def start_server(self):
    """Start the WebSocket server"""
    try:
        await self.server_task()
    except Exception as e:
        logger.error(f'Server error: {e}')
        logger.error(traceback.format_exc())

server = BlenderWebSocketServer()
await server.start_server()
__name__ == '__main__'
try:
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
except KeyboardInterrupt:
    logger.info('Server stopped by keyboard interrupt')
except Exception as e:
    logger.error(f'Server error: {e}')
    logger.error(traceback.format_exc())
logging.basicConfig
level=logging.INFO
format='%(asctime)s [%(levelname)s] %(message)s'
handlers=[logging.StreamHandler()]

logging.getLogger
'blender-websocket-server'
bpy
logger.info('Successfully imported bpy, running inside Blender')
ImportError
logger.error('Failed to import bpy. Make sure this script is run from within Blender')
logger.error('Use: blender -b -P blender_agent/websocket_server.py')
sys.exit(1)

'BlenderWebSocketServer class.'
self, host='localhost', port=PORT
'__init__ function.'
self.host = host
self.port = port
self.clients = set()
self.running = True
self, websocket, path
'Handle a client connection'
self.clients.add(websocket)
try:
    logger.info(f'Client connected: {websocket.remote_address}')
    async for message in websocket:
        await self.process_message(websocket, message)
except websockets.exceptions.ConnectionClosed:
    logger.info(f'Client disconnected: {websocket.remote_address}')
finally:
    self.clients.remove(websocket)
self, websocket, message
'Process incoming messages from clients'
try:
    data = json.loads(message)
    logger.info(f"Received message: {(data['type'] if 'type' in data else 'unknown')}")
    if data.get('type') == 'bpy_script':
        result = await self.execute_bpy_script(data.get('code', ''))
        await websocket.send(json.dumps(result))
    else:
        await websocket.send(json.dumps({'status': 'error', 'details': f"Unknown message type: {data.get('type')}"}))
except json.JSONDecodeError:
    await websocket.send(json.dumps({'status': 'error', 'details': 'Invalid JSON format'}))
except Exception as e:
    logger.error(f'Error processing message: {e}')
    await websocket.send(json.dumps({'status': 'error', 'details': str(e)}))
self, code
'Execute Blender Python code'
if not code:
    return {'status': 'error', 'details': 'No code provided'}
logger.info(f'Executing Blender code')
try:
    local_namespace = {'bpy': bpy}
    exec(code, globals(), local_namespace)
    return {'status': 'ok', 'details': 'Code executed successfully'}
except Exception as e:
    error_msg = f'Error executing code: {str(e)}'
    logger.error(error_msg)
    logger.error(traceback.format_exc())
    return {'status': 'error', 'details': error_msg, 'traceback': traceback.format_exc()}
self
'Main server task'
server = await websockets.serve(self.handle_client, self.host, self.port)
logger.info(f'Blender WebSocket Server started on ws://{self.host}:{self.port}')
while self.running:
    await asyncio.sleep(1)
server.close()
await server.wait_closed()
logger.info('Server closed')
self
'Start the WebSocket server'
try:
    await self.server_task()
except Exception as e:
    logger.error(f'Server error: {e}')
    logger.error(traceback.format_exc())
server
BlenderWebSocketServer()
await server.start_server()
__name__

'__main__'
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
except KeyboardInterrupt:
    logger.info('Server stopped by keyboard interrupt')
except Exception as e:
    logger.error(f'Server error: {e}')
    logger.error(traceback.format_exc())
logging

logging.INFO
'%(asctime)s [%(levelname)s] %(message)s'
[logging.StreamHandler()]
logging

logger.info
'Successfully imported bpy, running inside Blender'

logger.error('Failed to import bpy. Make sure this script is run from within Blender')
logger.error('Use: blender -b -P blender_agent/websocket_server.py')
sys.exit(1)
self
host
port
'localhost'
PORT
'__init__ function.'
self.host
host
self.port
port
self.clients
set()
self.running
True
self
websocket
path
'Handle a client connection'
self.clients.add(websocket)
logger.info(f'Client connected: {websocket.remote_address}')
async for message in websocket:
    await self.process_message(websocket, message)
except websockets.exceptions.ConnectionClosed:
    logger.info(f'Client disconnected: {websocket.remote_address}')
self.clients.remove(websocket)
self
websocket
message
'Process incoming messages from clients'
data = json.loads(message)
logger.info(f"Received message: {(data['type'] if 'type' in data else 'unknown')}")
if data.get('type') == 'bpy_script':
    result = await self.execute_bpy_script(data.get('code', ''))
    await websocket.send(json.dumps(result))
else:
    await websocket.send(json.dumps({'status': 'error', 'details': f"Unknown message type: {data.get('type')}"}))
except json.JSONDecodeError:
    await websocket.send(json.dumps({'status': 'error', 'details': 'Invalid JSON format'}))
except Exception as e:
    logger.error(f'Error processing message: {e}')
    await websocket.send(json.dumps({'status': 'error', 'details': str(e)}))
self
code
'Execute Blender Python code'
not code
return {'status': 'error', 'details': 'No code provided'}
logger.info(f'Executing Blender code')
local_namespace = {'bpy': bpy}
exec(code, globals(), local_namespace)
return {'status': 'ok', 'details': 'Code executed successfully'}
except Exception as e:
    error_msg = f'Error executing code: {str(e)}'
    logger.error(error_msg)
    logger.error(traceback.format_exc())
    return {'status': 'error', 'details': error_msg, 'traceback': traceback.format_exc()}
self
'Main server task'
server
await websockets.serve(self.handle_client, self.host, self.port)
logger.info(f'Blender WebSocket Server started on ws://{self.host}:{self.port}')
self.running
await asyncio.sleep(1)
server.close()
await server.wait_closed()
logger.info('Server closed')
self
'Start the WebSocket server'
await self.server_task()
except Exception as e:
    logger.error(f'Server error: {e}')
    logger.error(traceback.format_exc())

BlenderWebSocketServer
server.start_server()

sys.platform == 'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
KeyboardInterrupt
logger.info('Server stopped by keyboard interrupt')
Exception
logger.error(f'Server error: {e}')
logger.error(traceback.format_exc())

logging

logging.StreamHandler()


logger

logger.error
'Failed to import bpy. Make sure this script is run from within Blender'
logger.error
'Use: blender -b -P blender_agent/websocket_server.py'
sys.exit
1

self


self


self

set
self

self.clients.add
websocket
logger.info(f'Client connected: {websocket.remote_address}')
message
websocket
await self.process_message(websocket, message)
websockets.exceptions.ConnectionClosed
logger.info(f'Client disconnected: {websocket.remote_address}')
self.clients.remove(websocket)
data
json.loads(message)
logger.info(f"Received message: {(data['type'] if 'type' in data else 'unknown')}")
data.get('type') == 'bpy_script'
result = await self.execute_bpy_script(data.get('code', ''))
await websocket.send(json.dumps(result))
await websocket.send(json.dumps({'status': 'error', 'details': f"Unknown message type: {data.get('type')}"}))
json.JSONDecodeError
await websocket.send(json.dumps({'status': 'error', 'details': 'Invalid JSON format'}))
Exception
logger.error(f'Error processing message: {e}')
await websocket.send(json.dumps({'status': 'error', 'details': str(e)}))

code
{'status': 'error', 'details': 'No code provided'}
logger.info
f'Executing Blender code'
local_namespace
{'bpy': bpy}
exec(code, globals(), local_namespace)
{'status': 'ok', 'details': 'Code executed successfully'}
Exception
error_msg = f'Error executing code: {str(e)}'
logger.error(error_msg)
logger.error(traceback.format_exc())
return {'status': 'error', 'details': error_msg, 'traceback': traceback.format_exc()}

websockets.serve(self.handle_client, self.host, self.port)
logger.info
f'Blender WebSocket Server started on ws://{self.host}:{self.port}'
self

await asyncio.sleep(1)
server.close
server.wait_closed()
logger.info
'Server closed'
await self.server_task()
Exception
logger.error(f'Server error: {e}')
logger.error(traceback.format_exc())

server.start_server
sys.platform

'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run
main()

logger.info('Server stopped by keyboard interrupt')

logger.error(f'Server error: {e}')
logger.error(traceback.format_exc())

logging.StreamHandler

logger

logger

sys






self.clients


logger.info
f'Client connected: {websocket.remote_address}'


await self.process_message(websocket, message)
websockets.exceptions

logger.info(f'Client disconnected: {websocket.remote_address}')
self.clients.remove
websocket

json.loads
message
logger.info
f"Received message: {(data['type'] if 'type' in data else 'unknown')}"
data.get('type')

'bpy_script'
result
await self.execute_bpy_script(data.get('code', ''))
await websocket.send(json.dumps(result))
await websocket.send(json.dumps({'status': 'error', 'details': f"Unknown message type: {data.get('type')}"}))
json

await websocket.send(json.dumps({'status': 'error', 'details': 'Invalid JSON format'}))

logger.error(f'Error processing message: {e}')
await websocket.send(json.dumps({'status': 'error', 'details': str(e)}))

'status'
'details'
'error'
'No code provided'
logger

'Executing Blender code'

'bpy'
bpy
exec
code
globals()
local_namespace
'status'
'details'
'ok'
'Code executed successfully'

error_msg
f'Error executing code: {str(e)}'
logger.error(error_msg)
logger.error(traceback.format_exc())
{'status': 'error', 'details': error_msg, 'traceback': traceback.format_exc()}
websockets.serve
self.handle_client
self.host
self.port
logger

'Blender WebSocket Server started on ws://'
{self.host}
':'
{self.port}

asyncio.sleep(1)
server

server.wait_closed
logger

self.server_task()

logger.error(f'Server error: {e}')
logger.error(traceback.format_exc())
server

sys

asyncio.set_event_loop_policy
asyncio.WindowsSelectorEventLoopPolicy()
asyncio

main
logger.info
'Server stopped by keyboard interrupt'
logger.error
f'Server error: {e}'
logger.error
traceback.format_exc()
logging




self

logger

'Client connected: '
{websocket.remote_address}
self.process_message(websocket, message)
websockets

logger.info
f'Client disconnected: {websocket.remote_address}'
self.clients


json


logger

'Received message: '
{(data['type'] if 'type' in data else 'unknown')}
data.get
'type'

self.execute_bpy_script(data.get('code', ''))
websocket.send(json.dumps(result))
websocket.send(json.dumps({'status': 'error', 'details': f"Unknown message type: {data.get('type')}"}))

websocket.send(json.dumps({'status': 'error', 'details': 'Invalid JSON format'}))
logger.error
f'Error processing message: {e}'
websocket.send(json.dumps({'status': 'error', 'details': str(e)}))




globals


'Error executing code: '
{str(e)}
logger.error
error_msg
logger.error
traceback.format_exc()
'status'
'details'
'traceback'
'error'
error_msg
traceback.format_exc()
websockets

self

self

self


self.host
self.port
asyncio.sleep
1

server


self.server_task
logger.error
f'Server error: {e}'
logger.error
traceback.format_exc()


asyncio

asyncio.WindowsSelectorEventLoopPolicy


logger

logger

'Server error: '
{e}
logger

traceback.format_exc



websocket.remote_address
self.process_message
websocket
message

logger

'Client disconnected: '
{websocket.remote_address}
self



data['type'] if 'type' in data else 'unknown'
data

self.execute_bpy_script
data.get('code', '')
websocket.send
json.dumps(result)
websocket.send
json.dumps({'status': 'error', 'details': f"Unknown message type: {data.get('type')}"})
websocket.send
json.dumps({'status': 'error', 'details': 'Invalid JSON format'})
logger

'Error processing message: '
{e}
websocket.send
json.dumps({'status': 'error', 'details': str(e)})

str(e)
logger


logger

traceback.format_exc

traceback.format_exc




self

self

asyncio


self

logger

'Server error: '
{e}
logger

traceback.format_exc

asyncio



e

traceback

websocket

self




websocket.remote_address

'type' in data
data['type']
'unknown'

self

data.get
'code'
''
websocket

json.dumps
result
websocket

json.dumps
{'status': 'error', 'details': f"Unknown message type: {data.get('type')}"}
websocket

json.dumps
{'status': 'error', 'details': 'Invalid JSON format'}

e
websocket

json.dumps
{'status': 'error', 'details': str(e)}
str
e


traceback

traceback






e

traceback






websocket

'type'

data
data
'type'


data


json



json

'status'
'details'
'error'
f"Unknown message type: {data.get('type')}"

json

'status'
'details'
'error'
'Invalid JSON format'


json

'status'
'details'
'error'
str(e)












'Unknown message type: '
{data.get('type')}


str
e
data.get('type')


data.get
'type'
data

