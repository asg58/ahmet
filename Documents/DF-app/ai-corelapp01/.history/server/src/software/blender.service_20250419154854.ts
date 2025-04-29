import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

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
 * Service for communicating with Blender through its API Bridge
 */
@Injectable()
export class BlenderService {
  private readonly logger = new Logger(BlenderService.name);
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    // De URL van de Blender Bridge API
    const host = this.configService.get<string>('BLENDER_HOST', 'localhost');
    const port = this.configService.get<string>('BLENDER_PORT', '4201');
    this.apiUrl = `http://${host}:${port}/api`;
    
    this.logger.log(`Blender API URL: ${this.apiUrl}`);
  }

  /**
   * Execute Python code in Blender via the Bridge API
   */
  async executeCode(code: string, options: any = {}): Promise<ExecutionResult> {
    this.logger.debug(`Executing code in Blender: ${code.substring(0, 50)}...`);
    
    try {
      const timeout = options.timeout || 30000;
      
      // Communiceer met de Bridge API om de code uit te voeren
      const response = await axios.post(`${this.apiUrl}/execute`, {
        code,
        timeout
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error executing code in Blender: ${error.message}`);
      
      // Als er een Axios response error is, gebruik de gestructureerde foutmelding
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      // Generieke foutmelding
      return {
        success: false,
        error: `Failed to execute code in Blender: ${error.message}`
      };
    }
  }
  
  /**
   * Execute Python code in Blender
   */
  async executePythonCode(code: string, options: any = {}): Promise<ExecutionResult> {
    return this.executeCode(code, options);
  }
  
  /**
   * Another alias for executePythonCode
   */
  async executePython(code: string, options: any = {}): Promise<ExecutionResult> {
    return this.executePythonCode(code, options);
  }
  
  /**
   * Get status of Blender connection
   */
  async getStatus(): Promise<{ connected: boolean; version?: string }> {
    try {
      // Vraag de status op via de Bridge API
      const response = await axios.get(`${this.apiUrl}/status/blender`);
      
      return {
        connected: response.data.running,
        version: response.data.version
      };
    } catch (error) {
      this.logger.error(`Error getting Blender status: ${error.message}`);
      return { connected: false };
    }
  }
  
  /**
   * Check if Blender is running
   */
  async isRunning(): Promise<boolean> {
    const status = await this.getStatus();
    return status.connected;
  }
  
  /**
   * Create a cube in Blender
   */
  async createCube(
    location: number[] = [0, 0, 0],
    size: number = 2.0,
    name: string = 'Cube'
  ): Promise<ExecutionResult> {
    try {
      const response = await axios.post(`${this.apiUrl}/object/create_cube`, {
        location,
        size,
        name
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating cube in Blender: ${error.message}`);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: `Failed to create cube in Blender: ${error.message}`
      };
    }
  }
  
  /**
   * Create a sphere in Blender
   */
  async createSphere(
    location: number[] = [0, 0, 0],
    radius: number = 1.0,
    name: string = 'Sphere'
  ): Promise<ExecutionResult> {
    try {
      const response = await axios.post(`${this.apiUrl}/object/create_sphere`, {
        location,
        radius,
        name
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating sphere in Blender: ${error.message}`);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: `Failed to create sphere in Blender: ${error.message}`
      };
    }
  }
  
  /**
   * Apply material to an object in Blender
   */
  async applyMaterial(
    objectName: string,
    materialName: string = 'NewMaterial',
    color: number[] = [0.8, 0.8, 0.8, 1.0],
    metallic: number = 0.0,
    roughness: number = 0.5
  ): Promise<ExecutionResult> {
    try {
      const response = await axios.post(`${this.apiUrl}/material/apply`, {
        object_name: objectName,
        material_name: materialName,
        color,
        metallic,
        roughness
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error applying material in Blender: ${error.message}`);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: `Failed to apply material in Blender: ${error.message}`
      };
    }
  }
  
  /**
   * Add texture to a material in Blender
   */
  async addTexture(
    objectName: string,
    materialName: string,
    textureType: string = 'image',
    texturePath: string = ''
  ): Promise<ExecutionResult> {
    try {
      const response = await axios.post(`${this.apiUrl}/texture/add`, {
        object_name: objectName,
        material_name: materialName,
        texture_type: textureType,
        texture_path: texturePath
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error adding texture in Blender: ${error.message}`);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: `Failed to add texture in Blender: ${error.message}`
      };
    }
  }
  
  /**
   * Render the current scene in Blender
   */
  async renderScene(
    resolutionX: number = 1920,
    resolutionY: number = 1080,
    samples: number = 64,
    outputPath?: string
  ): Promise<ExecutionResult> {
    try {
      const requestData: any = {
        resolution_x: resolutionX,
        resolution_y: resolutionY,
        samples
      };
      
      if (outputPath) {
        requestData.output_path = outputPath;
      }
      
      const response = await axios.post(`${this.apiUrl}/render/scene`, requestData);
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error rendering scene in Blender: ${error.message}`);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: `Failed to render scene in Blender: ${error.message}`
      };
    }
  }
  
  /**
   * Get available commands from the Blender Bridge API
   */
  async getAvailableCommands(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/commands/available`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting available commands: ${error.message}`);
      return {
        success: false,
        error: `Failed to get available commands: ${error.message}`
      };
    }
  }
  
  /**
   * Get objects in the current scene
   */
  async getSceneObjects(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/scene/get_objects`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting scene objects: ${error.message}`);
      return {
        success: false,
        error: `Failed to get scene objects: ${error.message}`
      };
    }
  }
  
  /**
   * Execute a high-level command in Blender
   */
  async executeCommand(command: string, params: Record<string, any> = {}): Promise<ExecutionResult> {
    this.logger.debug(`Executing command in Blender: ${command} with params: ${JSON.stringify(params)}`);
    
    // Map commando's naar specifieke API endpoints
    switch (command) {
      case 'create_cube':
        return this.createCube(
          params.location,
          params.size,
          params.name
        );
        
      case 'create_sphere':
        return this.createSphere(
          params.location,
          params.radius,
          params.name
        );
        
      case 'apply_material':
        return this.applyMaterial(
          params.object_name,
          params.material_name,
          params.color,
          params.metallic,
          params.roughness
        );
        
      case 'add_texture':
        return this.addTexture(
          params.object_name,
          params.material_name,
          params.texture_type,
          params.texture_path
        );
        
      case 'render_scene':
        return this.renderScene(
          params.resolution_x,
          params.resolution_y,
          params.samples,
          params.output_path
        );
        
      default:
        // Voor niet-geïmplementeerde commando's, genereer Python code
        try {
          let pythonCode: string;
          
          if (command === 'get_scene_objects') {
            return this.getSceneObjects();
          }
          
          // Generieke code-generatie voor onbekende commando's
          pythonCode = `
import bpy
print(f"Executing command: ${command}")
print(f"Parameters: ${JSON.stringify(params)}")

# Command-specific code would be generated here
# This is a placeholder for custom command implementation
`;
          
          return this.executeCode(pythonCode);
        } catch (error) {
          this.logger.error(`Error generating code for command: ${error.message}`);
          return {
            success: false,
            error: `Failed to execute command: ${error.message}`
          };
        }
    }
  }
} 