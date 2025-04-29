/**
 * CorelDRAW Context Tracker
 * 
 * This module implements a context tracker for CorelDRAW that monitors
 * the current state of the document and provides context information.
 */

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
  
  /**
   * Create an empty context object
   */
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
  
  /**
   * Start tracking the CorelDRAW document context
   */
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
  
  /**
   * Stop tracking the CorelDRAW document context
   */
  async stopTracking(): Promise<void> {
    this.logger.log('Stopping CorelDRAW context tracking');
    
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    
    this.removeEventListeners();
  }
  
  /**
   * Get the current context
   */
  async getCurrentContext(): Promise<DesignContext> {
    return this.context;
  }
  
  /**
   * Register a callback for context updates
   */
  onContextUpdate(callback: (update: ContextUpdate) => void): void {
    this.callbacks.push(callback);
  }
  
  /**
   * Capture a screenshot of the current view in CorelDRAW
   */
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
  
  /**
   * Capture the current context
   */
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
  
  /**
   * Fetch the current context from CorelDRAW
   */
  private async fetchCurrentContext(): Promise<DesignContext> {
    // Using UniversalObjectModel to get context info
    const modelContext = await this.objectModel.getCurrentContext();
    
    // Using direct CorelDRAW service for additional info
    const documentCode = `
      Function GetDocumentInfo()
        Dim result
        Set result = CreateObject("Scripting.Dictionary")
        
        ' Document properties
        result.Add "name", ActiveDocument.FileName
        result.Add "pages", ActiveDocument.Pages.Count
        result.Add "width", ActiveDocument.ActivePage.SizeWidth
        result.Add "height", ActiveDocument.ActivePage.SizeHeight
        
        ' View properties
        result.Add "zoom", ActiveWindow.Zoom
        
        ' Center of viewport
        Dim centerArray(1)
        centerArray(0) = ActiveWindow.ViewPointX
        centerArray(1) = ActiveWindow.ViewPointY
        result.Add "center", centerArray
        
        ' Convert to JSON using a helper function (not shown here)
        GetDocumentInfo = ConvertToJSON(result)
      End Function
    `;
    
    const documentResult = await this.corelDrawService.executeCode(documentCode);
    const documentInfo = this.parseResult(documentResult.output);
    
    return {
      platform: 'coreldraw',
      timestamp: Date.now(),
      documentProperties: {
        name: documentInfo.name || 'Untitled',
        width: documentInfo.width || 0,
        height: documentInfo.height || 0,
        pages: documentInfo.pages || 1,
        ...documentInfo.properties || {}
      },
      selectedObjects: modelContext.selectedObjects || [],
      activeLayer: modelContext.activeLayer,
      viewProperties: {
        zoom: documentInfo.zoom || 1.0,
        viewportCenter: documentInfo.center || [0, 0],
        visibleObjects: documentInfo.visible || []
      }
    };
  }
  
  /**
   * Parse a result string into an object
   */
  private parseResult(result: string): any {
    try {
      return JSON.parse(result || '{}');
    } catch (error) {
      this.logger.error(`Error parsing result: ${error.message}`);
      return {};
    }
  }
  
  /**
   * Detect changes between old and new context
   */
  private detectChanges(oldContext: DesignContext, newContext: DesignContext): { 
    hasChanges: boolean; 
    isSignificant: boolean;
    description: string;
  } {
    // Check if selected objects changed
    const selectedChanged = !this.areArraysEqual(
      oldContext.selectedObjects,
      newContext.selectedObjects
    );
    
    // Check if active layer changed
    const layerChanged = oldContext.activeLayer !== newContext.activeLayer;
    
    // Check if zoom level changed significantly
    const zoomChanged = Math.abs(
      oldContext.viewProperties.zoom - newContext.viewProperties.zoom
    ) > 0.1;
    
    // Check if document properties changed
    const docPropsChanged = this.areObjectsChanged(
      oldContext.documentProperties,
      newContext.documentProperties
    );
    
    // Determine if any changes occurred
    const hasChanges = selectedChanged || layerChanged || zoomChanged || docPropsChanged;
    
    // Determine if changes are significant enough for a full update
    const isSignificant = selectedChanged || layerChanged || docPropsChanged;
    
    // Generate description of changes
    let description = '';
    if (selectedChanged) description += 'Selection changed. ';
    if (layerChanged) description += 'Active layer changed. ';
    if (zoomChanged) description += 'Zoom level changed. ';
    if (docPropsChanged) description += 'Document properties changed. ';
    
    return {
      hasChanges,
      isSignificant,
      description: description.trim()
    };
  }
  
  /**
   * Utility to check if arrays are equal
   */
  private areArraysEqual(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return false;
    
    for (let i = 0; i < arr1.length; i++) {
      if (arr1[i] !== arr2[i]) return false;
    }
    
    return true;
  }
  
  /**
   * Utility to check if objects have changed
   */
  private areObjectsChanged(obj1: Record<string, any>, obj2: Record<string, any>): boolean {
    // Simple check for changes in top-level properties
    // A more sophisticated implementation would do deep comparison
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return true;
    
    for (const key of keys1) {
      if (obj1[key] !== obj2[key]) return true;
    }
    
    return false;
  }
  
  /**
   * Notify registered callbacks of context updates
   */
  private notifyCallbacks(update: ContextUpdate): void {
    for (const callback of this.callbacks) {
      try {
        callback(update);
      } catch (error) {
        this.logger.error(`Error in context update callback: ${error.message}`);
      }
    }
  }
  
  /**
   * Setup event listeners for real-time updates
   */
  private setupEventListeners(): void {
    // In a real implementation, we would register event handlers with CorelDRAW
    // For now, we'll rely on polling
    
    this.logger.debug('Setting up CorelDRAW event listeners');
    
    const setupCode = `
      Sub SetupEventListeners()
        ' Example VBA code to register event handlers
        ' Not implemented in the mock version
      End Sub
    `;
    
    this.corelDrawService.executeCode(setupCode)
      .catch(error => {
        this.logger.error(`Error setting up event listeners: ${error.message}`);
      });
  }
  
  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    // Cleanup event listeners
    
    this.logger.debug('Removing CorelDRAW event listeners');
    
    const cleanupCode = `
      Sub RemoveEventListeners()
        ' Example VBA code to remove event handlers
        ' Not implemented in the mock version
      End Sub
    `;
    
    this.corelDrawService.executeCode(cleanupCode)
      .catch(error => {
        this.logger.error(`Error removing event listeners: ${error.message}`);
      });
  }
} 