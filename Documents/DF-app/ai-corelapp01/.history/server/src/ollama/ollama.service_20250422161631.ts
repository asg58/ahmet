import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, map, of, timeout, catchError } from 'rxjs';
import { HttpService } from '@nestjs/axios';

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
  private initialized = false;
  private isInitializing = false;
  private connectionError: Error | null = null;
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

  constructor(private configService: ConfigService, private httpService: HttpService) {
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
      this.logger.log(`Attempting to connect to Ollama at ${this.baseUrl} (attempt ${this.retryCount + 1}/${this.maxRetries})`);
      
      // Controleer eerst of de service beschikbaar is met een snelle ping
      const pingSuccess = await this.ping().catch(() => false);
      
      if (!pingSuccess) {
        throw new Error(`Cannot connect to Ollama service at ${this.baseUrl}`);
      }
      
      await this.refreshModels();
      this.initialized = true;
      this.connectionError = null;
      this.retryCount = 0; // Reset retry counter on success
      this.logger.log(`Successfully connected to Ollama service with ${this.availableModels.length} models available`);
    } catch (error) {
      this.connectionError = error;
      
      // Meer gedetailleerde foutlogging
      if (error.code === 'ECONNREFUSED') {
        this.logger.error(`Failed to connect to Ollama service at ${this.baseUrl}: Connection refused`);
        this.logger.warn(`Make sure Ollama is running and accessible at ${this.baseUrl}`);
      } else if (error.code === 'ETIMEDOUT') {
        this.logger.error(`Connection to Ollama service at ${this.baseUrl} timed out`);
      } else {
        this.logger.error(`Failed to initialize Ollama service: ${error.message || 'Unknown error'}`);
      }
      
      // Set up retry mechanism
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.min(2000 * Math.pow(2, this.retryCount), 60000); // Exponential backoff, max 60s
        this.logger.log(`Will retry Ollama connection in ${delay/1000} seconds (attempt ${this.retryCount + 1}/${this.maxRetries})`);
        
        if (this.retryTimeout) {
          clearTimeout(this.retryTimeout);
        }
        
        this.retryTimeout = setTimeout(() => {
          this.isInitializing = false;
          this.initializeAsync();
        }, delay);
      } else {
        this.logger.warn(`Max retries (${this.maxRetries}) reached for Ollama connection. Service will operate in degraded mode.`);
        this.logger.warn('Requests to the language model will return fallback responses.');
        this.logger.warn(`To fix this issue, ensure Ollama is running and accessible at ${this.baseUrl}`);
      }
    } finally {
      if (this.initialized || this.retryCount >= this.maxRetries) {
        this.isInitializing = false;
      }
    }
  }

  /**
   * Geeft de huidige status van de Ollama service verbinding
   */
  async getStatus(): Promise<{
    initialized: boolean;
    connectionError: Error | null;
    isInitializing: boolean;
    retryCount: number;
    baseUrl: string;
    status: string;
  }> {
    // Doe een snelle ping-check als de service wél geïnitialiseerd is
    // om te controleren of het nog steeds beschikbaar is
    let status = 'unknown';
    
    if (this.initialized) {
      try {
        const pingResponse = await firstValueFrom(
          this.httpService.get(`${this.baseUrl}/api/tags`).pipe(
            map((response) => response.data),
            timeout(2000), // 2 seconden timeout
            catchError((err) => {
              this.logger.warn(`Ping check to Ollama failed: ${err.message}`);
              status = `Ping failed: ${err.message}`;
              // Service blijft wel geïnitialiseerd, maar we rapporteren de fout
              return of(null);
            }),
          ),
        );
        
        if (pingResponse) {
          status = 'available';
        }
      } catch (error) {
        status = `Ping error: ${error.message}`;
      }
    } else if (this.connectionError) {
      status = `Connection error: ${this.connectionError.message}`;
    } else if (this.isInitializing) {
      status = `Initializing (retry ${this.retryCount})`;
    } else {
      status = 'Not initialized';
    }
    
    return {
      initialized: this.initialized,
      connectionError: this.connectionError,
      isInitializing: this.isInitializing,
      retryCount: this.retryCount,
      baseUrl: this.baseUrl,
      status,
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
      if (!this.initialized && !this.connectionError) {
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
      // If service isn't initialized and we're not in error state, try initializing
      if (!this.initialized && !this.connectionError && !this.isInitializing) {
        await this.initializeAsync();
      }
      
      // If service still isn't initialized, throw meaningful error
      if (!this.initialized) {
        this.logger.warn('Ollama service is not initialized, using fallback response');
        return {
          choices: [
            {
              message: {
                role: 'assistant',
                content: "I'm sorry, but the language model service is currently unavailable. Please try again later or contact support if the issue persists."
              },
              index: 0,
              finish_reason: 'error'
            }
          ],
          created: Date.now(),
          model: request.model || this.defaultModel,
          system_fingerprint: 'unavailable',
          object: 'chat.completion'
        };
      }

      const url = `${this.baseUrl}/v1/chat/completions`;
      this.logger.debug(`Sending chat completion request to ${url} with model ${request.model}`);
      
      const response = await this.client.post('/v1/chat/completions', request);
      return response.data;
    } catch (error) {
      this.logger.error(`Chat completion error: ${error.message}`);
      // Return a graceful fallback response instead of throwing
      return {
        choices: [
          {
            message: {
              role: 'assistant',
              content: "I'm sorry, but there was an error processing your request. The language model service might be unavailable. Please try again later."
            },
            index: 0,
            finish_reason: 'error'
          }
        ],
        created: Date.now(),
        model: request.model || this.defaultModel,
        system_fingerprint: 'error',
        object: 'chat.completion'
      };
    }
  }

  async streamChatCompletion(request: ChatCompletionRequest, onData: (data: any) => void) {
    try {
      // If service isn't initialized and we're not in error state, try initializing
      if (!this.initialized && !this.connectionError && !this.isInitializing) {
        await this.initializeAsync();
      }
      
      // If service still isn't initialized, send fallback response and resolve
      if (!this.initialized) {
        this.logger.warn('Ollama service is not initialized, sending fallback response for stream');
        onData({
          choices: [
            {
              delta: {
                role: 'assistant',
                content: "I'm sorry, but the language model service is currently unavailable. Please try again later or contact support if the issue persists."
              },
              index: 0,
              finish_reason: 'error'
            }
          ],
          created: Date.now(),
          model: request.model || this.defaultModel,
          system_fingerprint: 'unavailable',
          object: 'chat.completion.chunk'
        });
        return;
      }

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
      // Send fallback response
      onData({
        choices: [
          {
            delta: {
              role: 'assistant',
              content: "I'm sorry, but there was an error processing your request. The language model service might be unavailable. Please try again later."
            },
            index: 0,
            finish_reason: 'error'
          }
        ],
        created: Date.now(),
        model: request.model || this.defaultModel,
        system_fingerprint: 'error',
        object: 'chat.completion.chunk'
      });
      return;
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