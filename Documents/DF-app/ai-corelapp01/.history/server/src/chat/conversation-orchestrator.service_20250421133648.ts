import { Injectable, Logger } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { IntentService } from '../intent/intent.service';
import { SoftwareService } from '../software/software.service';
import { ContextAwareQueryBuilder } from '../chroma/context-aware-query';
import { ChromaService } from '../chroma/chroma.service';
import { ChatMemoryService } from './chat-memory.service';
import { ChatService } from './chat.service';
import { PlatformSwitchingService } from '../software/platform-switching.service';
import { DesignContextAnalyzerService } from '../software/context/design-context-analyzer.service';

export interface ConversationState {
  id: string;
  status: 'active' | 'waiting_clarification' | 'executing_command' | 'idle';
  currentTask?: {
    type: string;
    description: string;
    startTime: Date;
    progress?: number;
  };
  pendingClarification?: {
    originalMessage: string;
    ambiguities: string[];
    suggestedOptions: string[];
  };
  contextSnapshot?: any;
}

@Injectable()
export class ConversationOrchestratorService {
  private readonly logger = new Logger(ConversationOrchestratorService.name);
  private conversationStates: Map<string, ConversationState> = new Map();
  
  constructor(
    private readonly chatService: ChatService,
    private readonly ollamaService: OllamaService,
    private readonly intentService: IntentService, 
    private readonly softwareService: SoftwareService,
    private readonly queryBuilder: ContextAwareQueryBuilder,
    private readonly chromaService: ChromaService,
    private readonly chatMemoryService: ChatMemoryService,
    private readonly platformSwitchingService: PlatformSwitchingService,
    private readonly designContextAnalyzer: DesignContextAnalyzerService,
  ) {}
  
  /**
   * Process a user message and orchestrate the response strategy
   */
  async processUserMessage(sessionId: string, message: string): Promise<ChatMessage> {
    this.logger.debug(`Orchestrating response for session ${sessionId}: ${message}`);
    
    // Ensure we have a state for this conversation
    if (!this.conversationStates.has(sessionId)) {
      this.initializeConversationState(sessionId);
    }
    
    const state = this.conversationStates.get(sessionId);
    
    // If we're waiting for clarification, check if this is a response to that
    if (state.status === 'waiting_clarification' && state.pendingClarification) {
      return this.handleClarificationResponse(sessionId, message);
    }
    
    try {
      // Capture design context before processing to maintain continuity
      await this.captureContextSnapshot(sessionId);
      
      // Step 1: Detect intent with context
      const intent = await this.detectIntentWithContext(sessionId, message);
      
      // Step 2: Check for ambiguities that need clarification
      const ambiguities = await this.checkForAmbiguities(message, intent);
      
      if (ambiguities.length > 0) {
        // Need clarification before proceeding
        return this.requestClarification(sessionId, message, ambiguities);
      }
      
      // Step 3: Update conversation state
      this.updateConversationState(sessionId, 'active', {
        type: intent.type,
        description: intent.action,
        startTime: new Date(),
      });
      
      // Step 4: Handle platform switching if needed
      if (intent.platform && intent.platform !== 'general') {
        await this.ensureCorrectPlatform(sessionId, intent.platform);
      }
      
      // Step 5: Process the message through appropriate service
      let response: ChatMessage;
      
      if (intent.type === 'command' || intent.type === 'design_operation') {
        // Software command execution
        this.updateConversationState(sessionId, 'executing_command');
        response = await this.executeDesignCommand(sessionId, message, intent);
      } else if (intent.type === 'question') {
        // Knowledge query
        response = await this.answerQuestion(sessionId, message, intent);
      } else {
        // General conversation or fallback
        response = await this.chatService.processMessage(sessionId, message);
      }
      
      // Step 6: Update state to idle after processing
      this.updateConversationState(sessionId, 'idle');
      
      // Step 7: Store context changes if applicable
      await this.storeContextChanges(sessionId);
      
      return response;
    } catch (error) {
      this.logger.error(`Error in conversation orchestration: ${error.message}`);
      this.updateConversationState(sessionId, 'idle');
      
      return {
        role: 'assistant',
        content: `Er is een fout opgetreden tijdens de verwerking van je bericht: ${error.message}`,
      };
    }
  }
  
  /**
   * Initialize a new conversation state
   */
  private initializeConversationState(sessionId: string): void {
    this.conversationStates.set(sessionId, {
      id: sessionId,
      status: 'idle',
    });
  }
  
  /**
   * Update the state of a conversation
   */
  private updateConversationState(
    sessionId: string,
    status: 'active' | 'waiting_clarification' | 'executing_command' | 'idle',
    currentTask?: any
  ): void {
    const state = this.conversationStates.get(sessionId);
    
    if (state) {
      state.status = status;
      
      if (currentTask) {
        state.currentTask = currentTask;
      } else if (status === 'idle') {
        state.currentTask = undefined;
      }
      
      this.conversationStates.set(sessionId, state);
    }
  }
  
  /**
   * Capture the current design context as a snapshot
   */
  private async captureContextSnapshot(sessionId: string): Promise<void> {
    try {
      const state = this.conversationStates.get(sessionId);
      if (state) {
        // Get current platform
        const platform = await this.platformSwitchingService.getCurrentPlatform();
        
        // Only capture if we have a valid platform
        if (platform === 'coreldraw' || platform === 'blender') {
          const context = await this.designContextAnalyzer.captureContext(platform);
          state.contextSnapshot = context;
          this.conversationStates.set(sessionId, state);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to capture context snapshot: ${error.message}`);
      // Non-critical error, continue without snapshot
    }
  }
  
  /**
   * Detect user intent with enhanced context awareness
   */
  private async detectIntentWithContext(sessionId: string, message: string) {
    // Get recent message history
    const session = this.chatService.getSession(sessionId);
    const recentMessages = session ? session.messages.slice(-5) : [];
    
    // Get intent with context
    return this.intentService.detectIntent(message, recentMessages, {
      sessionId,
      useContext: true,
      includeDomainKnowledge: true,
      detailLevel: 'detailed'
    });
  }
  
  /**
   * Check if the message or intent has ambiguities that need clarification
   */
  private async checkForAmbiguities(message: string, intent: any): Promise<string[]> {
    // Skip ambiguity check for very clear intents
    if (intent.confidence && intent.confidence > 0.85) {
      return [];
    }
    
    try {
      // Use the intent model to detect ambiguities
      const response = await this.ollamaService.chatCompletion({
        model: 'llama3',  // Intent model
        messages: [
          {
            role: 'system',
            content: `Identify potential ambiguities in the user's request. If the request is clear and unambiguous, return an empty array []. 
            If there are ambiguities that need clarification, identify each specific ambiguity as a string in a JSON array.
            Examples of ambiguities:
            - Vague terms that could have multiple interpretations
            - Missing parameters needed for a command
            - Unclear references to objects or elements
            - Multiple possible interpretations of the request
            Return ONLY a valid JSON array of strings, nothing else.`
          },
          {
            role: 'user',
            content: `Intent type: ${intent.type}
            Intent action: ${intent.action}
            User request: "${message}"
            
            Identify any ambiguities that need clarification before proceeding.`
          }
        ],
        temperature: 0.2,
      });
      
      // Parse the response as JSON array
      try {
        const content = response.choices[0].message.content;
        // Extract array if wrapped in code blocks or extract JSON part
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/(\[.*\])/s);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        
        const ambiguities = JSON.parse(jsonStr);
        return Array.isArray(ambiguities) ? ambiguities : [];
      } catch (jsonError) {
        this.logger.warn(`Failed to parse ambiguities JSON: ${jsonError.message}`);
        return [];
      }
    } catch (error) {
      this.logger.warn(`Error checking for ambiguities: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Request clarification from the user for ambiguities
   */
  private async requestClarification(sessionId: string, originalMessage: string, ambiguities: string[]): Promise<ChatMessage> {
    // Generate suggested options to resolve ambiguities
    const suggestedOptions = await this.generateClarificationOptions(originalMessage, ambiguities);
    
    // Update conversation state
    const state = this.conversationStates.get(sessionId);
    state.status = 'waiting_clarification';
    state.pendingClarification = {
      originalMessage,
      ambiguities,
      suggestedOptions
    };
    this.conversationStates.set(sessionId, state);
    
    // Create a clarification message
    let clarificationContent = `Ik heb wat meer informatie nodig voordat ik je kan helpen:`;
    
    for (let i = 0; i < ambiguities.length; i++) {
      clarificationContent += `\n\n${i+1}. ${ambiguities[i]}`;
    }
    
    if (suggestedOptions.length > 0) {
      clarificationContent += `\n\nJe zou bijvoorbeeld kunnen verduidelijken door:`;
      for (let i = 0; i < suggestedOptions.length; i++) {
        clarificationContent += `\n- ${suggestedOptions[i]}`;
      }
    }
    
    // Store in chat history
    const clarificationMessage: ChatMessage = {
      role: 'assistant',
      content: clarificationContent
    };
    
    await this.chatService.addMessageToHistory(sessionId, clarificationMessage);
    return clarificationMessage;
  }
  
  /**
   * Generate options to help resolve ambiguities
   */
  private async generateClarificationOptions(message: string, ambiguities: string[]): Promise<string[]> {
    try {
      const response = await this.ollamaService.chatCompletion({
        model: 'llama3',
        messages: [
          {
            role: 'system',
            content: `Generate 2-4 specific clarification options that would resolve the identified ambiguities in the user's request.
            Each option should be a specific example of what the user could say to clarify their request.
            Return ONLY a valid JSON array of strings containing example clarifications, nothing else.`
          },
          {
            role: 'user',
            content: `Original request: "${message}"
            
            Ambiguities to resolve:
            ${ambiguities.map(a => '- ' + a).join('\n')}
            
            Generate specific clarification examples the user could provide:`
          }
        ],
        temperature: 0.3,
      });
      
      // Parse the response as JSON array
      try {
        const content = response.choices[0].message.content;
        // Extract array if wrapped in code blocks or extract JSON part
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/(\[.*\])/s);
        const jsonStr = jsonMatch ? jsonMatch[1] : content;
        
        const options = JSON.parse(jsonStr);
        return Array.isArray(options) ? options : [];
      } catch (jsonError) {
        this.logger.warn(`Failed to parse clarification options JSON: ${jsonError.message}`);
        return [];
      }
    } catch (error) {
      this.logger.warn(`Error generating clarification options: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Handle a user's response to a clarification request
   */
  private async handleClarificationResponse(sessionId: string, message: string): Promise<ChatMessage> {
    const state = this.conversationStates.get(sessionId);
    
    // Combine the original message with the clarification
    const enhancedMessage = `${state.pendingClarification.originalMessage} [Clarification: ${message}]`;
    
    // Clear the pending clarification
    state.pendingClarification = undefined;
    state.status = 'active';
    this.conversationStates.set(sessionId, state);
    
    // Process the enhanced message
    return this.processUserMessage(sessionId, enhancedMessage);
  }
  
  /**
   * Ensure the right platform is active for the intended operation
   */
  private async ensureCorrectPlatform(sessionId: string, platform: 'coreldraw' | 'blender'): Promise<void> {
    const currentPlatform = await this.platformSwitchingService.getCurrentPlatform();
    
    if (currentPlatform !== platform) {
      this.logger.debug(`Switching from ${currentPlatform} to ${platform}`);
      
      await this.platformSwitchingService.setCurrentPlatform(platform);
      
      // Store the platform change in the chat session
      await this.chatService.setPlatform(sessionId, platform);
    }
  }
  
  /**
   * Execute a design command through the software service
   */
  private async executeDesignCommand(sessionId: string, message: string, intent: any): Promise<ChatMessage> {
    const platform = await this.platformSwitchingService.getCurrentPlatform();
    
    // Generate and execute command
    const result = await this.softwareService.executeNaturalLanguageCommand(
      platform,
      message,
      {
        sessionId,
        intent: intent.action,
        useContext: true
      }
    );
    
    // Create a response
    let content = '';
    if (result.success) {
      content = `✅ ${result.message || 'Commando uitgevoerd.'}`;
      if (result.details) {
        content += `\n\n${result.details}`;
      }
    } else {
      content = `❌ ${result.message || 'Fout bij uitvoeren commando.'}`;
      if (result.errorDetails) {
        content += `\n\n${result.errorDetails}`;
      }
    }
    
    // Update design context after command execution
    await this.storeContextChanges(sessionId);
    
    const response: ChatMessage = { role: 'assistant', content };
    await this.chatService.addMessageToHistory(sessionId, response);
    return response;
  }
  
  /**
   * Answer a question using enhanced context
   */
  private async answerQuestion(sessionId: string, message: string, intent: any): Promise<ChatMessage> {
    // Get enhanced context for domain knowledge
    const domainKnowledge = await this.intentService.getDomainKnowledge(message, {
      platform: intent.platform,
      keywords: intent.entities,
      includeExamples: true,
      maxResults: 5
    });
    
    // Enhance with relevant conversation memory
    const session = this.chatService.getSession(sessionId);
    const recentMessages = session ? session.messages.slice(-10) : [];
    
    // Create an enhanced prompt
    const enhancedMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `Je bent een behulpzame ontwerp-assistent die vragen over ${intent.platform || 'ontwerpsoftware'} beantwoordt.
        Geef nauwkeurige, beknopte en nuttige antwoorden. Maak gebruik van zowel je algemene kennis als de specifieke domeinkennis die je krijgt.
        Als je het antwoord niet weet, zeg dat dan eerlijk in plaats van informatie te verzinnen.`
      }
    ];
    
    // Add domain knowledge if available
    if (domainKnowledge && domainKnowledge.results && domainKnowledge.results.length > 0) {
      enhancedMessages.push({
        role: 'system',
        content: `Relevante domeinkennis:\n${domainKnowledge.results.map(r => `- ${r.content}`).join('\n')}`
      });
    }
    
    // Add conversation history
    enhancedMessages.push(...recentMessages);
    
    // Add the current question
    enhancedMessages.push({ role: 'user', content: message });
    
    // Get response from LLM
    const response = await this.ollamaService.chatCompletion({
      model: 'llama3',
      messages: enhancedMessages,
      temperature: 0.7,
    });
    
    const answer: ChatMessage = { 
      role: 'assistant', 
      content: response.choices[0].message.content 
    };
    
    await this.chatService.addMessageToHistory(sessionId, answer);
    return answer;
  }
  
  /**
   * Store context changes after processing
   */
  private async storeContextChanges(sessionId: string): Promise<void> {
    try {
      const state = this.conversationStates.get(sessionId);
      if (!state || !state.contextSnapshot) return;
      
      const platform = await this.platformSwitchingService.getCurrentPlatform();
      
      // Only capture if we have a valid platform
      if (platform === 'coreldraw' || platform === 'blender') {
        // Capture current context
        const newContext = await this.designContextAnalyzer.captureContext(platform);
        
        // Compare with snapshot and detect changes
        const changes = this.detectContextChanges(state.contextSnapshot, newContext);
        
        if (changes.length > 0) {
          // Store context changes in chat memory
          await this.chatMemoryService.addMetadata(sessionId, {
            contextChanges: changes,
            timestamp: new Date().toISOString()
          });
          
          this.logger.debug(`Stored ${changes.length} context changes for session ${sessionId}`);
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to store context changes: ${error.message}`);
    }
  }
  
  /**
   * Detect changes between two context snapshots
   */
  private detectContextChanges(oldContext: any, newContext: any): string[] {
    if (!oldContext || !newContext) return [];
    
    const changes: string[] = [];
    
    // Compare document properties
    if (oldContext.document?.name !== newContext.document?.name) {
      changes.push(`Document changed from "${oldContext.document?.name}" to "${newContext.document?.name}"`);
    }
    
    // Compare element counts
    const oldElementCount = oldContext.elements?.length || 0;
    const newElementCount = newContext.elements?.length || 0;
    
    if (oldElementCount !== newElementCount) {
      changes.push(`Number of elements changed from ${oldElementCount} to ${newElementCount}`);
    }
    
    // More detailed element analysis could be added here
    // This is a simplified implementation
    
    return changes;
  }
  
  /**
   * Get the current state of a conversation
   */
  getConversationState(sessionId: string): ConversationState | undefined {
    return this.conversationStates.get(sessionId);
  }
  
  /**
   * Check if a conversation has pending clarification requests
   */
  hasPendingClarification(sessionId: string): boolean {
    const state = this.conversationStates.get(sessionId);
    return state?.status === 'waiting_clarification' && !!state.pendingClarification;
  }
} 