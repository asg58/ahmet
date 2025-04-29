import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CorelContextAnalyzer } from './corel-context';
import { BlenderContextAnalyzer } from './blender-context';
import { DesignContext, ContextUpdate } from './design-context';
import { ChromaService } from '../../chroma/chroma.service';

interface ElementVisualInfo {
  id: string;
  type: string;
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  visualProperties: {
    dominantColor?: string;
    contrastColor?: string;
    aspectRatio?: number;
    visualComplexity?: 'low' | 'medium' | 'high';
  };
}

interface VisualAnalysisResult {
  screenshot: string; // Base64 encoded
  timestamp: number;
  documentDimensions: {
    width: number;
    height: number;
  };
  recognizedElements: ElementVisualInfo[];
  compositionAnalysis: {
    focusPoint?: { x: number; y: number };
    colorPalette: string[];
    visualBalance: 'left-heavy' | 'right-heavy' | 'top-heavy' | 'bottom-heavy' | 'balanced';
    negativeSpace: 'minimal' | 'moderate' | 'abundant';
  };
}

/**
 * DesignContextAnalyzer
 * 
 * Enhanced service for analyzing the design context with visual/screenshot capabilities
 * and integration with ChromaDB for contextual query improvement
 */
@Injectable()
export class DesignContextAnalyzerService {
  private readonly logger = new Logger(DesignContextAnalyzerService.name);
  private activeAnalyzer: 'coreldraw' | 'blender' | null = null;
  private lastVisualAnalysis: VisualAnalysisResult | null = null;
  private analysisInterval: NodeJS.Timeout | null = null;
  private readonly ANALYSIS_FREQUENCY = 5000; // ms

  constructor(
    private readonly corelContextAnalyzer: CorelContextAnalyzer,
    private readonly blenderContextAnalyzer: BlenderContextAnalyzer,
    private readonly chromaService: ChromaService,
    private readonly eventEmitter: EventEmitter2
  ) {
    // Listen for context updates to trigger visual analysis
    this.eventEmitter.on('context.updated', this.handleContextUpdate.bind(this));
  }

  /**
   * Start capturing and analyzing design context for a specific platform
   */
  async startAnalyzing(platform: 'coreldraw' | 'blender'): Promise<void> {
    this.logger.log(`Starting design context analysis for ${platform}`);
    
    // Stop any existing analysis
    await this.stopAnalyzing();
    
    // Start tracking context changes on the specified platform
    const contextAnalyzer = this.getContextAnalyzerForPlatform(platform);
    await contextAnalyzer.startContextTracking(this.handleContextUpdate.bind(this));
    
    // Start periodic visual analysis
    this.startPeriodicVisualAnalysis(platform);
    
    this.activeAnalyzer = platform;
  }

  /**
   * Stop context analysis
   */
  async stopAnalyzing(): Promise<void> {
    if (!this.activeAnalyzer) return;
    
    const contextAnalyzer = this.getContextAnalyzerForPlatform(this.activeAnalyzer);
    await contextAnalyzer.stopContextTracking();
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    this.activeAnalyzer = null;
  }

  /**
   * Get the current context with enhanced visual analysis
   */
  async getEnhancedContext(): Promise<DesignContext & { visualAnalysis?: VisualAnalysisResult }> {
    if (!this.activeAnalyzer) {
      throw new Error('No active context analyzer');
    }
    
    // Get base context
    const contextAnalyzer = this.getContextAnalyzerForPlatform(this.activeAnalyzer);
    const context = await contextAnalyzer.captureContext({ includeScreenshot: true });
    
    // Add visual analysis if available
    if (this.lastVisualAnalysis) {
      return {
        ...context,
        visualAnalysis: this.lastVisualAnalysis
      };
    }
    
    return context;
  }

  /**
   * Capture a screenshot and perform visual analysis
   */
  async captureAndAnalyzeVisual(platform: 'coreldraw' | 'blender'): Promise<VisualAnalysisResult> {
    this.logger.debug(`Capturing and analyzing visual for ${platform}`);
    
    const contextAnalyzer = this.getContextAnalyzerForPlatform(platform);
    
    try {
      // Capture context with screenshot
      const context = await contextAnalyzer.captureContext({ 
        includeScreenshot: true,
        detailLevel: 'full'
      });
      
      if (!context.screenshot) {
        throw new Error('Failed to capture screenshot');
      }
      
      // Perform visual analysis
      const visualAnalysis = await this.analyzeScreenshot(context);
      
      // Store the analysis
      this.lastVisualAnalysis = visualAnalysis;
      
      // Store in ChromaDB for future reference
      await this.storeVisualAnalysisInChroma(visualAnalysis, platform);
      
      // Emit event for other services
      this.eventEmitter.emit('context.visualAnalyzed', visualAnalysis);
      
      return visualAnalysis;
    } catch (error) {
      this.logger.error(`Error capturing visual: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start periodic visual analysis
   */
  private startPeriodicVisualAnalysis(platform: 'coreldraw' | 'blender'): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }
    
    // Perform initial analysis
    this.captureAndAnalyzeVisual(platform).catch(err => 
      this.logger.error(`Initial visual analysis failed: ${err.message}`)
    );
    
    // Set up periodic analysis
    this.analysisInterval = setInterval(() => {
      if (this.activeAnalyzer) {
        this.captureAndAnalyzeVisual(this.activeAnalyzer).catch(err => 
          this.logger.error(`Periodic visual analysis failed: ${err.message}`)
        );
      }
    }, this.ANALYSIS_FREQUENCY);
  }

  /**
   * Analyze a screenshot to extract visual information
   */
  private async analyzeScreenshot(context: DesignContext): Promise<VisualAnalysisResult> {
    this.logger.debug('Analyzing screenshot');
    
    // In a real implementation, we would use image processing libraries
    // For now, we'll create a simple mock analysis based on context data
    
    const recognizedElements: ElementVisualInfo[] = context.selectedElements.map(element => ({
      id: element.id,
      type: element.type,
      boundingBox: {
        top: element.position.y,
        left: element.position.x,
        width: element.size?.width || 100,
        height: element.size?.height || 100
      },
      visualProperties: {
        dominantColor: element.color ? 
          `rgb(${element.color.r}, ${element.color.g}, ${element.color.b})` : 
          '#CCCCCC',
        aspectRatio: element.size ? 
          element.size.width / element.size.height : 
          1,
        visualComplexity: 'medium'
      }
    }));
    
    // Extract dominant colors from elements
    const colorPalette = context.selectedElements
      .filter(element => element.color)
      .map(element => `rgb(${element.color.r}, ${element.color.g}, ${element.color.b})`)
      .filter((color, index, self) => self.indexOf(color) === index) // Remove duplicates
      .slice(0, 5); // Keep up to 5 colors
    
    if (colorPalette.length === 0) {
      colorPalette.push('#CCCCCC'); // Default gray if no colors found
    }
    
    return {
      screenshot: context.screenshot,
      timestamp: Date.now(),
      documentDimensions: {
        width: context.size.width,
        height: context.size.height
      },
      recognizedElements,
      compositionAnalysis: {
        colorPalette,
        visualBalance: this.analyzeVisualBalance(context),
        negativeSpace: this.analyzeNegativeSpace(context)
      }
    };
  }

  /**
   * Analyze the visual balance of elements in the document
   */
  private analyzeVisualBalance(context: DesignContext): 'left-heavy' | 'right-heavy' | 'top-heavy' | 'bottom-heavy' | 'balanced' {
    if (context.selectedElements.length === 0) {
      return 'balanced';
    }
    
    // Calculate center of the document
    const centerX = context.size.width / 2;
    const centerY = context.size.height / 2;
    
    // Calculate average position of elements
    let totalX = 0;
    let totalY = 0;
    
    context.selectedElements.forEach(element => {
      totalX += element.position.x + (element.size?.width || 0) / 2;
      totalY += element.position.y + (element.size?.height || 0) / 2;
    });
    
    const avgX = totalX / context.selectedElements.length;
    const avgY = totalY / context.selectedElements.length;
    
    // Determine balance based on average position
    if (Math.abs(avgX - centerX) < centerX * 0.2 && Math.abs(avgY - centerY) < centerY * 0.2) {
      return 'balanced';
    } else if (avgX < centerX) {
      return 'left-heavy';
    } else if (avgY < centerY) {
      return 'top-heavy';
    } else if (avgX > centerX) {
      return 'right-heavy';
    } else {
      return 'bottom-heavy';
    }
  }

  /**
   * Analyze the amount of negative space in the document
   */
  private analyzeNegativeSpace(context: DesignContext): 'minimal' | 'moderate' | 'abundant' {
    // Calculate total area of document
    const totalArea = context.size.width * context.size.height;
    
    // Calculate total area of elements
    let elementArea = 0;
    context.selectedElements.forEach(element => {
      if (element.size) {
        elementArea += element.size.width * element.size.height;
      }
    });
    
    // Calculate ratio of element area to total area
    const ratio = elementArea / totalArea;
    
    if (ratio > 0.5) {
      return 'minimal';
    } else if (ratio > 0.2) {
      return 'moderate';
    } else {
      return 'abundant';
    }
  }

  /**
   * Store visual analysis in ChromaDB
   */
  private async storeVisualAnalysisInChroma(analysis: VisualAnalysisResult, platform: 'coreldraw' | 'blender'): Promise<void> {
    try {
      // Create text description of the visual analysis
      const description = this.visualAnalysisToText(analysis);
      
      // Store in ChromaDB
      await this.chromaService.addConversationMemory(
        `visual_${platform}`,
        description,
        {
          type: 'visual_analysis',
          platform,
          timestamp: analysis.timestamp,
          documentDimensions: analysis.documentDimensions,
          colorPalette: analysis.compositionAnalysis.colorPalette
        }
      );
    } catch (error) {
      this.logger.error(`Failed to store visual analysis in ChromaDB: ${error.message}`);
    }
  }

  /**
   * Convert visual analysis to text for storage and LLM context
   */
  private visualAnalysisToText(analysis: VisualAnalysisResult): string {
    const lines = [
      `Document visual analysis at ${new Date(analysis.timestamp).toISOString()}`,
      `Dimensions: ${analysis.documentDimensions.width}x${analysis.documentDimensions.height}`,
      `Color palette: ${analysis.compositionAnalysis.colorPalette.join(', ')}`,
      `Visual balance: ${analysis.compositionAnalysis.visualBalance}`,
      `Negative space: ${analysis.compositionAnalysis.negativeSpace}`,
      `Recognized elements (${analysis.recognizedElements.length}):`
    ];
    
    analysis.recognizedElements.forEach(element => {
      lines.push(`- ${element.type} (${element.id}) at position (${element.boundingBox.left}, ${element.boundingBox.top}), size ${element.boundingBox.width}x${element.boundingBox.height}`);
    });
    
    return lines.join('\n');
  }

  /**
   * Handle context updates from trackers
   */
  private handleContextUpdate(update: ContextUpdate): void {
    this.logger.debug(`Context update received, trigger visual analysis if significant`);
    
    // Check if this is a significant update that requires visual analysis
    const isSignificantUpdate = this.isSignificantContextUpdate(update);
    
    if (isSignificantUpdate && this.activeAnalyzer) {
      // Trigger visual analysis
      this.captureAndAnalyzeVisual(this.activeAnalyzer).catch(err => 
        this.logger.error(`Visual analysis after context update failed: ${err.message}`)
      );
    }
  }

  /**
   * Determine if a context update is significant enough to trigger visual analysis
   */
  private isSignificantContextUpdate(update: ContextUpdate): boolean {
    // Check if there are significant changes
    const hasAddedElements = update.changes.added && update.changes.added.length > 0;
    const hasRemovedElements = update.changes.removed && update.changes.removed.length > 0;
    const hasModifiedElements = update.changes.modified && update.changes.modified.length > 0;
    const hasSelectionChanges = 
      (update.changes.selected && update.changes.selected.length > 0) ||
      (update.changes.deselected && update.changes.deselected.length > 0);
    
    return hasAddedElements || hasRemovedElements || hasModifiedElements || hasSelectionChanges;
  }

  /**
   * Get the context analyzer for a specific platform
   */
  private getContextAnalyzerForPlatform(platform: 'coreldraw' | 'blender'): CorelContextAnalyzer | BlenderContextAnalyzer {
    if (platform === 'coreldraw') {
      return this.corelContextAnalyzer;
    } else if (platform === 'blender') {
      return this.blenderContextAnalyzer;
    }
    
    throw new Error(`Unsupported platform: ${platform}`);
  }
} 