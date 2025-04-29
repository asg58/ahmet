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
  
  @Injectable()
  export class CorelContextAnalyzer {
    private readonly logger = new Logger(CorelContextAnalyzer.name);
    private context: DesignContext;
    private trackingEnabled = false;
    private trackingCallback: (update: ContextUpdate) => void;
    
    constructor(
      private readonly corelDrawService: CorelDrawService,
      private readonly eventEmitter: EventEmitter2
    ) {
      this.context = this.createEmptyContext();
    }
    
    async captureContext(options?: {
      includeScreenshot?: boolean;
      detailLevel?: 'minimal' | 'standard' | 'detailed'
    }): Promise<DesignContext> {
      try {
        const { includeScreenshot = false, detailLevel = 'standard' } = options || {};
        
        // Genereer VBA code om de documentstructuur te verkrijgen
        const code = `
          Function CaptureDocumentState() As String
            Dim doc As Document
            Set doc = ActiveDocument
            
            Dim result As Object
            Set result = CreateObject("Scripting.Dictionary")
            
            ' Document info
            result("documentName") = doc.FileName
            result("pageCount") = doc.Pages.Count
            result("activePage") = ActivePage.Index
            result("units") = doc.Unit
            
            ' Capture selection
            Dim selItems As ShapeRange
            Set selItems = ActiveSelectionRange
            
            Dim selectedObjects As Object
            Set selectedObjects = CreateObject("Scripting.Dictionary")
            
            Dim i As Long
            For i = 1 To selItems.Count
              Dim shapeInfo As Object
              Set shapeInfo = CreateObject("Scripting.Dictionary")
              
              shapeInfo("type") = TypeName(selItems(i))
              shapeInfo("name") = selItems(i).Name
              shapeInfo("id") = i
              
              ' Position and size
              shapeInfo("x") = selItems(i).PositionX
              shapeInfo("y") = selItems(i).PositionY
              shapeInfo("width") = selItems(i).SizeWidth
              shapeInfo("height") = selItems(i).SizeHeight
              
              ${detailLevel === 'detailed' ? `
              ' Detailed properties only when requested
              If selItems(i).Fill.Type <> cdrNoFill Then
                shapeInfo("fillType") = selItems(i).Fill.Type
              End If
              
              If selItems(i).Outline.Type <> cdrNoOutline Then
                shapeInfo("outlineWidth") = selItems(i).Outline.Width
              End If
              ` : ''}
              
              selectedObjects(CStr(i)) = shapeInfo
            Next i
            
            result("selectedElements") = selectedObjects
            
            ${detailLevel !== 'minimal' ? `
            ' Page elements (only in standard/detailed mode)
            Dim elements As Object
            Set elements = CreateObject("Scripting.Dictionary")
            
            Dim shapes As ShapeRange
            Set shapes = ActivePage.Shapes.All
            
            For i = 1 To shapes.Count
              Dim elemInfo As Object
              Set elemInfo = CreateObject("Scripting.Dictionary")
              
              elemInfo("type") = TypeName(shapes(i))
              elemInfo("name") = shapes(i).Name
              
              elements(CStr(i)) = elemInfo
            Next i
            
            result("elements") = elements
            ` : ''}
            
            ' Convert to JSON-like string (simplified)
            CaptureDocumentState = ConvertToJson(result)
          End Function
        `;
        
        // Uitvoeren van de code en parsen van het resultaat
        const result = await this.corelDrawService.executeCode(code);
        if (!result.success) {
          throw new Error(result.error);
        }
        
        // Parse het resultaat naar DesignContext
        const contextData = JSON.parse(result.output);
        
        // Maak het DesignContext object
        const context: DesignContext = {
          platform: 'coreldraw',
          documentName: contextData.documentName,
          pageCount: contextData.pageCount,
          activePage: contextData.activePage,
          selectedElements: Object.values(contextData.selectedElements || {}),
          elements: Object.values(contextData.elements || {}),
          timestamp: new Date().toISOString()
        };
        
        // Voeg screenshot toe indien gewenst
        if (includeScreenshot) {
          const screenshot = await this.captureScreenshot();
          context.screenshot = screenshot;
        }
        
        return context;
      } catch (error) {
        this.logger.error(`Error capturing CorelDRAW context: ${error.message}`);
        return this.createEmptyContext();
      }
    }
    
    @Interval(2000)
    async checkForContextUpdates() {
      if (!this.trackingEnabled || !this.trackingCallback) {
        return;
      }
      
      try {
        // Capture current state
        const newContext = await this.captureContext({
          includeScreenshot: false,
          detailLevel: 'minimal'
        });
        
        // Compare with previous state and build update
        const update = this.buildContextUpdate(this.context, newContext);
        
        if (update.changes.added.length > 0 || 
            update.changes.modified.length > 0 || 
            update.changes.removed.length > 0 ||
            update.changes.selected.length > 0 ||
            update.changes.deselected.length > 0) {
          
          // Call the tracking callback with the update
          this.trackingCallback(update);
          
          // Emit an event for other subscribers
          this.eventEmitter.emit('design.context.update', update);
          
          // Update our stored context
          this.context = newContext;
        }
      } catch (error) {
        this.logger.error(`Error processing context updates: ${error.message}`);
      }
    }
    
    enableTracking(callback: (update: ContextUpdate) => void): void {
      this.trackingEnabled = true;
      this.trackingCallback = callback;
      this.logger.log('Context tracking enabled');
    }
    
    disableTracking(): void {
      this.trackingEnabled = false;
      this.trackingCallback = null;
      this.logger.log('Context tracking disabled');
    }
    
    private buildContextUpdate(oldContext: DesignContext, newContext: DesignContext): ContextUpdate {
      // Implementeer vergelijking om veranderingen te detecteren
      // ... (implementatiedetails)
      
      return {
        oldContext,
        newContext,
        changes: {
          added: [],    // Nieuwe elementen
          removed: [],  // Verwijderde elementen
          modified: [], // Gewijzigde elementen
          selected: [], // Nieuw geselecteerde elementen
          deselected: [] // Niet meer geselecteerde elementen
        }
      };
    }
    
    private createEmptyContext(): DesignContext {
      return {
        platform: 'coreldraw',
        documentName: 'Unknown',
        pageCount: 0,
        activePage: 0,
        selectedElements: [],
        elements: [],
        timestamp: new Date().toISOString()
      };
    }
    
    private async captureScreenshot(): Promise<string> {
      // Implementatie van screenshot functionaliteit
      // ...
      return 'base64-encoded-image-data';
    }
  }
  ```

- [ ] Blender context capture:
  ```typescript
  // server/src/software/context/blender-context.ts
  
  @Injectable()
  export class BlenderContextAnalyzer {
    private readonly logger = new Logger(BlenderContextAnalyzer.name);
    private context: DesignContext;
    private trackingEnabled = false;
    private trackingCallback: (update: ContextUpdate) => void;
    
    constructor(
      private readonly blenderService: BlenderService,
      private readonly eventEmitter: EventEmitter2
    ) {
      this.context = this.createEmptyContext();
    }
    
    async captureContext(options?: {
      includeScreenshot?: boolean;
      detailLevel?: 'minimal' | 'standard' | 'detailed'
    }): Promise<DesignContext> {
      try {
        const { includeScreenshot = false, detailLevel = 'standard' } = options || {};
        
        // Python code om de Blender scene structuur te verkrijgen
        const code = `
          import bpy
          import json
          
          def capture_scene_state():
              result = {}
              
              # Document info
              result["documentName"] = bpy.data.filepath or "Untitled"
              result["sceneCount"] = len(bpy.data.scenes)
              result["activeScene"] = bpy.context.scene.name
              
              # Capture selection
              selected_objects = []
              for obj in bpy.context.selected_objects:
                  obj_info = {
                      "type": obj.type,
                      "name": obj.name,
                      "id": obj.name,  # Using name as ID
                      "x": obj.location.x,
                      "y": obj.location.y,
                      "z": obj.location.z,
                  }
                  
                  ${detailLevel === 'detailed' ? `
                  # Detailed properties
                  if obj.type == 'MESH':
                      obj_info["vertexCount"] = len(obj.data.vertices)
                      obj_info["faceCount"] = len(obj.data.polygons)
                  
                  if obj.material_slots:
                      obj_info["materials"] = [slot.material.name for slot in obj.material_slots if slot.material]
                  ` : ''}
                  
                  selected_objects.append(obj_info)
              
              result["selectedElements"] = selected_objects
              
              ${detailLevel !== 'minimal' ? `
              # Scene elements (only in standard/detailed mode)
              elements = []
              for obj in bpy.context.scene.objects:
                  elem_info = {
                      "type": obj.type,
                      "name": obj.name,
                      "visible": obj.visible_get()
                  }
                  elements.append(elem_info)
              
              result["elements"] = elements
              ` : ''}
              
              return json.dumps(result)
          
          # Run and print the result
          print(capture_scene_state())
        `;
        
        // Uitvoeren van de code en parsen van het resultaat
        const result = await this.blenderService.executeCode(code);
        if (!result.success) {
          throw new Error(result.error);
        }
        
        // Parse het resultaat naar DesignContext
        const contextData = JSON.parse(result.output);
        
        // Maak het DesignContext object
        const context: DesignContext = {
          platform: 'blender',
          documentName: contextData.documentName,
          sceneCount: contextData.sceneCount,
          activeScene: contextData.activeScene,
          selectedElements: contextData.selectedElements || [],
          elements: contextData.elements || [],
          timestamp: new Date().toISOString()
        };
        
        // Voeg screenshot toe indien gewenst
        if (includeScreenshot) {
          const screenshot = await this.captureScreenshot();
          context.screenshot = screenshot;
        }
        
        return context;
      } catch (error) {
        this.logger.error(`Error capturing Blender context: ${error.message}`);
        return this.createEmptyContext();
      }
    }
    
    @Interval(2000)
    async checkForContextUpdates() {
      if (!this.trackingEnabled || !this.trackingCallback) {
        return;
      }
      
      try {
        // Capture current state
        const newContext = await this.captureContext({
          includeScreenshot: false,
          detailLevel: 'minimal'
        });
        
        // Compare with previous state and build update
        const update = this.buildContextUpdate(this.context, newContext);
        
        if (update.changes.added.length > 0 || 
            update.changes.modified.length > 0 || 
            update.changes.removed.length > 0 ||
            update.changes.selected.length > 0 ||
            update.changes.deselected.length > 0) {
          
          // Call the tracking callback with the update
          this.trackingCallback(update);
          
          // Emit an event for other subscribers
          this.eventEmitter.emit('design.context.update', update);
          
          // Update our stored context
          this.context = newContext;
        }
      } catch (error) {
        this.logger.error(`Error processing context updates: ${error.message}`);
      }
    }
    
    // ... overige methoden (vergelijkbaar met CorelContextAnalyzer)
  }
  ```

- [ ] Screenshot mechanisme implementeren voor visuele context

### Stap 2: Context representatie model
- [ ] Context model definiëren:
  ```typescript
  // server/src/software/context/design-context.ts
  
  export interface DesignElement {
    id: string | number;
    type: string;
    name?: string;
    x?: number;
    y?: number;
    z?: number;
    width?: number;
    height?: number;
    depth?: number;
    [key: string]: any; // Extra platformspecifieke eigenschappen
  }
  
  export interface DesignContext {
    platform: 'coreldraw' | 'blender';
    documentName: string;
    pageCount?: number;
    activePage?: number;
    sceneCount?: number;
    activeScene?: string;
    selectedElements: DesignElement[];
    elements: DesignElement[];
    timestamp: string;
    screenshot?: string; // Base64-encoded image data
  }
  
  export interface ContextChanges {
    added: DesignElement[];
    removed: DesignElement[];
    modified: Array<{
      oldElement: DesignElement;
      newElement: DesignElement;
      changes: string[]; // Namen van gewijzigde eigenschappen
    }>;
    selected: DesignElement[];   // Nieuw geselecteerde elementen
    deselected: DesignElement[]; // Niet meer geselecteerde elementen
  }
  
  export interface ContextUpdate {
    oldContext: DesignContext;
    newContext: DesignContext;
    changes: ContextChanges;
  }
  
  export interface ContextSubscription {
    clientId: string;
    platform: 'coreldraw' | 'blender';
    sessionId: string;
    lastUpdate: number;
  }
  
  export function contextToDescription(context: DesignContext): string {
    let description = `Document: ${context.documentName} (${context.platform})\n`;
    
    if (context.platform === 'coreldraw') {
      description += `Pagina's: ${context.pageCount}, Actieve pagina: ${context.activePage}\n`;
    } else {
      description += `Scenes: ${context.sceneCount}, Actieve scene: ${context.activeScene}\n`;
    }
    
    description += `${context.selectedElements.length} geselecteerde element(en):\n`;
    
    if (context.selectedElements.length > 0) {
      context.selectedElements.forEach((elem, i) => {
        description += `  ${i+1}. ${elem.type}${elem.name ? ` (${elem.name})` : ''}\n`;
      });
    } else {
      description += '  Geen elementen geselecteerd\n';
    }
    
    description += `Aantal elementen in document: ${context.elements.length}\n`;
    
    return description;
  }
  ```

- [ ] Gestandaardiseerde JSON schema voor beide platforms
- [ ] Selectie en filtering van relevante contextdata

### Stap 3: Real-time context updates
- [ ] WebSocket events voor context updates:
  ```typescript
  // server/src/software/context/context.gateway.ts
  
  @WebSocketGateway({
    cors: { origin: '*' },
    namespace: 'context',
  })
  @Injectable()
  export class ContextGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly logger = new Logger(ContextGateway.name);
    
    @WebSocketServer() server: Server;
    
    // Subscription management
    private subscriptions = new Map<string, ContextSubscription>();
    private trackingActive = {
      coreldraw: false,
      blender: false
    };
    
    constructor(
      private readonly corelContextAnalyzer: CorelContextAnalyzer,
      private readonly blenderContextAnalyzer: BlenderContextAnalyzer,
      private readonly eventEmitter: EventEmitter2
    ) {
      // Luister naar context updates van de analyzers
      this.eventEmitter.on('design.context.update', this.handleContextUpdate.bind(this));
    }
    
    afterInit(server: Server) {
      this.logger.log('Context WebSocket Gateway Initialized');
    }
    
    handleConnection(client: Socket, ...args: any[]) {
      this.logger.log(`Client connected: ${client.id}`);
    }
    
    handleDisconnect(client: Socket) {
      this.logger.log(`Client disconnected: ${client.id}`);
      
      // Verwijder alle subscriptions voor deze client
      for (const [key, subscription] of this.subscriptions.entries()) {
        if (subscription.clientId === client.id) {
          this.subscriptions.delete(key);
        }
      }
      
      // Update tracking status
      this.updateTrackingStatus();
    }
    
    @SubscribeMessage('subscribeContext')
    handleSubscribeContext(
      client: Socket, 
      payload: { platform: 'coreldraw' | 'blender', sessionId: string }
    ): WsResponse<{success: boolean}> {
      const { platform, sessionId } = payload;
      const subKey = `${platform}:${sessionId}`;
      
      this.logger.log(`Client ${client.id} subscribing to ${platform} context, sessionId: ${sessionId}`);
      
      // Add subscription
      this.subscriptions.set(subKey, {
        clientId: client.id,
        platform,
        sessionId,
        lastUpdate: Date.now(),
      });
      
      // Start tracking if not already active
      this.updateTrackingStatus();
      
      return { event: 'subscribeContextResponse', data: { success: true } };
    }
    
    @SubscribeMessage('unsubscribeContext')
    handleUnsubscribeContext(
      client: Socket, 
      payload: { platform: 'coreldraw' | 'blender', sessionId: string }
    ): WsResponse<{success: boolean}> {
      const { platform, sessionId } = payload;
      const subKey = `${platform}:${sessionId}`;
      
      this.logger.log(`Client ${client.id} unsubscribing from ${platform} context, sessionId: ${sessionId}`);
      
      // Remove subscription
      this.subscriptions.delete(subKey);
      
      // Update tracking status
      this.updateTrackingStatus();
      
      return { event: 'unsubscribeContextResponse', data: { success: true } };
    }
    
    @SubscribeMessage('requestCurrentContext')
    async handleRequestCurrentContext(
      client: Socket, 
      payload: { platform: 'coreldraw' | 'blender', sessionId: string, includeScreenshot?: boolean }
    ): Promise<WsResponse<any>> {
      const { platform, sessionId, includeScreenshot = false } = payload;
      
      this.logger.log(`Client ${client.id} requesting current ${platform} context`);
      
      try {
        // Vraag de huidige context op
        let context;
        if (platform === 'coreldraw') {
          context = await this.corelContextAnalyzer.captureContext({ includeScreenshot });
        } else if (platform === 'blender') {
          context = await this.blenderContextAnalyzer.captureContext({ includeScreenshot });
        } else {
          throw new Error(`Unsupported platform: ${platform}`);
        }
        
        return { 
          event: 'currentContext', 
          data: { 
            context,
            sessionId,
            timestamp: Date.now()
          } 
        };
      } catch (error) {
        this.logger.error(`Error getting current context: ${error.message}`);
        return { 
          event: 'contextError', 
          data: { 
            error: error.message,
            sessionId,
            timestamp: Date.now()
          } 
        };
      }
    }
    
    private handleContextUpdate(update: { platform: 'coreldraw' | 'blender', update: ContextUpdate }) {
      const { platform, update: contextUpdate } = update;
      
      // Vind alle subscriptions voor dit platform
      for (const [key, subscription] of this.subscriptions.entries()) {
        if (subscription.platform === platform) {
          // Stuur update naar de geabonneerde client
          this.server.to(subscription.clientId).emit('contextUpdate', {
            update: contextUpdate,
            sessionId: subscription.sessionId,
            timestamp: Date.now()
          });
          
          // Update de laatste update timestamp
          subscription.lastUpdate = Date.now();
          this.subscriptions.set(key, subscription);
        }
      }
    }
    
    private updateTrackingStatus() {
      // Controleer of er subscriptions zijn voor elk platform
      const hasCorelSubscriptions = this.hasSubscriptionsForPlatform('coreldraw');
      const hasBlenderSubscriptions = this.hasSubscriptionsForPlatform('blender');
      
      // Update tracking status voor CorelDRAW
      if (hasCorelSubscriptions && !this.trackingActive.coreldraw) {
        this.corelContextAnalyzer.enableTracking((update) => {
          this.eventEmitter.emit('design.context.update', { platform: 'coreldraw', update });
        });
        this.trackingActive.coreldraw = true;
      } else if (!hasCorelSubscriptions && this.trackingActive.coreldraw) {
        this.corelContextAnalyzer.disableTracking();
        this.trackingActive.coreldraw = false;
      }
      
      // Update tracking status voor Blender
      if (hasBlenderSubscriptions && !this.trackingActive.blender) {
        this.blenderContextAnalyzer.enableTracking((update) => {
          this.eventEmitter.emit('design.context.update', { platform: 'blender', update });
        });
        this.trackingActive.blender = true;
      } else if (!hasBlenderSubscriptions && this.trackingActive.blender) {
        this.blenderContextAnalyzer.disableTracking();
        this.trackingActive.blender = false;
      }
    }
    
    private hasSubscriptionsForPlatform(platform: 'coreldraw' | 'blender'): boolean {
      for (const subscription of this.subscriptions.values()) {
        if (subscription.platform === platform) {
          return true;
        }
      }
      return false;
    }
  }
  ```

- [ ] Client-side context visualisatie
- [ ] Context update frequentie en throttling

### Stap 4: Context-aware query enrichment
- [ ] Context integratie in ChromaDB queries:
  ```typescript
  // server/src/chroma/context-aware-query.ts
  
  @Injectable()
  export class ContextAwareQueryBuilder {
    private readonly logger = new Logger(ContextAwareQueryBuilder.name);
    
    constructor(
      private readonly chromaService: ChromaService
    ) {}
    
    async queryApiDocs(
      query: string,
      context?: DesignContext,
      platform?: 'coreldraw' | 'blender',
      limit: number = 5
    ) {
      // Enhance query with context
      let enhancedQuery = query;
      if (context) {
        enhancedQuery = this.enhanceQueryWithContext(query, context);
      }
      
      this.logger.debug(`Original query: "${query}"`);
      this.logger.debug(`Enhanced query: "${enhancedQuery}"`);
      
      // Query ChromaDB
      const results = await this.chromaService.queryApiDocumentation(
        enhancedQuery,
        platform || (context?.platform as 'coreldraw' | 'blender'),
        limit
      );
      
      return results;
    }
    
    private enhanceQueryWithContext(query: string, context: DesignContext): string {
      const contextualTerms: string[] = [];
      
      // Platform-specifieke termen toevoegen
      if (context.platform) {
        contextualTerms.push(context.platform);
      }
      
      // Geselecteerde elementtypes toevoegen
      if (context.selectedElements && context.selectedElements.length > 0) {
        const selectionTypes = new Set(context.selectedElements.map(el => el.type));
        selectionTypes.forEach(type => contextualTerms.push(type));
      }
      
      // CorelDRAW-specifieke contextverrijking
      if (context.platform === 'coreldraw') {
        // Voeg relevante documenteigenschappen toe
        // ...
      }
      
      // Blender-specifieke contextverrijking
      if (context.platform === 'blender') {
        // Voeg relevante scene-eigenschappen toe
        // ...
      }
      
      // Combineer originele query met context
      if (contextualTerms.length > 0) {
        return `${query} ${contextualTerms.join(' ')}`;
      }
      
      return query;
    }
    
    buildPromptWithContext(
      basePrompt: string,
      context: DesignContext,
      apiDocs?: any[]
    ): string {
      let prompt = basePrompt;
      
      // Voeg context toe
      prompt += `\n\nHuidige context:\n${contextToDescription(context)}`;
      
      // Voeg relevante API documentatie toe
      if (apiDocs && apiDocs.length > 0) {
        prompt += `\n\nRelevante API documentatie:\n`;
        apiDocs.forEach((doc, i) => {
          prompt += `${i+1}. ${doc.title || 'Ongetiteld'}\n${doc.content.substring(0, 200)}...\n\n`;
        });
      }
      
      return prompt;
    }
  }
  ```

- [ ] Context weging in LLM prompts
- [ ] Dynamische prompt templates op basis van context

## 4. End-to-End Tests Implementeren

**Doel:** Basisfunctionaliteit valideren met eenvoudige commando's voor beide platforms.

### Stap 1: Test framework opzetten
- [ ] Test framework selecteren en configureren:
  ```typescript
  // server/test/e2e/setup.ts
  
  import { Test, TestingModule } from '@nestjs/testing';
  import { INestApplication } from '@nestjs/common';
  import * as request from 'supertest';
  import { AppModule } from '../../src/app.module';
  import { SoftwareService } from '../../src/software/software.service';
  import { OllamaService } from '../../src/ollama/ollama.service';
  import { CorelDrawService } from '../../src/software/coreldraw.service';
  import { BlenderService } from '../../src/software/blender.service';
  
  export class TestSetup {
    app: INestApplication;
    softwareService: SoftwareService;
    ollamaService: OllamaService;
    corelDrawService: CorelDrawService;
    blenderService: BlenderService;
    httpServer: any;
    
    async initialize() {
      // Create testing module
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      })
        // Optionally override services with mocks for testing
        .overrideProvider(CorelDrawService)
        .useClass(MockCorelDrawService)
        .overrideProvider(BlenderService)
        .useClass(MockBlenderService)
        .compile();
      
      // Create app instance
      this.app = moduleFixture.createNestApplication();
      await this.app.init();
      
      // Get service instances
      this.softwareService = moduleFixture.get<SoftwareService>(SoftwareService);
      this.ollamaService = moduleFixture.get<OllamaService>(OllamaService);
      this.corelDrawService = moduleFixture.get<CorelDrawService>(CorelDrawService);
      this.blenderService = moduleFixture.get<BlenderService>(BlenderService);
      
      // Get HTTP server for request testing
      this.httpServer = this.app.getHttpServer();
    }
    
    async cleanup() {
      await this.app.close();
    }
    
    getRequest() {
      return request(this.httpServer);
    }
  }
  
  // Mock implementations for testing
  class MockCorelDrawService {
    async executeCode(code: string) {
      console.log(`[MOCK] CorelDRAW executing: ${code.substring(0, 50)}...`);
      return {
        success: true,
        output: JSON.stringify({ result: 'mocked-result' }),
      };
    }
    
    async getStatus() {
      return {
        connected: true,
        version: 'CorelDRAW X8 (Mock)',
      };
    }
    
    async executeCommand(command: string, params: any) {
      console.log(`[MOCK] CorelDRAW command: ${command}, params: ${JSON.stringify(params)}`);
      return {
        success: true,
        result: 'Command executed successfully',
      };
    }
  }
  
  class MockBlenderService {
    async executeCode(code: string) {
      console.log(`[MOCK] Blender executing: ${code.substring(0, 50)}...`);
      return {
        success: true,
        output: JSON.stringify({ result: 'mocked-result' }),
      };
    }
    
    async getStatus() {
      return {
        connected: true,
        version: 'Blender 3.5 (Mock)',
      };
    }
    
    async executeCommand(command: string, params: any) {
      console.log(`[MOCK] Blender command: ${command}, params: ${JSON.stringify(params)}`);
      return {
        success: true,
        result: 'Command executed successfully',
      };
    }
  }
  ```

- [ ] Mocks en fixtures voorbereiden:
  ```typescript
  // server/test/e2e/fixtures/context-fixtures.ts
  
  import { DesignContext, DesignElement } from '../../../src/software/context/design-context';
  
  export const corelDrawContextFixture: DesignContext = {
    platform: 'coreldraw',
    documentName: 'TestDocument.cdr',
    pageCount: 5,
    activePage: 1,
    selectedElements: [
      {
        id: 1,
        type: 'Rectangle',
        name: 'Rectangle1',
        x: 100,
        y: 100,
        width: 200,
        height: 150,
      },
      {
        id: 2,
        type: 'Ellipse',
        name: 'Ellipse1',
        x: 350,
        y: 200,
        width: 100,
        height: 100,
      }
    ],
    elements: [
      {
        id: 1,
        type: 'Rectangle',
        name: 'Rectangle1',
      },
      {
        id: 2,
        type: 'Ellipse',
        name: 'Ellipse1',
      },
      {
        id: 3,
        type: 'TextFrame',
        name: 'Text1',
      }
    ],
    timestamp: new Date().toISOString(),
  };
  
  export const blenderContextFixture: DesignContext = {
    platform: 'blender',
    documentName: 'TestScene.blend',
    sceneCount: 2,
    activeScene: 'Scene',
    selectedElements: [
      {
        id: 'Cube',
        type: 'MESH',
        name: 'Cube',
        x: 0,
        y: 0,
        z: 0,
      }
    ],
    elements: [
      {
        id: 'Cube',
        type: 'MESH',
        name: 'Cube',
      },
      {
        id: 'Camera',
        type: 'CAMERA',
        name: 'Camera',
      },
      {
        id: 'Light',
        type: 'LIGHT',
        name: 'Light',
      }
    ],
    timestamp: new Date().toISOString(),
  };
  ```

- [ ] Test endpoints implementeren:
  ```typescript
  // server/test/e2e/endpoints.ts
  
  import { TestSetup } from './setup';
  
  export const endpoints = {
    async testSoftwareAvailability(setup: TestSetup) {
      return setup.getRequest()
        .get('/api/software/available')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('coreldraw');
          expect(res.body).toHaveProperty('blender');
        });
    },
    
    async testSoftwareCommand(setup: TestSetup, platform: 'coreldraw' | 'blender', command: string, params: any) {
      return setup.getRequest()
        .post(`/api/software/${platform}/command`)
        .send({
          command,
          params,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('result');
        });
    },
    
    async testCodeExecution(setup: TestSetup, platform: 'coreldraw' | 'blender', code: string) {
      return setup.getRequest()
        .post(`/api/software/${platform}/execute`)
        .send({
          code,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
        });
    },
    
    async testIntentProcessing(setup: TestSetup, message: string) {
      return setup.getRequest()
        .post('/api/intent/process')
        .send({
          message,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('intent');
          expect(res.body).toHaveProperty('confidence');
          expect(res.body).toHaveProperty('parameters');
        });
    }
  };
  ```

### Stap 2: Basiscommando's voor CorelDRAW testen
- [ ] Tests voor primitieve objecten aanmaken:
  ```typescript
  // server/test/e2e/coreldraw/basic-shapes.test.ts
  
  import { Test } from '@nestjs/testing';
  import { TestSetup } from '../setup';
  import { endpoints } from '../endpoints';
  
  describe('CorelDRAW Basic Shapes', () => {
    let setup: TestSetup;
    
    beforeAll(async () => {
      setup = new TestSetup();
      await setup.initialize();
    });
    
    afterAll(async () => {
      await setup.cleanup();
    });
    
    it('should create a rectangle', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'create.rectangle',
        {
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          fill: '#FF0000',
          stroke: '#000000',
          strokeWidth: 1,
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should create an ellipse', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'create.ellipse',
        {
          x: 300,
          y: 300,
          width: 100,
          height: 100,
          fill: '#0000FF',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should create text', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'create.text',
        {
          x: 200,
          y: 400,
          text: 'Hello World',
          fontSize: 24,
          fontName: 'Arial',
          color: '#000000',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should select objects by type', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'select.object',
        {
          type: 'rectangle',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
  });
  ```

- [ ] Tests voor styling en eigenschappen:
  ```typescript
  // server/test/e2e/coreldraw/styling.test.ts
  
  import { Test } from '@nestjs/testing';
  import { TestSetup } from '../setup';
  import { endpoints } from '../endpoints';
  
  describe('CorelDRAW Object Styling', () => {
    let setup: TestSetup;
    
    beforeAll(async () => {
      setup = new TestSetup();
      await setup.initialize();
    });
    
    afterAll(async () => {
      await setup.cleanup();
    });
    
    it('should apply fill color to selected object', async () => {
      // First select an object
      await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'select.object',
        {
          type: 'rectangle',
        }
      );
      
      // Then apply fill
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'modify.fill',
        {
          color: '#00FF00',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should apply outline properties to selected object', async () => {
      // First select an object
      await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'select.object',
        {
          type: 'ellipse',
        }
      );
      
      // Then apply outline
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'modify.outline',
        {
          color: '#FF0000',
          width: 2,
          style: 'dashed',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should modify text properties', async () => {
      // First select text
      await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'select.object',
        {
          type: 'text',
        }
      );
      
      // Then modify text
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'modify.text',
        {
          text: 'Updated Text',
          fontSize: 36,
          bold: true,
        }
      );
      
      expect(result.body.success).toBe(true);
    });
  });
  ```

- [ ] Tests voor documentbeheer:
  ```typescript
  // server/test/e2e/coreldraw/document.test.ts
  
  import { Test } from '@nestjs/testing';
  import { TestSetup } from '../setup';
  import { endpoints } from '../endpoints';
  
  describe('CorelDRAW Document Management', () => {
    let setup: TestSetup;
    
    beforeAll(async () => {
      setup = new TestSetup();
      await setup.initialize();
    });
    
    afterAll(async () => {
      await setup.cleanup();
    });
    
    it('should create a new document', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'document.new',
        {
          width: 800,
          height: 600,
          units: 'mm',
          colorMode: 'RGB',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should add a new page', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'document.addPage',
        {
          afterPage: 1,
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should navigate to a specific page', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'coreldraw',
        'document.goToPage',
        {
          pageNumber: 2,
        }
      );
      
      expect(result.body.success).toBe(true);
    });
  });
  ```

### Stap 3: Basiscommando's voor Blender testen
- [ ] Tests voor primitieve objecten aanmaken:
  ```typescript
  // server/test/e2e/blender/basic-shapes.test.ts
  
  import { Test } from '@nestjs/testing';
  import { TestSetup } from '../setup';
  import { endpoints } from '../endpoints';
  
  describe('Blender Basic Shapes', () => {
    let setup: TestSetup;
    
    beforeAll(async () => {
      setup = new TestSetup();
      await setup.initialize();
    });
    
    afterAll(async () => {
      await setup.cleanup();
    });
    
    it('should create a cube', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'create.cube',
        {
          location: [0, 0, 0],
          size: 2,
          material: 'Red',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should create a sphere', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'create.sphere',
        {
          location: [3, 0, 0],
          radius: 1,
          segments: 32,
          rings: 16,
          material: 'Blue',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should create a plane', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'create.plane',
        {
          location: [0, 0, -1],
          size: 10,
          material: 'White',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should select objects by type', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'select.object',
        {
          type: 'MESH',
          name: 'Cube',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
  });
  ```

- [ ] Tests voor materialen en texturen:
  ```typescript
  // server/test/e2e/blender/materials.test.ts
  
  import { Test } from '@nestjs/testing';
  import { TestSetup } from '../setup';
  import { endpoints } from '../endpoints';
  
  describe('Blender Materials and Textures', () => {
    let setup: TestSetup;
    
    beforeAll(async () => {
      setup = new TestSetup();
      await setup.initialize();
    });
    
    afterAll(async () => {
      await setup.cleanup();
    });
    
    it('should create a new material', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'material.create',
        {
          name: 'GlassMaterial',
          baseColor: [0.8, 0.8, 1.0, 1.0],
          metallic: 0.0,
          roughness: 0.1,
          transmission: 0.9,
          ior: 1.45,
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should apply material to selected object', async () => {
      // First select an object
      await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'select.object',
        {
          type: 'MESH',
          name: 'Sphere',
        }
      );
      
      // Then apply material
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'material.apply',
        {
          name: 'GlassMaterial',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should create a texture and apply it to a material', async () => {
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'texture.create',
        {
          type: 'image',
          name: 'WoodTexture',
          filepath: '/path/to/texture.jpg',
          materialName: 'WoodMaterial',
          mappingType: 'UV',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
  });
  ```

- [ ] Tests voor transformaties:
  ```typescript
  // server/test/e2e/blender/transformations.test.ts
  
  import { Test } from '@nestjs/testing';
  import { TestSetup } from '../setup';
  import { endpoints } from '../endpoints';
  
  describe('Blender Object Transformations', () => {
    let setup: TestSetup;
    
    beforeAll(async () => {
      setup = new TestSetup();
      await setup.initialize();
    });
    
    afterAll(async () => {
      await setup.cleanup();
    });
    
    it('should move selected object', async () => {
      // First select an object
      await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'select.object',
        {
          name: 'Cube',
        }
      );
      
      // Then move it
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'transform.translate',
        {
          vector: [1, 2, 3],
          relative: true,
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should rotate selected object', async () => {
      // First select an object
      await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'select.object',
        {
          name: 'Cube',
        }
      );
      
      // Then rotate it
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'transform.rotate',
        {
          angles: [0, 0, 45],  // Degrees
          axis: 'Z',
        }
      );
      
      expect(result.body.success).toBe(true);
    });
    
    it('should scale selected object', async () => {
      // First select an object
      await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'select.object',
        {
          name: 'Cube',
        }
      );
      
      // Then scale it
      const result = await endpoints.testSoftwareCommand(
        setup,
        'blender',
        'transform.scale',
        {
          factors: [2, 2, 2],  // Double the size in all dimensions
          uniform: true,
        }
      );
      
      expect(result.body.success).toBe(true);
    });
  });
  ```

### Stap 4: Intent recognition tests
- [ ] Tests voor natuurlijke taal commando's:
  ```typescript
  // server/test/e2e/intent/design-commands.test.ts
  
  import { Test } from '@nestjs/testing';
  import { TestSetup } from '../setup';
  import { endpoints } from '../endpoints';
  
  describe('Intent Recognition for Design Commands', () => {
    let setup: TestSetup;
    
    beforeAll(async () => {
      setup = new TestSetup();
      await setup.initialize();
    });
    
    afterAll(async () => {
      await setup.cleanup();
    });
    
    it('should recognize CorelDRAW shape creation commands', async () => {
      const messages = [
        'create a red rectangle',
        'draw a circle with blue fill',
        'make a text box with the text "Hello World"',
      ];
      
      for (const message of messages) {
        const result = await endpoints.testIntentProcessing(setup, message);
        
        expect(result.body.confidence).toBeGreaterThan(0.7);
        expect(result.body.intent).toMatch(/^create\./);
        expect(result.body.parameters).toBeDefined();
      }
    });
    
    it('should recognize Blender shape creation commands', async () => {
      const messages = [
        'create a cube',
        'add a sphere at position 0, 0, 5',
        'make a plane with size 10',
      ];
      
      for (const message of messages) {
        const result = await endpoints.testIntentProcessing(setup, message);
        
        expect(result.body.confidence).toBeGreaterThan(0.7);
        expect(result.body.intent).toMatch(/^create\./);
        expect(result.body.parameters).toBeDefined();
      }
    });
    
    it('should recognize selection commands', async () => {
      const messages = [
        'select all rectangles',
        'select the blue circle',
        'select object named Cube',
      ];
      
      for (const message of messages) {
        const result = await endpoints.testIntentProcessing(setup, message);
        
        expect(result.body.confidence).toBeGreaterThan(0.7);
        expect(result.body.intent).toMatch(/^select\./);
        expect(result.body.parameters).toBeDefined();
      }
    });
  });
  ```

- [ ] Tests voor ambigue commando's:
  ```typescript
  // server/test/e2e/intent/ambiguous-commands.test.ts
  
  import { Test } from '@nestjs/testing';
  import { TestSetup } from '../setup';
  import { endpoints } from '../endpoints';
  
  describe('Intent Recognition for Ambiguous Commands', () => {
    let setup: TestSetup;
    
    beforeAll(async () => {
      setup = new TestSetup();
      await setup.initialize();
    });
    
    afterAll(async () => {
      await setup.cleanup();
    });
    
    it('should handle ambiguous platform commands', async () => {
      // These commands could apply to either CorelDRAW or Blender
      const messages = [
        'create a red square',
        'select all objects',
        'move the selected object up',
      ];
      
      for (const message of messages) {
        const result = await endpoints.testIntentProcessing(setup, message);
        
        // When the platform is ambiguous, it should either:
        // 1. Return a confidence below a certain threshold
        // 2. Provide multiple possible interpretations
        // 3. Add a clarification request
        
        if (result.body.confidence < 0.7) {
          // Low confidence case
          expect(result.body.needsClarification).toBe(true);
        } else {
          // High confidence case should include the platform
          expect(result.body.parameters).toHaveProperty('platform');
        }
      }
    });
    
    it('should handle ambiguous parameter commands', async () => {
      // These commands have ambiguous parameters
      const messages = [
        'make it bigger',
        'change the color',
        'rotate it',
      ];
      
      for (const message of messages) {
        const result = await endpoints.testIntentProcessing(setup, message);
        
        // Should identify that parameters are missing
        expect(result.body.missingParameters).toBeDefined();
        expect(result.body.missingParameters.length).toBeGreaterThan(0);
      }
    });
  });
  ```

- [ ] Tests voor contextafhankelijke commando's:
  ```typescript
  // server/test/e2e/intent/context-dependent-commands.test.ts
  
  import { Test } from '@nestjs/testing';
  import { TestSetup } from '../setup';
  import { endpoints } from '../endpoints';
  import { corelDrawContextFixture, blenderContextFixture } from '../fixtures/context-fixtures';
  
  describe('Intent Recognition for Context-Dependent Commands', () => {
    let setup: TestSetup;
    
    beforeAll(async () => {
      setup = new TestSetup();
      await setup.initialize();
      
      // Mock the context services
      jest.spyOn(setup.softwareService, 'getDesignContext').mockImplementation((platform) => {
        if (platform === 'coreldraw') {
          return Promise.resolve(corelDrawContextFixture);
        } else {
          return Promise.resolve(blenderContextFixture);
        }
      });
    });
    
    afterAll(async () => {
      await setup.cleanup();
    });
    
    it('should use CorelDRAW context for relative commands', async () => {
      // Set CorelDRAW as active platform
      const messages = [
        'make it red', 
        'delete the selected object',
        'duplicate this and move it to the right',
      ];
      
      for (const message of messages) {
        const result = await endpoints.testIntentProcessing(setup, message);
        
        expect(result.body.platform).toBe('coreldraw');
        expect(result.body.confidence).toBeGreaterThan(0.7);
        expect(result.body.usedContext).toBe(true);
      }
    });
    
    it('should use Blender context for relative commands', async () => {
      // Set Blender as active platform
      const messages = [
        'scale it up by 2',
        'delete the selected object',
        'add a material to this',
      ];
      
      for (const message of messages) {
        const result = await endpoints.testIntentProcessing(setup, message);
        
        expect(result.body.platform).toBe('blender');
        expect(result.body.confidence).toBeGreaterThan(0.7);
        expect(result.body.usedContext).toBe(true);
      }
    });
    
    it('should use selection context for operations', async () => {
      const messages = [
        'group these objects',
        'align the selected objects',
        'rotate the selected object by 45 degrees',
      ];
      
      for (const message of messages) {
        const result = await endpoints.testIntentProcessing(setup, message);
        
        // Should use the selection information from context
        expect(result.body.usedSelectionContext).toBe(true);
        // The paramaeters should include the selection
        expect(result.body.parameters).toHaveProperty('selection');
      }
    });
  });
  ```

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