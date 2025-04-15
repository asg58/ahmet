#!/usr/bin/env python
# Auto 3D Generator voor Blender WebSocket Server
# Run met: python create_3d_car.py

import asyncio
import json
import sys
import websockets
import random

# WebSocket server adres
SERVER_URI = "ws://localhost:8765"

async def send_bpy_script(script_code):
    """
    Stuur een Blender Python script naar de WebSocket server
    """
    try:
        async with websockets.connect(SERVER_URI) as websocket:
            print(f"Verbonden met Blender WebSocket server op {SERVER_URI}")
            
            # Bericht voorbereiden
            message = {
                "type": "bpy_script",
                "code": script_code
            }
            
            # Bericht versturen
            print("Auto 3D script verzenden...")
            await websocket.send(json.dumps(message))
            print("Bericht verzonden, wachten op antwoord...")
            
            # Antwoord ontvangen
            response = await websocket.recv()
            response_data = json.loads(response)
            
            if response_data.get("status") == "ok":
                print("Script succesvol uitgevoerd in Blender!")
                print(f"Details: {response_data.get('details', '')}")
            else:
                print(f"Fout bij uitvoeren script: {response_data.get('details', 'Onbekende fout')}")
                if 'traceback' in response_data:
                    print("\nError Traceback:")
                    print(response_data.get('traceback'))
                
    except ConnectionRefusedError:
        print("Kon geen verbinding maken met de Blender WebSocket server.")
        print("Controleer of de server draait met: blender -b -P blender_agent/websocket_server.py")
    except Exception as e:
        print(f"Fout: {e}")

def main():
    """
    Hoofdfunctie die een Blender script genereert en verstuurt
    om een eenvoudige 3D auto te maken
    """
    # Genereer een willekeurige kleur voor de auto
    r = random.random()
    g = random.random()
    b = random.random()
    
    # Blender script voor het maken van een auto
    blender_script = """
import bpy
import math
from mathutils import Vector

# Wis bestaande objecten
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# Functie om materiaal aan te maken
def create_material(name, color):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    principled = mat.node_tree.nodes.get('Principled BSDF')
    if principled:
        principled.inputs['Base Color'].default_value = color
        principled.inputs['Metallic'].default_value = 0.8
        principled.inputs['Specular'].default_value = 0.5
        principled.inputs['Roughness'].default_value = 0.2
    return mat

# Maak de auto materialen
car_color = ({0}, {1}, {2}, 1.0)
car_body_material = create_material("CarBody", car_color)
wheel_material = create_material("Wheel", (0.02, 0.02, 0.02, 1.0))
glass_material = create_material("Glass", (0.8, 0.9, 1.0, 0.2))
glass_material.blend_method = 'BLEND'
glass_material.node_tree.nodes.get('Principled BSDF').inputs['Transmission'].default_value = 0.9

# BODY - Auto carrosserie (basis)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.5))
body = bpy.context.active_object
body.name = "CarBody"
body.scale = (2.5, 1.2, 0.5)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# TOP - Dak van de auto
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 1.1))
top = bpy.context.active_object
top.name = "CarTop"
top.scale = (1.5, 1.0, 0.4)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# JOIN - Voeg body en top samen
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
top.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

# FRONT - Auto voorkant
bpy.ops.mesh.primitive_cube_add(size=1, location=(1.3, 0, 0.4))
front = bpy.context.active_object
front.name = "CarFront"
front.scale = (0.4, 1.2, 0.4)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

# JOIN - Voeg front toe aan carrosserie
body.select_set(True)
front.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()

# Materiaal toewijzen aan body
body.data.materials.append(car_body_material)

# WINDOW - Voorruit 
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.8, 0, 1.15))
front_window = bpy.context.active_object
front_window.name = "FrontWindow"
front_window.scale = (0.1, 0.9, 0.3)
front_window.data.materials.append(glass_material)

# WIELEN - Maak 4 wielen
wheel_positions = [
    (0.8, 0.7, 0.3),  # Rechtsvoor
    (0.8, -0.7, 0.3),  # Linksvoor
    (-0.8, 0.7, 0.3),  # Rechtsachter
    (-0.8, -0.7, 0.3)  # Linksachter
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
    wheel.name = f"Wheel_{{i+1}}"
    wheel.rotation_euler[1] = math.radians(90)
    wheel.data.materials.append(wheel_material)
    wheels.append(wheel)

# KOPLAMPEN - Maak koplampen
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

# Maak en voeg lichtgevend materiaal toe aan koplampen
light_material = create_material("HeadlightMaterial", (1, 1, 0.8, 1))
light_material.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = 3.0
light_material.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (1, 1, 0.8, 1)

headlight_r.data.materials.append(light_material)
headlight_l.data.materials.append(light_material)

# Voeg belichting toe
bpy.ops.object.light_add(type='SUN', location=(5, 5, 10))
sun = bpy.context.active_object
sun.name = "Sun"
sun.data.energy = 2.0

# Stel camera in
bpy.ops.object.camera_add(location=(5, -5, 3))
cam = bpy.context.active_object
cam.name = "Camera"
cam.rotation_euler = (math.radians(70), 0, math.radians(45))
bpy.context.scene.camera = cam

# Stel render settings in
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = 128
bpy.context.scene.render.resolution_x = 1920
bpy.context.scene.render.resolution_y = 1080

print("3D auto succesvol aangemaakt!")

# Sla de scene op
bpy.ops.wm.save_as_mainfile(filepath="3d_car_scene.blend")
print("Scene opgeslagen als: 3d_car_scene.blend")
""".format(r, g, b)

    # Voor Windows compatibiliteit
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    # Voer het script uit
    asyncio.run(send_bpy_script(blender_script))

if __name__ == "__main__":
    main() 