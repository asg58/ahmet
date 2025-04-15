import asyncio
import json
import sys
import websockets

SERVER_URI = 'ws://localhost:8765'
async def send_bpy_script(uri, script_code):
    """Send a script to the Blender WebSocket server and get the response."""
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
    save_script = '\nimport bpy\nimport random\nimport os\n\n# Get current script directory\nfilepath = os.path.join(os.getcwd(), "sphere_scene.blend")\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'DESELECT\')\nbpy.ops.object.select_by_type(type=\'MESH\')\nbpy.ops.object.delete()\n\n# Create a UV sphere\nbpy.ops.mesh.primitive_uv_sphere_add(\n    radius=2.0, \n    segments=32, \n    ring_count=16,\n    location=(0, 0, 0)\n)\n\n# Name the sphere\nsphere = bpy.context.active_object\nsphere.name = \'WebSocketSphere\'\n\n# Add a material with bright color\nmaterial = bpy.data.materials.new(name="SphereMaterial")\nmaterial.diffuse_color = (1.0, 0.1, 0.8, 1.0)  # Pink color\nsphere.data.materials.append(material)\n\n# Add subdivision\nmodifier = sphere.modifiers.new(name="Subdivision", type=\'SUBSURF\')\nmodifier.levels = 2\nmodifier.render_levels = 2\n\n# Add animation\nsphere.rotation_euler = (0, 0, 0)\nsphere.keyframe_insert(data_path="rotation_euler", frame=1)\n\nsphere.rotation_euler = (0, 0, 3.14159)\nsphere.keyframe_insert(data_path="rotation_euler", frame=24)\n\n# Add a camera and point it at the sphere\nbpy.ops.object.camera_add(location=(0, -10, 0))\ncamera = bpy.context.active_object\ncamera.name = "Main Camera"\n\n# Point camera at sphere\nconstraint = camera.constraints.new(type=\'TRACK_TO\')\nconstraint.target = sphere\nconstraint.track_axis = \'TRACK_NEGATIVE_Z\'\nconstraint.up_axis = \'UP_Y\'\n\n# Set as active camera\nbpy.context.scene.camera = camera\n\n# Add a light\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nlight = bpy.context.active_object\nlight.name = "Main Light"\nlight.data.energy = 2.0\n\n# Save the file\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"Scene saved to: {filepath}")\n'
    await send_bpy_script(SERVER_URI, save_script)
if __name__ == '__main__':
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\nScript stopped by keyboard interrupt')
    except Exception as e:
        print(f'Error: {e}')
asyncio
json
sys
websockets
SERVER_URI
'ws://localhost:8765'
uri, script_code
'Send a script to the Blender WebSocket server and get the response.'
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

save_script = '\nimport bpy\nimport random\nimport os\n\n# Get current script directory\nfilepath = os.path.join(os.getcwd(), "sphere_scene.blend")\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'DESELECT\')\nbpy.ops.object.select_by_type(type=\'MESH\')\nbpy.ops.object.delete()\n\n# Create a UV sphere\nbpy.ops.mesh.primitive_uv_sphere_add(\n    radius=2.0, \n    segments=32, \n    ring_count=16,\n    location=(0, 0, 0)\n)\n\n# Name the sphere\nsphere = bpy.context.active_object\nsphere.name = \'WebSocketSphere\'\n\n# Add a material with bright color\nmaterial = bpy.data.materials.new(name="SphereMaterial")\nmaterial.diffuse_color = (1.0, 0.1, 0.8, 1.0)  # Pink color\nsphere.data.materials.append(material)\n\n# Add subdivision\nmodifier = sphere.modifiers.new(name="Subdivision", type=\'SUBSURF\')\nmodifier.levels = 2\nmodifier.render_levels = 2\n\n# Add animation\nsphere.rotation_euler = (0, 0, 0)\nsphere.keyframe_insert(data_path="rotation_euler", frame=1)\n\nsphere.rotation_euler = (0, 0, 3.14159)\nsphere.keyframe_insert(data_path="rotation_euler", frame=24)\n\n# Add a camera and point it at the sphere\nbpy.ops.object.camera_add(location=(0, -10, 0))\ncamera = bpy.context.active_object\ncamera.name = "Main Camera"\n\n# Point camera at sphere\nconstraint = camera.constraints.new(type=\'TRACK_TO\')\nconstraint.target = sphere\nconstraint.track_axis = \'TRACK_NEGATIVE_Z\'\nconstraint.up_axis = \'UP_Y\'\n\n# Set as active camera\nbpy.context.scene.camera = camera\n\n# Add a light\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nlight = bpy.context.active_object\nlight.name = "Main Light"\nlight.data.energy = 2.0\n\n# Save the file\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"Scene saved to: {filepath}")\n'
await send_bpy_script(SERVER_URI, save_script)
__name__ == '__main__'
try:
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
except KeyboardInterrupt:
    print('\nScript stopped by keyboard interrupt')
except Exception as e:
    print(f'Error: {e}')

uri
script_code
'Send a script to the Blender WebSocket server and get the response.'
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
save_script
'\nimport bpy\nimport random\nimport os\n\n# Get current script directory\nfilepath = os.path.join(os.getcwd(), "sphere_scene.blend")\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'DESELECT\')\nbpy.ops.object.select_by_type(type=\'MESH\')\nbpy.ops.object.delete()\n\n# Create a UV sphere\nbpy.ops.mesh.primitive_uv_sphere_add(\n    radius=2.0, \n    segments=32, \n    ring_count=16,\n    location=(0, 0, 0)\n)\n\n# Name the sphere\nsphere = bpy.context.active_object\nsphere.name = \'WebSocketSphere\'\n\n# Add a material with bright color\nmaterial = bpy.data.materials.new(name="SphereMaterial")\nmaterial.diffuse_color = (1.0, 0.1, 0.8, 1.0)  # Pink color\nsphere.data.materials.append(material)\n\n# Add subdivision\nmodifier = sphere.modifiers.new(name="Subdivision", type=\'SUBSURF\')\nmodifier.levels = 2\nmodifier.render_levels = 2\n\n# Add animation\nsphere.rotation_euler = (0, 0, 0)\nsphere.keyframe_insert(data_path="rotation_euler", frame=1)\n\nsphere.rotation_euler = (0, 0, 3.14159)\nsphere.keyframe_insert(data_path="rotation_euler", frame=24)\n\n# Add a camera and point it at the sphere\nbpy.ops.object.camera_add(location=(0, -10, 0))\ncamera = bpy.context.active_object\ncamera.name = "Main Camera"\n\n# Point camera at sphere\nconstraint = camera.constraints.new(type=\'TRACK_TO\')\nconstraint.target = sphere\nconstraint.track_axis = \'TRACK_NEGATIVE_Z\'\nconstraint.up_axis = \'UP_Y\'\n\n# Set as active camera\nbpy.context.scene.camera = camera\n\n# Add a light\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nlight = bpy.context.active_object\nlight.name = "Main Light"\nlight.data.energy = 2.0\n\n# Save the file\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"Scene saved to: {filepath}")\n'
await send_bpy_script(SERVER_URI, save_script)
__name__

'__main__'
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
except KeyboardInterrupt:
    print('\nScript stopped by keyboard interrupt')
except Exception as e:
    print(f'Error: {e}')
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

send_bpy_script(SERVER_URI, save_script)

sys.platform == 'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
KeyboardInterrupt
print('\nScript stopped by keyboard interrupt')
Exception
print(f'Error: {e}')
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
save_script
sys.platform

'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run
main()

print('\nScript stopped by keyboard interrupt')

print(f'Error: {e}')

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
'\nScript stopped by keyboard interrupt'
print
f'Error: {e}'
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




'Error: '
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









