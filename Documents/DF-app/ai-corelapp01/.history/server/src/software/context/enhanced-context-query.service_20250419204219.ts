import { Injectable, Logger } from '@nestjs/common';
import { DesignContext } from './design-context';
import { DesignContextAnalyzerService } from './design-context-analyzer.service';
import { ChromaService } from '../../chroma/chroma.service';
import { ChatMessage } from '../../ollama/ollama.service';

/**
 * Enhanced Context Query Service
 * 
 * Service that leverages visual context analysis to provide improved
 * context-aware querying for AI interactions
 */
@Injectable()
export class EnhancedContextQueryService {
  private readonly logger = new Logger(EnhancedContextQueryService.name);
  
  constructor(
    private readonly contextAnalyzer: DesignContextAnalyzerService,
    private readonly chromaService: ChromaService
  ) {}
  
  /**
   * Enhance an AI prompt with richer context, including visual elements
   */
  async enhancePromptWithFullContext(
    basePrompt: string,
    platform: 'coreldraw' | 'blender',
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatMessage[]> {
    try {
      // Get enhanced context with visual analysis
      const context = await this.contextAnalyzer.getEnhancedContext();
      
      // Build prompt with enhanced context
      const prompt: ChatMessage[] = [];
      
      // Add system message with basic context
      prompt.push({
        role: 'system',
        content: `${basePrompt}\n\n${this.buildDesignContextDescription(context)}`
      });
      
      // Add visual context if available
      if (context.visualAnalysis) {
        prompt.push({
          role: 'system',
          content: this.buildVisualContextDescription(context)
        });
      }
      
      // Add conversation history
      prompt.push(...conversationHistory);
      
      return prompt;
    } catch (error) {
      this.logger.error(`Error enhancing prompt: ${error.message}`);
      
      // Fall back to just the base prompt and conversation history
      return [
        { role: 'system', content: basePrompt },
        ...conversationHistory
      ];
    }
  }
  
  /**
   * Query ChromaDB with enhanced context for better results
   */
  async queryWithVisualContext(
    query: string,
    platform: 'coreldraw' | 'blender',
    limit: number = 5
  ): Promise<any> {
    try {
      // Get enhanced context
      const context = await this.contextAnalyzer.getEnhancedContext();
      
      // Build enhanced query
      const enhancedQuery = this.buildEnhancedQueryWithVisual(query, context);
      
      this.logger.debug(`Enhanced query: ${enhancedQuery}`);
      
      // Query ChromaDB with enhanced query
      const results = await this.chromaService.queryApiDocumentation(
        enhancedQuery,
        platform,
        limit
      );
      
      // Apply visual context-based reweighing to results
      return this.reweighResultsByVisualContext(results, context);
    } catch (error) {
      this.logger.error(`Error querying with visual context: ${error.message}`);
      
      // Fall back to regular query
      return this.chromaService.queryApiDocumentation(query, platform, limit);
    }
  }
  
  /**
   * Build a query enhanced with visual context
   */
  private buildEnhancedQueryWithVisual(query: string, context: DesignContext & { visualAnalysis?: any }): string {
    // Start with the original query
    let enhancedQuery = query;
    
    // Add basic context
    enhancedQuery += ` platform:${context.platform}`;
    
    // Add selected elements information
    if (context.selectedElements && context.selectedElements.length > 0) {
      const elementTypes = new Set(context.selectedElements.map(el => el.type.toLowerCase()));
      elementTypes.forEach(type => {
        enhancedQuery += ` ${type}`;
      });
    }
    
    // Add visual context if available
    if (context.visualAnalysis) {
      // Add color information
      if (context.visualAnalysis.compositionAnalysis.colorPalette.length > 0) {
        // Add color descriptions
        enhancedQuery += ` colors:${context.visualAnalysis.compositionAnalysis.colorPalette.join(',')}`;
      }
      
      // Add composition analysis
      enhancedQuery += ` layout:${context.visualAnalysis.compositionAnalysis.visualBalance}`;
      enhancedQuery += ` space:${context.visualAnalysis.compositionAnalysis.negativeSpace}`;
    }
    
    return enhancedQuery;
  }
  
  /**
   * Reweigh search results based on visual context
   */
  private reweighResultsByVisualContext(results: any, context: DesignContext & { visualAnalysis?: any }): any {
    if (!results.metadatas || !results.distances || !context.visualAnalysis) {
      return results;
    }
    
    // Copy results
    const reweighedResults = { ...results };
    
    // Get the first set of distances (assuming we're only working with one query)
    const distances = [...reweighedResults.distances[0]];
    const metadatas = reweighedResults.metadatas[0];
    
    // Apply weight factor based on visual context
    for (let i = 0; i < distances.length; i++) {
      let weightFactor = 1.0; // Default (no change)
      const metadata = metadatas[i];
      
      // Check if metadata contains relevant keys
      if (metadata.elementType && context.selectedElements.some(el => el.type.toLowerCase() === metadata.elementType.toLowerCase())) {
        weightFactor *= 0.8; // Boost relevant element types (lower distance = higher relevance)
      }
      
      // If metadata contains visual properties that match our context
      if (metadata.visualProperties) {
        // Check color relation
        if (metadata.visualProperties.color && context.visualAnalysis.compositionAnalysis.colorPalette.includes(metadata.visualProperties.color)) {
          weightFactor *= 0.8;
        }
        
        // Check layout relation
        if (metadata.visualProperties.layout === context.visualAnalysis.compositionAnalysis.visualBalance) {
          weightFactor *= 0.9;
        }
      }
      
      // Apply weight factor
      distances[i] *= weightFactor;
    }
    
    // Update distances in the results
    reweighedResults.distances = [distances];
    
    return reweighedResults;
  }
  
  /**
   * Build a textual description of the design context
   */
  private buildDesignContextDescription(context: DesignContext): string {
    const lines = [
      `Current design context:`,
      `Document: ${context.documentName} (${context.platform})`,
      `Size: ${context.size.width}x${context.size.height}${context.size.depth ? 'x' + context.size.depth : ''}`
    ];
    
    // Add selected elements
    if (context.selectedElements.length > 0) {
      lines.push('Selected elements:');
      context.selectedElements.forEach(elem => {
        lines.push(`- ${elem.name} (${elem.type}) at position (${elem.position.x}, ${elem.position.y}${elem.position.z ? ', ' + elem.position.z : ''})`);
      });
    }
    
    // Count elements by type
    const elementCounts: Record<string, number> = {};
    context.layers.forEach(layer => {
      layer.elements.forEach(elem => {
        elementCounts[elem.type] = (elementCounts[elem.type] || 0) + 1;
      });
    });
    
    lines.push('Document contains:');
    Object.entries(elementCounts).forEach(([type, count]) => {
      lines.push(`- ${count} ${type}${count !== 1 ? 's' : ''}`);
    });
    
    return lines.join('\n');
  }
  
  /**
   * Build a textual description of the visual context
   */
  private buildVisualContextDescription(context: DesignContext & { visualAnalysis?: any }): string {
    if (!context.visualAnalysis) {
      return '';
    }
    
    const visual = context.visualAnalysis;
    
    const lines = [
      `Visual design analysis:`,
      `Color palette: ${visual.compositionAnalysis.colorPalette.join(', ')}`,
      `Visual balance: The design is ${visual.compositionAnalysis.visualBalance}`,
      `Negative space: ${visual.compositionAnalysis.negativeSpace}`,
      `Composition: The document contains ${visual.recognizedElements.length} visually recognizable elements`
    ];
    
    if (visual.recognizedElements.length > 0) {
      lines.push(`Visually dominant elements:`);
      
      // Sort elements by size (area) for visual dominance
      const sortedElements = [...visual.recognizedElements].sort((a, b) => {
        const areaA = a.boundingBox.width * a.boundingBox.height;
        const areaB = b.boundingBox.width * b.boundingBox.height;
        return areaB - areaA; // Descending order
      });
      
      // Include top 3 dominant elements
      sortedElements.slice(0, 3).forEach(element => {
        const dominantColor = element.visualProperties.dominantColor || 'unknown color';
        lines.push(`- ${element.type} (${dominantColor}) with dimensions ${element.boundingBox.width}x${element.boundingBox.height}`);
      });
    }
    
    return lines.join('\n');
  }
} 