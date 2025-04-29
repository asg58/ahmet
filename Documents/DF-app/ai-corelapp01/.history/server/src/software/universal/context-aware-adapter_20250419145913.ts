import { Injectable, Logger } from '@nestjs/common';
import { ObjectModelCommandAdapter } from './object-model-command-adapter';
import { UniversalObjectModel } from './universal-object-model';
import { CommandFactoryService, CommandExecutionResult } from '../commands/command-factory.service';
import { DesignContextAnalyzer, DesignContext } from '../context/design-context';
import { BlenderContextAnalyzer } from '../context/blender-context';
import { CorelContextAnalyzer } from '../context/corel-context';
import { ContextAwareQueryService } from '../context/context-aware-query.service';

/**
 * ContextAwareCommandAdapter
 * 
 * This service enhances the ObjectModelCommandAdapter by incorporating design context
 * awareness into command execution, allowing commands to adapt to the current state
 * of the design document.
 */
@Injectable()
export class ContextAwareCommandAdapter extends ObjectModelCommandAdapter {
  private readonly logger = new Logger(ContextAwareCommandAdapter.name);
  
  constructor(
    commandFactory: CommandFactoryService,
    blenderObjectModel: UniversalObjectModel,
    corelDrawObjectModel: UniversalObjectModel,
    private readonly blenderContextAnalyzer: BlenderContextAnalyzer,
    private readonly corelContextAnalyzer: CorelContextAnalyzer,
    private readonly contextAwareQueryService: ContextAwareQueryService
  ) {
    super(commandFactory, blenderObjectModel, corelDrawObjectModel);
  }
  
  /**
   * Execute a command with context awareness
   * 
   * This method enhances the standard command execution by:
   * 1. Capturing the current design context
   * 2. Adapting command parameters based on context
   * 3. Smart positioning of new elements relative to selection
   * 4. Applying style consistency from context
   */
  async executeContextAwareCommand(
    platform: 'coreldraw' | 'blender',
    action: string,
    params: Record<string, any> = {}
  ): Promise<CommandExecutionResult> {
    this.logger.debug(`Executing context-aware command: ${platform}.${action}`);
    
    try {
      // Get the current design context
      const context = await this.getDesignContext(platform);
      
      // Enhance parameters based on context
      const enhancedParams = this.enhanceParamsWithContext(action, params, context);
      
      // Execute the command with enhanced parameters
      return super.executeCommandViaObjectModel(platform, action, enhancedParams);
    } catch (error) {
      this.logger.error(`Error in context-aware command execution: ${error.message}`);
      // Fall back to standard execution
      return super.executeCommandViaObjectModel(platform, action, params);
    }
  }
  
  /**
   * Get design context for the specified platform
   */
  private async getDesignContext(platform: 'coreldraw' | 'blender'): Promise<DesignContext> {
    if (platform === 'blender') {
      return this.blenderContextAnalyzer.captureContext();
    } else {
      return this.corelContextAnalyzer.captureContext();
    }
  }
  
  /**
   * Enhance command parameters based on design context
   */
  private enhanceParamsWithContext(
    action: string,
    params: Record<string, any>,
    context: DesignContext
  ): Record<string, any> {
    const enhancedParams = { ...params };
    
    // Apply smart positioning for creation actions
    if (action.startsWith('create_') && !params.x && !params.y && !params.location) {
      const position = this.determineSmartPosition(action, context);
      
      if (context.platform === 'coreldraw') {
        enhancedParams.x = position.x;
        enhancedParams.y = position.y;
      } else {
        enhancedParams.location = [position.x, position.y, position.z || 0];
      }
    }
    
    // Apply style consistency
    if (context.platform === 'coreldraw') {
      if (action.startsWith('create_') && context.selectedElements.length > 0) {
        // Use fill style from selected element if not specified
        if (!enhancedParams.fillColor && context.selectedElements[0].color) {
          enhancedParams.fillColor = context.selectedElements[0].color;
        }
        
        // Use outline style from selected element
        if (!enhancedParams.outlineColor && 
            context.selectedElements[0].properties && 
            context.selectedElements[0].properties.outlineColor) {
          enhancedParams.outlineColor = context.selectedElements[0].properties.outlineColor;
        }
      }
    } else if (context.platform === 'blender') {
      // Apply material from selected object if creating a new object
      if (action.startsWith('create_') && context.selectedElements.length > 0) {
        if (!enhancedParams.material && 
            context.selectedElements[0].properties && 
            context.selectedElements[0].properties.material) {
          enhancedParams.material = context.selectedElements[0].properties.material;
        }
      }
    }
    
    return enhancedParams;
  }
  
  /**
   * Determine smart position for new elements based on context
   */
  private determineSmartPosition(action: string, context: DesignContext): { x: number; y: number; z?: number } {
    // Default to center of document
    const defaultPosition = {
      x: context.size.width / 2,
      y: context.size.height / 2,
      z: 0
    };
    
    // If there are selected elements, position relative to them
    if (context.selectedElements.length > 0) {
      const selected = context.selectedElements[0];
      
      // Position next to the selected element
      // For 2D (CorelDRAW), position to the right
      if (context.platform === 'coreldraw') {
        return {
          x: selected.position.x + (selected.size?.width || 100) + 20,
          y: selected.position.y
        };
      } 
      // For 3D (Blender), position with slight offset
      else {
        return {
          x: selected.position.x + 3,
          y: selected.position.y,
          z: selected.position.z || 0
        };
      }
    }
    
    return defaultPosition;
  }
} 