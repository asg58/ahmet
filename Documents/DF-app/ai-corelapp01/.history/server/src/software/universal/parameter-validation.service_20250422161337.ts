import { Injectable, Logger } from '@nestjs/common';
import { MethodDescriptor, ParameterDescriptor } from './universal-object-model';
import { TypeConversionService, SourceType } from './type-conversion.service';

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
        
        // Check if null was provided for a required parameter
        if (arg === null && !paramDesc.optional) {
          result.valid = false;
          result.errors.push(`Parameter ${paramDesc.name} cannot be null`);
          result.args.push(null);
          return;
        }
        
        // Skip conversion for null values for optional parameters
        if (arg === null && paramDesc.optional) {
          result.args.push(null);
          return;
        }
        
        // Validate and convert if needed
        try {
          // Determine the source type
          let sourceType: SourceType = typeof arg as SourceType;
          if (Array.isArray(arg)) {
            sourceType = 'array';
          } else if (arg === null) {
            sourceType = 'null';
          } else if (sourceType === 'object') {
            // Try to detect specific object types
            if (this.isColorObject(arg)) {
              sourceType = 'color';
            } else if (this.isVectorObject(arg)) {
              sourceType = 'vector';
            }
          }
          
          const convertedArg = this.typeConversionService.convert(
            arg,
            sourceType,
            paramDesc.type
          );
          result.args.push(convertedArg);
        } catch (error) {
          result.valid = false;
          result.errors.push(`Error converting parameter ${paramDesc.name}: ${error instanceof Error ? error.message : String(error)}`);
          // Add null as placeholder for the failed conversion
          result.args.push(null);
        }
      } else if (paramDesc.optional) {
        // Use default value for optional parameter
        result.args.push(paramDesc.defaultValue);
      } else {
        // Missing required parameter (should not happen due to earlier check)
        result.valid = false;
        result.errors.push(`Missing required parameter ${paramDesc.name}`);
        // Add null as placeholder for the missing parameter
        result.args.push(null);
      }
    });
    
    return result;
  }
  
  /**
   * Validate parameters for a method call and suggest corrections
   */
  validateAndSuggestCorrections(
    methodDescriptor: MethodDescriptor,
    providedArgs: any[]
  ): { 
    valid: boolean; 
    args: any[]; 
    errors: string[]; 
    suggestions: { param: string; issue: string; suggestion: any }[] 
  } {
    // First perform basic validation
    const basicValidation = this.validateAndPrepareParameters(
      methodDescriptor, 
      providedArgs
    );
    
    // Add suggestions array to the result
    const result = {
      ...basicValidation,
      suggestions: [] as { param: string; issue: string; suggestion: any }[]
    };
    
    // If already invalid, no need for further suggestions
    if (!basicValidation.valid) {
      return result;
    }
    
    // Check for common issues and make suggestions
    methodDescriptor.parameters.forEach((paramDesc, index) => {
      if (index < providedArgs.length) {
        const arg = providedArgs[index];
        const convertedArg = basicValidation.args[index];
        
        // Check for out-of-range values
        if (paramDesc.type === 'number') {
          // Check if numeric value is too large or small
          if (typeof convertedArg === 'number') {
            if (Math.abs(convertedArg) > 1000000) {
              result.suggestions.push({
                param: paramDesc.name,
                issue: 'Value is extremely large',
                suggestion: convertedArg > 0 ? 1000 : -1000
              });
            } else if (convertedArg !== 0 && Math.abs(convertedArg) < 0.0001) {
              result.suggestions.push({
                param: paramDesc.name,
                issue: 'Value is extremely small',
                suggestion: 0
              });
            }
          }
        }
        
        // Check for typos in string parameters
        if (paramDesc.type === 'string' && typeof arg === 'string') {
          // Check for common typos in CSS color names
          const colorTypos: Record<string, string> = {
            'blu': 'blue',
            'reed': 'red',
            'grene': 'green',
            'yelow': 'yellow',
            'purpel': 'purple',
            'yello': 'yellow',
            'orang': 'orange',
            'braun': 'brown'
          };
          
          for (const [typo, correction] of Object.entries(colorTypos)) {
            if (arg.toLowerCase() === typo) {
              result.suggestions.push({
                param: paramDesc.name,
                issue: `Possible typo in color name '${arg}'`,
                suggestion: correction
              });
              break;
            }
          }
        }
      }
    });
    
    return result;
  }
  
  /**
   * Check if an object seems to be a color object
   */
  private isColorObject(obj: any): boolean {
    return (
      obj !== null &&
      typeof obj === 'object' &&
      'r' in obj &&
      'g' in obj &&
      'b' in obj &&
      typeof obj.r === 'number' &&
      typeof obj.g === 'number' &&
      typeof obj.b === 'number'
    );
  }
  
  /**
   * Check if an object seems to be a vector object
   */
  private isVectorObject(obj: any): boolean {
    return (
      obj !== null &&
      typeof obj === 'object' &&
      'x' in obj &&
      'y' in obj &&
      typeof obj.x === 'number' &&
      typeof obj.y === 'number'
    );
  }
} 