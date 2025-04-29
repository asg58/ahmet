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
    
    // Create or get session
    if (!this.sessions.has(sessionId)) {
      const existingMemory = this.chatMemoryService.getConversation(sessionId);
      
      if (existingMemory) {
        // Gebruik bestaande conversatie uit geheugen
        this.logger.debug(`Restoring session ${sessionId} from memory with ${existingMemory.messages.length} messages`);
        this.sessions.set(sessionId, {
          id: sessionId,
          messages: [...existingMemory.messages],
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
      // Detect intent using our enhanced intent service with context
      const intent = await this.intentService.detectIntent(
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
      
      // Update platform als de intent een specifiek platform aangeeft
      if (intent.platform !== 'general' && intent.platform !== session.platform) {
        this.logger.debug(`Switching platform from ${session.platform} to ${intent.platform}`);
        session.platform = intent.platform;
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
      
      // Create an error response
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Er is een fout opgetreden bij het verwerken van je bericht: ${error.message}`,
      };
      
      // Still add to history so we have a record
      session.messages.push(errorMessage);
      
      // Ook fouten opslaan in het geheugen
      this.chatMemoryService.addChatMessage(sessionId, errorMessage, {
        platform: session.platform,
        timestamp: new Date().toISOString(),
        error: error.message
      });
      
      return errorMessage;
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
    
    // Use the intent model for better summaries
    const response = await this.ollamaService.chatCompletion({
      model: 'llama3.2:11b-q4_K_M', // Use the intent model for summaries
      messages: summaryPrompt,
      temperature: 0.3,
    });
    
    return response.choices[0].message.content;
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
} 