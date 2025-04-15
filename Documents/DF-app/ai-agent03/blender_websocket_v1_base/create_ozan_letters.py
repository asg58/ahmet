#!/usr/bin/env python
# Create doosletters with "ozan" in Blender
# Run with: python create_ozan_letters.py

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
    # Create 3D text in Blender with "ozan"
    ozan_script = """
import bpy
import os
import math

# Path voor het opslaan
filepath = os.path.join(os.getcwd(), "ozan_doosletters.blend")

# Start met een nieuwe scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Verwijder de default kubus als die er is
if 'Cube' in bpy.data.objects:
    bpy.data.objects['Cube'].select_set(True)
    bpy.ops.object.delete()

# Tekst om te gebruiken
tekst = "ozan"

# Maak een text object
bpy.ops.object.text_add(enter_editmode=False, align='WORLD', location=(0, 0, 0), scale=(1, 1, 1))
text_obj = bpy.context.active_object
text_obj.name = "Ozan"

# Configureer de text
text_obj.data.body = tekst
text_obj.data.align_x = 'CENTER'  # Centreer de tekst
text_obj.data.size = 0.7  # Grootte van de tekst
text_obj.data.extrude = 0.04  # Diepte van 40mm (0.04 meter)
text_obj.data.font = bpy.data.fonts[0]  # Default font

# Converteer naar mesh voor betere bewerkbaarheid
bpy.ops.object.convert(target='MESH')

# Roteer het object zodat het verticaal staat (90 graden rond X-as)
text_obj.rotation_euler[0] = math.radians(90)  # 90 graden in X
text_obj.rotation_euler[1] = 0
text_obj.rotation_euler[2] = 0

# Pas de rotatie toe
bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

# Maak het object wat groter voor betere visualisatie
bpy.ops.transform.resize(value=(1.5, 1.5, 1.5))

# Maak een nieuw materiaal
material = bpy.data.materials.new(name="OzanMateriaal")

# Maak een blauw materiaal in plaats van rood voor afwisseling
material.diffuse_color = (0.0, 0.2, 0.8, 1.0)  # Blauw materiaal
text_obj.data.materials.append(material)

# Verplaats de tekst naar het centrum
bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS')
text_obj.location = (0, 0, 0)

# Voeg een camera toe die van voren naar de verticale tekst kijkt
bpy.ops.object.camera_add(location=(0, -5, 0), rotation=(math.radians(90), 0, 0))
camera = bpy.context.active_object
camera.name = "Camera"

# Stel de camera in
bpy.context.scene.camera = camera

# Track to constraint voor de camera
constraint = camera.constraints.new(type='TRACK_TO')
constraint.target = text_obj
constraint.track_axis = 'TRACK_NEGATIVE_Z'
constraint.up_axis = 'UP_Y'

# Voeg verlichting toe
bpy.ops.object.light_add(type='SUN', radius=1, location=(1, -2, 3))
sun = bpy.context.active_object
sun.name = "Sun"
sun.data.energy = 2.0

# Voeg een tweede licht toe voor betere verlichting
bpy.ops.object.light_add(type='AREA', radius=1, location=(-2, -1, 2))
area_light = bpy.context.active_object
area_light.name = "Fill Light"
area_light.data.energy = 1.0

# Configureer render instellingen
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080
bpy.context.scene.render.resolution_percentage = 100
bpy.context.scene.render.film_transparent = True  # Transparante achtergrond

# Sla de scene op
bpy.ops.wm.save_as_mainfile(filepath=filepath)
print(f"Ozan doosletters scene opgeslagen naar: {filepath}")
"""

    # Send the script to Blender
    await send_bpy_script(SERVER_URI, ozan_script)

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