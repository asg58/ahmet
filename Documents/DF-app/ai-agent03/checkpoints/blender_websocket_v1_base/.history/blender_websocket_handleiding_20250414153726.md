# Handleiding: Blender WebSocket Integratie

Deze handleiding bevat stap-voor-stap instructies voor het opzetten en gebruiken van de Blender WebSocket integratie.

## Inhoud
1. Installatie
2. Server starten
3. Client programma's gebruiken
4. Eigen scripts schrijven
5. Troubleshooting
6. Versiebeheer

## 1. Installatie

### Vereisten
- Blender 4.0+ geïnstalleerd
- Python 3.7+ geïnstalleerd
- Toegang tot command line / terminal

### Installatiestappen

#### 1.1 Python websockets package installeren
Open een terminal of command prompt en voer uit:
```
pip install websockets
```

#### 1.2 WebSocket package in Blender's Python installeren
Er zijn twee manieren om dit te doen:

**Optie A:** Via Blender's Python (aanbevolen)
```
"C:\Program Files\Blender Foundation\Blender 4.4\4.4\python\bin\python.exe" -m pip install websockets
```
Pas het pad aan naar jouw Blender installatie.

**Optie B:** Via het `install_websockets.py` script
1. Blender openen
2. Ga naar Scripting tabblad
3. Open het script `install_websockets.py`
4. Klik op "Run Script"

## 2. Server starten

De WebSocket server moet draaien in Blender voordat clients kunnen verbinden.

### 2.1 Headless modus (aanbevolen voor productie)
Open een terminal of command prompt en voer uit:
```
"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe" -b -P blender_agent/websocket_server.py
```

### 2.2 Via Blender GUI (handig voor debugging)
1. Open Blender
2. Ga naar Scripting tabblad
3. Open het script `blender_agent/websocket_server.py`
4. Klik op "Run Script"

Als de server succesvol start zie je berichten zoals:
```
[INFO] Successfully imported bpy, running inside Blender
[INFO] server listening on [::1]:8765
[INFO] server listening on 127.0.0.1:8765
[INFO] Blender WebSocket Server started on ws://localhost:8765
```

## 3. Client programma's gebruiken

Nadat de server draait, kun je verschillende client scripts uitvoeren. Open een nieuwe terminal of command prompt (laat de server draaien in de oude).

### Voorbeelden:

#### Test verbinding:
```
python test_client.py
```
Maakt een rode kubus in Blender.

#### Maak een bol:
```
python test_sphere.py
```
Maakt een bol met willekeurige kleur en animatie.

#### Maak doosletters:
```
python create_doosletters.py
```
Maakt 3D tekst "doosletterfabriek diepte 40mm in doosletters".

#### Maak verticale doosletters:
```
python create_vertical_doosletters.py
```
Maakt verticale 3D tekst "doosletters".

#### Maak "ozan" met montageprofiel:
```
python create_ozan_with_profile.py
```
Maakt verticale "ozan" tekst met een 30mm montageprofiel aan de achterkant.

#### Maak 3D ringen:
```
python create_simple_3d_rings.py
```
Maakt vier overlappende 3D ringen met professionele belichting.

## 4. Eigen scripts schrijven

Je kunt je eigen scripts maken om Blender aan te sturen. Hieronder staat een basisstructuur:

```python
import asyncio
import json
import sys
import websockets

# WebSocket server address
SERVER_URI = "ws://localhost:8765"

async def send_bpy_script(uri, script_code):
    try:
        async with websockets.connect(uri) as websocket:
            message = {
                "type": "bpy_script",
                "code": script_code
            }
            await websocket.send(json.dumps(message))
            response = await websocket.recv()
            return json.loads(response)
    except Exception as e:
        print(f"Error: {str(e)}")
        return None

async def main():
    # Blender code die je wilt uitvoeren
    blender_script = """
import bpy

# Hier komt je Blender code
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
cube = bpy.context.active_object
cube.name = 'MijnObject'
"""

    # Stuur de code naar Blender
    await send_bpy_script(SERVER_URI, blender_script)

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(main())
```

Vervang de code binnen `blender_script` met je eigen Blender Python code.

## 5. Troubleshooting

### Server start niet
- Controleer of Blender correct is geïnstalleerd
- Controleer of het pad naar Blender correct is
- Zorg dat websockets package is geïnstalleerd in Blender's Python

### Verbindingsproblemen
- Controleer of de server draait (zoek naar "Server started on ws://localhost:8765")
- Controleer of poort 8765 niet geblokkeerd wordt door firewall
- Controleer of websockets package is geïnstalleerd voor je Python client

### Foutmeldingen bij code-uitvoering
- Lees de error traceback voor specifieke fouten
- Controleer of je Blender-versie compatibel is met de gebruikte code
- Test je code eerst direct in Blender voordat je het via WebSocket stuurt

### Blender crashing
- Gebruik minder complexe operaties
- Splits grote scripts op in kleinere delen
- Controleer of er genoeg geheugen beschikbaar is

### Verdere aanpassingen

Je kunt de volgende aanpassingen maken om de setup aan te passen aan je behoeften:

- Wijzig de poort in `websocket_server.py` (zoek naar PORT = 8765)
- Voeg authenticatie toe voor meer veiligheid
- Implementeer een wachtrij voor meerdere clients
- Voeg foutafhandeling en logging toe

### Voorbeeld workflow

1. Start de Blender WebSocket server
2. Voer client scripts uit om 3D-modellen te genereren
3. Open de gegenereerde .blend bestanden in Blender voor verdere bewerking
4. Exporteer de modellen naar gewenste formaten (STL, OBJ, GLTF, etc.)

Deze workflow is ideaal voor geautomatiseerde 3D-productie, waarbij Blender als rendering- en verwerkingsengine fungeert voor externe applicaties. 

## 6. Versiebeheer

### 6.1 Ingebouwd Checkpointsysteem

Dit project bevat een ingebouwd checkpointsysteem dat functioneert als een eenvoudig versiebeheer:

```
python create_checkpoint.py
```
Dit maakt een nieuwe checkpoint (snapshot) van de huidige projectstatus.

Om een specifieke benoemde checkpoint te maken:
```
python checkpoint_blender_websocket_v1.py
```
Dit creëert een checkpoint met de vaste naam "blender_websocket_v1_base".

Om alle beschikbare checkpoints te bekijken:
```
python create_checkpoint.py list
```

Om een checkpoint te herstellen:
```
python create_checkpoint.py restore CHECKPOINT_NAAM
```

**Voordelen van het ingebouwde checkpointsysteem:**
- Eenvoudig te gebruiken zonder extra tools
- Gericht op het specifieke doel van dit project
- Bewaart alle projectbestanden inclusief .blend bestanden
- Maakt automatisch een backup voordat je een checkpoint herstelt
- Werkt direct in de lokale projectstructuur

### 6.2 GitHub als Alternatief

Als alternatief zou GitHub gebruikt kunnen worden voor versiebeheer:

**Voordelen van GitHub:**
- Beter voor samenwerking met meerdere ontwikkelaars
- Gedetailleerde geschiedenis van wijzigingen
- Mogelijkheid tot branching en merging voor parallelle ontwikkeling
- Issues, pull requests en code reviews
- Backup in de cloud

**Nadelen van GitHub voor dit project:**
- Complexer om op te zetten en te gebruiken
- Minder geschikt voor grote binaire bestanden zoals .blend bestanden
- Vereist Git kennis en installatie
- Mogelijk extra kosten voor private repositories of LFS (Large File Storage)

### 6.3 Welke aanpak kiezen?

Het huidige checkpointsysteem is ideaal voor:
- Individuele gebruikers of kleine teams
- Projecten die veel .blend bestanden bevatten
- Situaties waar snelheid en eenvoud belangrijk zijn
- Gebruikers zonder Git ervaring

GitHub is beter voor:
- Grotere teams met meerdere ontwikkelaars
- Projecten die vooral code bevatten, minder binaire bestanden
- Situaties waar gedetailleerde wijzigingen gevolgd moeten worden
- Open source projecten

Je kunt ook beide systemen combineren: het checkpointsysteem voor dagelijks gebruik en binaire bestanden, en GitHub voor code en samenwerking. 