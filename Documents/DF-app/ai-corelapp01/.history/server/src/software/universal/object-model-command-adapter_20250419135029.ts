import { Injectable, Logger } from '@nestjs/common';
import { CommandFactoryService, CommandExecutionResult } from '../commands/command-factory.service';
import { BlenderObjectModel } from './blender-object-model';
import { CorelDrawObjectModel } from './coreldraw-object-model';
import { UniversalObjectModel, ObjectPath, MethodResult } from './universal-object-model';

/**
 * ObjectModelCommandAdapter
 * 
 * This service adapts the UniversalObjectModel to work with the CommandFactoryService,
 * translating between command-based and object-based paradigms.
 */
@Injectable()
export class ObjectModelCommandAdapter {
  private readonly logger = new Logger(ObjectModelCommandAdapter.name);
  
  constructor(
    private readonly commandFactory: CommandFactoryService,
    private readonly blenderObjectModel: BlenderObjectModel,
    private readonly corelDrawObjectModel: CorelDrawObjectModel
  ) {}
  
  /**
   * Execute a command through the object model
   * 
   * This method translates command-based operations to object model operations,
   * which provides more flexibility and better error handling
   */
  async executeCommandViaObjectModel(
    platform: 'coreldraw' | 'blender',
    action: string,
    params: Record<string, any> = {}
  ): Promise<CommandExecutionResult> {
    this.logger.debug(`Executing command via object model: ${platform}.${action} with ${JSON.stringify(params)}`);
    
    // Get the appropriate object model based on platform
    const objectModel = this.getObjectModel(platform);
    
    try {
      if (platform === 'blender') {
        return await this.executeBlenderCommand(objectModel, action, params);
      } else if (platform === 'coreldraw') {
        return await this.executeCorelDrawCommand(objectModel, action, params);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (error) {
      this.logger.error(`Error executing command via object model: ${error.message}`);
      
      // Fall back to command factory if object model fails
      this.logger.debug(`Falling back to command factory execution`);
      return this.commandFactory.executeCommand(platform, action, params);
    }
  }
  
  /**
   * Execute a Blender command via the object model
   */
  private async executeBlenderCommand(
    objectModel: UniversalObjectModel,
    action: string,
    params: Record<string, any>
  ): Promise<CommandExecutionResult> {
    // Map common actions to object model operations
    switch (action.toLowerCase()) {
      case 'create_cube':
      case 'cube': {
        const { location = [0, 0, 0], size = 2 } = params;
        
        // Invoke the Blender API method to create a cube
        const result = await objectModel.invokeMethod(
          'bpy.ops.mesh', 
          'primitive_cube_add', 
          [{ size, location }]
        );
        
        // If material specified, apply it to the created cube
        if (params.material && result.success) {
          const context = await objectModel.getCurrentContext();
          const activeObject = context.selectedObjects[0];
          
          if (activeObject) {
            await this.applyMaterialToObject(objectModel, activeObject, params.material);
          }
        }
        
        return this.convertMethodResultToCommandResult(result);
      }
      
      case 'create_sphere':
      case 'sphere': {
        const { location = [0, 0, 0], radius = 1, segments = 32, rings = 16 } = params;
        
        // Invoke the Blender API method to create a sphere
        const result = await objectModel.invokeMethod(
          'bpy.ops.mesh', 
          'primitive_uv_sphere_add', 
          [{ 
            radius, 
            location,
            segments,
            ring_count: rings 
          }]
        );
        
        // If material specified, apply it
        if (params.material && result.success) {
          const context = await objectModel.getCurrentContext();
          const activeObject = context.selectedObjects[0];
          
          if (activeObject) {
            await this.applyMaterialToObject(objectModel, activeObject, params.material);
          }
        }
        
        return this.convertMethodResultToCommandResult(result);
      }
      
      case 'select_objects':
      case 'select': {
        const { type, name, all } = params;
        
        if (all) {
          const result = await objectModel.executeCode(`
            import bpy
            bpy.ops.object.select_all(action='SELECT')
            print("Selected all objects")
          `);
          return this.convertMethodResultToCommandResult(result);
        } else if (type) {
          const result = await objectModel.executeCode(`
            import bpy
            count = 0
            for obj in bpy.data.objects:
                if obj.type == "${type}":
                    obj.select_set(True)
                    count += 1
            print(f"Selected {count} objects of type {type}")
          `);
          return this.convertMethodResultToCommandResult(result);
        } else if (name) {
          const result = await objectModel.executeCode(`
            import bpy
            count = 0
            for obj in bpy.data.objects:
                if "${name}" in obj.name:
                    obj.select_set(True)
                    count += 1
            print(f"Selected {count} objects with name containing '{name}'")
          `);
          return this.convertMethodResultToCommandResult(result);
        } else {
          throw new Error("No selection criteria provided");
        }
      }
      
      // Handle other Blender actions as needed
      
      default:
        // For unhandled actions, fall back to the command factory
        return this.commandFactory.executeCommand('blender', action, params);
    }
  }
  
  /**
   * Execute a CorelDRAW command via the object model
   */
  private async executeCorelDrawCommand(
    objectModel: UniversalObjectModel,
    action: string,
    params: Record<string, any>
  ): Promise<CommandExecutionResult> {
    // Map common actions to object model operations
    switch (action.toLowerCase()) {
      case 'create_rectangle':
      case 'rectangle': {
        const { x = 0, y = 0, width = 100, height = 100 } = params;
        
        // Get the active page
        const context = await objectModel.getCurrentContext();
        const activePage = context.documentPath + '.ActivePage';
        
        // Create rectangle via object model
        const result = await objectModel.invokeMethod(
          activePage,
          'CreateRectangle',
          [x, y, width, height]
        );
        
        // Apply style properties if specified
        if (result.success && result.returnValue) {
          const rectPath = result.returnValue as string;
          
          if (params.fill) {
            await this.applyFillToObject(objectModel, rectPath, params.fill);
          }
          
          if (params.outline) {
            await this.applyOutlineToObject(objectModel, rectPath, params.outline);
          }
        }
        
        return this.convertMethodResultToCommandResult(result);
      }
      
      case 'create_ellipse':
      case 'ellipse': {
        const { x = 0, y = 0, width = 100, height = 100 } = params;
        
        // Get the active page
        const context = await objectModel.getCurrentContext();
        const activePage = context.documentPath + '.ActivePage';
        
        // Create ellipse via object model
        const result = await objectModel.invokeMethod(
          activePage,
          'CreateEllipse',
          [x, y, width, height]
        );
        
        // Apply style properties if specified
        if (result.success && result.returnValue) {
          const ellipsePath = result.returnValue as string;
          
          if (params.fill) {
            await this.applyFillToObject(objectModel, ellipsePath, params.fill);
          }
          
          if (params.outline) {
            await this.applyOutlineToObject(objectModel, ellipsePath, params.outline);
          }
        }
        
        return this.convertMethodResultToCommandResult(result);
      }
      
      // Handle other CorelDRAW actions as needed
      
      default:
        // For unhandled actions, fall back to the command factory
        return this.commandFactory.executeCommand('coreldraw', action, params);
    }
  }
  
  /**
   * Apply material to a Blender object
   */
  private async applyMaterialToObject(
    objectModel: UniversalObjectModel,
    objectPath: ObjectPath,
    material: any
  ): Promise<void> {
    // Extract material properties
    const { name = 'Material', color = [0.8, 0.2, 0.2], metallic = 0, roughness = 0.5 } = 
      typeof material === 'string' ? { name: material } : material;
    
    // Create or get material via Python code for more flexibility
    await objectModel.executeCode(`
      import bpy
      
      # Get or create material
      mat = bpy.data.materials.get("${name}")
      if not mat:
          mat = bpy.data.materials.new(name="${name}")
      
      # Set material properties
      mat.use_nodes = True
      if mat.node_tree:
          principled = mat.node_tree.nodes.get("Principled BSDF")
          if principled:
              principled.inputs["Base Color"].default_value = (${color[0]}, ${color[1]}, ${color[2]}, 1.0)
              principled.inputs["Metallic"].default_value = ${metallic}
              principled.inputs["Roughness"].default_value = ${roughness}
      
      # Apply to object
      obj = bpy.data.objects["${objectPath.split('.').pop()}"]
      if obj.data.materials:
          obj.data.materials[0] = mat
      else:
          obj.data.materials.append(mat)
    `);
  }
  
  /**
   * Apply fill to a CorelDRAW object
   */
  private async applyFillToObject(
    objectModel: UniversalObjectModel,
    objectPath: ObjectPath,
    fill: any
  ): Promise<void> {
    if (typeof fill === 'string') {
      // Handle string color value (e.g. "#FF0000")
      await objectModel.executeCode(`
        Dim obj As Shape
        Set obj = ${objectPath}
        
        obj.Fill.ApplyUniformFill "${fill}"
      `);
    } else {
      // Handle complex fill object
      // Implementation depends on the structure of fill parameter
    }
  }
  
  /**
   * Apply outline to a CorelDRAW object
   */
  private async applyOutlineToObject(
    objectModel: UniversalObjectModel,
    objectPath: ObjectPath,
    outline: any
  ): Promise<void> {
    if (typeof outline === 'object') {
      const { width = 1, color = "#000000" } = outline;
      
      await objectModel.executeCode(`
        Dim obj As Shape
        Set obj = ${objectPath}
        
        obj.Outline.SetProperties ${width}
        obj.Outline.Color.RGBAssign 0, 0, 0
      `);
    } else if (typeof outline === 'string') {
      // Handle string color value
      await objectModel.executeCode(`
        Dim obj As Shape
        Set obj = ${objectPath}
        
        obj.Outline.Color.RGBAssign 0, 0, 0
      `);
    }
  }
  
  /**
   * Get the object model for the specified platform
   */
  private getObjectModel(platform: 'coreldraw' | 'blender'): UniversalObjectModel {
    if (platform === 'blender') {
      return this.blenderObjectModel;
    } else if (platform === 'coreldraw') {
      return this.corelDrawObjectModel;
    } else {
      throw new Error(`Unsupported platform: ${platform}`);
    }
  }
  
  /**
   * Convert a MethodResult to CommandExecutionResult
   */
  private convertMethodResultToCommandResult(result: MethodResult): CommandExecutionResult {
    return {
      success: result.success,
      output: result.returnValue?.toString(),
      error: result.error,
      visualData: result.visualResult
    };
  }
} 