# Teststrategie voor Command Systeem

Dit document beschrijft de teststrategie voor het command systeem en de object model adapter om consistente en betrouwbare functionaliteit te waarborgen.

## Testtypen

### 1. Unit Tests

Unit tests richten zich op individuele componenten en garanderen dat elke onderdeel correct werkt.

#### CommandFactoryService

```typescript
// server/test/unit/command-factory.service.spec.ts

describe('CommandFactoryService', () => {
  let service: CommandFactoryService;
  let corelCommandsService: jest.Mocked<CorelDrawCommandsService>;
  let blenderCommandsService: jest.Mocked<BlenderCommandsService>;
  
  // Tests voor executeCommand methode
  it('should execute CorelDRAW command', async () => {
    // Arrange - Voorbereiding testdata
    // Act - Uitvoeren van de methode
    // Assert - Verifiëren van het resultaat
  });
  
  // Tests voor elke actietype en platform
  it('should handle unknown actions', async () => {
    // ...
  });
});
```

#### ObjectModelCommandAdapter

```typescript
// server/test/unit/object-model-command-adapter.spec.ts

describe('ObjectModelCommandAdapter', () => {
  let adapter: ObjectModelCommandAdapter;
  let commandFactory: jest.Mocked<CommandFactoryService>;
  let blenderObjectModel: jest.Mocked<BlenderObjectModel>;
  let corelDrawObjectModel: jest.Mocked<CorelDrawObjectModel>;
  
  // Tests voor executeCommandViaObjectModel
  it('should execute command via object model', async () => {
    // ...
  });
  
  // Tests voor fallback mechanisme
  it('should fall back to command factory when object model execution fails', async () => {
    // ...
  });
});
```

#### CorelDrawCommandsService en BlenderCommandsService 

```typescript
// server/test/unit/corel-commands.service.spec.ts

describe('CorelDrawCommandsService', () => {
  // Tests voor shape creation
  it('should create a rectangle with default parameters', async () => {
    // ...
  });
  
  // Tests voor error handling
  it('should handle errors when creating shapes', async () => {
    // ...
  });
});
```

```typescript
// server/test/unit/blender-commands.service.spec.ts

describe('BlenderCommandsService', () => {
  // Tests voor object creation
  it('should create a cube with default parameters', async () => {
    // ...
  });
  
  // Tests voor material application
  it('should apply material to an object', async () => {
    // ...
  });
});
```

### 2. Integratietests

Integratietests richten zich op de samenwerking tussen verschillende componenten.

```typescript
// server/test/integration/object-model-adapter-integration.spec.ts

describe('ObjectModelCommandAdapter Integration', () => {
  let objectModelAdapter: ObjectModelCommandAdapter;
  let commandFactoryService: CommandFactoryService;
  let blenderObjectModel: BlenderObjectModel;
  let corelDrawObjectModel: CorelDrawObjectModel;
  
  // Tests voor de volledige chain van commandoadapter naar objectmodel naar softwareservice
  it('should execute CorelDRAW rectangle command end-to-end', async () => {
    // ...
  });
  
  it('should execute Blender cube command end-to-end', async () => {
    // ...
  });
});
```

### 3. End-to-End Tests

End-to-end tests richten zich op de volledige applicatie-flow vanaf het API-endpoint tot de software integratie.

```typescript
// server/test/e2e/commands/create-shape.test.ts

describe('Create Shape Commands', () => {
  // Tests voor het aanmaken van shapes via de API
  it('should create a rectangle in CorelDRAW', async () => {
    // ...
  });
  
  it('should create a cube in Blender', async () => {
    // ...
  });
});
```

## Testdekking

Het doel is om hoge testdekking te bereiken voor de volgende componenten:

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|------------|-------------------|-----------|
| CommandTypes | ✅ 90%+ | n/a | n/a |
| CommandFactoryService | ✅ 90%+ | ✅ 70%+ | ✅ 50%+ |
| CorelDrawCommandsService | ✅ 80%+ | ✅ 60%+ | ✅ 40%+ |
| BlenderCommandsService | ✅ 80%+ | ✅ 60%+ | ✅ 40%+ |
| ObjectModelCommandAdapter | ✅ 90%+ | ✅ 70%+ | ✅ 30%+ |

## Mock Strategieën

### Software Service Mocking

Voor unit tests worden de CorelDrawService en BlenderService gemockt:

```typescript
const mockCorelDrawService = {
  executeCode: jest.fn().mockResolvedValue({
    success: true,
    output: 'Executed CorelDRAW code'
  }),
  executeMethod: jest.fn().mockResolvedValue({
    success: true,
    result: { objectId: 'corel-123' }
  }),
  getStatus: jest.fn().mockResolvedValue({ connected: true })
};
```

### Object Model Mocking

Voor tests van de adapter worden de object models gemockt:

```typescript
const mockBlenderObjectModel = {
  invokeMethod: jest.fn().mockResolvedValue({
    success: true,
    returnValue: 'mock-object-path'
  }),
  executeCode: jest.fn().mockResolvedValue({
    success: true,
    output: 'Executed Blender code'
  }),
  getCurrentContext: jest.fn().mockResolvedValue({
    documentPath: 'bpy.data',
    selectedObjects: ['Cube']
  })
};
```

## Test Pipeline

De tests worden uitgevoerd in de volgende pijplijn:

1. **Lint en TypeCheck** - Eerst statische code validatie
2. **Unit Tests** - Vervolgens tests voor individuele componenten
3. **Integration Tests** - Tests voor samenwerking tussen componenten
4. **E2E Tests** - Volledige flow tests (enkel in CI/CD)

## Testautomatisering

De tests worden geautomatiseerd uitgevoerd bij:

1. Lokale ontwikkeling (git pre-commit hook)
2. Pull Request validatie
3. CI/CD pipeline voor deployment

## Manuele Testen

Naast geautomatiseerde tests is er een testplan voor manuele validatie van de volgende aspecten:

1. **UI Interactie** - Testen van de frontend integratie
2. **Performantie** - Validatie van responstijden bij complexe operaties
3. **Error Recovery** - Herstellen na fouten in de software-integratie

## Testdocumentatie

Testresultaten worden gedocumenteerd in:

1. **Test Reports** - Automatisch gegenereerd na test runs
2. **Coverage Reports** - Testdekking per component
3. **Bug Tracking** - Geïdentificeerde issues worden vastgelegd in JIRA 