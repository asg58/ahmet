import { Injectable, Logger } from '@nestjs/common';
import { CommandFactoryService } from '../commands/command-factory.service';
import { CommandResult } from '../commands/command-result.interface';
import { ObjectModelCommandAdapter } from '../universal/object-model-command-adapter';
import { DesignContextAnalyzer } from './design-context-analyzer';
import { DesignElement } from './design-context';
import { DesignConceptMapper } from '../universal/design-concepts';

/**
 * De Context-Aware Command Adapter verrijkt commando's met contextinformatie
 * en zorgt voor intelligente beslissingen over parameters op basis van de 
 * huidige ontwerpcontext.
 */
@Injectable()
export class ContextAwareCommandAdapter {
  private readonly logger = new Logger(ContextAwareCommandAdapter.name);
  private readonly conceptMapper = new DesignConceptMapper();

  constructor(
    private readonly commandFactory: CommandFactoryService,
    private readonly objectModelAdapter: ObjectModelCommandAdapter,
    private readonly blenderContextAnalyzer: DesignContextAnalyzer,
    private readonly corelContextAnalyzer: DesignContextAnalyzer,
  ) {}

  /**
   * Voert een commando uit op het gespecificeerde platform met contextbewuste parameter-verrijking
   */
  async executeCommand(platform: string, action: string, params: any): Promise<CommandResult> {
    this.logger.debug(`Context-aware command execution: ${platform}/${action}`);
    
    // Verkrijg de juiste context analyzer voor het platform
    const contextAnalyzer = this.getContextAnalyzerForPlatform(platform);
    if (!contextAnalyzer) {
      this.logger.warn(`No context analyzer available for platform: ${platform}`);
      // Fallback naar reguliere command execution zonder context-verrijking
      return this.commandFactory.executeCommand(platform, action, params);
    }

    // Verkrijg huidige ontwerpcontext
    const context = await contextAnalyzer.captureContext();
    this.logger.debug(`Current design context: ${context.documentName}, elements: ${context.elements.length}`);

    // Verrijk de parameters op basis van de context
    const enrichedParams = this.enrichParameters(action, params, context.elements);
    this.logger.debug(`Enriched parameters: ${JSON.stringify(enrichedParams)}`);

    // Probeer eerst met de object model adapter
    try {
      return await this.objectModelAdapter.executeCommandViaObjectModel(platform, action, enrichedParams);
    } catch (error) {
      this.logger.warn(`Object model execution failed, falling back to command factory: ${error.message}`);
      // Fallback naar command factory
      return this.commandFactory.executeCommand(platform, action, enrichedParams);
    }
  }

  /**
   * Verrijkt parameters op basis van de huidige ontwerpcontext en de actie
   */
  private enrichParameters(action: string, params: any, contextElements: DesignElement[]): any {
    // Kopieer de originele parameters
    const enrichedParams = { ...params };

    switch (action) {
      case 'create_rectangle':
      case 'create_ellipse':
      case 'create_polygon':
        enrichedParams.x = this.determineOptimalPositionX(params, contextElements);
        enrichedParams.y = this.determineOptimalPositionY(params, contextElements);
        
        if (!params.width) {
          enrichedParams.width = this.suggestWidth(contextElements);
        }
        
        if (!params.height) {
          enrichedParams.height = this.suggestHeight(contextElements);
        }
        
        if (!params.fillColor) {
          enrichedParams.fillColor = this.suggestFillColor(contextElements);
        }
        
        if (!params.outlineColor) {
          enrichedParams.outlineColor = this.suggestOutlineColor(contextElements);
        }
        break;

      case 'create_text':
        enrichedParams.x = this.determineOptimalPositionX(params, contextElements);
        enrichedParams.y = this.determineOptimalPositionY(params, contextElements);
        
        if (!params.fontSize) {
          enrichedParams.fontSize = this.suggestFontSize(contextElements);
        }
        
        if (!params.fontName) {
          enrichedParams.fontName = this.suggestFontName(contextElements);
        }
        break;

      case 'apply_material':
        if (!params.color) {
          enrichedParams.color = this.suggestMaterialColor(contextElements);
        }
        break;

      case 'select_objects':
        // Als specifieke selectieparameters ontbreken, probeer relevante objecten te vinden
        if (!params.objectIds && !params.objectNames) {
          const suggestedObjects = this.findRelevantObjects(contextElements);
          if (suggestedObjects.length > 0) {
            enrichedParams.objectIds = suggestedObjects.map(obj => obj.id);
          }
        }
        break;
    }

    return enrichedParams;
  }

  /**
   * Bepaalt de optimale X-positie voor een nieuw object op basis van bestaande elementen
   */
  private determineOptimalPositionX(params: any, elements: DesignElement[]): number {
    // Als de parameter al expliciet is opgegeven, gebruik die
    if (params.x !== undefined) {
      return params.x;
    }

    // Als er geen elementen zijn, gebruik een standaardwaarde
    if (elements.length === 0) {
      return 100;
    }

    // Vind het rechterkant van het meest rechtse element
    const rightmostElement = elements.reduce((rightmost, current) => {
      const currentRight = current.position.x + current.size.width;
      const rightmostRight = rightmost.position.x + rightmost.size.width;
      return currentRight > rightmostRight ? current : rightmost;
    }, elements[0]);

    // Plaats het nieuwe object rechts van het meest rechtse element met wat ruimte
    return rightmostElement.position.x + rightmostElement.size.width + 20;
  }

  /**
   * Bepaalt de optimale Y-positie voor een nieuw object op basis van bestaande elementen
   */
  private determineOptimalPositionY(params: any, elements: DesignElement[]): number {
    // Als de parameter al expliciet is opgegeven, gebruik die
    if (params.y !== undefined) {
      return params.y;
    }

    // Als er geen elementen zijn, gebruik een standaardwaarde
    if (elements.length === 0) {
      return 100;
    }

    // Bereken het gemiddelde van de Y-posities van de elementen
    const sum = elements.reduce((total, element) => total + element.position.y, 0);
    return sum / elements.length;
  }

  /**
   * Suggereert een breedte op basis van bestaande elementen
   */
  private suggestWidth(elements: DesignElement[]): number {
    if (elements.length === 0) {
      return 100; // Standaardwaarde als er geen context is
    }

    // Bereken de gemiddelde breedte van bestaande elementen
    const sum = elements.reduce((total, element) => total + element.size.width, 0);
    return Math.round(sum / elements.length);
  }

  /**
   * Suggereert een hoogte op basis van bestaande elementen
   */
  private suggestHeight(elements: DesignElement[]): number {
    if (elements.length === 0) {
      return 100; // Standaardwaarde als er geen context is
    }

    // Bereken de gemiddelde hoogte van bestaande elementen
    const sum = elements.reduce((total, element) => total + element.size.height, 0);
    return Math.round(sum / elements.length);
  }

  /**
   * Suggereert een vulkleur op basis van bestaande elementen
   */
  private suggestFillColor(elements: DesignElement[]): string {
    if (elements.length === 0) {
      return '#FFFFFF'; // Standaard wit als er geen context is
    }

    // Vind het meest recent toegevoegde element met een vulkleur
    const elementsWithFill = elements.filter(el => el.style && el.style.fillColor);
    if (elementsWithFill.length > 0) {
      // Sorteer op id (aannemend dat hogere id's recenter zijn)
      elementsWithFill.sort((a, b) => parseInt(b.id) - parseInt(a.id));
      return elementsWithFill[0].style.fillColor;
    }

    return '#FFFFFF'; // Standaard wit als geen vulkleuren gevonden
  }

  /**
   * Suggereert een omtrekkleur op basis van bestaande elementen
   */
  private suggestOutlineColor(elements: DesignElement[]): string {
    if (elements.length === 0) {
      return '#000000'; // Standaard zwart als er geen context is
    }

    // Vind het meest recent toegevoegde element met een omtrekkleur
    const elementsWithOutline = elements.filter(el => el.style && el.style.outlineColor);
    if (elementsWithOutline.length > 0) {
      // Sorteer op id (aannemend dat hogere id's recenter zijn)
      elementsWithOutline.sort((a, b) => parseInt(b.id) - parseInt(a.id));
      return elementsWithOutline[0].style.outlineColor;
    }

    return '#000000'; // Standaard zwart als geen omtrekkleuren gevonden
  }

  /**
   * Suggereert een lettergrootte op basis van bestaande tekstobjecten
   */
  private suggestFontSize(elements: DesignElement[]): number {
    // Filter op tekstobjecten
    const textElements = elements.filter(el => el.type === 'TEXT');
    
    if (textElements.length === 0) {
      return 12; // Standaard lettergrootte als er geen tekstobjecten zijn
    }

    // Bereken de gemiddelde lettergrootte van bestaande tekstelementen
    const sum = textElements.reduce((total, element) => {
      return total + (element.style?.fontSize || 12);
    }, 0);
    
    return Math.round(sum / textElements.length);
  }

  /**
   * Suggereert een lettertype op basis van bestaande tekstobjecten
   */
  private suggestFontName(elements: DesignElement[]): string {
    // Filter op tekstobjecten
    const textElements = elements.filter(el => el.type === 'TEXT');
    
    if (textElements.length === 0) {
      return 'Arial'; // Standaard lettertype als er geen tekstobjecten zijn
    }

    // Vind het meest gebruikte lettertype
    const fontCounts = {};
    textElements.forEach(element => {
      const font = element.style?.fontName || 'Arial';
      fontCounts[font] = (fontCounts[font] || 0) + 1;
    });

    // Vind het lettertype met de hoogste count
    let mostUsedFont = 'Arial';
    let highestCount = 0;
    
    for (const [font, count] of Object.entries(fontCounts)) {
      if (count > highestCount) {
        mostUsedFont = font;
        highestCount = count as number;
      }
    }
    
    return mostUsedFont;
  }

  /**
   * Suggereert een materiaalkleur op basis van bestaande 3D-objecten
   */
  private suggestMaterialColor(elements: DesignElement[]): string {
    // Filter op 3D-objecten
    const objectsWith3DMaterial = elements.filter(el => 
      el.style && el.style.materialColor && el.type === 'MESH'
    );
    
    if (objectsWith3DMaterial.length === 0) {
      return '#CCCCCC'; // Standaard grijze kleur als er geen 3D-objecten zijn
    }

    // Vind het meest recent toegevoegde 3D-object met een materiaalkleur
    objectsWith3DMaterial.sort((a, b) => parseInt(b.id) - parseInt(a.id));
    return objectsWith3DMaterial[0].style.materialColor;
  }

  /**
   * Vindt relevante objecten in de huidige context voor selectie
   */
  private findRelevantObjects(elements: DesignElement[]): DesignElement[] {
    if (elements.length === 0) {
      return [];
    }

    // Standaardselectielogica: de meest recent toegevoegde elementen
    // Deze kan in de toekomst uitgebreid worden met complexere logica
    return elements.slice(-3); // Laatste 3 elementen
  }

  /**
   * Haalt de juiste context analyzer op voor het opgegeven platform
   */
  private getContextAnalyzerForPlatform(platform: string): DesignContextAnalyzer | null {
    switch (platform.toLowerCase()) {
      case 'blender':
        return this.blenderContextAnalyzer;
      case 'coreldraw':
        return this.corelContextAnalyzer;
      default:
        this.logger.warn(`Unsupported platform for context analysis: ${platform}`);
        return null;
    }
  }

  /**
   * Executes a command with context-aware enhancements
   * This method is specifically designed to be called from SoftwareService
   */
  async executeContextAwareCommand(
    platform: string, 
    action: string, 
    params: any
  ): Promise<CommandResult> {
    // This is a wrapper around executeCommand to maintain compatibility with SoftwareService
    return this.executeCommand(platform, action, params);
  }
} 