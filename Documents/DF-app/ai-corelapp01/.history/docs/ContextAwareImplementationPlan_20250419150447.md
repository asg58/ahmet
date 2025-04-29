# Context-Aware Functionaliteit: Fase 2 Implementatieplan

Dit document beschrijft het implementatieplan voor de volgende fase van de context-aware functionaliteit, waarbij we voortbouwen op de bestaande componenten en deze uitbreiden met geavanceerde mogelijkheden.

## 1. Geavanceerde Documentcontext-analyse

### 1.1 Documentstructuur Analyse

**Doel:** Het systeem laten begrijpen hoe het document is gestructureerd om betere beslissingen te maken over positionering, stijl en relaties.

**Taken:**
- [ ] Implementeer documentstructuuranalyse in CorelContextAnalyzer:
  ```typescript
  // server/src/software/context/corel-context.ts
  
  private analyzeDocumentStructure(elements: DesignElement[]): DocumentStructure {
    // Identificeer grids, kolommen, alignments, etc.
    // Detecteer patronen in element positionering
    // Identificeer design hiërarchie
  }
  ```

- [ ] Implementeer documentstructuuranalyse in BlenderContextAnalyzer:
  ```typescript
  // server/src/software/context/blender-context.ts
  
  private analyzeSceneStructure(elements: DesignElement[]): SceneStructure {
    // Identificeer scene structuur (lagen, collecties)
    // Detecteer 3D-ruimte verdeling
    // Identificeer object relaties
  }
  ```

- [ ] Ontwikkel intelligente positioneringsalgoritmes gebaseerd op documentstructuur:
  ```typescript
  // server/src/software/universal/context-aware-adapter.ts
  
  private determineStructureAwarePosition(
    action: string, 
    context: DesignContext
  ): Position {
    // Analyseer documentstructuur
    const structure = this.analyzeStructure(context);
    
    // Bepaal optimale positie op basis van structuur
    if (structure.hasGrid) {
      return this.alignToGrid(structure.grid);
    } else if (structure.hasColumns) {
      return this.alignToColumn(structure.columns);
    } else if (structure.hasAlignedElements) {
      return this.alignWithExistingElements(structure.alignedElements);
    }
    
    // Fallback naar standaard positionering
    return this.determineSmartPosition(action, context);
  }
  ```

**Prioriteit:** Hoog  
**Tijdsinschatting:** 3-4 dagen

### 1.2 Stijlanalyse en Consistentie

**Doel:** Beter detecteren en toepassen van consistente ontwerpstijlen binnen het document.

**Taken:**
- [ ] Implementeer stijlanalyse in ContextAnalyzers:
  ```typescript
  // server/src/software/context/design-context.ts
  
  export interface StyleAnalysis {
    dominantColors: Color[];
    colorPalette: Color[];
    typographyStyles: Record<string, any>;
    commonSizes: Record<string, number[]>;
    strokeStyles: Record<string, any>;
  }
  
  // In context analyzers:
  private analyzeDesignStyles(elements: DesignElement[]): StyleAnalysis {
    // Identificeer veelgebruikte kleuren
    // Analyseer typografie patronen
    // Identificeer consistente groottes
    // Analyseer lijnstijlen
  }
  ```

- [ ] Verbeter stijltoepassing in ContextAwareCommandAdapter:
  ```typescript
  // server/src/software/universal/context-aware-adapter.ts
  
  private enhanceParamsWithStyleConsistency(
    params: Record<string, any>,
    context: DesignContext
  ): Record<string, any> {
    const styleAnalysis = this.analyzeDesignStyles(context);
    
    // Pas dominante kleuren toe indien relevant
    if (!params.fillColor && styleAnalysis.dominantColors.length > 0) {
      params.fillColor = styleAnalysis.dominantColors[0];
    }
    
    // Pas typografie toe voor tekstgerelateerde commando's
    if (params.text && !params.fontFamily && styleAnalysis.typographyStyles) {
      const dominantStyle = Object.keys(styleAnalysis.typographyStyles)[0];
      params.fontFamily = styleAnalysis.typographyStyles[dominantStyle].fontFamily;
      params.fontSize = styleAnalysis.typographyStyles[dominantStyle].fontSize;
    }
    
    return params;
  }
  ```

**Prioriteit:** Hoog  
**Tijdsinschatting:** 2-3 dagen

## 2. Voorspellende Context-Aware Functionaliteit

### 2.1 Commandosuggesties

**Doel:** Op basis van context en gebruikersgeschiedenis volgende commando's suggereren.

**Taken:**
- [ ] Implementeer CommandHistoryAnalyzer:
  ```typescript
  // server/src/software/context/command-history-analyzer.ts
  
  @Injectable()
  export class CommandHistoryAnalyzer {
    private readonly logger = new Logger(CommandHistoryAnalyzer.name);
    
    // Houdt de recente commando's per platform bij
    private readonly commandHistory: Record<string, {
      action: string;
      params: Record<string, any>;
      timestamp: number;
    }[]> = {
      coreldraw: [],
      blender: []
    };
    
    recordCommand(
      platform: 'coreldraw' | 'blender',
      action: string,
      params: Record<string, any>
    ): void {
      this.commandHistory[platform].push({
        action,
        params,
        timestamp: Date.now()
      });
      
      // Beperk geschiedenis tot 100 items
      if (this.commandHistory[platform].length > 100) {
        this.commandHistory[platform] = this.commandHistory[platform].slice(-100);
      }
    }
    
    suggestNextActions(
      platform: 'coreldraw' | 'blender',
      context: DesignContext
    ): { action: string; confidence: number; params?: Record<string, any> }[] {
      // Analyseer recente commandogeschiedenis
      // Identificeer patronen (bijv. rechthoek maken -> vulling wijzigen)
      // Kijk naar context (bijv. geselecteerde elementen)
      
      // Return gesorteerde lijst suggesties met confidence scores
    }
  }
  ```

- [ ] Integreer CommandHistoryAnalyzer in SoftwareService:
  ```typescript
  // server/src/software/software.service.ts
  
  // Inject de analyzer
  constructor(
    // ... bestaande dependencies
    private readonly commandHistoryAnalyzer: CommandHistoryAnalyzer
  ) {}
  
  // Record commando's na uitvoering
  async executeAction(...) {
    const result = await ... // bestaande implementatie
    
    // Record het uitgevoerde commando als het succesvol was
    if (result.success) {
      this.commandHistoryAnalyzer.recordCommand(platform, action, parameters);
    }
    
    return result;
  }
  
  // Voeg nieuwe endpoint toe om suggesties op te halen
  async getSuggestedActions(
    platform: 'coreldraw' | 'blender'
  ): Promise<ActionSuggestion[]> {
    const context = await this.getDesignContext(platform);
    return this.commandHistoryAnalyzer.suggestNextActions(platform, context);
  }
  ```

- [ ] Voeg API endpoint toe voor commandosuggesties:
  ```typescript
  // server/src/software/software.controller.ts
  
  @Get('suggestions/:platform')
  async getSuggestedActions(@Param('platform') platform: string) {
    // Valideer platform
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    
    try {
      const suggestions = await this.softwareService.getSuggestedActions(
        platform as 'coreldraw' | 'blender'
      );
      
      return {
        platform,
        suggestions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error getting action suggestions: ${error.message}`);
      throw new HttpException(
        `Failed to get suggestions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  ```

**Prioriteit:** Medium  
**Tijdsinschatting:** 4-5 dagen

### 2.2 Parameter-suggesties

**Doel:** Intelligente suggesties voor parameterwaarden op basis van context, gebruikersgeschiedenis en documentanalyse.

**Taken:**
- [ ] Implementeer ParameterSuggestionService:
  ```typescript
  // server/src/software/context/parameter-suggestion.service.ts
  
  @Injectable()
  export class ParameterSuggestionService {
    private readonly logger = new Logger(ParameterSuggestionService.name);
    
    constructor(
      private readonly commandHistoryAnalyzer: CommandHistoryAnalyzer
    ) {}
    
    suggestParameters(
      platform: 'coreldraw' | 'blender',
      action: string,
      context: DesignContext
    ): Record<string, any> {
      // Combineer verschillende bronnen voor suggesties:
      
      // 1. Historische parameters voor deze actie
      const historicalParams = this.extractHistoricalParameters(platform, action);
      
      // 2. Context-gebaseerde parameters
      const contextParams = this.extractContextParameters(action, context);
      
      // 3. Document-analyse gebaseerde parameters
      const documentParams = this.extractDocumentParameters(action, context);
      
      // Combineer en prioriteer suggesties
      return {
        ...historicalParams,
        ...documentParams,
        ...contextParams  // Context heeft hoogste prioriteit
      };
    }
    
    private extractHistoricalParameters(
      platform: 'coreldraw' | 'blender',
      action: string
    ): Record<string, any> {
      // Haal parameters op uit commandogeschiedenis
      // Bereken populaire waardes en gemiddelden
    }
    
    private extractContextParameters(
      action: string,
      context: DesignContext
    ): Record<string, any> {
      // Parameters op basis van geselecteerde elementen
      // Parameters op basis van huidige weergave
    }
    
    private extractDocumentParameters(
      action: string,
      context: DesignContext
    ): Record<string, any> {
      // Parameters op basis van documentstructuur
      // Parameters op basis van stijlanalyse
    }
  }
  ```

- [ ] Integreer parameter-suggesties in ContextAwareCommandAdapter:
  ```typescript
  // server/src/software/universal/context-aware-adapter.ts
  
  constructor(
    // ... bestaande dependencies
    private readonly parameterSuggestionService: ParameterSuggestionService
  ) {
    super(commandFactory, blenderObjectModel, corelDrawObjectModel);
  }
  
  private enhanceParamsWithContext(
    action: string,
    params: Record<string, any>,
    context: DesignContext
  ): Record<string, any> {
    // Begin met suggesties
    const suggestedParams = this.parameterSuggestionService.suggestParameters(
      context.platform as 'coreldraw' | 'blender',
      action,
      context
    );
    
    // Combineer met bestaande params, waarbij expliciete params prioriteit hebben
    const enhancedParams = {
      ...suggestedParams,
      ...params
    };
    
    // Bestaande implementatie voor smart positioning, etc.
    // ...
    
    return enhancedParams;
  }
  ```

- [ ] Voeg API endpoint toe voor parameter-suggesties:
  ```typescript
  // server/src/software/software.controller.ts
  
  @Get(':platform/suggest-params')
  async suggestParameters(
    @Param('platform') platform: string,
    @Query('action') action: string
  ) {
    // Valideer platform en actie
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new BadRequestException(`Unsupported platform: ${platform}`);
    }
    
    if (!action) {
      throw new BadRequestException('Action is required');
    }
    
    try {
      // Haal context op
      const context = await this.softwareService.getDesignContext(
        platform as 'coreldraw' | 'blender'
      );
      
      // Haal parameter suggesties op
      const paramSuggestions = this.parameterSuggestionService.suggestParameters(
        platform as 'coreldraw' | 'blender',
        action,
        context
      );
      
      return {
        platform,
        action,
        suggestions: paramSuggestions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error getting parameter suggestions: ${error.message}`);
      throw new HttpException(
        `Failed to get parameter suggestions: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  ```

**Prioriteit:** Medium  
**Tijdsinschatting:** 3-4 dagen

## 3. Context-Gebaseerde Beveiliging

### 3.1 Validatie en Waarschuwingen

**Doel:** Voorkom onbedoelde wijzigingen en waarschuw bij potentieel problematische acties.

**Taken:**
- [ ] Implementeer ContextualValidator:
  ```typescript
  // server/src/software/context/contextual-validator.ts
  
  @Injectable()
  export class ContextualValidator {
    private readonly logger = new Logger(ContextualValidator.name);
    
    validateAction(
      action: string,
      params: Record<string, any>,
      context: DesignContext
    ): { 
      valid: boolean; 
      warnings: string[]; 
      suggestions: Record<string, any> 
    } {
      const warnings: string[] = [];
      const suggestions: Record<string, any> = {};
      
      // 1. Controleer op bulkbewerkingen van belangrijke elementen
      if (
        action.includes('delete') && 
        context.selectedElements.length > 5
      ) {
        warnings.push(`Je staat op het punt ${context.selectedElements.length} elementen te verwijderen.`);
      }
      
      // 2. Controleer op bewerkingen buiten het documentgebied
      if (
        action.startsWith('create_') &&
        params.x !== undefined && params.y !== undefined
      ) {
        const outsideBounds = this.checkPositionOutsideBounds(
          { x: params.x, y: params.y },
          context
        );
        
        if (outsideBounds) {
          warnings.push(`Positie (${params.x}, ${params.y}) valt buiten het documentgebied.`);
          suggestions.x = context.size.width / 2;
          suggestions.y = context.size.height / 2;
        }
      }
      
      // 3. Controleer op inconsistente stijlen
      if (
        action.startsWith('create_') && 
        params.fillColor &&
        context.selectedElements.length > 0
      ) {
        const styleAnalysis = this.analyzeDesignStyles(context);
        const colorExists = styleAnalysis.colorPalette.some(
          color => this.areColorsEqual(color, params.fillColor)
        );
        
        if (!colorExists) {
          warnings.push('De gekozen kleur komt niet voor in het huidige kleurenpalet van het document.');
        }
      }
      
      // Bepaal geldigheid
      const valid = warnings.length === 0;
      
      return { valid, warnings, suggestions };
    }
    
    private checkPositionOutsideBounds(
      position: { x: number; y: number },
      context: DesignContext
    ): boolean {
      // Controleer of positie buiten documentgrenzen valt
    }
    
    private analyzeDesignStyles(context: DesignContext): StyleAnalysis {
      // Implementatie van stijlanalyse
    }
    
    private areColorsEqual(color1: Color, color2: Color): boolean {
      // Vergelijk kleuren met tolerantie
    }
  }
  ```

- [ ] Integreer validator in Context-Aware commandouitvoering:
  ```typescript
  // server/src/software/universal/context-aware-adapter.ts
  
  constructor(
    // ... bestaande dependencies
    private readonly contextualValidator: ContextualValidator
  ) {
    super(commandFactory, blenderObjectModel, corelDrawObjectModel);
  }
  
  async executeContextAwareCommand(
    platform: 'coreldraw' | 'blender',
    action: string,
    params: Record<string, any> = {},
    options: { skipValidation?: boolean } = {}
  ): Promise<CommandExecutionResult & { warnings?: string[] }> {
    try {
      // Haal context op
      const context = await this.getDesignContext(platform);
      
      // Enhance parameters
      const enhancedParams = this.enhanceParamsWithContext(action, params, context);
      
      // Valideer actie (tenzij overgeslagen)
      if (!options.skipValidation) {
        const validationResult = this.contextualValidator.validateAction(
          action,
          enhancedParams,
          context
        );
        
        // Als er suggesties zijn, pas parameters aan
        if (Object.keys(validationResult.suggestions).length > 0) {
          Object.assign(enhancedParams, validationResult.suggestions);
        }
        
        // Voeg waarschuwingen toe aan resultaat
        const result = await super.executeCommandViaObjectModel(platform, action, enhancedParams);
        return {
          ...result,
          warnings: validationResult.warnings
        };
      }
      
      // Standaard uitvoering
      return super.executeCommandViaObjectModel(platform, action, enhancedParams);
    } catch (error) {
      this.logger.error(`Error in context-aware command execution: ${error.message}`);
      return super.executeCommandViaObjectModel(platform, action, params);
    }
  }
  ```

- [ ] Pas API endpoint aan om validatie te ondersteunen:
  ```typescript
  // server/src/software/software.controller.ts
  
  @Post('/context-aware/:platform')
  async executeContextAwareAction(
    @Param('platform') platform: string,
    @Body() body: { 
      action: string; 
      params?: Record<string, any>;
      skipValidation?: boolean;
    }
  ) {
    // ... bestaande validatie
    
    try {
      const result = await this.contextAwareAdapter.executeContextAwareCommand(
        platform as 'coreldraw' | 'blender',
        body.action,
        body.params || {},
        { skipValidation: body.skipValidation }
      );
      
      // Voeg waarschuwingen toe aan resultaat indien aanwezig
      if (result.warnings && result.warnings.length > 0) {
        return {
          ...result,
          hasWarnings: true,
          warnings: result.warnings
        };
      }
      
      return result;
    } catch (error) {
      // ... bestaande error handling
    }
  }
  ```

**Prioriteit:** Laag  
**Tijdsinschatting:** 2-3 dagen

## 4. Uitgebreide Unit Tests

### 4.1 Test Suite Uitbreidingen

**Doel:** Robuuste test-dekking voor de nieuwe functionaliteiten.

**Taken:**
- [ ] Breid test suite uit voor geavanceerde contextanalyse:
  ```typescript
  // server/test/unit/document-structure-analyzer.spec.ts
  
  describe('DocumentStructureAnalyzer', () => {
    // Tests voor documentstructuuranalyse
  });
  
  // server/test/unit/style-analysis.spec.ts
  
  describe('StyleAnalysis', () => {
    // Tests voor stijlanalyse
  });
  ```

- [ ] Voorspellende functionaliteit testen:
  ```typescript
  // server/test/unit/command-history-analyzer.spec.ts
  
  describe('CommandHistoryAnalyzer', () => {
    // Tests voor commandogeschiedenisanalyse en suggesties
  });
  
  // server/test/unit/parameter-suggestion.spec.ts
  
  describe('ParameterSuggestionService', () => {
    // Tests voor parametersuggesties
  });
  ```

- [ ] Validatie en beveiliging testen:
  ```typescript
  // server/test/unit/contextual-validator.spec.ts
  
  describe('ContextualValidator', () => {
    // Tests voor contextvalidatie
  });
  ```

- [ ] Edge case en complexe tests:
  ```typescript
  // server/test/integration/complex-document-tests.ts
  
  describe('ComplexDocumentTests', () => {
    // Tests met complexe documentstructuren
  });
  
  // server/test/integration/context-aware-performance.ts
  
  describe('ContextAwarePerformance', () => {
    // Performance tests voor grote documenten
  });
  ```

**Prioriteit:** Medium  
**Tijdsinschatting:** 4-5 dagen (verspreid over implementatie)

## Implementatie Tijdlijn

1. **Week 1: Documentanalyse & Stijlconsistentie**
   - Documentstructuuranalyse (3-4 dagen)
   - Stijlanalyse (2-3 dagen)
   - Unit tests (1 dag)

2. **Week 2: Voorspellende functionaliteit**
   - CommandSuggestions (3-4 dagen)
   - ParameterSuggestions (2-3 dagen)
   - API endpoints (1 dag)
   - Unit tests (1 dag)

3. **Week 3: Validatie & Afronding**
   - Context-based validation (2-3 dagen)
   - API aanpassingen (1 dag)
   - Edge case testing (2 dagen)
   - Documentatie (1-2 dagen)

## Conclusie

Dit implementatieplan bouwt voort op de solide basis van context-aware functionaliteit die al is geïmplementeerd, en breidt deze uit met meer geavanceerde analyses, voorspellende mogelijkheden en veiligheidsverbeteringen. De nieuwe functionaliteiten stellen het systeem in staat om nog intelligenter en intuïtiever te worden, terwijl het tegelijkertijd robuust en betrouwbaar blijft door uitgebreide tests en fallback-mechanismen.

Het plan is opgedeeld in haalbare taken met duidelijke prioriteiten, wat een stapsgewijze implementatie mogelijk maakt. De ontwikkelaars kunnen beginnen met de hoogst geprioriteerde taken en geleidelijk de meer geavanceerde functionaliteiten toevoegen. 