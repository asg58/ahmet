import { Controller, Get, Post, Body, HttpStatus, HttpException, Param, Query } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Intent } from '../intent/intent.service';

@Controller('api/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly chatService: ChatService
  ) {}

  @Get('health')
  async getHealth() {
    return {
      status: 'ok',
      service: 'chat-service',
      timestamp: new Date().toISOString()
    };
  }

  @Post('message')
  async sendMessage(@Body() body: { 
    message: string;
    conversationHistory?: ChatMessage[];
    model?: string;
  }) {
    try {
      const { message, conversationHistory = [], model = 'llama3.2:11b-q4_K_M' } = body;
      
      // Add user message to history
      const messages: ChatMessage[] = [
        ...conversationHistory,
        { role: 'user', content: message }
      ];
      
      // Send to Ollama
      const response = await this.ollamaService.chatCompletion({
        model,
        messages,
      });
      
      return {
        message: response.choices[0].message.content,
        model,
        conversationHistory: [
          ...messages,
          response.choices[0].message
        ]
      };
    } catch (error) {
      throw new HttpException(
        `Failed to process chat message: ${error.message}`,
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
} 