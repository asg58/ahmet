# Blender Bridge Service

Deze service biedt een API voor communicatie met Blender via de Python API. Het maakt het mogelijk om commando's uit te voeren in Blender en resultaten terug te krijgen.

## Vereisten

- Python 3.8 of nieuwer
- Flask en bijbehorende packages
- Blender 2.8 of nieuwer (geïnstalleerd op het hostsysteem)

## Installatie

1. Clone de repository en navigeer naar de directory:

```bash
git clone https://github.com/uw-gebruikersnaam/uw-project.git
cd uw-project/integrations/blender
```

2. Installeer dependencies:

```bash
pip install -r app/requirements.txt
```

3. Maak een `.env` bestand op basis van het `.env.example` bestand:

```bash
cp .env.example .env
```

4. Bewerk het `.env` bestand en stel de juiste waarden in:

```
PORT=4201
HOST=0.0.0.0
BLENDER_PATH=C:\\Program Files\\Blender Foundation\\Blender 3.6\\blender.exe  # Pas dit aan naar je Blender pad
```

## Gebruik

### Service starten

Start de service met:

```bash
cd app
python server.py
```

### Docker Container (Mock Mode)

Je kunt de Blender Bridge ook in een Docker container draaien in mock mode:

```bash
docker-compose -f docker-compose.blender.yml up -d
```

Let op: In Docker mode kan de service geen verbinding maken met het echte Blender, omdat Blender een GUI-applicatie is die niet goed in Docker containers werkt. In plaats daarvan werkt het in mock mode.

### Endpoints

De service biedt de volgende endpoints:

#### Status endpoints

- `GET /api/status` - Controleert de algemene status van de bridge service
- `GET /api/status/blender` - Controleert de verbinding met Blender

#### Commando endpoints

- `POST /api/execute` - Voert Python code uit in Blender
- `POST /api/object/create_cube` - Maakt een kubus in Blender
- `POST /api/object/create_sphere` - Maakt een bol in Blender
- `POST /api/material/apply` - Past een materiaal toe op een object
- `POST /api/texture/add` - Voegt een textuur toe aan een materiaal
- `POST /api/render/scene` - Rendert de huidige scene
- `GET /api/scene/get_objects` - Haalt alle objecten in de scene op
- `GET /api/commands/available` - Krijg een lijst van beschikbare commando's

### Voorbeelden

#### Python Code uitvoeren

```javascript
// Voorbeeld met fetch API
fetch('http://localhost:4201/api/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: `
import bpy
print("Hello from Blender Python, version:", bpy.app.version_string)
    `
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

#### Kubus maken

```javascript
fetch('http://localhost:4201/api/object/create_cube', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    location: [0, 0, 0],
    size: 2.0,
    name: 'MyCube'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

#### Materiaal toepassen

```javascript
fetch('http://localhost:4201/api/material/apply', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    object_name: 'MyCube',
    material_name: 'RedMaterial',
    color: [1.0, 0.0, 0.0, 1.0],  // Rood
    metallic: 0.7,
    roughness: 0.2
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

## Mock Mode

Voor ontwikkeling zonder een Blender-installatie kan je de service in mock mode starten:

```
MOCK_BLENDER=true python server.py
```

Dit is handig voor het testen van de API-integratie zonder afhankelijk te zijn van een werkende Blender-instantie.

## Troubleshooting

### Blender start niet

Als Blender niet automatisch start:

1. Controleer het pad in het `.env` bestand
2. Zorg ervoor dat Blender beschikbaar is in je PATH
3. Start Blender handmatig en probeer dan opnieuw

### Blender sluit onverwacht

Het kan voorkomen dat Blender sluit vanwege specifieke Python-scriptfouten. Controleer:

1. De blender_bridge.log voor specifieke foutmeldingen
2. Zorg ervoor dat je Python code compatibel is met je Blender versie

## Licentie

Dit project is gelicenseerd onder de MIT-licentie - zie het LICENSE bestand voor details. 