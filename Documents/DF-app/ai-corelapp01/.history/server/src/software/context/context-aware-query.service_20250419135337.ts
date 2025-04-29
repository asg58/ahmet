import { Injectable, Logger } from '@nestjs/common';
import { DesignContext } from './design-context';
import { ChatMessage } from '../../ollama/ollama.service';
import { CorelContextAnalyzer } from './corel-context';
import { BlenderContextAnalyzer } from './blender-context';

/**
 * ContextAwareQueryService
 * 
 * Service to enrich AI queries with design context information
 */
@Injectable()
export class ContextAwareQueryService {
  private readonly logger = new Logger(ContextAwareQueryService.name);
  
  constructor(
    private readonly corelContextAnalyzer: CorelContextAnalyzer,
    private readonly blenderContextAnalyzer: BlenderContextAnalyzer
  ) {}
  
  /**
   * Enrich a query with context from the design document
   */
  enhanceQueryWithContext(query: string, context: DesignContext): string {
    this.logger.debug(`Enhancing query with context: ${query}`);
    
    // Extract relevant contextual terms
    const contextualTerms: string[] = [];
    
    // Add platform-specific terms
    contextualTerms.push(context.platform);
    
    // Add selected elements
    if (context.selectedElements && context.selectedElements.length > 0) {
      const selectionTypes = new Set(context.selectedElements.map(el => el.type.toLowerCase()));
      selectionTypes.forEach(type => contextualTerms.push(type));
      
      // Add position information if available
      const positions = context.selectedElements
        .filter(el => el.position)
        .map(el => `at position ${el.position.x},${el.position.y}`);
      
      if (positions.length > 0) {
        contextualTerms.push(...positions);
      }
    }
    
    // Add document information
    contextualTerms.push(`in document ${context.documentName}`);
    
    // Add layer information if available
    if (context.layers && context.layers.length > 0) {
      const visibleLayers = context.layers.filter(layer => layer.visible);
      if (visibleLayers.length > 0) {
        contextualTerms.push(`with visible layers ${visibleLayers.map(l => l.name).join(', ')}`);
      }
    }
    
    // Platform-specific enhancements
    if (context.platform === 'coreldraw') {
      if (context.currentPage !== undefined) {
        contextualTerms.push(`on page ${context.currentPage}`);
      }
    } else if (context.platform === 'blender') {
      if (context.currentFrame !== undefined) {
        contextualTerms.push(`at frame ${context.currentFrame}`);
      }
    }
    
    // Combine query with context
    const enhancedQuery = `${query} ${contextualTerms.join(' ')}`;
    this.logger.debug(`Enhanced query: ${enhancedQuery}`);
    
    return enhancedQuery;
  }
  
  /**
   * Build a prompt for an AI with context information
   */
  buildPromptWithContext(
    basePrompt: string,
    context: DesignContext,
    conversationHistory: ChatMessage[] = []
  ): ChatMessage[] {
    const prompt: ChatMessage[] = [];
    
    // Add system message with context information
    let contextDescription: string;
    if (context.platform === 'coreldraw') {
      contextDescription = this.corelContextAnalyzer.contextToDescription(context);
    } else {
      contextDescription = this.blenderContextAnalyzer.contextToDescription(context);
    }
    
    prompt.push({
      role: 'system',
      content: `${basePrompt}\n\nCurrent design context:\n${contextDescription}`
    });
    
    // Add action history if available
    if (context.actionHistory && context.actionHistory.length > 0) {
      const recentActions = context.actionHistory
        .slice(-5) // Only the 5 most recent actions
        .map(action => `- ${action.description}`).join('\n');
      
      prompt.push({
        role: 'system',
        content: `Recent actions in the document:\n${recentActions}`
      });
    }
    
    // Add user intent if available
    if (context.userIntent?.current) {
      prompt.push({
        role: 'system',
        content: `User's current goal: ${context.userIntent.current}`
      });
    }
    
    // Add conversation history
    prompt.push(...conversationHistory);
    
    return prompt;
  }
  
  /**
   * Calculate document statistics
   */
  calculateDocumentStats(context: DesignContext): DesignContext['statistics'] {
    const elementsByType: Record<string, number> = {};
    let totalElements = 0;
    
    // Count elements by type
    context.layers.forEach(layer => {
      layer.elements.forEach(element => {
        elementsByType[element.type] = (elementsByType[element.type] || 0) + 1;
        totalElements++;
        
        // Count nested elements if they exist
        if (element.children && element.children.length > 0) {
          const countNestedElements = (elements: DesignElement[]) => {
            elements.forEach(childElement => {
              elementsByType[childElement.type] = (elementsByType[childElement.type] || 0) + 1;
              totalElements++;
              
              if (childElement.children && childElement.children.length > 0) {
                countNestedElements(childElement.children);
              }
            });
          };
          
          countNestedElements(element.children);
        }
      });
    });
    
    // Determine document complexity
    let documentComplexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (totalElements > 100) {
      documentComplexity = 'complex';
    } else if (totalElements > 20) {
      documentComplexity = 'medium';
    }
    
    return {
      totalElements,
      elementsByType,
      documentComplexity
    };
  }
} 