import { Controller, Get, Post, Body, HttpStatus, HttpException } from '@nestjs/common';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';

@Controller('api/chat')
export class ChatController {
  constructor(
    private readonly ollamaService: OllamaService
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
} 