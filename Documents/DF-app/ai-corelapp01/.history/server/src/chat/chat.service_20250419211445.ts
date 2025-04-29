import { Injectable, Logger } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { IntentService, Intent, IntentDetectionOptions } from '../intent/intent.service';
import { SoftwareService } from '../software/software.service';
import { ContextAwareQueryBuilder } from '../chroma/context-aware-query';
import { TaskType } from '../task/task.service';
import { ChromaService } from '../chroma/chroma.service';

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  platform?: 'coreldraw' | 'blender' | null;
  lastIntent?: Intent;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private sessions: Map<string, ChatSession> = new Map();
  
  constructor(
    private readonly ollamaService: OllamaService,
    private readonly intentService: IntentService,
    private readonly softwareService: SoftwareService,
    private readonly queryBuilder: ContextAwareQueryBuilder,
    private readonly chromaService: ChromaService,
  ) {}
  
  async processMessage(sessionId: string, message: string): Promise<ChatMessage> {
    this.logger.debug(`Processing message for session ${sessionId}: ${message}`);
    
    // Create or get session
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        id: sessionId,
        messages: [],
        platform: null,
      });
    }
    
    const session = this.sessions.get(sessionId);
    
    // Add user message to history
    const userMessage: ChatMessage = { role: 'user', content: message };
    session.messages.push(userMessage);
    
    try {
      // First, detect user intent with context-aware intent detection
      const intent = await this.detectMessageIntent(sessionId, message);
      
      // Store the intent in the session
      session.lastIntent = intent;
      
      // If the intent is a software command with high confidence, route it to the software service
      if (this.shouldRouteToSoftwareService(intent)) {
        this.logger.debug(`Routing message to software service based on intent: ${intent.type} (${intent.platform})`);
        
        // Update session platform if needed
        if (intent.platform && (intent.platform === 'coreldraw' || intent.platform === 'blender')) {
          session.platform = intent.platform;
        }
        
        try {
          // Execute the action via software service
          const result = await this.executeSoftwareAction(intent);
          
          // Create an assistant message based on the result
          const assistantMessage: ChatMessage = { 
            role: 'assistant', 
            content: result.message || 'Opdracht uitgevoerd.'
          };
          
          // Add to session history
          session.messages.push(assistantMessage);
          
          return assistantMessage;
        } catch (softwareError) {
          this.logger.error(`Error executing software action: ${softwareError.message}`);
          
          // Fall back to Ollama for response
          this.logger.debug('Falling back to Ollama for response after software error');
        }
      }
      
      // Get current design context if available
      const currentContext = await this.getCurrentDesignContext(session.platform);
      
      // Query API documentation and conversation memory for relevant context
      const relevantDocs = await this.getRelevantApiDocs(message, session.platform, currentContext);
      const relevantMemory = await this.getRelevantConversationMemory(message, sessionId, currentContext);
      
      // Build prompt with enhanced context
      const enhancedMessages = this.enhanceMessagesWithContext(
        session.messages, 
        relevantDocs, 
        relevantMemory, 
        currentContext,
        intent
      );
      
      // For now, we'll use a simple approach where everything goes to Ollama
      const response = await this.ollamaService.chatCompletion({
        model: 'llama3:8b', // Use a better model for actual responses
        messages: enhancedMessages,
        temperature: 0.7,
      });
      
      // Extract assistant message from response
      const assistantMessage: ChatMessage = { 
        role: 'assistant', 
        content: response.choices[0].message.content 
      };
      
      // Add to session history
      session.messages.push(assistantMessage);
      
      return assistantMessage;
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
      
      // Create an error response
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Er is een fout opgetreden bij het verwerken van je bericht: ${error.message}`,
      };
      
      // Still add to history so we have a record
      session.messages.push(errorMessage);
      
      return errorMessage;
    }
  }
  
  /**
   * Detect intent from the user message with context awareness
   */
  private async detectMessageIntent(sessionId: string, message: string): Promise<Intent> {
    const session = this.sessions.get(sessionId);
    
    // Get conversation history
    const history = session ? session.messages : [];
    
    // Prepare intent detection options
    const options: IntentDetectionOptions = {
      useContext: true,
      includeDomainKnowledge: true,
      sessionId: sessionId,
      detailLevel: 'detailed'
    };
    
    // First try to detect if this is a multi-step instruction
    if (message.length > 30 && message.includes(' en ')) {
      try {
        const multiStepIntent = await this.intentService.analyzeMultiStepInstructions(
          message,
          history
        );
        
        if (multiStepIntent && multiStepIntent.steps && multiStepIntent.steps.length > 1) {
          this.logger.debug(`Detected multi-step intent with ${multiStepIntent.steps.length} steps`);
          return multiStepIntent;
        }
      } catch (error) {
        this.logger.warn(`Failed to analyze as multi-step: ${error.message}`);
        // Fall back to regular intent detection
      }
    }
    
    // Regular intent detection
    return this.intentService.detectIntent(message, history, options);
  }
  
  /**
   * Determine if the intent should be routed to the software service
   */
  private shouldRouteToSoftwareService(intent: Intent): boolean {
    // Non-software intents
    const generalIntents = ['QUERY', 'HELP', 'GENERAL'];
    
    // Check if it's a specific software intent with high confidence
    return (
      !generalIntents.includes(intent.type) && 
      intent.confidence > 0.7 &&
      (intent.platform === 'coreldraw' || intent.platform === 'blender')
    );
  }
  
  /**
   * Execute a software action based on detected intent
   */
  private async executeSoftwareAction(intent: Intent): Promise<{ success: boolean; message?: string }> {
    // Ensure we have a valid platform
    if (intent.platform !== 'coreldraw' && intent.platform !== 'blender') {
      throw new Error('Invalid platform for software action');
    }
    
    // Handle multi-step intents
    if (intent.steps && intent.steps.length > 0) {
      this.logger.debug(`Executing multi-step action with ${intent.steps.length} steps`);
      
      // Execute each step in sequence
      const results = [];
      for (const step of intent.steps) {
        const result = await this.softwareService.executeCommand({
          platform: intent.platform,
          command: step.action,
          parameters: step.params || {},
        });
        results.push(result);
      }
      
      // Combine the results
      return {
        success: results.every(r => r.success),
        message: `Multi-stap opdracht uitgevoerd. ${results.length} stappen voltooid.`
      };
    }
    
    // Single action execution
    return this.softwareService.executeCommand({
      platform: intent.platform,
      command: intent.action,
      parameters: intent.entities || {},
    });
  }
  
  /**
   * Get the current design context based on the active platform
   */
  private async getCurrentDesignContext(platform: 'coreldraw' | 'blender' | null) {
    if (!platform) return null;
    
    try {
      return await this.softwareService.getDesignContext(platform);
    } catch (error) {
      this.logger.error(`Failed to get design context: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get relevant API documentation based on the user query and current context
   */
  private async getRelevantApiDocs(query: string, platform: 'coreldraw' | 'blender' | null, context: any) {
    try {
      return await this.queryBuilder.queryApiDocs(query, context, platform as any, 3);
    } catch (error) {
      this.logger.error(`Failed to get relevant API docs: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get relevant conversation memory based on the user query and current context
   */
  private async getRelevantConversationMemory(query: string, sessionId: string, context: any) {
    try {
      return await this.queryBuilder.queryConversationMemory(query, sessionId, context, 5);
    } catch (error) {
      this.logger.error(`Failed to get relevant conversation memory: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Enhance the chat history with relevant API docs, memory, context and intent analysis
   */
  private enhanceMessagesWithContext(
    messages: ChatMessage[],
    apiDocs: any,
    conversationMemory: any,
    designContext: any,
    intent?: Intent
  ): ChatMessage[] {
    // Start with original messages
    const enhancedMessages = [...messages];
    
    // Update or add system message with context
    const systemMessageIndex = enhancedMessages.findIndex(msg => msg.role === 'system');
    const systemMessage: ChatMessage = {
      role: 'system',
      content: this.buildSystemPrompt(apiDocs, conversationMemory, designContext, intent)
    };
    
    if (systemMessageIndex >= 0) {
      enhancedMessages[systemMessageIndex] = systemMessage;
    } else {
      enhancedMessages.unshift(systemMessage);
    }
    
    return enhancedMessages;
  }
  
  /**
   * Build a system prompt with context information and intent analysis
   */
  private buildSystemPrompt(
    apiDocs: any, 
    conversationMemory: any, 
    designContext: any,
    intent?: Intent
  ): string {
    let prompt = 'Je bent een AI-assistent die CorelDRAW en Blender kan aansturen via natuurlijke taalcommando\'s. ';
    prompt += 'Wees behulpzaam, beleefd en begeleid de gebruiker bij het uitvoeren van ontwerptaken.\n\n';
    
    // Add intent information if available
    if (intent) {
      prompt += `Gedetecteerde intentie: ${intent.type} (${intent.platform}), met ${Math.round(intent.confidence * 100)}% betrouwbaarheid.\n`;
      
      // Add design terminology if available
      if (intent.designTerms && intent.designTerms.length > 0) {
        prompt += `Gedetecteerde ontwerptermen: ${intent.designTerms.join(', ')}\n`;
      }
      
      prompt += '\n';
    }
    
    // Add design context if available
    if (designContext) {
      prompt += 'Huidige ontwerp context:\n';
      if (typeof designContext.contextToDescription === 'function') {
        prompt += designContext.contextToDescription(designContext);
      } else {
        prompt += `Document: ${designContext.documentName} (${designContext.platform})\n`;
        if (designContext.selectedElements && designContext.selectedElements.length > 0) {
          prompt += `Geselecteerde elementen: ${designContext.selectedElements.length}\n`;
        }
      }
      prompt += '\n';
    }
    
    // Add relevant API documentation if available
    if (apiDocs && apiDocs.documents && apiDocs.documents.length > 0) {
      prompt += 'Relevante API documentatie:\n';
      for (let i = 0; i < apiDocs.documents[0].length; i++) {
        const doc = apiDocs.documents[0][i];
        const metadata = apiDocs.metadatas[0][i];
        prompt += `[${metadata.title || 'Documentatie'}]: ${doc.substring(0, 200)}...\n\n`;
      }
    }
    
    // Add conversation memory if available
    if (conversationMemory && conversationMemory.documents && conversationMemory.documents.length > 0) {
      prompt += 'Relevante eerdere conversatie:\n';
      for (let i = 0; i < Math.min(conversationMemory.documents[0].length, 3); i++) {
        prompt += `- ${conversationMemory.documents[0][i].substring(0, 100)}...\n`;
      }
      prompt += '\n';
    }
    
    return prompt;
  }
  
  getSession(sessionId: string): ChatSession | undefined {
    return this.sessions.get(sessionId);
  }
  
  createSession(sessionId: string): ChatSession {
    const newSession: ChatSession = {
      id: sessionId,
      messages: [
        { 
          role: 'system', 
          content: 'Je bent een AI-assistent die CorelDRAW en Blender kan aansturen via natuurlijke taalcommando\'s. Wees behulpzaam, beleefd en begeleid de gebruiker bij het uitvoeren van ontwerptaken.'
        }
      ],
      platform: null,
    };
    
    this.sessions.set(sessionId, newSession);
    return newSession;
  }
  
  clearSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
  
  /**
   * Set the platform for a session
   */
  setPlatform(sessionId: string, platform: 'coreldraw' | 'blender' | null): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.platform = platform;
      return true;
    }
    return false;
  }
  
  /**
   * Generate a summary of the conversation history
   * @param sessionId The session ID
   * @param maxLength Optional maximum length of the summary
   * @returns A string containing the conversation summary
   */
  async generateConversationSummary(sessionId: string, maxLength?: number): Promise<string> {
    this.logger.debug(`Generating conversation summary for session ${sessionId}`);
    
    // Get the session
    if (!this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} not found`);
    }
    
    const session = this.sessions.get(sessionId);
    
    try {
      // Create a prompt for the summary
      const summaryPrompt: ChatMessage[] = [
        {
          role: 'system',
          content: `Genereer een beknopte samenvatting van de volgende conversatie. ${
            maxLength ? `De samenvatting mag niet langer zijn dan ${maxLength} tekens.` : ''
          }`
        },
        ...session.messages.filter(msg => msg.role !== 'system')
      ];
      
      // Generate a summary
      const response = await this.ollamaService.chatCompletion({
        model: 'llama3:8b',
        messages: summaryPrompt,
        temperature: 0.3, // Lower temperature for factual summary
      });
      
      return response.choices[0].message.content;
    } catch (error) {
      this.logger.error(`Error generating conversation summary: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get intent information for the last message
   */
  async getLastIntent(sessionId: string): Promise<Intent | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    return session.lastIntent;
  }
} 