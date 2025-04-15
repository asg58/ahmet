import datetime
import os
import sys

TEMPLATE = '#!/usr/bin/env python\n# Blender WebSocket Client: {script_name}\n# Gegenereerd op: {date}\n# Beschrijving: {description}\n\nimport asyncio\nimport json\nimport sys\nimport websockets\n\n# WebSocket server adres\nSERVER_URI = "ws://localhost:8765"\n\nasync def send_bpy_script(script_code):\n    """\n    Stuur een Blender Python script naar de WebSocket server\n    """\n    try:\n        async with websockets.connect(SERVER_URI) as websocket:\n            print(f"Verbonden met Blender WebSocket server op {{SERVER_URI}}")\n            \n            # Bericht voorbereiden\n            message = {{\n                "type": "bpy_script",\n                "code": script_code\n            }}\n            \n            # Bericht versturen\n            print("Bericht verzenden...")\n            await websocket.send(json.dumps(message))\n            print("Bericht verzonden, wachten op antwoord...")\n            \n            # Antwoord ontvangen\n            response = await websocket.recv()\n            response_data = json.loads(response)\n            \n            if response_data.get("status") == "ok":\n                print("Script succesvol uitgevoerd in Blender!")\n                print(f"Details: {{response_data.get(\'details\', \'\')}}")\n            else:\n                print(\n    f"Fout bij uitvoeren script: {{response_data.get(\'details\', \'Onbekende fout\')}}")\n                if \'traceback\' in response_data:\n                    print("\nError Traceback:")\n                    print(response_data.get(\'traceback\'))\n                \n    except ConnectionRefusedError:\n        print("Kon geen verbinding maken met de Blender WebSocket server.")\n        print(\n    "Controleer of de server draait met: blender -b -P blender_agent/websocket_server.py")\n    except Exception as e:\n        print(f"Fout: {{e}}")\n\ndef main():\n    """\n    Hoofdfunctie die een Blender script genereert en verstuurt\n    """\n    # Hier definieer je je Blender script\n    blender_script = """\nimport bpy\nimport math\n\n# Wis bestaande objecten\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# TODO: Voeg hier je eigen Blender code toe\n# Voorbeeld: Maak een kubus\nbpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))\ncube = bpy.context.active_object\ncube.name = "MijnKubus"\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath="{save_path}")\nprint("Bestand opgeslagen als: {save_file}")\n"""\n\n    # Voer het script uit\n    # Voor Windows compatibiliteit\n    if sys.platform == \'win32\':\n        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())\n        \n    asyncio.run(send_bpy_script(blender_script))\n\nif __name__ == "__main__":\n    main()\n'
def create_template(script_name, description='Een nieuwe Blender WebSocket client'):
    """
    Maakt een nieuw template script met de gegeven naam en beschrijving
    """
    if not script_name.endswith('.py'):
        script_name += '.py'
    if os.path.exists(script_name):
        response = input(f"Bestand '{script_name}' bestaat al. Overschrijven? (ja/nee): ")
        if response.lower() not in ['ja', 'j', 'yes', 'y']:
            print('Operatie geannuleerd.')
            return False
    save_file = script_name.replace('.py', '.blend')
    save_path = os.path.join(os.getcwd(), save_file)
    date = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    script_content = TEMPLATE.format(script_name=script_name, date=date, description=description, save_path=save_path.replace('\\', '\\\\'), save_file=save_file)
    with open(script_name, 'w') as f:
        f.write(script_content)
    print(f'Template gemaakt: {script_name}')
    print(f'Je kunt het script uitvoeren met: python {script_name}')
    return True
if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Gebruik: python create_client_template.py <script_naam> [beschrijving]')
        sys.exit(1)
    script_name = sys.argv[1]
    description = ' '.join(sys.argv[2:]) if len(sys.argv) > 2 else 'Een nieuwe Blender WebSocket client'
    create_template(script_name, description)
os
sys
datetime
TEMPLATE
'#!/usr/bin/env python\n# Blender WebSocket Client: {script_name}\n# Gegenereerd op: {date}\n# Beschrijving: {description}\n\nimport asyncio\nimport json\nimport sys\nimport websockets\n\n# WebSocket server adres\nSERVER_URI = "ws://localhost:8765"\n\nasync def send_bpy_script(script_code):\n    """\n    Stuur een Blender Python script naar de WebSocket server\n    """\n    try:\n        async with websockets.connect(SERVER_URI) as websocket:\n            print(f"Verbonden met Blender WebSocket server op {{SERVER_URI}}")\n            \n            # Bericht voorbereiden\n            message = {{\n                "type": "bpy_script",\n                "code": script_code\n            }}\n            \n            # Bericht versturen\n            print("Bericht verzenden...")\n            await websocket.send(json.dumps(message))\n            print("Bericht verzonden, wachten op antwoord...")\n            \n            # Antwoord ontvangen\n            response = await websocket.recv()\n            response_data = json.loads(response)\n            \n            if response_data.get("status") == "ok":\n                print("Script succesvol uitgevoerd in Blender!")\n                print(f"Details: {{response_data.get(\'details\', \'\')}}")\n            else:\n                print(\n    f"Fout bij uitvoeren script: {{response_data.get(\'details\', \'Onbekende fout\')}}")\n                if \'traceback\' in response_data:\n                    print("\nError Traceback:")\n                    print(response_data.get(\'traceback\'))\n                \n    except ConnectionRefusedError:\n        print("Kon geen verbinding maken met de Blender WebSocket server.")\n        print(\n    "Controleer of de server draait met: blender -b -P blender_agent/websocket_server.py")\n    except Exception as e:\n        print(f"Fout: {{e}}")\n\ndef main():\n    """\n    Hoofdfunctie die een Blender script genereert en verstuurt\n    """\n    # Hier definieer je je Blender script\n    blender_script = """\nimport bpy\nimport math\n\n# Wis bestaande objecten\nbpy.ops.object.select_all(action=\'SELECT\')\nbpy.ops.object.delete()\n\n# TODO: Voeg hier je eigen Blender code toe\n# Voorbeeld: Maak een kubus\nbpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))\ncube = bpy.context.active_object\ncube.name = "MijnKubus"\n\n# Sla de scene op\nbpy.ops.wm.save_as_mainfile(filepath="{save_path}")\nprint("Bestand opgeslagen als: {save_file}")\n"""\n\n    # Voer het script uit\n    # Voor Windows compatibiliteit\n    if sys.platform == \'win32\':\n        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())\n        \n    asyncio.run(send_bpy_script(blender_script))\n\nif __name__ == "__main__":\n    main()\n'
script_name, description='Een nieuwe Blender WebSocket client'
'\n    Maakt een nieuw template script met de gegeven naam en beschrijving\n    '
if not script_name.endswith('.py'):
    script_name += '.py'
if os.path.exists(script_name):
    response = input(f"Bestand '{script_name}' bestaat al. Overschrijven? (ja/nee): ")
    if response.lower() not in ['ja', 'j', 'yes', 'y']:
        print('Operatie geannuleerd.')
        return False
save_file = script_name.replace('.py', '.blend')
save_path = os.path.join(os.getcwd(), save_file)
date = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
script_content = TEMPLATE.format(script_name=script_name, date=date, description=description, save_path=save_path.replace('\\', '\\\\'), save_file=save_file)
with open(script_name, 'w') as f:
    f.write(script_content)
print(f'Template gemaakt: {script_name}')
print(f'Je kunt het script uitvoeren met: python {script_name}')
return True
__name__ == '__main__'
if len(sys.argv) < 2:
    print('Gebruik: python create_client_template.py <script_naam> [beschrijving]')
    sys.exit(1)
script_name = sys.argv[1]
description = ' '.join(sys.argv[2:]) if len(sys.argv) > 2 else 'Een nieuwe Blender WebSocket client'
create_template(script_name, description)

script_name
description
'Een nieuwe Blender WebSocket client'
'\n    Maakt een nieuw template script met de gegeven naam en beschrijving\n    '
not script_name.endswith('.py')
script_name += '.py'
os.path.exists(script_name)
response = input(f"Bestand '{script_name}' bestaat al. Overschrijven? (ja/nee): ")
if response.lower() not in ['ja', 'j', 'yes', 'y']:
    print('Operatie geannuleerd.')
    return False
save_file
script_name.replace('.py', '.blend')
save_path
os.path.join(os.getcwd(), save_file)
date
datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
script_content
TEMPLATE.format(script_name=script_name, date=date, description=description, save_path=save_path.replace('\\', '\\\\'), save_file=save_file)
open(script_name, 'w') as f
f.write(script_content)
print(f'Template gemaakt: {script_name}')
print(f'Je kunt het script uitvoeren met: python {script_name}')
True
__name__

'__main__'
len(sys.argv) < 2
print('Gebruik: python create_client_template.py <script_naam> [beschrijving]')
sys.exit(1)
script_name
sys.argv[1]
description
' '.join(sys.argv[2:]) if len(sys.argv) > 2 else 'Een nieuwe Blender WebSocket client'
create_template(script_name, description)

script_name.endswith('.py')
script_name

'.py'
os.path.exists
script_name
response
input(f"Bestand '{script_name}' bestaat al. Overschrijven? (ja/nee): ")
response.lower() not in ['ja', 'j', 'yes', 'y']
print('Operatie geannuleerd.')
return False

script_name.replace
'.py'
'.blend'

os.path.join
os.getcwd()
save_file

datetime.datetime.now().strftime
'%Y-%m-%d %H:%M:%S'

TEMPLATE.format
script_name=script_name
date=date
description=description
save_path=save_path.replace('\\', '\\\\')
save_file=save_file
open(script_name, 'w')
f
f.write(script_content)
print
f'Template gemaakt: {script_name}'
print
f'Je kunt het script uitvoeren met: python {script_name}'

len(sys.argv)

2
print('Gebruik: python create_client_template.py <script_naam> [beschrijving]')
sys.exit(1)

sys.argv
1


len(sys.argv) > 2
' '.join(sys.argv[2:])
'Een nieuwe Blender WebSocket client'
create_template
script_name
description
script_name.endswith
'.py'

os.path



input
f"Bestand '{script_name}' bestaat al. Overschrijven? (ja/nee): "
response.lower()

['ja', 'j', 'yes', 'y']
print('Operatie geannuleerd.')
False
script_name

os.path

os.getcwd

datetime.datetime.now()

TEMPLATE

script_name
date
description
save_path.replace('\\', '\\\\')
save_file
open
script_name
'w'

f.write
script_content

'Template gemaakt: '
{script_name}

'Je kunt het script uitvoeren met: python '
{script_name}
len
sys.argv
print
'Gebruik: python create_client_template.py <script_naam> [beschrijving]'
sys.exit
1
sys

len(sys.argv)

2
' '.join
sys.argv[2:]



script_name

os


"Bestand '"
{script_name}
"' bestaat al. Overschrijven? (ja/nee): "
response.lower
'ja'
'j'
'yes'
'y'

print
'Operatie geannuleerd.'

os

os

datetime.datetime.now




save_path.replace
'\\'
'\\\\'



f


script_name
script_name

sys


sys


len
sys.argv
' '

sys.argv
2:



script_name
response




datetime.datetime

save_path







sys

sys

2


datetime




