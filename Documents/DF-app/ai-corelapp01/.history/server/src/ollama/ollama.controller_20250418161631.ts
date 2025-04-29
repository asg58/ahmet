import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { OllamaService, ChatCompletionRequest } from './ollama.service';

@Controller('api/ollama')
export class OllamaController {
  constructor(private readonly ollamaService: OllamaService) {}

  @Get('status')
  async getStatus() {
    try {
      const isAlive = await this.ollamaService.ping();
      return { status: isAlive ? 'connected' : 'disconnected' };
    } catch (error) {
      throw new HttpException('Failed to connect to Ollama', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  @Get('models')
  async getModels() {
    try {
      const models = await this.ollamaService.listModels();
      return models;
    } catch (error) {
      throw new HttpException('Failed to list models', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('chat')
  async chatCompletion(@Body() request: ChatCompletionRequest) {
    try {
      const response = await this.ollamaService.chatCompletion(request);
      return response;
    } catch (error) {
      throw new HttpException(
        `Chat completion failed: ${error.message}`, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 