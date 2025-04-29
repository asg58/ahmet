import { ApiProperty } from '@nestjs/swagger';

export class ContextualReferenceDto {
  @ApiProperty({ description: 'Text reference from user message' })
  reference: string;

  @ApiProperty({ description: 'Target object in design', required: false })
  targetObject?: string;

  @ApiProperty({ description: 'Confidence score for this reference', minimum: 0, maximum: 1 })
  confidence: number;
}

export class DomainConceptDto {
  @ApiProperty({ description: 'Domain concept related to the intent' })
  concept: string;

  @ApiProperty({ description: 'Relevance score of the concept to the intent', minimum: 0, maximum: 1 })
  relevance: number;
}

export class StepDto {
  @ApiProperty({ description: 'Human-readable description of the step' })
  description: string;

  @ApiProperty({ description: 'Action to be performed in this step' })
  action: string;

  @ApiProperty({ description: 'Parameters for the action', required: false })
  parameters?: Record<string, any>;
}

export class IntentDto {
  @ApiProperty({ description: 'Type of intent detected' })
  type: string;

  @ApiProperty({ description: 'Target platform for execution', required: false })
  platform?: string;

  @ApiProperty({ description: 'Confidence score for this intent', minimum: 0, maximum: 1 })
  confidence: number;

  @ApiProperty({ description: 'Extracted entities from the message', required: false })
  entities?: Record<string, any>;

  @ApiProperty({ description: 'Main action to perform', required: false })
  action?: string;

  @ApiProperty({ description: 'Steps for multi-step instructions', type: [StepDto], required: false })
  steps?: StepDto[];

  @ApiProperty({ description: 'Design terminology identified in the intent', type: [String], required: false })
  designTerms?: string[];

  @ApiProperty({ description: 'Alternative interpretations of the intent', type: [IntentDto], required: false })
  alternatives?: IntentDto[];

  @ApiProperty({ description: 'Contextual references from user input', type: [ContextualReferenceDto], required: false })
  contextualReferences?: ContextualReferenceDto[];

  @ApiProperty({ description: 'Domain concepts related to the intent', type: [DomainConceptDto], required: false })
  domainConcepts?: DomainConceptDto[];
}

export class DetectIntentRequestDto {
  @ApiProperty({ description: 'User message to detect intent from' })
  message: string;

  @ApiProperty({ description: 'Conversation history for context', required: false })
  conversationHistory?: Array<{ role: string; content: string }>;

  @ApiProperty({ description: 'Options for intent detection', required: false })
  options?: {
    detailLevel?: 'basic' | 'standard' | 'detailed' | 'comprehensive';
    includeDomainKnowledge?: boolean;
    includeAlternatives?: boolean;
    sessionId?: string;
    platform?: string;
  };
}

export class DomainKnowledgeDto {
  @ApiProperty({ description: 'Term or concept name' })
  term: string;

  @ApiProperty({ description: 'Definition or explanation of the term' })
  definition: string;

  @ApiProperty({ description: 'Relevance score to the current intent', minimum: 0, maximum: 1 })
  relevance: number;
}

export class DomainKnowledgeResponseDto {
  @ApiProperty({ description: 'Domain knowledge related to the intent', type: [DomainKnowledgeDto] })
  knowledge: DomainKnowledgeDto[];
} 