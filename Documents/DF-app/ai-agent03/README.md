# Blender WebSocket Toolkit

Dit project bevat diverse hulpmiddelen voor het werken met Blender via WebSockets.

## Componenten

1. **blender_agent/websocket_server.py** - WebSocket server die in Blender draait
2. **test_client.py** - Test client om verbinding te maken met de Blender WebSocket server
3. **create_checkpoint.py** - Script om checkpoints van je configuratie te maken
4. **checkpoint_blender_websocket_v1.py** - Script om een specifieke checkpoint te maken van de huidige setup
5. **create_client_template.py** - Generator voor nieuwe Blender WebSocket client scripts

## Gebruik

### WebSocket Server starten

```bash
blender --python blender_agent/websocket_server.py
```

### Test Client gebruiken

```bash
python test_client.py
```

### Checkpoint maken

```bash
python checkpoint_blender_websocket_v1.py
```

### Nieuw client script maken

```bash
python create_client_template.py mijn_nieuwe_client "Beschrijving van het project"
```

Dit maakt een nieuw Python script met alle benodigde code om te communiceren met de Blender WebSocket server. Het nieuwe script kan direct gebruikt worden om een eenvoudige kubus in Blender te maken en de scene op te slaan.

## Documentatie

Voor meer informatie zie:
- blender_websocket_handleiding.md
- blender_websocket_setup_samenvatting.md

## Project Tracking
Dit project gebruikt een geautomatiseerd tracking systeem dat:
- De project context bijhoudt in `PROJECT_CONTEXT.md`
- Een changelog bijhoudt in `CHANGELOG.md`
- Automatisch updates maakt bij elke commit
- Wijzigingen categoriseert en documenteert

Deze documentatie wordt automatisch bijgewerkt door het tracking systeem. 