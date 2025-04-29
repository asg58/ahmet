import { Injectable, Logger } from '@nestjs/common';
import { DesignContext } from './design-context';
import { DesignContextAnalyzerService } from './design-context-analyzer.service';
import { ChromaService } from '../../chroma/chroma.service';
import { ContextAwareQueryService } from './context-aware-query.service';
import { ChatMessage } from '../../ollama/ollama.service';

/**
 * Enhanced Context Query Service
 * 
 * This service combines the design context analyzer with the context-aware query service
 * to provide more sophisticated context-enhanced queries and AI prompts.
 */
@Injectable()
export class EnhancedContextQueryService {
  private readonly logger = new Logger(EnhancedContextQueryService.name);
  
  constructor(
    private readonly designContextAnalyzer: DesignContextAnalyzerService,
    private readonly contextAwareQueryService: ContextAwareQueryService,
    private readonly chromaService: ChromaService
  ) {
    this.logger.log('EnhancedContextQueryService initialized');
  }
  
  /**
   * Build a rich AI prompt with comprehensive context from the design document
   */
  async buildEnhancedPromptWithContext(
    basePrompt: string,
    platform: 'coreldraw' | 'blender',
    conversationHistory: ChatMessage[] = []
  ): Promise<ChatMessage[]> {
    try {
      // Start analyzing the design context
      await this.designContextAnalyzer.startAnalyzing(platform);
      
      // Get the enhanced context with visual analysis
      const enhancedContext = await this.designContextAnalyzer.getEnhancedContext();
      
      // Get full context analysis
      const contextAnalysis = await this.designContextAnalyzer.analyzeCurrentDesignContext();
      
      // Build a more sophisticated system prompt
      const enhancedSystemPrompt = this.buildSystemPromptWithAnalysis(
        basePrompt,
        enhancedContext,
        contextAnalysis
      );
      
      // Create the message array
      const promptMessages: ChatMessage[] = [
        { role: 'system', content: enhancedSystemPrompt }
      ];
      
      // Add context info about element relationships
      if (contextAnalysis.analysis?.elementRelationships?.relationships?.length > 0) {
        promptMessages.push({
          role: 'system',
          content: `Important design relationships detected: ${contextAnalysis.analysis.elementRelationships.summary}`
        });
      }
      
      // Add context info about style patterns
      if (contextAnalysis.analysis?.stylePatterns?.length > 0) {
        const patternDesc = contextAnalysis.analysis.stylePatterns
          .slice(0, 3)
          .map(p => `${p.count} elements (${Math.round(p.percentage)}%) share similar styling`)
          .join('; ');
        
        promptMessages.push({
          role: 'system',
          content: `Document style patterns: ${patternDesc}`
        });
      }
      
      // Add suggestions based on context
      if (contextAnalysis.analysis?.suggestedOperations?.length > 0) {
        const suggestionsText = contextAnalysis.analysis.suggestedOperations
          .map(s => `${s.operation} (confidence: ${s.confidence}) - ${s.reason}`)
          .join('\n');
        
        promptMessages.push({
          role: 'system',
          content: `Suggested operations based on design context:\n${suggestionsText}`
        });
      }
      
      // Visual analysis if available
      if (enhancedContext.visualAnalysis) {
        promptMessages.push({
          role: 'system',
          content: `Visual analysis: ${enhancedContext.visualAnalysis.compositionAnalysis.visualBalance} composition with ${enhancedContext.visualAnalysis.compositionAnalysis.negativeSpace} negative space. Color palette includes ${enhancedContext.visualAnalysis.compositionAnalysis.colorPalette.join(', ')}.`
        });
      }
      
      // Add conversation history
      if (conversationHistory.length > 0) {
        promptMessages.push(...conversationHistory);
      }
      
      return promptMessages;
    } catch (error) {
      this.logger.error(`Error building enhanced prompt: ${error.message}`);
      
      // Fall back to basic context-aware prompt
      return this.contextAwareQueryService.buildPromptWithContext(
        basePrompt,
        await this.getCurrentContext(platform),
        conversationHistory
      );
    }
  }
  
  /**
   * Query ChromaDB with enhanced context information for more relevant results
   */
  async queryWithEnhancedContext(
    query: string,
    platform: 'coreldraw' | 'blender',
    collectionName: string,
    numResults: number = 5
  ): Promise<any[]> {
    try {
      // Get the enhanced context
      const enhancedContext = await this.designContextAnalyzer.getEnhancedContext();
      
      // Analyze the context to identify important elements, relationships, and patterns
      const contextAnalysis = await this.designContextAnalyzer.analyzeCurrentDesignContext();
      
      // Build an enhanced query by incorporating context analysis
      const enhancedQuery = this.buildEnhancedQueryFromAnalysis(
        query,
        enhancedContext,
        contextAnalysis
      );
      
      this.logger.debug(`Enhanced query: ${enhancedQuery}`);
      
      // Query ChromaDB with enhanced query
      const results = await this.chromaService.queryCollection(
        collectionName,
        enhancedQuery,
        numResults
      );
      
      // Reweight results based on context relevance
      const reweightedResults = this.reweightResultsByContextRelevance(
        results,
        enhancedContext,
        contextAnalysis
      );
      
      return reweightedResults;
    } catch (error) {
      this.logger.error(`Error in enhanced context query: ${error.message}`);
      
      // Fall back to basic context-aware query
      const basicContext = await this.getCurrentContext(platform);
      const enhancedQuery = this.contextAwareQueryService.enhanceQueryWithContext(
        query,
        basicContext
      );
      
      return this.chromaService.queryCollection(
        collectionName,
        enhancedQuery,
        numResults
      );
    }
  }
  
  /**
   * Get current context for the specified platform
   */
  private async getCurrentContext(platform: 'coreldraw' | 'blender'): Promise<DesignContext> {
    // Start the analyzer if not already active
    await this.designContextAnalyzer.startAnalyzing(platform);
    
    // Get the enhanced context
    return this.designContextAnalyzer.getEnhancedContext();
  }
  
  /**
   * Build a rich system prompt incorporating analysis results
   */
  private buildSystemPromptWithAnalysis(
    basePrompt: string,
    context: DesignContext,
    analysis: Record<string, any>
  ): string {
    // Combine the base prompt with context information
    let prompt = `${basePrompt}\n\n`;
    
    prompt += `Current design context:\n`;
    prompt += `- Document: ${context.documentName} (${context.platform})\n`;
    prompt += `- Document size: ${context.size.width}x${context.size.height}\n`;
    
    // Add platform-specific details
    if (context.platform === 'coreldraw') {
      prompt += `- Current page: ${context.currentPage || 1}\n`;
    } else {
      prompt += `- Current frame: ${context.currentFrame || 1}\n`;
    }
    
    // Add selection information
    if (context.selectedElements && context.selectedElements.length > 0) {
      prompt += `- Selected elements: ${context.selectedElements.length} elements\n`;
      prompt += `  Types: ${[...new Set(context.selectedElements.map(el => el.type))].join(', ')}\n`;
    } else {
      prompt += `- No elements currently selected\n`;
    }
    
    // Add document structure information from analysis
    if (analysis.analysis?.documentStructure) {
      const docStructure = analysis.analysis.documentStructure;
      prompt += `- Document structure: ${docStructure.totalElements} total elements\n`;
      
      if (docStructure.elementCounts) {
        prompt += `  Element counts: ${Object.entries(docStructure.elementCounts)
          .map(([type, count]) => `${count} ${type}(s)`)
          .join(', ')}\n`;
      }
      
      if (docStructure.layerCount) {
        prompt += `  Layers: ${docStructure.layerCount}\n`;
      }
    }
    
    // Add anomalies information if present
    if (analysis.analysis?.unusualElements?.length > 0) {
      const anomalies = analysis.analysis.unusualElements;
      prompt += `- Document anomalies detected: ${anomalies.length}\n`;
      const anomalyTypes = [...new Set(anomalies.map(a => a.type))];
      prompt += `  Types: ${anomalyTypes.join(', ')}\n`;
    }
    
    return prompt;
  }
  
  /**
   * Build an enhanced query by incorporating context analysis
   */
  private buildEnhancedQueryFromAnalysis(
    baseQuery: string,
    context: DesignContext,
    analysis: Record<string, any>
  ): string {
    // Start with the original query
    let enhancedQuery = baseQuery;
    
    // Add platform information
    enhancedQuery += ` in ${context.platform}`;
    
    // Add selection context
    if (context.selectedElements?.length > 0) {
      const selectionTypes = [...new Set(context.selectedElements.map(el => el.type.toLowerCase()))];
      enhancedQuery += ` with selected ${selectionTypes.join(', ')}`;
    }
    
    // Add document structure context
    if (analysis.analysis?.documentStructure) {
      const docStruct = analysis.analysis.documentStructure;
      
      if (docStruct.elementCounts) {
        // Find the most common element type
        let mostCommonType = '';
        let highestCount = 0;
        
        Object.entries(docStruct.elementCounts).forEach(([type, count]) => {
          if (count > highestCount) {
            mostCommonType = type;
            highestCount = count;
          }
        });
        
        if (mostCommonType) {
          enhancedQuery += ` with mostly ${mostCommonType} elements`;
        }
      }
    }
    
    // Add style pattern context
    if (analysis.analysis?.stylePatterns?.length > 0) {
      // Extract the most dominant style pattern
      const dominantPattern = analysis.analysis.stylePatterns[0];
      if (dominantPattern.percentage > 20) {
        // Only include if it's a significant pattern (>20% of elements)
        enhancedQuery += ` with consistent styling`;
      }
    }
    
    // Trim extra spaces and return
    return enhancedQuery.replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Reweight search results based on context relevance
   */
  private reweightResultsByContextRelevance(
    results: any[],
    context: DesignContext,
    analysis: Record<string, any>
  ): any[] {
    if (!results || results.length === 0) {
      return results;
    }
    
    // Create a copy of results to modify
    const reweightedResults = [...results];
    
    // Extract current context elements for relevance checking
    const contextElements = context.selectedElements || [];
    const elementTypes = new Set(contextElements.map(el => el.type.toLowerCase()));
    
    // Reweight based on type relevance
    reweightedResults.forEach(result => {
      // Check if the result metadata contains types that match our current context
      if (result.metadata) {
        // Check for type matches
        if (result.metadata.types) {
          const resultTypes = Array.isArray(result.metadata.types) 
            ? result.metadata.types 
            : [result.metadata.types];
          
          // Boost score for each matching type
          let typeBoost = 0;
          for (const type of resultTypes) {
            if (elementTypes.has(type.toLowerCase())) {
              typeBoost += 0.1; // 10% boost per matching type
            }
          }
          
          // Apply the boost
          if (typeBoost > 0 && result.score) {
            result.score *= (1 + typeBoost);
            result.distance = 1 - result.score; // Adjust distance accordingly
          }
        }
        
        // Boost based on platform match
        if (result.metadata.platform && result.metadata.platform === context.platform) {
          if (result.score) {
            result.score *= 1.2; // 20% boost for platform-specific content
            result.distance = 1 - result.score;
          }
        }
      }
    });
    
    // Sort by adjusted score (descending)
    reweightedResults.sort((a, b) => {
      if (a.score !== undefined && b.score !== undefined) {
        return b.score - a.score;
      }
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });
    
    return reweightedResults;
  }
} 