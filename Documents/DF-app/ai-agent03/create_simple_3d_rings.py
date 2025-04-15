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
    rings_script = '\nimport bpy\nimport os\nimport math\nfrom math import radians\n\n# Path voor het opslaan\nfilepath = os.path.join(os.getcwd(), "3d_rings_simple.blend")\n\n# Start met een nieuwe scene\nbpy.ops.wm.read_factory_settings(use_empty=True)\n\n# Verwijder de default kubus als die er is\nif \'Cube\' in bpy.data.objects:\n    bpy.data.objects[\'Cube\'].select_set(True)\n    bpy.ops.object.delete()\n\n# Configuratie voor de ringen\nnum_rings = 4\nring_radius = 1.0\nring_thickness = 0.2\nring_overlap = 0.3  # Hoeveel de ringen overlappen\nring_colors = [\n    (0.8, 0.1, 0.1, 1.0),  # Rood\n    (0.1, 0.8, 0.1, 1.0),  # Groen\n    (0.1, 0.1, 0.8, 1.0),  # Blauw\n    (0.8, 0.6, 0.1, 1.0),  # Goud/oranje\n]\n\n# Maak de ringen\nfor i in range(num_rings):\n    # Bereken de positie\n    position = ((i * (ring_radius * 2 - ring_overlap)), 0, 0)\n    \n    # Maak een torus (ring)\n    bpy.ops.mesh.primitive_torus_add(\n        align=\'WORLD\',\n        location=position,\n        major_radius=ring_radius,\n        minor_radius=ring_thickness,\n        major_segments=36,\n        minor_segments=12\n    )\n    \n    # Geef de ring een naam\n    ring = bpy.context.active_object\n    ring.name = f"Ring_{i+1}"\n    \n    # Maak een materiaal\n    material = bpy.data.materials.new(name=f"Material_Ring_{i+1}")\n    material.diffuse_color = ring_colors[i]\n    \n    # Maak het materiaal metallisch\n    material.metallic = 0.8\n    material.roughness = 0.2\n    \n    # Pas het materiaal toe op de ring\n    ring.data.materials.append(material)\n\n# Centreer de ringen\ntotal_width = (num_rings - 1) * (ring_radius * 2 - ring_overlap)\ncenter_offset = total_width / 2\n\nfor obj in bpy.data.objects:\n    if obj.name.startswith("Ring_"):\n        obj.location.x -= center_offset\n\n# Voeg camera toe\nbpy.ops.object.camera_add(location=(0, -5, 2), rotation=(radians(75), 0, 0))\ncamera = bpy.context.active_object\ncamera.name = "Camera"\nbpy.context.scene.camera = camera\n\n# Camera instellingen voor mooie weergave\ncamera.data.lens = 50  # 50mm lens\n\n# Lighting setup - Drie-punt belichting voor mooie presentatie\n# Key light (hoofdlicht)\nbpy.ops.object.light_add(type=\'AREA\', location=(3, -3, 4))\nkey_light = bpy.context.active_object\nkey_light.name = "Key_Light"\nkey_light.data.energy = 500\nkey_light.data.size = 2.0\n\n# Fill light (invullicht)\nbpy.ops.object.light_add(type=\'AREA\', location=(-3, -2, 2))\nfill_light = bpy.context.active_object\nfill_light.name = "Fill_Light"\nfill_light.data.energy = 300\nfill_light.data.size = 3.0\n\n# Front light voor extra voorbelichting\nbpy.ops.object.light_add(type=\'AREA\', location=(0, -4, 1))\nfront_light = bpy.context.active_object\nfront_light.name = "Front_Light"\nfront_light.data.energy = 400\nfront_light.data.size = 4.0\n\n# Ground plane \nbpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1))\nground = bpy.context.active_object\nground.name = "Ground"\n\n# Maak een materiaal voor de grond\nground_mat = bpy.data.materials.new(name="GroundMaterial")\nground_mat.diffuse_color = (0.05, 0.05, 0.05, 1.0)\nground.data.materials.append(ground_mat)\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"3D ringen scene opgeslagen naar: {filepath}")\n\n# Render instellingen\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\nbpy.context.scene.render.filepath = os.path.join(os.getcwd(), "3d_rings_render.png")\n\ntry:\n    # Render de afbeelding\n    bpy.ops.render.render(write_still=True)\n    print(\n    f"Afbeelding gerenderd naar: {os.path.join(os.getcwd(), \'3d_rings_render.png\')}")\nexcept Exception as e:\n    print(f"Fout bij renderen: {e}")\n'
    await send_bpy_script(SERVER_URI, rings_script)
if __name__ == '__main__':
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\nScript gestopt door gebruiker')
    except Exception as e:
        print(f'Fout: {e}')
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

rings_script = '\nimport bpy\nimport os\nimport math\nfrom math import radians\n\n# Path voor het opslaan\nfilepath = os.path.join(os.getcwd(), "3d_rings_simple.blend")\n\n# Start met een nieuwe scene\nbpy.ops.wm.read_factory_settings(use_empty=True)\n\n# Verwijder de default kubus als die er is\nif \'Cube\' in bpy.data.objects:\n    bpy.data.objects[\'Cube\'].select_set(True)\n    bpy.ops.object.delete()\n\n# Configuratie voor de ringen\nnum_rings = 4\nring_radius = 1.0\nring_thickness = 0.2\nring_overlap = 0.3  # Hoeveel de ringen overlappen\nring_colors = [\n    (0.8, 0.1, 0.1, 1.0),  # Rood\n    (0.1, 0.8, 0.1, 1.0),  # Groen\n    (0.1, 0.1, 0.8, 1.0),  # Blauw\n    (0.8, 0.6, 0.1, 1.0),  # Goud/oranje\n]\n\n# Maak de ringen\nfor i in range(num_rings):\n    # Bereken de positie\n    position = ((i * (ring_radius * 2 - ring_overlap)), 0, 0)\n    \n    # Maak een torus (ring)\n    bpy.ops.mesh.primitive_torus_add(\n        align=\'WORLD\',\n        location=position,\n        major_radius=ring_radius,\n        minor_radius=ring_thickness,\n        major_segments=36,\n        minor_segments=12\n    )\n    \n    # Geef de ring een naam\n    ring = bpy.context.active_object\n    ring.name = f"Ring_{i+1}"\n    \n    # Maak een materiaal\n    material = bpy.data.materials.new(name=f"Material_Ring_{i+1}")\n    material.diffuse_color = ring_colors[i]\n    \n    # Maak het materiaal metallisch\n    material.metallic = 0.8\n    material.roughness = 0.2\n    \n    # Pas het materiaal toe op de ring\n    ring.data.materials.append(material)\n\n# Centreer de ringen\ntotal_width = (num_rings - 1) * (ring_radius * 2 - ring_overlap)\ncenter_offset = total_width / 2\n\nfor obj in bpy.data.objects:\n    if obj.name.startswith("Ring_"):\n        obj.location.x -= center_offset\n\n# Voeg camera toe\nbpy.ops.object.camera_add(location=(0, -5, 2), rotation=(radians(75), 0, 0))\ncamera = bpy.context.active_object\ncamera.name = "Camera"\nbpy.context.scene.camera = camera\n\n# Camera instellingen voor mooie weergave\ncamera.data.lens = 50  # 50mm lens\n\n# Lighting setup - Drie-punt belichting voor mooie presentatie\n# Key light (hoofdlicht)\nbpy.ops.object.light_add(type=\'AREA\', location=(3, -3, 4))\nkey_light = bpy.context.active_object\nkey_light.name = "Key_Light"\nkey_light.data.energy = 500\nkey_light.data.size = 2.0\n\n# Fill light (invullicht)\nbpy.ops.object.light_add(type=\'AREA\', location=(-3, -2, 2))\nfill_light = bpy.context.active_object\nfill_light.name = "Fill_Light"\nfill_light.data.energy = 300\nfill_light.data.size = 3.0\n\n# Front light voor extra voorbelichting\nbpy.ops.object.light_add(type=\'AREA\', location=(0, -4, 1))\nfront_light = bpy.context.active_object\nfront_light.name = "Front_Light"\nfront_light.data.energy = 400\nfront_light.data.size = 4.0\n\n# Ground plane \nbpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1))\nground = bpy.context.active_object\nground.name = "Ground"\n\n# Maak een materiaal voor de grond\nground_mat = bpy.data.materials.new(name="GroundMaterial")\nground_mat.diffuse_color = (0.05, 0.05, 0.05, 1.0)\nground.data.materials.append(ground_mat)\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"3D ringen scene opgeslagen naar: {filepath}")\n\n# Render instellingen\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\nbpy.context.scene.render.filepath = os.path.join(os.getcwd(), "3d_rings_render.png")\n\ntry:\n    # Render de afbeelding\n    bpy.ops.render.render(write_still=True)\n    print(\n    f"Afbeelding gerenderd naar: {os.path.join(os.getcwd(), \'3d_rings_render.png\')}")\nexcept Exception as e:\n    print(f"Fout bij renderen: {e}")\n'
await send_bpy_script(SERVER_URI, rings_script)
__name__ == '__main__'
try:
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
except KeyboardInterrupt:
    print('\nScript gestopt door gebruiker')
except Exception as e:
    print(f'Fout: {e}')

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
rings_script
'\nimport bpy\nimport os\nimport math\nfrom math import radians\n\n# Path voor het opslaan\nfilepath = os.path.join(os.getcwd(), "3d_rings_simple.blend")\n\n# Start met een nieuwe scene\nbpy.ops.wm.read_factory_settings(use_empty=True)\n\n# Verwijder de default kubus als die er is\nif \'Cube\' in bpy.data.objects:\n    bpy.data.objects[\'Cube\'].select_set(True)\n    bpy.ops.object.delete()\n\n# Configuratie voor de ringen\nnum_rings = 4\nring_radius = 1.0\nring_thickness = 0.2\nring_overlap = 0.3  # Hoeveel de ringen overlappen\nring_colors = [\n    (0.8, 0.1, 0.1, 1.0),  # Rood\n    (0.1, 0.8, 0.1, 1.0),  # Groen\n    (0.1, 0.1, 0.8, 1.0),  # Blauw\n    (0.8, 0.6, 0.1, 1.0),  # Goud/oranje\n]\n\n# Maak de ringen\nfor i in range(num_rings):\n    # Bereken de positie\n    position = ((i * (ring_radius * 2 - ring_overlap)), 0, 0)\n    \n    # Maak een torus (ring)\n    bpy.ops.mesh.primitive_torus_add(\n        align=\'WORLD\',\n        location=position,\n        major_radius=ring_radius,\n        minor_radius=ring_thickness,\n        major_segments=36,\n        minor_segments=12\n    )\n    \n    # Geef de ring een naam\n    ring = bpy.context.active_object\n    ring.name = f"Ring_{i+1}"\n    \n    # Maak een materiaal\n    material = bpy.data.materials.new(name=f"Material_Ring_{i+1}")\n    material.diffuse_color = ring_colors[i]\n    \n    # Maak het materiaal metallisch\n    material.metallic = 0.8\n    material.roughness = 0.2\n    \n    # Pas het materiaal toe op de ring\n    ring.data.materials.append(material)\n\n# Centreer de ringen\ntotal_width = (num_rings - 1) * (ring_radius * 2 - ring_overlap)\ncenter_offset = total_width / 2\n\nfor obj in bpy.data.objects:\n    if obj.name.startswith("Ring_"):\n        obj.location.x -= center_offset\n\n# Voeg camera toe\nbpy.ops.object.camera_add(location=(0, -5, 2), rotation=(radians(75), 0, 0))\ncamera = bpy.context.active_object\ncamera.name = "Camera"\nbpy.context.scene.camera = camera\n\n# Camera instellingen voor mooie weergave\ncamera.data.lens = 50  # 50mm lens\n\n# Lighting setup - Drie-punt belichting voor mooie presentatie\n# Key light (hoofdlicht)\nbpy.ops.object.light_add(type=\'AREA\', location=(3, -3, 4))\nkey_light = bpy.context.active_object\nkey_light.name = "Key_Light"\nkey_light.data.energy = 500\nkey_light.data.size = 2.0\n\n# Fill light (invullicht)\nbpy.ops.object.light_add(type=\'AREA\', location=(-3, -2, 2))\nfill_light = bpy.context.active_object\nfill_light.name = "Fill_Light"\nfill_light.data.energy = 300\nfill_light.data.size = 3.0\n\n# Front light voor extra voorbelichting\nbpy.ops.object.light_add(type=\'AREA\', location=(0, -4, 1))\nfront_light = bpy.context.active_object\nfront_light.name = "Front_Light"\nfront_light.data.energy = 400\nfront_light.data.size = 4.0\n\n# Ground plane \nbpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1))\nground = bpy.context.active_object\nground.name = "Ground"\n\n# Maak een materiaal voor de grond\nground_mat = bpy.data.materials.new(name="GroundMaterial")\nground_mat.diffuse_color = (0.05, 0.05, 0.05, 1.0)\nground.data.materials.append(ground_mat)\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"3D ringen scene opgeslagen naar: {filepath}")\n\n# Render instellingen\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\nbpy.context.scene.render.filepath = os.path.join(os.getcwd(), "3d_rings_render.png")\n\ntry:\n    # Render de afbeelding\n    bpy.ops.render.render(write_still=True)\n    print(\n    f"Afbeelding gerenderd naar: {os.path.join(os.getcwd(), \'3d_rings_render.png\')}")\nexcept Exception as e:\n    print(f"Fout bij renderen: {e}")\n'
await send_bpy_script(SERVER_URI, rings_script)
__name__

'__main__'
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
except KeyboardInterrupt:
    print('\nScript gestopt door gebruiker')
except Exception as e:
    print(f'Fout: {e}')
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

send_bpy_script(SERVER_URI, rings_script)

sys.platform == 'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
KeyboardInterrupt
print('\nScript gestopt door gebruiker')
Exception
print(f'Fout: {e}')
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
rings_script
sys.platform

'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run
main()

print('\nScript gestopt door gebruiker')

print(f'Fout: {e}')

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
'\nScript gestopt door gebruiker'
print
f'Fout: {e}'
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




'Fout: '
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









