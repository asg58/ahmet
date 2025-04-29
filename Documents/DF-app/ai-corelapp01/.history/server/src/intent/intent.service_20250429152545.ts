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
      const useFullModel = this.useFullIntentModel();
      
      const model = useFullModel ? 
        'mistral' : 'mistral';
      
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
  async analyzeMultiStepInstructions(
    message: string,
    conversationHistory: ChatMessage[] = []
  ): Promise<Intent> {
    this.logger.log(`Analyzing multi-step instructions in message: ${message}`);
    
    try {
      // Build a specialized prompt that focuses on breaking down complex instructions
      const systemPrompt = `You are an AI assistant specialized in analyzing design instructions.
Break down complex instructions into individual steps for execution in design software.
For each step, identify:
1. The specific action required
2. Any parameters or settings needed
3. The order of operations
4. Dependencies between steps

Output format:
{
  "type": "multi_step_instruction",
  "confidence": <number between 0-1>,
  "steps": [
    {
      "description": "<description of this step>",
      "action": "<specific action name>",
      "parameters": {
        "<param1>": "<value1>",
        "<param2>": "<value2>"
      }
    }
  ],
  "designTerms": ["<relevant design term1>", "<term2>"]
}`;
      
      // Get context from the design
      const context = await this.designContextAnalyzerService.getContextUpdate();
      
      // Create the messages array for the API call
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-5),
        { role: 'user', content: `Analyze these design instructions and break them into executable steps: "${message}"` },
        { role: 'user', content: `Current design context: ${JSON.stringify(context)}` }
      ];
      
      // Make the API call
      const response = await this.ollamaService.chat(messages);
      
      // Parse the JSON response
      const intent = this.parseJsonFromResponse(response.content);
      
      return intent;
    } catch (error) {
      this.logger.error(`Error analyzing multi-step instructions: ${error.message}`);
      return {
        type: 'error',
        confidence: 0.5,
        action: 'unknown',
        steps: [{ description: 'Error analyzing instructions', action: 'error' }]
      };
    }
  }
  
  /**
   * Process open-ended natural language with contextual understanding
   */
  async processOpenEndedLanguage(
    message: string,
    conversationHistory: ChatMessage[] = [],
    sessionId?: string
  ): Promise<Intent> {
    this.logger.log(`Processing open-ended language: ${message}`);
    
    try {
      // Get domain knowledge related to the message
      const relevantKnowledge = await this.chromaService.queryApiDocumentation(message, 3);
      
      // Get context from the design
      const context = await this.designContextAnalyzerService.getContextUpdate();
      
      // Build prompt for open-ended language processing
      const systemPrompt = `You are an AI assistant specialized in interpreting ambiguous or creative design instructions.
Your goal is to interpret the user's intent, even when their language is vague, metaphorical, or uses non-standard terminology.
Consider multiple possible interpretations when appropriate.

Output format:
{
  "type": "<interpreted intent type>",
  "confidence": <number between 0-1>,
  "action": "<primary action>",
  "entities": {
    "<entity name>": "<value>"
  },
  "contextualReferences": [
    {
      "reference": "<reference in user message>",
      "targetObject": "<likely target in design>",
      "confidence": <confidence score>
    }
  ],
  "alternatives": [
    {
      "type": "<alternative interpretation>",
      "confidence": <lower confidence score>,
      "action": "<alternative action>"
    }
  ]
}`;
      
      // Enhance with domain knowledge
      const knowledgePrompt = relevantKnowledge.length > 0 
        ? `\nDomain knowledge that may be relevant:\n${relevantKnowledge.map(k => k.document).join('\n')}`
        : '';
      
      // Create the messages array for the API call
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt + knowledgePrompt },
        ...conversationHistory.slice(-5),
        { role: 'user', content: `Interpret this design instruction, which may be vague or open-ended: "${message}"` },
        { role: 'user', content: `Current design context: ${JSON.stringify(context)}` }
      ];
      
      // Make the API call
      const response = await this.ollamaService.chat(messages);
      
      // Parse the JSON response
      const intent = this.parseJsonFromResponse(response.content);
      
      // Store the intent in memory if sessionId is provided
      if (sessionId) {
        if (!this.intentMemory.has(sessionId)) {
          this.intentMemory.set(sessionId, []);
        }
        this.intentMemory.get(sessionId).push(intent);
      }
      
      return intent;
    } catch (error) {
      this.logger.error(`Error processing open-ended language: ${error.message}`);
      return {
        type: 'error',
        confidence: 0.5,
        action: 'unknown'
      };
    }
  }
  
  /**
   * Get terminologie recommendations based on detected intent
   */
  async getTerminologyRecommendations(intent: Intent): Promise<string[]> {
    this.logger.log(`Getting terminology recommendations for intent type: ${intent.type}`);
    
    try {
      // Query ChromaDB for relevant design terminology
      const query = `${intent.type} ${intent.action || ''} ${intent.designTerms?.join(' ') || ''}`;
      const results = await this.chromaService.queryApiDocumentation(query, 5);
      
      // Extract terminology
      const terms = new Set<string>();
      
      // Add terms from the intent
      if (intent.designTerms) {
        intent.designTerms.forEach(term => terms.add(term));
      }
      
      // Extract terms from API documentation
      results.forEach(result => {
        const doc = result.document;
        // Simple regex to extract potential terms (capitalized words or words in quotes)
        const termRegex = /(?:"|')([^"']+)(?:"|')|([A-Z][a-z]+(?:[A-Z][a-z]+)*)/g;
        let match;
        while ((match = termRegex.exec(doc)) !== null) {
          if (match[1]) terms.add(match[1]);
          if (match[2]) terms.add(match[2]);
        }
      });
      
      return Array.from(terms);
    } catch (error) {
      this.logger.error(`Error getting terminology recommendations: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Get comprehensive design domain knowledge for a specific intent
   */
  async getDomainKnowledgeForIntent(intent: Intent): Promise<Array<{term: string; definition: string; relevance: number}>> {
    this.logger.log(`Getting domain knowledge for intent: ${intent.type}`);
    
    try {
      // Create a query based on intent properties
      const query = `${intent.type} ${intent.action || ''} ${intent.designTerms?.join(' ') || ''}`;
      
      // Query ChromaDB for relevant knowledge
      const results = await this.chromaService.queryApiDocumentation(query, 10);
      
      // Process results to extract terms and definitions
      const knowledge = results.map((result, index) => {
        // Extract term and definition
        const lines = result.document.split('\n');
        const term = lines[0].replace(/#+\s*/, '').trim();
        const definition = lines.slice(1).join('\n').trim();
        
        // Calculate relevance based on position (higher for earlier results)
        const relevance = 1 - (index * 0.1);
        
        return {
          term,
          definition,
          relevance
        };
      });
      
      return knowledge;
    } catch (error) {
      this.logger.error(`Error getting domain knowledge: ${error.message}`);
      return [];
    }
  }
  
  private parseJsonFromResponse(content: string): Intent {
    try {
      // Try to extract JSON from the response content
      const jsonMatch = content.match(/{[\s\S]*}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      // If no JSON is found, throw an error
      throw new Error('No JSON found in response');
    } catch (error) {
      this.logger.error(`Error parsing JSON from response: ${error.message}`);
      // Return a fallback intent
      return {
        type: 'unknown',
        confidence: 0.3,
        action: 'unknown'
      };
    }
  }
  
  /**
   * Extract contextual references from user message
   * This identifies references to objects in the design context
   */
  async extractContextualReferences(
    message: string,
    sessionId: string
  ): Promise<Intent> {
    this.logger.log(`Extracting contextual references from message: ${message}`);
    
    try {
      // Get current design context
      const context = await this.designContextAnalyzerService.getEnhancedContext();
      
      // Build specialized prompt for extracting contextual references
      const systemPrompt = `You are an AI specialized in identifying references to design elements in user messages.
Analyze the message and identify references that point to specific objects, areas, or properties in the current design.
For each reference, determine the likely target object and assign a confidence score.

Output format:
{
  "type": "contextual_references",
  "confidence": <overall confidence>,
  "contextualReferences": [
    {
      "reference": "<text from user message>",
      "targetObject": "<likely object id or description>",
      "confidence": <confidence score>
    },
    ...
  ]
}`;
      
      // Format design context for the prompt
      const contextInfo = `Current design context:
- Active objects: ${context.activeObjects?.map(obj => obj.type + ' (' + obj.id + ')').join(', ') || 'None'}
- Selection: ${context.selectedObjects?.map(obj => obj.type).join(', ') || 'None'}
- Recent operations: ${context.recentOperations?.join(', ') || 'None'}`;
      
      // Create the messages array
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${contextInfo}\n\nAnalyze this message for contextual references: "${message}"` }
      ];
      
      // Make the API call to Ollama
      const response = await this.ollamaService.chat(messages);
      
      // Parse the JSON response
      const intent = this.parseJsonFromResponse(response.content);
      
      // Store in conversation memory if needed
      if (sessionId) {
        await this.storeIntentInMemory(intent, message, sessionId);
      }
      
      return intent;
    } catch (error) {
      this.logger.error(`Error extracting contextual references: ${error.message}`);
      return {
        type: 'contextual_references',
        confidence: 0.3,
        contextualReferences: []
      };
    }
  }
  
  /**
   * Extract domain-specific concepts from user message
   * This identifies design terminology and concepts specific to a platform
   */
  async extractDomainConcepts(
    message: string,
    platform: string
  ): Promise<Intent> {
    this.logger.log(`Extracting domain concepts for platform ${platform} from message: ${message}`);
    
    try {
      // Get relevant API documentation for the platform
      const apiDocs = await this.chromaService.queryApiDocumentation(
        message,
        platform === 'general' ? undefined : platform,
        5
      );
      
      // Build specialized prompt for extracting domain concepts
      const systemPrompt = `You are an AI specialized in ${platform === 'coreldraw' ? 'vector design' : 
                                                           platform === 'blender' ? '3D modeling' : 
                                                           'design software'} terminology.
Analyze the message and identify domain-specific concepts, technical terms, and design principles.
For each concept, determine its relevance to the user's message.

Output format:
{
  "type": "domain_concepts",
  "platform": "${platform}",
  "confidence": <overall confidence>,
  "domainConcepts": [
    {
      "concept": "<concept name>",
      "relevance": <relevance score>
    },
    ...
  ]
}`;
      
      // Format API documentation for context
      const apiContext = apiDocs.length > 0
        ? `Relevant API documentation:\n${apiDocs.map(doc => doc.document.substring(0, 200) + '...').join('\n\n')}`
        : '';
      
      // Create the messages array
      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${apiContext}\n\nAnalyze this message for domain concepts: "${message}"` }
      ];
      
      // Make the API call to Ollama
      const response = await this.ollamaService.chat(messages);
      
      // Parse the JSON response
      const intent = this.parseJsonFromResponse(response.content);
      
      return intent;
    } catch (error) {
      this.logger.error(`Error extracting domain concepts: ${error.message}`);
      return {
        type: 'domain_concepts',
        platform: platform || 'general',
        confidence: 0.3,
        domainConcepts: []
      };
    }
  }
} 