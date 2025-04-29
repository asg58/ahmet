import { Controller, Post, Get, Body, Query, Param, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { IntentService, Intent, IntentDetectionOptions } from './intent.service';
import { OllamaService, ChatMessage } from '../ollama/ollama.service';

interface DetectIntentDto {
  message: string;
  conversationHistory?: ChatMessage[];
  options?: IntentDetectionOptions;
}

interface AnalyzeMultiStepDto {
  message: string;
  conversationHistory?: ChatMessage[];
}

interface OpenEndedLanguageDto {
  message: string;
  conversationHistory?: ChatMessage[];
  sessionId?: string;
}

@Controller('intent')
export class IntentController {
  private readonly logger = new Logger(IntentController.name);

  constructor(
    private readonly intentService: IntentService,
    private readonly ollamaService: OllamaService,
  ) {}

  @Get('health')
  async healthCheck() {
    this.logger.log('Health check requested');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'IntentController',
    };
  }

  @Post('detect')
  async detectIntent(@Body() body: DetectIntentDto): Promise<Intent> {
    try {
      this.logger.log(`Detecting intent for message: ${body.message}`);
      
      // Use empty array if conversation history is not provided
      const conversationHistory = body.conversationHistory || [];
      
      // Detect intent with provided options or defaults
      const intent = await this.intentService.detectIntent(
        body.message,
        conversationHistory,
        body.options
      );
      
      return intent;
    } catch (error) {
      this.logger.error(`Error detecting intent: ${error.message}`);
      throw new HttpException(
        'Failed to detect intent',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('analyze-multi-step')
  async analyzeMultiStepInstructions(@Body() body: AnalyzeMultiStepDto): Promise<Intent> {
    try {
      this.logger.log(`Analyzing multi-step instructions: ${body.message}`);
      
      // Use empty array if conversation history is not provided
      const conversationHistory = body.conversationHistory || [];
      
      // Analyze multi-step instructions
      const intent = await this.intentService.analyzeMultiStepInstructions(
        body.message,
        conversationHistory
      );
      
      return intent;
    } catch (error) {
      this.logger.error(`Error analyzing multi-step instructions: ${error.message}`);
      throw new HttpException(
        'Failed to analyze multi-step instructions',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('process-open-ended')
  async processOpenEndedLanguage(@Body() body: OpenEndedLanguageDto): Promise<Intent> {
    try {
      this.logger.log(`Processing open-ended language: ${body.message}`);
      
      // Use empty array if conversation history is not provided
      const conversationHistory = body.conversationHistory || [];
      
      // Process open-ended language with advanced context awareness
      const intent = await this.intentService.processOpenEndedLanguage(
        body.message,
        conversationHistory
      );
      
      // If session ID is provided, this will have already stored the intent in memory
      
      return intent;
    } catch (error) {
      this.logger.error(`Error processing open-ended language: ${error.message}`);
      throw new HttpException(
        'Failed to process open-ended language',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('terminology/:sessionId')
  async getTerminologyRecommendations(
    @Param('sessionId') sessionId: string,
    @Query('message') message: string
  ): Promise<string[]> {
    try {
      this.logger.log(`Getting terminology recommendations for session: ${sessionId}`);
      
      // First detect the intent
      const conversationHistory = [];
      const intent = await this.intentService.detectIntent(
        message || "",
        conversationHistory,
        { sessionId, detailLevel: 'detailed' }
      );
      
      // Then get terminology recommendations based on that intent
      const recommendations = await this.intentService.getTerminologyRecommendations(intent);
      
      return recommendations;
    } catch (error) {
      this.logger.error(`Error getting terminology recommendations: ${error.message}`);
      throw new HttpException(
        'Failed to get terminology recommendations',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('domain-knowledge')
  async getDomainKnowledge(@Body() body: { intent: Intent }): Promise<Array<{term: string; definition: string; relevance: number}>> {
    try {
      this.logger.log(`Getting domain knowledge for intent: ${body.intent.type}`);
      
      // Get domain knowledge for the provided intent
      const domainKnowledge = await this.intentService.getDomainKnowledgeForIntent(body.intent);
      
      return domainKnowledge;
    } catch (error) {
      this.logger.error(`Error getting domain knowledge: ${error.message}`);
      throw new HttpException(
        'Failed to get domain knowledge',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 