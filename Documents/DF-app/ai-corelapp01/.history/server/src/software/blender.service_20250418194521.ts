import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  visualData?: any;
  returnValue?: any;
}

/**
 * BlenderService
 * 
 * Service for communicating with Blender through its API
 */
@Injectable()
export class BlenderService {
  private readonly logger = new Logger(BlenderService.name);
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('BLENDER_API_URL', 'http://localhost:4201');
    this.logger.log(`Blender API URL: ${this.apiUrl}`);
  }

  /**
   * Execute a method on the Blender API
   * 
   * @param objectPath Path to the object in the Blender object model
   * @param methodName Method to execute
   * @param params Parameters to pass to the method
   * @returns Result of the method execution
   */
  async executeMethod(objectPath: string, methodName: string, params: any[] = []): Promise<any> {
    try {
      this.logger.debug(`Executing ${objectPath}.${methodName}(${JSON.stringify(params)})`);
      
      // In development/testing mode, we'll simulate responses
      if (process.env.NODE_ENV !== 'production') {
        return this.mockResponse(objectPath, methodName, params);
      }

      // In production, we'd make an actual API call
      const response = await fetch(`${this.apiUrl}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          objectPath,
          methodName,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error(`Blender API error: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      this.logger.error(`Error executing ${objectPath}.${methodName}: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check connection to Blender API
   */
  async checkConnection(): Promise<boolean> {
    try {
      const result = await this.executeMethod('bpy', 'app.version', []);
      return result.success;
    } catch (error) {
      this.logger.error(`Connection check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Mock responses for development/testing
   */
  private mockResponse(objectPath: string, methodName: string, params: any[]): any {
    // Mock some common API responses
    if (objectPath === 'bpy' && methodName === 'app.version') {
      return {
        success: true,
        result: { version: '3.6.0', build: 'Blender 3.6.0 (a177971a5a13)' }
      };
    }

    if (objectPath === 'bpy.context.scene' && methodName === 'summarize') {
      return {
        success: true,
        result: {
          name: 'Scene',
          frame_current: 1,
          frame_start: 1,
          frame_end: 250,
          render: {
            resolution_x: 1920,
            resolution_y: 1080,
            fps: 24
          }
        }
      };
    }

    if (objectPath === 'bpy.context.view_layer' && methodName === 'getObjects') {
      return {
        success: true,
        result: [
          {
            name: 'Cube',
            type: 'MESH',
            objectPath: 'bpy.data.objects["Cube"]',
            location: { x: 0, y: 0, z: 0 },
            dimensions: { x: 2, y: 2, z: 2 },
            properties: {
              material: 'Material',
              visible: true,
              selected: false
            }
          },
          {
            name: 'Camera',
            type: 'CAMERA',
            objectPath: 'bpy.data.objects["Camera"]',
            location: { x: 7.358, y: -6.925, z: 4.958 },
            rotation: { x: 63.559, y: 0, z: 46.691 },
            properties: {
              visible: true,
              selected: false
            }
          },
          {
            name: 'Light',
            type: 'LIGHT',
            objectPath: 'bpy.data.objects["Light"]',
            location: { x: 4.076, y: 1.005, z: 5.904 },
            properties: {
              light_type: 'SUN',
              energy: 1.0,
              visible: true,
              selected: false
            }
          }
        ]
      };
    }

    if (objectPath === 'bpy.context.selected_objects' && methodName === 'getInfo') {
      return {
        success: true,
        result: []
      };
    }

    if (objectPath === 'bpy.context.active_object' && methodName === 'getInfo') {
      return {
        success: true,
        result: null
      };
    }

    if (objectPath === 'bpy.context.scene' && methodName === 'getCollections') {
      return {
        success: true,
        result: [
          {
            name: 'Collection',
            objects: [
              'Cube',
              'Camera',
              'Light'
            ]
          }
        ]
      };
    }

    if (objectPath === 'bpy.ops.render' && methodName === 'render') {
      // Return a simple base64 string to mock a render
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      
      return {
        success: true,
        result: {
          width: 1920,
          height: 1080,
          format: 'PNG',
          base64Data: `data:image/png;base64,${base64Image}`
        }
      };
    }

    if (objectPath === 'bpy.context.space_data' && methodName === 'screenshot') {
      // Return a simple base64 string to mock a viewport screenshot
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      
      return {
        success: true,
        result: {
          width: 800,
          height: 600,
          format: 'PNG',
          base64Data: `data:image/png;base64,${base64Image}`
        }
      };
    }

    // Default mock response for any other method
    return {
      success: true,
      result: {
        message: `Mock response for ${objectPath}.${methodName}`,
        params: params
      }
    };
  }

  /**
   * Execute Python code in Blender
   */
  async executeCode(code: string, options: any = {}): Promise<ExecutionResult> {
    this.logger.debug(`Executing Blender code: ${code.substring(0, 50)}...`);
    
    // In a real implementation, this would communicate with Blender through an API
    // For now, return mock data
    return {
      success: true,
      output: "Code executed successfully in Blender",
    };
  }
  
  /**
   * Get connection status to Blender
   */
  async getStatus(): Promise<{ connected: boolean; version?: string }> {
    // In a real implementation, this would check connection to Blender
    // For now, return mock data
    this.logger.debug('Getting Blender connection status');
    return {
      connected: true,
      version: 'Blender 3.5.0'
    };
  }
  
  /**
   * Execute a high-level command in Blender
   */
  async executeCommand(command: string, params: Record<string, any> = {}): Promise<ExecutionResult> {
    this.logger.debug(`Executing command in Blender: ${command} with params: ${JSON.stringify(params)}`);
    
    // Convert command to Python code
    let pythonCode: string;
    
    // Simple example translation
    if (command.includes('create cube')) {
      const { location = [0, 0, 0], size = 2 } = params;
      pythonCode = `
import bpy

# Delete default cube if present
if 'Cube' in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects['Cube'])

# Create a new cube
bpy.ops.mesh.primitive_cube_add(size=${size}, location=(${location[0]}, ${location[1]}, ${location[2]}))
new_cube = bpy.context.active_object
new_cube.name = 'AI_Generated_Cube'
      `;
    } else {
      pythonCode = `
import bpy
print("Executing command: ${command}")
      `;
    }
    
    // Execute the generated Python code
    return this.executeCode(pythonCode);
  }
} 