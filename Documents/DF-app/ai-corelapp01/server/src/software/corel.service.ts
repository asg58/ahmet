import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * CorelService
 * 
 * Service for communicating with CorelDRAW through its API
 */
@Injectable()
export class CorelService {
  private readonly logger = new Logger(CorelService.name);
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiUrl = this.configService.get<string>('CORELDRAW_API_URL', 'http://localhost:4200');
    this.logger.log(`CorelDRAW API URL: ${this.apiUrl}`);
  }

  /**
   * Execute a method on the CorelDRAW API
   * 
   * @param objectPath Path to the object in the CorelDRAW object model
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
        throw new Error(`CorelDRAW API error: ${response.statusText}`);
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
   * Check connection to CorelDRAW API
   */
  async checkConnection(): Promise<boolean> {
    try {
      const result = await this.executeMethod('Application', 'GetVersion', []);
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
    if (objectPath === 'Application' && methodName === 'GetVersion') {
      return {
        success: true,
        result: { version: '2023.5', build: '25.5.0.513' }
      };
    }

    if (objectPath === 'Application.ActiveDocument' && methodName === 'Summarize') {
      return {
        success: true,
        result: {
          Name: 'Document1',
          FileName: 'Untitled',
          SizeWidth: 800,
          SizeHeight: 600,
          Pages: 1,
          ActivePage: 0
        }
      };
    }

    if (objectPath === 'Application.ActiveDocument.ActiveView' && methodName === 'GetViewInfo') {
      return {
        success: true,
        result: {
          Zoom: 1.0,
          ScrollX: 0,
          ScrollY: 0,
          Width: 800,
          Height: 600
        }
      };
    }

    if (objectPath === 'Application.ActiveDocument.Layers' && methodName === 'GetLayers') {
      return {
        success: true,
        result: [
          { Name: 'Layer 1', Visible: true, Locked: false },
          { Name: 'Layer 2', Visible: true, Locked: false }
        ]
      };
    }

    if (objectPath.includes('Layers') && methodName === 'GetShapes') {
      return {
        success: true,
        result: [
          {
            Name: 'Rectangle 1',
            Type: 'Rectangle',
            ObjectPath: 'Application.ActiveDocument.Shapes[0]',
            Position: { x: 100, y: 100 },
            Size: { width: 200, height: 100 },
            Properties: {
              FillColor: { r: 255, g: 0, b: 0, a: 1 },
              StrokeColor: { r: 0, g: 0, b: 0, a: 1 },
              StrokeWidth: 1
            }
          },
          {
            Name: 'Ellipse 1',
            Type: 'Ellipse',
            ObjectPath: 'Application.ActiveDocument.Shapes[1]',
            Position: { x: 350, y: 150 },
            Size: { width: 100, height: 100 },
            Properties: {
              FillColor: { r: 0, g: 0, b: 255, a: 1 },
              StrokeColor: { r: 0, g: 0, b: 0, a: 1 },
              StrokeWidth: 1
            }
          }
        ]
      };
    }

    if (objectPath === 'Application.ActiveDocument.Selection' && methodName === 'GetSelectedShapes') {
      return {
        success: true,
        result: []
      };
    }

    if (objectPath === 'Application.ActiveDocument.CommandHistory' && methodName === 'GetLastCommand') {
      return {
        success: true,
        result: {
          Type: 'CreateShape',
          Description: 'Create Rectangle',
          Timestamp: Date.now()
        }
      };
    }

    if (objectPath === 'Application.ActiveDocument' && methodName === 'CaptureScreenshot') {
      // Return a simple SVG as a base64 string to mock a screenshot
      const svgContent = `<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg">
        <rect x="100" y="100" width="200" height="100" fill="red" stroke="black" />
        <circle cx="350" cy="150" r="50" fill="blue" stroke="black" />
        <text x="150" y="250" font-family="Arial" font-size="20">CorelDRAW Mock Output</text>
      </svg>`;
      
      const base64Data = Buffer.from(svgContent).toString('base64');
      
      return {
        success: true,
        result: {
          width: 640,
          height: 480,
          format: 'PNG',
          base64Data: `data:image/svg+xml;base64,${base64Data}`
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
} 