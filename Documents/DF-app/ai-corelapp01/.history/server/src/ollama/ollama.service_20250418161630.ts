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

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;

  constructor() {
    const host = process.env.OLLAMA_HOST || 'localhost';
    const port = process.env.OLLAMA_PORT || '11434';
    this.baseUrl = `http://${host}:${port}`;
    this.logger.log(`Ollama service initialized with base URL: ${this.baseUrl}`);
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

  async chatCompletion(request: ChatCompletionRequest) {
    try {
      const url = `${this.baseUrl}/v1/chat/completions`;
      this.logger.debug(`Sending chat completion request to ${url}`);
      
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
} 