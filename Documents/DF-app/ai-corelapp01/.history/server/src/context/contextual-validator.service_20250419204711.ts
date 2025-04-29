import { Injectable, Logger } from '@nestjs/common';
import { DesignContext } from '../software/context/design-context.interface';

export interface ValidationResult {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
}

@Injectable()
export class ContextualValidatorService {
  private readonly logger = new Logger(ContextualValidatorService.name);

  /**
   * Validates a design action in context to identify potential issues
   * @param platform The platform (CorelDRAW or Blender)
   * @param action The action being performed
   * @param parameters The parameters for the action
   * @param context The current design context
   * @returns ValidationResult with warnings and suggestions
   */
  async validateAction(
    platform: string,
    action: string,
    parameters: Record<string, any>,
    context: DesignContext,
  ): Promise<ValidationResult> {
    this.logger.log(
      `Validating ${action} on ${platform} with ${Object.keys(parameters).length} parameters`,
    );

    const warnings: string[] = [];
    const suggestions: string[] = [];

    try {
      // Check for bulk operations that might be unintended
      if (this.isBulkOperation(action, parameters)) {
        warnings.push(
          'This operation will affect multiple elements. Consider using selection to limit scope.',
        );
      }

      // Check position bounds
      if (this.isOutOfBounds(parameters, context)) {
        warnings.push('The specified position is outside the visible canvas area.');
        suggestions.push(
          `Consider adjusting position to within the bounds: (0,0) to (${context.documentProperties?.width || 1000}, ${
            context.documentProperties?.height || 1000
          })`,
        );
      }

      // Check style consistency
      if (this.hasInconsistentStyle(parameters, context)) {
        suggestions.push(
          'The specified style differs from the document theme. Consider using a consistent style.',
        );
      }

      // Platform-specific validations
      if (platform.toLowerCase() === 'coreldraw') {
        this.validateCorelDrawAction(action, parameters, context, warnings, suggestions);
      } else if (platform.toLowerCase() === 'blender') {
        this.validateBlenderAction(action, parameters, context, warnings, suggestions);
      }

      return {
        isValid: warnings.length === 0,
        warnings,
        suggestions,
      };
    } catch (error) {
      this.logger.error(`Error in validation: ${error.message}`, error.stack);
      return {
        isValid: true, // Default to valid if validation fails
        warnings: ['Validation could not be completed fully'],
        suggestions: [],
      };
    }
  }

  private isBulkOperation(action: string, parameters: Record<string, any>): boolean {
    const bulkActions = ['deleteAll', 'selectAll', 'applyToAll', 'clearAll'];
    return bulkActions.some(ba => action.toLowerCase().includes(ba.toLowerCase()));
  }

  private isOutOfBounds(parameters: Record<string, any>, context: DesignContext): boolean {
    const x = parameters.x || parameters.positionX;
    const y = parameters.y || parameters.positionY;

    if (x === undefined || y === undefined) {
      return false;
    }

    const width = context.documentProperties?.width || 1000;
    const height = context.documentProperties?.height || 1000;

    return x < 0 || y < 0 || x > width || y > height;
  }

  private hasInconsistentStyle(parameters: Record<string, any>, context: DesignContext): boolean {
    if (!context.documentProperties?.theme) {
      return false;
    }

    const theme = context.documentProperties.theme;
    
    // Check color consistency
    if (parameters.color && theme.colors) {
      return !theme.colors.some(
        color => this.colorsAreClose(parameters.color, color)
      );
    }

    // Could add checks for font, line style, etc.
    return false;
  }

  private colorsAreClose(color1: string, color2: string): boolean {
    // Simple implementation - just check if colors are exactly the same
    // In a real implementation, would parse colors and check RGB proximity
    return color1.toLowerCase() === color2.toLowerCase();
  }

  private validateCorelDrawAction(
    action: string,
    parameters: Record<string, any>,
    context: DesignContext,
    warnings: string[],
    suggestions: string[],
  ): void {
    // CorelDRAW-specific validations
    if (action.toLowerCase().includes('text') && !parameters.font) {
      suggestions.push('Consider specifying a font for text operations');
    }
  }

  private validateBlenderAction(
    action: string,
    parameters: Record<string, any>,
    context: DesignContext,
    warnings: string[],
    suggestions: string[],
  ): void {
    // Blender-specific validations
    if (action.toLowerCase().includes('render') && !parameters.renderEngine) {
      suggestions.push('Consider specifying a render engine for better results');
    }
  }
} 