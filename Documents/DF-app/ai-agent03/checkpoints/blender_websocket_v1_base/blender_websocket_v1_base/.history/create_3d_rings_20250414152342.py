#!/usr/bin/env python
# Create 3D overlapping rings as doosletters with lighting effects
# Run with: python create_3d_rings.py

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
import mathutils
from math import radians

# Path voor het opslaan
filepath = os.path.join(os.getcwd(), "3d_rings.blend")

# Start met een nieuwe scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Maak het materiaal modern door de renderer te wijzigen naar Cycles
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.device = 'GPU'  # Gebruik GPU voor snellere rendering als beschikbaar

# Verwijder de default kubus als die er is
if 'Cube' in bpy.data.objects:
    bpy.data.objects['Cube'].select_set(True)
    bpy.ops.object.delete()

# Configuratie voor de ringen
num_rings = 4
ring_radius = 1.0
ring_thickness = 0.15
ring_depth = 0.08  # Diepte voor de doosletters effect
ring_overlap = 0.3  # Hoeveel de ringen overlappen
ring_colors = [
    (0.8, 0.1, 0.1, 1.0),  # Rood
    (0.1, 0.8, 0.1, 1.0),  # Groen
    (0.1, 0.1, 0.8, 1.0),  # Blauw
    (0.8, 0.6, 0.1, 1.0),  # Goud/oranje
]

# Functie om een ring te maken als doosletter
def create_ring(position, color, name):
    # Maak een torus (ring)
    bpy.ops.mesh.primitive_torus_add(
        align='WORLD',
        major_radius=ring_radius,
        minor_radius=ring_thickness,
        major_segments=48,
        minor_segments=16,
        abso_major_rad=1.25,
        abso_minor_rad=0.75,
        location=position
    )
    
    ring = bpy.context.active_object
    ring.name = name
    
    # Stel het materiaal in
    material = bpy.data.materials.new(name=f"Material_{name}")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    
    # Clear all nodes to start clean
    for node in nodes:
        nodes.remove(node)
    
    # Voeg een Principled BSDF node toe voor modern metallic materiaal
    principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    principled.inputs['Base Color'].default_value = color
    principled.inputs['Metallic'].default_value = 0.9
    principled.inputs['Specular'].default_value = 0.6
    principled.inputs['Roughness'].default_value = 0.2
    
    # Voeg een output node toe
    output = nodes.new(type='ShaderNodeOutputMaterial')
    
    # Verbind de nodes
    material.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    
    # Pas het materiaal toe op de ring
    if ring.data.materials:
        ring.data.materials[0] = material
    else:
        ring.data.materials.append(material)
    
    # Maak een kopie voor de binnenkant om de doosletter te maken
    bpy.ops.object.duplicate()
    inner_ring = bpy.context.active_object
    inner_ring.name = f"{name}_inner"
    
    # Schaal de binnenkant iets kleiner om het doosletter effect te maken
    inner_ring.scale = (0.97, 0.97, 0.97)
    
    # Selecteer de buitenste ring weer
    inner_ring.select_set(False)
    ring.select_set(True)
    bpy.context.view_layer.objects.active = ring
    
    # Boolean verschil operatie om het doosletter effect te maken
    bool_modifier = ring.modifiers.new(name="Boolean", type='BOOLEAN')
    bool_modifier.operation = 'DIFFERENCE'
    bool_modifier.solver = 'FAST'
    bool_modifier.object = inner_ring
    
    # Pas de modifier toe
    bpy.ops.object.modifier_apply(modifier="Boolean")
    
    # Verwijder de binnenkant
    inner_ring.select_set(True)
    ring.select_set(False)
    bpy.ops.object.delete()
    
    # Selecteer de ring weer
    ring.select_set(True)
    bpy.context.view_layer.objects.active = ring
    
    # Extrude de ring om diepte toe te voegen voor het doosletter effect
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.extrude_region_move(
        TRANSFORM_OT_translate=(0, 0, ring_depth)
    )
    bpy.ops.object.mode_set(mode='OBJECT')
    
    return ring

# Maak de ringen
rings = []
for i in range(num_rings):
    position = ((i * (ring_radius * 2 - ring_overlap)), 0, 0)
    ring = create_ring(position, ring_colors[i], f"Ring_{i+1}")
    rings.append(ring)

# Centreer de ringen
total_width = (num_rings - 1) * (ring_radius * 2 - ring_overlap)
center_offset = total_width / 2

for ring in rings:
    ring.location.x -= center_offset

# Voeg camera toe
bpy.ops.object.camera_add(location=(0, -5, 2), rotation=(radians(75), 0, 0))
camera = bpy.context.active_object
camera.name = "Camera"
bpy.context.scene.camera = camera

# Camera instellingen voor mooie weergave
camera.data.lens = 50  # 50mm lens

# Maak een lege object om de camera naar te richten
bpy.ops.object.empty_add(location=(0, 0, 0))
empty = bpy.context.active_object
empty.name = "CameraTarget"

# Voeg een Track To constraint toe aan de camera
constraint = camera.constraints.new(type='TRACK_TO')
constraint.target = empty
constraint.track_axis = 'TRACK_NEGATIVE_Z'
constraint.up_axis = 'UP_Y'

# Lighting setup - Drie-punt belichting voor mooie presentatie
# Key light (hoofdlicht)
bpy.ops.object.light_add(type='AREA', radius=1, location=(3, -3, 4))
key_light = bpy.context.active_object
key_light.name = "Key_Light"
key_light.data.energy = 500
key_light.data.size = 2.0
key_light.rotation_euler = (radians(45), 0, radians(45))

# Fill light (invullicht)
bpy.ops.object.light_add(type='AREA', radius=1, location=(-3, -2, 2))
fill_light = bpy.context.active_object
fill_light.name = "Fill_Light"
fill_light.data.energy = 300
fill_light.data.size = 3.0
fill_light.rotation_euler = (radians(45), 0, radians(-45))

# Rim light (achterlicht)
bpy.ops.object.light_add(type='SPOT', location=(0, 3, 3))
rim_light = bpy.context.active_object
rim_light.name = "Rim_Light"
rim_light.data.energy = 800
rim_light.data.spot_size = radians(45)
rim_light.data.spot_blend = 0.15
rim_light.rotation_euler = (radians(-45), 0, 0)

# Ground plane voor schaduwen
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, -1))
ground = bpy.context.active_object
ground.name = "Ground"

# Maak een materiaal voor de grond
ground_mat = bpy.data.materials.new(name="GroundMaterial")
ground_mat.use_nodes = True
nodes = ground_mat.node_tree.nodes

# Clear all nodes
for node in nodes:
    nodes.remove(node)

# Maak een simpel mat materiaal voor de grond
diffuse = nodes.new(type='ShaderNodeBsdfDiffuse')
diffuse.inputs['Color'].default_value = (0.05, 0.05, 0.05, 1.0)
diffuse.inputs['Roughness'].default_value = 0.6

output = nodes.new(type='ShaderNodeOutputMaterial')
ground_mat.node_tree.links.new(diffuse.outputs['BSDF'], output.inputs['Surface'])

# Pas het materiaal toe op de grond
ground.data.materials.append(ground_mat)

# Render instellingen
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080
bpy.context.scene.render.film_transparent = False
bpy.context.scene.render.filepath = os.path.join(os.getcwd(), "3d_rings_render.png")

# Ambient occlusion en andere render settings
bpy.context.scene.world.use_nodes = True
world_nodes = bpy.context.scene.world.node_tree.nodes
world_links = bpy.context.scene.world.node_tree.links

# Clear bestaande nodes
for node in world_nodes:
    world_nodes.remove(node)

# Creëer een subtiele achtergrond
bg = world_nodes.new(type='ShaderNodeBackground')
bg.inputs['Color'].default_value = (0.05, 0.05, 0.05, 1.0)
bg.inputs['Strength'].default_value = 1.0

output = world_nodes.new(type='ShaderNodeOutputWorld')
world_links.new(bg.outputs['Background'], output.inputs['Surface'])

# Sla de scene op
bpy.ops.wm.save_as_mainfile(filepath=filepath)
print(f"3D ringen scene opgeslagen naar: {filepath}")

# Render de afbeelding
bpy.ops.render.render(write_still=True)
print(f"Afbeelding gerenderd naar: {os.path.join(os.getcwd(), '3d_rings_render.png')}")
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