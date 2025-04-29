/**
 * CorelDRAW VBA Service
 * 
 * This service handles the communication with the CorelDRAW application through COM/VBA.
 */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  visualData?: any;
  returnValue?: any;
  data?: any;
}

@Injectable()
export class CorelDrawService {
  private readonly logger = new Logger(CorelDrawService.name);
  private readonly corelDrawApiUrl: string;
  
  constructor() {
    // Configureerbaar via omgevingsvariabelen
    const host = process.env.CORELDRAW_HOST || 'localhost';
    const port = process.env.CORELDRAW_PORT || '3001';
    this.corelDrawApiUrl = `http://${host}:${port}/api`;
    
    this.logger.log(`CorelDRAW service initialized with API URL: ${this.corelDrawApiUrl}`);
  }
  
  /**
   * Algemene code uitvoering in CorelDRAW
   */
  async executeCode(code: string, options: any = {}): Promise<ExecutionResult> {
    this.logger.debug(`Executing code: ${code.substring(0, 50)}...`);
    
    try {
      // Communiceer met de bridge service om de code uit te voeren
      const response = await axios.post(`${this.corelDrawApiUrl}/execute`, { code, ...options });
      return response.data;
    } catch (error) {
      this.logger.error(`Error executing code: ${error.message}`);
      
      // Als er een Axios response error is, probeer de gestructureerde foutmelding te gebruiken
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      // Generieke foutmelding
      return {
        success: false,
        error: `Failed to execute code: ${error.message}`
      };
    }
  }

  /**
   * VBA code uitvoeren in CorelDRAW via de bridge
   */
  async executeVbaCode(code: string, options: any = {}): Promise<ExecutionResult> {
    this.logger.debug(`Executing VBA code: ${code.substring(0, 50)}...`);
    
    try {
      // Gebruik de bridge service API
      const response = await axios.post(`${this.corelDrawApiUrl}/execute`, { 
        code,
        timeout: options.timeout || 30000
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error executing VBA code: ${error.message}`);
      
      // Als er een Axios response error is, probeer de gestructureerde foutmelding te gebruiken
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      // Generieke foutmelding
    return {
        success: false,
        error: `Failed to execute VBA code: ${error.message}`
    };
    }
  }
  
  /**
   * Controleer de verbindingsstatus met CorelDRAW
   */
  async getStatus(): Promise<{ connected: boolean; version?: string }> {
    this.logger.debug('Getting CorelDRAW connection status');
    
    try {
      const response = await axios.get(`${this.corelDrawApiUrl}/status/coreldraw`);
      return {
        connected: response.data.running,
        version: response.data.version
      };
    } catch (error) {
      this.logger.error(`Error getting CorelDRAW status: ${error.message}`);
    return {
        connected: false
    };
    }
  }
  
  /**
   * Voer een hoog-niveau commando uit in CorelDRAW
   */
  async executeCommand(command: string, params: Record<string, any> = {}): Promise<ExecutionResult> {
    this.logger.debug(`Executing command: ${command} with params: ${JSON.stringify(params)}`);
    
    // Map commando's naar specifieke endpoints in de bridge API
    if (command === 'create_rectangle') {
      return this.createRectangle(
        params.x, 
        params.y, 
        params.width, 
        params.height, 
        params.fillColor, 
        params.outlineColor, 
        params.outlineWidth
      );
    }
    
    if (command === 'create_document') {
      return this.createDocument(
        params.width,
        params.height,
        params.colorMode,
        params.resolution
      );
    }
    
    if (command === 'save_document') {
      return this.saveDocument(params.path, params.format);
    }
    
    // Voor niet-geïmplementeerde commando's, probeer algemene code executie
    try {
      // Converteer commando naar VBA code
    let vbaCode: string;
    
      // Voorbeeld van een eenvoudige vertaling
    if (command.includes('create rectangle')) {
      const { x = 100, y = 100, width = 200, height = 100 } = params;
      vbaCode = `
        Sub CreateRectangle()
          Dim s As Shape
          Set s = ActiveDocument.ActivePage.CreateRectangle(${x}, ${y}, ${x + width}, ${y + height})
          s.Fill.ApplyUniformFill CreateRGBColor(255, 0, 0)
        End Sub
        
        CreateRectangle
      `;
    } else {
      vbaCode = `
        Sub ExecuteCommand()
          ' Command: ${command}
          MsgBox "Executing command: ${command}"
        End Sub
        
        ExecuteCommand
      `;
    }
    
      // Voer de gegenereerde VBA code uit
      return this.executeVbaCode(vbaCode, {});
    } catch (error) {
      this.logger.error(`Error creating VBA for command: ${error.message}`);
      return {
        success: false,
        error: `Failed to translate command to VBA: ${error.message}`
      };
    }
  }
  
  /**
   * Controleer of er verbinding is met de CorelDRAW bridge
   */
  async isRunning(): Promise<boolean> {
    try {
      const status = await this.getStatus();
      return status.connected;
    } catch (error) {
      this.logger.error(`CorelDRAW connection check failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Maak een rechthoek in CorelDRAW
   */
  private async createRectangle(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    fillColor?: string, 
    outlineColor?: string, 
    outlineWidth?: number
  ): Promise<ExecutionResult> {
    try {
      // Gebruik het specifieke endpoint voor het maken van een rechthoek
      const response = await axios.post(`${this.corelDrawApiUrl}/commands/create-rectangle`, {
        x, y, width, height, fillColor, outlineColor, outlineWidth
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating rectangle: ${error.message}`);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: `Failed to create rectangle: ${error.message}`
      };
    }
  }
  
  /**
   * Maak een nieuw document in CorelDRAW
   */
  private async createDocument(
    width: number = 210,
    height: number = 297,
    colorMode: string = 'CMYK',
    resolution: number = 300
  ): Promise<ExecutionResult> {
    try {
      // Gebruik het specifieke endpoint voor het maken van een document
      const response = await axios.post(`${this.corelDrawApiUrl}/document/new`, {
        width, height, colorMode, resolution
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating document: ${error.message}`);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: `Failed to create document: ${error.message}`
      };
    }
  }
  
  /**
   * Sla een document op in CorelDRAW
   */
  private async saveDocument(
    path?: string,
    format: string = 'CDR'
  ): Promise<ExecutionResult> {
    try {
      // Gebruik het specifieke endpoint voor het opslaan van een document
      const response = await axios.post(`${this.corelDrawApiUrl}/document/save`, {
        path, format
      });
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error saving document: ${error.message}`);
      
      if (error.response?.data?.error) {
        return {
          success: false,
          error: error.response.data.error
        };
      }
      
      return {
        success: false,
        error: `Failed to save document: ${error.message}`
      };
    }
  }
} 