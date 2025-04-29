# Bridge Architectuur voor Design Software Integraties

Dit document beschrijft de architectuur van de bridge services voor CorelDRAW en Blender integratie.

## Overzicht

De architectuur van dit project maakt gebruik van bridge services om te communiceren met design software zoals CorelDRAW en Blender. Deze aanpak biedt verschillende voordelen:

1. **Scheiding van belangen**: De hoofdapplicatie hoeft niet direct te communiceren met de design software
2. **Platformonafhankelijkheid**: De hoofdapplicatie kan containerized blijven terwijl de bridges op het host-systeem draaien
3. **Consistente API**: Zowel CorelDRAW als Blender bieden dezelfde API interface naar de hoofdapplicatie
4. **Foutafhandeling**: Fouten worden afgehandeld en gerapporteerd op een consistente manier
5. **Mock-modus**: Bridges kunnen in mock-modus draaien voor ontwikkeling zonder de echte software

## Architectuur Diagram

```
┌─────────────────────────────┐     ┌────────────────────────────────────┐
│       Docker Container      │     │            Host Machine             │
│                             │     │                                     │
│ ┌─────────────────────────┐ │     │ ┌────────────────┐ ┌─────────────┐ │
│ │                         │ │     │ │  CorelDRAW     │ │             │ │
│ │       NestJS API        │ │     │ │  Bridge        │ │  CorelDRAW  │ │
│ │                         │ │     │ │  (Node.js/     │ │             │ │
│ │ ┌─────────────────────┐ │ │ HTTP│ │   Express)     │ │             │ │
│ │ │ CorelDrawService    │◀┼─┼─────┼▶│                │◀┼▶            │ │
│ │ └─────────────────────┘ │ │     │ └────────────────┘ └─────────────┘ │
│ │                         │ │     │                                     │
│ │ ┌─────────────────────┐ │ │ HTTP│ ┌────────────────┐ ┌─────────────┐ │
│ │ │ BlenderService      │◀┼─┼─────┼▶│  Blender       │ │             │ │
│ │ └─────────────────────┘ │ │     │ │  Bridge        │ │   Blender   │ │
│ │                         │ │     │ │  (Python/      │ │             │ │
│ └─────────────────────────┘ │     │ │   Flask)       │◀┼▶            │ │
│                             │     │ └────────────────┘ └─────────────┘ │
└─────────────────────────────┘     └────────────────────────────────────┘
                                    
```

## Bridge Componenten

### 1. CorelDRAW Bridge

De CorelDRAW Bridge is een Node.js applicatie die communiceert met CorelDRAW via COM/VBA:

- **Technologie**: Node.js, Express, node-win32ole
- **Communicatieprotocol**: HTTP RESTful API
- **Primaire interface**: VBA code uitvoeren
- **Specifieke endpoints**: Maken van vormen, toepassen van materialen, etc.

### 2. Blender Bridge

De Blender Bridge is een Python applicatie die communiceert met Blender via de Python API:

- **Technologie**: Python, Flask
- **Communicatieprotocol**: HTTP RESTful API 
- **Primaire interface**: Python code uitvoeren
- **Specifieke endpoints**: Maken van 3D objecten, materialen toepassen, renderen, etc.

## Datastromen

### Commando Uitvoeren

1. Client dient een commando in via de API
2. NestJS server ontvangt het commando en valideert het
3. `SoftwareService` bepaalt de doelsoftware (CorelDRAW of Blender)
4. `CorelDrawService` of `BlenderService` stuurt het commando naar de juiste bridge
5. Bridge ontvangt het commando en zet het om naar software-specifieke code (VBA of Python)
6. Bridge voert de code uit in de doelsoftware
7. Resultaat wordt teruggegeven aan de bridge, dan naar de service, en uiteindelijk naar de client

### Context Verzamelen

1. Server vraagt om context informatie
2. Service stuurt verzoek naar de bridge
3. Bridge verzamelt informatie uit de doelsoftware
4. Informatie wordt geserialiseerd en teruggegeven aan de service
5. Service verwerkt de context informatie voor gebruik in de applicatie

## API Overeenkomsten

Beide bridges implementeren een vergelijkbare API die deze endpoints omvat:

- `GET /api/status` - Status van de bridge
- `GET /api/status/{software}` - Status van de doelsoftware
- `POST /api/execute` - Voer code uit (VBA of Python)
- `POST /api/commands/{command}` - Voer specifieke commando's uit

## Error Handling

Alle API endpoints gebruiken een consistente structuur voor foutmeldingen:

```json
{
  "success": false,
  "error": "Gedetailleerde foutmelding",
  "code": "ERROR_CODE"
}
```

Foutcodes worden gecategoriseerd:
- `CONNECTION_ERROR` - Problemen met verbinding naar de software
- `EXECUTION_ERROR` - Fouten bij het uitvoeren van code
- `VALIDATION_ERROR` - Ongeldige parameters
- `NOT_FOUND_ERROR` - Resource niet gevonden

## Configuratie

Beide bridges worden geconfigureerd via `.env` bestanden met de volgende parameters:

- `PORT` - Poort waarop de bridge luistert
- `HOST` - Hostname/IP waarop de bridge luistert
- `{SOFTWARE}_PATH` - Pad naar de executable van de doelsoftware
- `DEBUG` - Debug mode aan/uit
- `MOCK_MODE` - Mock mode aan/uit
- `LOG_LEVEL` - Logging niveau

## Authenticatie en Beveiliging

Momenteel gebruiken de bridges geen authenticatie, maar het is voorzien in de toekomst:

- API sleutels via de `API_KEY` omgevingsvariabele
- CORS-beveiliging voor client-side aanroepen
- Rate limiting voor API bescherming

## Toekomstige Uitbreidingen

1. **WebSocket ondersteuning** - Voor real-time updates en event-driven architectuur
2. **Betere authenticatie** - JWT en rolgebaseerde toegangscontrole
3. **Cluster-ondersteuning** - Meerdere instanties van dezelfde software beheren
4. **Event abonnementen** - Luisteren naar gebeurtenissen in de doelsoftware
5. **Caching** - Prestaties verbeteren door veelgebruikte commando's te cachen

## Conclusie

Deze bridge architectuur biedt een flexibele en robuuste manier om te integreren met design software, terwijl de hoofdapplicatie onafhankelijk en containerized kan blijven. Het biedt een uniforme interface voor verschillende softwarepakketten en maakt het mogelijk om toekomstige integraties toe te voegen zonder ingrijpende wijzigingen in de kernarchitectuur. 