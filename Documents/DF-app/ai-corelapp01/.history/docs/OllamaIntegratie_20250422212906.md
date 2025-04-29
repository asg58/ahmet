# Ollama Integration

Deze documentatie beschrijft de integratie met Ollama voor het gebruik van lokale LLM-modellen in de applicatie.

## Overzicht

De Ollama-integratie stelt de applicatie in staat om verschillende LLM-modellen te gebruiken voor verschillende taken, zoals het genereren van code, het analyseren van context en het beantwoorden van gebruikersvragen. Hierbij wordt automatisch het meest geschikte model geselecteerd op basis van het type taak.

## Installatie en configuratie van Ollama

### Vereisten
- Ollama geïnstalleerd op een toegankelijke server (lokaal of remote)
- Voldoende schijfruimte voor modellen (minimaal 10-15GB per groot model)
- Voldoende RAM (minimaal 8GB, aanbevolen 16GB+ voor grotere modellen)
- Een geschikte GPU voor betere prestaties (optioneel maar aanbevolen)

### Installatie van Ollama
1. Download Ollama vanaf [https://ollama.ai/download](https://ollama.ai/download)
2. Installeer volgens de instructies voor jouw besturingssysteem
3. Start Ollama (op Linux/Mac: `ollama serve`, op Windows start automatisch als service)

### Installatie van modellen
Om de benodigde modellen te installeren, gebruik je de volgende commando's:

```bash
# Primair model
ollama pull mistral-small:3.1

# Alternatieve modellen
ollama pull mistral
ollama pull llama3:8b
ollama pull phi3
```

### Configuratie in de applicatie
In het configuratiebestand `.env` moet de Ollama server URL worden ingesteld:

```
OLLAMA_HOST=localhost
OLLAMA_PORT=11434
```

## Beschikbare modellen

De volgende modellen zijn standaard geconfigureerd:

| Model | Beschrijving | Capaciteiten |
|-------|-------------|--------------|
| mistral-small:3.1 | Primair model voor alle taken (24B parameters) | code, context, creatief, wiskunde |
| mistral | Fallback model (7B parameters) | context, snel |
| llama3:8b | Alternatief snel model | snel, context |
| phi3 | Snel model voor eenvoudige vragen | snel |

### Mistral Small 3.1 Model

Het primaire model voor deze applicatie is Mistral Small 3.1, dat de volgende voordelen biedt:

- **Multimodale capaciteiten** - Kan zowel tekst als afbeeldingen verwerken
- **Grote contextvenster** - Ondersteunt tot 128K tokens
- **Uitstekende prestaties** - 24B parameter model met concurrerende prestaties t.o.v. grotere modellen
- **Efficiënte hardware vereisten** - Kan draaien op systemen met 16-32GB RAM (met kwantisatie)

## Taaktypes

De volgende taaktypes zijn gedefinieerd:

- `CODE_GENERATION`: Voor het genereren van code (bijv. VBA, Python)
- `CONTEXT_ANALYSIS`: Voor het analyseren van documentcontext
- `CREATIVE_CONTENT`: Voor het genereren van creatieve content
- `QUICK_RESPONSE`: Voor snelle reacties op eenvoudige vragen
- `MATH_REASONING`: Voor wiskundige redeneringen
- `DEFAULT`: Standaard taaktype als er geen specifiek type is opgegeven

## Monitoring en beheer

### Controleren van modelstatus
Je kunt de geïnstalleerde modellen controleren met:

```bash
ollama list
```

### Resource-gebruik
Ollama kan veel resources verbruiken, vooral bij het laden van meerdere grote modellen. Controleer:

- CPU-gebruik: `top` of `htop` op Linux/Mac, Taakbeheer op Windows
- GPU-gebruik: `nvidia-smi` voor NVIDIA GPU's
- RAM-gebruik: `free -h` op Linux, Activiteitenweergave op Mac, Taakbeheer op Windows

### Automatische modeloptimalisatie
De applicatie zal zelf het meest geschikte model selecteren op basis van de taak. Hierbij worden kleinere modellen gebruikt voor niet-complexe taken om resources te sparen.

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
  "name": "mistral-small:3.1",
  "description": "Primair model voor alle taken",
  "capabilities": ["code", "context", "creative", "math"],
  "parameters": { 
    "temperature": 0.7, 
    "top_p": 0.9 
  }
}
```

### Toewijzen van modellen aan taken

Beheerders kunnen specificeren welk model voor welke taak moet worden gebruikt:

```http
POST /api/ollama/tasks/code_generation/model/mistral-small:3.1
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

1. Probeer het voorkeurmodel voor de taak (mistral-small:3.1)
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
- Voor complexe taken wordt het primaire Mistral Small 3.1 model gebruikt dat alle taaktypes efficiënt kan uitvoeren 