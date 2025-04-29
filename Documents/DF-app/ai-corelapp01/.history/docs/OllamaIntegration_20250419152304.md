# Ollama Integration

Deze documentatie beschrijft de integratie met Ollama voor het gebruik van lokale LLM-modellen in de applicatie.

## Overzicht

De Ollama-integratie stelt de applicatie in staat om verschillende LLM-modellen te gebruiken voor verschillende taken, zoals het genereren van code, het analyseren van context en het beantwoorden van gebruikersvragen. Hierbij wordt automatisch het meest geschikte model geselecteerd op basis van het type taak.

## Beschikbare modellen

De volgende modellen zijn standaard geconfigureerd:

| Model | Beschrijving | Capaciteiten |
|-------|-------------|--------------|
| llama3 | Algemeen model voor de meeste taken | context, creatief |
| llama3:8b | Snel algemeen model | snel |
| llama3:70b | High-capability model voor complexe taken | context, creatief, wiskunde |
| codeqwen:14b-q4_K_M | Gespecialiseerd voor codegeneratie | code, wiskunde |
| mixtral | Creatieve content generatie | creatief, context |
| phi3 | Snelle antwoorden voor eenvoudige vragen | snel |

## Taaktypes

De volgende taaktypes zijn gedefinieerd:

- `CODE_GENERATION`: Voor het genereren van code (bijv. VBA, Python)
- `CONTEXT_ANALYSIS`: Voor het analyseren van documentcontext
- `CREATIVE_CONTENT`: Voor het genereren van creatieve content
- `QUICK_RESPONSE`: Voor snelle reacties op eenvoudige vragen
- `MATH_REASONING`: Voor wiskundige redeneringen
- `DEFAULT`: Standaard taaktype als er geen specifiek type is opgegeven

## Gebruik in de applicatie

### Automatische modelselectie

In plaats van handmatig een model te specificeren, kun je de task-based API gebruiken:

```typescript
// In SoftwareService
const response = await this.ollamaService.chatCompletionForTask(
  messages,
  TaskType.CODE_GENERATION,
  { temperature: 0.2 }
);
```

### Modelconfiguratie

Beheerders kunnen modelconfiguraties bijwerken via de API:

```http
POST /api/ollama/models/config
Content-Type: application/json

{
  "name": "llama3",
  "description": "Algemeen model voor de meeste taken",
  "capabilities": ["context", "creative"],
  "parameters": { 
    "temperature": 0.7, 
    "top_p": 0.9 
  }
}
```

### Toewijzen van modellen aan taken

Beheerders kunnen specificeren welk model voor welke taak moet worden gebruikt:

```http
POST /api/ollama/tasks/code_generation/model/codeqwen:14b-q4_K_M
```

## API Endpoints

### Model beheer

- `GET /api/ollama/models` - Lijst van alle beschikbare modellen op de Ollama-server
- `GET /api/ollama/models/refresh` - Ververs de lijst van beschikbare modellen
- `GET /api/ollama/models/configured` - Lijst van geconfigureerde modellen
- `GET /api/ollama/models/:modelName` - Informatie over een specifiek model
- `POST /api/ollama/models/config` - Update modelconfiguratie
- `POST /api/ollama/tasks/:taskType/model/:modelName` - Wijs een model toe aan een taaktype

### Chat-completion

- `POST /api/ollama/chat` - Standaard chat completion met een specifiek model
- `POST /api/ollama/chat/task/:taskType` - Chat completion met automatische modelselectie op basis van taaktype

## Fallback mechanisme

Als het gewenste model niet beschikbaar is, wordt het volgende fallback mechanisme gebruikt:

1. Probeer het voorkeurmodel voor de taak
2. Als dat niet beschikbaar is, zoek een model met de juiste capaciteiten voor de taak
3. Als laatste redmiddel, gebruik elk beschikbaar model

## Uitbreiden met nieuwe modellen

Om nieuwe modellen toe te voegen:

1. Zorg ervoor dat het model in Ollama is geïnstalleerd (`ollama pull modelname`)
2. Voeg een modelconfiguratie toe via de API
3. Koppel het model aan de relevante taaktypes

## Voorbeeldgebruik

### Code genereren voor CorelDRAW

```typescript
const messages = [
  { role: 'system', content: 'Je bent een expert in CorelDRAW VBA programmering.' },
  { role: 'user', content: 'Genereer code om een rode rechthoek te maken.' }
];

const response = await ollamaService.chatCompletionForTask(
  messages,
  TaskType.CODE_GENERATION
);
```

### Snelle antwoorden op gebruikersvragen

```typescript
const messages = [
  { role: 'user', content: 'Wat is de sneltoets om te ongedaan te maken in Blender?' }
];

const response = await ollamaService.chatCompletionForTask(
  messages,
  TaskType.QUICK_RESPONSE
);
```

## Prestatie-optimalisaties

- Voor snelle interacties wordt automatisch een kleiner model gebruikt zoals llama3:8b of phi3
- Voor complexe taken zoals contextanalyse wordt een groter model gebruikt zoals llama3:70b
- Voor codegeneratie wordt een gespecialiseerd model gebruikt zoals codeqwen:14b-q4_K_M 