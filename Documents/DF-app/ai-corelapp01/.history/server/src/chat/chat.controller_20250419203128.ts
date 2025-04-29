import { Controller, Get, Post, Body, HttpStatus, HttpException, Param, Query } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';
import { Logger } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('api/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private readonly ollamaService: OllamaService,
    private readonly chatService: ChatService
  ) {}

  @Get('health')
  async checkHealth() {
    return { status: 'ok' };
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

  /**
   * Get a summary of the conversation history
   * @param sessionId Session ID for the conversation
   * @param maxLength Optional maximum length for the summary
   */
  @Get(':sessionId/summary')
  async getConversationSummary(
    @Param('sessionId') sessionId: string,
    @Query('maxLength') maxLength?: number,
  ) {
    this.logger.debug(`Requesting conversation summary for session ${sessionId}`);
    
    const summary = await this.chatService.generateConversationSummary(
      sessionId,
      maxLength ? parseInt(maxLength.toString(), 10) : undefined,
    );
    
    return { summary };
  }
} 