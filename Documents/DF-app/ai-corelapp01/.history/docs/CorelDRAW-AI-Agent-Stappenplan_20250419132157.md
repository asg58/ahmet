# AI Design Agent Implementatieplan

## Projectoverzicht
- **Startdatum:** [Ingevuld]
- **Beoogde einddatum:** [Vul in]
- **Projectleider:** [Vul in]
- **Status:** In uitvoering

## Doel
Een volledig conversationele AI-agent ontwikkelen die zowel CorelDRAW als Blender kan aansturen via natuurlijke taalinteractie. De agent moet in staat zijn alle communicatie uit te voeren en te vertalen naar de juiste acties binnen de ontwerpsoftware, zonder afhankelijk te zijn van vooraf gedefinieerde commando's. Het systeem maakt gebruik van lokale Ollama LLM-modellen voor offline functionaliteit en privacy.

## Architectuuroverzicht

```
[Browser Client]
   │  React + Tailwind + R3F/Three.js
   │  ├── Chat UI
   │  └── 3D Viewer
   ▼
[API Gateway / WebSocket Server]
   │  Node.js (Express/NestJS) of Python (FastAPI)
   │     • REST ↑↓ voor settings, project‑metadata
   │     • WebSocket ↔ voor real‑time chat & status
   ▼
[Orchestrator Service]
   │  • Intent router: NLP (Llama 3.2 11B)
   │  • Codegen dienst: CodeQwen 1.5‑14B
   │  • Validatie dienst: DeepSeek Coder 7B (optioneel)
   │  • ChromaDB voor vector embeddings en contextopslag
   │  • Model hosting via Ollama/HF Accelerate
   ▼
┌───────────────────────────┬────────────────────────────┐
│  Blender Integration      │  CorelDRAW Integration     │
│  • Headless Blender met   │  • Windows COM/VSTA‑server │
│    WebSocket‑API          │    + WebSocket wrapper     │
│  • Python scripts luistert│  • Exposeert design‑API    │
│    op socket, ontvangt    │    (createCircle, setFill) │
│    code‑snippets          │                            │
└───────────────────────────┴────────────────────────────┘
```

## Recent Voltooide Implementaties

### Software Command Services Framework
- [x] **SoftwareCommandService**: Hoofdservice voor coördinatie en routering van commands
- [x] **CorelDrawCommandsService**: Specifieke commands voor CorelDRAW implementatie
- [x] **BlenderCommandsService**: Specifieke commands voor Blender implementatie
- [x] **CommandFactoryService**: Dynamische routering en integratie van command services

Deze architectuur biedt:
- Platform-agnostische command executie
- Gestructureerde error handling
- Uitbreidbare command structuur voor toekomstige integraties

---

## Fase 1: Voorbereiding en Infrastructuur
**Planning:** Week 1-2
**Status:** Voltooid

### 1.1 Ontwikkelomgeving opzetten
- [x] Visual Studio Code of gelijkwaardige IDE installeren
- [x] Git repository opzetten voor versiebeheer
- [x] Docker en Docker Compose installeren voor containerization
- [x] Projectstructuur definiëren (Client, Server, Core, Services)
- **Technologieën:** Node.js, TypeScript, Docker, Git
- **Opmerkingen:** Basisstructuur is opgezet met mappen voor client, server, en andere componenten

### 1.2 Ollama installatie en modelconfiguratie
- [x] Ollama installeren: https://ollama.com/download
- [x] Intent Router model installeren: `ollama pull llama3.2:11b-q4_K_M`
- [x] Code Generator model installeren: `ollama pull codeqwen:14b-q4_K_M`
- [x] Validatie model installeren: `ollama pull deepseek-coder:7b-q4_K_M`
- [x] Ollama API Docker-container configureren
- [x] Test de API-toegang: `curl http://localhost:11434/v1/chat/completions`
- [x] Configureer Ollama met juiste parameters (OLLAMA_HOST="0.0.0.0" voor netwerktoegang)
- **Kwantisatie:** Q4_K_M voor optimale balans tussen prestaties en geheugengebruik
- **Opmerkingen:** Ollama configuratie is opgenomen in docker-compose.yml

### 1.3 Docker Infrastructuur opzetten
- [x] Docker Compose file creëren voor alle componenten
- [x] Ollama container configureren met persistent storage
- [x] ChromaDB container configureren voor vectoropslag
- [x] Front-end Next.js container opzetten
- [x] API Gateway container configureren
- [x] Development en productie omgevingen definiëren
- **Technologieën:** Docker, Docker Compose, Docker Volumes
- **Opmerkingen:** Docker Compose configuratie gemaakt met vier containers: client, server, ollama en chromadb

### 1.4 Design Software API onderzoek voltooien
- [x] CorelDRAW API-documentatie verzamelen
- [x] Blender Python API-documentatie verzamelen
- [x] Sleutelklassen en methoden voor beide platformen identificeren
- [x] Gemeenschappelijke ontwerpconcepten tussen beide platformen in kaart brengen
- [x] API voorbeelden verzamelen voor ChromaDB indexering
- **Opmerkingen:** API Documentatie voor beide platforms is verzameld en geïndexeerd in ChromaDB

---

## Fase 2: Core Componenten Ontwikkelen
**Planning:** Week 3-5
**Status:** In uitvoering

### 2.1 Front-end client ontwikkelen
- [x] Next.js project initialiseren met TypeScript
- [x] Tailwind CSS en shadcn/ui integreren
- [x] Chat UI componenten implementeren
- [x] React Three Fiber (R3F) opzetten voor 3D viewer
- [x] Zustand state management instellen
- [x] WebSocket client implementeren voor real-time communicatie
- **Technologieën:** Next.js, React, TypeScript, Tailwind CSS, shadcn/ui, R3F, Zustand
- **Opmerkingen:** Basis front-end structuur opgezet met homepage en chat pagina

### 2.2 UniversalObjectModelNavigator implementeren
- [ ] Flexibele interface voor meerdere applicaties definiëren
- [ ] Applicatie-agnostische objectpad-navigatie implementeren
- [ ] Dynamische property/method invocation bouwen
- [ ] Multi-platform code executie mechanisme toevoegen
- **Technologieën:** TypeScript/Python, REST API
- **Opmerkingen:** Basis stuctures zijn opgezet maar de implementatie moet nog worden voltooid

### 2.3 ChromaDB vectordatabase opzetten
- [x] ChromaDB container configureren en initialiseren
- [x] API-documentatie embeddings genereren en indexeren
- [x] Conversatiecontext embeddings implementeren
- [x] Retrieval-augmented generation (RAG) workflow opzetten
- [x] Integratie met Ollama modellen
- **Technologieën:** ChromaDB, Python, embeddings-modellen
- **Opmerkingen:** ChromaDB services geïmplementeerd met volledige functionaliteit

### 2.4 IntentRecognitionSystem met Llama 3.2
- [x] Basis natuurlijke taalinterpretatie bouwen
- [x] Initiële intentie-naar-actie mapping framework ontwikkelen
- [x] Basisset ontwerpterminologie verzamelen en implementeren
- [x] Eenvoudige instructie parsing toevoegen
- [x] Integratie met Llama 3.2 11B via Ollama
- **Technologieën:** Llama 3.2 11B (4-bit kwantisatie), Node.js/Python
- **Opmerkingen:** IntentService geïmplementeerd met prompt templates

### 2.5 OllamaConversationService bouwen
- [x] HTTP client setup voor Ollama API
- [x] Volledige conversatiehistorie beheer
- [x] Context-aware vraagbeantwoording implementeren
- [x] Meertalige respons ondersteuning toevoegen
- [x] WebSocket integratie voor streaming responses
- **Technologieën:** Node.js/Python, WebSockets, Ollama API
- **Opmerkingen:** OllamaService en ChatService geïmplementeerd voor conversaties

### 2.6 SoftwareCommandService implementeren
- [x] Hoofdservice voor software commands ontwikkelen
- [x] Platform-specifieke command services implementeren (CorelDRAW en Blender)
- [x] CommandFactoryService voor dynamische routering ontwikkelen
- [x] Gestandaardiseerde error handling en validatie toevoegen
- [x] Integratie met IntentRecognition en OllamaConversation services
- **Technologieën:** TypeScript, Dependency Injection
- **Opmerkingen:** Volledige implementatie van command services gemaakt met uitbreidbare architectuur

### 2.7 DesignContextAnalyzer ontwikkelen
- [ ] Real-time documentanalyse implementeren
- [ ] Schermafbeelding mechanisme voor visuele context
- [ ] Design element herkenning integreren
- [ ] Cross-platform context capturing toevoegen
- [ ] ChromaDB integratie voor contextuele query verbetering
- **Technologieën:** OpenCV/PIL, JSON schema, ChromaDB
- **Opmerkingen:** Moet nog geïmplementeerd worden

### 2.8 Proof-of-Concept Integratie
- [x] Minimale end-to-end flow implementeren in Docker containers
- [ ] Simpele commando's testen (bijv. "maak een cirkel" in beide platformen)
- [ ] Interne demo voorbereiden
- [ ] Learnings documenteren voor volgende fasen
- **Technologieën:** Docker Compose, end-to-end test suite
- **Opmerkingen:** Docker containers worden succesvol opgestart, maar end-to-end tests moeten nog worden geïmplementeerd

---

## Fase 3: Natuurlijke Taal Verwerking en Code Executie
**Planning:** Week 6-8
**Status:** Gedeeltelijk gestart

### 3.1 IntentRecognitionSystem uitbreiden
- [ ] Open-ended natuurlijke taalinterpretatie verfijnen
- [ ] Contextuele intentie-herkenning toevoegen
- [ ] Complexe ontwerpterminologie herkenning implementeren
- [ ] Multi-stap instructies verwerking toevoegen
- [ ] ChromaDB RAG-integratie voor domeinspecifieke kennis
- **Technologieën:** Llama 3.2 11B, ChromaDB, vector embeddings
- **Opmerkingen:** Basis intent service is geïmplementeerd maar uitbreiding is nodig

### 3.2 WebSocketService bouwen voor realtime conversatie
- [x] Bidirectionele WebSocket server setup in NestJS/FastAPI
- [x] Streaming respons mechanisme implementeren
- [x] Real-time feedback tijdens uitvoering toevoegen
- [x] Statusmeldingen tijdens langlopende taken
- [x] Dockerized deployment configureren
- **Technologieën:** NestJS/FastAPI, WebSockets, Docker
- **Opmerkingen:** WebSocket Gateway geïmplementeerd voor real-time communicatie

### 3.3 DynamicCodeGenerator met CodeQwen 14B
- [x] CodeQwen 14B integratie via Ollama API
- [x] CorelDRAW VBA/COM code generator bouwen
- [x] Blender Python code generator bouwen
- [ ] Cross-validation tussen verschillende platformen
- [ ] Progressieve codeconstructie met feedback loops
- [x] ChromaDB voor API-referenties en documentatie
- **Technologieën:** CodeQwen 14B (4-bit kwantisatie), ChromaDB, Node.js/Python
- **Opmerkingen:** Basisintegratie met CodeQwen gemaakt in SoftwareService

### 3.4 PlatformAgnosticExecutor implementeren
- [x] Universele code uitvoeringslaag bouwen
- [x] Output capturing en status monitoring toevoegen
- [x] Middleware voor communicatie tussen AI en software
- [x] Veiligheidsmaatregelen voor code-uitvoering
- [x] Docker-gebaseerde isolatie voor code-uitvoering
- **Technologieën:** Docker, WebSockets, IPC mechanismen
- **Opmerkingen:** Implementatie gemaakt in software service met mock resultaten voor ontwikkeling

---

## Fase 4: UI en Conversatie-interface
**Planning:** Week 9-10
**Status:** Gedeeltelijk gestart

### 4.1 Conversationele UI ontwikkelen
- [x] Natuurlijke chat interface implementeren met shadcn/ui
- [ ] Voice-to-text integratie toevoegen (optioneel)
- [x] Code preview met syntax highlighting
- [ ] Visuele feedback van ontwerpwijzigingen tonen
- [x] Real-time updates via WebSockets
- **Technologieën:** React, Tailwind CSS, shadcn/ui, react-syntax-highlighter
- **Opmerkingen:** Basis chat UI geïmplementeerd, uitbreiden met meer functionaliteit

### 4.2 3D Viewer implementeren
- [ ] React Three Fiber (R3F) setup voor 3D-visualisatie
- [ ] Scene management en camera controls
- [ ] Blender model importeren en visualiseren
- [ ] CorelDRAW vector elementen renderen
- [ ] Interactieve 3D manipulatie
- **Technologieën:** React Three Fiber, Three.js, TypeScript
- **Opmerkingen:** Nog te implementeren

### 4.3 ConversationOrchestrator implementeren
- [x] Centrale service voor gespreksbeheer
- [x] Context-behoud over meerdere interacties
- [ ] Clarification requests genereren bij ambiguïteit
- [x] Conversatiegeschiedenis met ontwerpstatus koppelen
- [x] ChromaDB voor langetermijngeheugen en contextualisatie
- **Technologieën:** Node.js/Python, ChromaDB, Ollama
- **Opmerkingen:** Basis conversationele orchesteratie geïmplementeerd in ChatService

### 4.4 PlatformSwitchingService implementeren
- [ ] Naadloze overgang tussen CorelDRAW en Blender
- [ ] Context-behoud bij wisselen van platform
- [ ] Automatische platformkeuze op basis van instructie
- [ ] Cross-platform ontwerpconcepten vertalen
- [ ] Dockerized workflow voor platformwisselingen
- **Technologieën:** Docker, IPC, WebSockets
- **Opmerkingen:** Moet nog geïmplementeerd worden

---

## Fase 5: Integraties en Connectors
**Planning:** Week 11-12
**Status:** Gedeeltelijk gestart

### 5.1 Blender Integratie
- [ ] Headless Blender instantie opzetten in Docker
- [ ] Python WebSocket-server add-on ontwikkelen
- [ ] Execution environment voor code snippets
- [ ] Status feedback en error handling
- [ ] Image/3D model output streaming
- **Technologieën:** Python, Blender Python API, WebSockets, Docker
- **Opmerkingen:** Mock implementatie gemaakt, echte integratie moet nog worden ontwikkeld

### 5.2 CorelDRAW Integratie
- [ ] Windows COM/VSTA server opzetten
- [ ] WebSocket wrapper voor COM API
- [ ] VBA/COM code execution environment
- [ ] Status updates en error handling
- [ ] Vector output capturing
- **Technologieën:** C#/Python, COM automation, WebSockets
- **Opmerkingen:** Mock implementatie gemaakt, echte integratie moet nog worden ontwikkeld

### 5.3 ChromaDB Knowledge Base uitbreiden
- [ ] API documentatie volledig indexeren
- [ ] Voorbeeldcode en snippets opslaan
- [ ] Gebruikerstermen koppelen aan API-concepten
- [ ] ChatMemory implementeren voor langetermijncontextbehoud
- [ ] Optimalisatie van RAG-queries
- **Technologieën:** ChromaDB, vector embeddings, langchain
- **Opmerkingen:** ChromaDB basis opgezet, maar vullen van knowledge base moet nog gebeuren

### 5.4 Docker Compose Orchestratie
- [x] Volledige stack deployment via Docker Compose
- [x] Volume configuration voor persistent data
- [x] Resource limieten instellen voor containers
- [ ] Health checks en auto-restart
- [ ] Logging en monitoring
- **Technologieën:** Docker Compose, Docker networking
- **Opmerkingen:** Docker orchestratie is opgezet, maar moet worden uitgebreid met monitoring

---

## Fase 6-8: Toekomstige fases
**Planning:** Week 13+
**Status:** Niet gestart

Deze fases omvatten:
- Training en Verfijning (Fine-tuning van LLMs)
- Testen en Implementatie
- Lancering en Continue Verbetering

We werken eerst aan het voltooien van de huidige fases voordat we naar deze vervolgfases gaan.

---

## Risico's en Mitigatie

| Risico | Waarschijnlijkheid | Impact | Mitigatiestrategie |
|--------|-------------------|--------|-------------------|
| Complexiteit van open-ended natuurlijke taalverwerking | Hoog | Hoog | Implementatie van ChromaDB voor context retrieval, incrementele verbetering, focus op specifieke ontwerpdomein-termen, vroege intent recognition prototyping |
| Verschillen tussen CorelDRAW en Blender paradigma's | Medium | Hoog | Abstractielaag met gemeenschappelijke ontwerpconcepten, vectordatabase met cross-platform mappings |
| LLM prestaties onvoldoende voor complexe instructies | Medium | Hoog | Grotere modellen testen zoals CodeQwen 14B, domeinspecifieke fine-tuning, multi-model orchestratie |
| Context window beperkingen | Hoog | Medium | ChromaDB voor efficiënte context compressie, slimme geschiedenis beheer |
| Veiligheidsrisico's bij automatische code uitvoering | Medium | Hoog | Docker sandboxing, gebruikersvalidatie voor kritieke operaties |
| Hardware vereisten voor meerdere LLMs | Hoog | Hoog | Optimale 4-bit kwantisatie (Q4_K_M), prioritering van modelbelasting, Docker resource limieten |
| Docker netwerkissues tussen containers | Medium | Medium | Duidelijke netwerkstrategie, veilige protocol definities, failover mechanismen |

---

## Deliverables

### Software componenten
- [x] DesignAI Core Conversation Library
- [x] Bi-directionele WebSocket Conversatie Server
- [x] Cross-Platform React UI Client
- [x] Platform-specifieke executie-modules
- [x] ChromaDB knowledge management systeem
- [x] Docker Compose configuratie voor volledige stack
- [ ] Installatiepakket met platformkeuze

### Documentatie
- [x] Conversatiehandleiding voor ontwerptaken
- [ ] Platform-specifieke mogelijkheden overzicht
- [ ] Voorbeeldgesprekken bibliotheek
- [ ] Trainingsmateriaal voor effectieve AI-gesprekken
- [x] Docker deployment instructies

### Trainingsdata
- [ ] Dataset van ontwerpconversaties met uitvoering
- [ ] Fine-tuned model voor ontwerpdomein
- [ ] Conversatie templates voor veelvoorkomende taken
- [ ] ChromaDB vector-indexen voor domeinspecifieke kennis

---

## Voortgangslogboek
| Datum | Fase | Activiteit | Status | Opmerkingen |
|-------|------|------------|--------|-------------|
| [DATUM] | 1 | Initiële setup van project | Voltooid | Basisstructuur en Docker omgeving opgezet |
| [DATUM] | 2-4 | Core componenten ontwikkelen | In uitvoering | NestJS backend, Next.js frontend, en modelintegraties |
| | | | | |

---

## Teamleden
- [Naam] - [Rol]
- [Naam] - [Rol]
- [Naam] - [Rol]

---

*Dit document wordt regelmatig bijgewerkt om de voortgang van het project te volgen.* 