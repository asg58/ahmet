import { Injectable, Logger } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { IntentService } from '../intent/intent.service';
import { SoftwareService } from '../software/software.service';
import { ContextAwareQueryBuilder } from '../chroma/query-builder.service';

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
      // For now, we'll use a simple approach where everything goes to Ollama
      // Later this will involve intent recognition and routing
      const response = await this.ollamaService.chatCompletion({
        model: 'llama3.2:11b-q4_K_M', // Intent router model
        messages: session.messages,
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
} 