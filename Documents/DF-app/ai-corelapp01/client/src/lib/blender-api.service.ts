import { ModelInfo } from '@/types/models';

// Define the response types
export interface BlenderResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
  mocked?: boolean;
}

export interface BlenderModelResponse {
  success: boolean;
  error?: string;
  modelUrl?: string;
  modelId?: string;
  thumbnail?: string;
  type?: 'model' | 'vector';
  mocked?: boolean;
}

export interface BlenderRenderResponse {
  success: boolean;
  error?: string;
  imageUrl?: string;
  mocked?: boolean;
}

// Define the API service class
class BlenderApiService {
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  private readonly BLENDER_ENDPOINT = `${this.API_BASE_URL}/software/blender`;
  private readonly SOFTWARE_ENDPOINT = `${this.API_BASE_URL}/software`;

  /**
   * Check if Blender service is available
   */
  async getStatus(): Promise<{ connected: boolean; message: string; endpoints?: any }> {
    try {
      const response = await fetch(`${this.BLENDER_ENDPOINT}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking Blender status:', error);
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all models available from Blender
   */
  async getModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${this.BLENDER_ENDPOINT}/models`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.models || [];
    } catch (error) {
      console.error('Error fetching models:', error);
      return [];
    }
  }

  /**
   * Create a 3D cube in Blender
   */
  async createCube(params: {
    name?: string;
    size?: number;
    location?: [number, number, number];
    color?: [number, number, number, number];
  } = {}): Promise<BlenderModelResponse> {
    return this.executeAction('createCube', params);
  }

  /**
   * Create a 3D sphere in Blender
   */
  async createSphere(params: {
    name?: string;
    radius?: number;
    segments?: number;
    rings?: number;
    location?: [number, number, number];
    color?: [number, number, number, number];
  } = {}): Promise<BlenderModelResponse> {
    return this.executeAction('createSphere', params);
  }

  /**
   * Apply a material to an object
   */
  async applyMaterial(params: {
    object_name: string;
    material_name?: string;
    color?: [number, number, number, number];
    metallic?: number;
    roughness?: number;
  }): Promise<BlenderResponse> {
    return this.executeAction('applyMaterial', params);
  }

  /**
   * Render the current scene in Blender
   */
  async renderScene(params: {
    width?: number;
    height?: number;
    samples?: number;
    engine?: 'CYCLES' | 'BLENDER_EEVEE';
    format?: 'PNG' | 'JPEG' | 'BMP';
  } = {}): Promise<BlenderRenderResponse> {
    try {
      const response = await fetch(`${this.BLENDER_ENDPOINT}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error rendering scene:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a custom action on the Blender platform
   */
  private async executeAction<T = any>(
    action: string,
    parameters: Record<string, any> = {},
    conversationContext?: any[]
  ): Promise<BlenderResponse<T>> {
    try {
      const response = await fetch(`${this.SOFTWARE_ENDPOINT}/action/blender`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          parameters,
          conversationContext
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error executing action '${action}':`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute custom Python code in Blender
   */
  async executeCode(code: string): Promise<BlenderResponse> {
    try {
      const response = await fetch(`${this.BLENDER_ENDPOINT}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error executing code:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Convert a Blender model response to ModelInfo format
   */
  convertToModelInfo(response: BlenderModelResponse): ModelInfo | null {
    if (!response.success || !response.modelUrl) {
      return null;
    }

    return {
      id: response.modelId || `blender-model-${Date.now()}`,
      name: response.modelId || 'Blender Model',
      description: 'Generated with Blender API',
      type: response.type || 'model',
      url: response.modelUrl,
      thumbnail: response.thumbnail
    };
  }
}

// Export a singleton instance
export const blenderApiService = new BlenderApiService(); 