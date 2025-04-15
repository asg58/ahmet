import asyncio
import json
import random
import sys
import websockets

'\nBlender WebSocket Client: 3D Tree Generator\nThis script connects to a Blender WebSocket server and creates a 3D tree model.\n'
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
    to create a 3D tree and sends it to the server
    """
    seed = random.randint(0, 999)
    trunk_color = (random.uniform(0.3, 0.6), random.uniform(0.1, 0.3), random.uniform(0.05, 0.2), 1.0)
    leaves_color = (random.uniform(0.0, 0.3), random.uniform(0.4, 0.8), random.uniform(0.0, 0.4), 1.0)
    tree_script = '\nimport bpy\nimport math\nimport random\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Set random seed for reproducibility\nrandom.seed({0})\n\n# Function to create a material\ndef create_material(name, color, roughness=0.7, specular=0.2):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Roughness\'].default_value = roughness\n        principled.inputs[\'Specular IOR Level\'].default_value = specular\n    return mat\n\n# Create materials first\ntrunk_material = create_material("TrunkMaterial", {1}, 0.9, 0.1)\nleaves_material = create_material("LeavesMaterial", {2}, 0.8, 0.3)\nground_material = create_material("GroundMaterial", (0.3, 0.2, 0.1, 1.0), 0.9, 0.0)\n\n# TRUNK - Create the main trunk\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=12,\n    radius=0.2,\n    depth=4.0,\n    end_fill_type=\'NGON\',\n    location=(0, 0, 2.0)\n)\ntrunk = bpy.context.active_object\ntrunk.name = "TreeTrunk"\n\n# Apply some random variation to the trunk\nbpy.ops.object.mode_set(mode=\'EDIT\')\nbpy.ops.mesh.select_all(action=\'SELECT\')\nbpy.ops.transform.vertex_random(offset=0.05)\nbpy.ops.object.mode_set(mode=\'OBJECT\')\n\n# Apply material\ntrunk.data.materials.append(trunk_material)\n\n# Create branches\nbranches = []\ntrunk_height = trunk.dimensions.z\nnum_branches = 8\n\nfor i in range(num_branches):\n    # Random position along trunk\n    rel_z = random.uniform(0.3, 0.9)\n    z_pos = rel_z * trunk_height\n    \n    # Random angle around trunk\n    angle = random.uniform(0, 2 * math.pi)\n    \n    # Branch length and thickness based on height (higher = smaller)\n    branch_length = random.uniform(0.8, 1.5) * (1.0 - rel_z * 0.5)\n    branch_radius = trunk.dimensions.x * 0.3 * (1.0 - rel_z * 0.5)\n    \n    # Create branch cylinder\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=8,\n        radius=branch_radius,\n        depth=branch_length,\n        end_fill_type=\'NGON\',\n        location=(0, 0, z_pos)\n    )\n    \n    branch = bpy.context.active_object\n    branch.name = "Branch_{{0}}".format(i+1)\n    \n    # Rotate to point outward\n    branch.rotation_euler[0] = math.pi/2 + random.uniform(-0.5, 0.5)\n    branch.rotation_euler[2] = angle\n    \n    # Move branch to correct position on trunk\n    branch.location = Vector((\n        math.cos(angle) * trunk.dimensions.x * 0.45,\n        math.sin(angle) * trunk.dimensions.x * 0.45,\n        z_pos\n    ))\n    \n    # Add some random distortion\n    bpy.ops.object.mode_set(mode=\'EDIT\')\n    bpy.ops.mesh.select_all(action=\'SELECT\')\n    bpy.ops.transform.vertex_random(offset=0.05)\n    bpy.ops.object.mode_set(mode=\'OBJECT\')\n    \n    # Apply material\n    branch.data.materials.append(trunk_material)\n    \n    branches.append(branch)\n\n# Create leaves\nleaves = []\nnum_leaves_per_branch = 5\n\nfor branch_idx, branch in enumerate(branches):\n    branch_tip = Vector((\n        branch.location.x + math.cos(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.y + math.sin(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.z\n    ))\n    \n    for i in range(num_leaves_per_branch):\n        # Spread leaves around branch tip\n        offset = Vector((\n            random.uniform(-0.5, 0.5),\n            random.uniform(-0.5, 0.5),\n            random.uniform(0, 0.5)\n        ))\n        \n        leaf_size = random.uniform(0.3, 0.6)\n        \n        # Create leaf as an icosphere\n        bpy.ops.mesh.primitive_ico_sphere_add(\n            subdivisions=1,\n            radius=leaf_size,\n            location=branch_tip + offset\n        )\n        \n        leaf = bpy.context.active_object\n        leaf.name = "Leaf_{{0}}".format(branch_idx * num_leaves_per_branch + i)\n        \n        # Flatten leaf slightly\n        leaf.scale = Vector((1.0, 1.0, 0.5))\n        \n        # Add some random rotation\n        leaf.rotation_euler = Vector((\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2)\n        ))\n        \n        # Apply material\n        leaf.data.materials.append(leaves_material)\n        \n        leaves.append(leaf)\n\n# Join branches to trunk\nbpy.ops.object.select_all(action=\'DESELECT\')\ntrunk.select_set(True)\nfor branch in branches:\n    branch.select_set(True)\nbpy.context.view_layer.objects.active = trunk\nbpy.ops.object.join()\n\n# Add ground\nbpy.ops.mesh.primitive_circle_add(\n    vertices=32,\n    radius=5.0,\n    location=(0, 0, 0)\n)\nground = bpy.context.active_object\nground.name = "Ground"\nground.data.materials.append(ground_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 3.0\n\n# Add some ambient lighting\nbpy.ops.object.light_add(type=\'AREA\', location=(0, 0, 5))\nfill = bpy.context.active_object\nfill.name = "FillLight"\nfill.data.energy = 1.0\nfill.data.size = 10.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(7, -7, 5))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(60), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D tree successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_tree_scene.blend")\nprint("Scene saved as: 3d_tree_scene.blend")\n'.format(seed, trunk_color, leaves_color)
    await send_bpy_script(SERVER_URI, tree_script)
if __name__ == '__main__':
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
'\nBlender WebSocket Client: 3D Tree Generator\nThis script connects to a Blender WebSocket server and creates a 3D tree model.\n'
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

'\n    Main function that generates a Blender script\n    to create a 3D tree and sends it to the server\n    '
seed = random.randint(0, 999)
trunk_color = (random.uniform(0.3, 0.6), random.uniform(0.1, 0.3), random.uniform(0.05, 0.2), 1.0)
leaves_color = (random.uniform(0.0, 0.3), random.uniform(0.4, 0.8), random.uniform(0.0, 0.4), 1.0)
tree_script = '\nimport bpy\nimport math\nimport random\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Set random seed for reproducibility\nrandom.seed({0})\n\n# Function to create a material\ndef create_material(name, color, roughness=0.7, specular=0.2):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Roughness\'].default_value = roughness\n        principled.inputs[\'Specular IOR Level\'].default_value = specular\n    return mat\n\n# Create materials first\ntrunk_material = create_material("TrunkMaterial", {1}, 0.9, 0.1)\nleaves_material = create_material("LeavesMaterial", {2}, 0.8, 0.3)\nground_material = create_material("GroundMaterial", (0.3, 0.2, 0.1, 1.0), 0.9, 0.0)\n\n# TRUNK - Create the main trunk\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=12,\n    radius=0.2,\n    depth=4.0,\n    end_fill_type=\'NGON\',\n    location=(0, 0, 2.0)\n)\ntrunk = bpy.context.active_object\ntrunk.name = "TreeTrunk"\n\n# Apply some random variation to the trunk\nbpy.ops.object.mode_set(mode=\'EDIT\')\nbpy.ops.mesh.select_all(action=\'SELECT\')\nbpy.ops.transform.vertex_random(offset=0.05)\nbpy.ops.object.mode_set(mode=\'OBJECT\')\n\n# Apply material\ntrunk.data.materials.append(trunk_material)\n\n# Create branches\nbranches = []\ntrunk_height = trunk.dimensions.z\nnum_branches = 8\n\nfor i in range(num_branches):\n    # Random position along trunk\n    rel_z = random.uniform(0.3, 0.9)\n    z_pos = rel_z * trunk_height\n    \n    # Random angle around trunk\n    angle = random.uniform(0, 2 * math.pi)\n    \n    # Branch length and thickness based on height (higher = smaller)\n    branch_length = random.uniform(0.8, 1.5) * (1.0 - rel_z * 0.5)\n    branch_radius = trunk.dimensions.x * 0.3 * (1.0 - rel_z * 0.5)\n    \n    # Create branch cylinder\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=8,\n        radius=branch_radius,\n        depth=branch_length,\n        end_fill_type=\'NGON\',\n        location=(0, 0, z_pos)\n    )\n    \n    branch = bpy.context.active_object\n    branch.name = "Branch_{{0}}".format(i+1)\n    \n    # Rotate to point outward\n    branch.rotation_euler[0] = math.pi/2 + random.uniform(-0.5, 0.5)\n    branch.rotation_euler[2] = angle\n    \n    # Move branch to correct position on trunk\n    branch.location = Vector((\n        math.cos(angle) * trunk.dimensions.x * 0.45,\n        math.sin(angle) * trunk.dimensions.x * 0.45,\n        z_pos\n    ))\n    \n    # Add some random distortion\n    bpy.ops.object.mode_set(mode=\'EDIT\')\n    bpy.ops.mesh.select_all(action=\'SELECT\')\n    bpy.ops.transform.vertex_random(offset=0.05)\n    bpy.ops.object.mode_set(mode=\'OBJECT\')\n    \n    # Apply material\n    branch.data.materials.append(trunk_material)\n    \n    branches.append(branch)\n\n# Create leaves\nleaves = []\nnum_leaves_per_branch = 5\n\nfor branch_idx, branch in enumerate(branches):\n    branch_tip = Vector((\n        branch.location.x + math.cos(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.y + math.sin(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.z\n    ))\n    \n    for i in range(num_leaves_per_branch):\n        # Spread leaves around branch tip\n        offset = Vector((\n            random.uniform(-0.5, 0.5),\n            random.uniform(-0.5, 0.5),\n            random.uniform(0, 0.5)\n        ))\n        \n        leaf_size = random.uniform(0.3, 0.6)\n        \n        # Create leaf as an icosphere\n        bpy.ops.mesh.primitive_ico_sphere_add(\n            subdivisions=1,\n            radius=leaf_size,\n            location=branch_tip + offset\n        )\n        \n        leaf = bpy.context.active_object\n        leaf.name = "Leaf_{{0}}".format(branch_idx * num_leaves_per_branch + i)\n        \n        # Flatten leaf slightly\n        leaf.scale = Vector((1.0, 1.0, 0.5))\n        \n        # Add some random rotation\n        leaf.rotation_euler = Vector((\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2)\n        ))\n        \n        # Apply material\n        leaf.data.materials.append(leaves_material)\n        \n        leaves.append(leaf)\n\n# Join branches to trunk\nbpy.ops.object.select_all(action=\'DESELECT\')\ntrunk.select_set(True)\nfor branch in branches:\n    branch.select_set(True)\nbpy.context.view_layer.objects.active = trunk\nbpy.ops.object.join()\n\n# Add ground\nbpy.ops.mesh.primitive_circle_add(\n    vertices=32,\n    radius=5.0,\n    location=(0, 0, 0)\n)\nground = bpy.context.active_object\nground.name = "Ground"\nground.data.materials.append(ground_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 3.0\n\n# Add some ambient lighting\nbpy.ops.object.light_add(type=\'AREA\', location=(0, 0, 5))\nfill = bpy.context.active_object\nfill.name = "FillLight"\nfill.data.energy = 1.0\nfill.data.size = 10.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(7, -7, 5))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(60), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D tree successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_tree_scene.blend")\nprint("Scene saved as: 3d_tree_scene.blend")\n'.format(seed, trunk_color, leaves_color)
await send_bpy_script(SERVER_URI, tree_script)
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
'\n    Main function that generates a Blender script\n    to create a 3D tree and sends it to the server\n    '
seed
random.randint(0, 999)
trunk_color
(random.uniform(0.3, 0.6), random.uniform(0.1, 0.3), random.uniform(0.05, 0.2), 1.0)
leaves_color
(random.uniform(0.0, 0.3), random.uniform(0.4, 0.8), random.uniform(0.0, 0.4), 1.0)
tree_script
'\nimport bpy\nimport math\nimport random\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Set random seed for reproducibility\nrandom.seed({0})\n\n# Function to create a material\ndef create_material(name, color, roughness=0.7, specular=0.2):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Roughness\'].default_value = roughness\n        principled.inputs[\'Specular IOR Level\'].default_value = specular\n    return mat\n\n# Create materials first\ntrunk_material = create_material("TrunkMaterial", {1}, 0.9, 0.1)\nleaves_material = create_material("LeavesMaterial", {2}, 0.8, 0.3)\nground_material = create_material("GroundMaterial", (0.3, 0.2, 0.1, 1.0), 0.9, 0.0)\n\n# TRUNK - Create the main trunk\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=12,\n    radius=0.2,\n    depth=4.0,\n    end_fill_type=\'NGON\',\n    location=(0, 0, 2.0)\n)\ntrunk = bpy.context.active_object\ntrunk.name = "TreeTrunk"\n\n# Apply some random variation to the trunk\nbpy.ops.object.mode_set(mode=\'EDIT\')\nbpy.ops.mesh.select_all(action=\'SELECT\')\nbpy.ops.transform.vertex_random(offset=0.05)\nbpy.ops.object.mode_set(mode=\'OBJECT\')\n\n# Apply material\ntrunk.data.materials.append(trunk_material)\n\n# Create branches\nbranches = []\ntrunk_height = trunk.dimensions.z\nnum_branches = 8\n\nfor i in range(num_branches):\n    # Random position along trunk\n    rel_z = random.uniform(0.3, 0.9)\n    z_pos = rel_z * trunk_height\n    \n    # Random angle around trunk\n    angle = random.uniform(0, 2 * math.pi)\n    \n    # Branch length and thickness based on height (higher = smaller)\n    branch_length = random.uniform(0.8, 1.5) * (1.0 - rel_z * 0.5)\n    branch_radius = trunk.dimensions.x * 0.3 * (1.0 - rel_z * 0.5)\n    \n    # Create branch cylinder\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=8,\n        radius=branch_radius,\n        depth=branch_length,\n        end_fill_type=\'NGON\',\n        location=(0, 0, z_pos)\n    )\n    \n    branch = bpy.context.active_object\n    branch.name = "Branch_{{0}}".format(i+1)\n    \n    # Rotate to point outward\n    branch.rotation_euler[0] = math.pi/2 + random.uniform(-0.5, 0.5)\n    branch.rotation_euler[2] = angle\n    \n    # Move branch to correct position on trunk\n    branch.location = Vector((\n        math.cos(angle) * trunk.dimensions.x * 0.45,\n        math.sin(angle) * trunk.dimensions.x * 0.45,\n        z_pos\n    ))\n    \n    # Add some random distortion\n    bpy.ops.object.mode_set(mode=\'EDIT\')\n    bpy.ops.mesh.select_all(action=\'SELECT\')\n    bpy.ops.transform.vertex_random(offset=0.05)\n    bpy.ops.object.mode_set(mode=\'OBJECT\')\n    \n    # Apply material\n    branch.data.materials.append(trunk_material)\n    \n    branches.append(branch)\n\n# Create leaves\nleaves = []\nnum_leaves_per_branch = 5\n\nfor branch_idx, branch in enumerate(branches):\n    branch_tip = Vector((\n        branch.location.x + math.cos(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.y + math.sin(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.z\n    ))\n    \n    for i in range(num_leaves_per_branch):\n        # Spread leaves around branch tip\n        offset = Vector((\n            random.uniform(-0.5, 0.5),\n            random.uniform(-0.5, 0.5),\n            random.uniform(0, 0.5)\n        ))\n        \n        leaf_size = random.uniform(0.3, 0.6)\n        \n        # Create leaf as an icosphere\n        bpy.ops.mesh.primitive_ico_sphere_add(\n            subdivisions=1,\n            radius=leaf_size,\n            location=branch_tip + offset\n        )\n        \n        leaf = bpy.context.active_object\n        leaf.name = "Leaf_{{0}}".format(branch_idx * num_leaves_per_branch + i)\n        \n        # Flatten leaf slightly\n        leaf.scale = Vector((1.0, 1.0, 0.5))\n        \n        # Add some random rotation\n        leaf.rotation_euler = Vector((\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2)\n        ))\n        \n        # Apply material\n        leaf.data.materials.append(leaves_material)\n        \n        leaves.append(leaf)\n\n# Join branches to trunk\nbpy.ops.object.select_all(action=\'DESELECT\')\ntrunk.select_set(True)\nfor branch in branches:\n    branch.select_set(True)\nbpy.context.view_layer.objects.active = trunk\nbpy.ops.object.join()\n\n# Add ground\nbpy.ops.mesh.primitive_circle_add(\n    vertices=32,\n    radius=5.0,\n    location=(0, 0, 0)\n)\nground = bpy.context.active_object\nground.name = "Ground"\nground.data.materials.append(ground_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 3.0\n\n# Add some ambient lighting\nbpy.ops.object.light_add(type=\'AREA\', location=(0, 0, 5))\nfill = bpy.context.active_object\nfill.name = "FillLight"\nfill.data.energy = 1.0\nfill.data.size = 10.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(7, -7, 5))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(60), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D tree successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_tree_scene.blend")\nprint("Scene saved as: 3d_tree_scene.blend")\n'.format(seed, trunk_color, leaves_color)
await send_bpy_script(SERVER_URI, tree_script)
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

random.randint
0
999

random.uniform(0.3, 0.6)
random.uniform(0.1, 0.3)
random.uniform(0.05, 0.2)
1.0


random.uniform(0.0, 0.3)
random.uniform(0.4, 0.8)
random.uniform(0.0, 0.4)
1.0


'\nimport bpy\nimport math\nimport random\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Set random seed for reproducibility\nrandom.seed({0})\n\n# Function to create a material\ndef create_material(name, color, roughness=0.7, specular=0.2):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Roughness\'].default_value = roughness\n        principled.inputs[\'Specular IOR Level\'].default_value = specular\n    return mat\n\n# Create materials first\ntrunk_material = create_material("TrunkMaterial", {1}, 0.9, 0.1)\nleaves_material = create_material("LeavesMaterial", {2}, 0.8, 0.3)\nground_material = create_material("GroundMaterial", (0.3, 0.2, 0.1, 1.0), 0.9, 0.0)\n\n# TRUNK - Create the main trunk\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=12,\n    radius=0.2,\n    depth=4.0,\n    end_fill_type=\'NGON\',\n    location=(0, 0, 2.0)\n)\ntrunk = bpy.context.active_object\ntrunk.name = "TreeTrunk"\n\n# Apply some random variation to the trunk\nbpy.ops.object.mode_set(mode=\'EDIT\')\nbpy.ops.mesh.select_all(action=\'SELECT\')\nbpy.ops.transform.vertex_random(offset=0.05)\nbpy.ops.object.mode_set(mode=\'OBJECT\')\n\n# Apply material\ntrunk.data.materials.append(trunk_material)\n\n# Create branches\nbranches = []\ntrunk_height = trunk.dimensions.z\nnum_branches = 8\n\nfor i in range(num_branches):\n    # Random position along trunk\n    rel_z = random.uniform(0.3, 0.9)\n    z_pos = rel_z * trunk_height\n    \n    # Random angle around trunk\n    angle = random.uniform(0, 2 * math.pi)\n    \n    # Branch length and thickness based on height (higher = smaller)\n    branch_length = random.uniform(0.8, 1.5) * (1.0 - rel_z * 0.5)\n    branch_radius = trunk.dimensions.x * 0.3 * (1.0 - rel_z * 0.5)\n    \n    # Create branch cylinder\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=8,\n        radius=branch_radius,\n        depth=branch_length,\n        end_fill_type=\'NGON\',\n        location=(0, 0, z_pos)\n    )\n    \n    branch = bpy.context.active_object\n    branch.name = "Branch_{{0}}".format(i+1)\n    \n    # Rotate to point outward\n    branch.rotation_euler[0] = math.pi/2 + random.uniform(-0.5, 0.5)\n    branch.rotation_euler[2] = angle\n    \n    # Move branch to correct position on trunk\n    branch.location = Vector((\n        math.cos(angle) * trunk.dimensions.x * 0.45,\n        math.sin(angle) * trunk.dimensions.x * 0.45,\n        z_pos\n    ))\n    \n    # Add some random distortion\n    bpy.ops.object.mode_set(mode=\'EDIT\')\n    bpy.ops.mesh.select_all(action=\'SELECT\')\n    bpy.ops.transform.vertex_random(offset=0.05)\n    bpy.ops.object.mode_set(mode=\'OBJECT\')\n    \n    # Apply material\n    branch.data.materials.append(trunk_material)\n    \n    branches.append(branch)\n\n# Create leaves\nleaves = []\nnum_leaves_per_branch = 5\n\nfor branch_idx, branch in enumerate(branches):\n    branch_tip = Vector((\n        branch.location.x + math.cos(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.y + math.sin(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.z\n    ))\n    \n    for i in range(num_leaves_per_branch):\n        # Spread leaves around branch tip\n        offset = Vector((\n            random.uniform(-0.5, 0.5),\n            random.uniform(-0.5, 0.5),\n            random.uniform(0, 0.5)\n        ))\n        \n        leaf_size = random.uniform(0.3, 0.6)\n        \n        # Create leaf as an icosphere\n        bpy.ops.mesh.primitive_ico_sphere_add(\n            subdivisions=1,\n            radius=leaf_size,\n            location=branch_tip + offset\n        )\n        \n        leaf = bpy.context.active_object\n        leaf.name = "Leaf_{{0}}".format(branch_idx * num_leaves_per_branch + i)\n        \n        # Flatten leaf slightly\n        leaf.scale = Vector((1.0, 1.0, 0.5))\n        \n        # Add some random rotation\n        leaf.rotation_euler = Vector((\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2)\n        ))\n        \n        # Apply material\n        leaf.data.materials.append(leaves_material)\n        \n        leaves.append(leaf)\n\n# Join branches to trunk\nbpy.ops.object.select_all(action=\'DESELECT\')\ntrunk.select_set(True)\nfor branch in branches:\n    branch.select_set(True)\nbpy.context.view_layer.objects.active = trunk\nbpy.ops.object.join()\n\n# Add ground\nbpy.ops.mesh.primitive_circle_add(\n    vertices=32,\n    radius=5.0,\n    location=(0, 0, 0)\n)\nground = bpy.context.active_object\nground.name = "Ground"\nground.data.materials.append(ground_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 3.0\n\n# Add some ambient lighting\nbpy.ops.object.light_add(type=\'AREA\', location=(0, 0, 5))\nfill = bpy.context.active_object\nfill.name = "FillLight"\nfill.data.energy = 1.0\nfill.data.size = 10.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(7, -7, 5))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(60), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D tree successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_tree_scene.blend")\nprint("Scene saved as: 3d_tree_scene.blend")\n'.format
seed
trunk_color
leaves_color
send_bpy_script(SERVER_URI, tree_script)

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

random.uniform
0.3
0.6
random.uniform
0.1
0.3
random.uniform
0.05
0.2
random.uniform
0.0
0.3
random.uniform
0.4
0.8
random.uniform
0.0
0.4
'\nimport bpy\nimport math\nimport random\nfrom mathutils import Vector\n\n# Clear existing objects\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# Set random seed for reproducibility\nrandom.seed({0})\n\n# Function to create a material\ndef create_material(name, color, roughness=0.7, specular=0.2):\n    mat = bpy.data.materials.new(name=name)\n    mat.use_nodes = True\n    principled = mat.node_tree.nodes.get(\'Principled BSDF\')\n    if principled:\n        principled.inputs[\'Base Color\'].default_value = color\n        principled.inputs[\'Roughness\'].default_value = roughness\n        principled.inputs[\'Specular IOR Level\'].default_value = specular\n    return mat\n\n# Create materials first\ntrunk_material = create_material("TrunkMaterial", {1}, 0.9, 0.1)\nleaves_material = create_material("LeavesMaterial", {2}, 0.8, 0.3)\nground_material = create_material("GroundMaterial", (0.3, 0.2, 0.1, 1.0), 0.9, 0.0)\n\n# TRUNK - Create the main trunk\nbpy.ops.mesh.primitive_cylinder_add(\n    vertices=12,\n    radius=0.2,\n    depth=4.0,\n    end_fill_type=\'NGON\',\n    location=(0, 0, 2.0)\n)\ntrunk = bpy.context.active_object\ntrunk.name = "TreeTrunk"\n\n# Apply some random variation to the trunk\nbpy.ops.object.mode_set(mode=\'EDIT\')\nbpy.ops.mesh.select_all(action=\'SELECT\')\nbpy.ops.transform.vertex_random(offset=0.05)\nbpy.ops.object.mode_set(mode=\'OBJECT\')\n\n# Apply material\ntrunk.data.materials.append(trunk_material)\n\n# Create branches\nbranches = []\ntrunk_height = trunk.dimensions.z\nnum_branches = 8\n\nfor i in range(num_branches):\n    # Random position along trunk\n    rel_z = random.uniform(0.3, 0.9)\n    z_pos = rel_z * trunk_height\n    \n    # Random angle around trunk\n    angle = random.uniform(0, 2 * math.pi)\n    \n    # Branch length and thickness based on height (higher = smaller)\n    branch_length = random.uniform(0.8, 1.5) * (1.0 - rel_z * 0.5)\n    branch_radius = trunk.dimensions.x * 0.3 * (1.0 - rel_z * 0.5)\n    \n    # Create branch cylinder\n    bpy.ops.mesh.primitive_cylinder_add(\n        vertices=8,\n        radius=branch_radius,\n        depth=branch_length,\n        end_fill_type=\'NGON\',\n        location=(0, 0, z_pos)\n    )\n    \n    branch = bpy.context.active_object\n    branch.name = "Branch_{{0}}".format(i+1)\n    \n    # Rotate to point outward\n    branch.rotation_euler[0] = math.pi/2 + random.uniform(-0.5, 0.5)\n    branch.rotation_euler[2] = angle\n    \n    # Move branch to correct position on trunk\n    branch.location = Vector((\n        math.cos(angle) * trunk.dimensions.x * 0.45,\n        math.sin(angle) * trunk.dimensions.x * 0.45,\n        z_pos\n    ))\n    \n    # Add some random distortion\n    bpy.ops.object.mode_set(mode=\'EDIT\')\n    bpy.ops.mesh.select_all(action=\'SELECT\')\n    bpy.ops.transform.vertex_random(offset=0.05)\n    bpy.ops.object.mode_set(mode=\'OBJECT\')\n    \n    # Apply material\n    branch.data.materials.append(trunk_material)\n    \n    branches.append(branch)\n\n# Create leaves\nleaves = []\nnum_leaves_per_branch = 5\n\nfor branch_idx, branch in enumerate(branches):\n    branch_tip = Vector((\n        branch.location.x + math.cos(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.y + math.sin(\n    branch.rotation_euler[2]) * branch.dimensions.y * 0.4,\n        branch.location.z\n    ))\n    \n    for i in range(num_leaves_per_branch):\n        # Spread leaves around branch tip\n        offset = Vector((\n            random.uniform(-0.5, 0.5),\n            random.uniform(-0.5, 0.5),\n            random.uniform(0, 0.5)\n        ))\n        \n        leaf_size = random.uniform(0.3, 0.6)\n        \n        # Create leaf as an icosphere\n        bpy.ops.mesh.primitive_ico_sphere_add(\n            subdivisions=1,\n            radius=leaf_size,\n            location=branch_tip + offset\n        )\n        \n        leaf = bpy.context.active_object\n        leaf.name = "Leaf_{{0}}".format(branch_idx * num_leaves_per_branch + i)\n        \n        # Flatten leaf slightly\n        leaf.scale = Vector((1.0, 1.0, 0.5))\n        \n        # Add some random rotation\n        leaf.rotation_euler = Vector((\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2),\n            random.uniform(0, math.pi * 2)\n        ))\n        \n        # Apply material\n        leaf.data.materials.append(leaves_material)\n        \n        leaves.append(leaf)\n\n# Join branches to trunk\nbpy.ops.object.select_all(action=\'DESELECT\')\ntrunk.select_set(True)\nfor branch in branches:\n    branch.select_set(True)\nbpy.context.view_layer.objects.active = trunk\nbpy.ops.object.join()\n\n# Add ground\nbpy.ops.mesh.primitive_circle_add(\n    vertices=32,\n    radius=5.0,\n    location=(0, 0, 0)\n)\nground = bpy.context.active_object\nground.name = "Ground"\nground.data.materials.append(ground_material)\n\n# Add lighting\nbpy.ops.object.light_add(type=\'SUN\', location=(5, 5, 10))\nsun = bpy.context.active_object\nsun.name = "Sun"\nsun.data.energy = 3.0\n\n# Add some ambient lighting\nbpy.ops.object.light_add(type=\'AREA\', location=(0, 0, 5))\nfill = bpy.context.active_object\nfill.name = "FillLight"\nfill.data.energy = 1.0\nfill.data.size = 10.0\n\n# Set up camera\nbpy.ops.object.camera_add(location=(7, -7, 5))\ncam = bpy.context.active_object\ncam.name = "Camera"\ncam.rotation_euler = (math.radians(60), 0, math.radians(45))\nbpy.context.scene.camera = cam\n\n# Set render settings\nbpy.context.scene.render.engine = \'CYCLES\'\nbpy.context.scene.cycles.samples = 128\nbpy.context.scene.render.resolution_x = 1920\nbpy.context.scene.render.resolution_y = 1080\n\nprint("3D tree successfully created!")\n\n# Save the scene\nbpy.ops.wm.save_as_mainfile(filepath="3d_tree_scene.blend")\nprint("Scene saved as: 3d_tree_scene.blend")\n'




send_bpy_script
SERVER_URI
tree_script
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

random

random

random

random

random

random





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


