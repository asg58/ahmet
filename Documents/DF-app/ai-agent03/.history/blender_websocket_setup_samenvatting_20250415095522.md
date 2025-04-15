# Blender WebSocket Integratie - Complete Technische Samenvatting

## Overzicht van de Architectuur
Deze setup implementeert een volledige client-server architectuur waarmee externe applicaties Blender op afstand kunnen besturen via WebSocket. Het systeem bestaat uit een server component in Blender, verschillende client libraries, standalone clients, een web dashboard en een vector database voor model management. Dit document biedt een volledig overzicht van alle componenten en hun interacties.

## 1. Kerncomponenten

### 1.1 WebSocket Server in Blender (`blender_agent/websocket_server.py`)
- **Implementatie**: Python-gebaseerde asyncio WebSocket server die binnen Blender draait
- **Serverklasse**: `BlenderWebSocketServer` is de hoofdklasse die alle server functionaliteit implementeert
- **Initialisatie**: Constructor accepteert host (default "localhost") en port (default 8765)
- **Client afhandeling**: `handle_client()` methode behandelt elke binnenkomende client verbinding
- **Berichtverwerking**: `process_message()` methode parseert JSON-berichten en bepaalt acties
- **Code-uitvoering**: `execute_bpy_script()` methode voert Blender Python (bpy) code uit in een geïsoleerde namespace
- **Respons formaat**: Standaard JSON respons bevat altijd `status` ("ok" of "error") en `details` velden
- **Foutafhandeling**: Uitgebreide error catching met traceback in de respons voor debugging
- **Asyncio implementatie**: Gebruikt Python's asyncio library voor event-driven, asynchrone verwerking
- **Blender-integratie**: Importeert en gebruikt de bpy module om Blender aan te sturen
- **Opstart verificatie**: Controleert of het script daadwerkelijk binnen Blender draait

### 1.2 Client Libraries en Hulpmodules

#### Gedeelde Client Library (`blender_client_lib.py`)
- **Kernfunctie**: `send_bpy_script()` asyncio functie voor WebSocket communicatie
- **Parameters**: Accepteert script_code (str) en server_uri (str, default "ws://localhost:8765")
- **Retourwaarde**: Dictionary met server response of None bij verbindingsfout
- **Foutafhandeling**: Speciale handling voor connection refused en andere verbindingsproblemen
- **Windows compatibiliteit**: `setup_asyncio_for_windows()` functie voor platform-specifieke configuratie

#### Centrale Configuratie (`blender_config.py`)
- **Server instellingen**: HOST, PORT en URI definities
- **Blender pad**: Geconfigureerd pad naar Blender executable
- **Paden**: PROJECT_ROOT en OUTPUT_DIR definities
- **Hulpfuncties**: `get_output_filepath()` en `format_blender_path()` voor consistente padformattering

#### Utilities Module (`blender_utils.py`)
- **Blender-specifieke hulpfuncties**: Utilities voor veelvoorkomende Blender operaties
- **Bestands I/O**: Functies voor het laden en opslaan van .blend bestanden
- **Formattering**: Functies voor consistente naamgeving en bestandsstructuur

### 1.3 Client Script Structuur
Alle client scripts volgen hetzelfde patroon:

```python
# Imports
import asyncio, json, sys, websockets
# Mogelijk: from blender_client_lib import send_bpy_script

# Definitie van WebSocket adres
SERVER_URI = "ws://localhost:8765"

# Functie voor WebSocket communicatie
async def send_bpy_script(uri, script_code):
    # Verbinding, verzending en ontvangst van antwoord
    
# Hoofdfunctie
async def main():
    # Definitie van Blender Python script als multi-line string
    blender_script = """
    import bpy
    # Blender operaties hier...
    """
    # Script verzenden naar server
    await send_bpy_script(SERVER_URI, blender_script)

# Script uitvoering
if __name__ == "__main__":
    # Windows compatibiliteit
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    # Asyncio event loop starten
    asyncio.run(main())
```

## 2. Client Scripts in Detail

### 2.1 Basis Tests en Voorbeelden

#### Test Client (`test_client.py`)
- **Functie**: Maakt verbinding en creëert een eenvoudige rode kubus
- **Implementatie**: Demonstreert de volledige WebSocket communicatie cyclus
- **Blender code**: Gebruikt `bpy.ops.mesh.primitive_cube_add()` en configureert materialen

#### Test Sphere Client (`test_sphere.py`)
- **Functie**: Creëert een bol met willekeurige kleur en animatie
- **Implementatie**: Demonstreert materialen, keyframes en animatie
- **Blender code**: Maakt gebruik van `bpy.ops.mesh.primitive_uv_sphere_add()` en animatie APIs

#### Save Scene Client (`save_scene.py`)
- **Functie**: Creëert een bol en slaat de scene op als .blend bestand
- **Implementatie**: Demonstreert bestandsopslag met `bpy.ops.wm.save_as_mainfile()`
- **Bestandspaden**: Gebruikt relatieve paden voor opslag

### 2.2 3D Tekst en Doosletters Scripts

#### Doosletters Client (`create_doosletters.py`)
- **Functie**: Creëert 3D tekst met extrusie ("doosletters")
- **Implementatie**: Gebruikt `bpy.ops.object.text_add()` en text-to-mesh conversie
- **Materialen**: Configureert materialen met specifieke kleuren

#### Verticale Doosletters Client (`create_vertical_doosletters.py`)
- **Functie**: Creëert verticaal geplaatste 3D tekst
- **Implementatie**: Gebruikt tekstrotatie en positionering
- **Specifieke rotatie**: Implementeert 90° rotatie rond de X-as

#### Ozan Doosletters Client (`create_ozan_letters.py`)
- **Functie**: Creëert specifieke "ozan" tekst met blauwe kleuring
- **Implementatie**: Combineert tekst, materialen en positionering
- **Font configuratie**: Stelt specifieke teksteigenschappen in

#### Ozan met Profiel Client (`create_ozan_with_profile.py`)
- **Functie**: Voegt een 30mm montageprofiel toe achter de tekst
- **Implementatie**: Combineert tekst met een aangepast profiel object
- **Montage technique**: Creëert een box achter de tekst met juiste diepte

### 2.3 Complexe 3D Object Scripts

#### 3D Ringen Client (`create_simple_3d_rings.py`)
- **Functie**: Creëert vier overlappende ringen met metallische materialen
- **Implementatie**: Gebruikt `bpy.ops.mesh.primitive_torus_add()` in een loop
- **Verlichting**: Implementeert drie-punt verlichting voor professionele rendering
- **Materialen**: Configureert metallische materialen met glans

#### 3D Auto Client (`create_3d_car.py`)
- **Functie**: Creëert een 3D auto model met alle componenten
- **Implementatie**: Bouwt verschillende mesh-elementen en combineert ze
- **Complexiteit**: Maakt carrosserie, wielen, ramen en koplampen
- **Materialen**: Implementeert transparantie voor glas en metallische afwerking

#### 3D Boom Client (`create_3d_tree.py`)
- **Functie**: Genereert een realistische boom met takken en bladeren
- **Implementatie**: Gebruikt recursieve methodiek voor boomstructuur
- **Randomisatie**: Implementeert willekeurige variaties voor organische look
- **Prestatie**: Optimaliseert geometry complexity voor bruikbare modellen

## 3. Dashboard Web Applicatie in Detail

### 3.1 Frontend Architectuur

#### Hoofdcomponenten
- **App.js**: Root component die de globale state beheert en routering implementeert
- **Header.js**: Navigatie, verbindingsstatus en tab-switching functionaliteit
- **ModelBrowser.js**: Container component voor model browser functionaliteit
- **ModelViewerPanel.js**: Three.js integratie voor 3D model visualisatie
- **ModelsListPanel.js**: Component voor lijstweergave en filtering van modellen
- **ChatInterface.js**: Interface voor AI-gestuurde modelcreatie via chat

#### Dataflow
1. App.js initialiseert verbindingen met Blender (WebSocket) en Socket.IO server
2. User interface events worden afgehandeld door componenten
3. Model operaties worden gedelegeerd naar BlenderWebSocketService
4. Resultaten worden in component state opgeslagen en gerenderd

### 3.2 BlenderWebSocketService in Detail

#### Kerninternals (`BlenderWebSocketService.js`)
- **Verbindingsbeheer**: Implementeert verbinding, herverbinding en timeout handling
- **Berichtprotocol**: Standaardiseert JSON-berichten voor Blender communicatie
- **Event systeem**: Implementeert custom event listeners voor respons verwerking
- **State machine**: Volgt verbindingsstatus om UI updates te triggeren
- **Retry mechanisme**: Implementeert exponentiële backoff voor herverbindingspogingen

#### Belangrijke methoden
- **connect()**: Asynchroon verbinden met de Blender WebSocket server
- **disconnect()**: Gecontroleerd afsluiten van de verbinding
- **send()**: Generieke methode voor het verzenden van berichten
- **createModel()**: Specifieke methode voor het aanmaken van nieuwe 3D modellen
- **getLiveModelData()**: Realtime geometrie data opvragen voor visualisatie

### 3.3 Component Interacties

#### State Management
- **Global state**: Verbindingsstatus en actieve tab in App.js
- **Component state**: Lokale state per component voor UI rendering
- **Service state**: Verbindingsstatus in BlenderWebSocketService

#### Event Flow voorbeeld (model creation):
1. User klikt op "Create model" in UI
2. ModelBrowser component roept `createBlenderModel(modelData)` aan
3. Deze functie roept `blenderService.createModel(modelData)` aan
4. BlenderWebSocketService maakt verbinding en stuurt een bericht
5. Server voert de code uit in Blender en stuurt respons terug
6. Service verwerkt antwoord en triggert callbacks
7. UI wordt bijgewerkt om succes of fout te tonen

## 4. ChromaDB Integratie (Vector Database)

### 4.1 Architectuur en Componenten

#### BlenderModelDB Class (`blender_chroma_db.py`)
- **Functie**: Wrapper rond ChromaDB voor het indexeren en zoeken van 3D modellen
- **Initialisatie**: Maakt connectie met persistent ChromaDB in `chroma_db` directory
- **Collectie**: Werkt standaard met de "blender_models" collectie

#### Kernmethoden
- **add_model()**: Voegt een model toe met bestandspad, beschrijving en metadata
- **search_models()**: Zoekt modellen op basis van een query en filters
- **list_all_models()**: Haalt alle opgeslagen modellen op
- **delete_model()**: Verwijdert een model uit de database

### 4.2 Indexering Script (`index_blender_files.py`)

#### Functies
- **find_blend_files()**: Zoekt recursief naar .blend bestanden
- **extract_metadata_from_filename()**: Extraheert tags en metadata uit bestandsnamen
- **extract_metadata_from_file()**: Analyseert .blend bestanden voor extra metadata
- **index_files()**: Voegt gevonden bestanden toe aan de ChromaDB collectie

#### Metadata Extractie
- Automatisch tags toekennen op basis van bestandsnaam (auto, kubus, bol, etc.)
- Bestandsstatistieken (grootte, aanmaakdatum, wijzigingsdatum)
- Optioneel: extractie van model-specifieke informatie via Blender API

### 4.3 Integratie met Web Interface

#### Zoek- en Filterfunctionaliteit
- Semantisch zoeken via vector embeddings
- Filtering op metadata zoals tags, datum en bestandsgrootte
- Resultaten weergeven in de ModelsList component
- Preview genereren voor de ModelViewer component

## 5. Communicatieprotocol in Detail

### 5.1 WebSocket Berichtformaat

#### Client naar Server (Request)
```json
{
  "type": "bpy_script",
  "code": "import bpy\n# Blender code hier..."
}
```

#### Server naar Client (Response)
```json
{
  "status": "ok",
  "details": "Code executed successfully"
}
```

of bij fouten:

```json
{
  "status": "error",
  "details": "Error executing code: <foutbericht>",
  "traceback": "<gedetailleerde Python traceback>"
}
```

### 5.2 Typische Communicatiesequentie

1. **Verbindingsopbouw**:
   - Client maakt WebSocket verbinding met ws://localhost:8765
   - Server accepteert verbinding en voegt client toe aan actieve clients

2. **Berichtenuitwisseling**:
   - Client stuurt JSON-object met `type` en `code` velden
   - Server ontvangt bericht en extract de Python/bpy code
   - Server voert code uit in een geïsoleerde namespace
   - Server vangt resultaten of fouten op

3. **Responsverwerking**:
   - Server formateert een JSON respons met status en details
   - Bij fouten wordt traceback toegevoegd aan de respons
   - Client ontvangt respons en verwerkt status informatie
   - Client toont feedback aan de gebruiker

4. **Verbindingsafsluiting**:
   - Client sluit verbinding na bericht verwerking
   - Server verwijdert client uit actieve verbindingen

## 6. Checkpointsysteem in Detail

### 6.1 Architectuur en Werking

#### Checkpoint Tools
- **create_checkpoint.py**: Algemeen script voor checkpointbeheer
- **checkpoint_blender_websocket_v1.py**: Script voor specifieke benoemde checkpoint

#### Checkpointstructuur
```
project/
├── checkpoints/                      # Centrale map voor alle checkpoints
│   ├── checkpoint_20250414_153205/   # Automatisch gegenereerde checkpoint
│   │   ├── blender_agent/
│   │   ├── alle bestanden...
│   │   └── checkpoint_info.json      # Metadata over de checkpoint
│   │
│   └── blender_websocket_v1_base/    # Benoemde checkpoint
│       ├── blender_agent/
│       ├── alle bestanden...
│       └── checkpoint_info.json
```

#### JSON Metadata
```json
{
  "name": "blender_websocket_v1_base",
  "created": "2025-04-14T15:32:05",
  "file_count": 24,
  "description": "Basis WebSocket implementatie met client en server",
  "files": [
    {"path": "blender_agent/websocket_server.py", "size": 5324},
    {"path": "test_client.py", "size": 3245},
    ...
  ]
}
```

### 6.2 Checkpointbeheer Functionaliteit

#### Commando's
- **checkpoint maken**: `python create_checkpoint.py`
- **lijst checkpoints**: `python create_checkpoint.py list`
- **checkpoint terugzetten**: `python create_checkpoint.py restore NAAM`
- **benoemde checkpoint**: `python checkpoint_blender_websocket_v1.py`

#### Intern Proces (checkpoint.py)
1. **Scannen**: Inventariseer alle bestanden in het project
2. **Filteren**: Selecteer relevante bestanden (exclusief grote/tijdelijke bestanden)
3. **Kopiëren**: Kopieer bestanden naar de checkpoint directory
4. **Metadata**: Genereer JSON metadata met timestamp en beschrijving

## 7. Installatie en Configuratie

### 7.1 Vereisten
- **Blender**: Versie 4.0+ met werkend Python
- **Python**: Versie 3.7+ met websockets, chromadb en andere dependencies
- **Node.js**: Versie 14+ en npm voor dashboard

### 7.2 Dependency Installatie

#### Python dependencies
```bash
pip install websockets chromadb flask
```

#### Blender Python dependencies
```bash
"C:\Program Files\Blender Foundation\Blender 4.4\4.4\python\bin\python.exe" -m pip install websockets
```
of via het `install_websockets.py` script van binnen Blender.

#### Dashboard dependencies
```bash
cd dashboard && npm install
```

### 7.3 Opstartsequentie

#### 1. Start Blender WebSocket Server
```bash
"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe" -b -P blender_agent/websocket_server.py
```

#### 2. Start Dashboard (optioneel)
```bash
cd dashboard && npm start
```

#### 3. Voer client scripts uit
```bash
python test_client.py
python create_3d_rings.py
```

### 7.4 Configuratieopties

#### Server configuratie (`blender_config.py`)
- `SERVER_HOST`: WebSocket server host (default: "localhost")
- `SERVER_PORT`: WebSocket server port (default: 8765)
- `BLENDER_EXECUTABLE`: Pad naar Blender executable
- `OUTPUT_DIR`: Directory voor het opslaan van gegenereerde bestanden

#### Dashboard configuratie (`dashboard/package.json`)
- Port: 3000 (default React port)
- Proxy instellingen voor ontwikkeling

## 8. Geavanceerde Toepassingen en Technieken

### 8.1 Automatisering van Complexe Blender Workflows

#### Scene optimalisatie
- Genereer scènes met optimale verlichting
- Configureer renderinstellingen voor hoge kwaliteit output
- Bouw complexe node-materialen via Python

#### Batch processing
- Verwerk meerdere modellen met één script
- Pas transformaties toe op grote sets objecten
- Genereer variaties met parametrische modellen

### 8.2 Dashboard 3D Visualisatie Techniek

#### Three.js Model Loading
1. Blender exporteert model naar glTF/glb formaat
2. Dashboard laadt model via `useLoader(GLTFLoader, url)`
3. Model wordt weergegeven met Three.js scene, camera en lighting

#### Live Model Data Updating
1. Client vraagt model data op via `getLiveModelData()`
2. Blender extraheert vertices, faces en materialen als JSON
3. Three.js scene wordt direct bijgewerkt met nieuwe geometrie
4. Geen bestandsopslag of reload nodig

### 8.3 AI-Integratie

#### Conversationele Interface
- Natural language chat interface voor modeloperaties
- Vertaling van natuurlijke taal naar Blender Python code
- Implementatie via Socket.IO voor realtime responses

#### Aankomende verbeteringen
- Integratie met GPT-4 voor codegeneratie
- Image-to-3D conversie met AI modellen
- Automatische materiaal en texture suggesties

## 9. Technische Details en Optimalisaties

### 9.1 Server Prestatie-overwegingen

#### Asyncio implementatie
- Non-blocking I/O met asyncio voor hoge concurrency
- Event-driven architectuur voor efficiënte resource gebruik
- Werkend op alle platforms (Windows, macOS, Linux)

#### Blender specifieke optimalisaties
- Geïsoleerde namespace voor code uitvoering (`exec()` met eigen locals)
- Fijnmazige error handling voor stabiliteit
- Minimalisering van main thread blocking voor responsiviteit

### 9.2 Client Bibliotheek Structuur

#### Modulaire opbouw
- `blender_client_lib.py`: Herbruikbare WebSocket client code
- `blender_config.py`: Centrale configuratie en paden
- `blender_utils.py`: Algemene hulpfuncties

#### Error handling
- Verbindingsfouten met duidelijke gebruikersfeedback
- Herverbindingspogingen met exponentiële backoff
- Traceback parsing voor gestructureerde foutmeldingen

### 9.3 Dashboard Architectuur Optimalisaties

#### Component Lifecycle
- Efficiënt gebruik van React hooks voor state management
- Geoptimaliseerde re-renders met memoization
- WebSocket connection pooling voor prestatie

#### Three.js Rendering
- Geoptimaliseerde scenegraph voor complexe modellen
- Lazy loading voor assets
- Canvas performantie optimalisaties

### 9.4 Beveiligingsoverwegingen

#### Huidige beperkingen
- Server accepteert en voert alle code uit zonder verificatie
- Geen authenticatie of autorisatie
- Bedoeld voor lokaal gebruik in vertrouwde omgeving

#### Aanbevolen verbeteringen (voor productie)
- Authenticatie toevoegen via tokens of gebruikersnamen/wachtwoorden
- Beperken van bpy API toegang tot veilige operaties
- Sandbox implementeren voor code uitvoering
- HTTPS/WSS voor versleutelde communicatie

## 10. Volledige Bestandsstructuur

```
project/
├── blender_agent/
│   └── websocket_server.py         # WebSocket server implementatie
├── blender_websocket_v1_base/      # Basis checkpoint voor dit project
├── dashboard/                      # React web applicatie
│   ├── public/
│   ├── src/
│   │   ├── components/             # React componenten
│   │   ├── pages/                  # Pagina componenten
│   │   ├── services/               # Service modules
│   │   └── App.js                  # Hoofdcomponent
│   └── package.json                # npm configuratie
├── checkpoints/                    # Checkpoints directory
├── output/                         # Output directory voor .blend bestanden
├── chroma_db/                      # ChromaDB vector database
├── blender_config.py               # Centrale configuratie
├── blender_client_lib.py           # Gedeelde client library
├── blender_utils.py                # Utility functies
├── blender_chroma_db.py            # ChromaDB wrapper
├── index_blender_files.py          # .blend indexering script
├── blender_web_interface.py        # Flask web interface
├── install_websockets.py           # Helper voor websockets installatie
├── create_checkpoint.py            # Checkpoint management tool
├── test_client.py                  # Basis test client
├── test_sphere.py                  # Sphere test client
├── save_scene.py                   # Scene opslag demo
├── create_doosletters.py           # Doosletters client
├── create_vertical_doosletters.py  # Verticale doosletters client
├── create_ozan_letters.py          # Ozan tekst client
├── create_ozan_with_profile.py     # Ozan met profiel client
├── create_simple_3d_rings.py       # Eenvoudige 3D ringen client
├── create_3d_rings.py              # Geavanceerde 3D ringen client
├── create_3d_car.py                # 3D auto client
└── create_3d_tree.py               # 3D boom client
```

## Conclusie
Dit systeem biedt een complete oplossing voor het op afstand aansturen van Blender via WebSockets. Het combineert een robuuste server in Blender, flexibele client scripts, een modern web dashboard, vector database integratie en een checkpointsysteem. De architectuur is modulair opgezet om eenvoudig te kunnen worden uitgebreid met nieuwe functionaliteiten zoals AI-integratie, verbeterde visualisatie of multi-user ondersteuning.

Met de gedetailleerde WebSocket protocol implementatie kunnen ontwikkelaars Blender aansturen vanuit elke taal die WebSockets ondersteunt. De React dashboard biedt een gebruiksvriendelijke interface voor eindgebruikers, terwijl de Python client scripts als referentie en bouwstenen dienen voor verdere automatisering.

De combinatie van deze componenten maakt het mogelijk om complexe 3D modellen en visualisaties te genereren, beheren en visualiseren zonder de Blender GUI te hoeven gebruiken, wat ideaal is voor automatisering, batch processing en integratie met web applicaties. 