# CorelDRAW Bridge Service

Deze service biedt een API voor communicatie met CorelDRAW via COM/VBA. Het maakt het mogelijk om rechtstreeks vanuit Node.js commando's uit te voeren in CorelDRAW.

## Vereisten

- Windows OS (10 of nieuwer aanbevolen)
- Node.js (v18 of nieuwer)
- npm (inbegrepen bij Node.js)
- CorelDRAW Graphics Suite (getest met versie X9 en nieuwer)

## Installatie

1. Clone de repository en navigeer naar de directory:

```bash
git clone https://github.com/uw-gebruikersnaam/uw-project.git
cd uw-project/integrations/coreldraw
```

2. Installeer dependencies:

```bash
npm install
```

3. Maak een `.env` bestand op basis van het `.env.example` bestand:

```bash
cp .env.example .env
```

4. Bewerk het `.env` bestand en stel de juiste waarden in:

```
PORT=3001
HOST=localhost
CORELDRAW_VERSION=24  # Uw CorelDRAW versie
CORELDRAW_PATH=C:\\Program Files\\Corel\\CorelDRAW Graphics Suite 24\\Programs\\CorelDRW.exe  # Pas dit aan
```

## Gebruik

### Service starten

Start de service met:

```bash
npm run dev
```

Of voor productiegebruik:

```bash
npm run build
npm start
```

### Endpoints

De service biedt de volgende endpoints:

#### Status endpoints

- `GET /api/status` - Controleert de algemene status van de bridge service
- `GET /api/status/coreldraw` - Controleert de verbinding met CorelDRAW
- `GET /api/status/details` - Geeft uitgebreide details over de bridge en CorelDRAW

#### Commando endpoints

- `POST /api/execute` - Voert VBA code uit in CorelDRAW
- `POST /api/document/new` - Maakt een nieuw CorelDRAW document
- `POST /api/document/save` - Slaat het actieve document op
- `POST /api/commands/create-rectangle` - Maakt een rechthoek in het actieve document

### Voorbeelden

#### VBA Code uitvoeren

```javascript
// Voorbeeld met fetch API
fetch('http://localhost:3001/api/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: `
      Sub HelloWorld()
        MsgBox "Hello World from CorelDRAW!"
      End Sub
      
      HelloWorld
    `
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

#### Rechthoek maken

```javascript
// Voorbeeld met axios
const axios = require('axios');

axios.post('http://localhost:3001/api/commands/create-rectangle', {
  x: 50,
  y: 50,
  width: 100,
  height: 50,
  fillColor: '#FF0000',
  outlineColor: '#000000',
  outlineWidth: 1
})
.then(response => console.log(response.data))
.catch(error => console.error('Error:', error));
```

## Mock Mode

Voor ontwikkeling zonder een actieve CorelDRAW-installatie kan je de service in mock mode starten:

```
MOCK_CORELDRAW=true npm run dev
```

## Troubleshooting

### COM Initialisatieproblemen

Als je problemen ondervindt met de COM-initialisatie, controleer dan:

1. Of CorelDRAW correct is geïnstalleerd
2. Of het pad naar CorelDRAW correct is ingesteld in het `.env` bestand
3. Of je Node.js met administratorrechten draait

### CorelDRAW start niet automatisch

Als CorelDRAW niet automatisch start:

1. Controleer het pad in het `.env` bestand
2. Start CorelDRAW handmatig en probeer dan opnieuw

## Licentie

Dit project is gelicenseerd onder de MIT-licentie - zie het LICENSE bestand voor details. 