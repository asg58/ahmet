import asyncio
import json
import sys
import websockets

SERVER_URI = 'ws://localhost:8765'
async def send_bpy_script(uri, script_code):
    """
    Send a script to the Blender WebSocket server and get the response.
    
    Args:
        uri (str): WebSocket server URI
        script_code (str): Blender Python code to execute
    """
    try:
        print(f'Connecting to {uri}...')
        async with websockets.connect(uri) as websocket:
            print('Connected. Sending bpy script...')
            message = {'type': 'bpy_script', 'code': script_code}
            await websocket.send(json.dumps(message))
            print(f'Message sent. Waiting for response...')
            response = await websocket.recv()
            parsed_response = json.loads(response)
            print('\nResponse from Blender:')
            print('-' * 50)
            print(f"Status: {parsed_response.get('status')}")
            print(f"Details: {parsed_response.get('details')}")
            if parsed_response.get('status') == 'error' and 'traceback' in parsed_response:
                print('\nError Traceback:')
                print(parsed_response.get('traceback'))
            print('-' * 50)
            return parsed_response
    except Exception as e:
        if 'connect' in str(e).lower() or 'connection' in str(e).lower() or 'refused' in str(e).lower():
            print(f'Error: Could not connect to {uri}')
            print('Make sure Blender is running with the WebSocket server script.')
            print('Run: blender -b -P blender_agent/websocket_server.py')
        else:
            print(f'Error: {str(e)}')
        return None
async def main():
    cube_script = '\nimport bpy\n\n# Clear existing objects (optional)\nbpy.ops.object.select_all(action=\'DESELECT\')\nbpy.ops.object.select_by_type(type=\'MESH\')\nbpy.ops.object.delete()\n\n# Create a cube\nbpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))\n\n# Name the cube\ncube = bpy.context.active_object\ncube.name = \'WebSocketCube\'\n\n# Add a material\nmaterial = bpy.data.materials.new(name="CubeMaterial")\nmaterial.diffuse_color = (1, 0, 0, 1)  # Red color\ncube.data.materials.append(material)\n\nprint("Cube created successfully!")\n'
    await send_bpy_script(SERVER_URI, cube_script)
if __name__ == '__main__':
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\nClient stopped by keyboard interrupt')
    except Exception as e:
        print(f'Client error: {e}')
asyncio
json
sys
websockets
SERVER_URI
'ws://localhost:8765'
uri, script_code
'\n    Send a script to the Blender WebSocket server and get the response.\n    \n    Args:\n        uri (str): WebSocket server URI\n        script_code (str): Blender Python code to execute\n    '
try:
    print(f'Connecting to {uri}...')
    async with websockets.connect(uri) as websocket:
        print('Connected. Sending bpy script...')
        message = {'type': 'bpy_script', 'code': script_code}
        await websocket.send(json.dumps(message))
        print(f'Message sent. Waiting for response...')
        response = await websocket.recv()
        parsed_response = json.loads(response)
        print('\nResponse from Blender:')
        print('-' * 50)
        print(f"Status: {parsed_response.get('status')}")
        print(f"Details: {parsed_response.get('details')}")
        if parsed_response.get('status') == 'error' and 'traceback' in parsed_response:
            print('\nError Traceback:')
            print(parsed_response.get('traceback'))
        print('-' * 50)
        return parsed_response
except Exception as e:
    if 'connect' in str(e).lower() or 'connection' in str(e).lower() or 'refused' in str(e).lower():
        print(f'Error: Could not connect to {uri}')
        print('Make sure Blender is running with the WebSocket server script.')
        print('Run: blender -b -P blender_agent/websocket_server.py')
    else:
        print(f'Error: {str(e)}')
    return None

cube_script = '\nimport bpy\n\n# Clear existing objects (optional)\nbpy.ops.object.select_all(action=\'DESELECT\')\nbpy.ops.object.select_by_type(type=\'MESH\')\nbpy.ops.object.delete()\n\n# Create a cube\nbpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))\n\n# Name the cube\ncube = bpy.context.active_object\ncube.name = \'WebSocketCube\'\n\n# Add a material\nmaterial = bpy.data.materials.new(name="CubeMaterial")\nmaterial.diffuse_color = (1, 0, 0, 1)  # Red color\ncube.data.materials.append(material)\n\nprint("Cube created successfully!")\n'
await send_bpy_script(SERVER_URI, cube_script)
__name__ == '__main__'
try:
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
except KeyboardInterrupt:
    print('\nClient stopped by keyboard interrupt')
except Exception as e:
    print(f'Client error: {e}')

uri
script_code
'\n    Send a script to the Blender WebSocket server and get the response.\n    \n    Args:\n        uri (str): WebSocket server URI\n        script_code (str): Blender Python code to execute\n    '
print(f'Connecting to {uri}...')
async with websockets.connect(uri) as websocket:
    print('Connected. Sending bpy script...')
    message = {'type': 'bpy_script', 'code': script_code}
    await websocket.send(json.dumps(message))
    print(f'Message sent. Waiting for response...')
    response = await websocket.recv()
    parsed_response = json.loads(response)
    print('\nResponse from Blender:')
    print('-' * 50)
    print(f"Status: {parsed_response.get('status')}")
    print(f"Details: {parsed_response.get('details')}")
    if parsed_response.get('status') == 'error' and 'traceback' in parsed_response:
        print('\nError Traceback:')
        print(parsed_response.get('traceback'))
    print('-' * 50)
    return parsed_response
except Exception as e:
    if 'connect' in str(e).lower() or 'connection' in str(e).lower() or 'refused' in str(e).lower():
        print(f'Error: Could not connect to {uri}')
        print('Make sure Blender is running with the WebSocket server script.')
        print('Run: blender -b -P blender_agent/websocket_server.py')
    else:
        print(f'Error: {str(e)}')
    return None
cube_script
'\nimport bpy\n\n# Clear existing objects (optional)\nbpy.ops.object.select_all(action=\'DESELECT\')\nbpy.ops.object.select_by_type(type=\'MESH\')\nbpy.ops.object.delete()\n\n# Create a cube\nbpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))\n\n# Name the cube\ncube = bpy.context.active_object\ncube.name = \'WebSocketCube\'\n\n# Add a material\nmaterial = bpy.data.materials.new(name="CubeMaterial")\nmaterial.diffuse_color = (1, 0, 0, 1)  # Red color\ncube.data.materials.append(material)\n\nprint("Cube created successfully!")\n'
await send_bpy_script(SERVER_URI, cube_script)
__name__

'__main__'
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
except KeyboardInterrupt:
    print('\nClient stopped by keyboard interrupt')
except Exception as e:
    print(f'Client error: {e}')
print(f'Connecting to {uri}...')
websockets.connect(uri) as websocket
print('Connected. Sending bpy script...')
message = {'type': 'bpy_script', 'code': script_code}
await websocket.send(json.dumps(message))
print(f'Message sent. Waiting for response...')
response = await websocket.recv()
parsed_response = json.loads(response)
print('\nResponse from Blender:')
print('-' * 50)
print(f"Status: {parsed_response.get('status')}")
print(f"Details: {parsed_response.get('details')}")
if parsed_response.get('status') == 'error' and 'traceback' in parsed_response:
    print('\nError Traceback:')
    print(parsed_response.get('traceback'))
print('-' * 50)
return parsed_response
Exception
if 'connect' in str(e).lower() or 'connection' in str(e).lower() or 'refused' in str(e).lower():
    print(f'Error: Could not connect to {uri}')
    print('Make sure Blender is running with the WebSocket server script.')
    print('Run: blender -b -P blender_agent/websocket_server.py')
else:
    print(f'Error: {str(e)}')
return None

send_bpy_script(SERVER_URI, cube_script)

sys.platform == 'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
KeyboardInterrupt
print('\nClient stopped by keyboard interrupt')
Exception
print(f'Client error: {e}')
print
f'Connecting to {uri}...'
websockets.connect(uri)
websocket
print('Connected. Sending bpy script...')
message
{'type': 'bpy_script', 'code': script_code}
await websocket.send(json.dumps(message))
print(f'Message sent. Waiting for response...')
response
await websocket.recv()
parsed_response
json.loads(response)
print('\nResponse from Blender:')
print('-' * 50)
print(f"Status: {parsed_response.get('status')}")
print(f"Details: {parsed_response.get('details')}")
parsed_response.get('status') == 'error' and 'traceback' in parsed_response
print('\nError Traceback:')
print(parsed_response.get('traceback'))
print('-' * 50)
parsed_response

'connect' in str(e).lower() or 'connection' in str(e).lower() or 'refused' in str(e).lower()
print(f'Error: Could not connect to {uri}')
print('Make sure Blender is running with the WebSocket server script.')
print('Run: blender -b -P blender_agent/websocket_server.py')
print(f'Error: {str(e)}')
None
send_bpy_script
SERVER_URI
cube_script
sys.platform

'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run
main()

print('\nClient stopped by keyboard interrupt')

print(f'Client error: {e}')

'Connecting to '
{uri}
'...'
websockets.connect
uri

print
'Connected. Sending bpy script...'

'type'
'code'
'bpy_script'
script_code
websocket.send(json.dumps(message))
print
f'Message sent. Waiting for response...'

websocket.recv()

json.loads
response
print
'\nResponse from Blender:'
print
'-' * 50
print
f"Status: {parsed_response.get('status')}"
print
f"Details: {parsed_response.get('details')}"

parsed_response.get('status') == 'error'
'traceback' in parsed_response
print('\nError Traceback:')
print(parsed_response.get('traceback'))
print
'-' * 50


'connect' in str(e).lower()
'connection' in str(e).lower()
'refused' in str(e).lower()
print(f'Error: Could not connect to {uri}')
print('Make sure Blender is running with the WebSocket server script.')
print('Run: blender -b -P blender_agent/websocket_server.py')
print(f'Error: {str(e)}')



sys

asyncio.set_event_loop_policy
asyncio.WindowsSelectorEventLoopPolicy()
asyncio

main
print
'\nClient stopped by keyboard interrupt'
print
f'Client error: {e}'
uri
websockets




websocket.send
json.dumps(message)

'Message sent. Waiting for response...'
websocket.recv
json




'-'

50

'Status: '
{parsed_response.get('status')}

'Details: '
{parsed_response.get('details')}
parsed_response.get('status')

'error'
'traceback'

parsed_response
print
'\nError Traceback:'
print
parsed_response.get('traceback')

'-'

50
'connect'

str(e).lower()
'connection'

str(e).lower()
'refused'

str(e).lower()
print
f'Error: Could not connect to {uri}'
print
'Make sure Blender is running with the WebSocket server script.'
print
'Run: blender -b -P blender_agent/websocket_server.py'
print
f'Error: {str(e)}'

asyncio

asyncio.WindowsSelectorEventLoopPolicy




'Client error: '
{e}


websocket

json.dumps
message
websocket


parsed_response.get('status')
parsed_response.get('details')
parsed_response.get
'status'



parsed_response.get
'traceback'
str(e).lower
str(e).lower
str(e).lower

'Error: Could not connect to '
{uri}



'Error: '
{str(e)}

asyncio

e

json



parsed_response.get
'status'
parsed_response.get
'details'
parsed_response

parsed_response

str(e)

str(e)

str(e)

uri
str(e)



parsed_response

parsed_response



str
e
str
e
str
e

str
e









