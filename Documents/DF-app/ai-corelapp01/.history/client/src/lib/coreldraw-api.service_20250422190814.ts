import { ModelInfo } from '@/types/models';

// Define the response types
export interface CorelDrawResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
  mocked?: boolean;
}

export interface CorelDrawDocumentResponse {
  success: boolean;
  error?: string;
  documentName?: string;
  documentId?: string;
  thumbnail?: string;
  mocked?: boolean;
}

export interface CorelDrawShapeResponse {
  success: boolean;
  error?: string;
  shapeId?: string;
  shapeName?: string;
  shapeType?: string;
  properties?: Record<string, any>;
  mocked?: boolean;
}

export interface CorelDrawExportResponse {
  success: boolean;
  error?: string;
  fileUrl?: string;
  format?: string;
  mocked?: boolean;
}

// Define the API service class
class CorelDrawApiService {
  private readonly API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  private readonly CORELDRAW_ENDPOINT = `${this.API_BASE_URL}/software/coreldraw`;
  private readonly SOFTWARE_ENDPOINT = `${this.API_BASE_URL}/software`;

  /**
   * Check if CorelDRAW service is available
   */
  async getStatus(): Promise<{ connected: boolean; message: string; version?: string }> {
    try {
      const response = await fetch(`${this.CORELDRAW_ENDPOINT}/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking CorelDRAW status:', error);
      return {
        connected: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get current design context from CorelDRAW
   */
  async getDesignContext(): Promise<any> {
    try {
      const response = await fetch(`${this.SOFTWARE_ENDPOINT}/context/coreldraw`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching design context:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get a text description of the current design
   */
  async getContextDescription(): Promise<{ description: string; documentName: string }> {
    try {
      const response = await fetch(`${this.SOFTWARE_ENDPOINT}/context/coreldraw/description`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching context description:', error);
      return {
        description: 'Unable to fetch context description',
        documentName: 'Unknown document'
      };
    }
  }

  /**
   * Create a rectangle in CorelDRAW
   */
  async createRectangle(params: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fillColor?: string;
    outlineColor?: string;
    outlineWidth?: number;
    name?: string;
  } = {}): Promise<CorelDrawShapeResponse> {
    return this.executeAction('createRectangle', params);
  }

  /**
   * Create an ellipse in CorelDRAW
   */
  async createEllipse(params: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fillColor?: string;
    outlineColor?: string;
    outlineWidth?: number;
    name?: string;
  } = {}): Promise<CorelDrawShapeResponse> {
    return this.executeAction('createEllipse', params);
  }

  /**
   * Create text in CorelDRAW
   */
  async createText(params: {
    text: string;
    x?: number;
    y?: number;
    fontName?: string;
    fontSize?: number;
    color?: string;
  } = {}): Promise<CorelDrawShapeResponse> {
    return this.executeAction('createText', params);
  }

  /**
   * Apply color to selected objects
   */
  async applyColor(params: {
    color: string;
    target?: 'fill' | 'outline' | 'text';
  }): Promise<CorelDrawResponse> {
    return this.executeAction('applyColor', params);
  }

  /**
   * Group selected objects
   */
  async groupObjects(): Promise<CorelDrawResponse> {
    return this.executeAction('groupObjects', {});
  }

  /**
   * Ungroup selected objects
   */
  async ungroupObjects(): Promise<CorelDrawResponse> {
    return this.executeAction('ungroupObjects', {});
  }

  /**
   * Export the current document to a different format
   */
  async exportDocument(params: {
    format: 'PDF' | 'JPG' | 'PNG' | 'SVG';
    resolution?: number;
    quality?: number;
  }): Promise<CorelDrawExportResponse> {
    try {
      const response = await fetch(`${this.CORELDRAW_ENDPOINT}/export`, {
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
      console.error('Error exporting document:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Execute a custom action on the CorelDRAW platform
   */
  private async executeAction<T = any>(
    action: string,
    parameters: Record<string, any> = {},
    conversationContext?: any[]
  ): Promise<CorelDrawResponse<T>> {
    try {
      const response = await fetch(`${this.SOFTWARE_ENDPOINT}/action/coreldraw`, {
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
   * Execute custom code in CorelDRAW
   */
  async executeCode(code: string): Promise<CorelDrawResponse> {
    try {
      const response = await fetch(`${this.CORELDRAW_ENDPOINT}/execute`, {
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
   * Convert a vector shape to ModelInfo format for the viewer
   */
  convertShapeToModelInfo(shape: CorelDrawShapeResponse): ModelInfo | null {
    if (!shape.success || !shape.shapeId) {
      return null;
    }

    // Generate SVG representation (this is a simplified example)
    let vectorData = '';
    
    // Simple examples of different shape types
    if (shape.shapeType === 'rectangle') {
      const props = shape.properties || {};
      vectorData = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect x="${props.x || 0}" y="${props.y || 0}" width="${props.width || 50}" height="${props.height || 50}" 
          fill="${props.fillColor || 'blue'}" stroke="${props.outlineColor || 'black'}" stroke-width="${props.outlineWidth || 1}" />
      </svg>`;
    } else if (shape.shapeType === 'ellipse') {
      const props = shape.properties || {};
      vectorData = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="${(props.x || 0) + (props.width || 50)/2}" cy="${(props.y || 0) + (props.height || 50)/2}" 
          rx="${(props.width || 50)/2}" ry="${(props.height || 50)/2}" 
          fill="${props.fillColor || 'red'}" stroke="${props.outlineColor || 'black'}" stroke-width="${props.outlineWidth || 1}" />
      </svg>`;
    } else if (shape.shapeType === 'text') {
      const props = shape.properties || {};
      vectorData = `<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg">
        <text x="${props.x || 10}" y="${props.y || 50}" font-size="${props.fontSize || 14}" fill="${props.color || 'black'}">
          ${props.text || 'Text'}
        </text>
      </svg>`;
    }

    return {
      id: shape.shapeId,
      name: shape.shapeName || 'CorelDRAW Shape',
      description: `${shape.shapeType || 'Shape'} created in CorelDRAW`,
      type: 'vector',
      url: `/shapes/${shape.shapeId}.svg`,
      vectorData: vectorData
    };
  }
}

// Export a singleton instance
export const corelDrawApiService = new CorelDrawApiService(); 