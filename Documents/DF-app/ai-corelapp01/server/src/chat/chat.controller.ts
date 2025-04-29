import { Controller, Get, Post, Body, HttpStatus, HttpException, Param, Query, UseGuards } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Intent } from '../intent/intent.service';
import { ConversationOrchestratorService } from './conversation-orchestrator.service';

interface MessageRequest {
  sessionId: string;
  message: string;
}

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly chatService: ChatService,
    private readonly conversationOrchestrator: ConversationOrchestratorService,
  ) {}

  @Get('health')
  async getHealth() {
    return {
      status: 'ok',
      service: 'chat-service',
      timestamp: new Date().toISOString()
    };
  }

  @Post()
  async sendMessage(@Body() request: MessageRequest): Promise<{ response: ChatMessage, state?: any }> {
    try {
      this.logger.debug(`Received message for session ${request.sessionId}`);
      
      // Use the conversation orchestrator instead of directly using the chat service
      const response = await this.conversationOrchestrator.processUserMessage(
        request.sessionId,
        request.message
      );
      
      // Include conversation state in the response if waiting for clarification
      const state = this.conversationOrchestrator.getConversationState(request.sessionId);
      
      return {
        response,
        state: state?.status === 'waiting_clarification' ? {
          status: state.status,
          pendingClarification: state.pendingClarification
        } : undefined
      };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw new HttpException(
        `Error processing message: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':sessionId/message')
  async sendMessageToSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string },
  ): Promise<ChatMessage> {
    this.logger.debug(`Received message for session ${sessionId}: ${body.message}`);
    return this.chatService.processMessage(sessionId, body.message);
  }

  @Get(':sessionId/history')
  async getSessionHistory(@Param('sessionId') sessionId: string) {
    const session = this.chatService.getSession(sessionId);
    
    if (!session) {
      return { 
        sessionId, 
        exists: false,
        messages: []
      };
    }
    
    return {
      sessionId,
      exists: true,
      messages: session.messages,
      platform: session.platform
    };
  }

  @Post(':sessionId/clear')
  async clearSession(@Param('sessionId') sessionId: string) {
    const cleared = this.chatService.clearSession(sessionId);
    return { 
      sessionId, 
      cleared,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':sessionId/platform')
  async setPlatform(
    @Param('sessionId') sessionId: string,
    @Body() body: { platform: 'coreldraw' | 'blender' | null },
  ) {
    const updated = this.chatService.setPlatform(sessionId, body.platform);
    return {
      sessionId,
      updated,
      platform: body.platform,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get a summary of the conversation history
   * @param sessionId Session ID for the conversation
   * @param maxLength Optional maximum length for the summary
   */
  @Get(':sessionId/summary')
  async getConversationSummary(
    @Param('sessionId') sessionId: string,
    @Query('maxLength') maxLength?: string
  ) {
    this.logger.debug(`Getting conversation summary for session ${sessionId}`);
    
    const maxLengthNumber = maxLength ? parseInt(maxLength, 10) : undefined;
    const summary = await this.chatService.generateConversationSummary(
      sessionId, 
      maxLengthNumber
    );
    
    return {
      sessionId,
      summary,
      timestamp: new Date().toISOString()
    };
  }

  @Get(':sessionId/intent')
  async getLastIntent(@Param('sessionId') sessionId: string): Promise<{ sessionId: string; intent?: Intent; timestamp: string }> {
    this.logger.debug(`Getting last intent for session ${sessionId}`);
    
    const intent = await this.chatService.getLastIntent(sessionId);
    
    return {
      sessionId,
      intent,
      timestamp: new Date().toISOString()
    };
  }

  @Post(':sessionId/analyze-message')
  async analyzeMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: { message: string },
  ): Promise<{ sessionId: string; message: string; intent: Intent }> {
    this.logger.debug(`Analyzing message for session ${sessionId}: ${body.message}`);
    
    // Get conversation history
    const session = this.chatService.getSession(sessionId) || this.chatService.createSession(sessionId);
    
    // Using the method from ChatService to detect intent
    const intent = await this.chatService.detectMessageIntent(sessionId, body.message);
    
    return {
      sessionId,
      message: body.message,
      intent
    };
  }

  @Get('session/:sessionId/status')
  async getSessionStatus(@Param('sessionId') sessionId: string) {
    try {
      const session = this.chatService.getSession(sessionId);
      const state = this.conversationOrchestrator.getConversationState(sessionId);
      
      return {
        exists: !!session,
        messageCount: session ? session.messages.length : 0,
        platform: session ? session.platform : null,
        conversationState: state ? {
          status: state.status,
          hasPendingClarification: this.conversationOrchestrator.hasPendingClarification(sessionId),
          currentTask: state.currentTask
        } : null
      };
    } catch (error) {
      this.logger.error(`Error getting session status: ${error.message}`);
      throw new HttpException(
        `Error getting session status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('session/:sessionId/summary')
  async getSessionSummary(@Param('sessionId') sessionId: string) {
    try {
      const summary = await this.chatService.generateConversationSummary(sessionId);
      return { summary };
    } catch (error) {
      this.logger.error(`Error generating summary: ${error.message}`);
      throw new HttpException(
        `Error generating summary: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 