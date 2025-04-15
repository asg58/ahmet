# Blender WebSocket ChromaDB Integratie

Deze uitbreiding voegt ChromaDB integratie toe aan het Blender WebSocket systeem, wat het mogelijk maakt om 3D modellen te indexeren, te zoeken en te beheren via een gebruiksvriendelijke web interface.

## Functies

- **Vectordatabase**: Gebruik ChromaDB om 3D modellen op te slaan en semantisch te zoeken
- **Automatische indexering**: Scan je projectmap om alle .blend bestanden automatisch te indexeren
- **Web interface**: Doorzoek en beheer je modellen via een gebruiksvriendelijke web-app
- **Metriek extractie**: Haal automatisch metadata uit bestandsnamen en -eigenschappen
- **API**: REST API voor integratie met andere tools

## Installatie

1. Installeer de benodigde afhankelijkheden:

```bash
pip install chromadb flask
```

2. Zorg ervoor dat je bestaande Blender WebSocket setup werkt (zie `blender_websocket_setup_samenvatting.md`)

## Gebruik

### Stap 1: Indexeer bestaande modellen

Voordat je de web interface gaat gebruiken, moet je eerst je bestaande .blend bestanden indexeren:

```bash
python index_blender_files.py
```

Opties:
- `--dir PATH`: Specificeer een andere directory om te scannen
- `--force`: Forceer herindexering van alle bestanden, ook als ze al geïndexeerd zijn
- `--collection NAME`: Specificeer een andere ChromaDB collectienaam

### Stap 2: Start de web interface

Start de web interface om door je modellen te bladeren en te zoeken:

```bash
python blender_web_interface.py
```

Opties:
- `--host HOST`: Specificeer het host adres (standaard: 127.0.0.1)
- `--port PORT`: Specificeer de poort (standaard: 5000)
- `--no-browser`: Voorkom dat de browser automatisch opent

### Programmeergebruik

Je kunt de ChromaDB database ook direct gebruiken in je eigen scripts:

```python
from blender_chroma_db import BlenderModelDB

# Maak een database client
db = BlenderModelDB()

# Zoek naar modellen
results = db.search_models("rode auto", n_results=5)

# Voeg een nieuw model toe
model_id = db.add_model(
    model_path="/pad/naar/model.blend",
    description="Een 3D model van een rode auto",
    metadata={
        "author": "Jouw Naam",
        "tags": ["auto", "rood", "transport"]
    }
)

# Haal alle modellen op
all_models = db.list_all_models()
```

## Modulestructuur

De ChromaDB integratie bestaat uit de volgende modules:

- `blender_client_lib.py`: Gedeelde client bibliotheek voor WebSocket communicatie
- `blender_config.py`: Centrale configuratie voor alle scripts
- `blender_utils.py`: Utility functies voor Blender-gerelateerde taken
- `blender_chroma_db.py`: ChromaDB wrapper voor het indexeren en zoeken van modellen
- `index_blender_files.py`: Script om bestaande .blend bestanden te indexeren
- `blender_web_interface.py`: Flask web-app voor het doorzoeken en beheren van modellen

## Beveiliging

Merk op dat de web interface bedoeld is voor lokaal gebruik. Voor gebruik in een productieomgeving moet je extra beveiligingsmaatregelen nemen, zoals:

- Een echte webserver gebruiken (zoals gunicorn of uwsgi)
- Een productie-ready Flask configuratie
- Authenticatie en autorisatie toevoegen
- HTTPS configureren

## Toekomstige uitbreidingen

Enkele ideeën voor toekomstige uitbreidingen:

- Een echte embedding model gebruiken in plaats van willekeurige vectoren
- Miniatuurweergaven genereren en tonen in de web interface
- Integratie met AI-modellen om beschrijvingen te genereren
- Ondersteuning voor filters op basis van objecttype, materialen, etc.
- Renderopdrachten direct vanuit de interface starten
- Bestanden uploaden en nieuwe modellen maken vanuit de interface

## Probleemoplossing

### Veelvoorkomende problemen

1. **Import fout met ChromaDB**:
   - Zorg ervoor dat je ChromaDB hebt geïnstalleerd: `pip install chromadb`

2. **Flask fout**:
   - Zorg ervoor dat Flask is geïnstalleerd: `pip install flask`
   - Controleer of de port niet al in gebruik is, probeer een andere poort

3. **Geen modellen gevonden**:
   - Controleer of je eerst `index_blender_files.py` hebt uitgevoerd
   - Controleer of er daadwerkelijk .blend bestanden in je projectmap staan

4. **Browser opent niet automatisch**:
   - Open handmatig: http://127.0.0.1:5000

### Logging en debugging

Voor meer debuginformatie kun je DEBUG logging inschakelen:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
``` 