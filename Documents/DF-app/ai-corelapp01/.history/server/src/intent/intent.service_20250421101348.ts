import { Injectable, Logger } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { ChromaService } from '../chroma/chroma.service';
import { DesignContextAnalyzerService } from '../software/context/design-context-analyzer.service';
import { ContextAwareQueryService } from '../software/context/context-aware-query.service';
import { EnhancedContextQueryService } from '../software/context/enhanced-context-query.service';

export interface Intent {
  type: string;
  platform?: string;
  confidence: number;
  entities?: Record<string, any>;
  action?: string;
  steps?: Array<{
    description: string;
    action: string;
    parameters?: Record<string, any>;
  }>;
  designTerms?: string[];
  alternatives?: Intent[];
  contextualReferences?: Array<{
    reference: string;
    targetObject?: string;
    confidence: number;
  }>;
  domainConcepts?: Array<{
    concept: string;
    relevance: number;
  }>;
}

export interface IntentDetectionOptions {
  detailLevel?: 'basic' | 'standard' | 'detailed' | 'comprehensive';
  includeDomainKnowledge?: boolean;
  includeAlternatives?: boolean;
  sessionId?: string;
  platform?: string;
}

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);
  private intentMemory: Map<string, Intent[]> = new Map();
  
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly chromaService: ChromaService,
    private readonly designContextAnalyzerService: DesignContextAnalyzerService,
    private readonly contextQueryService: EnhancedContextQueryService,
  ) {}
  
  /**
   * Detect intent from user message with enhanced context and domain knowledge
   */
  async detectIntent(
    message: string, 
    conversationHistory: ChatMessage[],
    options: IntentDetectionOptions = {}
  ): Promise<Intent> {
    try {
      this.logger.debug(`Detecting intent for message: ${message} with options: ${JSON.stringify(options)}`);
      
      // Start building the prompt messages
      const intentPrompt: ChatMessage[] = [];
      
      // Build system prompt based on the detail level
      const detailLevel = options.detailLevel || 'basic';
      const systemPrompt = this.buildSystemPrompt(detailLevel);
      intentPrompt.push({ role: 'system', content: systemPrompt });
      
      // Add relevant design domain knowledge from ChromaDB if requested
      if (options.includeDomainKnowledge !== false) {
        await this.appendDomainKnowledge(intentPrompt, message, options.useDomainRAG);
      }
      
      // Add design context if requested and available
      if (options.useContext !== false) {
        if (options.enhancedDesignContext) {
          await this.appendEnhancedDesignContext(intentPrompt);
        } else {
          await this.appendDesignContext(intentPrompt);
        }
      }
      
      // Add conversation history for context (but limit it to save tokens)
      // Use more context for comprehensive analysis
      const contextWindowSize = detailLevel === 'comprehensive' ? 10 : 5;
      const contextWindow = conversationHistory.slice(-contextWindowSize);
      intentPrompt.push(...contextWindow);
      
      // Add the current message
      intentPrompt.push({
        role: 'user',
        content: `Analyseer de volgende gebruikersinvoer en bepaal de intentie: "${message}"`,
      });
      
      // Select appropriate model based on complexity
      const model = detailLevel === 'comprehensive' ? 
        'llama3.2:70b-q4_K_M' : 'llama3.2:11b-q4_K_M';
      
      // Adjust temperature based on detail level
      const temperature = detailLevel === 'basic' ? 0.2 : 
                         (detailLevel === 'detailed' ? 0.3 : 0.4);
      
      // Make API call to Ollama
      const response = await this.ollamaService.chatCompletion({
        model: model,
        messages: intentPrompt,
        temperature: temperature,
      });
      
      // Extract the intent JSON from the response
      const content = response.choices[0].message.content;
      
      try {
        // Try to find and parse the JSON object
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const intentJson = JSON.parse(jsonMatch[0]);
          this.logger.debug(`Intent detected: ${JSON.stringify(intentJson)}`);
          
          // If we want alternatives and they weren't provided, generate them
          if (options.analyzeAlternatives && !intentJson.alternatives) {
            intentJson.alternatives = await this.generateAlternativeIntents(message, intentJson);
          }
          
          // Store this intent in conversation memory for future reference
          if (options.sessionId) {
            await this.storeIntentInMemory(intentJson, message, options.sessionId);
          }
          
          return intentJson;
        } else {
          throw new Error('No JSON object found in response');
        }
      } catch (parseError) {
        this.logger.error(`Failed to parse intent JSON: ${parseError.message}`);
        // Fallback to default intent
        return {
          type: 'GENERAL',
          platform: 'general',
          confidence: 0.5,
          action: 'respond_to_user',
        };
      }
    } catch (error) {
      this.logger.error(`Intent detection error: ${error.message}`);
      return {
        type: 'GENERAL',
        platform: 'general',
        confidence: 0.3,
        action: 'respond_to_user',
      };
    }
  }
  
  /**
   * Build system prompt for intent detection with various detail levels
   */
  private buildSystemPrompt(detailLevel: 'basic' | 'detailed' | 'comprehensive'): string {
    let prompt = `Je bent een intent recognition system dat gebruikersintenties identificeert voor een AI-agent die CorelDRAW en Blender aanstuurt.
          
Classificeer de gebruikersintentie in een van de volgende types:
1. CREATE - Aanmaken van nieuwe objecten/elementen
2. MODIFY - Wijzigen van bestaande objecten/elementen
3. DELETE - Verwijderen van objecten/elementen
4. QUERY - Een vraag over een functie of mogelijkheid
5. HELP - Hulp bij een taak of functie
6. SWITCH - Wisselen tussen applicaties (CorelDRAW <-> Blender)
7. UNDO - Ongedaan maken van een vorige actie
8. SAVE - Opslaan van een bestand/project
9. ANALYZE - Analyseren van het huidige ontwerp
10. EXPORT - Exporteren van het ontwerp naar andere formaten
11. TRANSFORM - Transformeren (roteren, schalen, etc.) van objecten
12. GROUP - Groeperen of degroeperen van elementen
13. ARRANGE - Rangschikken of uitlijnen van elementen
14. STYLE - Wijzigen van stijl, kleuren, materialen
15. GENERAL - Algemene conversatie niet gerelateerd aan ontwerpen
16. AUTOMATE - Automatiseren van repetitieve taken
17. OPTIMIZE - Optimaliseren van het ontwerp voor performance of uitvoer
18. SEQUENCE - Aanmaken van sequentiële acties of animaties
19. REFERENCE - Refereren naar of hergebruiken van eerder werk
20. COLLABORATE - Delen of samenwerken aan een ontwerp

Bepaal ook welk platform van toepassing is:
- coreldraw: als het verzoek specifiek is voor CorelDRAW (vectorontwerp)
- blender: als het verzoek specifiek is voor Blender (3D-modellering)
- general: als het platformonafhankelijk is of geen van beide specifiek wordt genoemd`;

    // Add multi-step instructions recognition for detailed analysis
    if (detailLevel === 'detailed' || detailLevel === 'comprehensive') {
      prompt += `

Herken complexe, meervoudige instructies en breek deze op in logische stappen. Bijvoorbeeld:
"Maak een logo met een blauwe cirkel, voeg tekst toe en pas een schaduweffect toe" zou moeten worden herkend als drie stappen:
1. CREATE-actie voor het maken van een cirkel met blauwe kleur
2. CREATE-actie voor het toevoegen van tekst
3. MODIFY-actie voor het toepassen van een schaduweffect

Identificeer ook specifieke ontwerpterminologie in de vraag, zoals:
- Vectortermen: paden, knooppunten, Bezier-curves, vectoren, ankerpunten
- 3D-termen: mesh, vertices, faces, extrude, sculpting, rigging
- Kleurtermen: RGB, CMYK, kleurruimte, kleurharmonie, complementaire kleuren
- Compositietermen: regel van derden, gulden snede, balans, contrast, symmetrie`;
    }

    // Add additional context analysis for comprehensive
    if (detailLevel === 'comprehensive') {
      prompt += `

Analyseer open-einded, indirecte of ambigue taalgebruik. Bijvoorbeeld:
- "Ik denk dat het wat koeler moet zijn" kan verwijzen naar kleur of temperatuur
- "De compositie klopt niet helemaal" is een subjectieve beoordeling die meer context vereist
- "Maak het meer zoals het vorige ontwerp" is een verwijzing naar een eerdere staat

Ontleed complexe ontwerptermen en vaktechnisch jargon:
- Begrijp gespecialiseerde termen zoals "kerning", "unsharp mask", "extrusie" of "subdivisie oppervlak"
- Interpreteer implicaties van technische terminologie voor het uit te voeren commando
- Herken platform-specifieke concepten en hun relaties

Identificeer verwijzingen naar contextuele elementen:
- Verwijzingen naar zichtbare objecten ("maak die cirkel groter")
- Verwijzingen naar eerdere acties ("doe hetzelfde als eerder")
- Verwijzingen naar huidige staat ("verbeter de huidige compositie")
- Verwijzingen naar designprincipes ("verbeter de hiërarchie")

Genereer alternatieve interpretaties wanneer de input ambigu is:
- Bied 2-3 mogelijke interpretaties met verschillende confidence levels
- Geef aan welke extra informatie nodig zou zijn om ambiguïteit te verminderen`;
    }

    prompt += `

Geef je antwoord in JSON formaat met de volgende structuur:`;

    // Basic structure for simple intent detection
    if (detailLevel === 'basic') {
      prompt += `
{
  "type": "[INTENT_TYPE]",
  "platform": "[coreldraw|blender|general]",
  "confidence": [0.0-1.0],
  "entities": {
    // Relevante entiteiten zoals objectnamen, kleuren, afmetingen, etc.
  },
  "action": "[specifieke actie om uit te voeren]"
}`;
    } 
    // Enhanced structure for multi-step instructions
    else if (detailLevel === 'detailed') {
      prompt += `
{
  "type": "[INTENT_TYPE]",
  "platform": "[coreldraw|blender|general]",
  "confidence": [0.0-1.0],
  "entities": {
    // Relevante entiteiten zoals objectnamen, kleuren, afmetingen, etc.
  },
  "action": "[primaire actie om uit te voeren]",
  "steps": [
    {
      "action": "[actie-1]",
      "params": {
        // Parameters specifiek voor deze actie
      },
      "description": "[beschrijving van deze stap]"
    },
    // Meer stappen indien van toepassing
  ],
  "designTerms": [
    // Lijst van gespecialiseerde ontwerptermen in de input
  ]
}`;
    }
    // Comprehensive structure for open-ended language and contextual references
    else {
      prompt += `
{
  "type": "[INTENT_TYPE]",
  "platform": "[coreldraw|blender|general]",
  "confidence": [0.0-1.0],
  "entities": {
    // Relevante entiteiten zoals objectnamen, kleuren, afmetingen, etc.
  },
  "action": "[primaire actie om uit te voeren]",
  "steps": [
    {
      "action": "[actie-1]",
      "params": {
        // Parameters specifiek voor deze actie
      },
      "description": "[beschrijving van deze stap]"
    },
    // Meer stappen indien van toepassing
  ],
  "designTerms": [
    // Lijst van gespecialiseerde ontwerptermen in de input
  ],
  "alternatives": [
    {
      "type": "[ALTERNATIEF_INTENT_TYPE]",
      "action": "[alternatieve actie]",
      "confidence": [0.0-1.0]
    }
    // Meer alternatieven indien van toepassing
  ],
  "contextualReferences": [
    // Lijst van verwijzingen naar elementen in de huidige context
  ],
  "domainConcepts": [
    {
      "term": "[ontwerpterm]",
      "definition": "[beknopte definitie]",
      "relevance": [0.0-1.0]
    }
    // Meer domein-specifieke concepten indien van toepassing
  ]
}`;
    }

    return prompt;
  }
  
  /**
   * Append relevant design domain knowledge from ChromaDB
   */
  private async appendDomainKnowledge(prompt: ChatMessage[], message: string, useDomainRAG: boolean = false): Promise<void> {
    try {
      // Query API documentation for relevant concepts in both platforms
      const apiResults = await this.chromaService.queryApiDocumentation(message, undefined, useDomainRAG ? 5 : 3);
      
      if (apiResults && apiResults.documents && apiResults.documents[0] && apiResults.documents[0].length > 0) {
        // Format API results into a helpful context summary
        const apiContext = apiResults.documents[0]
          .map((doc, index) => {
            // Ensure we only take a reasonable amount of content
            const truncatedDoc = doc.length > 500 ? doc.substring(0, 500) + '...' : doc;
            const platform = apiResults.metadatas[0][index].platform;
            return `${platform.toUpperCase()} API: ${truncatedDoc}`;
          })
          .join('\n\n');
        
        prompt.push({
          role: 'system',
          content: `Relevante ontwerp API informatie:\n${apiContext}`,
        });
      }
      
      // Query conversation memory for similar intents
      if (this.hasPriorIntents(message)) {
        const memoryResults = await this.chromaService.queryConversationMemory(message, 'intent_memory', useDomainRAG ? 3 : 2);
        
        if (memoryResults && memoryResults.documents && memoryResults.documents[0] && memoryResults.documents[0].length > 0) {
          const intentMemory = memoryResults.documents[0]
            .map((doc) => doc)
            .join('\n\n');
          
          prompt.push({
            role: 'system',
            content: `Relevante eerdere intenties:\n${intentMemory}`,
          });
        }
      }
      
      // Enhanced domain knowledge with RAG if requested
      if (useDomainRAG) {
        try {
          // Query additional design terminology collection
          const designKnowledge = await this.queryDesignKnowledgeBase(message);
          if (designKnowledge) {
            prompt.push({
              role: 'system',
              content: `Relevante ontwerpconcepten en terminologie:\n${designKnowledge}`,
            });
          }
        } catch (ragError) {
          this.logger.error(`Error with RAG enhancement: ${ragError.message}`);
          // Continue without this specific enhancement
        }
      }
    } catch (error) {
      this.logger.error(`Error appending domain knowledge: ${error.message}`);
      // Continue without domain knowledge if there's an error
    }
  }
  
  /**
   * Query design knowledge base for relevant terminology and concepts
   */
  private async queryDesignKnowledgeBase(query: string): Promise<string | null> {
    try {
      // This would ideally query a separate collection in ChromaDB
      // with design theory, terminology, and best practices
      
      // For now we'll repurpose the API documentation collection
      const results = await this.chromaService.queryApiDocumentation(
        query + " design theory terminology concepts",
        undefined,
        3
      );
      
      if (results && results.documents && results.documents[0] && results.documents[0].length > 0) {
        return results.documents[0]
          .map((doc, index) => {
            const metadata = results.metadatas[0][index];
            const platform = metadata.platform;
            const category = metadata.category || 'general';
            return `${platform.toUpperCase()} ${category}: ${doc.substring(0, 300)}...`;
          })
          .join('\n\n');
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Error querying design knowledge base: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Append current design context to the prompt
   */
  private async appendDesignContext(prompt: ChatMessage[]): Promise<void> {
    try {
      // Try to get the current platform that's active
      let platform: 'coreldraw' | 'blender' = 'coreldraw';
      try {
        // This would need to be implemented elsewhere or mocked
        const activePlatform = await this.getCurrentActivePlatform();
        platform = activePlatform === 'blender' ? 'blender' : 'coreldraw';
      } catch (err) {
        // Default to CorelDRAW if platform detection fails
      }
      
      // Get design context based on the platform
      const context = await this.designContextAnalyzerService.getEnhancedContext();
      
      // Get contextual description
      const contextPrompt = await this.contextQueryService.buildPromptWithContext(
        '',  // No base prompt needed here
        context,
        []   // No conversation history needed
      );
      
      // Add only the relevant context message
      if (contextPrompt.length > 0) {
        prompt.push(contextPrompt[0]);  // The first message has all the context
      }
      
      // Add any visual analysis if available
      if (context.visualAnalysis) {
        prompt.push({
          role: 'system',
          content: `Visuele analyse van het huidige ontwerp:\n- Balans: ${context.visualAnalysis.compositionAnalysis.visualBalance}\n- Negatieve ruimte: ${context.visualAnalysis.compositionAnalysis.negativeSpace}\n- Kleurpalet: ${context.visualAnalysis.compositionAnalysis.colorPalette.join(', ')}`
        });
      }
    } catch (error) {
      this.logger.error(`Error appending design context: ${error.message}`);
      // Continue without context if there's an error
    }
  }
  
  /**
   * Append enhanced design context with deeper visual and structural analysis
   */
  private async appendEnhancedDesignContext(prompt: ChatMessage[]): Promise<void> {
    try {
      // Get current platform
      const platform = await this.getCurrentActivePlatform();
      
      // Get enhanced context with detailed visual analysis
      const context = await this.designContextAnalyzerService.getEnhancedContext();
      
      // Use the enhanced context query service
      const enhancedContextPrompt = await this.contextQueryService.buildEnhancedPrompt(
        '',  // No base prompt
        context,
        [],  // No conversation history
        platform
      );
      
      // Add the enhanced context to the prompt
      if (enhancedContextPrompt.length > 0) {
        prompt.push(...enhancedContextPrompt);
      }
      
    } catch (error) {
      this.logger.error(`Error appending enhanced design context: ${error.message}`);
      // Fall back to regular context
      await this.appendDesignContext(prompt);
    }
  }
  
  /**
   * Store detected intent in conversation memory for future reference
   */
  private async storeIntentInMemory(
    intent: Intent,
    message: string,
    sessionId: string
  ): Promise<void> {
    try {
      // Format intent data for storage
      const intentMemory = {
        message,
        intent: JSON.stringify(intent),
        timestamp: new Date().toISOString()
      };
      
      // Store in ChromaDB
      await this.chromaService.addConversationMemory(
        sessionId,
        `User said: "${message}"\nDetected intent: ${intent.type} (${intent.platform}) - ${intent.action}`,
        intentMemory
      );
    } catch (error) {
      this.logger.error(`Error storing intent in memory: ${error.message}`);
      // Non-critical error, we can continue without storing
    }
  }
  
  /**
   * Generate alternative intent interpretations for ambiguous queries
   */
  private async generateAlternativeIntents(
    message: string, 
    primaryIntent: Intent
  ): Promise<Array<{type: string; action: string; confidence: number}>> {
    try {
      // Prepare a prompt to generate alternative interpretations
      const alternativePrompt: ChatMessage[] = [
        {
          role: 'system',
          content: `Je bent een intent recognition system dat alternatieve interpretaties genereert voor potentieel ambigue input. De primaire interpretatie was:
          
Intent Type: ${primaryIntent.type}
Platform: ${primaryIntent.platform}
Action: ${primaryIntent.action || 'unknown'}
Confidence: ${primaryIntent.confidence}

Genereer 2-3 alternatieve interpretaties die ook redelijk zouden kunnen zijn, maar met lagere confidence scores. Geef alleen JSON terug in dit formaat:
[
  {
    "type": "INTENT_TYPE",
    "action": "specifieke actie",
    "confidence": 0.0-1.0 (lager dan primaire confidence)
  },
  ...
]`
        },
        {
          role: 'user',
          content: `Wat zijn alternatieve interpretaties voor: "${message}"?`
        }
      ];
      
      // Use a lightweight model for this
      const response = await this.ollamaService.chatCompletion({
        model: 'llama3.2:8b-q4_K_M',
        messages: alternativePrompt,
        temperature: 0.4
      });
      
      const content = response.choices[0].message.content;
      
      // Try to extract JSON array
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const alternatives = JSON.parse(jsonMatch[0]);
        return alternatives.slice(0, 3); // Limit to 3 alternatives
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Error generating alternative intents: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Check if we have prior intents stored that may be relevant
   */
  private hasPriorIntents(message: string): boolean {
    // This is a simplification - ideally we would look at session state
    // to determine if we have prior intents for this conversation
    return message.length > 10; // Only bother checking for non-trivial messages
  }
  
  /**
   * Get current active platform
   */
  private async getCurrentActivePlatform(): Promise<'coreldraw' | 'blender'> {
    // This would be implemented with actual platform detection
    // For now, return a mock result
    return 'coreldraw';
  }
  
  /**
   * Analyze complex multi-step instructions
   */
  async analyzeMultiStepInstructions(message: string, conversationHistory: ChatMessage[]): Promise<Intent> {
    // Use the detailed analysis for multi-step instructions
    return this.detectIntent(message, conversationHistory, {
      detailLevel: 'detailed',
      useContext: true,
      includeDomainKnowledge: true
    });
  }
  
  /**
   * Process open-ended natural language with contextual understanding
   */
  async processOpenEndedLanguage(message: string, conversationHistory: ChatMessage[]): Promise<Intent> {
    // Use comprehensive analysis for open-ended natural language
    return this.detectIntent(message, conversationHistory, {
      detailLevel: 'comprehensive',
      useContext: true,
      includeDomainKnowledge: true,
      analyzeAlternatives: true,
      useDomainRAG: true,
      enhancedDesignContext: true
    });
  }
  
  /**
   * Get terminologie recommendations based on detected intent
   */
  async getTerminologyRecommendations(intent: Intent): Promise<string[]> {
    if (!intent.designTerms || intent.designTerms.length === 0) {
      // If no design terms were detected, let's try to suggest some based on intent type
      const platform = intent.platform;
      const intentType = intent.type;
      
      // Create a query to get relevant terminology
      const query = `${intentType} terminology for ${platform}`;
      
      try {
        const results = await this.chromaService.queryApiDocumentation(query, platform as any, 3);
        
        if (results && results.documents && results.documents[0]) {
          // Extract potential terminology from the documents
          const extractedTerms = this.extractTerminologyFromText(results.documents[0].join(' '));
          return extractedTerms.slice(0, 10); // Return top 10 terms
        }
      } catch (error) {
        this.logger.error(`Error getting terminology recommendations: ${error.message}`);
      }
      
      return []; // Return empty if we couldn't get terms
    }
    
    return intent.designTerms;
  }
  
  /**
   * Get comprehensive design domain knowledge for a specific intent
   */
  async getDomainKnowledgeForIntent(intent: Intent): Promise<Array<{term: string; definition: string; relevance: number}>> {
    try {
      // If intent already has domain concepts, return those
      if (intent.domainConcepts && intent.domainConcepts.length > 0) {
        return intent.domainConcepts;
      }
      
      // Otherwise query the knowledge base
      const query = `${intent.type} ${intent.action || ''} ${intent.platform} design terminology`;
      const results = await this.queryDesignKnowledgeBase(query);
      
      if (!results) {
        return [];
      }
      
      // Extract and format domain terms
      // This would ideally use a more sophisticated extraction method
      const knowledgePrompt: ChatMessage[] = [
        {
          role: 'system',
          content: `Je bent een ontwerp terminologie expert. Analyseer de volgende informatie en extraheer relevante 
ontwerpconcepten in JSON format als een array van objecten met "term", "definition", en "relevance" (0.0-1.0) velden. Geef alleen JSON terug.`
        },
        {
          role: 'user',
          content: results
        }
      ];
      
      const response = await this.ollamaService.chatCompletion({
        model: 'llama3.2:8b-q4_K_M',
        messages: knowledgePrompt,
        temperature: 0.2
      });
      
      const content = response.choices[0].message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      
      if (jsonMatch) {
        const domainConcepts = JSON.parse(jsonMatch[0]);
        return domainConcepts.slice(0, 5); // Limit to top 5 concepts
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Error getting domain knowledge: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Extract terminology from text (simple implementation)
   */
  private extractTerminologyFromText(text: string): string[] {
    // This is a simplified implementation
    // In a real system, we'd use NLP to extract key domain terms
    
    // Define some known design terminology
    const designTerms = [
      // CorelDRAW terms
      'bezier', 'pad', 'knooppunt', 'contour', 'vulling', 'vector', 'powerclip',
      'stijl', 'kleurvlak', 'verloop', 'bitmap', 'tekstopmaak', 'perspectief',
      'stansen', 'maasopvulling', 'omtreklijn', 'slagschaduw', 'transparantie',
      
      // Blender terms
      'mesh', 'vertex', 'face', 'edge', 'modifier', 'sculpting', 'uv-mapping',
      'texture', 'rigging', 'armature', 'keyframe', 'animation', 'rendering',
      'weight painting', 'normal map', 'displacement', 'subsurface scattering',
      
      // Common design terms
      'compositie', 'contrast', 'balans', 'symmetrie', 'hiërarchie', 'focal point',
      'negatieve ruimte', 'rgb', 'cmyk', 'kleurharmonie', 'complementair',
      'typografie', 'kerning', 'leading', 'tracking', 'grid', 'gulden snede',
      'regel van derden', 'kleurtheorie', 'monochroom', 'analogous', 'triadic'
    ];
    
    // Find which terms appear in the text
    return designTerms.filter(term => text.toLowerCase().includes(term.toLowerCase()));
  }
} 