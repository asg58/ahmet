import { Controller, Get, Post, Body, HttpException, HttpStatus, Param, Query } from '@nestjs/common';
import { OllamaService, ChatCompletionRequest, TaskType, ModelConfig } from './ollama.service';

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

  @Get('models/refresh')
  async refreshModels() {
    try {
      const models = await this.ollamaService.refreshAvailableModels();
      return { models, success: true };
    } catch (error) {
      throw new HttpException('Failed to refresh models', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('models/configured')
  async getConfiguredModels() {
    try {
      const models = this.ollamaService.getConfiguredModels();
      return { models, count: models.length };
    } catch (error) {
      throw new HttpException('Failed to get configured models', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('models/:modelName')
  async getModelInfo(@Param('modelName') modelName: string) {
    try {
      const modelInfo = this.ollamaService.getModelInfo(modelName);
      if (!modelInfo) {
        throw new HttpException(`Model ${modelName} not found`, HttpStatus.NOT_FOUND);
      }
      return modelInfo;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(`Failed to get model info: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('models/config')
  async updateModelConfig(@Body() config: ModelConfig) {
    try {
      this.ollamaService.updateModelConfig(config);
      return { success: true, message: `Model ${config.name} configuration updated` };
    } catch (error) {
      throw new HttpException(
        `Failed to update model configuration: ${error.message}`, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('tasks/:taskType/model/:modelName')
  async setTaskModel(
    @Param('taskType') taskType: string, 
    @Param('modelName') modelName: string
  ) {
    try {
      if (!Object.values(TaskType).includes(taskType as TaskType)) {
        throw new HttpException(`Invalid task type: ${taskType}`, HttpStatus.BAD_REQUEST);
      }
      
      this.ollamaService.setTaskModel(taskType as TaskType, modelName);
      return { 
        success: true, 
        message: `Set ${modelName} as preferred model for task ${taskType}` 
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Failed to set task model: ${error.message}`, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
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

  @Post('chat/task/:taskType')
  async chatCompletionForTask(
    @Param('taskType') taskType: string,
    @Body() body: { messages: any[], parameters?: Record<string, any> }
  ) {
    try {
      if (!Object.values(TaskType).includes(taskType as TaskType)) {
        throw new HttpException(`Invalid task type: ${taskType}`, HttpStatus.BAD_REQUEST);
      }
      
      const { messages, parameters } = body;
      
      if (!Array.isArray(messages)) {
        throw new HttpException('Messages must be an array', HttpStatus.BAD_REQUEST);
      }
      
      const response = await this.ollamaService.chatCompletionForTask(
        messages, 
        taskType as TaskType,
        parameters
      );
      
      return response;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        `Task-specific chat completion failed: ${error.message}`, 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 