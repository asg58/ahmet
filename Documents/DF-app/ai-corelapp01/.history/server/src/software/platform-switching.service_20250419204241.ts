import { Injectable, Logger } from '@nestjs/common';
import { BlenderContextAnalyzer } from './context/blender-context';
import { CorelContextAnalyzer } from './context/corel-context';
import { DesignContext, DesignElement } from './context/design-context';
import { DesignConceptMapper } from './universal/design-concepts';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';

/**
 * Parameters for platform switching
 */
export interface PlatformSwitchParams {
  sourceContext: DesignContext;
  targetPlatform: 'coreldraw' | 'blender';
  transferElements?: boolean;
  transferMaterials?: boolean;
  conversationContext?: ChatMessage[];
}

/**
 * Result of platform switching operation
 */
export interface PlatformSwitchResult {
  success: boolean;
  sourceContext: DesignContext;
  targetContext?: DesignContext;
  transferredElements: DesignElement[];
  commandsGenerated: string[];
  error?: string;
}

/**
 * PlatformSwitchingService
 * 
 * Service for handling transitions between different design platforms
 * with context preservation and object transfer.
 */
@Injectable()
export class PlatformSwitchingService {
  private readonly logger = new Logger(PlatformSwitchingService.name);
  private currentPlatform: 'coreldraw' | 'blender' | null = null;
  
  constructor(
    private readonly blenderContextAnalyzer: BlenderContextAnalyzer,
    private readonly corelContextAnalyzer: CorelContextAnalyzer,
    private readonly designConceptMapper: DesignConceptMapper,
    private readonly ollamaService: OllamaService
  ) {}
  
  /**
   * Get the currently active platform
   */
  getCurrentPlatform(): 'coreldraw' | 'blender' | null {
    return this.currentPlatform;
  }
  
  /**
   * Set the currently active platform
   */
  setCurrentPlatform(platform: 'coreldraw' | 'blender'): void {
    this.logger.log(`Setting current platform to: ${platform}`);
    this.currentPlatform = platform;
  }
  
  /**
   * Switch from one platform to another with context preservation
   */
  async switchPlatform(params: PlatformSwitchParams): Promise<PlatformSwitchResult> {
    const { sourceContext, targetPlatform, transferElements = true, transferMaterials = true } = params;
    
    this.logger.debug(`Switching from ${sourceContext.platform} to ${targetPlatform}`);
    
    // Validate that we're actually switching platforms
    if (sourceContext.platform === targetPlatform) {
      return {
        success: false,
        sourceContext,
        transferredElements: [],
        commandsGenerated: [],
        error: 'Source and target platforms are the same'
      };
    }
    
    try {
      // Update current platform
      this.setCurrentPlatform(targetPlatform);
      
      // Get current context of target platform
      let targetContext: DesignContext;
      if (targetPlatform === 'blender') {
        targetContext = await this.blenderContextAnalyzer.captureContext();
      } else {
        targetContext = await this.corelContextAnalyzer.captureContext();
      }
      
      // If no element transfer requested, just return the contexts
      if (!transferElements) {
        return {
          success: true,
          sourceContext,
          targetContext,
          transferredElements: [],
          commandsGenerated: []
        };
      }
      
      // Transfer elements from source to target platform
      const transferResult = await this.transferElements(
        sourceContext,
        targetPlatform,
        transferMaterials,
        params.conversationContext || []
      );
      
      if (!transferResult.success) {
        return {
          success: false,
          sourceContext,
          targetContext,
          transferredElements: [],
          commandsGenerated: transferResult.commands,
          error: transferResult.error
        };
      }
      
      // Get updated target context after transfer
      let updatedTargetContext: DesignContext;
      if (targetPlatform === 'blender') {
        updatedTargetContext = await this.blenderContextAnalyzer.captureContext();
      } else {
        updatedTargetContext = await this.corelContextAnalyzer.captureContext();
      }
      
      return {
        success: true,
        sourceContext,
        targetContext: updatedTargetContext,
        transferredElements: transferResult.elements,
        commandsGenerated: transferResult.commands
      };
    } catch (error) {
      this.logger.error(`Error switching platforms: ${error.message}`);
      return {
        success: false,
        sourceContext,
        transferredElements: [],
        commandsGenerated: [],
        error: `Failed to switch platforms: ${error.message}`
      };
    }
  }
  
  /**
   * Transfer elements from source to target platform
   */
  private async transferElements(
    sourceContext: DesignContext,
    targetPlatform: 'coreldraw' | 'blender',
    transferMaterials: boolean,
    conversationContext: ChatMessage[]
  ): Promise<{
    success: boolean;
    elements: DesignElement[];
    commands: string[];
    error?: string;
  }> {
    const elements = sourceContext.selectedElements.length > 0
      ? sourceContext.selectedElements
      : this.getTopLevelElements(sourceContext);
    
    if (elements.length === 0) {
      return {
        success: true,
        elements: [],
        commands: [],
        error: 'No elements to transfer'
      };
    }
    
    this.logger.debug(`Transferring ${elements.length} elements to ${targetPlatform}`);
    
    const commands: string[] = [];
    const transferredElements: DesignElement[] = [];
    
    try {
      // Group elements by type for more efficient processing
      const elementsByType: Record<string, DesignElement[]> = {};
      elements.forEach(element => {
        if (!elementsByType[element.type]) {
          elementsByType[element.type] = [];
        }
        elementsByType[element.type].push(element);
      });
      
      for (const [type, typeElements] of Object.entries(elementsByType)) {
        // Use concept mapper to determine the corresponding concept
        let conceptType = this.mapElementTypeToConceptType(type, sourceContext.platform);
        
        // If no mapping found, use AI to determine the best concept
        if (!conceptType) {
          conceptType = await this.determineConceptTypeWithAI(
            type, 
            sourceContext.platform, 
            targetPlatform, 
            conversationContext
          );
        }
        
        // Skip if we still can't determine a concept type
        if (!conceptType) {
          this.logger.warn(`Could not map element type ${type} to a concept`);
          continue;
        }
        
        // Generate commands for each element
        for (const element of typeElements) {
          const command = this.generateTransferCommand(
            element,
            conceptType,
            sourceContext.platform,
            targetPlatform,
            transferMaterials
          );
          
          if (command) {
            commands.push(command);
            transferredElements.push(element);
          }
        }
      }
      
      return {
        success: true,
        elements: transferredElements,
        commands
      };
    } catch (error) {
      this.logger.error(`Error transferring elements: ${error.message}`);
      return {
        success: false,
        elements: [],
        commands,
        error: `Failed to transfer elements: ${error.message}`
      };
    }
  }
  
  /**
   * Map element type to a concept type
   */
  private mapElementTypeToConceptType(
    elementType: string, 
    sourcePlatform: 'coreldraw' | 'blender'
  ): string | null {
    // Common mappings
    const commonMappings: Record<string, Record<string, string>> = {
      'coreldraw': {
        'Rectangle': 'rectangle',
        'Ellipse': 'circle',
        'ArtisticText': 'text',
        'Polygon': 'polygon'
      },
      'blender': {
        'MESH': 'mesh',
        'CURVE': 'curve',
        'FONT': 'text',
        'LIGHT': 'light',
        'CAMERA': 'camera'
      }
    };
    
    // Check if we have a direct mapping
    return commonMappings[sourcePlatform]?.[elementType] || null;
  }
  
  /**
   * Use AI to determine the best concept type for an element
   */
  private async determineConceptTypeWithAI(
    elementType: string,
    sourcePlatform: 'coreldraw' | 'blender',
    targetPlatform: 'coreldraw' | 'blender',
    conversationContext: ChatMessage[]
  ): Promise<string | null> {
    this.logger.debug(`Using AI to determine concept type for ${elementType}`);
    
    // Create a prompt for the AI
    const prompt: ChatMessage[] = [
      {
        role: 'system',
        content: 
          `You are an expert in design software interoperability. 
           Given a type of design element from ${sourcePlatform}, 
           determine the most appropriate universal concept that could be 
           recreated in ${targetPlatform}.
           
           Available concepts:
           - rectangle: A four-sided shape with straight sides
           - circle: A perfectly round shape
           - text: Text content on the canvas
           - polygon: A multi-sided shape
           - curve: A curved line or shape
           - mesh: A 3D object composed of vertices, edges and faces
           - light: A light source
           - camera: A viewpoint in the scene
           
           Be very specific and respond ONLY with the concept name.`
      },
      {
        role: 'user',
        content: `What universal concept best matches the ${sourcePlatform} element type "${elementType}" that should be recreated in ${targetPlatform}?`
      }
    ];
    
    try {
      // Get a response from the AI
      const response = await this.ollamaService.chatCompletion({
        model: 'mistral:latest',
        messages: prompt,
        temperature: 0.1, // Low temperature for more focused responses
      });
      
      // Extract the concept type from the response
      const content = response.choices[0].message.content.trim().toLowerCase();
      
      // Try to match with known concepts
      for (const concept of ['rectangle', 'circle', 'text', 'polygon', 'curve', 'mesh', 'light', 'camera']) {
        if (content.includes(concept)) {
          return concept;
        }
      }
      
      // If no match found, return null
      return null;
    } catch (error) {
      this.logger.error(`Error determining concept type: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Generate a transfer command for an element
   */
  private generateTransferCommand(
    element: DesignElement,
    conceptType: string,
    sourcePlatform: 'coreldraw' | 'blender',
    targetPlatform: 'coreldraw' | 'blender',
    transferMaterials: boolean
  ): string {
    try {
      // Extract parameters from the element
      const params = this.extractParametersFromElement(
        element, 
        conceptType, 
        sourcePlatform, 
        targetPlatform
      );
      
      // If materials should be transferred, add material params
      if (transferMaterials && element.color) {
        params.fillColor = this.formatColor(element.color, targetPlatform);
      }
      
      // Use the concept mapper to generate the appropriate code
      return this.designConceptMapper.mapConceptToCode(
        conceptType,
        targetPlatform,
        params
      );
    } catch (error) {
      this.logger.error(`Error generating transfer command: ${error.message}`);
      return '';
    }
  }
  
  /**
   * Extract parameters from an element
   */
  private extractParametersFromElement(
    element: DesignElement,
    conceptType: string,
    sourcePlatform: 'coreldraw' | 'blender',
    targetPlatform: 'coreldraw' | 'blender'
  ): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Common parameters
    if (element.position) {
      params.x = element.position.x;
      params.y = element.position.y;
      
      if (targetPlatform === 'blender' && element.position.z !== undefined) {
        params.z = element.position.z;
      }
    }
    
    // Size parameters
    if (element.size) {
      if (conceptType === 'rectangle' || conceptType === 'polygon') {
        params.width = element.size.width;
        params.height = element.size.height;
      } else if (conceptType === 'circle') {
        // Use the smaller dimension as the radius for circles
        params.radius = Math.min(element.size.width, element.size.height) / 2;
      }
      
      if (targetPlatform === 'blender' && element.size.depth !== undefined) {
        params.depth = element.size.depth;
      }
    }
    
    // Type-specific parameters
    if (conceptType === 'text' && element.properties && element.properties.text) {
      params.content = element.properties.text;
      
      if (element.properties.fontSize) {
        params.fontSize = element.properties.fontSize;
      }
      
      if (element.properties.fontName) {
        params.fontName = element.properties.fontName;
      }
    }
    
    return params;
  }
  
  /**
   * Format a color for the target platform
   */
  private formatColor(
    color: any, 
    targetPlatform: 'coreldraw' | 'blender'
  ): string {
    if (typeof color === 'string') {
      return color; // Already formatted
    }
    
    if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
      if (targetPlatform === 'coreldraw') {
        // CorelDRAW uses RGB values from 0-255
        const r = Math.round(color.r * 255);
        const g = Math.round(color.g * 255);
        const b = Math.round(color.b * 255);
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      } else {
        // Blender uses RGB values from 0-1
        return `${color.r}, ${color.g}, ${color.b}`;
      }
    }
    
    // Default fallback
    return targetPlatform === 'coreldraw' ? '#000000' : '0, 0, 0';
  }
  
  /**
   * Get top level elements from context
   */
  private getTopLevelElements(context: DesignContext): DesignElement[] {
    const elements: DesignElement[] = [];
    
    // Get all elements from all layers
    context.layers.forEach(layer => {
      if (layer.visible && !layer.locked) {
        elements.push(...layer.elements);
      }
    });
    
    return elements;
  }
} 