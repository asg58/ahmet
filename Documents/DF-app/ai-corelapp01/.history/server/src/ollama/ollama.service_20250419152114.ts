import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
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
  private readonly baseUrl: string;
  private configuredModels: ModelConfig[] = [];
  private availableModels: string[] = [];
  private defaultModel = 'llama3';

  // Recommended models for different tasks
  private taskToModelMap: Record<TaskType, string> = {
    [TaskType.CODE_GENERATION]: 'codeqwen:14b-q4_K_M',
    [TaskType.CONTEXT_ANALYSIS]: 'llama3:70b',
    [TaskType.CREATIVE_CONTENT]: 'mixtral',
    [TaskType.QUICK_RESPONSE]: 'llama3:8b',
    [TaskType.MATH_REASONING]: 'codeqwen:14b-q4_K_M',
    [TaskType.DEFAULT]: 'llama3',
  };

  constructor() {
    const host = process.env.OLLAMA_HOST || 'localhost';
    const port = process.env.OLLAMA_PORT || '11434';
    this.baseUrl = `http://${host}:${port}`;
    this.logger.log(`Ollama service initialized with base URL: ${this.baseUrl}`);
    
    // Initialize default model configurations
    this.configuredModels = [
      {
        name: 'llama3',
        description: 'General purpose model for most tasks',
        capabilities: ['context', 'creative'],
        parameters: { temperature: 0.7, top_p: 0.9 }
      },
      {
        name: 'llama3:8b',
        description: 'Fast general purpose model',
        capabilities: ['fast'],
        parameters: { temperature: 0.7, top_p: 0.9 }
      },
      {
        name: 'llama3:70b',
        description: 'High capability model for complex tasks',
        capabilities: ['context', 'creative', 'math'],
        parameters: { temperature: 0.7, top_p: 0.9 }
      },
      {
        name: 'codeqwen:14b-q4_K_M',
        description: 'Specialized for code generation',
        capabilities: ['code', 'math'],
        parameters: { temperature: 0.2, top_p: 0.95 }
      },
      {
        name: 'mixtral',
        description: 'Creative content generation',
        capabilities: ['creative', 'context'],
        parameters: { temperature: 0.8, top_p: 0.9 }
      },
      {
        name: 'phi3',
        description: 'Fast responses for simple queries',
        capabilities: ['fast'],
        parameters: { temperature: 0.7, top_p: 0.9 }
      }
    ];
    
    // Refresh available models on startup
    this.refreshAvailableModels().catch(err => 
      this.logger.error(`Failed to refresh available models: ${err.message}`)
    );
  }

  async ping(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}`);
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Failed to ping Ollama: ${error.message}`);
      return false;
    }
  }

  async listModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to list models: ${error.message}`);
      throw error;
    }
  }

  /**
   * Refresh the list of available models from the Ollama server
   */
  async refreshAvailableModels(): Promise<string[]> {
    try {
      const models = await this.listModels();
      this.availableModels = models.models.map(model => model.name);
      this.logger.log(`Available models: ${this.availableModels.join(', ')}`);
      return this.availableModels;
    } catch (error) {
      this.logger.error(`Failed to refresh available models: ${error.message}`);
      return [];
    }
  }

  /**
   * Get the best available model for a specific task
   */
  async getBestModelForTask(taskType: TaskType): Promise<string> {
    // Refresh list if empty
    if (this.availableModels.length === 0) {
      await this.refreshAvailableModels();
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
      
      const response = await axios.post(url, request);
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
      
      const response = await axios.post(url, request, {
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