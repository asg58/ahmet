#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Blender WebSocket Client: 3D Car Generator
This script connects to a Blender WebSocket server and creates a 3D car model.
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
    to create a simple 3D car and sends it to the server
    """
    # Generate a random color for the car
    r = random.random()
    g = random.random()
    b = random.random()
    
    # Blender script to create a car
    blender_script = """
import bpy
import math
from mathutils import Vector

# Clear existing objects
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Function to create a material
def create_material(name, color):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get('Principled BSDF')
    if principled:
        principled.inputs['Base Color'].default_value = color
        principled.inputs['Metallic'].default_value = 0.8
        principled.inputs['Specular IOR Level'].default_value = 0.5
        principled.inputs['Roughness'].default_value = 0.2
    return mat

# Create the car materials
car_color = ({0}, {1}, {2}, 1.0)
car_body_material = create_material("CarBody", car_color)
wheel_material = create_material("Wheel", (0.02, 0.02, 0.02, 1.0))
glass_material = create_material("Glass", (0.8, 0.9, 1.0, 0.2))
glass_material.blend_method = 'BLEND'
glass_material.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value = 0.3

# BODY - Car body (base)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))
body = bpy.context.active_object
body.name = "CarBody"
body.scale = (2.5, 1.2, 0.5)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# TOP - Car roof
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.1))
top = bpy.context.active_object
top.name = "CarTop"
top.scale = (1.5, 1.0, 0.4)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# JOIN - Join body and top
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
top.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

# FRONT - Car front
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.3, 0, 0.4))
front = bpy.context.active_object
front.name = "CarFront"
front.scale = (0.4, 1.2, 0.4)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# JOIN - Add front to the body
body.select_set(True)
front.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

# Assign material to body
body.data.materials.append(car_body_material)

# WINDOW - Windshield
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.8, 0, 1.15))
front_window = bpy.context.active_object
front_window.name = "FrontWindow"
front_window.scale = (0.1, 0.9, 0.3)
front_window.data.materials.append(glass_material)

# WHEELS - Create 4 wheels
wheel_positions = [
    (0.8, 0.7, 0.3),  # Front right
    (0.8, -0.7, 0.3),  # Front left
    (-0.8, 0.7, 0.3),  # Rear right
    (-0.8, -0.7, 0.3)  # Rear left
]

wheels = []
for i, pos in enumerate(wheel_positions):
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=16,
        radius=0.3,
        depth=0.2,
        location=pos
    )
    wheel = bpy.context.active_object
    wheel.name = f"Wheel_{i+1}"
    wheel.rotation_euler[1] = math.radians(90)
    wheel.data.materials.append(wheel_material)
    wheels.append(wheel)

# HEADLIGHTS - Create headlights
bpy.ops.mesh.primitive_cylinder_add(
    vertices=16,
    radius=0.1,
    depth=0.05,
    location=(1.5, 0.5, 0.5)
)
headlight_r = bpy.context.active_object
headlight_r.name = "Headlight_R"
headlight_r.rotation_euler[1] = math.radians(90)

bpy.ops.mesh.primitive_cylinder_add(
    vertices=16,
    radius=0.1,
    depth=0.05,
    location=(1.5, -0.5, 0.5)
)
headlight_l = bpy.context.active_object
headlight_l.name = "Headlight_L"
headlight_l.rotation_euler[1] = math.radians(90)

# Create and add light emitting material to headlights
light_material = create_material("HeadlightMaterial", (1, 1, 0.8, 1))
light_material.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = 3.0
light_material.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (1, 1, 0.8, 1)

headlight_r.data.materials.append(light_material)
headlight_l.data.materials.append(light_material)

# Add lighting
bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
sun = bpy.context.active_object
sun.name = "Sun"
sun.data.energy = 2.0

# Set up camera
bpy.ops.object.camera_add(location=(5, -5, 3))
cam = bpy.context.active_object
cam.name = "Camera"
cam.rotation_euler = (math.radians(70), 0, math.radians(45))
bpy.context.scene.camera = cam

# Set render settings
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 128
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080

print("3D car successfully created!")

# Save the scene
bpy.ops.wm.save_as_mainfile(filepath="3d_car_scene.blend")
print("Scene saved as: 3d_car_scene.blend")
""".format(r, g, b)

    # Send the script to Blender
    await send_bpy_script(SERVER_URI, blender_script)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main()) 