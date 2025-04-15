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
    ozan_script = '\nimport bpy\nimport os\nimport math\nimport bmesh\n\n# Path voor het opslaan\nfilepath = os.path.join(os.getcwd(), "ozan_with_profile.blend")\n\n# Start met een nieuwe scene\nbpy.ops.wm.read_factory_settings(use_empty=True)\n\n# Verwijder de default kubus als die er is\nif \'Cube\' in bpy.data.objects:\n    bpy.data.objects[\'Cube\'].select_set(True)\n    bpy.ops.object.delete()\n\n# Tekst om te gebruiken\ntekst = "ozan"\n\n# Maak een text object\nbpy.ops.object.text_add(\n    enter_editmode=False, align=\'WORLD\', location=(0, 0, 0), scale=(1, 1, 1))\ntext_obj = bpy.context.active_object\ntext_obj.name = "Ozan"\n\n# Configureer de text\ntext_obj.data.body = tekst\ntext_obj.data.align_x = \'CENTER\'  # Centreer de tekst\ntext_obj.data.size = 0.7  # Grootte van de tekst\ntext_obj.data.extrude = 0.04  # Diepte van 40mm (0.04 meter)\ntext_obj.data.font = bpy.data.fonts[0]  # Default font\n\n# Converteer naar mesh voor betere bewerkbaarheid\nbpy.ops.object.convert(target=\'MESH\')\n\n# Roteer het object zodat het verticaal staat (90 graden rond X-as)\ntext_obj.rotation_euler[0] = math.radians(90)  # 90 graden in X\ntext_obj.rotation_euler[1] = 0\ntext_obj.rotation_euler[2] = 0\n\n# Pas de rotatie toe\nbpy.ops.object.transform_apply(location=False, rotation=True, scale=False)\n\n# Maak het object wat groter voor betere visualisatie\nbpy.ops.transform.resize(value=(1.5, 1.5, 1.5))\n\n# Verplaats de tekst naar het centrum\nbpy.ops.object.origin_set(type=\'ORIGIN_CENTER_OF_MASS\')\ntext_obj.location = (0, 0, 0)\n\n# ------------------------------------------------------------\n# Maak een horizontaal profiel aan de achterkant van de letters\n# ------------------------------------------------------------\n\n# Bepaal afmetingen van het tekst object\ntext_dimensions = text_obj.dimensions\nwidth = text_dimensions.x\nheight =      text_dimensions.z  # Z is de hoogte omdat we de tekst 90 graden geroteerd hebben\n\n# Maak een extrusie kubus voor het profiel (30mm diep)\nprofile_depth = 0.03  # 30mm in meters\nbpy.ops.mesh.primitive_cube_add(\n    size=1, \n    location=(0, -0.02 - (profile_depth/2), 0)  # Plaats het net achter de letters\n)\nprofile = bpy.context.active_object\nprofile.name = "MountingProfile"\n\n# Pas de grootte aan zodat het profiel de volledige breedte van de tekst beslaat\n# en ongeveer 20% van de hoogte aan de onderkant\nprofile.scale = (width, profile_depth, height * 0.2)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# Plaats het profiel aan de onderkant van de letters\nprofile.location.z = -(height/2) + (profile.dimensions.z/2)\n\n# Maak een nieuw materiaal voor het profiel (bijvoorbeeld grijs)\nprofile_material = bpy.data.materials.new(name="ProfileMateriaal")\nprofile_material.diffuse_color = (0.3, 0.3, 0.3, 1.0)  # Grijs materiaal\nprofile.data.materials.append(profile_material)\n\n# Selecteer beide objecten voor toekomstige bewerkingen\ntext_obj.select_set(True)\nprofile.select_set(True)\nbpy.context.view_layer.objects.active = text_obj\n\n# Maak een nieuw materiaal voor de letters\nletter_material = bpy.data.materials.new(name="OzanMateriaal")\nletter_material.diffuse_color = (0.0, 0.2, 0.8, 1.0)  # Blauw materiaal\ntext_obj.data.materials.append(letter_material)\n\n# Voeg een camera toe die alles in beeld brengt\nbpy.ops.object.camera_add(location=(0, -5, 0), rotation=(math.radians(90), 0, 0))\ncamera = bpy.context.active_object\ncamera.name = "Camera"\n\n# Pas de camera afstand aan om alles in beeld te krijgen\ncamera.location.y = -8\n\n# Stel de camera in\nbpy.context.scene.camera = camera\n\n# Track to constraint voor de camera\nconstraint = camera.constraints.new(type=\'TRACK_TO\')\nconstraint.target = text_obj\nconstraint.track_axis = \'TRACK_NEGATIVE_Z\'\nconstraint.up_axis = \'UP_Y\'\n\n# Voeg verlichting toe\nbpy.ops.object.light_add(type=\'SUN\', radius=1, location=(1, -2, 3))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 2.0\n\n# Voeg een tweede licht toe voor betere verlichting\nbpy.ops.object.light_add(type=\'AREA\', radius=1, location=(-2, -1, 2))\narea_light = bpy.context.active_object\narea_light.name = "Fill Light"\narea_light.data.energy = 1.0\n\n# Configureer render instellingen\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\nbpy.context.scene.render.resolution_percentage = 100\nbpy.context.scene.render.film_transparent = True  # Transparante achtergrond\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"Ozan met montageprofiel opgeslagen naar: {filepath}")\n'
    await send_bpy_script(SERVER_URI, ozan_script)
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

ozan_script = '\nimport bpy\nimport os\nimport math\nimport bmesh\n\n# Path voor het opslaan\nfilepath = os.path.join(os.getcwd(), "ozan_with_profile.blend")\n\n# Start met een nieuwe scene\nbpy.ops.wm.read_factory_settings(use_empty=True)\n\n# Verwijder de default kubus als die er is\nif \'Cube\' in bpy.data.objects:\n    bpy.data.objects[\'Cube\'].select_set(True)\n    bpy.ops.object.delete()\n\n# Tekst om te gebruiken\ntekst = "ozan"\n\n# Maak een text object\nbpy.ops.object.text_add(\n    enter_editmode=False, align=\'WORLD\', location=(0, 0, 0), scale=(1, 1, 1))\ntext_obj = bpy.context.active_object\ntext_obj.name = "Ozan"\n\n# Configureer de text\ntext_obj.data.body = tekst\ntext_obj.data.align_x = \'CENTER\'  # Centreer de tekst\ntext_obj.data.size = 0.7  # Grootte van de tekst\ntext_obj.data.extrude = 0.04  # Diepte van 40mm (0.04 meter)\ntext_obj.data.font = bpy.data.fonts[0]  # Default font\n\n# Converteer naar mesh voor betere bewerkbaarheid\nbpy.ops.object.convert(target=\'MESH\')\n\n# Roteer het object zodat het verticaal staat (90 graden rond X-as)\ntext_obj.rotation_euler[0] = math.radians(90)  # 90 graden in X\ntext_obj.rotation_euler[1] = 0\ntext_obj.rotation_euler[2] = 0\n\n# Pas de rotatie toe\nbpy.ops.object.transform_apply(location=False, rotation=True, scale=False)\n\n# Maak het object wat groter voor betere visualisatie\nbpy.ops.transform.resize(value=(1.5, 1.5, 1.5))\n\n# Verplaats de tekst naar het centrum\nbpy.ops.object.origin_set(type=\'ORIGIN_CENTER_OF_MASS\')\ntext_obj.location = (0, 0, 0)\n\n# ------------------------------------------------------------\n# Maak een horizontaal profiel aan de achterkant van de letters\n# ------------------------------------------------------------\n\n# Bepaal afmetingen van het tekst object\ntext_dimensions = text_obj.dimensions\nwidth = text_dimensions.x\nheight =      text_dimensions.z  # Z is de hoogte omdat we de tekst 90 graden geroteerd hebben\n\n# Maak een extrusie kubus voor het profiel (30mm diep)\nprofile_depth = 0.03  # 30mm in meters\nbpy.ops.mesh.primitive_cube_add(\n    size=1, \n    location=(0, -0.02 - (profile_depth/2), 0)  # Plaats het net achter de letters\n)\nprofile = bpy.context.active_object\nprofile.name = "MountingProfile"\n\n# Pas de grootte aan zodat het profiel de volledige breedte van de tekst beslaat\n# en ongeveer 20% van de hoogte aan de onderkant\nprofile.scale = (width, profile_depth, height * 0.2)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# Plaats het profiel aan de onderkant van de letters\nprofile.location.z = -(height/2) + (profile.dimensions.z/2)\n\n# Maak een nieuw materiaal voor het profiel (bijvoorbeeld grijs)\nprofile_material = bpy.data.materials.new(name="ProfileMateriaal")\nprofile_material.diffuse_color = (0.3, 0.3, 0.3, 1.0)  # Grijs materiaal\nprofile.data.materials.append(profile_material)\n\n# Selecteer beide objecten voor toekomstige bewerkingen\ntext_obj.select_set(True)\nprofile.select_set(True)\nbpy.context.view_layer.objects.active = text_obj\n\n# Maak een nieuw materiaal voor de letters\nletter_material = bpy.data.materials.new(name="OzanMateriaal")\nletter_material.diffuse_color = (0.0, 0.2, 0.8, 1.0)  # Blauw materiaal\ntext_obj.data.materials.append(letter_material)\n\n# Voeg een camera toe die alles in beeld brengt\nbpy.ops.object.camera_add(location=(0, -5, 0), rotation=(math.radians(90), 0, 0))\ncamera = bpy.context.active_object\ncamera.name = "Camera"\n\n# Pas de camera afstand aan om alles in beeld te krijgen\ncamera.location.y = -8\n\n# Stel de camera in\nbpy.context.scene.camera = camera\n\n# Track to constraint voor de camera\nconstraint = camera.constraints.new(type=\'TRACK_TO\')\nconstraint.target = text_obj\nconstraint.track_axis = \'TRACK_NEGATIVE_Z\'\nconstraint.up_axis = \'UP_Y\'\n\n# Voeg verlichting toe\nbpy.ops.object.light_add(type=\'SUN\', radius=1, location=(1, -2, 3))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 2.0\n\n# Voeg een tweede licht toe voor betere verlichting\nbpy.ops.object.light_add(type=\'AREA\', radius=1, location=(-2, -1, 2))\narea_light = bpy.context.active_object\narea_light.name = "Fill Light"\narea_light.data.energy = 1.0\n\n# Configureer render instellingen\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\nbpy.context.scene.render.resolution_percentage = 100\nbpy.context.scene.render.film_transparent = True  # Transparante achtergrond\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"Ozan met montageprofiel opgeslagen naar: {filepath}")\n'
await send_bpy_script(SERVER_URI, ozan_script)
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
ozan_script
'\nimport bpy\nimport os\nimport math\nimport bmesh\n\n# Path voor het opslaan\nfilepath = os.path.join(os.getcwd(), "ozan_with_profile.blend")\n\n# Start met een nieuwe scene\nbpy.ops.wm.read_factory_settings(use_empty=True)\n\n# Verwijder de default kubus als die er is\nif \'Cube\' in bpy.data.objects:\n    bpy.data.objects[\'Cube\'].select_set(True)\n    bpy.ops.object.delete()\n\n# Tekst om te gebruiken\ntekst = "ozan"\n\n# Maak een text object\nbpy.ops.object.text_add(\n    enter_editmode=False, align=\'WORLD\', location=(0, 0, 0), scale=(1, 1, 1))\ntext_obj = bpy.context.active_object\ntext_obj.name = "Ozan"\n\n# Configureer de text\ntext_obj.data.body = tekst\ntext_obj.data.align_x = \'CENTER\'  # Centreer de tekst\ntext_obj.data.size = 0.7  # Grootte van de tekst\ntext_obj.data.extrude = 0.04  # Diepte van 40mm (0.04 meter)\ntext_obj.data.font = bpy.data.fonts[0]  # Default font\n\n# Converteer naar mesh voor betere bewerkbaarheid\nbpy.ops.object.convert(target=\'MESH\')\n\n# Roteer het object zodat het verticaal staat (90 graden rond X-as)\ntext_obj.rotation_euler[0] = math.radians(90)  # 90 graden in X\ntext_obj.rotation_euler[1] = 0\ntext_obj.rotation_euler[2] = 0\n\n# Pas de rotatie toe\nbpy.ops.object.transform_apply(location=False, rotation=True, scale=False)\n\n# Maak het object wat groter voor betere visualisatie\nbpy.ops.transform.resize(value=(1.5, 1.5, 1.5))\n\n# Verplaats de tekst naar het centrum\nbpy.ops.object.origin_set(type=\'ORIGIN_CENTER_OF_MASS\')\ntext_obj.location = (0, 0, 0)\n\n# ------------------------------------------------------------\n# Maak een horizontaal profiel aan de achterkant van de letters\n# ------------------------------------------------------------\n\n# Bepaal afmetingen van het tekst object\ntext_dimensions = text_obj.dimensions\nwidth = text_dimensions.x\nheight =      text_dimensions.z  # Z is de hoogte omdat we de tekst 90 graden geroteerd hebben\n\n# Maak een extrusie kubus voor het profiel (30mm diep)\nprofile_depth = 0.03  # 30mm in meters\nbpy.ops.mesh.primitive_cube_add(\n    size=1, \n    location=(0, -0.02 - (profile_depth/2), 0)  # Plaats het net achter de letters\n)\nprofile = bpy.context.active_object\nprofile.name = "MountingProfile"\n\n# Pas de grootte aan zodat het profiel de volledige breedte van de tekst beslaat\n# en ongeveer 20% van de hoogte aan de onderkant\nprofile.scale = (width, profile_depth, height * 0.2)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# Plaats het profiel aan de onderkant van de letters\nprofile.location.z = -(height/2) + (profile.dimensions.z/2)\n\n# Maak een nieuw materiaal voor het profiel (bijvoorbeeld grijs)\nprofile_material = bpy.data.materials.new(name="ProfileMateriaal")\nprofile_material.diffuse_color = (0.3, 0.3, 0.3, 1.0)  # Grijs materiaal\nprofile.data.materials.append(profile_material)\n\n# Selecteer beide objecten voor toekomstige bewerkingen\ntext_obj.select_set(True)\nprofile.select_set(True)\nbpy.context.view_layer.objects.active = text_obj\n\n# Maak een nieuw materiaal voor de letters\nletter_material = bpy.data.materials.new(name="OzanMateriaal")\nletter_material.diffuse_color = (0.0, 0.2, 0.8, 1.0)  # Blauw materiaal\ntext_obj.data.materials.append(letter_material)\n\n# Voeg een camera toe die alles in beeld brengt\nbpy.ops.object.camera_add(location=(0, -5, 0), rotation=(math.radians(90), 0, 0))\ncamera = bpy.context.active_object\ncamera.name = "Camera"\n\n# Pas de camera afstand aan om alles in beeld te krijgen\ncamera.location.y = -8\n\n# Stel de camera in\nbpy.context.scene.camera = camera\n\n# Track to constraint voor de camera\nconstraint = camera.constraints.new(type=\'TRACK_TO\')\nconstraint.target = text_obj\nconstraint.track_axis = \'TRACK_NEGATIVE_Z\'\nconstraint.up_axis = \'UP_Y\'\n\n# Voeg verlichting toe\nbpy.ops.object.light_add(type=\'SUN\', radius=1, location=(1, -2, 3))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 2.0\n\n# Voeg een tweede licht toe voor betere verlichting\nbpy.ops.object.light_add(type=\'AREA\', radius=1, location=(-2, -1, 2))\narea_light = bpy.context.active_object\narea_light.name = "Fill Light"\narea_light.data.energy = 1.0\n\n# Configureer render instellingen\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\nbpy.context.scene.render.resolution_percentage = 100\nbpy.context.scene.render.film_transparent = True  # Transparante achtergrond\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"Ozan met montageprofiel opgeslagen naar: {filepath}")\n'
await send_bpy_script(SERVER_URI, ozan_script)
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

send_bpy_script(SERVER_URI, ozan_script)

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
ozan_script
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









