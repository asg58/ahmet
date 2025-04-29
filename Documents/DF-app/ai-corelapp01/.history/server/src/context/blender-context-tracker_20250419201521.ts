/**
 * Blender Context Tracker
 * 
 * This module implements a context tracker for Blender that monitors
 * the current state of the 3D scene and provides context information.
 */

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
  
  /**
   * Create an empty context object
   */
  private createEmptyContext(): DesignContext {
    return {
      platform: 'blender',
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
   * Start tracking the Blender scene context
   */
  async startTracking(): Promise<void> {
    this.logger.log('Starting Blender context tracking');
    
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
   * Stop tracking the Blender scene context
   */
  async stopTracking(): Promise<void> {
    this.logger.log('Stopping Blender context tracking');
    
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
   * Capture a screenshot of the current view in Blender
   */
  async captureScreenshot(): Promise<{ data: string; format: 'png' | 'jpeg' }> {
    try {
      const result = await this.blenderService.executeCode(`
        import bpy
        import base64
        from pathlib import Path
        import tempfile
        
        def capture_screenshot():
            # Save current render settings
            old_path = bpy.context.scene.render.filepath
            old_format = bpy.context.scene.render.image_settings.file_format
            old_depth = bpy.context.scene.render.image_settings.color_depth
            
            # Create temp file for screenshot
            temp_dir = tempfile.gettempdir()
            temp_file = str(Path(temp_dir) / "blender_screenshot.png")
            
            try:
                # Set render settings for screenshot
                bpy.context.scene.render.filepath = temp_file
                bpy.context.scene.render.image_settings.file_format = 'PNG'
                bpy.context.scene.render.image_settings.color_depth = '8'
                
                # Render current viewport
                bpy.ops.render.opengl(write_still=True)
                
                # Read the file and encode as base64
                with open(temp_file, 'rb') as f:
                    image_data = f.read()
                    encoded = base64.b64encode(image_data).decode('utf-8')
                    return encoded
            finally:
                # Restore render settings
                bpy.context.scene.render.filepath = old_path
                bpy.context.scene.render.image_settings.file_format = old_format
                bpy.context.scene.render.image_settings.color_depth = old_depth
                
                # Remove temp file
                try:
                    Path(temp_file).unlink(missing_ok=True)
                except:
                    pass
            
            return ""
            
        # Return the captured screenshot
        result = capture_screenshot()
        print(result)  # This will be captured as output
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
   * Fetch the current context from Blender
   */
  private async fetchCurrentContext(): Promise<DesignContext> {
    // Using UniversalObjectModel to get context info
    const modelContext = await this.objectModel.getCurrentContext();
    
    // Using direct Blender service for additional info
    const sceneCode = `
      import bpy
      import json
      
      def get_scene_info():
          scene = bpy.context.scene
          result = {
              "name": scene.name,
              "frame_current": scene.frame_current,
              "frame_start": scene.frame_start,
              "frame_end": scene.frame_end,
              "render_engine": scene.render.engine,
              
              # View properties
              "view": {
                  "zoom": getattr(bpy.context.space_data, "zoom", 1.0) if bpy.context.space_data else 1.0,
              },
              
              # Selected objects
              "selected_objects": [obj.name for obj in bpy.context.selected_objects],
              
              # Active object
              "active_object": bpy.context.active_object.name if bpy.context.active_object else None,
              
              # Object counts
              "object_counts": {
                  "mesh": len([o for o in bpy.data.objects if o.type == 'MESH']),
                  "camera": len([o for o in bpy.data.objects if o.type == 'CAMERA']),
                  "light": len([o for o in bpy.data.objects if o.type == 'LIGHT']),
                  "armature": len([o for o in bpy.data.objects if o.type == 'ARMATURE']),
                  "curve": len([o for o in bpy.data.objects if o.type == 'CURVE']),
                  "other": len([o for o in bpy.data.objects if o.type not in ('MESH', 'CAMERA', 'LIGHT', 'ARMATURE', 'CURVE')])
              }
          }
          
          return json.dumps(result)
      
      # Return the scene info
      print(get_scene_info())
    `;
    
    const sceneResult = await this.blenderService.executeCode(sceneCode);
    const sceneInfo = this.parseResult(sceneResult.output);
    
    return {
      platform: 'blender',
      timestamp: Date.now(),
      documentProperties: {
        name: sceneInfo.name || 'Untitled',
        frame_current: sceneInfo.frame_current,
        frame_start: sceneInfo.frame_start,
        frame_end: sceneInfo.frame_end,
        render_engine: sceneInfo.render_engine,
        object_counts: sceneInfo.object_counts || {}
      },
      selectedObjects: sceneInfo.selected_objects || [],
      activeLayer: sceneInfo.active_object,
      viewProperties: {
        zoom: (sceneInfo.view && sceneInfo.view.zoom) || 1.0,
        viewportCenter: [0, 0], // Not easily available in Blender
        visibleObjects: modelContext.selectedObjects || [] // Approximate with selected for now
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
    
    // Check if active object changed
    const activeChanged = oldContext.activeLayer !== newContext.activeLayer;
    
    // Check if frame changed
    const frameChanged = 
      oldContext.documentProperties['frame_current'] !== 
      newContext.documentProperties['frame_current'];
    
    // Check if object counts changed
    const objectCountsChanged = this.areObjectCountsChanged(
      oldContext.documentProperties['object_counts'] || {},
      newContext.documentProperties['object_counts'] || {}
    );
    
    // Determine if any changes occurred
    const hasChanges = selectedChanged || activeChanged || frameChanged || objectCountsChanged;
    
    // Determine if changes are significant enough for a full update
    const isSignificant = selectedChanged || activeChanged || objectCountsChanged;
    
    // Generate description of changes
    let description = '';
    if (selectedChanged) description += 'Selection changed. ';
    if (activeChanged) description += 'Active object changed. ';
    if (frameChanged) description += 'Frame changed. ';
    if (objectCountsChanged) description += 'Scene objects changed. ';
    
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
   * Utility to check if object counts have changed
   */
  private areObjectCountsChanged(counts1: Record<string, number>, counts2: Record<string, number>): boolean {
    const keys = new Set([...Object.keys(counts1), ...Object.keys(counts2)]);
    
    for (const key of keys) {
      if (counts1[key] !== counts2[key]) return true;
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
    // In a real implementation, we would register handlers with Blender
    // For now, we'll rely on polling
    
    this.logger.debug('Setting up Blender event listeners');
    
    const setupCode = `
      import bpy
      # Example Python code to register event handlers
      # Not implemented in the mock version
      
      print("Event handlers setup")
    `;
    
    this.blenderService.executeCode(setupCode)
      .catch(error => {
        this.logger.error(`Error setting up event listeners: ${error.message}`);
      });
  }
  
  /**
   * Remove event listeners
   */
  private removeEventListeners(): void {
    // Cleanup event listeners
    
    this.logger.debug('Removing Blender event listeners');
    
    const cleanupCode = `
      import bpy
      # Example Python code to remove event handlers
      # Not implemented in the mock version
      
      print("Event handlers removed")
    `;
    
    this.blenderService.executeCode(cleanupCode)
      .catch(error => {
        this.logger.error(`Error removing event listeners: ${error.message}`);
      });
  }
} 