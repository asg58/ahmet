# Blender WebSocket Integratie - Samenvatting

## Overzicht van de Setup
Deze setup maakt het mogelijk om Python opdrachten naar Blender te sturen via een WebSocket verbinding. Dit stelt externe applicaties in staat om Blender op afstand te besturen en 3D-objecten te genereren of te manipuleren.

## Belangrijkste Componenten

### 1. WebSocket Server in Blender (`blender_agent/websocket_server.py`)
- Start een WebSocket server binnen Blender op poort 8765
- Luistert naar inkomende JSON berichten met Python/bpy code
- Voert de ontvangen code uit in de Blender omgeving
- Stuurt resultaten terug als JSON respons met status en details

### 2. Client Scripts
Verschillende client scripts zijn gemaakt voor verschillende doeleinden:

#### Basis Test Client (`test_client.py`)
- Maakt verbinding met de Blender WebSocket server
- Stuurt een bericht met code om een kubus te maken
- Ontvangt en toont de respons

#### Test Sphere Client (`test_sphere.py`)
- Creëert een bol met willekeurige kleur en animatie

#### Save Scene Client (`save_scene.py`)
- Creëert een bol en slaat de scene op als .blend bestand

#### Doosletters Client (`create_doosletters.py`)
- Creëert de tekst "doosletterfabriek diepte 40mm in doosletters"
- Stelt de tekst in als 3D-extrusie (doosletters)

#### Verticale Doosletters Client (`create_vertical_doosletters.py`)
- Creëert verticaal geplaatste tekst "doosletters"

#### Ozan Doosletters Client (`create_ozan_letters.py`)
- Creëert de tekst "ozan" als verticale doosletters
- Voegt blauwe kleur toe

#### Ozan met Profiel Client (`create_ozan_with_profile.py`)
- Creëert de tekst "ozan" met een 30mm montageprofiel aan de achterkant

#### 3D Ringen Client (`create_simple_3d_rings.py`)
- Creëert vier overlappende ringen in verschillende kleuren
- Voegt professionele belichting en rendering toe

## Installatie en Gebruik

### Vereisten
- Blender 4.4+ geïnstalleerd
- Python 3.x met websockets package (`pip install websockets`)
- websockets package geïnstalleerd in Blender's Python omgeving

### Server Starten
```
"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe" -b -P blender_agent/websocket_server.py
```

### Client Uitvoeren (voorbeeld)
```
python create_simple_3d_rings.py
```

### Gegenereerde Bestanden
De scripts slaan Blender bestanden op die je kunt openen:
```
"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe" "pad/naar/gegenereerd_bestand.blend"
```

## Toepassingen
- Geautomatiseerde 3D modelgeneratie
- Externe besturing van Blender
- Integratie met web interfaces of andere applicaties
- Batch processing van 3D taken

## Voorbeeldresultaten
Tot nu toe hebben we verschillende 3D objecten gegenereerd:
- Eenvoudige kubus en bol
- Diverse 3D tekstobjecten als doosletters
- Verticale tekst met montageprofiel
- Reeks overlappende 3D ringen met metallische materialen en professionele belichting

Alle objecten zijn opgeslagen als .blend bestanden en kunnen verder bewerkt worden in Blender. 