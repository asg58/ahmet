# Implementatieplan Vervolgstappen

Dit document beschrijft de gedetailleerde acties voor de volgende vier prioritaire componenten van het AI Design Agent project.

## Voltooide Implementaties

### Software Command Services

- [x] **SoftwareCommandService**: De hoofdservice die commands coördineert
  - Ondersteunt meerdere platforms (CorelDRAW, Blender)
  - Centraliseert error handling en logging
  - Biedt een uniform interface voor het uitvoeren van acties

- [x] **CorelDrawCommandsService**: Commands voor CorelDRAW
  - Implementatie van vormen maken (rechthoeken, ellipsen, tekst)
  - Objecten selecteren op basis van criteria
  - Elementen bewerken (kleur, positie, rotatie)
  - Tekst en lettertypes manipuleren

- [x] **BlenderCommandsService**: Commands voor Blender
  - 3D-objecten maken (kubussen, cylinders, vlakken)
  - Materialen en texturen toepassen
  - Camera-instellingen aanpassen
  - Objecten transformeren (schalen, roteren, verplaatsen)

- [x] **CommandFactoryService**: Integreert de verschillende command services
  - Dynamic command routing op basis van platform en actie
  - Gestandaardiseerde parameter validatie
  - Transparante error handling

## 1. API Documentatie Verzamelen en Indexeren

**Doel:** Een kennisbasis creëren in ChromaDB voor het AI-model om accurate code te genereren voor CorelDRAW en Blender.

### Stap 1: Bronnen identificeren en verzamelen
- [x] **CorelDRAW API Documentatie**
  - Officiële CorelDRAW VBA/COM documentatie downloaden
  - Relevante blog posts, tutorials en code voorbeelden verzamelen
  - GitHub repositories met CorelDRAW automatisering code identificeren
  - Stack Overflow en forum posts met voorbeeldcode verzamelen
  - *(Opmerking: Gerealiseerd met real-time web scraping i.p.v. simulated data)*

- [x] **Blender Python API Documentatie**
  - Officiële Blender Python API documentatie (bpy) downloaden
  - Relevante tutorials en code snippets verzamelen
  - GitHub repositories met Blender automatiseringsscripts identificeren
  - Addon code analyseren voor relevante patronen
  - *(Opmerking: Gerealiseerd met real-time web scraping i.p.v. simulated data)*

### Stap 2: Documentatie voorverwerken
- [x] Python script ontwikkelen voor het verwerken van documentatie:
  ```python
  # docs/scripts/process_api_docs.py
  # Functionaliteit voor het parsen, opschonen en splitsen van documentatie
  ```

- [x] Documentatie opschonen en splitsen in zinvolle chunks van 1-2 KB
- [x] Metadata toevoegen aan elk document (platform, categorie, functies, etc.)
- [x] Relevante code-voorbeelden koppelen aan API-documentatie

### Stap 3: Embeddings genereren en in ChromaDB laden
- [x] ChromaDB API script aanmaken:
  ```typescript
  // server/src/scripts/load_api_docs.ts
  // Script voor het laden van documentatie in ChromaDB
  ```

- [x] ChromaDB collecties organiseren (api_docs, code_examples, tutorials)
- [x] Embeddings genereren met een geschikt model
- [x] Bulk-upload naar ChromaDB met metadata voor filteren

### Stap 4: Query mechanisme testen en optimaliseren
- [x] Testqueries schrijven voor veelvoorkomende ontwerptaken
- [x] Relevantie van resultaten evalueren
- [x] Query parameters optimaliseren (k-nearest neighbors, filters)
- [x] Integreren in IntentRecognitionSystem en SoftwareService

## 2. UniversalObjectModelNavigator Implementeren

**Doel:** Een abstractielaag creëren die consistente toegang biedt tot objecten en methodes in verschillende ontwerpapplicaties.

### Stap 1: Kerninterface definiëren
- [x] Create `UniversalObjectModel` interface:
  ```typescript
  // server/src/software/universal/universal-object-model.ts
  
  export interface ObjectPath {
    path: string;
    platform: 'coreldraw' | 'blender';
    type?: string;
  }
  
  export interface PropertyDescriptor {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'color' | 'vector';
    readable: boolean;
    writable: boolean;
    description?: string;
  }
  
  export interface MethodDescriptor {
    name: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      defaultValue?: any;
      description?: string;
    }>;
    returnType: string;
    description?: string;
  }
  
  export interface ObjectDescriptor {
    path: ObjectPath;
    properties: Record<string, PropertyDescriptor>;
    methods: Record<string, MethodDescriptor>;
    children?: string[];
  }
  
  export interface PropertyResult {
    success: boolean;
    value?: any;
    error?: string;
  }
  
  export interface MethodResult {
    success: boolean;
    returnValue?: any;
    error?: string;
    output?: string;
  }
  
  export interface UniversalObjectModel {
    getRootObjects(): Promise<ObjectPath[]>;
    getObjectDescriptor(path: ObjectPath): Promise<ObjectDescriptor>;
    getProperty(objectPath: ObjectPath, propertyName: string): Promise<PropertyResult>;
    setProperty(objectPath: ObjectPath, propertyName: string, value: any): Promise<PropertyResult>;
    invokeMethod(objectPath: ObjectPath, methodName: string, args: any[]): Promise<MethodResult>;
    executeCode(code: string): Promise<MethodResult>;
    findObjects(typeOrPattern: string): Promise<ObjectPath[]>;
    getCurrentContext(): Promise<Record<string, any>>;
    getCapabilities(): Promise<Record<string, any>>;
  }
  ```

- [x] Basistypen en structuren definiëren:
  - ObjectPath (string-based hiërarchische paden)
  - PropertyDescriptor (naam, type, lees/schrijf toegang)
  - MethodDescriptor (naam, parameters, return type)

### Stap 2: Platform-specifieke implementaties
- [ ] CorelDRAW implementatie:
  ```typescript
  // server/src/software/universal/coreldraw-object-model.ts
  
  @Injectable()
  export class CorelDrawObjectModel implements UniversalObjectModel {
    private readonly logger = new Logger(CorelDrawObjectModel.name);
    
    constructor(
      private readonly corelDrawService: CorelDrawService
    ) {}
    
    async getRootObjects(): Promise<ObjectPath[]> {
      // Implementeer het ophalen van root objecten zoals Document, Application, etc.
      try {
        const code = `
          Dim result As New Collection
          result.Add "Document"
          result.Add "Application"
          result.Add "ActivePage"
          result.Add "ActiveLayer"
          // Json serialiseren van het resultaat
        `;
        
        const response = await this.corelDrawService.executeCode(code);
        if (!response.success) {
          throw new Error(response.error);
        }
        
        // Parse de resultaten en converteer naar ObjectPath[]
        return [
          { path: 'Document', platform: 'coreldraw', type: 'Document' },
          { path: 'Application', platform: 'coreldraw', type: 'Application' },
          { path: 'ActivePage', platform: 'coreldraw', type: 'Page' },
          { path: 'ActiveLayer', platform: 'coreldraw', type: 'Layer' }
        ];
      } catch (error) {
        this.logger.error(`Error getting root objects: ${error.message}`);
        return [];
      }
    }
    
    // Implementatie van de overige methoden:
    // - getObjectDescriptor
    // - getProperty
    // - setProperty
    // - invokeMethod
    // - executeCode
    // - findObjects
    // - getCurrentContext
    // - getCapabilities
  }
  ```

- [ ] Blender implementatie:
  ```typescript
  // server/src/software/universal/blender-object-model.ts
  
  @Injectable()
  export class BlenderObjectModel implements UniversalObjectModel {
    private readonly logger = new Logger(BlenderObjectModel.name);
    
    constructor(
      private readonly blenderService: BlenderService
    ) {}
    
    async getRootObjects(): Promise<ObjectPath[]> {
      // Implementeer het ophalen van root objecten zoals Scene, Objects, Materials, etc.
      try {
        const code = `
          import bpy
          import json
          
          root_objects = {
            'Scene': bpy.context.scene.name,
            'Objects': 'bpy.data.objects',
            'Materials': 'bpy.data.materials',
            'Cameras': 'bpy.data.cameras'
          }
          
          print(json.dumps(root_objects))
        `;
        
        const response = await this.blenderService.executeCode(code);
        if (!response.success) {
          throw new Error(response.error);
        }
        
        // Parse de resultaten en converteer naar ObjectPath[]
        return [
          { path: 'Scene', platform: 'blender', type: 'Scene' },
          { path: 'Objects', platform: 'blender', type: 'ObjectCollection' },
          { path: 'Materials', platform: 'blender', type: 'MaterialCollection' },
          { path: 'Cameras', platform: 'blender', type: 'CameraCollection' }
        ];
      } catch (error) {
        this.logger.error(`Error getting root objects: ${error.message}`);
        return [];
      }
    }
    
    // Implementatie van de overige methoden:
    // - getObjectDescriptor
    // - getProperty
    // - setProperty
    // - invokeMethod
    // - executeCode
    // - findObjects
    // - getCurrentContext
    // - getCapabilities
  }
  ```

### Stap 3: Dynamische code-executie mechanisme
- [ ] Code execution interface definiëren:
  ```typescript
  // server/src/software/universal/code-executor.ts
  
  export interface CodeExecutionOptions {
    timeout?: number;
    parameters?: Record<string, any>;
    executeAsync?: boolean;
    captureOutput?: boolean;
  }
  
  export interface CodeExecutionResult {
    success: boolean;
    output?: string;
    returnValue?: any;
    error?: string;
    executionTime?: number;
  }
  
  export interface CodeExecutor {
    execute(code: string, options?: CodeExecutionOptions): Promise<CodeExecutionResult>;
    prepareCode(code: string, parameters?: Record<string, any>): string;
    parseResult(result: any): CodeExecutionResult;
  }
  
  @Injectable()
  export class CodeExecutorFactory {
    constructor(
      private readonly corelDrawService: CorelDrawService,
      private readonly blenderService: BlenderService
    ) {}
    
    createExecutor(platform: 'coreldraw' | 'blender'): CodeExecutor {
      switch (platform) {
        case 'coreldraw':
          return new CorelDrawCodeExecutor(this.corelDrawService);
        case 'blender':
          return new BlenderCodeExecutor(this.blenderService);
        default:
          throw new Error(`Unsupported platform: ${platform}`);
      }
    }
  }
  ```

- [ ] Platform-specifieke executors implementeren
- [ ] Resultaat transformatie voor consistente output

### Stap 4: Mapping van gemeenschappelijke concepten
- [ ] Common design concepts definiëren:
  ```typescript
  // server/src/software/universal/design-concepts.ts
  
  export interface DesignConcept {
    concept: string;
    description: string;
    corelDrawMapping?: string | string[];
    blenderMapping?: string | string[];
    parameters?: Array<{
      name: string;
      type: string;
      description?: string;
      corelDrawParam?: string;
      blenderParam?: string;
    }>;
  }
  
  export const SHAPE_CONCEPTS: Record<string, DesignConcept> = {
    'rectangle': {
      concept: 'rectangle',
      description: 'A four-sided shape with straight sides where all interior angles are 90°',
      corelDrawMapping: 'CreateRectangle',
      blenderMapping: 'bpy.ops.mesh.primitive_cube_add',
      parameters: [
        { 
          name: 'width', 
          type: 'number', 
          description: 'Width of the rectangle',
          corelDrawParam: 'width',
          blenderParam: 'scale.x'
        },
        { 
          name: 'height', 
          type: 'number', 
          description: 'Height of the rectangle',
          corelDrawParam: 'height',
          blenderParam: 'scale.y'
        },
        // More parameters...
      ]
    },
    // More concepts...
  };
  
  @Injectable()
  export class DesignConceptMapper {
    mapConceptToCode(
      concept: string, 
      platform: 'coreldraw' | 'blender',
      parameters: Record<string, any>
    ): string {
      // Implementatie van concept->code mapping
    }
  }
  ```

- [ ] Mapping van concepten naar platform-specifieke objecten
- [ ] Semantic matching via vector embeddings

## 3. DesignContextAnalyzer Ontwikkelen

**Doel:** Real-time analyse van de huidige staat van het ontwerpdocument voor betere context-aware interacties.

### Stap 1: Context capture mechanismen
- [ ] CorelDRAW context capture:
  ```typescript
  // server/src/software/context/coreldraw-context.ts
  // Functionaliteit voor het verkrijgen van context uit CorelDRAW
  ```

- [ ] Blender context capture:
  ```typescript
  // server/src/software/context/blender-context.ts
  // Functionaliteit voor het verkrijgen van context uit Blender
  ```

- [ ] Screenshot mechanisme implementeren voor visuele context

### Stap 2: Context representatie model
- [ ] Context model definiëren:
  ```typescript
  // server/src/software/context/design-context.ts
  // Datastructuur voor het opslaan van contextinformatie
  ```

- [ ] Gestandaardiseerde JSON schema voor beide platforms
- [ ] Selectie en filtering van relevante contextdata

### Stap 3: Real-time context updates
- [ ] WebSocket events voor context updates:
  ```typescript
  // server/src/software/context/context.gateway.ts
  // WebSocket gateway voor real-time context updates
  ```

- [ ] Client-side context visualisatie
- [ ] Context update frequentie en throttling

### Stap 4: Context-aware query enrichment
- [ ] Context integratie in ChromaDB queries:
  ```typescript
  // server/src/chroma/context-aware-query.ts
  // Context-aware query builder voor ChromaDB
  ```

- [ ] Context weging in LLM prompts
- [ ] Dynamische prompt templates op basis van context

## 4. End-to-End Tests Implementeren

**Doel:** Basisfunctionaliteit valideren met eenvoudige commando's voor beide platforms.

### Stap 1: Test framework opzetten
- [ ] Test framework selecteren en configureren:
  ```typescript
  // server/test/e2e/setup.ts
  // Test configuratie en helpers
  ```

- [ ] Mocks en fixtures voorbereiden
- [ ] Test endpoints implementeren

### Stap 2: Basiscommando's voor CorelDRAW testen
- [ ] Tests voor primitieve objecten aanmaken:
  ```typescript
  // server/test/e2e/coreldraw/basic-shapes.test.ts
  // Tests voor basis vormen in CorelDRAW
  ```

- [ ] Tests voor styling en eigenschappen
- [ ] Tests voor documentbeheer

### Stap 3: Basiscommando's voor Blender testen
- [ ] Tests voor primitieve objecten aanmaken:
  ```typescript
  // server/test/e2e/blender/basic-shapes.test.ts
  // Tests voor basis vormen in Blender
  ```

- [ ] Tests voor materialen en texturen
- [ ] Tests voor transformaties

### Stap 4: Intent recognition tests
- [ ] Tests voor natuurlijke taal commando's:
  ```typescript
  // server/test/e2e/intent/design-commands.test.ts
  // Tests voor natuurlijke taal verwerking
  ```

- [ ] Tests voor ambigue commando's
- [ ] Tests voor contextafhankelijke commando's

## Tijdlijn

| Stap | Beschrijving | Geschatte duur | Prioriteit | Status |
|------|-------------|----------------|------------|--------|
| 0.1  | Software Command Services | 4 dagen | Hoog | ✅ Voltooid |
| 1.1  | API Documentatie bronnen verzamelen | 3 dagen | Hoog | ✅ Voltooid |
| 1.2  | Documentatie voorverwerken | 2 dagen | Hoog | ✅ Voltooid |
| 1.3  | ChromaDB laden | 1 dag | Hoog | ✅ Voltooid |
| 1.4  | Query optimalisatie | 2 dagen | Medium | ✅ Voltooid |
| 2.1  | UniversalObjectModel interface | 2 dagen | Hoog | ✅ Voltooid |
| 2.2  | Platform implementaties | 4 dagen | Hoog | 🔄 Bezig |
| 2.3  | Code executie mechanisme | 3 dagen | Hoog | 🔄 Bezig |
| 2.4  | Concept mapping | 2 dagen | Medium | 📅 Gepland |
| 3.1  | Context capture mechanismen | 3 dagen | Medium | 📅 Gepland |
| 3.2  | Context representatie | 2 dagen | Medium | 📅 Gepland |
| 3.3  | Real-time updates | 2 dagen | Medium | 📅 Gepland |
| 3.4  | Context-aware queries | 2 dagen | Laag | 📅 Gepland |
| 4.1  | Test framework opzetten | 1 dag | Medium | 📅 Gepland |
| 4.2  | CorelDRAW tests | 2 dagen | Medium | 📅 Gepland |
| 4.3  | Blender tests | 2 dagen | Medium | 📅 Gepland |
| 4.4  | Intent tests | 2 dagen | Laag | 📅 Gepland |

## Afhankelijkheden

- API Documentatie (Stap 1) is een voorwaarde voor effectieve werking van alle andere componenten
- UniversalObjectModel (Stap 2) is nodig voor volledige implementatie van DesignContextAnalyzer
- End-to-End Tests (Stap 4) zijn afhankelijk van minimale implementaties van stappen 1-3

## Risico's en Uitdagingen

1. **Beperkte API Documentatie**: Sommige delen van de API's zijn mogelijk slecht gedocumenteerd
   - *Mitigatie*: Reverse engineering, community forums, aanvullende bronnen

2. **Complexiteit van abstractielaag**: Verenigen van zeer verschillende objectmodellen
   - *Mitigatie*: Starten met beperkte subset van functionaliteit, incrementeel uitbreiden

3. **Performance van context-capturing**: Te frequente updates kunnen systeem vertragen
   - *Mitigatie*: Throttling, slimme delta-updates, asynchroon verwerken

4. **Testomgeving**: Testen vereisen draaiende instanties van CorelDRAW en Blender
   - *Mitigatie*: Mock implementaties voor initiële tests, later echte integraties 