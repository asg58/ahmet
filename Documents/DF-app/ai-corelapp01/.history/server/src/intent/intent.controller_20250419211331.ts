import { Controller, Post, Body, Get, Query, Logger } from '@nestjs/common';
import { IntentService, Intent, IntentDetectionOptions } from './intent.service';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';

interface IntentDetectionRequest {
  message: string;
  conversationHistory?: ChatMessage[];
  options?: IntentDetectionOptions;
}

@Controller('api/intent')
export class IntentController {
  private readonly logger = new Logger(IntentController.name);
  
  constructor(
    private readonly intentService: IntentService
  ) {}
  
  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      service: 'intent-service',
      timestamp: new Date().toISOString()
    };
  }
  
  @Post('detect')
  async detectIntent(@Body() request: IntentDetectionRequest): Promise<Intent> {
    this.logger.debug(`Intent detection request for message: ${request.message}`);
    
    const history = request.conversationHistory || [];
    const options = request.options || {};
    
    // Add a session ID if not provided
    if (!options.sessionId) {
      options.sessionId = 'test-session';
    }
    
    return this.intentService.detectIntent(request.message, history, options);
  }
  
  @Post('multi-step')
  async detectMultiStepInstructions(@Body() request: IntentDetectionRequest): Promise<Intent> {
    this.logger.debug(`Multi-step intent detection request for message: ${request.message}`);
    
    const history = request.conversationHistory || [];
    
    return this.intentService.analyzeMultiStepInstructions(request.message, history);
  }
  
  @Get('terminology')
  async getTerminology(@Query('message') message: string): Promise<string[]> {
    this.logger.debug(`Terminology request for message: ${message}`);
    
    // First detect the intent
    const intent = await this.intentService.detectIntent(
      message, 
      [], 
      { detailLevel: 'detailed' }
    );
    
    // Then get terminology recommendations
    return this.intentService.getTerminologyRecommendations(intent);
  }
} 