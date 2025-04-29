/**
 * CorelContextAnalyzer
 * 
 * Implementation of DesignContextAnalyzer for CorelDRAW.
 */

import { Injectable } from '@nestjs/common';
import { CorelService } from '../corel.service';
import {
  DesignContextAnalyzer,
  DesignContext,
  ContextCaptureOptions,
  ContextUpdate,
  DesignElement,
  Layer,
  Position,
  Size,
  Color
} from './design-context';
import { Interval } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class CorelContextAnalyzer extends DesignContextAnalyzer {
  private context: DesignContext = null;
  private trackingEnabled = false;
  private trackingCallback: (update: ContextUpdate) => void = null;
  private lastCaptureTime = 0;
  
  constructor(
    private readonly corelService: CorelService,
    private readonly eventEmitter: EventEmitter2
  ) {
    super();
  }

  /**
   * Capture the current context of the CorelDRAW document
   */
  async captureContext(options?: ContextCaptureOptions): Promise<DesignContext> {
    this.logger.debug('Capturing CorelDRAW context');
    const startTime = Date.now();
    
    const defaults: ContextCaptureOptions = {
      includeScreenshot: true,
      includeHiddenLayers: false,
      maxElementsPerLayer: 100,
      detailLevel: 'standard'
    };
    
    const opts = { ...defaults, ...options };
    
    try {
      // Get active document info
      const docInfo = await this.corelService.executeMethod('Application.ActiveDocument', 'Summarize', []);
      
      if (!docInfo.success) {
        this.logger.error(`Failed to get document info: ${docInfo.error}`);
        return this.createEmptyContext();
      }
      
      const docInfoObj = docInfo.result;
      
      // Initialize context structure
      const context: DesignContext = {
        documentId: docInfoObj.FileName || 'Untitled',
        documentName: docInfoObj.Name || 'Untitled',
        documentPath: 'ActiveDocument',
        platform: 'coreldraw',
        size: {
          width: docInfoObj.SizeWidth,
          height: docInfoObj.SizeHeight,
          depth: 0 // 2D doc
        },
        currentFrame: 0,
        layers: [],
        selectedElements: [],
        viewTransform: {
          zoom: 0,
          panX: 0,
          panY: 0
        }
      };
      
      // Get view information (zoom, pan)
      const viewInfo = await this.corelService.executeMethod('Application.ActiveDocument.ActiveView', 'GetViewInfo', []);
      if (viewInfo.success) {
        context.viewTransform = {
          zoom: viewInfo.result.Zoom,
          panX: viewInfo.result.ScrollX,
          panY: viewInfo.result.ScrollY
        };
      }
      
      // Get layers
      const layersResult = await this.corelService.executeMethod('Application.ActiveDocument.Layers', 'GetLayers', []);
      
      if (layersResult.success && Array.isArray(layersResult.result)) {
        // Process each layer
        for (const layerData of layersResult.result) {
          if (!layerData.Visible && !opts.includeHiddenLayers) {
            continue;
          }
          
          const layer: Layer = {
            id: layerData.Name,
            name: layerData.Name,
            objectPath: `Application.ActiveDocument.Layers["${layerData.Name}"]`,
            visible: layerData.Visible,
            locked: layerData.Locked,
            elements: []
          };
          
          // Get shapes on this layer
          const shapesResult = await this.corelService.executeMethod(
            `Application.ActiveDocument.Layers["${layerData.Name}"]`,
            'GetShapes',
            [{ maxCount: opts.maxElementsPerLayer }]
          );
          
          if (shapesResult.success && Array.isArray(shapesResult.result)) {
            for (const shape of shapesResult.result) {
              const element = await this.createElementFromShape(shape);
              if (element) {
                layer.elements.push(element);
              }
            }
          }
          
          context.layers.push(layer);
        }
      }
      
      // Get selected elements
      const selectionResult = await this.corelService.executeMethod(
        'Application.ActiveDocument.Selection',
        'GetSelectedShapes',
        []
      );
      
      if (selectionResult.success && Array.isArray(selectionResult.result)) {
        for (const shape of selectionResult.result) {
          const element = await this.createElementFromShape(shape);
          if (element) {
            context.selectedElements.push(element);
          }
        }
      }
      
      // Get last action
      const historyResult = await this.corelService.executeMethod(
        'Application.ActiveDocument.CommandHistory',
        'GetLastCommand',
        []
      );
      
      if (historyResult.success && historyResult.result) {
        context.lastAction = {
          type: historyResult.result.Type,
          description: historyResult.result.Description,
          timestamp: Date.now()
        };
      }
      
      // Capture screenshot if requested
      if (opts.includeScreenshot) {
        const screenshotResult = await this.corelService.executeMethod(
          'Application.ActiveDocument',
          'CaptureScreenshot',
          [{ width: 640, height: 480, format: 'PNG' }]
        );
        
        if (screenshotResult.success && screenshotResult.result) {
          context.screenshot = screenshotResult.result.base64Data;
        }
      }
      
      this.context = context;
      this.lastCaptureTime = Date.now();
      
      this.logger.debug(`Context captured in ${Date.now() - startTime}ms`);
      return context;
      
    } catch (error) {
      this.logger.error(`Error capturing context: ${error.message}`);
      return this.createEmptyContext();
    }
  }

  /**
   * Create a design element from a CorelDRAW shape
   */
  private async createElementFromShape(shape: any): Promise<DesignElement> {
    try {
      if (!shape) return null;
      
      const shapePath = shape.ObjectPath || `Application.ActiveDocument.Shapes["${shape.Name}"]`;
      
      // Get detailed shape information
      const shapeResult = await this.corelService.executeMethod(
        shapePath,
        'GetProperties',
        []
      );
      
      if (!shapeResult.success) {
        return null;
      }
      
      const shapeInfo = shapeResult.result;
      
      // Build element
      const element: DesignElement = {
        id: shape.ID || shapeInfo.ID,
        name: shape.Name || shapeInfo.Name,
        type: shapeInfo.Type,
        objectPath: shapePath,
        position: {
          x: shapeInfo.Left,
          y: shapeInfo.Top,
          z: 0
        },
        size: {
          width: shapeInfo.Width,
          height: shapeInfo.Height,
          depth: 0
        },
        rotation: {
          x: 0,
          y: 0,
          z: shapeInfo.Rotation || 0
        },
        properties: {
          visible: shapeInfo.Visible !== false,
          locked: shapeInfo.Locked === true,
          filled: shapeInfo.Filled === true,
          outlined: shapeInfo.Outlined === true,
          lineWeight: shapeInfo.OutlineWidth,
          closed: shapeInfo.Closed === true
        },
        children: []
      };
      
      // Set color if available
      if (shapeInfo.FillColor) {
        element.color = {
          r: shapeInfo.FillColor.Red,
          g: shapeInfo.FillColor.Green,
          b: shapeInfo.FillColor.Blue,
          a: shapeInfo.FillColor.Alpha / 255 // CorelDRAW uses 0-255 for alpha
        };
      } else if (shapeInfo.OutlineColor) {
        element.color = {
          r: shapeInfo.OutlineColor.Red,
          g: shapeInfo.OutlineColor.Green,
          b: shapeInfo.OutlineColor.Blue,
          a: shapeInfo.OutlineColor.Alpha / 255
        };
      }
      
      // Get child shapes if this is a group
      if (shapeInfo.Type === 'Group' && shapeInfo.ChildCount > 0) {
        const childResult = await this.corelService.executeMethod(
          shapePath,
          'GetChildShapes',
          []
        );
        
        if (childResult.success && Array.isArray(childResult.result)) {
          for (const childShape of childResult.result) {
            const childElement = await this.createElementFromShape(childShape);
            if (childElement) {
              element.children.push(childElement);
            }
          }
        }
      }
      
      return element;
      
    } catch (error) {
      this.logger.error(`Error creating element from shape: ${error.message}`);
      return null;
    }
  }

  /**
   * Start tracking context changes
   */
  async startContextTracking(callback: (update: ContextUpdate) => void): Promise<void> {
    this.trackingEnabled = true;
    this.trackingCallback = callback;
    
    // Initial capture to set baseline
    if (!this.context) {
      this.context = await this.captureContext();
    }
    
    this.logger.debug('Started context tracking');
  }

  /**
   * Stop tracking context changes
   */
  async stopContextTracking(): Promise<void> {
    this.trackingEnabled = false;
    this.trackingCallback = null;
    this.logger.debug('Stopped context tracking');
  }

  /**
   * Process context updates periodically
   * This runs every 2 seconds when tracking is enabled
   */
  @Interval(2000)
  async checkForContextUpdates() {
    if (!this.trackingEnabled || !this.trackingCallback) {
      return;
    }
    
    try {
      // Capture current state
      const newContext = await this.captureContext({
        includeScreenshot: false, // Don't need screenshots for updates
        detailLevel: 'minimal'
      });
      
      if (!this.context) {
        this.context = newContext;
        return;
      }
      
      // Compare with previous state and build update
      const update = this.buildContextUpdate(this.context, newContext);
      
      if (update.changes.added.length > 0 || 
          update.changes.modified.length > 0 || 
          update.changes.removed.length > 0 ||
          update.changes.selected.length > 0 ||
          update.changes.deselected.length > 0) {
        
        // Call the tracking callback with the update
        this.trackingCallback(update);
        
        // Emit an event for other subscribers
        this.eventEmitter.emit('design.context.update', update);
        
        // Update our stored context
        this.context = newContext;
      }
    } catch (error) {
      this.logger.error(`Error processing context updates: ${error.message}`);
    }
  }

  /**
   * Build a context update by comparing old and new context
   */
  private buildContextUpdate(oldContext: DesignContext, newContext: DesignContext): ContextUpdate {
    const update: ContextUpdate = {
      timestamp: Date.now(),
      documentId: newContext.documentId,
      changes: {
        added: [],
        modified: [],
        removed: [],
        selected: [],
        deselected: []
      },
      lastAction: newContext.lastAction
    };
    
    // Create maps for faster lookups
    const oldElements = new Map<string, DesignElement>();
    const newElements = new Map<string, DesignElement>();
    
    // Collect all elements from layers
    oldContext.layers.forEach(layer => {
      layer.elements.forEach(element => {
        oldElements.set(element.id, element);
        if (element.children) {
          this.collectChildElements(element.children, oldElements);
        }
      });
    });
    
    newContext.layers.forEach(layer => {
      layer.elements.forEach(element => {
        newElements.set(element.id, element);
        if (element.children) {
          this.collectChildElements(element.children, newElements);
        }
      });
    });
    
    // Find added elements
    for (const [id, element] of newElements.entries()) {
      if (!oldElements.has(id)) {
        update.changes.added.push(element);
      }
    }
    
    // Find removed elements
    for (const [id, element] of oldElements.entries()) {
      if (!newElements.has(id)) {
        update.changes.removed.push(id);
      }
    }
    
    // Find modified elements
    for (const [id, newElement] of newElements.entries()) {
      if (oldElements.has(id)) {
        const oldElement = oldElements.get(id);
        
        if (this.hasElementChanged(oldElement, newElement)) {
          update.changes.modified.push({
            id,
            properties: {
              position: newElement.position,
              size: newElement.size,
              rotation: newElement.rotation,
              color: newElement.color,
              ...newElement.properties
            }
          });
        }
      }
    }
    
    // Check for selection changes
    const oldSelected = new Set(oldContext.selectedElements.map(e => e.id));
    const newSelected = new Set(newContext.selectedElements.map(e => e.id));
    
    for (const id of newSelected) {
      if (!oldSelected.has(id)) {
        update.changes.selected.push(id);
      }
    }
    
    for (const id of oldSelected) {
      if (!newSelected.has(id)) {
        update.changes.deselected.push(id);
      }
    }
    
    // Check for view transform changes
    const oldView = oldContext.viewTransform;
    const newView = newContext.viewTransform;
    
    if (oldView.zoom !== newView.zoom ||
        oldView.panX !== newView.panX ||
        oldView.panY !== newView.panY) {
      update.changes.viewTransform = newView;
    }
    
    return update;
  }

  /**
   * Helper to collect child elements recursively
   */
  private collectChildElements(children: DesignElement[], elementsMap: Map<string, DesignElement>) {
    for (const child of children) {
      elementsMap.set(child.id, child);
      if (child.children) {
        this.collectChildElements(child.children, elementsMap);
      }
    }
  }

  /**
   * Check if an element has changed significantly
   */
  private hasElementChanged(oldElement: DesignElement, newElement: DesignElement): boolean {
    // Check position
    if (this.hasPositionChanged(oldElement.position, newElement.position)) {
      return true;
    }
    
    // Check size
    if (oldElement.size && newElement.size && 
        (oldElement.size.width !== newElement.size.width ||
         oldElement.size.height !== newElement.size.height)) {
      return true;
    }
    
    // Check rotation
    if (oldElement.rotation && newElement.rotation &&
        oldElement.rotation.z !== newElement.rotation.z) {
      return true;
    }
    
    // Check color
    if (oldElement.color && newElement.color &&
        (oldElement.color.r !== newElement.color.r ||
         oldElement.color.g !== newElement.color.g ||
         oldElement.color.b !== newElement.color.b ||
         oldElement.color.a !== newElement.color.a)) {
      return true;
    }
    
    // Check key properties
    if (oldElement.properties.visible !== newElement.properties.visible ||
        oldElement.properties.locked !== newElement.properties.locked ||
        oldElement.properties.filled !== newElement.properties.filled ||
        oldElement.properties.outlined !== newElement.properties.outlined) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if position has changed more than a threshold
   */
  private hasPositionChanged(oldPos: Position, newPos: Position): boolean {
    const threshold = 0.001; // Small threshold to avoid rounding errors
    
    return Math.abs(oldPos.x - newPos.x) > threshold ||
           Math.abs(oldPos.y - newPos.y) > threshold;
  }

  /**
   * Create an empty context when something goes wrong
   */
  private createEmptyContext(): DesignContext {
    return {
      documentId: 'unknown',
      documentName: 'Unknown.cdr',
      documentPath: 'ActiveDocument',
      platform: 'coreldraw',
      size: { width: 1000, height: 1000, depth: 0 },
      currentFrame: 0,
      layers: [],
      selectedElements: [],
      viewTransform: {
        zoom: 1,
        panX: 0,
        panY: 0
      }
    };
  }
} 