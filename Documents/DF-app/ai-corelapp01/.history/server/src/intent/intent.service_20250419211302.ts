import { Injectable, Logger } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { ChromaService } from '../chroma/chroma.service';
import { DesignContextAnalyzerService } from '../software/context/design-context-analyzer.service';
import { ContextAwareQueryService } from '../software/context/context-aware-query.service';

export interface Intent {
  type: string;
  platform: 'coreldraw' | 'blender' | 'general';
  confidence: number;
  entities?: Record<string, any>;
  action?: string;
  steps?: Array<{
    action: string;
    params?: Record<string, any>;
    description: string;
  }>;
  designTerms?: string[];
}

export interface IntentDetectionOptions {
  useContext?: boolean;
  includeDomainKnowledge?: boolean;
  sessionId?: string;
  detailLevel?: 'basic' | 'detailed';
}

@Injectable()
export class IntentService {
  private readonly logger = new Logger(IntentService.name);
  
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly chromaService: ChromaService,
    private readonly designContextAnalyzer: DesignContextAnalyzerService,
    private readonly contextAwareQueryService: ContextAwareQueryService
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
      const systemPrompt = this.buildSystemPrompt(options.detailLevel || 'basic');
      intentPrompt.push({ role: 'system', content: systemPrompt });
      
      // Add relevant design domain knowledge from ChromaDB if requested
      if (options.includeDomainKnowledge !== false) {
        await this.appendDomainKnowledge(intentPrompt, message);
      }
      
      // Add design context if requested and available
      if (options.useContext !== false) {
        await this.appendDesignContext(intentPrompt);
      }
      
      // Add conversation history for context (but limit it to save tokens)
      const contextWindow = conversationHistory.slice(-5);
      intentPrompt.push(...contextWindow);
      
      // Add the current message
      intentPrompt.push({
        role: 'user',
        content: `Analyseer de volgende gebruikersinvoer en bepaal de intentie: "${message}"`,
      });
      
      // Make API call to Ollama
      const response = await this.ollamaService.chatCompletion({
        model: 'llama3.2:11b-q4_K_M', // Intent router model
        messages: intentPrompt,
        temperature: 0.2, // Lower temperature for more predictable/factual responses
      });
      
      // Extract the intent JSON from the response
      const content = response.choices[0].message.content;
      
      try {
        // Try to find and parse the JSON object
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const intentJson = JSON.parse(jsonMatch[0]);
          this.logger.debug(`Intent detected: ${JSON.stringify(intentJson)}`);
          
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
  private buildSystemPrompt(detailLevel: 'basic' | 'detailed'): string {
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

Bepaal ook welk platform van toepassing is:
- coreldraw: als het verzoek specifiek is voor CorelDRAW (vectorontwerp)
- blender: als het verzoek specifiek is voor Blender (3D-modellering)
- general: als het platformonafhankelijk is of geen van beide specifiek wordt genoemd`;

    // Add multi-step instructions recognition for detailed analysis
    if (detailLevel === 'detailed') {
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
  ]
}`;
    }

    return prompt;
  }
  
  /**
   * Append relevant design domain knowledge from ChromaDB
   */
  private async appendDomainKnowledge(prompt: ChatMessage[], message: string): Promise<void> {
    try {
      // Query API documentation for relevant concepts in both platforms
      const apiResults = await this.chromaService.queryApiDocumentation(message, undefined, 3);
      
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
        const memoryResults = await this.chromaService.queryConversationMemory(message, 'intent_memory', 2);
        
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
    } catch (error) {
      this.logger.error(`Error appending domain knowledge: ${error.message}`);
      // Continue without domain knowledge if there's an error
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
      const context = await this.designContextAnalyzer.getEnhancedContext();
      
      // Get contextual description
      const contextPrompt = await this.contextAwareQueryService.buildPromptWithContext(
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
      
      // Blender terms
      'mesh', 'vertex', 'face', 'edge', 'modifier', 'sculpting', 'uv-mapping',
      'texture', 'rigging', 'armature', 'keyframe', 'animation', 'rendering',
      
      // Common design terms
      'compositie', 'contrast', 'balans', 'symmetrie', 'hiërarchie', 'focal point',
      'negatieve ruimte', 'rgb', 'cmyk', 'kleurharmonie', 'complementair'
    ];
    
    // Find which terms appear in the text
    return designTerms.filter(term => text.toLowerCase().includes(term.toLowerCase()));
  }
} 