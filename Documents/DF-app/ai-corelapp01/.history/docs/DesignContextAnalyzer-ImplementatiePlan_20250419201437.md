# DesignContextAnalyzer - Implementatieplan

## Overzicht

De DesignContextAnalyzer is een cruciale component die real-time documentanalyse uitvoert om contextbewuste interacties mogelijk te maken. Deze component monitort de huidige staat van het ontwerpdocument, analyseert de structuur en stelt deze context beschikbaar voor AI-gestuurde beslissingen.

## Doelstellingen

1. Real-time tracking van documentstaat in CorelDRAW en Blender
2. Schermafbeelding-mechanisme voor visuele context
3. Design element herkenning en classificatie
4. Integratie met ChromaDB voor contextuele query verbetering

## Architectuur en Componenten

### 1. Core Context Trackers

```typescript
// server/src/context/context-tracker.interface.ts
export interface DesignContext {
  platform: 'coreldraw' | 'blender';
  timestamp: number;
  documentProperties: Record<string, any>;
  selectedObjects: string[];
  activeLayer?: string;
  viewProperties: {
    zoom: number;
    viewportCenter: [number, number];
    visibleObjects: string[];
  };
  customMetadata?: Record<string, any>;
}

export interface ContextUpdate {
  type: 'full' | 'partial';
  context: Partial<DesignContext>;
  changeDescription?: string;
}

export interface ContextTracker {
  startTracking(): Promise<void>;
  stopTracking(): Promise<void>;
  getCurrentContext(): Promise<DesignContext>;
  onContextUpdate(callback: (update: ContextUpdate) => void): void;
  captureScreenshot(): Promise<{ data: string; format: 'png' | 'jpeg' }>;
}
```

### 2. Platform-Specifieke Implementaties

#### 2.1 CorelDRAW Context Tracker

```typescript
// server/src/context/coreldraw-context-tracker.ts
import { Injectable, Logger } from '@nestjs/common';
import { ContextTracker, DesignContext, ContextUpdate } from './context-tracker.interface';
import { CorelDrawService } from '../software/coreldraw.service';
import { CorelDrawObjectModel } from '../software/universal/coreldraw-object-model';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CorelDrawContextTracker implements ContextTracker {
  private readonly logger = new Logger(CorelDrawContextTracker.name);
  private context: DesignContext;
  private trackingInterval: NodeJS.Timeout | null = null;
  private readonly pollInterval = 2000; // ms
  private callbacks: ((update: ContextUpdate) => void)[] = [];
  
  constructor(
    private readonly corelDrawService: CorelDrawService,
    private readonly objectModel: CorelDrawObjectModel,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.context = this.createEmptyContext();
  }
  
  private createEmptyContext(): DesignContext {
    return {
      platform: 'coreldraw',
      timestamp: Date.now(),
      documentProperties: {},
      selectedObjects: [],
      viewProperties: {
        zoom: 1.0,
        viewportCenter: [0, 0],
        visibleObjects: []
      }
    };
  }
  
  async startTracking(): Promise<void> {
    this.logger.log('Starting CorelDRAW context tracking');
    
    // Initial context capture
    await this.captureContext();
    
    // Setup polling
    this.trackingInterval = setInterval(async () => {
      try {
        await this.captureContext();
      } catch (error) {
        this.logger.error(`Error capturing context: ${error.message}`);
      }
    }, this.pollInterval);
    
    // Setup event listeners for real-time updates
    this.setupEventListeners();
  }
  
  async stopTracking(): Promise<void> {
    this.logger.log('Stopping CorelDRAW context tracking');
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    this.removeEventListeners();
  }
  
  async getCurrentContext(): Promise<DesignContext> {
    return this.context;
  }
  
  onContextUpdate(callback: (update: ContextUpdate) => void): void {
    this.callbacks.push(callback);
  }
  
  async captureScreenshot(): Promise<{ data: string; format: 'png' | 'jpeg' }> {
    try {
      const result = await this.corelDrawService.executeCode(`
        Function CaptureScreenshot()
          ' CorelDRAW code to capture screenshot
          ' This would use VBA to capture the current view
          ' For now, return dummy data
          CaptureScreenshot = "base64data..."
        End Function
      `);
      
      return {
        data: result.output || "base64data...",
        format: 'png'
      };
    } catch (error) {
      this.logger.error(`Error capturing screenshot: ${error.message}`);
      throw error;
    }
  }
  
  private async captureContext(): Promise<void> {
    try {
      const newContext = await this.fetchCurrentContext();
      const changes = this.detectChanges(this.context, newContext);
      
      if (changes.hasChanges) {
        const update: ContextUpdate = {
          type: changes.isSignificant ? 'full' : 'partial',
          context: newContext,
          changeDescription: changes.description
        };
        
        // Update stored context
        this.context = newContext;
        
        // Notify callbacks
        this.notifyCallbacks(update);
        
        // Emit event
        this.eventEmitter.emit('context.updated', update);
      }
    } catch (error) {
      this.logger.error(`Error in context capture: ${error.message}`);
    }
  }
  
  private async fetchCurrentContext(): Promise<DesignContext> {
    // Using UniversalObjectModel to get context info
    const modelContext = await this.objectModel.getCurrentContext();
    
    // Using direct CorelDRAW service for additional info
    const documentCode = `
      Function GetDocumentInfo()
        ' VBA code to extract document info
        ' Return as JSON
      End Function
    `;
    
    const documentResult = await this.corelDrawService.executeCode(documentCode);
    const documentInfo = this.parseResult(documentResult.output);
    
    return {
      platform: 'coreldraw',
      timestamp: Date.now(),
      documentProperties: documentInfo.properties || {},
      selectedObjects: modelContext.selectedObjects || [],
      activeLayer: modelContext.activeLayer,
      viewProperties: {
        zoom: documentInfo.zoom || 1.0,
        viewportCenter: documentInfo.center || [0, 0],
        visibleObjects: documentInfo.visible || []
      }
    };
  }
  
  private parseResult(result: string): any {
    try {
      return JSON.parse(result || '{}');
    } catch (error) {
      this.logger.error(`Error parsing result: ${error.message}`);
      return {};
    }
  }
  
  private detectChanges(oldContext: DesignContext, newContext: DesignContext): { 
    hasChanges: boolean; 
    isSignificant: boolean;
    description: string;
  } {
    // Implement change detection logic
    // Compare old and new context to detect changes
    // Real implementation would be more sophisticated
    
    // For now, assume always changing
    return {
      hasChanges: true,
      isSignificant: true,
      description: 'Document state changed'
    };
  }
  
  private notifyCallbacks(update: ContextUpdate): void {
    for (const callback of this.callbacks) {
      try {
        callback(update);
      } catch (error) {
        this.logger.error(`Error in context update callback: ${error.message}`);
      }
    }
  }
  
  private setupEventListeners(): void {
    // Setup event listeners for real-time updates
    // In real implementation, would add VBA event handlers
  }
  
  private removeEventListeners(): void {
    // Cleanup event listeners
  }
}
```

#### 2.2 Blender Context Tracker

```typescript
// server/src/context/blender-context-tracker.ts
import { Injectable, Logger } from '@nestjs/common';
import { ContextTracker, DesignContext, ContextUpdate } from './context-tracker.interface';
import { BlenderService } from '../software/blender.service';
import { BlenderObjectModel } from '../software/universal/blender-object-model';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class BlenderContextTracker implements ContextTracker {
  private readonly logger = new Logger(BlenderContextTracker.name);
  private context: DesignContext;
  private trackingInterval: NodeJS.Timeout | null = null;
  private readonly pollInterval = 2000; // ms
  private callbacks: ((update: ContextUpdate) => void)[] = [];
  
  constructor(
    private readonly blenderService: BlenderService,
    private readonly objectModel: BlenderObjectModel,
    private readonly eventEmitter: EventEmitter2
  ) {
    this.context = this.createEmptyContext();
  }
  
  // Implementation similar to CorelDrawContextTracker
  // ...
}
```

### 3. Central Context Analysis Service

```typescript
// server/src/context/context-analyzer.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawContextTracker } from './coreldraw-context-tracker';
import { BlenderContextTracker } from './blender-context-tracker';
import { DesignContext, ContextUpdate } from './context-tracker.interface';
import { ChromaService } from '../database/chroma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ContextAnalysisResult {
  context: DesignContext;
  dominantElements: string[];
  suggestedActions: string[];
  relevantDocumentation: Array<{
    title: string;
    source: string;
    relevance: number;
  }>;
  visualSummary?: {
    thumbnailUrl: string;
    elementCount: number;
    complexity: 'low' | 'medium' | 'high';
  };
}

@Injectable()
export class ContextAnalyzerService {
  private readonly logger = new Logger(ContextAnalyzerService.name);
  private activeTracker: 'coreldraw' | 'blender' | null = null;
  
  constructor(
    private readonly corelDrawTracker: CorelDrawContextTracker,
    private readonly blenderTracker: BlenderContextTracker,
    private readonly chromaService: ChromaService,
    private readonly eventEmitter: EventEmitter2
  ) {
    // Listen for context updates
    this.eventEmitter.on('context.updated', this.handleContextUpdate.bind(this));
  }
  
  async startTracking(platform: 'coreldraw' | 'blender'): Promise<void> {
    this.logger.log(`Starting context tracking for ${platform}`);
    
    // Stop any existing tracking
    await this.stopTracking();
    
    // Start new tracking
    if (platform === 'coreldraw') {
      await this.corelDrawTracker.startTracking();
    } else if (platform === 'blender') {
      await this.blenderTracker.startTracking();
    }
    
    this.activeTracker = platform;
  }
  
  async stopTracking(): Promise<void> {
    if (this.activeTracker === 'coreldraw') {
      await this.corelDrawTracker.stopTracking();
    } else if (this.activeTracker === 'blender') {
      await this.blenderTracker.stopTracking();
    }
    
    this.activeTracker = null;
  }
  
  async analyzeCurrentContext(): Promise<ContextAnalysisResult> {
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
  
  private async performAnalysis(context: DesignContext): Promise<ContextAnalysisResult> {
    this.logger.debug('Performing context analysis');
    
    // Extract key information from context
    const elements = this.extractElements(context);
    
    // Find relevant documentation using ChromaDB
    const relevantDocs = await this.findRelevantDocumentation(context);
    
    // Generate suggested actions
    const suggestedActions = this.generateSuggestedActions(context, elements);
    
    // Create result
    return {
      context,
      dominantElements: elements.map(e => e.type),
      suggestedActions,
      relevantDocumentation: relevantDocs,
      visualSummary: {
        thumbnailUrl: '/api/context/thumbnail',
        elementCount: elements.length,
        complexity: this.determineComplexity(elements)
      }
    };
  }
  
  private handleContextUpdate(update: ContextUpdate): void {
    this.logger.debug('Context update received');
    
    // Perform quick analysis
    this.performAnalysis(update.context as DesignContext)
      .then(result => {
        // Emit analysis result
        this.eventEmitter.emit('context.analyzed', result);
      })
      .catch(error => {
        this.logger.error(`Error analyzing context: ${error.message}`);
      });
  }
  
  // Helper methods
  private extractElements(context: DesignContext): Array<{ id: string; type: string }> {
    // Implementation depends on platform
    return [];
  }
  
  private async findRelevantDocumentation(context: DesignContext): Promise<Array<{ title: string; source: string; relevance: number }>> {
    // Use ChromaDB to find relevant documentation
    return [];
  }
  
  private generateSuggestedActions(context: DesignContext, elements: Array<{ id: string; type: string }>): string[] {
    // Generate suggested actions based on context
    return [];
  }
  
  private determineComplexity(elements: Array<{ id: string; type: string }>): 'low' | 'medium' | 'high' {
    const count = elements.length;
    
    if (count < 10) return 'low';
    if (count < 50) return 'medium';
    return 'high';
  }
}
```

### 4. Context Integration Module

```typescript
// server/src/context/context.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SoftwareModule } from '../software/software.module';
import { DatabaseModule } from '../database/database.module';
import { CorelDrawContextTracker } from './coreldraw-context-tracker';
import { BlenderContextTracker } from './blender-context-tracker';
import { ContextAnalyzerService } from './context-analyzer.service';
import { ContextController } from './context.controller';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SoftwareModule,
    DatabaseModule
  ],
  providers: [
    CorelDrawContextTracker,
    BlenderContextTracker,
    ContextAnalyzerService
  ],
  controllers: [ContextController],
  exports: [ContextAnalyzerService]
})
export class ContextModule {}
```

### 5. REST API voor Context

```typescript
// server/src/context/context.controller.ts
import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { ContextAnalyzerService, ContextAnalysisResult } from './context-analyzer.service';
import { DesignContext } from './context-tracker.interface';

@Controller('context')
export class ContextController {
  constructor(private readonly contextAnalyzer: ContextAnalyzerService) {}
  
  @Get('analyze')
  async analyzeContext(): Promise<ContextAnalysisResult> {
    return this.contextAnalyzer.analyzeCurrentContext();
  }
  
  @Post('track/:platform')
  async startTracking(@Param('platform') platform: 'coreldraw' | 'blender'): Promise<{ success: boolean }> {
    await this.contextAnalyzer.startTracking(platform);
    return { success: true };
  }
  
  @Post('stop')
  async stopTracking(): Promise<{ success: boolean }> {
    await this.contextAnalyzer.stopTracking();
    return { success: true };
  }
  
  @Get('thumbnail')
  async getThumbnail(): Promise<{ data: string; format: string }> {
    // Get screenshot from active tracker
    // Implementation depends on which tracker is active
    return { data: 'base64...', format: 'png' };
  }
}
```

## Implementatiestappen

### Fase 1: Basis Context Tracking (3 dagen)
- Implementeer context tracker interfaces
- Bouw CorelDRAW context tracker
- Bouw Blender context tracker
- Implementeer basis screenshot functionaliteit

### Fase 2: Context Analyse Service (2 dagen)
- Implementeer context analyzer service
- Bouw context module structuur
- Implementeer REST API endpoints
- Integreer met ChromaDB

### Fase 3: Integratie en Testing (2 dagen)
- Verbind met UniversalObjectModel
- Implementeer end-to-end tests
- Optimaliseer performance
- Documenteer de API

## Tijdsinschatting

- **Basis Context Tracking**: 3 dagen
- **Context Analyse Service**: 2 dagen
- **Integratie en Testing**: 2 dagen

**Totaal**: 7 werkdagen

## Conclusie

De DesignContextAnalyzer is een cruciale component voor het bieden van context-aware functionaliteit. Door real-time documentanalyse en context tracking toe te voegen, zal de AI agent veel effectiever kunnen reageren op gebruikersvragen en commando's. De integratie met het UniversalObjectModel zorgt voor een krachtige combinatie van document-awareness en platform-agnostische operaties. 