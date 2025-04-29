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
    
    try {
      return await objectModel.invokeMethod(objectPath, methodName, Object.values(preparedParams));
    } catch (error) {
      this.logger.error(`Error creating ${concept} on ${platform}: ${error.message}`);
      return {
        success: false,
        returnValue: null,
        error: `Failed to create ${concept}: ${error.message}`
      };
    }
  }
  
  /**
   * Execute a natural language command on a platform
   */
  async executeNaturalLanguageCommand(
    command: string,
    platform: 'coreldraw' | 'blender'
  ): Promise<MethodResult> {
    this.logger.debug(`Executing natural language command on ${platform}: ${command}`);
    
    // Try to map the command to a concept
    const conceptMatch = this.conceptMapping.mapDescriptionToConcept(command);
    if (!conceptMatch || conceptMatch.confidence < 0.5) {
      return {
        success: false,
        returnValue: null,
        error: `Could not understand command: ${command}`
      };
    }
    
    this.logger.debug(`Mapped command to concept: ${conceptMatch.concept} with confidence ${conceptMatch.confidence}`);
    
    // Use the extracted parameters or empty object
    const parameters = conceptMatch.parameters || {};
    
    // Execute the concept
    return this.createFromConcept(conceptMatch.concept, platform, parameters);
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
        if (paramName in userParams) {
          result[key] = userParams[paramName];
        } else {
          // Parameter not provided, leave as is for debugging
          result[key] = template;
        }
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
    let rootPath: string;
    
    if (startPath) {
      rootPath = startPath;
    } else {
      const rootObjects = await objectModel.getRootObjects();
      if (rootObjects.length === 0) {
        this.logger.warn(`No root objects found for ${platform}`);
        return [];
      }
      rootPath = rootObjects[0];
    }
    
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
    
    try {
      // First try using the object model's built-in find function
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
    } catch (error) {
      // If built-in search fails, try using our explorer with a slower but more thorough search
      this.logger.warn(`Built-in search failed, falling back to explorer search: ${error.message}`);
      
      const rootObjects = await objectModel.getRootObjects();
      if (rootObjects.length === 0) {
        return [];
      }
      
      // Use the explorer to find objects
      return this.objectExplorer.findObjects(objectModel, query);
    }
  }
  
  /**
   * Get property value with type conversion
   */
  async getPropertyValue(
    platform: 'coreldraw' | 'blender',
    objectPath: string,
    propertyName: string,
    targetType?: string
  ): Promise<PropertyResult> {
    const objectModel = this.getObjectModel(platform);
    
    try {
      const result = await objectModel.getProperty(objectPath, propertyName);
      
      // If target type is specified and different from current type, convert
      if (targetType && result.success && result.type !== targetType) {
        const convertedValue = this.typeConversion.convert(
          result.value,
          result.type,
          targetType
        );
        
        return {
          ...result,
          value: convertedValue,
          type: targetType
        };
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Error getting property ${propertyName} on ${objectPath}: ${error.message}`);
      return {
        value: null,
        type: 'null',
        success: false,
        error: `Failed to get property: ${error.message}`
      };
    }
  }
  
  /**
   * Set property value with type conversion
   */
  async setPropertyValue(
    platform: 'coreldraw' | 'blender',
    objectPath: string,
    propertyName: string,
    value: any,
    sourceType?: string
  ): Promise<PropertyResult> {
    const objectModel = this.getObjectModel(platform);
    
    try {
      // Get property descriptor to know target type
      const objectDescriptor = await objectModel.getObjectDescriptor(objectPath);
      const propertyDescriptor = objectDescriptor.properties.find(p => p.name === propertyName);
      
      if (!propertyDescriptor) {
        throw new Error(`Property ${propertyName} not found on object ${objectPath}`);
      }
      
      if (!propertyDescriptor.writable) {
        throw new Error(`Property ${propertyName} is not writable`);
      }
      
      // Convert value if needed
      const valueType = sourceType || typeof value;
      let convertedValue = value;
      
      if (valueType !== propertyDescriptor.type) {
        convertedValue = this.typeConversion.convert(
          value,
          valueType,
          propertyDescriptor.type
        );
      }
      
      // Set the property
      return objectModel.setProperty(objectPath, propertyName, convertedValue);
    } catch (error) {
      this.logger.error(`Error setting property ${propertyName} on ${objectPath}: ${error.message}`);
      return {
        value: null,
        type: 'null',
        success: false,
        error: `Failed to set property: ${error.message}`
      };
    }
  }
  
  /**
   * Invoke a method with parameter validation and conversion
   */
  async invokeMethod(
    platform: 'coreldraw' | 'blender',
    objectPath: string,
    methodName: string,
    args: any[]
  ): Promise<MethodResult> {
    const objectModel = this.getObjectModel(platform);
    
    try {
      // Get method descriptor
      const objectDescriptor = await objectModel.getObjectDescriptor(objectPath);
      const methodDescriptor = objectDescriptor.methods.find(m => m.name === methodName);
      
      if (!methodDescriptor) {
        throw new Error(`Method ${methodName} not found on object ${objectPath}`);
      }
      
      // Validate and prepare parameters
      const validationResult = this.parameterValidation.validateAndPrepareParameters(
        methodDescriptor,
        args
      );
      
      if (!validationResult.valid) {
        return {
          success: false,
          returnValue: null,
          error: `Parameter validation failed: ${validationResult.errors.join(', ')}`
        };
      }
      
      // Invoke the method with validated parameters
      return objectModel.invokeMethod(objectPath, methodName, validationResult.args);
    } catch (error) {
      this.logger.error(`Error invoking method ${methodName} on ${objectPath}: ${error.message}`);
      return {
        success: false,
        returnValue: null,
        error: `Failed to invoke method: ${error.message}`
      };
    }
  }
  
  /**
   * Execute a batch operation with transaction-like semantics
   */
  async executeBatch(
    platform: 'coreldraw' | 'blender',
    operations: Array<{
      type: 'getProperty' | 'setProperty' | 'invokeMethod';
      objectPath: string;
      name: string;
      args?: any[];
    }>
  ): Promise<Array<PropertyResult | MethodResult>> {
    const objectModel = this.getObjectModel(platform);
    const capabilities = await objectModel.getCapabilities();
    
    // Check if batch operations are supported
    if (!capabilities.supportsBatchOperations) {
      throw new Error(`Batch operations are not supported on ${platform}`);
    }
    
    const results: Array<PropertyResult | MethodResult> = [];
    let hasError = false;
    
    // Execute operations one by one, stopping on first error
    for (const operation of operations) {
      try {
        let result: PropertyResult | MethodResult;
        
        switch (operation.type) {
          case 'getProperty':
            result = await objectModel.getProperty(operation.objectPath, operation.name);
            break;
            
          case 'setProperty':
            if (!operation.args || operation.args.length !== 1) {
              throw new Error('setProperty requires exactly one argument');
            }
            result = await objectModel.setProperty(operation.objectPath, operation.name, operation.args[0]);
            break;
            
          case 'invokeMethod':
            result = await objectModel.invokeMethod(operation.objectPath, operation.name, operation.args || []);
            break;
        }
        
        results.push(result);
        
        // Check if operation failed
        if ((result as PropertyResult).success === false || (result as MethodResult).success === false) {
          hasError = true;
          break;
        }
      } catch (error) {
        this.logger.error(`Error in batch operation: ${error.message}`);
        hasError = true;
        
        // Add error result
        const errorResult = {
          success: false,
          error: `Operation failed: ${error.message}`
        };
        
        results.push(operation.type === 'invokeMethod' 
          ? { ...errorResult, returnValue: null } as MethodResult
          : { ...errorResult, value: null, type: 'null' } as PropertyResult
        );
        
        break;
      }
    }
    
    // If there was an error and the platform supports undo, try to undo changes
    if (hasError && capabilities.supportsUndo) {
      try {
        await objectModel.executeCode('Application.Undo()');
        this.logger.debug(`Batch operation failed, changes undone`);
      } catch (undoError) {
        this.logger.error(`Failed to undo batch operation: ${undoError.message}`);
      }
    }
    
    return results;
  }
  
  /**
   * Clear the object explorer cache
   */
  clearCache(): void {
    this.objectExplorer.clearCache();
    this.logger.debug('Navigator cache cleared');
  }
  
  /**
   * Clear cache for a specific platform
   */
  clearPlatformCache(platform: 'coreldraw' | 'blender'): void {
    this.objectExplorer.clearPlatformCache(platform);
    this.logger.debug(`Cleared cache for platform: ${platform}`);
  }
} 