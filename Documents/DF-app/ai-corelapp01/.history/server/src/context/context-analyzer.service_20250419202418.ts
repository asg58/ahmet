/**
 * Context Analyzer Service
 * 
 * Central service for analyzing design context and providing context-aware functionality.
 * This service integrates with platform-specific context trackers to provide a unified
 * view of the design context across different platforms.
 */

import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawContextTracker } from './coreldraw-context-tracker';
import { BlenderContextTracker } from './blender-context-tracker';
import { DesignContext, ContextUpdate } from './context-tracker.interface';
import { ChromaService } from '../chroma/chroma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Result of context analysis
 */
export interface ContextAnalysisResult {
  /**
   * The current context
   */
  context: DesignContext;
  
  /**
   * The dominant element types in the design
   */
  dominantElements: string[];
  
  /**
   * Suggested actions based on context
   */
  suggestedActions: string[];
  
  /**
   * Relevant documentation based on context
   */
  relevantDocumentation: Array<{
    title: string;
    source: string;
    relevance: number;
  }>;
  
  /**
   * Visual summary of the design
   */
  visualSummary?: {
    thumbnailUrl: string;
    elementCount: number;
    complexity: 'low' | 'medium' | 'high';
  };
}

/**
 * Element information extracted from context
 */
interface ElementInfo {
  id: string;
  type: string;
  properties?: Record<string, any>;
}

/**
 * Cache configuration for context analysis
 */
interface CacheConfig {
  enabled: boolean;
  ttlMs: number;
}

@Injectable()
export class ContextAnalyzerService {
  private readonly logger = new Logger(ContextAnalyzerService.name);
  private activeTracker: 'coreldraw' | 'blender' | null = null;
  private analysisCache: {
    result: ContextAnalysisResult | null;
    timestamp: number;
  } = { result: null, timestamp: 0 };
  private readonly cacheConfig: CacheConfig = {
    enabled: true,
    ttlMs: 5000 // 5 seconds TTL for cached analysis
  };
  private isAnalyzing = false;
  private pendingAnalysisPromise: Promise<ContextAnalysisResult> | null = null;
  
  constructor(
    private readonly corelDrawTracker: CorelDrawContextTracker,
    private readonly blenderTracker: BlenderContextTracker,
    private readonly chromaService: ChromaService,
    private readonly eventEmitter: EventEmitter2
  ) {
    // Listen for context updates
    this.eventEmitter.on('context.updated', this.handleContextUpdate.bind(this));
  }
  
  /**
   * Start tracking context for the specified platform
   */
  async startTracking(platform: 'coreldraw' | 'blender'): Promise<void> {
    this.logger.log(`Starting context tracking for ${platform}`);
    
    // Stop any existing tracking
    await this.stopTracking();
    
    // Clear cached analysis
    this.clearAnalysisCache();
    
    // Start new tracking
    if (platform === 'coreldraw') {
      await this.corelDrawTracker.startTracking();
    } else if (platform === 'blender') {
      await this.blenderTracker.startTracking();
    }
    
    this.activeTracker = platform;
  }
  
  /**
   * Stop tracking context
   */
  async stopTracking(): Promise<void> {
    if (this.activeTracker === 'coreldraw') {
      await this.corelDrawTracker.stopTracking();
    } else if (this.activeTracker === 'blender') {
      await this.blenderTracker.stopTracking();
    }
    
    this.activeTracker = null;
    this.clearAnalysisCache();
  }
  
  /**
   * Get the current active tracker
   */
  getActiveTracker(): 'coreldraw' | 'blender' | null {
    return this.activeTracker;
  }
  
  /**
   * Analyze the current context.
   * This method uses caching to improve performance for frequent calls.
   */
  async analyzeCurrentContext(): Promise<ContextAnalysisResult> {
    // If no active tracker, throw error
    if (!this.activeTracker) {
      throw new Error('No active context tracker');
    }
    
    // If an analysis is already in progress, return the pending promise
    if (this.isAnalyzing && this.pendingAnalysisPromise) {
      this.logger.debug('Returning pending analysis promise');
      return this.pendingAnalysisPromise;
    }
    
    // Check if we have a valid cached result
    if (this.cacheConfig.enabled && this.isCacheValid()) {
      this.logger.debug('Returning cached analysis result');
      return this.analysisCache.result;
    }
    
    // Set analyzing flag
    this.isAnalyzing = true;
    
    // Perform new analysis
    try {
      this.pendingAnalysisPromise = this.performNewAnalysis();
      const result = await this.pendingAnalysisPromise;
      
      // Cache the result
      this.cacheAnalysisResult(result);
      
      return result;
    } finally {
      // Clear analyzing flag
      this.isAnalyzing = false;
      this.pendingAnalysisPromise = null;
    }
  }
  
  /**
   * Perform a new context analysis without using cache
   */
  private async performNewAnalysis(): Promise<ContextAnalysisResult> {
    let context: DesignContext;
    
    if (this.activeTracker === 'coreldraw') {
      context = await this.corelDrawTracker.getCurrentContext();
    } else if (this.activeTracker === 'blender') {
      context = await this.blenderTracker.getCurrentContext();
    } else {
      throw new Error('No active context tracker');
    }
    
    return this.performAnalysis(context);
  }
  
  /**
   * Capture a screenshot of the current design
   */
  async captureScreenshot(): Promise<{ data: string; format: string }> {
    if (this.activeTracker === 'coreldraw') {
      return this.corelDrawTracker.captureScreenshot();
    } else if (this.activeTracker === 'blender') {
      return this.blenderTracker.captureScreenshot();
    } else {
      throw new Error('No active context tracker');
    }
  }
  
  /**
   * Perform analysis on the given context
   */
  private async performAnalysis(context: DesignContext): Promise<ContextAnalysisResult> {
    this.logger.debug('Performing context analysis');
    
    // Extract key information from context
    const elements = this.extractElements(context);
    
    // Set up promises for parallel execution
    const promises = [
      this.findRelevantDocumentation(context),
      Promise.resolve(this.generateSuggestedActions(context, elements))
    ];
    
    // Execute promises in parallel
    const [relevantDocs, suggestedActions] = await Promise.all(promises);
    
    // Create result
    return {
      context,
      dominantElements: elements.map(e => e.type),
      suggestedActions,
      relevantDocumentation: relevantDocs,
      visualSummary: {
        thumbnailUrl: `/api/context/thumbnail?platform=${context.platform}&t=${Date.now()}`,
        elementCount: elements.length,
        complexity: this.determineComplexity(elements)
      }
    };
  }
  
  /**
   * Handle context updates from trackers
   */
  private handleContextUpdate(update: ContextUpdate): void {
    this.logger.debug(`Context update received: ${update.changeDescription}`);
    
    // Only clear cache for significant updates
    if (update.type === 'full') {
      this.clearAnalysisCache();
    }
    
    // Perform quick analysis
    this.performAnalysis(update.context as DesignContext)
      .then(result => {
        // Cache the result
        this.cacheAnalysisResult(result);
        
        // Emit analysis result
        this.eventEmitter.emit('context.analyzed', result);
      })
      .catch(error => {
        this.logger.error(`Error analyzing context: ${error.message}`);
      });
  }
  
  /**
   * Check if cached analysis is still valid
   */
  private isCacheValid(): boolean {
    const now = Date.now();
    return (
      this.analysisCache.result !== null &&
      now - this.analysisCache.timestamp < this.cacheConfig.ttlMs
    );
  }
  
  /**
   * Cache an analysis result
   */
  private cacheAnalysisResult(result: ContextAnalysisResult): void {
    this.analysisCache = {
      result,
      timestamp: Date.now()
    };
  }
  
  /**
   * Clear the analysis cache
   */
  private clearAnalysisCache(): void {
    this.analysisCache = {
      result: null,
      timestamp: 0
    };
  }
  
  /**
   * Extract element information from context
   */
  private extractElements(context: DesignContext): ElementInfo[] {
    // Implementation depends on platform
    if (context.platform === 'coreldraw') {
      return this.extractCorelDrawElements(context);
    } else if (context.platform === 'blender') {
      return this.extractBlenderElements(context);
    }
    
    return [];
  }
  
  /**
   * Extract elements from CorelDRAW context
   */
  private extractCorelDrawElements(context: DesignContext): ElementInfo[] {
    const result: ElementInfo[] = [];
    
    // In real implementation, would extract from selectedObjects and parse properties
    // For now, just create basic element infos from selected objects
    for (const objId of context.selectedObjects) {
      // Simple extraction based on object ID format
      // In real implementation, would get actual type from object model
      let type = 'unknown';
      
      if (objId.includes('Rectangle')) {
        type = 'rectangle';
      } else if (objId.includes('Ellipse')) {
        type = 'ellipse';
      } else if (objId.includes('Text')) {
        type = 'text';
      } else if (objId.includes('Curve')) {
        type = 'curve';
      } else if (objId.includes('Group')) {
        type = 'group';
      }
      
      result.push({
        id: objId,
        type
      });
    }
    
    return result;
  }
  
  /**
   * Extract elements from Blender context
   */
  private extractBlenderElements(context: DesignContext): ElementInfo[] {
    const result: ElementInfo[] = [];
    
    // In real implementation, would extract from selectedObjects and parse properties
    // For now, just create basic element infos from selected objects
    for (const objId of context.selectedObjects) {
      // Simple extraction based on object ID
      let type = 'unknown';
      
      if (objId.includes('Cube')) {
        type = 'cube';
      } else if (objId.includes('Sphere')) {
        type = 'sphere';
      } else if (objId.includes('Cylinder')) {
        type = 'cylinder';
      } else if (objId.includes('Camera')) {
        type = 'camera';
      } else if (objId.includes('Light')) {
        type = 'light';
      } else if (objId.includes('Armature')) {
        type = 'armature';
      }
      
      result.push({
        id: objId,
        type
      });
    }
    
    // Add object counts as pseudo-elements for context
    const counts = context.documentProperties['object_counts'] || {};
    for (const [type, count] of Object.entries(counts)) {
      if (count > 0) {
        result.push({
          id: `${type}_count`,
          type: `${type}_collection`,
          properties: { count }
        });
      }
    }
    
    return result;
  }
  
  /**
   * Find documentation relevant to the current context
   */
  private async findRelevantDocumentation(context: DesignContext): Promise<Array<{ title: string; source: string; relevance: number }>> {
    try {
      // Create context description for embedding search
      const contextDescription = this.createContextDescription(context);
      
      // Query ChromaDB for relevant docs
      const searchResults = await this.chromaService.queryCollection(
        `${context.platform}_docs`,
        contextDescription,
        5 // Get top 5 results
      );
      
      // Format results
      return searchResults.map(result => ({
        title: result.metadata?.title || 'Untitled',
        source: result.metadata?.source || 'Unknown',
        relevance: result.distance || 0.5
      }));
    } catch (error) {
      this.logger.error(`Error finding relevant documentation: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Create a text description of the context for embedding search
   */
  private createContextDescription(context: DesignContext): string {
    let description = `Platform: ${context.platform}. `;
    
    // Add selected objects
    if (context.selectedObjects.length > 0) {
      description += `Selected: ${context.selectedObjects.join(', ')}. `;
    } else {
      description += 'No selection. ';
    }
    
    // Add active layer/object
    if (context.activeLayer) {
      description += `Active: ${context.activeLayer}. `;
    }
    
    // Add document properties
    const docProps = context.documentProperties;
    if (docProps) {
      if (docProps.name) description += `Document: ${docProps.name}. `;
      
      if (context.platform === 'coreldraw') {
        if (docProps.width && docProps.height) {
          description += `Size: ${docProps.width} x ${docProps.height}. `;
        }
        if (docProps.pages) description += `Pages: ${docProps.pages}. `;
      } else if (context.platform === 'blender') {
        if (docProps.frame_current) {
          description += `Frame: ${docProps.frame_current}/${docProps.frame_end}. `;
        }
        if (docProps.render_engine) {
          description += `Render engine: ${docProps.render_engine}. `;
        }
      }
    }
    
    return description;
  }
  
  /**
   * Generate suggested actions based on context
   */
  private generateSuggestedActions(context: DesignContext, elements: ElementInfo[]): string[] {
    const actions: string[] = [];
    
    // Suggestions common for both platforms
    if (context.selectedObjects.length === 0) {
      actions.push('Select an object to edit');
    } else if (context.selectedObjects.length === 1) {
      actions.push('Edit the selected object');
    } else {
      actions.push('Group the selected objects');
    }
    
    // Platform-specific suggestions
    if (context.platform === 'coreldraw') {
      // CorelDRAW specific suggestions
      actions.push('Edit object properties');
      
      if (elements.some(e => e.type === 'text')) {
        actions.push('Edit text content');
        actions.push('Change font properties');
      }
      
      if (elements.some(e => e.type === 'rectangle' || e.type === 'ellipse')) {
        actions.push('Apply fill and outline');
      }
      
    } else if (context.platform === 'blender') {
      // Blender specific suggestions
      actions.push('Edit object transforms');
      
      if (elements.some(e => e.type === 'cube' || e.type === 'sphere' || e.type === 'cylinder')) {
        actions.push('Apply materials');
        actions.push('Edit mesh properties');
      }
      
      if (elements.some(e => e.type === 'camera')) {
        actions.push('Adjust camera settings');
      }
      
      if (elements.some(e => e.type === 'light')) {
        actions.push('Adjust lighting parameters');
      }
    }
    
    return actions;
  }
  
  /**
   * Determine the complexity of the design
   */
  private determineComplexity(elements: ElementInfo[]): 'low' | 'medium' | 'high' {
    const count = elements.length;
    
    if (count < 10) return 'low';
    if (count < 50) return 'medium';
    return 'high';
  }
} 