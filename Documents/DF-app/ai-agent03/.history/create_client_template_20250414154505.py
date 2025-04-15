#!/usr/bin/env python
# Script om een nieuw Blender WebSocket client script te genereren
# Run with: python create_client_template.py mijn_nieuw_project

import os
import sys
import datetime

# Template voor een nieuw Blender WebSocket client script
TEMPLATE = '''#!/usr/bin/env python
# Blender WebSocket Client: {script_name}
# Gegenereerd op: {date}
# Beschrijving: {description}

import asyncio
import json
import sys
import websockets

# WebSocket server adres
SERVER_URI = "ws://localhost:8765"

async def send_bpy_script(script_code):
    """
    Stuur een Blender Python script naar de WebSocket server
    """
    try:
        async with websockets.connect(SERVER_URI) as websocket:
            print(f"Verbonden met Blender WebSocket server op {{SERVER_URI}}")
            
            # Bericht voorbereiden
            message = {{
                "type": "bpy_script",
                "code": script_code
            }}
            
            # Bericht versturen
            print("Bericht verzenden...")
            await websocket.send(json.dumps(message))
            print("Bericht verzonden, wachten op antwoord...")
            
            # Antwoord ontvangen
            response = await websocket.recv()
            response_data = json.loads(response)
            
            if response_data.get("status") == "ok":
                print("Script succesvol uitgevoerd in Blender!")
                print(f"Details: {{response_data.get('details', '')}}")
            else:
                print(f"Fout bij uitvoeren script: {{response_data.get('details', 'Onbekende fout')}}")
                if 'traceback' in response_data:
                    print("\nError Traceback:")
                    print(response_data.get('traceback'))
                
    except ConnectionRefusedError:
        print("Kon geen verbinding maken met de Blender WebSocket server.")
        print("Controleer of de server draait met: blender -b -P blender_agent/websocket_server.py")
    except Exception as e:
        print(f"Fout: {{e}}")

def main():
    """
    Hoofdfunctie die een Blender script genereert en verstuurt
    """
    # Hier definieer je je Blender script
    blender_script = """
import bpy
import math

# Wis bestaande objecten
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# TODO: Voeg hier je eigen Blender code toe
# Voorbeeld: Maak een kubus
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
cube = bpy.context.active_object
cube.name = "MijnKubus"

# Sla de scene op
bpy.ops.wm.save_as_mainfile(filepath="{save_path}")
print("Bestand opgeslagen als: {save_file}")
"""

    # Voer het script uit
    # Voor Windows compatibiliteit
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
        
    asyncio.run(send_bpy_script(blender_script))

if __name__ == "__main__":
    main()
'''

def create_template(script_name, description="Een nieuwe Blender WebSocket client"):
    """
    Maakt een nieuw template script met de gegeven naam en beschrijving
    """
    if not script_name.endswith('.py'):
        script_name += '.py'
    
    # Voorkom overschrijven van bestaande bestanden
    if os.path.exists(script_name):
        response = input(f"Bestand '{script_name}' bestaat al. Overschrijven? (ja/nee): ")
        if response.lower() not in ['ja', 'j', 'yes', 'y']:
            print("Operatie geannuleerd.")
            return False

    # Genereer de bestandsnaam voor de Blender save
    save_file = script_name.replace('.py', '.blend')
    save_path = os.path.join(os.getcwd(), save_file)
    
    # Vul het template in
    date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    script_content = TEMPLATE.format(
        script_name=script_name,
        date=date,
        description=description,
        save_path=save_path.replace('\\', '\\\\'),  # Escape backslashes voor Windows paden
        save_file=save_file
    )
    
    # Schrijf het bestand
    with open(script_name, 'w') as f:
        f.write(script_content)
    
    print(f"Template gemaakt: {script_name}")
    print(f"Je kunt het script uitvoeren met: python {script_name}")
    
    return True

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Gebruik: python create_client_template.py <script_naam> [beschrijving]")
        sys.exit(1)
    
    script_name = sys.argv[1]
    description = " ".join(sys.argv[2:]) if len(sys.argv) > 2 else "Een nieuwe Blender WebSocket client"
    
    create_template(script_name, description) 