import { Injectable, Logger } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { IntentService } from '../intent/intent.service';
import { SoftwareService } from '../software/software.service';
import { ContextAwareQueryBuilder } from '../chroma/context-aware-query';
import { TaskType } from '../task/task.service';
import { ChromaService } from '../chroma/chroma.service';
import { ChatMemoryService } from './chat-memory.service';

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  platform?: 'coreldraw' | 'blender' | null;
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
    private readonly chatMemoryService: ChatMemoryService,
  ) {}
  
  async processMessage(sessionId: string, message: string): Promise<ChatMessage> {
    this.logger.debug(`Processing message for session ${sessionId}: ${message}`);
    
    if (!sessionId) {
      const errorMsg = 'Invalid session ID provided';
      this.logger.error(errorMsg);
      return { role: 'assistant', content: errorMsg };
    }
    
    if (!message || typeof message !== 'string') {
      const errorMsg = 'Invalid message content provided';
      this.logger.error(errorMsg);
      return { role: 'assistant', content: errorMsg };
    }
    
    try {
      // Create or get session
      if (!this.sessions.has(sessionId)) {
        const existingMemory = this.chatMemoryService.getConversation(sessionId);
        
        if (existingMemory) {
          // Gebruik bestaande conversatie uit geheugen
          this.logger.debug(`Restoring session ${sessionId} from memory with ${existingMemory.messages.length} messages`);
          
          // Validate the restored messages structure
          const validatedMessages = existingMemory.messages.filter(msg => 
            msg && typeof msg === 'object' && 
            (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') &&
            typeof msg.content === 'string'
          );
          
          this.sessions.set(sessionId, {
            id: sessionId,
            messages: [...validatedMessages],
            platform: existingMemory.metadata?.platform || null,
          });
        } else {
          // Maak een nieuwe sessie
          this.sessions.set(sessionId, {
            id: sessionId,
            messages: [],
            platform: null,
          });
        }
      }
      
      const session = this.sessions.get(sessionId);
      
      // Add user message to history
      const userMessage: ChatMessage = { role: 'user', content: message };
      session.messages.push(userMessage);
      
      // Update ChatMemoryService with new message
      this.chatMemoryService.addChatMessage(sessionId, userMessage, {
        platform: session.platform,
        timestamp: new Date().toISOString()
      });
      
      try {
        // Controleer eerst of Ollama service beschikbaar is
        const ollamaStatus = await this.ollamaService.getStatus();
        
        if (!ollamaStatus.initialized || ollamaStatus.connectionError) {
          throw new Error(
            `De taalmodel service (Ollama) is momenteel niet beschikbaar. ` +
            `Zorg ervoor dat de Ollama service draait op ${ollamaStatus.baseUrl}. ` +
            `Technische details: ${ollamaStatus.status}`
          );
        }
        
        // Detect intent using our enhanced intent service with context
        let intent;
        try {
          intent = await this.intentService.detectIntent(
            message, 
            session.messages.slice(-5), // Gebruik laatste 5 berichten als context
            {
              sessionId,
              useContext: true,
              includeDomainKnowledge: true,
              detailLevel: 'detailed'
            }
          );
          
          this.logger.debug(`Detected intent: ${intent.type} (${intent.platform}) - ${intent.action}`);
        } catch (intentError) {
          this.logger.warn(`Intent detection failed: ${intentError.message}. Proceeding with default intent.`);
          intent = { 
            type: 'general', 
            platform: session.platform || 'general',
            action: 'chat',
            confidence: 0.5
          };
        }
        
        // Update platform als de intent een specifiek platform aangeeft
        if (intent.platform !== 'general' && intent.platform !== session.platform) {
          this.logger.debug(`Switching platform from ${session.platform} to ${intent.platform}`);
          session.platform = intent.platform;
        }
        
        // Get current design context if available
        let currentContext = null;
        try {
          currentContext = await this.getCurrentDesignContext(session.platform);
        } catch (contextError) {
          this.logger.warn(`Failed to get design context: ${contextError.message}`);
        }
        
        // Query API documentation and conversation memory for relevant context
        let relevantDocs = [];
        let relevantMemory = [];
        
        try {
          relevantDocs = await this.getRelevantApiDocs(message, session.platform, currentContext);
        } catch (docsError) {
          this.logger.warn(`Failed to retrieve API docs: ${docsError.message}`);
        }
        
        try {
          relevantMemory = await this.getRelevantConversationMemory(message, sessionId, currentContext);
        } catch (memoryError) {
          this.logger.warn(`Failed to retrieve conversation memory: ${memoryError.message}`);
        }
        
        // Build prompt with enhanced context
        const enhancedMessages = this.enhanceMessagesWithContext(
          session.messages, 
          relevantDocs, 
          relevantMemory, 
          currentContext,
          intent
        );
        
        // Get a response using OllamaService
        const response = await this.ollamaService.chatCompletion({
          messages: enhancedMessages,
          model: 'mistral', // Use a better model for actual responses
          temperature: 0.7,
          presence_penalty: 0.6
        });
        
        if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
          throw new Error('Received invalid response from language model');
        }
        
        // Extract assistant message from response
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: response.choices[0].message.content 
        };
        
        // Add to session history
        session.messages.push(assistantMessage);
        
        // Update ChatMemoryService with AI response
        this.chatMemoryService.addChatMessage(sessionId, assistantMessage, {
          platform: session.platform,
          timestamp: new Date().toISOString(),
          intent: intent.type,
          action: intent.action
        });
        
        return assistantMessage;
      } catch (error) {
        this.logger.error(`Error processing message: ${error.message}`);
        
        // Categoriseer en maak betere foutmeldingen
        let errorContent = "";
        
        if (error.message.includes('Ollama') || error.message.includes('taalmodel')) {
          errorContent = 
            "De AI taalmodelservice (Ollama) is momenteel niet beschikbaar. " +
            "Controleer of Ollama draait op je computer. " +
            "Je kunt Ollama starten door het commando 'ollama serve' uit te voeren in een terminal. " +
            "\n\nTechnische details: " + error.message;
        } else if (error.code === 'ECONNREFUSED' || error.message.includes('connection')) {
          errorContent = 
            "Er kon geen verbinding worden gemaakt met een externe service. " +
            "Controleer je internetverbinding en of alle benodigde services draaien. " +
            "\n\nTechnische details: " + error.message;
        } else if (error.message.includes('platform') || error.message.includes('software')) {
          errorContent = 
            "Er is een probleem met de software-integratie (CorelDRAW of Blender). " +
            "Controleer of de juiste software is geïnstalleerd en actief is. " +
            "\n\nTechnische details: " + error.message;
        } else if (error.message.includes('timeout') || error.message.includes('timed out')) {
          errorContent = 
            "Een verzoek aan een externe service heeft te lang geduurd. " +
            "Dit kan worden veroorzaakt door netwerkproblemen of een overbelaste server. " +
            "Probeer het later opnieuw. " +
            "\n\nTechnische details: " + error.message;
        } else if (error.message.includes('memory') || error.message.includes('geheugen')) {
          errorContent = 
            "Er is een probleem opgetreden bij het ophalen of opslaan van de gespreksgeschiedenis. " +
            "Je gesprek wordt mogelijk niet volledig bewaard. " +
            "\n\nTechnische details: " + error.message;
        } else {
          errorContent = `Er is een fout opgetreden bij het verwerken van je bericht: ${error.message}`;
        }
        
        // Create an error response
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: errorContent,
        };
        
        // Still add to history so we have a record
        session.messages.push(errorMessage);
        
        // Ook fouten opslaan in het geheugen
        try {
          this.chatMemoryService.addChatMessage(sessionId, errorMessage, {
            platform: session.platform,
            timestamp: new Date().toISOString(),
            error: error.message
          });
        } catch (memoryError) {
          this.logger.error(`Failed to save error to chat memory: ${memoryError.message}`);
        }
        
        return errorMessage;
      }
    } catch (outerError) {
      // Handle unexpected errors that might occur before session is created
      this.logger.error(`Critical error in processMessage: ${outerError.message}`);
      return {
        role: 'assistant',
        content: `Er is een kritieke systeemfout opgetreden. Probeer de applicatie opnieuw op te starten. Details: ${outerError.message}`
      };
    }
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
   * Enhance the chat history with relevant API docs, memory, and context
   */
  private enhanceMessagesWithContext(
    messages: ChatMessage[],
    apiDocs: any,
    conversationMemory: any,
    designContext: any,
    intent?: any
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
   * Build a system prompt with context information
   */
  private buildSystemPrompt(
    apiDocs: any, 
    conversationMemory: any, 
    designContext: any,
    intent?: any
  ): string {
    let prompt = 'Je bent een AI-assistent die CorelDRAW en Blender kan aansturen via natuurlijke taalcommando\'s. ';
    prompt += 'Wees behulpzaam, beleefd en begeleid de gebruiker bij het uitvoeren van ontwerptaken.\n\n';
    
    // Voeg intent informatie toe als die beschikbaar is
    if (intent) {
      prompt += `Gedetecteerde intentie: ${intent.type} voor platform ${intent.platform}\n`;
      prompt += `Actie: ${intent.action}\n`;
      
      // Voeg multi-step instructies toe indien beschikbaar
      if (intent.steps && intent.steps.length > 0) {
        prompt += `Herkende stappen:\n`;
        intent.steps.forEach((step, index) => {
          prompt += `${index + 1}. ${step.description}\n`;
        });
        prompt += '\n';
      }
      
      // Voeg ontwerptermen toe indien beschikbaar
      if (intent.designTerms && intent.designTerms.length > 0) {
        prompt += `Relevante ontwerptermen: ${intent.designTerms.join(', ')}\n\n`;
      }
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
    const existingMemory = this.chatMemoryService.getConversation(sessionId);
    
    if (existingMemory) {
      // Gebruik bestaande conversatie uit geheugen
      this.logger.debug(`Restoring session ${sessionId} from memory`);
      const session = {
        id: sessionId,
        messages: [...existingMemory.messages],
        platform: existingMemory.metadata?.platform || null,
      };
      this.sessions.set(sessionId, session);
      return session;
    }
    
    // Maak een nieuwe sessie
    const systemMessage: ChatMessage = { 
      role: 'system', 
      content: 'Je bent een AI-assistent die CorelDRAW en Blender kan aansturen via natuurlijke taalcommando\'s. Wees behulpzaam, beleefd en begeleid de gebruiker bij het uitvoeren van ontwerptaken.'
    };
    
    const newSession: ChatSession = {
      id: sessionId,
      messages: [systemMessage],
      platform: null,
    };
    
    this.sessions.set(sessionId, newSession);
    
    // Ook toevoegen aan het chatgeheugen
    this.chatMemoryService.addConversation(sessionId, [systemMessage], {
      platform: null,
      createdAt: new Date().toISOString()
    });
    
    return newSession;
  }
  
  clearSession(sessionId: string): boolean {
    const success = this.sessions.delete(sessionId);
    
    // Verwijder niet uit chatgeheugen - we willen het permanent bewaren
    // Voor echt verwijderen zou je dit kunnen doen:
    // this.chatMemoryService.removeConversation(sessionId);
    
    return success;
  }
  
  /**
   * Set the platform for a session
   */
  setPlatform(sessionId: string, platform: 'coreldraw' | 'blender' | null): boolean {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.platform = platform;
      
      // Update metadata in chat memory
      const existingMemory = this.chatMemoryService.getConversation(sessionId);
      if (existingMemory) {
        this.chatMemoryService.addConversation(
          sessionId, 
          existingMemory.messages, 
          { ...existingMemory.metadata, platform }
        );
      }
      
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
      // Probeer te laden uit geheugen
      const memoryEntry = this.chatMemoryService.getConversation(sessionId);
      if (memoryEntry) {
        this.createSession(sessionId);
      } else {
        throw new Error(`Session ${sessionId} not found`);
      }
    }
    
    const session = this.sessions.get(sessionId);
    
    // Create a prompt to summarize the conversation
    const summaryPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `Je taak is om een bondige samenvatting te maken van het volgende gesprek tussen een gebruiker en een AI-assistent. 
        Vat de belangrijkste onderwerpen, vragen en antwoorden samen. 
        ${maxLength ? `Beperk je samenvatting tot ongeveer ${maxLength} tekens.` : ''}`,
      },
    ];
    
    // Add the conversation to summarize (skip the system message)
    const conversationToSummarize = session.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => `${msg.role === 'user' ? 'Gebruiker' : 'AI'}: ${msg.content}`)
      .join('\n\n');
    
    summaryPrompt.push({
      role: 'user',
      content: `Maak een samenvatting van dit gesprek:\n\n${conversationToSummarize}`,
    });
    
    // Generate summary using LLM
    const result = await this.ollamaService.chatCompletion({
      messages: summaryPrompt,
      model: 'mistral', // Use the intent model for summaries
      temperature: 0.2
    });
    
    return result.choices[0].message.content;
  }
  
  /**
   * Haal gerelateerde conversaties op uit het geheugen op basis van sleutelwoorden
   */
  findRelatedConversations(keywords: string[], limit: number = 3): any[] {
    return this.chatMemoryService.findRelevantConversations(keywords, limit);
  }
  
  /**
   * Force updating the chat memory to disk
   */
  async forceMemoryUpdate(): Promise<void> {
    // Ensure all active sessions are stored in memory
    for (const [sessionId, session] of this.sessions.entries()) {
      this.chatMemoryService.addConversation(sessionId, session.messages, {
        platform: session.platform,
        updatedAt: new Date().toISOString()
      });
    }
    
    // Force save to disk
    return this.chatMemoryService.forceSave();
  }
  
  /**
   * Add a message to the chat history without processing it
   */
  async addMessageToHistory(sessionId: string, message: ChatMessage, metadata?: Record<string, any>): Promise<void> {
    // Create or get session
    if (!this.sessions.has(sessionId)) {
      this.createSession(sessionId);
    }
    
    const session = this.sessions.get(sessionId);
    
    // Add message to history
    session.messages.push(message);
    
    // Update ChatMemoryService with new message
    this.chatMemoryService.addChatMessage(sessionId, message, {
      platform: session.platform,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }
} 