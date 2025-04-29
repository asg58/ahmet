# Command System Architectuur

Dit document beschrijft de algehele architectuur van het command systeem dat wordt gebruikt voor de integratie tussen de AI agent en de ontwerpapplicaties (CorelDRAW en Blender).

## Overzicht

Het command systeem maakt het mogelijk om high-level acties uit te voeren in verschillende ontwerpsoftware via een uniforme interface. De architectuur bestaat uit de volgende hoofdcomponenten:

1. **Command Services** - Platform-specifieke implementaties van commando's
2. **Command Factory** - Routeert commando's naar de juiste implementatie
3. **Object Model** - Biedt object-gebaseerde toegang tot de software
4. **Object Model Command Adapter** - Verbindt het commando-systeem met het objectmodel

## Command Types

Alle commando's gebruiken een gemeenschappelijke `CommandResult` interface, gedefinieerd in `command.types.ts`:

```typescript
export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: any;
  code?: string;
  visualData?: {
    type: 'image' | '3d' | 'svg';
    data: string;
  };
}
```

Platformtypen worden gedefinieerd als:

```typescript
export type SupportedPlatform = 'coreldraw' | 'blender';
```

## Command Services

### CorelDrawCommandsService

Bevat implementaties voor:
- Vormen maken (rechthoek, ellips, tekst, polygoon)
- Objectselectie
- Groepering
- Vulling en outline toepassen

### BlenderCommandsService

Bevat implementaties voor:
- 3D objecten maken (kubus, bol, cilinder, vlak, tekst)
- Materialen toepassen
- Camera en belichting instellen
- Objecten transformeren
- Scene renderen

## Command Factory

De `CommandFactoryService` fungeert als façade voor alle commando-implementaties:

1. Het accepteert een platform, actie en parameters
2. Het routeert de actie naar de juiste platform-specifieke command service
3. Het normaliseert de resultaten en foutafhandeling

## Object Model

Het Universal Object Model biedt een object-georiënteerde abstractie van elke ontwerpsoftware:

```typescript
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

### Platform-specifieke implementaties:
- `BlenderObjectModel` - Implementeert de abstractie voor Blender via de Python API
- `CorelDrawObjectModel` - Implementeert de abstractie voor CorelDRAW via de VBA/COM API

## Object Model Command Adapter

De `ObjectModelCommandAdapter` is een sleutelcomponent die het commando-systeem verbindt met het objectmodel:

1. Het accepteert commando's in hetzelfde formaat als de CommandFactory
2. Het vertaalt deze naar objectmodel operaties
3. Het biedt verbeterde flexibiliteit en foutdetectie
4. Het valt terug op het commando-systeem wanneer nodig

Dit zorgt voor betere onderhoudbaarheid en code-hergebruik.

### Voordelen:

1. **Flexibiliteit** - Verschillende benaderingen voor dezelfde operatie (object- vs. commando-gebaseerd)
2. **Foutafhandeling** - Verbeterde foutdetectie en diagnostiek
3. **Abstractie** - Verbergt complexiteit van platform-specifieke implementatiedetails
4. **Fallback-mechanisme** - Zorgt dat operaties nog steeds kunnen slagen via de commandofactory

## Context-aware Aanpassingen

Het systeem gebruikt de `DesignContextAnalyzer` om een beter begrip te krijgen van de huidige staat van het ontwerp:

1. `CorelContextAnalyzer` - Capteert en analyseert CorelDRAW documenten
2. `BlenderContextAnalyzer` - Capteert en analyseert Blender scenes

Deze context wordt gebruikt om:
- Commando's te verfijnen met relevante contextdetails
- Betere voorstellen te doen die zijn afgestemd op de huidige situatie
- Real-time updates te sturen naar de client over wijzigingen in het ontwerp

## Gebruikspatronen

### Basic Command Execution

```typescript
const result = await commandFactory.executeCommand(
  'blender',
  'create_cube', 
  { size: 2, location: [0, 0, 0] }
);
```

### Object Model Command Execution

```typescript
const result = await objectModelAdapter.executeCommandViaObjectModel(
  'blender',
  'create_cube', 
  { size: 2, location: [0, 0, 0] }
);
```

### Context-Aware Command Execution

```typescript
// Haal eerst de huidige design context op
const context = await softwareService.getDesignContext('blender');

// Voer een actie uit met contextkennis
const result = await softwareService.executeAction(
  'blender', 
  'create_cube', 
  { size: 2 }, 
  context
);
```

## Implementatiestatus

| Component | Status | Opmerkingen |
|-----------|--------|-------------|
| CommandTypes | ✅ Voltooid | Gemeenschappelijke types gedefinieerd |
| CorelDrawCommandsService | ✅ Voltooid | Alle basis commands geïmplementeerd |
| BlenderCommandsService | ✅ Voltooid | Alle basis commands geïmplementeerd |
| CommandFactoryService | ✅ Voltooid | Volledige routing geïmplementeerd |
| UniversalObjectModel | ✅ Gedefinieerd | Interface is stabiel |
| BlenderObjectModel | 🔄 In progress | Basis functionaliteit werkt |
| CorelDrawObjectModel | 🔄 In progress | Basis functionaliteit werkt |
| ObjectModelCommandAdapter | ✅ Voltooid | Adapter volledig geïmplementeerd |
| DesignContextAnalyzer | 🔄 In progress | Basis implementatie werkt | 