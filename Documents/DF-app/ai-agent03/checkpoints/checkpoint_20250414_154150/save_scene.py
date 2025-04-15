#!/usr/bin/env python
# Save scene with sphere to a .blend file
# Run with: python save_scene.py

import asyncio
import json
import sys
import websockets

# WebSocket server address
SERVER_URI = "ws://localhost:8765"

async def send_bpy_script(uri, script_code):
    """Send a script to the Blender WebSocket server and get the response."""
    try:
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("Connected. Sending bpy script...")
            
            message = {
                "type": "bpy_script",
                "code": script_code
            }
            
            await websocket.send(json.dumps(message))
            print(f"Message sent. Waiting for response...")
            
            response = await websocket.recv()
            parsed_response = json.loads(response)
            
            print("\nResponse from Blender:")
            print("-" * 50)
            print(f"Status: {parsed_response.get('status')}")
            print(f"Details: {parsed_response.get('details')}")
            
            if parsed_response.get('status') == 'error' and 'traceback' in parsed_response:
                print("\nError Traceback:")
                print(parsed_response.get('traceback'))
                
            print("-" * 50)
            
            return parsed_response
            
    except Exception as e:
        if "connect" in str(e).lower() or "connection" in str(e).lower() or "refused" in str(e).lower():
            print(f"Error: Could not connect to {uri}")
            print("Make sure Blender is running with the WebSocket server script.")
            print("Run: blender -b -P blender_agent/websocket_server.py")
        else:
            print(f"Error: {str(e)}")
        return None

async def main():
    # Create sphere and save scene
    save_script = """
import bpy
import random
import os

# Get current script directory
filepath = os.path.join(os.getcwd(), "sphere_scene.blend")

# Clear existing objects
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Create a UV sphere
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=2.0, 
    segments=32, 
    ring_count=16,
    location=(0, 0, 0)
)

# Name the sphere
sphere = bpy.context.active_object
sphere.name = 'WebSocketSphere'

# Add a material with bright color
material = bpy.data.materials.new(name="SphereMaterial")
material.diffuse_color = (1.0, 0.1, 0.8, 1.0)  # Pink color
sphere.data.materials.append(material)

# Add subdivision
modifier = sphere.modifiers.new(name="Subdivision", type='SUBSURF')
modifier.levels = 2
modifier.render_levels = 2

# Add animation
sphere.rotation_euler = (0, 0, 0)
sphere.keyframe_insert(data_path="rotation_euler", frame=1)

sphere.rotation_euler = (0, 0, 3.14159)
sphere.keyframe_insert(data_path="rotation_euler", frame=24)

# Add a camera and point it at the sphere
bpy.ops.object.camera_add(location=(0, -10, 0))
camera = bpy.context.active_object
camera.name = "Main Camera"

# Point camera at sphere
constraint = camera.constraints.new(type='TRACK_TO')
constraint.target = sphere
constraint.track_axis = 'TRACK_NEGATIVE_Z'
constraint.up_axis = 'UP_Y'

# Set as active camera
bpy.context.scene.camera = camera

# Add a light
bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
light = bpy.context.active_object
light.name = "Main Light"
light.data.energy = 2.0

# Save the file
bpy.ops.wm.save_as_mainfile(filepath=filepath)
print(f"Scene saved to: {filepath}")
"""

    # Send the script to Blender
    await send_bpy_script(SERVER_URI, save_script)

if __name__ == "__main__":
    try:
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nScript stopped by keyboard interrupt")
    except Exception as e:
        print(f"Error: {e}") 