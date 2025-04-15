#!/usr/bin/env python
# Create simple 3D overlapping rings
# Run with: python create_simple_3d_rings.py

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
    # Create 3D rings in Blender with nice lighting
    rings_script = """
import bpy
import os
import math
from math import radians

# Path voor het opslaan
filepath = os.path.join(os.getcwd(), "3d_rings_simple.blend")

# Start met een nieuwe scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Verwijder de default kubus als die er is
if 'Cube' in bpy.data.objects:
    bpy.data.objects['Cube'].select_set(True)
    bpy.ops.object.delete()

# Configuratie voor de ringen
num_rings = 4
ring_radius = 1.0
ring_thickness = 0.2
ring_overlap = 0.3  # Hoeveel de ringen overlappen
ring_colors = [
    (0.8, 0.1, 0.1, 1.0),  # Rood
    (0.1, 0.8, 0.1, 1.0),  # Groen
    (0.1, 0.1, 0.8, 1.0),  # Blauw
    (0.8, 0.6, 0.1, 1.0),  # Goud/oranje
]

# Maak de ringen
for i in range(num_rings):
    # Bereken de positie
    position = ((i * (ring_radius * 2 - ring_overlap)), 0, 0)
    
    # Maak een torus (ring)
    bpy.ops.mesh.primitive_torus_add(
        align='WORLD',
        location=position,
        major_radius=ring_radius,
        minor_radius=ring_thickness,
        major_segments=36,
        minor_segments=12
    )
    
    # Geef de ring een naam
    ring = bpy.context.active_object
    ring.name = f"Ring_{i+1}"
    
    # Maak een materiaal
    material = bpy.data.materials.new(name=f"Material_Ring_{i+1}")
    material.diffuse_color = ring_colors[i]
    
    # Maak het materiaal metallisch
    material.metallic = 0.8
    material.roughness = 0.2
    
    # Pas het materiaal toe op de ring
    ring.data.materials.append(material)

# Centreer de ringen
total_width = (num_rings - 1) * (ring_radius * 2 - ring_overlap)
center_offset = total_width / 2

for obj in bpy.data.objects:
    if obj.name.startswith("Ring_"):
        obj.location.x -= center_offset

# Voeg camera toe
bpy.ops.object.camera_add(location=(0, -5, 2), rotation=(radians(75), 0, 0))
camera = bpy.context.active_object
camera.name = "Camera"
bpy.context.scene.camera = camera

# Camera instellingen voor mooie weergave
camera.data.lens = 50  # 50mm lens

# Lighting setup - Drie-punt belichting voor mooie presentatie
# Key light (hoofdlicht)
bpy.ops.object.light_add(type='AREA', location=(3, -3, 4))
key_light = bpy.context.active_object
key_light.name = "Key_Light"
key_light.data.energy = 500
key_light.data.size = 2.0

# Fill light (invullicht)
bpy.ops.object.light_add(type='AREA', location=(-3, -2, 2))
fill_light = bpy.context.active_object
fill_light.name = "Fill_Light"
fill_light.data.energy = 300
fill_light.data.size = 3.0

# Front light voor extra voorbelichting
bpy.ops.object.light_add(type='AREA', location=(0, -4, 1))
front_light = bpy.context.active_object
front_light.name = "Front_Light"
front_light.data.energy = 400
front_light.data.size = 4.0

# Ground plane 
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1))
ground = bpy.context.active_object
ground.name = "Ground"

# Maak een materiaal voor de grond
ground_mat = bpy.data.materials.new(name="GroundMaterial")
ground_mat.diffuse_color = (0.05, 0.05, 0.05, 1.0)
ground.data.materials.append(ground_mat)

# Sla de scene op
bpy.ops.wm.save_as_mainfile(filepath=filepath)
print(f"3D ringen scene opgeslagen naar: {filepath}")

# Render instellingen
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080
bpy.context.scene.render.filepath = os.path.join(os.getcwd(), "3d_rings_render.png")

try:
    # Render de afbeelding
    bpy.ops.render.render(write_still=True)
    print(f"Afbeelding gerenderd naar: {os.path.join(os.getcwd(), '3d_rings_render.png')}")
except Exception as e:
    print(f"Fout bij renderen: {e}")
"""

    # Send the script to Blender
    await send_bpy_script(SERVER_URI, rings_script)

if __name__ == "__main__":
    try:
        # Voor Windows compatibiliteit
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            
        # Voer de hoofdfunctie uit
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nScript gestopt door gebruiker")
    except Exception as e:
        print(f"Fout: {e}") 