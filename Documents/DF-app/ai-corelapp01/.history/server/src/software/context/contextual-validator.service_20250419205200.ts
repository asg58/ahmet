import { Injectable, Logger } from '@nestjs/common';
import { DesignContextAnalyzerService } from './design-context-analyzer.service';
import { SoftwareCommandService } from '../commands/software-command.service';

@Injectable()
export class ContextualValidatorService {
  private readonly logger = new Logger(ContextualValidatorService.name);

  constructor(
    private readonly designContextAnalyzer: DesignContextAnalyzerService,
    private readonly commandService: SoftwareCommandService,
  ) {}

  /**
   * Validates an action in the current design context
   * @param platform The target platform (coreldraw or blender)
   * @param action The action to validate
   * @param parameters The parameters for the action
   * @returns Validation results with warnings and suggestions
   */
  async validateAction(platform: string, action: string, parameters: Record<string, any>): Promise<ValidationResult> {
    this.logger.log(`Validating action: ${action} on platform ${platform}`);
    
    const context = await this.designContextAnalyzer.getCurrentContext(platform);
    const result: ValidationResult = {
      isValid: true,
      warnings: [],
      suggestions: [],
    };

    // Check for bulk deletions
    if (action === 'delete' && parameters.targets && Array.isArray(parameters.targets)) {
      if (parameters.targets.length > 5) {
        result.warnings.push({
          type: 'BULK_DELETION',
          message: `You are about to delete ${parameters.targets.length} elements. Consider reviewing selection first.`,
          severity: 'WARNING',
        });
      }
    }

    // Check for out-of-bounds positions
    if ((action === 'create' || action === 'move') && parameters.position) {
      const { x, y } = parameters.position;
      const documentBounds = context.documentBounds || { width: 800, height: 600 }; // Default fallback
      
      if (x < 0 || y < 0 || x > documentBounds.width || y > documentBounds.height) {
        result.warnings.push({
          type: 'OUT_OF_BOUNDS',
          message: 'The position is outside the document bounds.',
          severity: 'ERROR',
        });
        result.isValid = false;
      }
    }

    // Check for inconsistent styles
    if (action === 'style' && parameters.elementId && parameters.style) {
      const element = context.elements.find(el => el.id === parameters.elementId);
      if (element) {
        // Check if new style is drastically different from document style patterns
        const styleAnalysis = await this.designContextAnalyzer.analyzeStylePatterns(platform);
        
        if (styleAnalysis.dominantColors && parameters.style.fillColor) {
          const colorExists = styleAnalysis.dominantColors.some(color => 
            this.isColorSimilar(color, parameters.style.fillColor)
          );
          
          if (!colorExists) {
            result.suggestions.push({
              type: 'STYLE_SUGGESTION',
              message: 'This color differs from the document\'s color palette. Consider using one of the existing colors for consistency.',
              alternatives: styleAnalysis.dominantColors.slice(0, 3), // Suggest top 3 colors
            });
          }
        }
      }
    }

    // Check for overlapping elements
    if ((action === 'create' || action === 'move') && parameters.position) {
      const overlappingElements = this.findOverlappingElements(
        context.elements,
        parameters.position,
        parameters.size || { width: 50, height: 50 } // Default size if not provided
      );
      
      if (overlappingElements.length > 0) {
        result.warnings.push({
          type: 'ELEMENT_OVERLAP',
          message: `This action will create overlap with ${overlappingElements.length} existing elements.`,
          severity: 'INFO',
          affectedElements: overlappingElements.map(el => el.id),
        });
      }
    }

    return result;
  }

  /**
   * Finds elements that would overlap with a new element at the given position
   */
  private findOverlappingElements(elements: any[], position: {x: number, y: number}, size: {width: number, height: number}) {
    return elements.filter(element => {
      if (!element.bounds) return false;
      
      // Simple bounding box collision detection
      return !(
        position.x + size.width < element.bounds.x ||
        position.x > element.bounds.x + element.bounds.width ||
        position.y + size.height < element.bounds.y ||
        position.y > element.bounds.y + element.bounds.height
      );
    });
  }

  /**
   * Compares two colors for similarity
   */
  private isColorSimilar(color1: string, color2: string): boolean {
    // This is a simplified implementation
    // In a real system, this would convert colors to a common format and check distance
    return color1.toLowerCase() === color2.toLowerCase();
  }
}

export interface ValidationResult {
  isValid: boolean;
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
}

export interface ValidationWarning {
  type: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  affectedElements?: string[];
}

export interface ValidationSuggestion {
  type: string;
  message: string;
  alternatives?: any[];
} 