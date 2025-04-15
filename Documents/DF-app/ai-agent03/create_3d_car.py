import asyncio
import json
import random
import sys
import websockets

'\nBlender WebSocket Client: 3D Car Generator\nThis script connects to a Blender WebSocket server and creates a 3D car model.\n'
SERVER_URI = 'ws://localhost:8765'
async def send_bpy_script(uri, script_code):
    """
    Connect to the WebSocket server and send a Blender Python script
    
    Args:
        uri (str): The WebSocket server URI
        script_code (str): The Blender Python script to execute
        
    Returns:
        dict: The response from the server
    """
    try:
        async with websockets.connect(uri) as websocket:
            message = {'type': 'bpy_script', 'code': script_code}
            await websocket.send(json.dumps(message))
            print('Script sent to Blender WebSocket server')
            response = await websocket.recv()
            response_data = json.loads(response)
            if response_data['status'] == 'ok':
                print('Success: Script executed')
                if 'details' in response_data:
                    print(f"Details: {response_data['details']}")
            else:
                print(f"Error: {response_data['details']}")
            return response_data
    except Exception as e:
        print(f'Error connecting to WebSocket server: {str(e)}')
        return {'status': 'error', 'details': str(e)}
async def main():
    """
    Main function that generates a Blender script
    to create a simple 3D car and sends it to the server
    """
    r = random.random()
    g = random.random()
    b = random.random()
    blender_script = '\nimport bpy\nimport math\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Function to create a material\ndef create_material(name, color):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Metallic\'].default_value = 0.8\n        principled.inputs[\'Specular IOR Level\'].default_value = 0.5\n        principled.inputs[\'Roughness\'].default_value = 0.2\n    return mat\n\n# Create the car materials\ncar_color = ({0}, {1}, {2}, 1.0)\ncar_body_material = create_material("CarBody", car_color)\nwheel_material = create_material("Wheel", (0.02, 0.02, 0.02, 1.0))\nglass_material = create_material("Glass", (0.8, 0.9, 1.0, 0.2))\nglass_material.blend_method = \'BLEND\'\nglass_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Alpha\'].default_value = 0.3\n\n# BODY - Car body (base)\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))\nbody = bpy.context.active_object\nbody.name = "CarBody"\nbody.scale = (2.5, 1.2, 0.5)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# TOP - Car roof\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.1))\ntop = bpy.context.active_object\ntop.name = "CarTop"\ntop.scale = (1.5, 1.0, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Join body and top\nbpy.ops.object.select_all(action=\'DESELECT\')\nbody.select_set(True)\ntop.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# FRONT - Car front\nbpy.ops.mesh.primitive_cube_add(size=1, location=(1.3, 0, 0.4))\nfront = bpy.context.active_object\nfront.name = "CarFront"\nfront.scale = (0.4, 1.2, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Add front to the body\nbody.select_set(True)\nfront.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# Assign material to body\nbody.data.materials.append(car_body_material)\n\n# WINDOW - Windshield\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0.8, 0, 1.15))\nfront_window = bpy.context.active_object\nfront_window.name = "FrontWindow"\nfront_window.scale = (0.1, 0.9, 0.3)\nfront_window.data.materials.append(glass_material)\n\n# WHEELS - Create 4 wheels\nwheel_positions = [\n    (0.8, 0.7, 0.3),  # Front right\n    (0.8, -0.7, 0.3),  # Front left\n    (-0.8, 0.7, 0.3),  # Rear right\n    (-0.8, -0.7, 0.3)  # Rear left\n]\n\nwheels = []\nfor i, pos in enumerate(wheel_positions):\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=16,\n        radius=0.3,\n        depth=0.2,\n        location=pos\n    )\n    wheel = bpy.context.active_object\n    wheel.name = f"Wheel_{i+1}"\n    wheel.rotation_euler[1] = math.radians(90)\n    wheel.data.materials.append(wheel_material)\n    wheels.append(wheel)\n\n# HEADLIGHTS - Create headlights\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, 0.5, 0.5)\n)\nheadlight_r = bpy.context.active_object\nheadlight_r.name = "Headlight_R"\nheadlight_r.rotation_euler[1] = math.radians(90)\n\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, -0.5, 0.5)\n)\nheadlight_l = bpy.context.active_object\nheadlight_l.name = "Headlight_L"\nheadlight_l.rotation_euler[1] = math.radians(90)\n\n# Create and add light emitting material to headlights\nlight_material = create_material("HeadlightMaterial", (1, 1, 0.8, 1))\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Strength\'].default_value = 3.0\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Color\'].default_value = (1, 1, 0.8, 1)\n\nheadlight_r.data.materials.append(light_material)\nheadlight_l.data.materials.append(light_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 2.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(5, -5, 3))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(70), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D car successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_car_scene.blend")\nprint("Scene saved as: 3d_car_scene.blend")\n'.format(r, g, b)
    await send_bpy_script(SERVER_URI, blender_script)
if __name__ == '__main__':
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
'\nBlender WebSocket Client: 3D Car Generator\nThis script connects to a Blender WebSocket server and creates a 3D car model.\n'
asyncio
json
sys
random
websockets
SERVER_URI
'ws://localhost:8765'
uri, script_code
'\n    Connect to the WebSocket server and send a Blender Python script\n    \n    Args:\n        uri (str): The WebSocket server URI\n        script_code (str): The Blender Python script to execute\n        \n    Returns:\n        dict: The response from the server\n    '
try:
    async with websockets.connect(uri) as websocket:
        message = {'type': 'bpy_script', 'code': script_code}
        await websocket.send(json.dumps(message))
        print('Script sent to Blender WebSocket server')
        response = await websocket.recv()
        response_data = json.loads(response)
        if response_data['status'] == 'ok':
            print('Success: Script executed')
            if 'details' in response_data:
                print(f"Details: {response_data['details']}")
        else:
            print(f"Error: {response_data['details']}")
        return response_data
except Exception as e:
    print(f'Error connecting to WebSocket server: {str(e)}')
    return {'status': 'error', 'details': str(e)}

'\n    Main function that generates a Blender script\n    to create a simple 3D car and sends it to the server\n    '
r = random.random()
g = random.random()
b = random.random()
blender_script = '\nimport bpy\nimport math\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Function to create a material\ndef create_material(name, color):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Metallic\'].default_value = 0.8\n        principled.inputs[\'Specular IOR Level\'].default_value = 0.5\n        principled.inputs[\'Roughness\'].default_value = 0.2\n    return mat\n\n# Create the car materials\ncar_color = ({0}, {1}, {2}, 1.0)\ncar_body_material = create_material("CarBody", car_color)\nwheel_material = create_material("Wheel", (0.02, 0.02, 0.02, 1.0))\nglass_material = create_material("Glass", (0.8, 0.9, 1.0, 0.2))\nglass_material.blend_method = \'BLEND\'\nglass_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Alpha\'].default_value = 0.3\n\n# BODY - Car body (base)\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))\nbody = bpy.context.active_object\nbody.name = "CarBody"\nbody.scale = (2.5, 1.2, 0.5)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# TOP - Car roof\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.1))\ntop = bpy.context.active_object\ntop.name = "CarTop"\ntop.scale = (1.5, 1.0, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Join body and top\nbpy.ops.object.select_all(action=\'DESELECT\')\nbody.select_set(True)\ntop.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# FRONT - Car front\nbpy.ops.mesh.primitive_cube_add(size=1, location=(1.3, 0, 0.4))\nfront = bpy.context.active_object\nfront.name = "CarFront"\nfront.scale = (0.4, 1.2, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Add front to the body\nbody.select_set(True)\nfront.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# Assign material to body\nbody.data.materials.append(car_body_material)\n\n# WINDOW - Windshield\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0.8, 0, 1.15))\nfront_window = bpy.context.active_object\nfront_window.name = "FrontWindow"\nfront_window.scale = (0.1, 0.9, 0.3)\nfront_window.data.materials.append(glass_material)\n\n# WHEELS - Create 4 wheels\nwheel_positions = [\n    (0.8, 0.7, 0.3),  # Front right\n    (0.8, -0.7, 0.3),  # Front left\n    (-0.8, 0.7, 0.3),  # Rear right\n    (-0.8, -0.7, 0.3)  # Rear left\n]\n\nwheels = []\nfor i, pos in enumerate(wheel_positions):\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=16,\n        radius=0.3,\n        depth=0.2,\n        location=pos\n    )\n    wheel = bpy.context.active_object\n    wheel.name = f"Wheel_{i+1}"\n    wheel.rotation_euler[1] = math.radians(90)\n    wheel.data.materials.append(wheel_material)\n    wheels.append(wheel)\n\n# HEADLIGHTS - Create headlights\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, 0.5, 0.5)\n)\nheadlight_r = bpy.context.active_object\nheadlight_r.name = "Headlight_R"\nheadlight_r.rotation_euler[1] = math.radians(90)\n\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, -0.5, 0.5)\n)\nheadlight_l = bpy.context.active_object\nheadlight_l.name = "Headlight_L"\nheadlight_l.rotation_euler[1] = math.radians(90)\n\n# Create and add light emitting material to headlights\nlight_material = create_material("HeadlightMaterial", (1, 1, 0.8, 1))\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Strength\'].default_value = 3.0\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Color\'].default_value = (1, 1, 0.8, 1)\n\nheadlight_r.data.materials.append(light_material)\nheadlight_l.data.materials.append(light_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 2.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(5, -5, 3))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(70), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D car successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_car_scene.blend")\nprint("Scene saved as: 3d_car_scene.blend")\n'.format(r, g, b)
await send_bpy_script(SERVER_URI, blender_script)
__name__ == '__main__'
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())

uri
script_code
'\n    Connect to the WebSocket server and send a Blender Python script\n    \n    Args:\n        uri (str): The WebSocket server URI\n        script_code (str): The Blender Python script to execute\n        \n    Returns:\n        dict: The response from the server\n    '
async with websockets.connect(uri) as websocket:
    message = {'type': 'bpy_script', 'code': script_code}
    await websocket.send(json.dumps(message))
    print('Script sent to Blender WebSocket server')
    response = await websocket.recv()
    response_data = json.loads(response)
    if response_data['status'] == 'ok':
        print('Success: Script executed')
        if 'details' in response_data:
            print(f"Details: {response_data['details']}")
    else:
        print(f"Error: {response_data['details']}")
    return response_data
except Exception as e:
    print(f'Error connecting to WebSocket server: {str(e)}')
    return {'status': 'error', 'details': str(e)}
'\n    Main function that generates a Blender script\n    to create a simple 3D car and sends it to the server\n    '
r
random.random()
g
random.random()
b
random.random()
blender_script
'\nimport bpy\nimport math\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Function to create a material\ndef create_material(name, color):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Metallic\'].default_value = 0.8\n        principled.inputs[\'Specular IOR Level\'].default_value = 0.5\n        principled.inputs[\'Roughness\'].default_value = 0.2\n    return mat\n\n# Create the car materials\ncar_color = ({0}, {1}, {2}, 1.0)\ncar_body_material = create_material("CarBody", car_color)\nwheel_material = create_material("Wheel", (0.02, 0.02, 0.02, 1.0))\nglass_material = create_material("Glass", (0.8, 0.9, 1.0, 0.2))\nglass_material.blend_method = \'BLEND\'\nglass_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Alpha\'].default_value = 0.3\n\n# BODY - Car body (base)\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))\nbody = bpy.context.active_object\nbody.name = "CarBody"\nbody.scale = (2.5, 1.2, 0.5)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# TOP - Car roof\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.1))\ntop = bpy.context.active_object\ntop.name = "CarTop"\ntop.scale = (1.5, 1.0, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Join body and top\nbpy.ops.object.select_all(action=\'DESELECT\')\nbody.select_set(True)\ntop.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# FRONT - Car front\nbpy.ops.mesh.primitive_cube_add(size=1, location=(1.3, 0, 0.4))\nfront = bpy.context.active_object\nfront.name = "CarFront"\nfront.scale = (0.4, 1.2, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Add front to the body\nbody.select_set(True)\nfront.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# Assign material to body\nbody.data.materials.append(car_body_material)\n\n# WINDOW - Windshield\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0.8, 0, 1.15))\nfront_window = bpy.context.active_object\nfront_window.name = "FrontWindow"\nfront_window.scale = (0.1, 0.9, 0.3)\nfront_window.data.materials.append(glass_material)\n\n# WHEELS - Create 4 wheels\nwheel_positions = [\n    (0.8, 0.7, 0.3),  # Front right\n    (0.8, -0.7, 0.3),  # Front left\n    (-0.8, 0.7, 0.3),  # Rear right\n    (-0.8, -0.7, 0.3)  # Rear left\n]\n\nwheels = []\nfor i, pos in enumerate(wheel_positions):\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=16,\n        radius=0.3,\n        depth=0.2,\n        location=pos\n    )\n    wheel = bpy.context.active_object\n    wheel.name = f"Wheel_{i+1}"\n    wheel.rotation_euler[1] = math.radians(90)\n    wheel.data.materials.append(wheel_material)\n    wheels.append(wheel)\n\n# HEADLIGHTS - Create headlights\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, 0.5, 0.5)\n)\nheadlight_r = bpy.context.active_object\nheadlight_r.name = "Headlight_R"\nheadlight_r.rotation_euler[1] = math.radians(90)\n\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, -0.5, 0.5)\n)\nheadlight_l = bpy.context.active_object\nheadlight_l.name = "Headlight_L"\nheadlight_l.rotation_euler[1] = math.radians(90)\n\n# Create and add light emitting material to headlights\nlight_material = create_material("HeadlightMaterial", (1, 1, 0.8, 1))\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Strength\'].default_value = 3.0\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Color\'].default_value = (1, 1, 0.8, 1)\n\nheadlight_r.data.materials.append(light_material)\nheadlight_l.data.materials.append(light_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 2.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(5, -5, 3))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(70), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D car successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_car_scene.blend")\nprint("Scene saved as: 3d_car_scene.blend")\n'.format(r, g, b)
await send_bpy_script(SERVER_URI, blender_script)
__name__

'__main__'
sys.platform == 'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
websockets.connect(uri) as websocket
message = {'type': 'bpy_script', 'code': script_code}
await websocket.send(json.dumps(message))
print('Script sent to Blender WebSocket server')
response = await websocket.recv()
response_data = json.loads(response)
if response_data['status'] == 'ok':
    print('Success: Script executed')
    if 'details' in response_data:
        print(f"Details: {response_data['details']}")
else:
    print(f"Error: {response_data['details']}")
return response_data
Exception
print(f'Error connecting to WebSocket server: {str(e)}')
return {'status': 'error', 'details': str(e)}

random.random

random.random

random.random

'\nimport bpy\nimport math\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Function to create a material\ndef create_material(name, color):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Metallic\'].default_value = 0.8\n        principled.inputs[\'Specular IOR Level\'].default_value = 0.5\n        principled.inputs[\'Roughness\'].default_value = 0.2\n    return mat\n\n# Create the car materials\ncar_color = ({0}, {1}, {2}, 1.0)\ncar_body_material = create_material("CarBody", car_color)\nwheel_material = create_material("Wheel", (0.02, 0.02, 0.02, 1.0))\nglass_material = create_material("Glass", (0.8, 0.9, 1.0, 0.2))\nglass_material.blend_method = \'BLEND\'\nglass_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Alpha\'].default_value = 0.3\n\n# BODY - Car body (base)\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))\nbody = bpy.context.active_object\nbody.name = "CarBody"\nbody.scale = (2.5, 1.2, 0.5)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# TOP - Car roof\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.1))\ntop = bpy.context.active_object\ntop.name = "CarTop"\ntop.scale = (1.5, 1.0, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Join body and top\nbpy.ops.object.select_all(action=\'DESELECT\')\nbody.select_set(True)\ntop.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# FRONT - Car front\nbpy.ops.mesh.primitive_cube_add(size=1, location=(1.3, 0, 0.4))\nfront = bpy.context.active_object\nfront.name = "CarFront"\nfront.scale = (0.4, 1.2, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Add front to the body\nbody.select_set(True)\nfront.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# Assign material to body\nbody.data.materials.append(car_body_material)\n\n# WINDOW - Windshield\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0.8, 0, 1.15))\nfront_window = bpy.context.active_object\nfront_window.name = "FrontWindow"\nfront_window.scale = (0.1, 0.9, 0.3)\nfront_window.data.materials.append(glass_material)\n\n# WHEELS - Create 4 wheels\nwheel_positions = [\n    (0.8, 0.7, 0.3),  # Front right\n    (0.8, -0.7, 0.3),  # Front left\n    (-0.8, 0.7, 0.3),  # Rear right\n    (-0.8, -0.7, 0.3)  # Rear left\n]\n\nwheels = []\nfor i, pos in enumerate(wheel_positions):\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=16,\n        radius=0.3,\n        depth=0.2,\n        location=pos\n    )\n    wheel = bpy.context.active_object\n    wheel.name = f"Wheel_{i+1}"\n    wheel.rotation_euler[1] = math.radians(90)\n    wheel.data.materials.append(wheel_material)\n    wheels.append(wheel)\n\n# HEADLIGHTS - Create headlights\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, 0.5, 0.5)\n)\nheadlight_r = bpy.context.active_object\nheadlight_r.name = "Headlight_R"\nheadlight_r.rotation_euler[1] = math.radians(90)\n\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, -0.5, 0.5)\n)\nheadlight_l = bpy.context.active_object\nheadlight_l.name = "Headlight_L"\nheadlight_l.rotation_euler[1] = math.radians(90)\n\n# Create and add light emitting material to headlights\nlight_material = create_material("HeadlightMaterial", (1, 1, 0.8, 1))\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Strength\'].default_value = 3.0\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Color\'].default_value = (1, 1, 0.8, 1)\n\nheadlight_r.data.materials.append(light_material)\nheadlight_l.data.materials.append(light_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 2.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(5, -5, 3))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(70), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D car successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_car_scene.blend")\nprint("Scene saved as: 3d_car_scene.blend")\n'.format
r
g
b
send_bpy_script(SERVER_URI, blender_script)

sys.platform

'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run
main()
websockets.connect(uri)
websocket
message
{'type': 'bpy_script', 'code': script_code}
await websocket.send(json.dumps(message))
print('Script sent to Blender WebSocket server')
response
await websocket.recv()
response_data
json.loads(response)
response_data['status'] == 'ok'
print('Success: Script executed')
if 'details' in response_data:
    print(f"Details: {response_data['details']}")
print(f"Error: {response_data['details']}")
response_data

print(f'Error connecting to WebSocket server: {str(e)}')
{'status': 'error', 'details': str(e)}
random

random

random

'\nimport bpy\nimport math\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Function to create a material\ndef create_material(name, color):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Metallic\'].default_value = 0.8\n        principled.inputs[\'Specular IOR Level\'].default_value = 0.5\n        principled.inputs[\'Roughness\'].default_value = 0.2\n    return mat\n\n# Create the car materials\ncar_color = ({0}, {1}, {2}, 1.0)\ncar_body_material = create_material("CarBody", car_color)\nwheel_material = create_material("Wheel", (0.02, 0.02, 0.02, 1.0))\nglass_material = create_material("Glass", (0.8, 0.9, 1.0, 0.2))\nglass_material.blend_method = \'BLEND\'\nglass_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Alpha\'].default_value = 0.3\n\n# BODY - Car body (base)\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))\nbody = bpy.context.active_object\nbody.name = "CarBody"\nbody.scale = (2.5, 1.2, 0.5)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# TOP - Car roof\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.1))\ntop = bpy.context.active_object\ntop.name = "CarTop"\ntop.scale = (1.5, 1.0, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Join body and top\nbpy.ops.object.select_all(action=\'DESELECT\')\nbody.select_set(True)\ntop.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# FRONT - Car front\nbpy.ops.mesh.primitive_cube_add(size=1, location=(1.3, 0, 0.4))\nfront = bpy.context.active_object\nfront.name = "CarFront"\nfront.scale = (0.4, 1.2, 0.4)\nbpy.ops.object.transform_apply(location=False, rotation=False, scale=True)\n\n# JOIN - Add front to the body\nbody.select_set(True)\nfront.select_set(True)\nbpy.context.view_layer.objects.active = body\nbpy.ops.object.join()\n\n# Assign material to body\nbody.data.materials.append(car_body_material)\n\n# WINDOW - Windshield\nbpy.ops.mesh.primitive_cube_add(size=1, location=(0.8, 0, 1.15))\nfront_window = bpy.context.active_object\nfront_window.name = "FrontWindow"\nfront_window.scale = (0.1, 0.9, 0.3)\nfront_window.data.materials.append(glass_material)\n\n# WHEELS - Create 4 wheels\nwheel_positions = [\n    (0.8, 0.7, 0.3),  # Front right\n    (0.8, -0.7, 0.3),  # Front left\n    (-0.8, 0.7, 0.3),  # Rear right\n    (-0.8, -0.7, 0.3)  # Rear left\n]\n\nwheels = []\nfor i, pos in enumerate(wheel_positions):\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=16,\n        radius=0.3,\n        depth=0.2,\n        location=pos\n    )\n    wheel = bpy.context.active_object\n    wheel.name = f"Wheel_{i+1}"\n    wheel.rotation_euler[1] = math.radians(90)\n    wheel.data.materials.append(wheel_material)\n    wheels.append(wheel)\n\n# HEADLIGHTS - Create headlights\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, 0.5, 0.5)\n)\nheadlight_r = bpy.context.active_object\nheadlight_r.name = "Headlight_R"\nheadlight_r.rotation_euler[1] = math.radians(90)\n\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=16,\n    radius=0.1,\n    depth=0.05,\n    location=(1.5, -0.5, 0.5)\n)\nheadlight_l = bpy.context.active_object\nheadlight_l.name = "Headlight_L"\nheadlight_l.rotation_euler[1] = math.radians(90)\n\n# Create and add light emitting material to headlights\nlight_material = create_material("HeadlightMaterial", (1, 1, 0.8, 1))\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Strength\'].default_value = 3.0\nlight_material.node_tree.nodes.get(\n    \'Principled BSDF\').inputs[\'Emission Color\'].default_value = (1, 1, 0.8, 1)\n\nheadlight_r.data.materials.append(light_material)\nheadlight_l.data.materials.append(light_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 2.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(5, -5, 3))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(70), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D car successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_car_scene.blend")\nprint("Scene saved as: 3d_car_scene.blend")\n'




send_bpy_script
SERVER_URI
blender_script
sys

asyncio.set_event_loop_policy
asyncio.WindowsSelectorEventLoopPolicy()
asyncio

main
websockets.connect
uri


'type'
'code'
'bpy_script'
script_code
websocket.send(json.dumps(message))
print
'Script sent to Blender WebSocket server'

websocket.recv()

json.loads
response
response_data['status']

'ok'
print('Success: Script executed')
'details' in response_data
print(f"Details: {response_data['details']}")
print(f"Error: {response_data['details']}")

print
f'Error connecting to WebSocket server: {str(e)}'
'status'
'details'
'error'
str(e)







asyncio

asyncio.WindowsSelectorEventLoopPolicy


websockets



websocket.send
json.dumps(message)

websocket.recv
json


response_data
'status'

print
'Success: Script executed'
'details'

response_data
print(f"Details: {response_data['details']}")
print
f"Error: {response_data['details']}"

'Error connecting to WebSocket server: '
{str(e)}
str
e

asyncio


websocket

json.dumps
message
websocket





print
f"Details: {response_data['details']}"

'Error: '
{response_data['details']}
str(e)




json




'Details: '
{response_data['details']}
response_data['details']
str
e

response_data['details']
response_data
'details'



response_data
'details'


