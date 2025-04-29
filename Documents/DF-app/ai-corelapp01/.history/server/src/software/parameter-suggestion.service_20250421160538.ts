import { Injectable, Logger } from '@nestjs/common';

// Define interfaces directly in this file to avoid import issues
export interface DesignElement {
  id: string;
  type: string;
  name?: string;
  position: {
    x: number;
    y: number;
    z?: number;
  };
  size: {
    width: number;
    height: number;
    depth?: number;
  };
  style?: {
    fillColor?: string;
    outlineColor?: string;
    outlineWidth?: number;
    fontSize?: number;
  };
}

export interface DesignContext {
  platform: string;
  documentName?: string;
  documentProperties?: {
    name: string;
    size?: {
      width: number;
      height: number;
    };
  };
  elements: DesignElement[];
  activeSelection?: DesignElement | DesignElement[];
  actionHistory?: {
    type: string;
    description: string;
    parameters?: Record<string, any>;
    timestamp: number;
    success: boolean;
  }[];
  statistics?: any;
}

interface CommandRecord {
  action: string;
  parameters: Record<string, any>;
  timestamp: Date;
  context: Partial<DesignContext>;
}

/**
 * Service voor het intelligent voorstellen van parameters op basis van context en eerdere commando's
 */
@Injectable()
export class ParameterSuggestionService {
  private readonly logger = new Logger(ParameterSuggestionService.name);
  
  // Opslag van eerdere commando's per platform
  private commandHistory: Record<string, CommandRecord[]> = {
    coreldraw: [],
    blender: []
  };

  constructor() {}

  /**
   * Stelt parameters voor op basis van de actie, platform en huidige context
   */
  async suggestParameters(
    platform: string,
    action: string,
    context: DesignContext
  ): Promise<Record<string, any>> {
    this.logger.debug(`Suggesting parameters for ${platform}/${action}`);
    
    // Standaard parameters voor veelgebruikte acties
    const defaultParams: Record<string, Record<string, any>> = {
      create_rectangle: { width: 100, height: 60, x: 100, y: 100, fillColor: '#FFFFFF' },
      create_circle: { radius: 50, x: 100, y: 100, fillColor: '#FFFFFF' },
      create_text: { text: 'Sample Text', x: 100, y: 100, fontSize: 12 }
    };
    
    // Begin met standaard parameters
    let suggestedParams = defaultParams[action] || {};
    
    // Gebruik eerdere commando's om parameters te verbeteren
    const previousCommands = this.findRelevantCommands(platform, action);
    if (previousCommands.length > 0) {
      // Gebruik het meest recente relevante commando als basis
      const mostRecent = previousCommands[0];
      
      // Kopieer parameters van het meest recente commando
      suggestedParams = { ...suggestedParams, ...mostRecent.parameters };
      
      // Pas positie aan op basis van de huidige context
      if (suggestedParams.x !== undefined && suggestedParams.y !== undefined) {
        // Verschuif positie om overlap te voorkomen
        suggestedParams.x += 20;
        suggestedParams.y += 20;
      }
    }
    
    // Pas parameters aan op basis van context
    this.adjustParametersBasedOnContext(suggestedParams, context);
    
    return suggestedParams;
  }
  
  /**
   * Registreert een succesvol uitgevoerd commando voor toekomstige suggesties
   */
  recordCommand(
    platform: string,
    action: string,
    parameters: Record<string, any>,
    context: DesignContext
  ): void {
    this.logger.debug(`Recording command ${platform}/${action}`);
    
    // Sla relevante context-informatie op
    const contextSnapshot: Partial<DesignContext> = {
      elements: context.elements,
      activeSelection: context.activeSelection,
      documentProperties: context.documentProperties
    };
    
    // Voeg toe aan geschiedenis
    this.commandHistory[platform] = this.commandHistory[platform] || [];
    this.commandHistory[platform].unshift({
      action,
      parameters,
      timestamp: new Date(),
      context: contextSnapshot
    });
    
    // Beperk de grootte van de geschiedenis
    if (this.commandHistory[platform].length > 50) {
      this.commandHistory[platform] = this.commandHistory[platform].slice(0, 50);
    }
  }
  
  /**
   * Vindt relevante eerdere commando's voor een gegeven actie en platform
   */
  private findRelevantCommands(platform: string, action: string): CommandRecord[] {
    // Zoek eerst exacte matches
    let matches = (this.commandHistory[platform] || [])
      .filter(record => record.action === action)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Als er geen exacte matches zijn, probeer verwante acties
    if (matches.length === 0) {
      const actionCategory = this.getActionCategory(action);
      matches = (this.commandHistory[platform] || [])
        .filter(record => this.getActionCategory(record.action) === actionCategory)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }
    
    return matches;
  }
  
  /**
   * Past parameters aan op basis van de huidige context
   */
  private adjustParametersBasedOnContext(
    params: Record<string, any>,
    context: DesignContext
  ): void {
    // Pas parameters aan op basis van aantal elementen
    if (context.elements.length > 0) {
      // Als er al elementen zijn, plaats nieuwe elementen strategisch
      if (params.x !== undefined && params.y !== undefined) {
        // Eenvoudige logica: plaats naast bestaande elementen
        const rightmostElement = context.elements
          .reduce((rightmost, current) => {
            const currentRight = current.position.x + current.size.width;
            const rightmostRight = rightmost ? rightmost.position.x + rightmost.size.width : 0;
            return currentRight > rightmostRight ? current : rightmost;
          }, null);
        
        if (rightmostElement) {
          // Plaats rechts van het meest rechtse element
          params.x = rightmostElement.position.x + rightmostElement.size.width + 20;
          params.y = rightmostElement.position.y;
        }
      }
      
      // Pas kleur aan op basis van bestaande elementen als geen expliciete kleur is opgegeven
      if (params.fillColor === '#FFFFFF' || !params.fillColor) {
        const colorElements = context.elements.filter(el => el.style && el.style.fillColor);
        if (colorElements.length > 0) {
          // Gebruik kleur van meest recente element met een vulkleur
          params.fillColor = colorElements[0].style.fillColor;
        }
      }
    }
  }
  
  /**
   * Bepaalt de categorie van een actie (bijv. create, modify, delete)
   */
  private getActionCategory(action: string): string {
    if (action.startsWith('create_')) return 'create';
    if (action.startsWith('modify_') || action.startsWith('edit_')) return 'modify';
    if (action.startsWith('delete_') || action.startsWith('remove_')) return 'delete';
    if (action.startsWith('select_')) return 'select';
    return 'other';
  }
} 