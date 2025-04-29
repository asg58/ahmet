import { Injectable, Logger } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { IntentService } from '../intent/intent.service';
import { SoftwareService } from '../software/software.service';
import { ContextAwareQueryBuilder } from '../chroma/context-aware-query';

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
        currentContext
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
    designContext: any
  ): ChatMessage[] {
    // Start with original messages
    const enhancedMessages = [...messages];
    
    // Update or add system message with context
    const systemMessageIndex = enhancedMessages.findIndex(msg => msg.role === 'system');
    const systemMessage: ChatMessage = {
      role: 'system',
      content: this.buildSystemPrompt(apiDocs, conversationMemory, designContext)
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
  private buildSystemPrompt(apiDocs: any, conversationMemory: any, designContext: any): string {
    let prompt = 'Je bent een AI-assistent die CorelDRAW en Blender kan aansturen via natuurlijke taalcommando\'s. ';
    prompt += 'Wees behulpzaam, beleefd en begeleid de gebruiker bij het uitvoeren van ontwerptaken.\n\n';
    
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
} 