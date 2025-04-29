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
  private updateInterval: NodeJS.Timeout = null;
  private updateFrequency = 2000; // ms
  
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
    import numpy as np
    import mathutils

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
            },
            "statistics": calculate_scene_statistics()
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
                                        "rotation": [round(x, 4) for x in space.region_3d.view_rotation]
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
                        
                    element = create_element_from_object(obj, "${opts.detailLevel}")
                    if element:
                        layer["elements"].append(element)
                        element_count += 1
                
                context["layers"].append(layer)
        
        # Get selected elements
        for obj in bpy.context.selected_objects:
            element = create_element_from_object(obj, "full")  # Always get full detail for selected objects
            if element:
                context["selectedElements"].append(element)
        
        # Capture screenshot if requested
        if ${opts.includeScreenshot ? "True" : "False"}:
            screenshot_data = capture_screenshot(640, 480)
            if screenshot_data:
                context["screenshot"] = screenshot_data
        
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

    def create_element_from_object(obj, detail_level):
        """Create a design element from a Blender object with specified detail level"""
        try:
            if obj.hide_viewport and not ${opts.includeHiddenLayers ? "True" : "False"}:
                return None
                
            # Basic element info
            element = {
                "id": str(obj.name),
                "name": obj.name,
                "type": obj.type,
                "objectPath": f"bpy.data.objects['{obj.name}']",
                "position": {
                    "x": round(obj.location[0], 4),
                    "y": round(obj.location[1], 4),
                    "z": round(obj.location[2], 4)
                },
                "rotation": {
                    "x": round(obj.rotation_euler[0], 4),
                    "y": round(obj.rotation_euler[1], 4),
                    "z": round(obj.rotation_euler[2], 4)
                },
                "properties": {
                    "visible": not (obj.hide_viewport or obj.hide_render),
                    "locked": obj.lock_location[0] and obj.lock_location[1] and obj.lock_location[2],
                    "selected": obj in bpy.context.selected_objects
                }
            }
            
            # Get dimensions based on object type
            if obj.type == 'MESH':
                dims = obj.dimensions
                element["size"] = {
                    "width": round(dims[0], 4),
                    "height": round(dims[1], 4),
                    "depth": round(dims[2], 4)
                }
                
                # Add vertex count for meshes
                element["properties"]["vertexCount"] = len(obj.data.vertices)
                element["properties"]["polygonCount"] = len(obj.data.polygons)
                
                # Add material info
                if len(obj.material_slots) > 0 and obj.material_slots[0].material:
                    mat = obj.material_slots[0].material
                    if hasattr(mat, 'diffuse_color'):
                        element["color"] = {
                            "r": int(mat.diffuse_color[0] * 255),
                            "g": int(mat.diffuse_color[1] * 255),
                            "b": int(mat.diffuse_color[2] * 255),
                            "a": round(mat.diffuse_color[3], 2)
                        }
                    
                    element["properties"]["material"] = mat.name
            
            elif obj.type == 'CAMERA':
                element["properties"]["focal_length"] = obj.data.lens
                element["properties"]["sensor_width"] = obj.data.sensor_width
                
            elif obj.type == 'LIGHT':
                element["properties"]["light_type"] = obj.data.type
                element["properties"]["energy"] = obj.data.energy
                if hasattr(obj.data, 'color'):
                    element["color"] = {
                        "r": int(obj.data.color[0] * 255),
                        "g": int(obj.data.color[1] * 255),
                        "b": int(obj.data.color[2] * 255)
                    }
            
            # Add extra details for full detail level
            if detail_level == "full":
                # Add modifiers
                if obj.modifiers:
                    element["properties"]["modifiers"] = [
                        {"name": mod.name, "type": mod.type} 
                        for mod in obj.modifiers
                    ]
                
                # Add constraints
                if obj.constraints:
                    element["properties"]["constraints"] = [
                        {"name": constraint.name, "type": constraint.type}
                        for constraint in obj.constraints
                    ]
                
                # Add parent information
                if obj.parent:
                    element["properties"]["parent"] = obj.parent.name
                
                # Capture simple thumbnail for object
                if obj.type == 'MESH':
                    small_thumb = capture_object_thumbnail(obj)
                    if small_thumb:
                        element["properties"]["thumbnail"] = small_thumb
            
            return element
        except Exception as e:
            print(f"Error creating element from {obj.name}: {e}")
            return None

    def capture_screenshot(width, height):
        """Capture a screenshot of the current viewport"""
        try:
            import bpy
            
            # Find 3D view area
            area = None
            for a in bpy.context.screen.areas:
                if a.type == 'VIEW_3D':
                    area = a
                    break
            
            if not area:
                return None
            
            # Save original render settings
            original_settings = {
                'engine': bpy.context.scene.render.engine,
                'resolution_x': bpy.context.scene.render.resolution_x,
                'resolution_y': bpy.context.scene.render.resolution_y,
                'resolution_percentage': bpy.context.scene.render.resolution_percentage,
                'filepath': bpy.context.scene.render.filepath
            }
            
            # Set render settings for screenshot
            bpy.context.scene.render.resolution_x = width
            bpy.context.scene.render.resolution_y = height
            bpy.context.scene.render.resolution_percentage = 100
            bpy.context.scene.render.filepath = bpy.app.tempdir + "viewport_screenshot.png"
            
            # Capture viewport
            for space in area.spaces:
                if space.type == 'VIEW_3D':
                    override = bpy.context.copy()
                    override["area"] = area
                    override["region"] = area.regions[-1]
                    bpy.ops.screen.screenshot(override, filepath=bpy.context.scene.render.filepath)
                    
                    # Read screenshot and convert to base64
                    import os
                    if os.path.exists(bpy.context.scene.render.filepath):
                        with open(bpy.context.scene.render.filepath, "rb") as img_file:
                            base64_data = base64.b64encode(img_file.read()).decode('utf-8')
                        os.remove(bpy.context.scene.render.filepath)
                        return f"data:image/png;base64,{base64_data}"
            
            # Restore original settings
            bpy.context.scene.render.engine = original_settings['engine']
            bpy.context.scene.render.resolution_x = original_settings['resolution_x']
            bpy.context.scene.render.resolution_y = original_settings['resolution_y']
            bpy.context.scene.render.resolution_percentage = original_settings['resolution_percentage']
            bpy.context.scene.render.filepath = original_settings['filepath']
            
            return None
        except Exception as e:
            print(f"Error capturing screenshot: {e}")
            return None
    
    def capture_object_thumbnail(obj, size=64):
        """Capture a small thumbnail of a specific object"""
        try:
            # Save current selection and view
            old_selection = [o for o in bpy.context.selected_objects]
            old_active = bpy.context.active_object
            
            # Deselect all objects
            bpy.ops.object.select_all(action='DESELECT')
            
            # Select and make active only our object
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            
            # Frame selected
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    ctx = bpy.context.copy()
                    ctx['area'] = area
                    bpy.ops.view3d.view_selected(ctx)
                    break
            
            # Capture thumbnail
            thumb_path = bpy.app.tempdir + f"obj_thumb_{obj.name}.png"
            bpy.context.scene.render.filepath = thumb_path
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    override = bpy.context.copy()
                    override["area"] = area
                    override["region"] = area.regions[-1]
                    bpy.ops.screen.screenshot(override, filepath=thumb_path)
                    break
            
            # Read and encode thumbnail
            import os
            if os.path.exists(thumb_path):
                with open(thumb_path, "rb") as img_file:
                    base64_data = base64.b64encode(img_file.read()).decode('utf-8')
                os.remove(thumb_path)
                
                # Restore selection
                bpy.ops.object.select_all(action='DESELECT')
                for o in old_selection:
                    o.select_set(True)
                if old_active:
                    bpy.context.view_layer.objects.active = old_active
                
                return f"data:image/png;base64,{base64_data}"
            
            # Restore selection if thumbnail failed
            bpy.ops.object.select_all(action='DESELECT')
            for o in old_selection:
                o.select_set(True)
            if old_active:
                bpy.context.view_layer.objects.active = old_active
                
            return None
        except Exception as e:
            print(f"Error capturing object thumbnail: {e}")
            return None
    
    def calculate_scene_statistics():
        """Calculate statistics about the scene"""
        stats = {
            "totalElements": len(bpy.data.objects),
            "elementsByType": {},
            "totalVertices": 0,
            "totalPolygons": 0,
            "documentComplexity": "simple"
        }
        
        # Count objects by type
        for obj in bpy.data.objects:
            if obj.type not in stats["elementsByType"]:
                stats["elementsByType"][obj.type] = 0
            stats["elementsByType"][obj.type] += 1
            
            # Calculate mesh complexity
            if obj.type == 'MESH':
                stats["totalVertices"] += len(obj.data.vertices)
                stats["totalPolygons"] += len(obj.data.polygons)
        
        # Determine document complexity
        if stats["totalVertices"] > 100000 or stats["totalElements"] > 100:
            stats["documentComplexity"] = "complex"
        elif stats["totalVertices"] > 10000 or stats["totalElements"] > 20:
            stats["documentComplexity"] = "medium"
        
        return stats

    # Main execution
    context_data = get_design_context()
    context_json = json.dumps(context_data)
    print(context_json)  # Return as JSON string
    `;
    
    try {
      const result = await this.blenderService.executeCommand(pythonCode);
      
      if (!result.success) {
        this.logger.error(`Failed to capture Blender context: ${result.error}`);
        return this.createEmptyContext();
      }
      
      // Parse context from output
      try {
        // Extract JSON from output (it may have other logging information)
        const jsonMatch = result.output?.match(/{[\s\S]*}/);
        if (!jsonMatch) {
          this.logger.error('Failed to parse Blender context: No JSON found in output');
          return this.createEmptyContext();
        }
        
        const context = JSON.parse(jsonMatch[0]);
        this.context = context;
        this.lastCaptureTime = Date.now();
        
        this.logger.debug(`Context captured in ${Date.now() - startTime}ms`);
        return context;
      } catch (parseError) {
        this.logger.error(`Failed to parse Blender context: ${parseError.message}`);
        return this.createEmptyContext();
      }
    } catch (error) {
      this.logger.error(`Error executing Blender code: ${error.message}`);
      return this.createEmptyContext();
    }
  }

  /**
   * Start tracking context changes
   */
  async startContextTracking(callback: (update: ContextUpdate) => void): Promise<void> {
    this.logger.log('Starting Blender context tracking');
    
    // Save callback
    this.trackingCallback = callback;
    this.trackingEnabled = true;
    
    // Capture initial context
    if (!this.context) {
      await this.captureContext();
    }
    
    // Setup polling interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = setInterval(async () => {
      if (this.trackingEnabled) {
        await this.checkForContextUpdates();
      }
    }, this.updateFrequency);
    
    // Notify that tracking was enabled
    this.eventEmitter.emit('context.tracking.blender', { active: true });
  }

  /**
   * Stop tracking context changes
   */
  async stopContextTracking(): Promise<void> {
    this.logger.log('Stopping Blender context tracking');
    
    this.trackingEnabled = false;
    this.trackingCallback = null;
    
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Notify that tracking was disabled
    this.eventEmitter.emit('context.tracking.blender', { active: false });
  }

  /**
   * Enable tracking and set callback for updates
   */
  enableTracking(callback: (update: ContextUpdate) => void): void {
    if (!this.trackingEnabled || this.trackingCallback !== callback) {
      this.startContextTracking(callback)
        .catch(error => this.logger.error(`Failed to start context tracking: ${error.message}`));
    }
  }

  /**
   * Disable tracking
   */
  disableTracking(): void {
    if (this.trackingEnabled) {
      this.stopContextTracking()
        .catch(error => this.logger.error(`Failed to stop context tracking: ${error.message}`));
    }
  }

  /**
   * Polling method to check for context updates
   */
  private async checkForContextUpdates() {
    if (!this.trackingEnabled || !this.trackingCallback) {
      return;
    }
    
    try {
      const oldContext = this.context;
      const newContext = await this.captureContext({
        includeScreenshot: false, // Screenshots are expensive, don't include in updates
        detailLevel: 'standard'
      });
      
      if (oldContext && newContext) {
        // Check if there are any meaningful changes
        const update = this.buildContextUpdate(oldContext, newContext);
        
        // If there are changes, notify subscribers
        if (
          update.changes.added.length > 0 ||
          update.changes.modified.length > 0 ||
          update.changes.removed.length > 0 ||
          update.changes.selected.length > 0 ||
          update.changes.deselected.length > 0 ||
          (update.changes.viewTransform && Object.keys(update.changes.viewTransform).length > 0) ||
          update.lastAction
        ) {
          this.trackingCallback(update);
        }
      }
    } catch (error) {
      this.logger.error(`Error checking for context updates: ${error.message}`);
    }
  }

  /**
   * Create a context update object from old and new contexts
   */
  private buildContextUpdate(oldContext: DesignContext, newContext: DesignContext): ContextUpdate {
    // Initialize update object
    const update: ContextUpdate = {
      timestamp: Date.now(),
      documentId: newContext.documentId,
      changes: {
        added: [],
        modified: [],
        removed: [],
        selected: [],
        deselected: [],
        viewTransform: {}
      }
    };
    
    // Copy last action if available
    if (newContext.lastAction && 
        (!oldContext.lastAction || 
         oldContext.lastAction.timestamp !== newContext.lastAction.timestamp)) {
      update.lastAction = newContext.lastAction;
    }
    
    // Build maps of elements for efficient lookup
    const oldElementsMap = new Map<string, DesignElement>();
    const newElementsMap = new Map<string, DesignElement>();
    
    // Populate old elements map
    oldContext.layers.forEach(layer => {
      layer.elements.forEach(element => {
        oldElementsMap.set(element.id, element);
        
        // Also add children
        if (element.children && element.children.length > 0) {
          this.collectChildElements(element.children, oldElementsMap);
        }
      });
    });
    
    // Populate new elements map
    newContext.layers.forEach(layer => {
      layer.elements.forEach(element => {
        newElementsMap.set(element.id, element);
        
        // Also add children
        if (element.children && element.children.length > 0) {
          this.collectChildElements(element.children, newElementsMap);
        }
      });
    });
    
    // Find added, modified, and removed elements
    for (const [id, element] of newElementsMap.entries()) {
      if (!oldElementsMap.has(id)) {
        update.changes.added.push(element);
      } else {
        const oldElement = oldElementsMap.get(id);
        if (this.hasElementChanged(oldElement, element)) {
          update.changes.modified.push({
            id: element.id,
            properties: element
          });
        }
      }
    }
    
    for (const [id, element] of oldElementsMap.entries()) {
      if (!newElementsMap.has(id)) {
        update.changes.removed.push(id);
      }
    }
    
    // Check for selection changes
    const oldSelectedIds = new Set(oldContext.selectedElements.map(element => element.id));
    const newSelectedIds = new Set(newContext.selectedElements.map(element => element.id));
    
    for (const id of newSelectedIds) {
      if (!oldSelectedIds.has(id)) {
        update.changes.selected.push(id);
      }
    }
    
    for (const id of oldSelectedIds) {
      if (!newSelectedIds.has(id)) {
        update.changes.deselected.push(id);
      }
    }
    
    // Check for view transform changes
    if (this.hasPositionChanged(oldContext.viewTransform, newContext.viewTransform)) {
      update.changes.viewTransform = {
        zoom: newContext.viewTransform.zoom,
        panX: newContext.viewTransform.panX,
        panY: newContext.viewTransform.panY,
        rotation: newContext.viewTransform.rotation
      };
    }
    
    return update;
  }

  /**
   * Recursively collect child elements
   */
  private collectChildElements(children: DesignElement[], elementsMap: Map<string, DesignElement>) {
    children.forEach(child => {
      elementsMap.set(child.id, child);
      
      if (child.children && child.children.length > 0) {
        this.collectChildElements(child.children, elementsMap);
      }
    });
  }

  /**
   * Check if an element has changed
   */
  private hasElementChanged(oldElement: DesignElement, newElement: DesignElement): boolean {
    // Check basic properties
    if (oldElement.name !== newElement.name || 
        oldElement.type !== newElement.type) {
      return true;
    }
    
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
    
    // Deep compare properties
    if (JSON.stringify(oldElement.properties) !== JSON.stringify(newElement.properties)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if position has changed
   */
  private hasPositionChanged(oldPos: Position, newPos: Position): boolean;
  private hasPositionChanged(oldTransform: { zoom: number; panX: number; panY: number; rotation?: number }, 
                             newTransform: { zoom: number; panX: number; panY: number; rotation?: number }): boolean;
  private hasPositionChanged(oldObj: any, newObj: any): boolean {
    if (!oldObj || !newObj) return true;
    
    // Check if it's a Position object
    if ('x' in oldObj && 'y' in newObj) {
      return oldObj.x !== newObj.x || 
             oldObj.y !== newObj.y || 
             (oldObj.z !== undefined && newObj.z !== undefined && oldObj.z !== newObj.z);
    }
    
    // Check if it's a viewTransform object
    if ('zoom' in oldObj && 'panX' in newObj) {
      return oldObj.zoom !== newObj.zoom || 
             oldObj.panX !== newObj.panX || 
             oldObj.panY !== newObj.panY ||
             (oldObj.rotation !== newObj.rotation);
    }
    
    // Generic object comparison fallback
    return JSON.stringify(oldObj) !== JSON.stringify(newObj);
  }

  /**
   * Create an empty context when capture fails
   */
  private createEmptyContext(): DesignContext {
    return {
      documentId: 'empty',
      documentName: 'Unnamed',
      documentPath: 'bpy.data',
      platform: 'blender',
      size: {
        width: 1920,
        height: 1080,
        depth: 0
      },
      currentFrame: 1,
      layers: [],
      selectedElements: [],
      viewTransform: {
        zoom: 1,
        panX: 0,
        panY: 0
      },
      statistics: {
        totalElements: 0,
        elementsByType: {},
        documentComplexity: 'simple'
      }
    };
  }
} 