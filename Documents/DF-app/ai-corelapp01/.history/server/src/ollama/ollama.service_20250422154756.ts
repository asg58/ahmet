import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | Date;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  top_k?: number;
}

export interface ModelConfig {
  name: string;
  description: string;
  capabilities: ('code' | 'context' | 'creative' | 'fast' | 'math')[];
  parameters?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export enum TaskType {
  CODE_GENERATION = 'code_generation',
  CONTEXT_ANALYSIS = 'context_analysis',
  CREATIVE_CONTENT = 'creative_content',
  QUICK_RESPONSE = 'quick_response',
  MATH_REASONING = 'math_reasoning',
  DEFAULT = 'default'
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly client: AxiosInstance;
  private readonly baseUrl: string;
  private configuredModels: ModelConfig[] = [];
  private availableModels: any[] = [];
  private defaultModel = 'llama3';
  private isInitialized = false;
  private isInitializing = false;
  private connectionError = false;
  private retryTimeout: NodeJS.Timeout | null = null;
  private maxRetries = 5;
  private retryCount = 0;

  // Recommended models for different tasks
  private taskToModelMap: Record<TaskType, string> = {
    [TaskType.CODE_GENERATION]: 'codellama',
    [TaskType.CONTEXT_ANALYSIS]: 'llama3:70b',
    [TaskType.CREATIVE_CONTENT]: 'mixtral',
    [TaskType.QUICK_RESPONSE]: 'llama3:8b',
    [TaskType.MATH_REASONING]: 'codellama',
    [TaskType.DEFAULT]: 'llama3',
  };

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('OLLAMA_HOST') || 'localhost';
    const port = this.configService.get<number>('OLLAMA_PORT') || 11434;
    this.baseUrl = `http://${host}:${port}`;
    
    this.logger.log(`Ollama service initialized with base URL: ${this.baseUrl}`);
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
    });
    
    // Non-blocking initialization
    this.initializeAsync();
  }
  
  // Initialize asynchronously to avoid blocking app startup
  private async initializeAsync() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      await this.refreshModels();
      this.isInitialized = true;
      this.connectionError = false;
    } catch (error) {
      this.connectionError = true;
      this.logger.error(`Failed to initialize Ollama service: ${error.message || 'Unknown error'}`);
    } finally {
      this.isInitializing = false;
    }
  }

  async getStatus(): Promise<any> {
    return {
      status: this.connectionError ? 'error' : 'ok',
      initialized: this.isInitialized,
      baseUrl: this.baseUrl,
      modelsAvailable: this.availableModels.length,
      connectionError: this.connectionError
    };
  }

  async refreshModels(): Promise<any[]> {
    try {
      const response = await this.client.get('/api/tags');
      this.availableModels = response.data.models || [];
      return this.availableModels;
    } catch (error) {
      this.logger.error(`Failed to refresh available models: ${error.message || 'Unknown error'}`);
      return [];
    }
  }

  async listModels(): Promise<any[]> {
    try {
      if (!this.isInitialized && !this.connectionError) {
        await this.initializeAsync();
      }
      
      if (this.availableModels.length === 0) {
        await this.refreshModels();
      }
      
      return this.availableModels;
    } catch (error) {
      this.logger.error(`Failed to list models: ${error.message || 'Unknown error'}`);
      return [];
    }
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.client.get('/');
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Failed to ping Ollama: ${error.message}`);
      return false;
    }
  }

  /**
   * Get the best available model for a specific task
   */
  async getBestModelForTask(taskType: TaskType): Promise<string> {
    // Refresh list if empty
    if (this.availableModels.length === 0) {
      await this.refreshModels();
    }
    
    // Get preferred model for this task
    const preferredModel = this.taskToModelMap[taskType];
    
    // Check if preferred model is available
    if (this.availableModels.includes(preferredModel)) {
      return preferredModel;
    }
    
    // Fall back to any model with the right capabilities
    const taskCapabilities = this.getCapabilitiesForTask(taskType);
    const fallbackModel = this.configuredModels.find(model => 
      this.availableModels.includes(model.name) && 
      taskCapabilities.some(cap => model.capabilities.includes(cap))
    );
    
    if (fallbackModel) {
      return fallbackModel.name;
    }
    
    // Last resort: use any available model
    return this.availableModels[0] || this.defaultModel;
  }

  /**
   * Get the required capabilities for a specific task
   */
  private getCapabilitiesForTask(taskType: TaskType): ('code' | 'context' | 'creative' | 'fast' | 'math')[] {
    switch (taskType) {
      case TaskType.CODE_GENERATION:
        return ['code'];
      case TaskType.CONTEXT_ANALYSIS:
        return ['context'];
      case TaskType.CREATIVE_CONTENT:
        return ['creative'];
      case TaskType.QUICK_RESPONSE:
        return ['fast'];
      case TaskType.MATH_REASONING:
        return ['math'];
      default:
        return ['context'];
    }
  }

  /**
   * Get parameters for a specific model
   */
  getParametersForModel(modelName: string): Record<string, any> {
    const modelConfig = this.configuredModels.find(model => model.name === modelName);
    return modelConfig?.parameters || { temperature: 0.7, top_p: 0.9 };
  }

  /**
   * Chat completion with automatic model selection based on task
   */
  async chatCompletionForTask(
    messages: ChatMessage[], 
    taskType: TaskType = TaskType.DEFAULT,
    customParameters: Record<string, any> = {}
  ) {
    const modelName = await this.getBestModelForTask(taskType);
    const defaultParameters = this.getParametersForModel(modelName);
    
    const request: ChatCompletionRequest = {
      model: modelName,
      messages,
      ...defaultParameters,
      ...customParameters
    };
    
    this.logger.debug(`Using model ${modelName} for task ${taskType}`);
    return this.chatCompletion(request);
  }

  /**
   * Standard chat completion with explicit model specification
   */
  async chatCompletion(request: ChatCompletionRequest) {
    try {
      const url = `${this.baseUrl}/v1/chat/completions`;
      this.logger.debug(`Sending chat completion request to ${url} with model ${request.model}`);
      
      const response = await this.client.post('/v1/chat/completions', request);
      return response.data;
    } catch (error) {
      this.logger.error(`Chat completion error: ${error.message}`);
      throw error;
    }
  }

  async streamChatCompletion(request: ChatCompletionRequest, onData: (data: any) => void) {
    try {
      request.stream = true;
      const url = `${this.baseUrl}/v1/chat/completions`;
      
      const response = await this.client.post(url, request, {
        responseType: 'stream',
      });
      
      response.data.on('data', (chunk: Buffer) => {
        try {
          const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                // Stream finished
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                onData(parsed);
              } catch (parseError) {
                this.logger.error(`Error parsing JSON: ${parseError.message}`);
              }
            }
          }
        } catch (error) {
          this.logger.error(`Error processing stream chunk: ${error.message}`);
        }
      });
      
      return new Promise<void>((resolve, reject) => {
        response.data.on('end', () => resolve());
        response.data.on('error', (err: Error) => reject(err));
      });
    } catch (error) {
      this.logger.error(`Stream chat completion error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Stream chat completion with automatic model selection based on task
   */
  async streamChatCompletionForTask(
    messages: ChatMessage[],
    onData: (data: any) => void,
    taskType: TaskType = TaskType.DEFAULT,
    customParameters: Record<string, any> = {}
  ) {
    const modelName = await this.getBestModelForTask(taskType);
    const defaultParameters = this.getParametersForModel(modelName);
    
    const request: ChatCompletionRequest = {
      model: modelName,
      messages,
      ...defaultParameters,
      ...customParameters
    };
    
    this.logger.debug(`Using model ${modelName} for streaming task ${taskType}`);
    return this.streamChatCompletion(request, onData);
  }

  /**
   * Get information about a specific model
   */
  getModelInfo(modelName: string): ModelConfig | null {
    return this.configuredModels.find(model => model.name === modelName) || null;
  }

  /**
   * Get all configured models with their capabilities
   */
  getConfiguredModels(): ModelConfig[] {
    return this.configuredModels;
  }

  /**
   * Add or update a model configuration
   */
  updateModelConfig(config: ModelConfig): void {
    const index = this.configuredModels.findIndex(model => model.name === config.name);
    
    if (index >= 0) {
      this.configuredModels[index] = config;
    } else {
      this.configuredModels.push(config);
    }
    
    this.logger.log(`Updated model configuration for ${config.name}`);
  }

  /**
   * Update task to model mapping
   */
  setTaskModel(task: TaskType, modelName: string): void {
    this.taskToModelMap[task] = modelName;
    this.logger.log(`Set ${modelName} as preferred model for task ${task}`);
  }
} 