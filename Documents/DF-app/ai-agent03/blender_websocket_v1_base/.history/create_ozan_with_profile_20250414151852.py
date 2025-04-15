#!/usr/bin/env python
# Create doosletters with "ozan" in Blender plus a 30mm mounting profile
# Run with: python create_ozan_with_profile.py

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
    # Create 3D text in Blender with "ozan" and a mounting profile
    ozan_script = """
import bpy
import os
import math
import bmesh

# Path voor het opslaan
filepath = os.path.join(os.getcwd(), "ozan_with_profile.blend")

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

# Verplaats de tekst naar het centrum
bpy.ops.object.origin_set(type='ORIGIN_CENTER_OF_MASS')
text_obj.location = (0, 0, 0)

# ------------------------------------------------------------
# Maak een horizontaal profiel aan de achterkant van de letters
# ------------------------------------------------------------

# Bepaal afmetingen van het tekst object
text_dimensions = text_obj.dimensions
width = text_dimensions.x
height = text_dimensions.z  # Z is de hoogte omdat we de tekst 90 graden geroteerd hebben

# Maak een extrusie kubus voor het profiel (30mm diep)
profile_depth = 0.03  # 30mm in meters
bpy.ops.mesh.primitive_cube_add(
    size=1, 
    location=(0, -0.02 - (profile_depth/2), 0)  # Plaats het net achter de letters
)
profile = bpy.context.active_object
profile.name = "MountingProfile"

# Pas de grootte aan zodat het profiel de volledige breedte van de tekst beslaat
# en ongeveer 20% van de hoogte aan de onderkant
profile.scale = (width, profile_depth, height * 0.2)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# Plaats het profiel aan de onderkant van de letters
profile.location.z = -(height/2) + (profile.dimensions.z/2)

# Maak een nieuw materiaal voor het profiel (bijvoorbeeld grijs)
profile_material = bpy.data.materials.new(name="ProfileMateriaal")
profile_material.diffuse_color = (0.3, 0.3, 0.3, 1.0)  # Grijs materiaal
profile.data.materials.append(profile_material)

# Selecteer beide objecten voor toekomstige bewerkingen
text_obj.select_set(True)
profile.select_set(True)
bpy.context.view_layer.objects.active = text_obj

# Maak een nieuw materiaal voor de letters
letter_material = bpy.data.materials.new(name="OzanMateriaal")
letter_material.diffuse_color = (0.0, 0.2, 0.8, 1.0)  # Blauw materiaal
text_obj.data.materials.append(letter_material)

# Voeg een camera toe die alles in beeld brengt
bpy.ops.object.camera_add(location=(0, -5, 0), rotation=(math.radians(90), 0, 0))
camera = bpy.context.active_object
camera.name = "Camera"

# Pas de camera afstand aan om alles in beeld te krijgen
camera.location.y = -8

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
print(f"Ozan met montageprofiel opgeslagen naar: {filepath}")
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