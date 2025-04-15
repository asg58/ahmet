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
    rings_script = '\nimport bpy\nimport os\nimport math\nfrom math import radians\n\n# Path voor het opslaan\nfilepath = os.path.join(os.getcwd(), "3d_rings.blend")\n\n# Start met een nieuwe scene\nbpy.ops.wm.read_factory_settings(use_empty=True)\n\n# Maak het materiaal modern door de renderer te wijzigen naar Cycles\nbpy.context.scene.render.engine = \'CYCLES\'\nif hasattr(bpy.context.scene.cycles, \'device\'):\n    bpy.context.scene.cycles.device =      \'GPU\'  # Gebruik GPU voor snellere rendering als beschikbaar\n\n# Verwijder de default kubus als die er is\nif \'Cube\' in bpy.data.objects:\n    bpy.data.objects[\'Cube\'].select_set(True)\n    bpy.ops.object.delete()\n\n# Configuratie voor de ringen\nnum_rings = 4\nring_radius = 1.0\nring_thickness = 0.15\nring_depth = 0.08  # Diepte voor de doosletters effect\nring_overlap = 0.3  # Hoeveel de ringen overlappen\nring_colors = [\n    (0.8, 0.1, 0.1, 1.0),  # Rood\n    (0.1, 0.8, 0.1, 1.0),  # Groen\n    (0.1, 0.1, 0.8, 1.0),  # Blauw\n    (0.8, 0.6, 0.1, 1.0),  # Goud/oranje\n]\n\n# Maak de ringen\nrings = []\nfor i in range(num_rings):\n    # Bereken de positie\n    position = ((i * (ring_radius * 2 - ring_overlap)), 0, 0)\n    \n    # Maak een torus (ring)\n    bpy.ops.mesh.primitive_torus_add(\n        align=\'WORLD\',\n        location=position,\n        major_radius=ring_radius,\n        minor_radius=ring_thickness,\n        major_segments=48,\n        minor_segments=16\n    )\n    \n    # Geef de ring een naam\n    ring = bpy.context.active_object\n    ring.name = f"Ring_{i+1}"\n    \n    # Stel het materiaal in\n    material = bpy.data.materials.new(name=f"Material_Ring_{i+1}")\n    material.use_nodes = True\n    nodes = material.node_tree.nodes\n    \n    # Clear all nodes to start clean\n    for node in nodes:\n        nodes.remove(node)\n    \n    # Voeg een Principled BSDF node toe voor modern metallic materiaal\n    principled = nodes.new(type=\'ShaderNodeBsdfPrincipled\')\n    principled.inputs[\'Base Color\'].default_value = ring_colors[i]\n    principled.inputs[\'Metallic\'].default_value = 0.9\n    \n    # Gebruik \'Specular IOR Level\' in plaats van \'Specular\' (compatibility met Blender 4.0+)\n    if \'Specular IOR Level\' in principled.inputs:\n        principled.inputs[\'Specular IOR Level\'].default_value = 0.6\n    elif \'Specular\' in principled.inputs:\n        principled.inputs[\'Specular\'].default_value = 0.6\n        \n    principled.inputs[\'Roughness\'].default_value = 0.2\n    \n    # Voeg een output node toe\n    output = nodes.new(type=\'ShaderNodeOutputMaterial\')\n    \n    # Verbind de nodes\n    material.node_tree.links.new(principled.outputs[\'BSDF\'], output.inputs[\'Surface\'])\n    \n    # Pas het materiaal toe op de ring\n    if ring.data.materials:\n        ring.data.materials[0] = material\n    else:\n        ring.data.materials.append(material)\n    \n    # Maak een kopie voor de binnenkant om de doosletter te maken\n    bpy.ops.object.duplicate()\n    inner_ring = bpy.context.active_object\n    inner_ring.name = f"Ring_{i+1}_inner"\n    \n    # Schaal de binnenkant iets kleiner om het doosletter effect te maken\n    inner_ring.scale = (0.97, 0.97, 0.97)\n    \n    # Selecteer de buitenste ring weer\n    inner_ring.select_set(False)\n    ring.select_set(True)\n    bpy.context.view_layer.objects.active = ring\n    \n    # Boolean verschil operatie om het doosletter effect te maken\n    bool_modifier = ring.modifiers.new(name="Boolean", type=\'BOOLEAN\')\n    bool_modifier.operation = \'DIFFERENCE\'\n    bool_modifier.object = inner_ring\n    \n    # Pas de modifier toe\n    bpy.ops.object.modifier_apply(modifier="Boolean")\n    \n    # Verwijder de binnenkant\n    inner_ring.select_set(True)\n    ring.select_set(False)\n    bpy.ops.object.delete()\n    \n    # Selecteer de ring weer\n    ring.select_set(True)\n    bpy.context.view_layer.objects.active = ring\n    \n    # Extrude de ring om diepte toe te voegen voor het doosletter effect\n    bpy.ops.object.mode_set(mode=\'EDIT\')\n    bpy.ops.mesh.select_all(action=\'SELECT\')\n    bpy.ops.mesh.extrude_region_move(\n        TRANSFORM_OT_translate=(0, 0, ring_depth)\n    )\n    bpy.ops.object.mode_set(mode=\'OBJECT\')\n    \n    # Voeg de ring toe aan de lijst\n    rings.append(ring)\n\n# Centreer de ringen\ntotal_width = (num_rings - 1) * (ring_radius * 2 - ring_overlap)\ncenter_offset = total_width / 2\n\nfor ring in rings:\n    ring.location.x -= center_offset\n\n# Voeg camera toe\nbpy.ops.object.camera_add(location=(0, -5, 2), rotation=(radians(75), 0, 0))\ncamera = bpy.context.active_object\ncamera.name = "Camera"\nbpy.context.scene.camera = camera\n\n# Camera instellingen voor mooie weergave\ncamera.data.lens = 50  # 50mm lens\n\n# Maak een lege object om de camera naar te richten\nbpy.ops.object.empty_add(location=(0, 0, 0))\nempty = bpy.context.active_object\nempty.name = "CameraTarget"\n\n# Voeg een Track To constraint toe aan de camera\nconstraint = camera.constraints.new(type=\'TRACK_TO\')\nconstraint.target = empty\nconstraint.track_axis = \'TRACK_NEGATIVE_Z\'\nconstraint.up_axis = \'UP_Y\'\n\n# Lighting setup - Drie-punt belichting voor mooie presentatie\n# Key light (hoofdlicht) - voor verlichting van de voorkant\nbpy.ops.object.light_add(type=\'AREA\', location=(3, -3, 4))\nkey_light = bpy.context.active_object\nkey_light.name = "Key_Light"\nkey_light.data.energy = 500\nkey_light.data.size = 2.0\nkey_light.rotation_euler = (radians(45), 0, radians(45))\n\n# Fill light (invullicht) - om schaduwen op te vullen\nbpy.ops.object.light_add(type=\'AREA\', location=(-3, -2, 2))\nfill_light = bpy.context.active_object\nfill_light.name = "Fill_Light"\nfill_light.data.energy = 300\nfill_light.data.size = 3.0\nfill_light.rotation_euler = (radians(45), 0, radians(-45))\n\n# Rim light (achterlicht) - voor rand-highlight effect\nbpy.ops.object.light_add(type=\'SPOT\', location=(0, 3, 3))\nrim_light = bpy.context.active_object\nrim_light.name = "Rim_Light"\nrim_light.data.energy = 800\nrim_light.data.spot_size = radians(45)\nrim_light.data.spot_blend = 0.15\nrim_light.rotation_euler = (radians(-45), 0, 0)\n\n# Extra licht om de voorkant beter uit te lichten\nbpy.ops.object.light_add(type=\'AREA\', location=(0, -4, 1))\nfront_light = bpy.context.active_object\nfront_light.name = "Front_Light"\nfront_light.data.energy = 400\nfront_light.data.size = 4.0\nfront_light.rotation_euler = (radians(80), 0, 0)\n\n# Ground plane voor schaduwen\nbpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1))\nground = bpy.context.active_object\nground.name = "Ground"\n\n# Maak een materiaal voor de grond\nground_mat = bpy.data.materials.new(name="GroundMaterial")\nground_mat.use_nodes = True\nnodes = ground_mat.node_tree.nodes\n\n# Clear all nodes\nfor node in nodes:\n    nodes.remove(node)\n\n# Maak een simpel mat materiaal voor de grond\ndiffuse = nodes.new(type=\'ShaderNodeBsdfDiffuse\')\ndiffuse.inputs[\'Color\'].default_value = (0.05, 0.05, 0.05, 1.0)\ndiffuse.inputs[\'Roughness\'].default_value = 0.6\n\noutput = nodes.new(type=\'ShaderNodeOutputMaterial\')\nground_mat.node_tree.links.new(diffuse.outputs[\'BSDF\'], output.inputs[\'Surface\'])\n\n# Pas het materiaal toe op de grond\nground.data.materials.append(ground_mat)\n\n# Render instellingen\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\nbpy.context.scene.render.film_transparent = False\nbpy.context.scene.render.filepath = os.path.join(os.getcwd(), "3d_rings_render.png")\n\n# Ambient occlusion en andere render settings\nbpy.context.scene.world.use_nodes = True\nworld_nodes = bpy.context.scene.world.node_tree.nodes\nworld_links = bpy.context.scene.world.node_tree.links\n\n# Clear bestaande nodes\nfor node in world_nodes:\n    world_nodes.remove(node)\n\n# Creëer een subtiele achtergrond\nbg = world_nodes.new(type=\'ShaderNodeBackground\')\nbg.inputs[\'Color\'].default_value = (0.05, 0.05, 0.05, 1.0)\nbg.inputs[\'Strength\'].default_value = 1.0\n\noutput = world_nodes.new(type=\'ShaderNodeOutputWorld\')\nworld_links.new(bg.outputs[\'Background\'], output.inputs[\'Surface\'])\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"3D ringen scene opgeslagen naar: {filepath}")\n\n# Render de afbeelding\ntry:\n    bpy.ops.render.render(write_still=True)\n    print(\n    f"Afbeelding gerenderd naar: {os.path.join(os.getcwd(), \'3d_rings_render.png\')}")\nexcept Exception as e:\n    print(f"Fout bij renderen: {e}")\n'
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

rings_script = '\nimport bpy\nimport os\nimport math\nfrom math import radians\n\n# Path voor het opslaan\nfilepath = os.path.join(os.getcwd(), "3d_rings.blend")\n\n# Start met een nieuwe scene\nbpy.ops.wm.read_factory_settings(use_empty=True)\n\n# Maak het materiaal modern door de renderer te wijzigen naar Cycles\nbpy.context.scene.render.engine = \'CYCLES\'\nif hasattr(bpy.context.scene.cycles, \'device\'):\n    bpy.context.scene.cycles.device =      \'GPU\'  # Gebruik GPU voor snellere rendering als beschikbaar\n\n# Verwijder de default kubus als die er is\nif \'Cube\' in bpy.data.objects:\n    bpy.data.objects[\'Cube\'].select_set(True)\n    bpy.ops.object.delete()\n\n# Configuratie voor de ringen\nnum_rings = 4\nring_radius = 1.0\nring_thickness = 0.15\nring_depth = 0.08  # Diepte voor de doosletters effect\nring_overlap = 0.3  # Hoeveel de ringen overlappen\nring_colors = [\n    (0.8, 0.1, 0.1, 1.0),  # Rood\n    (0.1, 0.8, 0.1, 1.0),  # Groen\n    (0.1, 0.1, 0.8, 1.0),  # Blauw\n    (0.8, 0.6, 0.1, 1.0),  # Goud/oranje\n]\n\n# Maak de ringen\nrings = []\nfor i in range(num_rings):\n    # Bereken de positie\n    position = ((i * (ring_radius * 2 - ring_overlap)), 0, 0)\n    \n    # Maak een torus (ring)\n    bpy.ops.mesh.primitive_torus_add(\n        align=\'WORLD\',\n        location=position,\n        major_radius=ring_radius,\n        minor_radius=ring_thickness,\n        major_segments=48,\n        minor_segments=16\n    )\n    \n    # Geef de ring een naam\n    ring = bpy.context.active_object\n    ring.name = f"Ring_{i+1}"\n    \n    # Stel het materiaal in\n    material = bpy.data.materials.new(name=f"Material_Ring_{i+1}")\n    material.use_nodes = True\n    nodes = material.node_tree.nodes\n    \n    # Clear all nodes to start clean\n    for node in nodes:\n        nodes.remove(node)\n    \n    # Voeg een Principled BSDF node toe voor modern metallic materiaal\n    principled = nodes.new(type=\'ShaderNodeBsdfPrincipled\')\n    principled.inputs[\'Base Color\'].default_value = ring_colors[i]\n    principled.inputs[\'Metallic\'].default_value = 0.9\n    \n    # Gebruik \'Specular IOR Level\' in plaats van \'Specular\' (compatibility met Blender 4.0+)\n    if \'Specular IOR Level\' in principled.inputs:\n        principled.inputs[\'Specular IOR Level\'].default_value = 0.6\n    elif \'Specular\' in principled.inputs:\n        principled.inputs[\'Specular\'].default_value = 0.6\n        \n    principled.inputs[\'Roughness\'].default_value = 0.2\n    \n    # Voeg een output node toe\n    output = nodes.new(type=\'ShaderNodeOutputMaterial\')\n    \n    # Verbind de nodes\n    material.node_tree.links.new(principled.outputs[\'BSDF\'], output.inputs[\'Surface\'])\n    \n    # Pas het materiaal toe op de ring\n    if ring.data.materials:\n        ring.data.materials[0] = material\n    else:\n        ring.data.materials.append(material)\n    \n    # Maak een kopie voor de binnenkant om de doosletter te maken\n    bpy.ops.object.duplicate()\n    inner_ring = bpy.context.active_object\n    inner_ring.name = f"Ring_{i+1}_inner"\n    \n    # Schaal de binnenkant iets kleiner om het doosletter effect te maken\n    inner_ring.scale = (0.97, 0.97, 0.97)\n    \n    # Selecteer de buitenste ring weer\n    inner_ring.select_set(False)\n    ring.select_set(True)\n    bpy.context.view_layer.objects.active = ring\n    \n    # Boolean verschil operatie om het doosletter effect te maken\n    bool_modifier = ring.modifiers.new(name="Boolean", type=\'BOOLEAN\')\n    bool_modifier.operation = \'DIFFERENCE\'\n    bool_modifier.object = inner_ring\n    \n    # Pas de modifier toe\n    bpy.ops.object.modifier_apply(modifier="Boolean")\n    \n    # Verwijder de binnenkant\n    inner_ring.select_set(True)\n    ring.select_set(False)\n    bpy.ops.object.delete()\n    \n    # Selecteer de ring weer\n    ring.select_set(True)\n    bpy.context.view_layer.objects.active = ring\n    \n    # Extrude de ring om diepte toe te voegen voor het doosletter effect\n    bpy.ops.object.mode_set(mode=\'EDIT\')\n    bpy.ops.mesh.select_all(action=\'SELECT\')\n    bpy.ops.mesh.extrude_region_move(\n        TRANSFORM_OT_translate=(0, 0, ring_depth)\n    )\n    bpy.ops.object.mode_set(mode=\'OBJECT\')\n    \n    # Voeg de ring toe aan de lijst\n    rings.append(ring)\n\n# Centreer de ringen\ntotal_width = (num_rings - 1) * (ring_radius * 2 - ring_overlap)\ncenter_offset = total_width / 2\n\nfor ring in rings:\n    ring.location.x -= center_offset\n\n# Voeg camera toe\nbpy.ops.object.camera_add(location=(0, -5, 2), rotation=(radians(75), 0, 0))\ncamera = bpy.context.active_object\ncamera.name = "Camera"\nbpy.context.scene.camera = camera\n\n# Camera instellingen voor mooie weergave\ncamera.data.lens = 50  # 50mm lens\n\n# Maak een lege object om de camera naar te richten\nbpy.ops.object.empty_add(location=(0, 0, 0))\nempty = bpy.context.active_object\nempty.name = "CameraTarget"\n\n# Voeg een Track To constraint toe aan de camera\nconstraint = camera.constraints.new(type=\'TRACK_TO\')\nconstraint.target = empty\nconstraint.track_axis = \'TRACK_NEGATIVE_Z\'\nconstraint.up_axis = \'UP_Y\'\n\n# Lighting setup - Drie-punt belichting voor mooie presentatie\n# Key light (hoofdlicht) - voor verlichting van de voorkant\nbpy.ops.object.light_add(type=\'AREA\', location=(3, -3, 4))\nkey_light = bpy.context.active_object\nkey_light.name = "Key_Light"\nkey_light.data.energy = 500\nkey_light.data.size = 2.0\nkey_light.rotation_euler = (radians(45), 0, radians(45))\n\n# Fill light (invullicht) - om schaduwen op te vullen\nbpy.ops.object.light_add(type=\'AREA\', location=(-3, -2, 2))\nfill_light = bpy.context.active_object\nfill_light.name = "Fill_Light"\nfill_light.data.energy = 300\nfill_light.data.size = 3.0\nfill_light.rotation_euler = (radians(45), 0, radians(-45))\n\n# Rim light (achterlicht) - voor rand-highlight effect\nbpy.ops.object.light_add(type=\'SPOT\', location=(0, 3, 3))\nrim_light = bpy.context.active_object\nrim_light.name = "Rim_Light"\nrim_light.data.energy = 800\nrim_light.data.spot_size = radians(45)\nrim_light.data.spot_blend = 0.15\nrim_light.rotation_euler = (radians(-45), 0, 0)\n\n# Extra licht om de voorkant beter uit te lichten\nbpy.ops.object.light_add(type=\'AREA\', location=(0, -4, 1))\nfront_light = bpy.context.active_object\nfront_light.name = "Front_Light"\nfront_light.data.energy = 400\nfront_light.data.size = 4.0\nfront_light.rotation_euler = (radians(80), 0, 0)\n\n# Ground plane voor schaduwen\nbpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1))\nground = bpy.context.active_object\nground.name = "Ground"\n\n# Maak een materiaal voor de grond\nground_mat = bpy.data.materials.new(name="GroundMaterial")\nground_mat.use_nodes = True\nnodes = ground_mat.node_tree.nodes\n\n# Clear all nodes\nfor node in nodes:\n    nodes.remove(node)\n\n# Maak een simpel mat materiaal voor de grond\ndiffuse = nodes.new(type=\'ShaderNodeBsdfDiffuse\')\ndiffuse.inputs[\'Color\'].default_value = (0.05, 0.05, 0.05, 1.0)\ndiffuse.inputs[\'Roughness\'].default_value = 0.6\n\noutput = nodes.new(type=\'ShaderNodeOutputMaterial\')\nground_mat.node_tree.links.new(diffuse.outputs[\'BSDF\'], output.inputs[\'Surface\'])\n\n# Pas het materiaal toe op de grond\nground.data.materials.append(ground_mat)\n\n# Render instellingen\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\nbpy.context.scene.render.film_transparent = False\nbpy.context.scene.render.filepath = os.path.join(os.getcwd(), "3d_rings_render.png")\n\n# Ambient occlusion en andere render settings\nbpy.context.scene.world.use_nodes = True\nworld_nodes = bpy.context.scene.world.node_tree.nodes\nworld_links = bpy.context.scene.world.node_tree.links\n\n# Clear bestaande nodes\nfor node in world_nodes:\n    world_nodes.remove(node)\n\n# Creëer een subtiele achtergrond\nbg = world_nodes.new(type=\'ShaderNodeBackground\')\nbg.inputs[\'Color\'].default_value = (0.05, 0.05, 0.05, 1.0)\nbg.inputs[\'Strength\'].default_value = 1.0\n\noutput = world_nodes.new(type=\'ShaderNodeOutputWorld\')\nworld_links.new(bg.outputs[\'Background\'], output.inputs[\'Surface\'])\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"3D ringen scene opgeslagen naar: {filepath}")\n\n# Render de afbeelding\ntry:\n    bpy.ops.render.render(write_still=True)\n    print(\n    f"Afbeelding gerenderd naar: {os.path.join(os.getcwd(), \'3d_rings_render.png\')}")\nexcept Exception as e:\n    print(f"Fout bij renderen: {e}")\n'
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
'\nimport bpy\nimport os\nimport math\nfrom math import radians\n\n# Path voor het opslaan\nfilepath = os.path.join(os.getcwd(), "3d_rings.blend")\n\n# Start met een nieuwe scene\nbpy.ops.wm.read_factory_settings(use_empty=True)\n\n# Maak het materiaal modern door de renderer te wijzigen naar Cycles\nbpy.context.scene.render.engine = \'CYCLES\'\nif hasattr(bpy.context.scene.cycles, \'device\'):\n    bpy.context.scene.cycles.device =      \'GPU\'  # Gebruik GPU voor snellere rendering als beschikbaar\n\n# Verwijder de default kubus als die er is\nif \'Cube\' in bpy.data.objects:\n    bpy.data.objects[\'Cube\'].select_set(True)\n    bpy.ops.object.delete()\n\n# Configuratie voor de ringen\nnum_rings = 4\nring_radius = 1.0\nring_thickness = 0.15\nring_depth = 0.08  # Diepte voor de doosletters effect\nring_overlap = 0.3  # Hoeveel de ringen overlappen\nring_colors = [\n    (0.8, 0.1, 0.1, 1.0),  # Rood\n    (0.1, 0.8, 0.1, 1.0),  # Groen\n    (0.1, 0.1, 0.8, 1.0),  # Blauw\n    (0.8, 0.6, 0.1, 1.0),  # Goud/oranje\n]\n\n# Maak de ringen\nrings = []\nfor i in range(num_rings):\n    # Bereken de positie\n    position = ((i * (ring_radius * 2 - ring_overlap)), 0, 0)\n    \n    # Maak een torus (ring)\n    bpy.ops.mesh.primitive_torus_add(\n        align=\'WORLD\',\n        location=position,\n        major_radius=ring_radius,\n        minor_radius=ring_thickness,\n        major_segments=48,\n        minor_segments=16\n    )\n    \n    # Geef de ring een naam\n    ring = bpy.context.active_object\n    ring.name = f"Ring_{i+1}"\n    \n    # Stel het materiaal in\n    material = bpy.data.materials.new(name=f"Material_Ring_{i+1}")\n    material.use_nodes = True\n    nodes = material.node_tree.nodes\n    \n    # Clear all nodes to start clean\n    for node in nodes:\n        nodes.remove(node)\n    \n    # Voeg een Principled BSDF node toe voor modern metallic materiaal\n    principled = nodes.new(type=\'ShaderNodeBsdfPrincipled\')\n    principled.inputs[\'Base Color\'].default_value = ring_colors[i]\n    principled.inputs[\'Metallic\'].default_value = 0.9\n    \n    # Gebruik \'Specular IOR Level\' in plaats van \'Specular\' (compatibility met Blender 4.0+)\n    if \'Specular IOR Level\' in principled.inputs:\n        principled.inputs[\'Specular IOR Level\'].default_value = 0.6\n    elif \'Specular\' in principled.inputs:\n        principled.inputs[\'Specular\'].default_value = 0.6\n        \n    principled.inputs[\'Roughness\'].default_value = 0.2\n    \n    # Voeg een output node toe\n    output = nodes.new(type=\'ShaderNodeOutputMaterial\')\n    \n    # Verbind de nodes\n    material.node_tree.links.new(principled.outputs[\'BSDF\'], output.inputs[\'Surface\'])\n    \n    # Pas het materiaal toe op de ring\n    if ring.data.materials:\n        ring.data.materials[0] = material\n    else:\n        ring.data.materials.append(material)\n    \n    # Maak een kopie voor de binnenkant om de doosletter te maken\n    bpy.ops.object.duplicate()\n    inner_ring = bpy.context.active_object\n    inner_ring.name = f"Ring_{i+1}_inner"\n    \n    # Schaal de binnenkant iets kleiner om het doosletter effect te maken\n    inner_ring.scale = (0.97, 0.97, 0.97)\n    \n    # Selecteer de buitenste ring weer\n    inner_ring.select_set(False)\n    ring.select_set(True)\n    bpy.context.view_layer.objects.active = ring\n    \n    # Boolean verschil operatie om het doosletter effect te maken\n    bool_modifier = ring.modifiers.new(name="Boolean", type=\'BOOLEAN\')\n    bool_modifier.operation = \'DIFFERENCE\'\n    bool_modifier.object = inner_ring\n    \n    # Pas de modifier toe\n    bpy.ops.object.modifier_apply(modifier="Boolean")\n    \n    # Verwijder de binnenkant\n    inner_ring.select_set(True)\n    ring.select_set(False)\n    bpy.ops.object.delete()\n    \n    # Selecteer de ring weer\n    ring.select_set(True)\n    bpy.context.view_layer.objects.active = ring\n    \n    # Extrude de ring om diepte toe te voegen voor het doosletter effect\n    bpy.ops.object.mode_set(mode=\'EDIT\')\n    bpy.ops.mesh.select_all(action=\'SELECT\')\n    bpy.ops.mesh.extrude_region_move(\n        TRANSFORM_OT_translate=(0, 0, ring_depth)\n    )\n    bpy.ops.object.mode_set(mode=\'OBJECT\')\n    \n    # Voeg de ring toe aan de lijst\n    rings.append(ring)\n\n# Centreer de ringen\ntotal_width = (num_rings - 1) * (ring_radius * 2 - ring_overlap)\ncenter_offset = total_width / 2\n\nfor ring in rings:\n    ring.location.x -= center_offset\n\n# Voeg camera toe\nbpy.ops.object.camera_add(location=(0, -5, 2), rotation=(radians(75), 0, 0))\ncamera = bpy.context.active_object\ncamera.name = "Camera"\nbpy.context.scene.camera = camera\n\n# Camera instellingen voor mooie weergave\ncamera.data.lens = 50  # 50mm lens\n\n# Maak een lege object om de camera naar te richten\nbpy.ops.object.empty_add(location=(0, 0, 0))\nempty = bpy.context.active_object\nempty.name = "CameraTarget"\n\n# Voeg een Track To constraint toe aan de camera\nconstraint = camera.constraints.new(type=\'TRACK_TO\')\nconstraint.target = empty\nconstraint.track_axis = \'TRACK_NEGATIVE_Z\'\nconstraint.up_axis = \'UP_Y\'\n\n# Lighting setup - Drie-punt belichting voor mooie presentatie\n# Key light (hoofdlicht) - voor verlichting van de voorkant\nbpy.ops.object.light_add(type=\'AREA\', location=(3, -3, 4))\nkey_light = bpy.context.active_object\nkey_light.name = "Key_Light"\nkey_light.data.energy = 500\nkey_light.data.size = 2.0\nkey_light.rotation_euler = (radians(45), 0, radians(45))\n\n# Fill light (invullicht) - om schaduwen op te vullen\nbpy.ops.object.light_add(type=\'AREA\', location=(-3, -2, 2))\nfill_light = bpy.context.active_object\nfill_light.name = "Fill_Light"\nfill_light.data.energy = 300\nfill_light.data.size = 3.0\nfill_light.rotation_euler = (radians(45), 0, radians(-45))\n\n# Rim light (achterlicht) - voor rand-highlight effect\nbpy.ops.object.light_add(type=\'SPOT\', location=(0, 3, 3))\nrim_light = bpy.context.active_object\nrim_light.name = "Rim_Light"\nrim_light.data.energy = 800\nrim_light.data.spot_size = radians(45)\nrim_light.data.spot_blend = 0.15\nrim_light.rotation_euler = (radians(-45), 0, 0)\n\n# Extra licht om de voorkant beter uit te lichten\nbpy.ops.object.light_add(type=\'AREA\', location=(0, -4, 1))\nfront_light = bpy.context.active_object\nfront_light.name = "Front_Light"\nfront_light.data.energy = 400\nfront_light.data.size = 4.0\nfront_light.rotation_euler = (radians(80), 0, 0)\n\n# Ground plane voor schaduwen\nbpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1))\nground = bpy.context.active_object\nground.name = "Ground"\n\n# Maak een materiaal voor de grond\nground_mat = bpy.data.materials.new(name="GroundMaterial")\nground_mat.use_nodes = True\nnodes = ground_mat.node_tree.nodes\n\n# Clear all nodes\nfor node in nodes:\n    nodes.remove(node)\n\n# Maak een simpel mat materiaal voor de grond\ndiffuse = nodes.new(type=\'ShaderNodeBsdfDiffuse\')\ndiffuse.inputs[\'Color\'].default_value = (0.05, 0.05, 0.05, 1.0)\ndiffuse.inputs[\'Roughness\'].default_value = 0.6\n\noutput = nodes.new(type=\'ShaderNodeOutputMaterial\')\nground_mat.node_tree.links.new(diffuse.outputs[\'BSDF\'], output.inputs[\'Surface\'])\n\n# Pas het materiaal toe op de grond\nground.data.materials.append(ground_mat)\n\n# Render instellingen\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\nbpy.context.scene.render.film_transparent = False\nbpy.context.scene.render.filepath = os.path.join(os.getcwd(), "3d_rings_render.png")\n\n# Ambient occlusion en andere render settings\nbpy.context.scene.world.use_nodes = True\nworld_nodes = bpy.context.scene.world.node_tree.nodes\nworld_links = bpy.context.scene.world.node_tree.links\n\n# Clear bestaande nodes\nfor node in world_nodes:\n    world_nodes.remove(node)\n\n# Creëer een subtiele achtergrond\nbg = world_nodes.new(type=\'ShaderNodeBackground\')\nbg.inputs[\'Color\'].default_value = (0.05, 0.05, 0.05, 1.0)\nbg.inputs[\'Strength\'].default_value = 1.0\n\noutput = world_nodes.new(type=\'ShaderNodeOutputWorld\')\nworld_links.new(bg.outputs[\'Background\'], output.inputs[\'Surface\'])\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath=filepath)\nprint(f"3D ringen scene opgeslagen naar: {filepath}")\n\n# Render de afbeelding\ntry:\n    bpy.ops.render.render(write_still=True)\n    print(\n    f"Afbeelding gerenderd naar: {os.path.join(os.getcwd(), \'3d_rings_render.png\')}")\nexcept Exception as e:\n    print(f"Fout bij renderen: {e}")\n'
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









