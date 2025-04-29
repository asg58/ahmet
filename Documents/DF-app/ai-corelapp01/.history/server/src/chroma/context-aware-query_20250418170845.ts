import { Injectable, Logger } from '@nestjs/common';
import { ChromaService } from './chroma.service';
import { DesignContext } from '../software/context/design-context';

/**
 * Context-aware query builder for ChromaDB
 * 
 * Enhances queries to ChromaDB by incorporating the current design context
 * to improve relevance of results.
 */
@Injectable()
export class ContextAwareQueryBuilder {
  private readonly logger = new Logger(ContextAwareQueryBuilder.name);
  
  constructor(private readonly chromaService: ChromaService) {}
  
  /**
   * Query API documentation with context enhancement
   * 
   * @param query The base query text
   * @param context The current design context
   * @param platform The platform to query (coreldraw, blender, or undefined for both)
   * @param limit Maximum number of results to return
   * @returns Enhanced query results
   */
  async queryApiDocs(
    query: string,
    context?: DesignContext,
    platform?: 'coreldraw' | 'blender',
    limit: number = 5
  ) {
    // Start with the original query
    let enhancedQuery = query;
    
    // Add context information if available
    if (context) {
      enhancedQuery = this.enhanceQueryWithContext(query, context);
    }
    
    this.logger.debug(`Enhanced query: ${enhancedQuery}`);
    
    // Query ChromaDB
    const results = await this.chromaService.queryApiDocumentation(
      enhancedQuery,
      platform,
      limit
    );
    
    return results;
  }
  
  /**
   * Query API documentation with design context from software service
   * 
   * @param query The base query text
   * @param platform The platform to query (coreldraw or blender)
   * @param softwareService The software service that provides the design context
   * @param limit Maximum number of results to return
   * @returns Enhanced query results with context from the current design software
   */
  async queryWithSoftwareContext(
    query: string,
    platform: 'coreldraw' | 'blender',
    softwareService: any,
    limit: number = 5
  ) {
    try {
      // Get current design context from software service
      const context = await softwareService.getDesignContext();
      
      // Use the context to enhance the query
      return this.queryApiDocs(query, context, platform, limit);
    } catch (error) {
      this.logger.error(`Error getting design context: ${error.message}`, error.stack);
      // Fall back to regular query without context
      return this.queryApiDocs(query, undefined, platform, limit);
    }
  }
  
  /**
   * Enhance a query with context information
   * 
   * @param query Original query
   * @param context Design context
   * @returns Enhanced query
   */
  private enhanceQueryWithContext(query: string, context: DesignContext): string {
    const contextualTerms: string[] = [];
    
    // Add document type
    if (context.platform) {
      contextualTerms.push(context.platform);
    }
    
    // Add selected elements types
    if (context.selectedElements && context.selectedElements.length > 0) {
      const selectionTypes = new Set(context.selectedElements.map(el => el.type));
      selectionTypes.forEach(type => contextualTerms.push(type));
    }
    
    // Add current action information
    if (context.lastAction) {
      contextualTerms.push(context.lastAction.type);
    }
    
    // Combine original query with context
    if (contextualTerms.length > 0) {
      return `${query} ${contextualTerms.join(' ')}`;
    }
    
    return query;
  }
  
  /**
   * Query conversation memory with context enhancement
   * 
   * @param query The base query text
   * @param sessionId The chat session ID
   * @param context The current design context
   * @param limit Maximum number of results to return
   * @returns Enhanced query results
   */
  async queryConversationMemory(
    query: string,
    sessionId: string,
    context?: DesignContext,
    limit: number = 10
  ) {
    // Start with the original query
    let enhancedQuery = query;
    
    // Add context information if available
    if (context) {
      enhancedQuery = this.enhanceQueryWithContext(query, context);
    }
    
    this.logger.debug(`Enhanced memory query: ${enhancedQuery}`);
    
    // Query ChromaDB
    const results = await this.chromaService.queryConversationMemory(
      enhancedQuery,
      sessionId,
      limit
    );
    
    return results;
  }
  
  /**
   * Weight results based on context
   * 
   * @param results The ChromaDB results
   * @param context The current design context
   * @returns Weighted results
   */
  reweightResultsByContext(results: any, context: DesignContext): any {
    if (!results.ids || !results.documents || !results.distances) {
      return results;
    }
    
    // Create weighted distances
    const weightedDistances = [...results.distances[0]];
    const metadatas = results.metadatas[0];
    
    // Apply weighting factors based on context matching
    for (let i = 0; i < metadatas.length; i++) {
      const metadata = metadatas[i];
      let weightFactor = 1.0; // Default weight factor (no change)
      
      // Boost platform-specific results
      if (metadata.platform === context.platform) {
        weightFactor *= 0.8; // Lower distance = higher ranking
      }
      
      // Boost results related to selected element types
      if (context.selectedElements && context.selectedElements.length > 0) {
        const selectionTypes = new Set(context.selectedElements.map(el => el.type));
        if (metadata.type && selectionTypes.has(metadata.type)) {
          weightFactor *= 0.7;
        }
      }
      
      // Apply the weight factor to the distance
      weightedDistances[i] *= weightFactor;
    }
    
    // Create a copy of the results with the weighted distances
    const weightedResults = {
      ...results,
      originalDistances: results.distances,
      distances: [weightedDistances],
    };
    
    return weightedResults;
  }
} 