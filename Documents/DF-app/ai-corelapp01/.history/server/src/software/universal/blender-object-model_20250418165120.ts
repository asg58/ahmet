/**
 * Blender implementation of the UniversalObjectModel
 */

import { BlenderService } from '../blender.service';
import {
  UniversalObjectModel,
  ObjectPath,
  ObjectDescriptor,
  PropertyResult,
  MethodResult,
  PropertyDescriptor,
  MethodDescriptor
} from './universal-object-model';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BlenderObjectModel implements UniversalObjectModel {
  private readonly logger = new Logger(BlenderObjectModel.name);
  
  // Common Blender object model structure (simplified)
  private readonly objectModel = {
    'bpy': {
      type: 'Module',
      properties: [
        { name: 'context', type: 'Context', readable: true, writable: false },
        { name: 'data', type: 'BlendData', readable: true, writable: false },
        { name: 'ops', type: 'OperatorsModule', readable: true, writable: false },
      ],
      methods: []
    },
    'bpy.context': {
      type: 'Context',
      properties: [
        { name: 'active_object', type: 'Object', readable: true, writable: true },
        { name: 'selected_objects', type: 'Collection', readable: true, writable: false },
        { name: 'scene', type: 'Scene', readable: true, writable: false },
      ],
      methods: []
    },
    'bpy.data': {
      type: 'BlendData',
      properties: [
        { name: 'objects', type: 'Collection', readable: true, writable: false },
        { name: 'meshes', type: 'Collection', readable: true, writable: false },
        { name: 'materials', type: 'Collection', readable: true, writable: false },
      ],
      methods: []
    },
    'bpy.ops.mesh': {
      type: 'Module',
      properties: [],
      methods: [
        { 
          name: 'primitive_cube_add',
          returnType: 'OperatorResult',
          parameters: [
            { name: 'size', type: 'float', optional: true, defaultValue: 2.0 },
            { name: 'location', type: 'tuple', optional: true, defaultValue: [0, 0, 0] },
            { name: 'rotation', type: 'tuple', optional: true, defaultValue: [0, 0, 0] }
          ]
        },
        { 
          name: 'primitive_cylinder_add',
          returnType: 'OperatorResult',
          parameters: [
            { name: 'vertices', type: 'int', optional: true, defaultValue: 32 },
            { name: 'radius', type: 'float', optional: true, defaultValue: 1.0 },
            { name: 'depth', type: 'float', optional: true, defaultValue: 2.0 },
            { name: 'location', type: 'tuple', optional: true, defaultValue: [0, 0, 0] },
            { name: 'rotation', type: 'tuple', optional: true, defaultValue: [0, 0, 0] }
          ]
        }
      ]
    },
    'Object': {
      type: 'Object',
      properties: [
        { name: 'name', type: 'string', readable: true, writable: true },
        { name: 'location', type: 'Vector', readable: true, writable: true },
        { name: 'rotation_euler', type: 'Euler', readable: true, writable: true },
        { name: 'scale', type: 'Vector', readable: true, writable: true },
        { name: 'data', type: 'Mesh', readable: true, writable: true },
      ],
      methods: [
        { 
          name: 'select_set',
          returnType: 'void',
          parameters: [
            { name: 'state', type: 'boolean', optional: false }
          ]
        }
      ]
    },
    'Material': {
      type: 'Material',
      properties: [
        { name: 'name', type: 'string', readable: true, writable: true },
        { name: 'diffuse_color', type: 'Color', readable: true, writable: true },
        { name: 'metallic', type: 'float', readable: true, writable: true },
        { name: 'roughness', type: 'float', readable: true, writable: true },
      ],
      methods: []
    }
  };
  
  constructor(private readonly blenderService: BlenderService) {}
  
  async getRootObjects(): Promise<ObjectPath[]> {
    // In Blender, the root module is bpy
    return ['bpy'];
  }
  
  async getObjectDescriptor(path: ObjectPath): Promise<ObjectDescriptor> {
    this.logger.debug(`Getting object descriptor for ${path}`);
    
    // Parse the path to get object type
    const segments = path.split('.');
    const lastSegment = segments[segments.length - 1];
    const objectType = lastSegment.split('[')[0];
    
    // Try to find in predefined model
    let modelInfo = this.objectModel[path];
    
    // If not found directly, try looking up by type
    if (!modelInfo && this.objectModel[objectType]) {
      modelInfo = this.objectModel[objectType];
    }
    
    if (!modelInfo) {
      // If still not found, query Blender for type info
      try {
        const result = await this.executeCode(`
          import json
          import inspect
          
          def get_object_info(path):
              try:
                  # Evaluate the path to get the object
                  obj = eval(path)
                  
                  # Get properties
                  properties = []
                  for name in dir(obj):
                      if not name.startswith('__'):
                          try:
                              prop = getattr(obj, name)
                              if not callable(prop):
                                  properties.append({
                                      "name": name,
                                      "type": type(prop).__name__,
                                      "readable": True,
                                      "writable": not isinstance(prop, (tuple, list, dict)) 
                                  })
                          except:
                              pass
                  
                  # Get methods
                  methods = []
                  for name in dir(obj):
                      if not name.startswith('__'):
                          try:
                              method = getattr(obj, name)
                              if callable(method):
                                  sig = inspect.signature(method)
                                  params = []
                                  for param_name, param in sig.parameters.items():
                                      if param_name != 'self':
                                          params.append({
                                              "name": param_name,
                                              "type": "any",
                                              "optional": param.default != inspect.Parameter.empty,
                                              "defaultValue": str(param.default) if param.default != inspect.Parameter.empty else None
                                          })
                                  methods.append({
                                      "name": name,
                                      "parameters": params,
                                      "returnType": "any"
                                  })
                          except:
                              pass
                  
                  return {
                      "path": path,
                      "type": type(obj).__name__,
                      "properties": properties,
                      "methods": methods
                  }
              except Exception as e:
                  return {"error": str(e)}
          
          result = get_object_info("${path}")
          print(json.dumps(result))
        `);
        
        if (result.success && result.output) {
          try {
            const info = JSON.parse(result.output);
            if (!info.error) {
              return info;
            }
          } catch (e) {
            this.logger.error(`Error parsing Blender info: ${e.message}`);
          }
        }
      } catch (e) {
        this.logger.error(`Error getting Blender object info: ${e.message}`);
      }

      throw new Error(`Unknown object type: ${objectType}`);
    }
    
    // Use pre-defined model information
    return {
      path,
      type: modelInfo.type,
      properties: modelInfo.properties as PropertyDescriptor[],
      methods: modelInfo.methods as MethodDescriptor[],
      children: [] // Would be populated with actual children from Blender
    };
  }
  
  async getProperty(objectPath: ObjectPath, propertyName: string): Promise<PropertyResult> {
    this.logger.debug(`Getting property ${propertyName} from ${objectPath}`);
    
    // Generate Python code to get the property
    const pythonCode = `
    import json
    
    # Get property value and type
    try:
        value = ${objectPath}.${propertyName}
        
        # Try to convert to JSON-compatible format
        if hasattr(value, "to_list"):
            # Handle Vector, Color, etc.
            value = value.to_list()
        elif hasattr(value, "__dict__"):
            # Handle custom objects
            value = {"type": type(value).__name__, "id": str(value)}
        
        # Return result
        result = {
            "value": value,
            "type": type(value).__name__,
            "success": True
        }
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
    
    print(json.dumps(result))
    `;
    
    try {
      // Execute the code through Blender service
      const result = await this.blenderService.executeCode(pythonCode);
      
      if (result.success && result.output) {
        try {
          return JSON.parse(result.output);
        } catch (e) {
          return {
            value: null,
            type: "unknown",
            success: false,
            error: `Error parsing result: ${e.message}`
          };
        }
      } else {
        return {
          value: null,
          type: "unknown",
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      this.logger.error(`Error getting property: ${error.message}`);
      return {
        value: null,
        type: "unknown",
        success: false,
        error: error.message
      };
    }
  }
  
  async setProperty(objectPath: ObjectPath, propertyName: string, value: any): Promise<PropertyResult> {
    this.logger.debug(`Setting property ${propertyName} on ${objectPath} to ${JSON.stringify(value)}`);
    
    // Format the value for Python
    let formattedValue: string;
    if (typeof value === 'string') {
      formattedValue = `"${value.replace(/"/g, '\\"')}"`;
    } else if (Array.isArray(value)) {
      formattedValue = `[${value.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`;
    } else if (value === null) {
      formattedValue = 'None';
    } else if (typeof value === 'object') {
      formattedValue = JSON.stringify(value).replace(/"([^"]+)":/g, '$1:');
    } else {
      formattedValue = String(value);
    }
    
    // Generate Python code to set the property
    const pythonCode = `
    import json
    
    # Set property value
    try:
        # Get current value to determine its type
        current = ${objectPath}.${propertyName}
        
        # Handle special vector types
        if hasattr(current, "to_list"):
            # For Vector, Color, etc.
            for i, v in enumerate(${formattedValue}):
                current[i] = v
            value = current.to_list()
        else:
            # For regular properties
            ${objectPath}.${propertyName} = ${formattedValue}
            value = ${formattedValue}
        
        # Return result
        result = {
            "value": value,
            "type": type(${objectPath}.${propertyName}).__name__,
            "success": True
        }
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
    
    print(json.dumps(result))
    `;
    
    try {
      // Execute the code through Blender service
      const result = await this.blenderService.executeCode(pythonCode);
      
      if (result.success && result.output) {
        try {
          return JSON.parse(result.output);
        } catch (e) {
          return {
            value: null,
            type: "unknown",
            success: false,
            error: `Error parsing result: ${e.message}`
          };
        }
      } else {
        return {
          value: null,
          type: "unknown",
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      this.logger.error(`Error setting property: ${error.message}`);
      return {
        value: null,
        type: "unknown",
        success: false,
        error: error.message
      };
    }
  }
  
  async invokeMethod(objectPath: ObjectPath, methodName: string, args: any[]): Promise<MethodResult> {
    this.logger.debug(`Invoking method ${methodName} on ${objectPath} with args ${JSON.stringify(args)}`);
    
    // Format arguments for Python
    const formattedArgs = args.map(arg => {
      if (typeof arg === 'string') {
        return `"${arg.replace(/"/g, '\\"')}"`;
      } else if (Array.isArray(arg)) {
        return `[${arg.map(v => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`;
      } else if (arg === null) {
        return 'None';
      } else if (typeof arg === 'object') {
        return JSON.stringify(arg).replace(/"([^"]+)":/g, '$1:');
      } else {
        return String(arg);
      }
    }).join(', ');
    
    // Generate Python code to invoke the method
    const pythonCode = `
    import json
    import bpy
    
    # Invoke method
    try:
        # Call the method
        return_value = ${objectPath}.${methodName}(${formattedArgs})
        
        # Process return value for JSON
        if hasattr(return_value, "to_list"):
            # For Vector, Color, etc.
            return_value = return_value.to_list()
        elif hasattr(return_value, "__dict__"):
            # For custom objects
            return_value = {"type": type(return_value).__name__, "id": str(return_value)}
        
        # Return result
        result = {
            "returnValue": return_value,
            "success": True
        }
        
        # If it modified the 3D view, create a screenshot
        if bpy.context.screen:
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    # Create a snapshot (would need to be implemented)
                    # This is a placeholder
                    pass
    except Exception as e:
        result = {
            "success": False,
            "error": str(e)
        }
    
    print(json.dumps(result))
    `;
    
    try {
      // Execute the code through Blender service
      const result = await this.blenderService.executeCode(pythonCode);
      
      if (result.success && result.output) {
        try {
          const parsed = JSON.parse(result.output);
          return {
            ...parsed,
            visualResult: result.visualData
          };
        } catch (e) {
          return {
            returnValue: null,
            success: false,
            error: `Error parsing result: ${e.message}`
          };
        }
      } else {
        return {
          returnValue: null,
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      this.logger.error(`Error invoking method: ${error.message}`);
      return {
        returnValue: null,
        success: false,
        error: error.message
      };
    }
  }
  
  async executeCode(code: string): Promise<MethodResult> {
    this.logger.debug(`Executing code: ${code.substring(0, 100)}...`);
    
    try {
      // Pass directly to Blender service
      const result = await this.blenderService.executeCode(code);
      
      if (result.success) {
        return {
          returnValue: result.output || "Code executed successfully",
          success: true,
          visualResult: result.visualData
        };
      } else {
        return {
          returnValue: null,
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      this.logger.error(`Error executing code: ${error.message}`);
      return {
        returnValue: null,
        success: false,
        error: error.message
      };
    }
  }
  
  async findObjects(typeOrPattern: string): Promise<ObjectPath[]> {
    this.logger.debug(`Finding objects matching ${typeOrPattern}`);
    
    // Generate Python code to find objects
    const pythonCode = `
    import json
    import bpy
    
    results = []
    
    # Check if it's a type query
    if "${typeOrPattern}" in ("Mesh", "Camera", "Light", "Armature", "Curve"):
        # Find objects by type
        for obj in bpy.data.objects:
            if obj.type == "${typeOrPattern}":
                results.append(f"bpy.data.objects['{obj.name}']")
    else:
        # Try name pattern match
        pattern = "${typeOrPattern}".lower()
        for obj in bpy.data.objects:
            if pattern in obj.name.lower():
                results.append(f"bpy.data.objects['{obj.name}']")
    
    print(json.dumps(results))
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      
      if (result.success && result.output) {
        try {
          return JSON.parse(result.output);
        } catch (e) {
          this.logger.error(`Error parsing findObjects result: ${e.message}`);
          return [];
        }
      } else {
        this.logger.error(`Error in findObjects: ${result.error}`);
        return [];
      }
    } catch (error) {
      this.logger.error(`Error in findObjects: ${error.message}`);
      return [];
    }
  }
  
  async getCurrentContext(): Promise<{ documentPath: ObjectPath; selectedObjects: ObjectPath[]; activeLayer?: ObjectPath; documentProperties: Record<string, any>; }> {
    this.logger.debug('Getting current context');
    
    // Generate Python code to get current context
    const pythonCode = `
    import json
    import bpy
    
    context = {
        "documentPath": "bpy.data",
        "selectedObjects": [],
        "documentProperties": {
            "name": bpy.path.basename(bpy.context.blend_data.filepath) or "Untitled",
            "frames": bpy.context.scene.frame_end,
            "currentFrame": bpy.context.scene.frame_current,
            "fps": bpy.context.scene.render.fps,
            "renderEngine": bpy.context.scene.render.engine
        }
    }
    
    # Get selected objects
    for obj in bpy.context.selected_objects:
        context["selectedObjects"].append(f"bpy.data.objects['{obj.name}']")
    
    # Get active collection as "layer"
    if bpy.context.collection:
        context["activeLayer"] = f"bpy.data.collections['{bpy.context.collection.name}']"
    
    print(json.dumps(context))
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      
      if (result.success && result.output) {
        try {
          return JSON.parse(result.output);
        } catch (e) {
          this.logger.error(`Error parsing context: ${e.message}`);
        }
      }
    } catch (error) {
      this.logger.error(`Error getting context: ${error.message}`);
    }
    
    // Return basic context if above fails
    return {
      documentPath: 'bpy.data',
      selectedObjects: [],
      documentProperties: {
        name: 'Unknown.blend',
        frames: 250,
        currentFrame: 1
      }
    };
  }
  
  async getCapabilities(): Promise<{ platform: 'coreldraw' | 'blender'; supportsInspection: boolean; supportsThumbnails: boolean; supportsUndo: boolean; supportsBatchOperations: boolean; }> {
    // Return Blender capabilities
    return {
      platform: 'blender',
      supportsInspection: true,
      supportsThumbnails: true,
      supportsUndo: true,
      supportsBatchOperations: true
    };
  }
} 