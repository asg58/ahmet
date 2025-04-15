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

#### 3D Auto Client (`create_3d_car.py`)
- Creëert een 3D auto model met willekeurige kleur
- Bevat carrosserie, wielen, koplampen en glas
- Voegt professionele belichting toe

#### 3D Boom Client (`create_3d_tree.py`)
- Creëert een realistische 3D boom met stam, takken en bladeren
- Gebruikt willekeurige waarden voor unieke bomen
- Voegt grond en belichting toe

### 3. Dashboard Web Applicatie
We hebben een React-gebaseerd dashboard ontwikkeld dat:

#### Architectuur
- React frontend (draait op poort 3000)
- Integreert met de Blender WebSocket server (op poort 8765)
- Bevat een 3D model browser en toekomstige chat interface

#### Componenten
- ModelBrowser: Voor het tonen en beheren van 3D modellen
- ModelViewerPanel: Voor het visualiseren van 3D modellen (gebruikt Three.js)
- ModelsListPanel: Voor het tonen van de beschikbare modellen

#### Services
- BlenderWebSocketService: Zorgt voor de communicatie met de Blender WebSocket server
  - Automatische verbinding en herverbinding
  - Converteert UI-handelingen naar Blender Python code
  - Verwerkt server responsen

#### Functionaliteiten
- Modellen bekijken in een lijst
- Model details weergeven
- Nieuwe modellen aanmaken via een formulier
- Modellen bewerken in Blender

### 4. Template Generator
#### Client Template Generator (`create_client_template.py`)
- Genereert nieuwe WebSocket client scripts op basis van een template
- Bevat alle benodigde code voor communicatie met de server
- Maakt het ontwikkelen van nieuwe clients eenvoudiger

### 5. Checkpointsysteem
#### Checkpoint Tools (`create_checkpoint.py` en `checkpoint_blender_websocket_v1.py`)
- Maakt snapshots (checkpoints) van de projectstatus
- Slaat alle Python scripts, Blender bestanden en documentatie op in een georganiseerde `checkpoints` map
- Biedt functies voor het herstellen van eerdere versies
- Werkt als een eenvoudig versiebeheer systeem

## Installatie en Gebruik

### Vereisten
- Blender 4.4+ geïnstalleerd
- Python 3.x met websockets package (`pip install websockets`)
- websockets package geïnstalleerd in Blender's Python omgeving
- Node.js en npm voor het dashboard

### Server Starten
In PowerShell:
```
& "C:\Program Files\Blender Foundation\Blender 4.4\blender.exe" -- -b -P blender_agent/websocket_server.py
```

### Dashboard Starten
```
cd dashboard && npm start
```

### Client Uitvoeren (voorbeeld)
```
python create_3d_tree.py
```

### Checkpoint Maken
```
python create_checkpoint.py
```
of voor een benoemde checkpoint:
```
python checkpoint_blender_websocket_v1.py
```

### Gegenereerde Bestanden
De scripts slaan Blender bestanden op die je kunt openen:
```
& "C:\Program Files\Blender Foundation\Blender 4.4\blender.exe" "pad/naar/gegenereerd_bestand.blend"
```

## Toepassingen
- Geautomatiseerde 3D modelgeneratie
- Externe besturing van Blender
- Integratie met web interfaces of andere applicaties
- Batch processing van 3D taken
- Veilig experimenteren met checkpoints als backup

## Voorbeeldresultaten
Tot nu toe hebben we verschillende 3D objecten gegenereerd:
- Eenvoudige kubus en bol
- Diverse 3D tekstobjecten als doosletters
- Verticale tekst met montageprofiel
- Reeks overlappende 3D ringen met metallische materialen
- 3D auto met carrosserie, koplampen en wielen
- 3D boom met stam, takken en bladeren

## Geplande Verbeteringen

### Realtime 3D Visualisatie
We zijn van plan om optie 3 te implementeren voor realtime visualisatie:

#### Directe Three.js Integratie
1. Blender stuurt direct de model geometrie naar het dashboard
2. Het dashboard gebruikt Three.js om dit in realtime te visualiseren
3. Informatie over vertices, faces, materialen wordt realtime uitgewisseld
4. Geen noodzaak om bestanden op te slaan en opnieuw te laden

Deze aanpak biedt:
- Directe visuele feedback in het dashboard
- Interactiviteit met de 3D modellen
- Lagere latentie in vergelijking met alternatieve methoden
- Behoud van gedetailleerde materiaaleigenschappen

#### Technische Implementatie
- Nieuwe methode in BlenderWebSocketService: `getLiveModelData()`
- Blender script om geometrie als JSON te extraheren
- Three.js implementatie voor het weergeven van de modellen
- Polling mechanisme voor updates

## Bekende Problemen
- Socket.IO verbindingsfouten (voor de chat functie)
- Blender WebSocket server moet op een specifieke manier worden gestart vanuit PowerShell
- Commando's in PowerShell vereisen speciale syntax met `&` operator en `--` separator

## Checkpointsysteem in Detail

Het checkpointsysteem biedt een veilige manier om de voortgang van het project te bewaren:

### Functies
- **Maken**: Creëert een kopie (snapshot) van alle relevante projectbestanden
- **Bekijken**: Toont een lijst van beschikbare checkpoints
- **Herstellen**: Zet bestanden terug naar een eerdere staat, met automatische backup
- **Naam geven**: Mogelijkheid om betekenisvolle namen te geven aan belangrijke checkpoints

### Mapstructuur
Alle checkpoints worden in een centrale `checkpoints` map opgeslagen:
```
project/
├── checkpoints/
│   ├── checkpoint_20250414_153205/
│   └── blender_websocket_v1_base/
├── blender_agent/
└── ...
```

### Voordelen t.o.v. GitHub
- Eenvoudiger in gebruik voor niet-programmeurs
- Slaat ook grote .blend bestanden op (lastig met Git)
- Geen externe afhankelijkheden of accounts nodig
- Geoptimaliseerd voor dit specifieke project
- Georganiseerde bestandsstructuur in aparte map

### Gebruik in Workflow
1. Maak een checkpoint voordat je grote wijzigingen doorvoert
2. Experimenteer vrijelijk met nieuwe scripts of aanpassingen
3. Bij problemen, herstel eenvoudig naar een eerdere werkende versie
4. Gebruik benoemde checkpoints voor belangrijke mijlpalen

Dit checkpointsysteem zorgt ervoor dat je nooit werk verliest en maakt het veilig om te experimenteren met nieuwe Blender WebSocket functionaliteit. 