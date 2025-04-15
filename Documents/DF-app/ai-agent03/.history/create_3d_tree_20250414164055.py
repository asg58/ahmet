#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Blender WebSocket Client: 3D Tree Generator
This script connects to a Blender WebSocket server and creates a 3D tree model.
"""

import asyncio
import json
import sys
import random
import websockets

# WebSocket server address
SERVER_URI = "ws://localhost:8765"

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
            # Create message to send
            message = {
                "type": "bpy_script",
                "code": script_code
            }
            
            # Send the message
            await websocket.send(json.dumps(message))
            print("Script sent to Blender WebSocket server")
            
            # Wait for the response
            response = await websocket.recv()
            response_data = json.loads(response)
            
            # Print the response
            if response_data["status"] == "ok":
                print("Success: Script executed")
                if "details" in response_data:
                    print(f"Details: {response_data['details']}")
            else:
                print(f"Error: {response_data['details']}")
            
            return response_data
    except Exception as e:
        print(f"Error connecting to WebSocket server: {str(e)}")
        return {"status": "error", "details": str(e)}

async def main():
    """
    Main function that generates a Blender script
    to create a 3D tree and sends it to the server
    """
    # Generate random parameters for the tree
    seed = random.randint(0, 999)
    trunk_color = (random.uniform(0.3, 0.6), random.uniform(0.1, 0.3), random.uniform(0.05, 0.2), 1.0)
    leaves_color = (random.uniform(0.0, 0.3), random.uniform(0.4, 0.8), random.uniform(0.0, 0.4), 1.0)
    
    # Blender script to create a tree
    tree_script = """
import bpy
import math
import random
from mathutils import Vector

# Clear existing objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Set random seed for reproducibility
random.seed({0})

# Function to create a material
def create_material(name, color, roughness=0.7, specular=0.2):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get('Principled BSDF')
    if principled:
        principled.inputs['Base Color'].default_value = color
        principled.inputs['Roughness'].default_value = roughness
        principled.inputs['Specular IOR Level'].default_value = specular
    return mat

# Create trunk material
trunk_material = create_material("TrunkMaterial", {1}, 0.9, 0.1)

# Create leaves material
leaves_material = create_material("LeavesMaterial", {2}, 0.8, 0.3)

# TRUNK - Create the main trunk
def create_trunk(height=4.0, base_radius=0.2, taper=0.7):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=12,
        radius=base_radius,
        depth=height,
        end_fill_type='NGON',
        location=(0, 0, height/2)
    )
    trunk = bpy.context.active_object
    trunk.name = "TreeTrunk"
    
    # Apply some random variation to the trunk
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.transform.vertex_random(offset=0.05)
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Apply material
    trunk.data.materials.append(trunk_material)
    
    # Create basic UV mapping
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.unwrap()
    bpy.ops.object.mode_set(mode='OBJECT')
    
    return trunk

# BRANCHES - Create branches
def create_branches(trunk, num_branches=8):
    branches = []
    height = trunk.dimensions.z
    
    for i in range(num_branches):
        # Random position along trunk
        rel_z = random.uniform(0.3, 0.9)
        z_pos = rel_z * height
        
        # Random angle around trunk
        angle = random.uniform(0, 2 * math.pi)
        
        # Branch length and thickness based on height (higher = smaller)
        branch_length = random.uniform(0.8, 1.5) * (1.0 - rel_z * 0.5)
        branch_radius = trunk.dimensions.x * 0.3 * (1.0 - rel_z * 0.5)
        
        # Create branch cylinder
        bpy.ops.mesh.primitive_cylinder_add(
            vertices=8,
            radius=branch_radius,
            depth=branch_length,
            end_fill_type='NGON',
            location=(0, 0, z_pos)
        )
        
        branch = bpy.context.active_object
        branch.name = f"Branch_{{i+1}}"
        
        # Rotate to point outward
        branch.rotation_euler[0] = math.pi/2 + random.uniform(-0.5, 0.5)
        branch.rotation_euler[2] = angle
        
        # Move branch to correct position on trunk
        branch.location = Vector((
            math.cos(angle) * trunk.dimensions.x * 0.45,
            math.sin(angle) * trunk.dimensions.x * 0.45,
            z_pos
        ))
        
        # Add some random distortion
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.transform.vertex_random(offset=0.05)
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # Apply material
        branch.data.materials.append(trunk_material)
        
        branches.append(branch)
    
    return branches

# LEAVES - Create leaf clusters
def create_leaves(branches, num_leaves_per_branch=5):
    leaves = []
    
    for branch in branches:
        branch_tip = Vector((
            branch.location.x + math.cos(branch.rotation_euler[2]) * branch.dimensions.y * 0.4,
            branch.location.y + math.sin(branch.rotation_euler[2]) * branch.dimensions.y * 0.4,
            branch.location.z
        ))
        
        for i in range(num_leaves_per_branch):
            # Spread leaves around branch tip
            offset = Vector((
                random.uniform(-0.5, 0.5),
                random.uniform(-0.5, 0.5),
                random.uniform(0, 0.5)
            ))
            
            leaf_size = random.uniform(0.3, 0.6)
            
            # Create leaf as an icosphere
            bpy.ops.mesh.primitive_ico_sphere_add(
                subdivisions=1,
                radius=leaf_size,
                location=branch_tip + offset
            )
            
            leaf = bpy.context.active_object
            leaf.name = f"Leaf_{{len(leaves)}}"
            
            # Flatten leaf slightly
            leaf.scale = Vector((1.0, 1.0, 0.5))
            
            # Add some random rotation
            leaf.rotation_euler = Vector((
                random.uniform(0, math.pi * 2),
                random.uniform(0, math.pi * 2),
                random.uniform(0, math.pi * 2)
            ))
            
            # Apply material
            leaf.data.materials.append(leaves_material)
            
            leaves.append(leaf)
    
    return leaves

# Create the complete tree
trunk = create_trunk()
branches = create_branches(trunk)
leaves = create_leaves(branches)

# Join branches to trunk
bpy.ops.object.select_all(action='DESELECT')
trunk.select_set(True)
for branch in branches:
    branch.select_set(True)
bpy.context.view_layer.objects.active = trunk
bpy.ops.object.join()

# Add ground
bpy.ops.mesh.primitive_circle_add(
    vertices=32,
    radius=5.0,
    location=(0, 0, 0)
)
ground = bpy.context.active_object
ground.name = "Ground"

# Add ground material
ground_material = create_material("GroundMaterial", (0.3, 0.2, 0.1, 1.0), 0.9, 0.0)
ground.data.materials.append(ground_material)

# Add lighting
bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
sun = bpy.context.active_object
sun.name = "Sun"
sun.data.energy = 3.0

# Add some ambient lighting
bpy.ops.object.light_add(type='AREA', location=(0, 0, 5))
fill = bpy.context.active_object
fill.name = "FillLight"
fill.data.energy = 1.0
fill.data.size = 10.0

# Set up camera
bpy.ops.object.camera_add(location=(7, -7, 5))
cam = bpy.context.active_object
cam.name = "Camera"
cam.rotation_euler = (math.radians(60), 0, math.radians(45))
bpy.context.scene.camera = cam

# Set render settings
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 128
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080

print("3D tree successfully created!")

# Save the scene
bpy.ops.wm.save_as_mainfile(filepath="3d_tree_scene.blend")
print("Scene saved as: 3d_tree_scene.blend")
""".format(seed, trunk_color, leaves_color)

    # Send the script to Blender
    await send_bpy_script(SERVER_URI, tree_script)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main()) 