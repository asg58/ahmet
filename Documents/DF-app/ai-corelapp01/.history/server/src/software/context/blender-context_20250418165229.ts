/**
 * BlenderContextAnalyzer
 * 
 * Implementation of DesignContextAnalyzer for Blender.
 */

import { Injectable } from '@nestjs/common';
import { BlenderService } from '../blender.service';
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
export class BlenderContextAnalyzer extends DesignContextAnalyzer {
  private context: DesignContext = null;
  private trackingEnabled = false;
  private trackingCallback: (update: ContextUpdate) => void = null;
  private lastCaptureTime = 0;
  
  constructor(
    private readonly blenderService: BlenderService,
    private readonly eventEmitter: EventEmitter2
  ) {
    super();
  }

  /**
   * Capture the current context of the Blender scene
   */
  async captureContext(options?: ContextCaptureOptions): Promise<DesignContext> {
    this.logger.debug('Capturing Blender context');
    const startTime = Date.now();
    
    const defaults: ContextCaptureOptions = {
      includeScreenshot: true,
      includeHiddenLayers: false,
      maxElementsPerLayer: 100,
      detailLevel: 'standard'
    };
    
    const opts = { ...defaults, ...options };
    
    // Execute Python code to capture context
    const pythonCode = `
    import json
    import bpy
    import base64
    from io import BytesIO

    def get_design_context():
        context = {
            "documentId": str(bpy.data.filepath) or "Untitled",
            "documentName": bpy.path.basename(bpy.data.filepath) or "Untitled",
            "documentPath": "bpy.data",
            "platform": "blender",
            "size": {
                "width": bpy.context.scene.render.resolution_x,
                "height": bpy.context.scene.render.resolution_y,
                "depth": 0  # 2D representation
            },
            "currentFrame": bpy.context.scene.frame_current,
            "layers": [],
            "selectedElements": [],
            "viewTransform": {
                "zoom": 0,
                "panX": 0,
                "panY": 0
            }
        }
        
        # Try to get view info if possible
        for window in bpy.context.window_manager.windows:
            for area in window.screen.areas:
                if area.type == 'VIEW_3D':
                    for region in area.regions:
                        if region.type == 'WINDOW':
                            for space in area.spaces:
                                if space.type == 'VIEW_3D':
                                    context["viewTransform"] = {
                                        "zoom": space.region_3d.view_distance,
                                        "panX": space.region_3d.view_location[0],
                                        "panY": space.region_3d.view_location[1],
                                        "rotation": space.region_3d.view_rotation[:]
                                    }

        # Get collections (layers)
        max_elements = ${opts.maxElementsPerLayer}
        include_hidden = ${opts.includeHiddenLayers ? "True" : "False"}
        
        for collection in bpy.data.collections:
            if not include_hidden and not collection.hide_viewport:
                layer = {
                    "id": str(collection.name),
                    "name": collection.name,
                    "objectPath": f"bpy.data.collections['{collection.name}']",
                    "visible": not collection.hide_viewport and not collection.hide_render,
                    "locked": collection.hide_select,
                    "elements": []
                }
                
                # Get objects in this collection
                element_count = 0
                for obj in collection.objects:
                    if element_count >= max_elements:
                        break
                        
                    element = create_element_from_object(obj)
                    if element:
                        layer["elements"].append(element)
                        element_count += 1
                
                context["layers"].append(layer)
        
        # Get selected elements
        for obj in bpy.context.selected_objects:
            element = create_element_from_object(obj)
            if element:
                context["selectedElements"].append(element)
        
        # Capture screenshot if requested
        if ${opts.includeScreenshot ? "True" : "False"}:
            try:
                # This is a simplified approach - in production, you'd use Blender's
                # offscreen rendering capabilities for a proper screenshot
                temp_path = bpy.path.abspath("//temp_screenshot.png")
                orig_resolution = (
                    bpy.context.scene.render.resolution_x,
                    bpy.context.scene.render.resolution_y
                )
                orig_percentage = bpy.context.scene.render.resolution_percentage
                
                # Set small resolution for screenshot
                bpy.context.scene.render.resolution_x = 640
                bpy.context.scene.render.resolution_y = 480
                bpy.context.scene.render.resolution_percentage = 100
                
                bpy.context.scene.render.filepath = temp_path
                bpy.ops.render.opengl(write_still=True)
                
                # Restore original resolution
                bpy.context.scene.render.resolution_x = orig_resolution[0]
                bpy.context.scene.render.resolution_y = orig_resolution[1]
                bpy.context.scene.render.resolution_percentage = orig_percentage
                
                # Read the file and convert to base64
                import os
                if os.path.exists(temp_path):
                    with open(temp_path, "rb") as img_file:
                        context["screenshot"] = base64.b64encode(img_file.read()).decode('utf-8')
                    os.remove(temp_path)
            except Exception as e:
                print(f"Error capturing screenshot: {e}")
        
        # Add last action if known
        if hasattr(bpy.context, "last_operator"):
            op = bpy.context.last_operator
            if op:
                context["lastAction"] = {
                    "type": op.bl_idname,
                    "description": op.bl_label,
                    "timestamp": int(bpy.context.scene.frame_current_final)
                }
        
        return context

    def create_element_from_object(obj):
        """Create a design element from a Blender object"""
        try:
            if obj.hide_viewport and not ${opts.includeHiddenLayers ? "True" : "False"}:
                return None
                
            element = {
                "id": str(obj.name),
                "name": obj.name,
                "type": obj.type,
                "objectPath": f"bpy.data.objects['{obj.name}']",
                "position": {
                    "x": obj.location[0],
                    "y": obj.location[1],
                    "z": obj.location[2]
                },
                "size": {
                    "width": 0,
                    "height": 0,
                    "depth": 0
                },
                "rotation": {
                    "x": obj.rotation_euler[0],
                    "y": obj.rotation_euler[1],
                    "z": obj.rotation_euler[2]
                },
                "properties": {
                    "visible": not obj.hide_viewport and not obj.hide_render,
                    "locked": obj.hide_select,
                    "wireframe": obj.display_type == 'WIRE'
                },
                "children": []
            }
            
            # Try to get dimensions
            if hasattr(obj, "dimensions"):
                element["size"] = {
                    "width": obj.dimensions[0],
                    "height": obj.dimensions[1],
                    "depth": obj.dimensions[2]
                }
            
            # Add material color if available
            if obj.material_slots and len(obj.material_slots) > 0:
                material = obj.material_slots[0].material
                if material and hasattr(material, "diffuse_color"):
                    element["color"] = {
                        "r": int(material.diffuse_color[0] * 255),
                        "g": int(material.diffuse_color[1] * 255),
                        "b": int(material.diffuse_color[2] * 255),
                        "a": material.diffuse_color[3]
                    }
            
            # Add children recursively if this is a parent
            if obj.children:
                for child in obj.children:
                    child_element = create_element_from_object(child)
                    if child_element:
                        if "children" not in element:
                            element["children"] = []
                        element["children"].append(child_element)
            
            return element
        except Exception as e:
            print(f"Error creating element from object {obj.name}: {e}")
            return None

    # Execute and return result
    result = get_design_context()
    print(json.dumps(result))
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      
      if (result.success && result.output) {
        try {
          const context = JSON.parse(result.output);
          this.context = context;
          this.lastCaptureTime = Date.now();
          
          this.logger.debug(`Context captured in ${Date.now() - startTime}ms`);
          return context;
        } catch (e) {
          this.logger.error(`Error parsing context: ${e.message}`);
        }
      } else {
        this.logger.error(`Error capturing context: ${result.error}`);
      }
    } catch (error) {
      this.logger.error(`Error executing context capture: ${error.message}`);
    }
    
    // Return empty context if something went wrong
    return {
      documentId: 'unknown',
      documentName: 'Unknown.blend',
      documentPath: 'bpy.data',
      platform: 'blender',
      size: { width: 1920, height: 1080, depth: 0 },
      currentFrame: 1,
      layers: [],
      selectedElements: [],
      viewTransform: {
        zoom: 1,
        panX: 0,
        panY: 0
      }
    };
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
        oldView.panY !== newView.panY ||
        oldView.rotation !== newView.rotation) {
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
         oldElement.size.height !== newElement.size.height ||
         oldElement.size.depth !== newElement.size.depth)) {
      return true;
    }
    
    // Check rotation
    if (oldElement.rotation && newElement.rotation &&
        (oldElement.rotation.x !== newElement.rotation.x ||
         oldElement.rotation.y !== newElement.rotation.y ||
         oldElement.rotation.z !== newElement.rotation.z)) {
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
        oldElement.properties.locked !== newElement.properties.locked) {
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
           Math.abs(oldPos.y - newPos.y) > threshold ||
           (oldPos.z !== undefined && newPos.z !== undefined && 
            Math.abs(oldPos.z - newPos.z) > threshold);
  }
} 