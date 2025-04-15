# Blender WebSocket Project - Developer Guide

## Quickstart
```bash
# 1. Start de Blender WebSocket server
"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe" -b -P blender_agent/websocket_server.py

# 2. Start de web interface (optioneel)
python blender_web_interface.py

# 3. Test de verbinding (optioneel)
python test_client.py
```

## Projectdoel
Dit project biedt een WebSocket-gebaseerde communicatie tussen externe applicaties en Blender. Het stelt je in staat om Blender op afstand aan te sturen zonder de GUI te gebruiken, wat ideaal is voor automatisering, batch processing en integratie met web-interfaces.

## Kerncomponenten & Dataflow

```
[Externe Client]  <--- WebSocket (JSON) --->  [Blender WebSocket Server]  --->  [Blender Engine]
     |                                                                             ^
     |                                                                             |
     v                                                                             |
[Web Interface]  <------  Flask/ChromaDB  -----  [Vector Database] -- Indexering --+
```

### 1. Core Module: WebSocket Server (`blender_agent/websocket_server.py`)
- **Functie**: Kern van het systeem, draait binnen Blender en voert code uit
- **Endpoint**: `ws://localhost:8765`
- **Protocol**: JSON berichten met `{"type": "bpy_script", "code": "import bpy..."}` formaat
- **Implementatie**: Asyncio WebSocket server die Python code uitvoert in Blender context

### 2. Web Interface (`blender_web_interface.py`)
- **Functie**: Flask webapplicatie voor beheer en visualisatie van 3D modellen
- **Features**: Zoeken, filteren, metadata weergeven, modellen openen in Blender
- **Integratie**: Werkt samen met de ChromaDB vector database

### 3. Database Integratie (`blender_chroma_db.py`)
- **Functie**: Semantisch zoeken van 3D modellen en metadata opslag
- **Implementatie**: ChromaDB wrapper voor vector embeddings en metadataopslag
- **Indexering**: Via `index_blender_files.py` voor het scannen en indexeren van .blend bestanden

### 4. Testscripts en Voorbeelden
- **Functie**: Demonstreren hoe externe clients met de server communiceren
- **Voorbeelden**: Diverse scripts zoals `test_client.py`, `create_3d_car.py`, etc.
- **Status**: Deze scripts zijn voorbeelden/tests, niet de kernarchitectuur

## Interne Werking & Conventies

### Client-Server Communicatie
1. Client maakt WebSocket verbinding met server
2. Client stuurt JSON bericht met `"type": "bpy_script"` en `"code": "<Python code>"`
3. Server voert code uit in Blender context
4. Server stuurt JSON respons met status en details

### WebSocket Berichtformaat
- **Request**: `{"type": "bpy_script", "code": "import bpy..."}`
- **Response**: `{"status": "ok|error", "details": "...", ["traceback": "..."]}`

### Checkpointsysteem
- `create_checkpoint.py`: Maakt snapshot van huidige projectstatus
- `checkpoints/`: Bevat alle historische project-versies
- Elk checkpoint bevat metadata in `checkpoint_info.json`

## Automatisch Guide Raadplegen

Om er zeker van te zijn dat alle wijzigingen in lijn zijn met de architectuur en conventies, is een systeem geïmplementeerd om de Developer Guide automatisch te raadplegen:

### Context Helper (`context_helper.py`)
```python
import os
import re

class ContextHelper:
    """
    Hulpklasse voor het automatisch lezen van de Developer Guide
    om context te krijgen voor code wijzigingen
    """
    
    def __init__(self, guide_path="DEVELOPER_GUIDE.md"):
        self.guide_path = guide_path
        self.guide_content = self._read_guide()
        
    def _read_guide(self):
        """Laad de inhoud van de guide"""
        if os.path.exists(self.guide_path):
            with open(self.guide_path, 'r', encoding='utf-8') as f:
                return f.read()
        return ""
    
    def get_component_info(self, component_name):
        """Zoek informatie over een specifieke component"""
        pattern = rf"### \d+\.\s+.*{component_name}.*?$(.*?)(?=^###|\Z)"
        match = re.search(pattern, self.guide_content, re.MULTILINE | re.DOTALL)
        return match.group(1).strip() if match else ""
    
    def get_workflow(self, workflow_name):
        """Haal informatie op over een specifieke workflow"""
        pattern = rf"### \d+\.\s+.*{workflow_name}.*?$(.*?)(?=^###|\Z)"
        match = re.search(pattern, self.guide_content, re.MULTILINE | re.DOTALL)
        return match.group(1).strip() if match else ""
    
    def validate_against_guide(self, code_path, code_content):
        """
        Valideer code tegen de Developer Guide om te waarborgen
        dat het voldoet aan de architectuur en conventies
        """
        # Implementatie: check patterns, naming conventions, etc.
        pass
```

### Gebruik in Scripts
Om de context helper te gebruiken in een script:

```python
from context_helper import ContextHelper

# Helper initialiseren
context = ContextHelper()

# Informatie over een component opvragen
server_info = context.get_component_info("WebSocket Server")
print(f"Server info uit guide: {server_info}")

# Workflow informatie opvragen
workflow = context.get_workflow("Server Starten")
print(f"Workflow instructies: {workflow}")
```

### Pre-commit Hook Integratie
Het is aanbevolen om een Git pre-commit hook te implementeren die automatisch wijzigingen valideert tegen de guide:

```bash
#!/bin/bash
# .git/hooks/pre-commit

python scripts/validate_against_guide.py
if [ $? -ne 0 ]; then
    echo "Wijzigingen voldoen niet aan de Developer Guide richtlijnen"
    exit 1
fi
```

## Web Applicatie Structuur

### Flask Routes
- `/`: Homepage met zoekfunctionaliteit en tags
- `/search`: Zoekresultaten pagina
- `/models`: Lijst met alle geïndexeerde modellen
- `/model/<model_id>`: Detail weergave van een specifiek model
- `/open_model/<model_id>`: Open model in Blender
- `/api/models` & `/api/search`: JSON API endpoints

### Templates
- `base.html`: Basis template met navigatie en layout
- `index.html`: Homepage met zoekinterface
- `search_results.html`: Weergave van zoekresultaten
- `all_models.html`: Overzicht van alle modellen
- `model_details.html`: Detailweergave van een model

## Common Workflows

### 1. Server Starten en Testen
```bash
# Start de server
"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe" -b -P blender_agent/websocket_server.py

# Test de server
python test_client.py
```

### 2. Modellen Indexeren en Doorzoeken
```bash
# Indexeer .blend bestanden
python index_blender_files.py --dir path/to/models

# Start web interface
python blender_web_interface.py
```

### 3. Checkpoint Maken
```bash
python create_checkpoint.py
```

### 4. Guide Raadplegen Vanuit Code
```bash
# Voor informatie over een component
python -c "from context_helper import ContextHelper; print(ContextHelper().get_component_info('WebSocket Server'))"

# Voor werkstroom informatie
python -c "from context_helper import ContextHelper; print(ContextHelper().get_workflow('Checkpoint'))"
```

## Troubleshooting & Debugging

### Server Connection Issues
- Controleer of Blender draait met de WebSocket server
- Controleer poort 8765 (niet geblokkeerd door firewall)
- Controleer websockets package installatie in Blender Python omgeving

### Code Execution Errors
- Check de traceback in server response
- Valideer je Blender Python code eerst in Blender zelf
- Gebruik `print()` statements in Blender code (output verschijnt in server terminal)

### Web Interface Issues
- Controleer of templates directory correct is geconfigureerd
- Zorg dat ChromaDB correct is geïnstalleerd en geïnitialiseerd

### Guide Parsing Issues
- Zorg dat de `context_helper.py` de juiste regex patterns gebruikt
- Controleer of koppen in de guide consistent geformatteerd zijn voor regex matching
- Bij problemen met bepaalde secties, voeg expliciete markers toe voor betere detectie

## Security Considerations
- **Belangrijk**: Server voert alle ontvangen Python code uit zonder verificatie
- Alleen gebruiken in vertrouwde lokale omgeving
- Voor productie: authenticatie toevoegen (niet geïmplementeerd)
- Voor productie: API toegang beperken tot veilige operaties

## De Developer Guide Onderhouden

### Bijwerken van de Guide
1. **Consistentie**: Gebruik consistente koppenstructuur (`#`, `##`, `###`) voor automatische parsing
2. **Markeringen**: Voeg expliciete markeringen toe (`<!-- START COMPONENT: naam -->`) voor belangrijke secties
3. **Validatie**: Voer `python scripts/verify_guide.py` uit na wijzigingen om parseerbaarheid te controleren
4. **Incheckproces**: Voer altijd wijzigingen door in zowel code als de bijbehorende guide secties

### Developer Guide Conventies
- Houd componentbeschrijvingen compact maar informatief
- Lijst belangrijke methoden/eigenschappen expliciet op
- Gebruik lijstitems (`-`) voor betere leesbaarheid
- Gebruik codeblokken voor API voorbeelden
- Vermijd duplicatie van informatie

## Bestandsstructuur Quick Reference
- `blender_agent/websocket_server.py`: Server implementatie
- `blender_web_interface.py`: Web interface
- `blender_chroma_db.py`: ChromaDB wrapper
- `index_blender_files.py`: .blend indexering script
- `blender_config.py`: Centrale configuratie
- `test_client.py`: Basis test client
- `context_helper.py`: Helper voor guide raadpleging
- `scripts/verify_guide.py`: Validatiescript voor guide formaat
- `scripts/validate_against_guide.py`: Pre-commit validatie
- `checkpoints/`: Versie snapshots
- `templates/`: HTML templates
- `static/`: CSS, JavaScript, afbeeldingen 