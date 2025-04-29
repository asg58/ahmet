# Object Model Command Adapter Patroon

Dit document beschrijft het Object Model Command Adapter patroon dat gebruikt wordt om het commando-systeem te verbinden met het Universal Object Model in de AI Design Agent applicatie.

## Probleemstelling

In een systeem dat verschillende designplatformen (CorelDRAW, Blender) aanstuurt, ontstaan twee natuurlijke paradigma's:

1. **Command-gebaseerde benadering**: Gestructureerde commando's sturen naar de software om acties uit te voeren.
2. **Object-gebaseerde benadering**: Directe interactie met objecten en hun eigenschappen/methoden.

Beide benaderingen hebben voor- en nadelen:

**Command Paradigma**:
- ✅ Eenvoudig te begrijpen en implementeren
- ✅ Makkelijk te mappen naar natuurlijke taal
- ❌ Minder flexibel voor complexe operaties
- ❌ Beperkte foutafhandeling

**Object Model Paradigma**:
- ✅ Rijkere interactie met objecten
- ✅ Betere expressiviteit en flexibiliteit
- ✅ Betere foutdiagnose
- ❌ Complexer om te implementeren
- ❌ Minder direct te mappen van natuurlijke taal

## De Adapter Oplossing

Het Object Model Command Adapter patroon biedt een brug tussen deze twee paradigma's:

```
User Request → Command → ObjectModelCommandAdapter → UniversalObjectModel → Software
```

De adapter accepteert commando's in dezelfde formaat als het command paradigma, maar vertaalt deze naar object model operaties.

## Implementatie

```typescript
@Injectable()
export class ObjectModelCommandAdapter {
  constructor(
    private readonly commandFactory: CommandFactoryService,
    private readonly blenderObjectModel: BlenderObjectModel,
    private readonly corelDrawObjectModel: CorelDrawObjectModel
  ) {}
  
  async executeCommandViaObjectModel(
    platform: 'coreldraw' | 'blender',
    action: string,
    params: Record<string, any> = {}
  ): Promise<CommandExecutionResult> {
    // Get the appropriate object model based on platform
    const objectModel = this.getObjectModel(platform);
    
    try {
      if (platform === 'blender') {
        return await this.executeBlenderCommand(objectModel, action, params);
      } else if (platform === 'coreldraw') {
        return await this.executeCorelDrawCommand(objectModel, action, params);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      // Fall back to command factory if object model fails
      return this.commandFactory.executeCommand(platform, action, params);
    }
  }
}
```

## Concrete Voorbeelden

### Voorbeeld 1: Rechthoek aanmaken in CorelDRAW

**Command Benadering**:
```typescript
const result = await commandFactory.executeCommand(
  'coreldraw',
  'create_rectangle', 
  { x: 100, y: 100, width: 200, height: 150 }
);
```

**Via Object Model Adapter**:
```typescript
// Intern vertaalt de adapter dit naar:
const context = await objectModel.getCurrentContext();
const activePage = context.documentPath + '.ActivePage';
        
const result = await objectModel.invokeMethod(
  activePage,
  'CreateRectangle',
  [x, y, x + width, y + height]
);
```

### Voorbeeld 2: Kubus aanmaken in Blender

**Command Benadering**:
```typescript
const result = await commandFactory.executeCommand(
  'blender',
  'create_cube', 
  { location: [1, 2, 3], size: 2 }
);
```

**Via Object Model Adapter**:
```typescript
// Intern vertaalt de adapter dit naar:
const result = await objectModel.invokeMethod(
  'bpy.ops.mesh', 
  'primitive_cube_add', 
  [{ size, location }]
);
```

## Fallback Mechanisme

Een sleutelvoordeel van het adapter patroon is het ingebouwde fallback mechanisme:

```typescript
try {
  // Probeer via object model te werken
  return await this.executeBlenderCommand(objectModel, action, params);
} catch (error) {
  // Als dat faalt, val terug op commandofactory
  this.logger.debug(`Falling back to command factory execution`);
  return this.commandFactory.executeCommand(platform, action, params);
}
```

Dit zorgt ervoor dat operaties nog steeds kunnen slagen, zelfs als de object model-gebaseerde benadering faalt.

## Voordelen

1. **Verenigt twee paradigma's**: Het systeem kan zowel command- als object-gebaseerd werken
2. **Verbeterde flexibiliteit**: Rijkere interacties met objecten
3. **Betere foutafhandeling**: Meer gedetailleerde foutinformatie
4. **Granulaire controle**: Fijnere controle over object interacties
5. **Graceful Degradation**: Valt terug op eenvoudigere mechanismen indien nodig

## Architecturale Implicaties

Het gebruik van dit patroon heeft architecturale implicaties:

1. **Dependency Injection**: Verbetert testbaarheid en modulariteit
2. **Interface Segregation**: De UniversalObjectModel interface is onafhankelijk van specifieke platformen
3. **Liskov Substitutie**: Elke platform-specifieke objectmodel implementatie kan verwisseld worden

## Testing

De test benadering voor de adapter omvat:

1. **Unit Tests**: Verifieert dat de adapter correct vertaalt tussen paradigma's
2. **Mock-gebaseerde tests**: Gebruikt mocks voor de objectmodellen en command factory
3. **Fallback Tests**: Zorgt dat de fallback mechanismen werken zoals verwacht

## Conclusie

Het Object Model Command Adapter patroon biedt een elegante oplossing voor het verbinden van command-gebaseerde en object-model gebaseerde paradigma's in de designsoftware-integratie. Het levert een verbeterde gebruikservaring zonder in te boeten op robuustheid of uitbreidbaarheid. 