# UniversalObjectModelNavigator - Implementatieplan

## Overzicht

De UniversalObjectModelNavigator is een essentiële component die een uniform abstractielaag biedt voor verschillende design software platformen (CorelDRAW en Blender). De basisstructuur is al geïmplementeerd (±30%), maar een aantal kritieke onderdelen moeten nog worden voltooid.

## Huidige Status

### Geïmplementeerde Componenten

✅ **Interface Definities**
- UniversalObjectModel interface
- Object-, Property- en Method-descriptors
- Basisstructuur voor platform-specifieke implementaties

✅ **CodeExecutor Framework**
- Algemene code-executie interfaces
- Platform-specifieke executors (CorelDRAW VBA, Blender Python)
- CodeExecutorFactory service

✅ **Basis Implementaties**
- Gedeeltelijke implementatie van CorelDrawObjectModel
- Gedeeltelijke implementatie van BlenderObjectModel
- Rudimentaire object model navigatie

### Missende of Onvolledige Componenten

❌ **Object Discovery Mechanisme**
- Dynamische object hiërarchie exploratie
- Smart caching voor objectboom
- Recursive discovery strategie

❌ **Geavanceerde Property Manipulatie**
- Type conversie tussen platformen
- Batch property setting
- Real-time property tracking

❌ **Robuste Method Invocation**
- Parameter validatie en transformatie
- Error handling en recovery
- Result post-processing

❌ **Object Model Mapping Service**
- Cross-platform conceptmapping
- Semantische object model mapping
- Query capabilities

## Implementatie Stappen

### 1. Voltooi Object Discovery Mechanisme (2 dagen)

1.1 **Recursive Object Explorer**
```typescript
// server/src/software/universal/object-explorer.ts
import { Injectable, Logger } from '@nestjs/common';
import { UniversalObjectModel, ObjectPath, ObjectDescriptor } from './universal-object-model';

@Injectable()
export class ObjectExplorer {
  private readonly logger = new Logger(ObjectExplorer.name);
  private cachedObjects: Map<string, ObjectDescriptor> = new Map();
  
  constructor() {}
  
  /**
   * Recursively discover objects in the hierarchy
   */
  async exploreObjects(
    objectModel: UniversalObjectModel,
    startPath: ObjectPath,
    maxDepth: number = 2
  ): Promise<ObjectDescriptor[]> {
    this.logger.debug(`Exploring objects from ${startPath} with max depth ${maxDepth}`);
    
    const result: ObjectDescriptor[] = [];
    await this.exploreRecursive(objectModel, startPath, result, 0, maxDepth);
    return result;
  }
  
  private async exploreRecursive(
    objectModel: UniversalObjectModel,
    currentPath: ObjectPath,
    result: ObjectDescriptor[],
    currentDepth: number,
    maxDepth: number
  ): Promise<void> {
    // Check cache first
    const cacheKey = `${objectModel.getCapabilities().then(cap => cap.platform)}_${currentPath}`;
    if (this.cachedObjects.has(cacheKey)) {
      result.push(this.cachedObjects.get(cacheKey));
      return;
    }
    
    // Get descriptor for current object
    try {
      const descriptor = await objectModel.getObjectDescriptor(currentPath);
      result.push(descriptor);
      this.cachedObjects.set(cacheKey, descriptor);
      
      // Stop recursion if we've reached max depth
      if (currentDepth >= maxDepth) {
        return;
      }
      
      // Explore children if available
      if (descriptor.children && descriptor.children.length > 0) {
        for (const childPath of descriptor.children) {
          await this.exploreRecursive(
            objectModel,
            childPath,
            result,
            currentDepth + 1,
            maxDepth
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error exploring object at ${currentPath}: ${error.message}`);
    }
  }
  
  /**
   * Clear explorer cache
   */
  clearCache(): void {
    this.cachedObjects.clear();
  }
}
```

1.2 **Intelligent Cache Management**
- Implementeer time-based cache invalidation
- Voeg dependency tracking toe voor gerelateerde cache entries
- Voeg smart prefetching toe voor veelgebruikte objecten

1.3 **Object Path Resolution**
- Implementeer relative path resolution
- Voeg path pattern matching toe
- Voeg robust error handling toe voor invalid paths

### 2. Implementeer Geavanceerde Property Manipulatie (1 dag)

2.1 **Type Conversion Service**
```typescript
// server/src/software/universal/type-conversion.service.ts
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TypeConversionService {
  private readonly logger = new Logger(TypeConversionService.name);
  
  /**
   * Convert a value from source type to target type
   */
  convert(value: any, sourceType: string, targetType: string): any {
    this.logger.debug(`Converting value from ${sourceType} to ${targetType}`);
    
    // Handle basic type conversions
    if (sourceType === 'string') {
      return this.convertFromString(value, targetType);
    } else if (sourceType === 'number') {
      return this.convertFromNumber(value, targetType);
    } else if (sourceType === 'boolean') {
      return this.convertFromBoolean(value, targetType);
    } else if (sourceType === 'object') {
      return this.convertFromObject(value, targetType);
    } else if (sourceType === 'array') {
      return this.convertFromArray(value, targetType);
    } else if (sourceType === 'color') {
      return this.convertFromColor(value, targetType);
    } else if (sourceType === 'vector') {
      return this.convertFromVector(value, targetType);
    }
    
    // Default - return as is with warning
    this.logger.warn(`No conversion defined from ${sourceType} to ${targetType}`);
    return value;
  }
  
  // Implementeer de verschillende conversie methoden
  private convertFromString(value: string, targetType: string): any {
    // ...
  }
  
  private convertFromNumber(value: number, targetType: string): any {
    // ...
  }
  
  // ... andere conversie methoden
}
```

2.2 **Batch Property Operations**
- Implementeer atomic batch property updates
- Voeg transaction-like behavior toe met rollback capabilities
- Voeg dependency-aware property updates toe

2.3 **Property Change Tracking**
- Implementeer property change events
- Voeg history tracking toe voor property changes
- Implementeer undo/redo functionaliteit

### 3. Implementeer Robuste Method Invocation (2 dagen)

3.1 **Parameter Validation Service**
```typescript
// server/src/software/universal/parameter-validation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MethodDescriptor, ParameterDescriptor } from './universal-object-model';
import { TypeConversionService } from './type-conversion.service';

@Injectable()
export class ParameterValidationService {
  private readonly logger = new Logger(ParameterValidationService.name);
  
  constructor(private readonly typeConversionService: TypeConversionService) {}
  
  /**
   * Validate and prepare parameters for method invocation
   */
  validateAndPrepareParameters(
    methodDescriptor: MethodDescriptor,
    providedArgs: any[]
  ): { valid: boolean; args: any[]; errors: string[] } {
    this.logger.debug(`Validating parameters for method ${methodDescriptor.name}`);
    
    const result = {
      valid: true,
      args: [] as any[],
      errors: [] as string[]
    };
    
    // Check if we have all required parameters
    const requiredParams = methodDescriptor.parameters.filter(p => !p.optional);
    if (providedArgs.length < requiredParams.length) {
      result.valid = false;
      result.errors.push(`Missing required parameters. Expected at least ${requiredParams.length}, got ${providedArgs.length}`);
      return result;
    }
    
    // Process each parameter
    methodDescriptor.parameters.forEach((paramDesc, index) => {
      if (index < providedArgs.length) {
        // Parameter was provided
        const arg = providedArgs[index];
        
        // Validate and convert if needed
        try {
          const convertedArg = this.typeConversionService.convert(
            arg,
            typeof arg,
            paramDesc.type
          );
          result.args.push(convertedArg);
        } catch (error) {
          result.valid = false;
          result.errors.push(`Error converting parameter ${paramDesc.name}: ${error.message}`);
        }
      } else if (paramDesc.optional) {
        // Use default value for optional parameter
        result.args.push(paramDesc.defaultValue);
      } else {
        // Missing required parameter (should not happen due to earlier check)
        result.valid = false;
        result.errors.push(`Missing required parameter ${paramDesc.name}`);
      }
    });
    
    return result;
  }
}
```

3.2 **Result Post-Processing**
- Implementeer result normalisatie voor consistente uitvoer
- Voeg visual result extraction toe (thumbnails, previews)
- Implementeer result caching voor performance

3.3 **Error Recovery Strategies**
- Implementeer retry logic voor onstabiele methodes
- Voeg fallback mechanismen toe voor kritieke operaties
- Implementeer graceful degradation

### 4. Ontwikkel Object Model Mapping Service (3 dagen)

4.1 **Concept Mapping Framework**
```typescript
// server/src/software/universal/concept-mapping.service.ts
import { Injectable, Logger } from '@nestjs/common';

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

@Injectable()
export class ConceptMappingService {
  private readonly logger = new Logger(ConceptMappingService.name);
  private readonly concepts: Record<string, DesignConcept> = {
    'rectangle': {
      concept: 'rectangle',
      description: 'A four-sided shape with straight sides where all interior angles are 90°',
      corelDrawMapping: 'Page.CreateRectangle',
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
        { 
          name: 'x', 
          type: 'number', 
          description: 'X position',
          corelDrawParam: 'x',
          blenderParam: 'location[0]'
        },
        { 
          name: 'y', 
          type: 'number', 
          description: 'Y position',
          corelDrawParam: 'y',
          blenderParam: 'location[1]'
        }
      ]
    },
    // Meer concepten toevoegen
  };
  
  /**
   * Get mapping for a concept on a specific platform
   */
  getConceptMapping(
    concept: string,
    platform: 'coreldraw' | 'blender'
  ): { objectPath: string; parameters: Record<string, any> } | null {
    const conceptInfo = this.concepts[concept];
    if (!conceptInfo) {
      return null;
    }
    
    let objectPath: string | null = null;
    const parameters: Record<string, any> = {};
    
    if (platform === 'coreldraw' && conceptInfo.corelDrawMapping) {
      objectPath = typeof conceptInfo.corelDrawMapping === 'string' 
        ? conceptInfo.corelDrawMapping 
        : conceptInfo.corelDrawMapping[0];
        
      // Map parameters
      conceptInfo.parameters?.forEach(param => {
        if (param.corelDrawParam) {
          parameters[param.corelDrawParam] = `{${param.name}}`;  // Template for later substitution
        }
      });
    } else if (platform === 'blender' && conceptInfo.blenderMapping) {
      objectPath = typeof conceptInfo.blenderMapping === 'string' 
        ? conceptInfo.blenderMapping 
        : conceptInfo.blenderMapping[0];
        
      // Map parameters
      conceptInfo.parameters?.forEach(param => {
        if (param.blenderParam) {
          parameters[param.blenderParam] = `{${param.name}}`;  // Template for later substitution
        }
      });
    }
    
    if (!objectPath) {
      return null;
    }
    
    return { objectPath, parameters };
  }
  
  /**
   * Get all available concepts
   */
  getAllConcepts(): string[] {
    return Object.keys(this.concepts);
  }
  
  /**
   * Get detailed information about a concept
   */
  getConceptInfo(concept: string): DesignConcept | null {
    return this.concepts[concept] || null;
  }
}
```

4.2 **Semantic Object Resolution**
- Implementeer fuzzy matching voor concept-naar-object mapping
- Voeg context-aware resolution toe
- Implementeer machine learning-based suggestions

4.3 **Query Capabilities**
- Implementeer natuurlijke taal queries naar object model
- Voeg ingebouwde query templates toe
- Implementeer query optimalisatie

### 5. Integratie en Testing (2 dagen)

5.1 **Integration Service**
```typescript
// server/src/software/universal/universal-navigator.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { 
  UniversalObjectModel, 
  ObjectPath, 
  ObjectDescriptor,
  PropertyResult,
  MethodResult
} from './universal-object-model';
import { ObjectExplorer } from './object-explorer';
import { TypeConversionService } from './type-conversion.service';
import { ParameterValidationService } from './parameter-validation.service';
import { ConceptMappingService } from './concept-mapping.service';
import { CorelDrawObjectModel } from './coreldraw-object-model';
import { BlenderObjectModel } from './blender-object-model';

@Injectable()
export class UniversalNavigatorService {
  private readonly logger = new Logger(UniversalNavigatorService.name);
  
  constructor(
    private readonly objectExplorer: ObjectExplorer,
    private readonly typeConversion: TypeConversionService,
    private readonly parameterValidation: ParameterValidationService,
    private readonly conceptMapping: ConceptMappingService,
    private readonly corelDrawModel: CorelDrawObjectModel,
    private readonly blenderModel: BlenderObjectModel
  ) {}
  
  /**
   * Get the appropriate object model for the platform
   */
  getObjectModel(platform: 'coreldraw' | 'blender'): UniversalObjectModel {
    switch (platform) {
      case 'coreldraw':
        return this.corelDrawModel;
      case 'blender':
        return this.blenderModel;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
  
  /**
   * Create an object using a high-level concept
   */
  async createFromConcept(
    concept: string,
    platform: 'coreldraw' | 'blender',
    parameters: Record<string, any>
  ): Promise<MethodResult> {
    this.logger.debug(`Creating ${concept} on ${platform} with parameters:`, parameters);
    
    // Get the concept mapping
    const mapping = this.conceptMapping.getConceptMapping(concept, platform);
    if (!mapping) {
      return {
        success: false,
        returnValue: null,
        error: `Concept ${concept} is not supported on ${platform}`
      };
    }
    
    // Parse object path and method
    const [objectPath, methodName] = this.parseObjectMethod(mapping.objectPath);
    
    // Prepare parameters with substitutions
    const preparedParams = this.prepareParameters(mapping.parameters, parameters);
    
    // Get the object model and invoke method
    const objectModel = this.getObjectModel(platform);
    return objectModel.invokeMethod(objectPath, methodName, Object.values(preparedParams));
  }
  
  /**
   * Parse a path.method string into [path, method]
   */
  private parseObjectMethod(path: string): [string, string] {
    const lastDotIndex = path.lastIndexOf('.');
    if (lastDotIndex === -1) {
      throw new Error(`Invalid object.method path: ${path}`);
    }
    
    const objectPath = path.substring(0, lastDotIndex);
    const methodName = path.substring(lastDotIndex + 1);
    
    return [objectPath, methodName];
  }
  
  /**
   * Prepare parameters with substitutions from user parameters
   */
  private prepareParameters(
    templateParams: Record<string, any>,
    userParams: Record<string, any>
  ): Record<string, any> {
    const result: Record<string, any> = {};
    
    for (const [key, template] of Object.entries(templateParams)) {
      if (typeof template === 'string' && template.startsWith('{') && template.endsWith('}')) {
        const paramName = template.substring(1, template.length - 1);
        result[key] = userParams[paramName];
      } else {
        result[key] = template;
      }
    }
    
    return result;
  }
  
  /**
   * Explore the object model hierarchy
   */
  async exploreObjectModel(
    platform: 'coreldraw' | 'blender',
    startPath?: string,
    maxDepth: number = 2
  ): Promise<ObjectDescriptor[]> {
    const objectModel = this.getObjectModel(platform);
    const rootPath = startPath || (await objectModel.getRootObjects())[0];
    
    return this.objectExplorer.exploreObjects(objectModel, rootPath, maxDepth);
  }
  
  /**
   * Execute a search query across the object model
   */
  async searchObjects(
    platform: 'coreldraw' | 'blender',
    query: string
  ): Promise<ObjectDescriptor[]> {
    const objectModel = this.getObjectModel(platform);
    const paths = await objectModel.findObjects(query);
    
    const results: ObjectDescriptor[] = [];
    for (const path of paths) {
      try {
        const descriptor = await objectModel.getObjectDescriptor(path);
        results.push(descriptor);
      } catch (error) {
        this.logger.error(`Error getting descriptor for ${path}: ${error.message}`);
      }
    }
    
    return results;
  }
  
  /**
   * Clear the object explorer cache
   */
  clearCache(): void {
    this.objectExplorer.clearCache();
  }
}
```

5.2 **Comprehensive Unit Tests**
- Implementeer unit tests voor elke service
- Voeg mock object models toe voor testing
- Implementeer integration tests

5.3 **API Documentation**
- Genereer API documentatie
- Voeg gebruiksvoorbeelden toe
- Dokumenteer best practices

## Integratie met Andere Componenten

### DesignContextAnalyzer Integratie
- Gebruik UniversalObjectModel om huidige document context op te halen
- Koppel context events aan object model updates
- Implementeer bidirectionele synchronisatie

### Objectmodel Command Adapter Verbetering
- Update adapter om nieuwe Universal Navigator Service te gebruiken
- Verbeter error handling
- Voeg caching toe voor performance

## Timeline en Resources

### Tijdsinschatting
- **Object Discovery Mechanisme**: 2 dagen
- **Property Manipulatie**: 1 dag
- **Method Invocation**: 2 dagen
- **Object Model Mapping**: 3 dagen
- **Integratie en Testing**: 2 dagen

**Totaal**: 10 werkdagen

### Resources
- 1 full-time backend developer met ervaring in TypeScript en NestJS
- Toegang tot zowel CorelDRAW als Blender voor testing
- Documentatie over COM/VBA en Blender Python API

## Conclusie

De voltooiing van de UniversalObjectModelNavigator is een kritieke stap voor het project. Dit component vormt de ruggengraat van de abstractielaag tussen de AI en de design software. Met de bovenstaande implementaties zal het mogelijk zijn om op een uniforme, veilige en efficiënte manier met verschillende design softwareplatformen te communiceren, wat essentieel is voor de context-aware functionaliteit.

Na implementatie van dit plan zal de component voor 100% gereed zijn en een solide basis vormen voor de verdere ontwikkeling van de DesignContextAnalyzer en de end-to-end testing van de volledige applicatie. 