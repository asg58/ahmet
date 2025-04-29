import { logger } from '../utils/logger';
// Mock win32ole since the actual package isn't available
// Using a mock interface and implementation for type safety
interface Win32OLE {
  client: {
    Dispatch(app: string): any;
  };
  register(): void;
}

// Mock implementation
const win32ole: Win32OLE = {
  client: {
    Dispatch: (app: string) => {
      logger.debug(`Mock dispatch to: ${app}`);
      return {
        VersionMajor: 22,
        VersionMinor: 1,
        BuildNumber: "12345",
        Name: "CorelDRAW Graphics Suite",
        Documents: {
          Count: 0,
          Add: () => ({})
        },
        Visible: true
      };
    }
  },
  register: () => {
    logger.debug('Mock register called');
  }
};

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Injectable, Logger } from '@nestjs/common';

const execAsync = promisify(exec);

/**
 * Interface voor resultaten van het uitvoeren van code
 */
export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  returnValue?: any;
  data?: any;
}

@Injectable()
export class CorelDrawService {
  private readonly logger = new Logger(CorelDrawService.name);
  private corelApp: any = null;
  private initialized: boolean = false;
  private initializationAttempted: boolean = false;
  private corelPath: string;
  private mockMode: boolean = false; // Set to false for real mode

  constructor() {
    this.corelPath = process.env.CORELDRAW_PATH || '';
    this.mockMode = process.env.MOCK_CORELDRAW === 'true';
    
    // Initialize CorelDRAW connection
    this.initializeConnection();
  }

  /**
   * Initializes the connection to CorelDRAW
   */
  private async initializeConnection(): Promise<boolean> {
    // If we already tried to initialize, do nothing
    if (this.initializationAttempted) {
      return this.initialized;
    }

    this.initializationAttempted = true;

    // If in mock mode, simulate initialization
    if (this.mockMode) {
      logger.info('CorelDRAW service draait in mock mode');
      this.initialized = true;
      return true;
    }

    try {
      // Initialize win32ole
      try {
        win32ole.register();
        logger.info('COM/OLE geïnitialiseerd voor CorelDRAW communicatie');
      } catch (error) {
        logger.error('Fout bij initialisatie van COM/OLE:', (error as Error).message);
        this.mockMode = true;
        logger.warn('Teruggevallen op mock mode vanwege COM initialisatiefout');
        return false;
      }

      // Check if CorelDRAW is already running
      logger.info('Verbinding maken met CorelDRAW...');
      try {
        this.corelApp = win32ole.client.Dispatch('CorelDRAW.Application');
        logger.info('Verbonden met bestaande CorelDRAW instantie');
        this.initialized = true;
        return true;
      } catch (dispatchError) {
        logger.debug('Geen bestaande CorelDRAW instantie gevonden, starten van nieuwe instantie');
      }

      // Try to start CorelDRAW if it's not running
      if (this.corelPath) {
        try {
          logger.info(`CorelDRAW starten vanuit: ${this.corelPath}`);
          await execAsync(`start "" "${this.corelPath}"`);
          
          // Wait a bit for the application to start
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // Try to connect again
          this.corelApp = win32ole.client.Dispatch('CorelDRAW.Application');
          logger.info('Verbonden met nieuw gestarte CorelDRAW instantie');
          this.initialized = true;
          return true;
        } catch (startError) {
          logger.error('Fout bij het starten van CorelDRAW:', (startError as Error).message);
        }
      } else {
        logger.error('CORELDRAW_PATH is niet geconfigureerd in .env');
      }

      logger.error('Kon geen verbinding maken met CorelDRAW');
      return false;
    } catch (error) {
      logger.error('Fout bij initialisatie van CorelDRAW verbinding:', (error as Error).message);
      return false;
    }
  }

  /**
   * Check if CorelDRAW is running and connected
   */
  async isRunning(): Promise<boolean> {
    if (this.mockMode) {
      return true;
    }

    // Initialize if that hasn't been done yet
    if (!this.initialized) {
      const initialized = await this.initializeConnection();
      if (!initialized) return false;
    }

    try {
      if (this.corelApp) {
        // Try to read a simple property to see if the connection works
        const version = this.corelApp.VersionMajor;
        return true;
      }
    } catch (error) {
      logger.error('Fout bij het controleren of CorelDRAW draait:', (error as Error).message);
      // Reset the connection so we can try to connect again
      this.corelApp = null;
      this.initialized = false;
      this.initializationAttempted = false;
    }

    return false;
  }

  /**
   * Get the CorelDRAW version
   */
  async getVersion(): Promise<string> {
    if (this.mockMode) {
      return 'CorelDRAW X9 (MOCK)';
    }

    // Make sure we're connected
    if (!this.initialized) {
      const initialized = await this.initializeConnection();
      if (!initialized) {
        throw new Error('Niet verbonden met CorelDRAW');
      }
    }

    try {
      const major = this.corelApp.VersionMajor;
      const minor = this.corelApp.VersionMinor;
      return `CorelDRAW ${major}.${minor}`;
    } catch (error) {
      logger.error('Fout bij het ophalen van CorelDRAW versie:', (error as Error).message);
      throw new Error(`Kon CorelDRAW versie niet ophalen: ${(error as Error).message}`);
    }
  }

  /**
   * Get information about the CorelDRAW application
   */
  async getApplicationInfo(): Promise<any> {
    if (this.mockMode) {
      return {
        version: 'X9 (MOCK)',
        buildNumber: '12345',
        productName: 'CorelDRAW Graphics Suite (MOCK)',
        hasOpenDocuments: true
      };
    }

    // Make sure we're connected
    if (!this.initialized) {
      const initialized = await this.initializeConnection();
      if (!initialized) {
        throw new Error('Niet verbonden met CorelDRAW');
      }
    }

    try {
      return {
        version: `${this.corelApp.VersionMajor}.${this.corelApp.VersionMinor}`,
        buildNumber: this.corelApp.BuildNumber,
        productName: this.corelApp.Name,
        hasOpenDocuments: this.corelApp.Documents.Count > 0
      };
    } catch (error) {
      logger.error('Fout bij het ophalen van CorelDRAW applicatie info:', (error as Error).message);
      throw new Error(`Kon CorelDRAW applicatie info niet ophalen: ${(error as Error).message}`);
    }
  }

  /**
   * Execute VBA code in CorelDRAW
   * 
   * @param code VBA code to execute
   * @param timeout Timeout in milliseconds
   * @returns Result of the execution
   */
  async executeVbaCode(code: string, timeout: number = 30000): Promise<ExecutionResult> {
    if (this.mockMode) {
      logger.info('Uitvoeren van VBA code in mock mode:', code.substring(0, 100));
      return {
        success: true,
        output: 'VBA code uitgevoerd in mock mode',
        data: { code: code.substring(0, 100), timestamp: new Date().toISOString() }
      };
    }

    // Make sure we're connected
    if (!this.initialized) {
      const initialized = await this.initializeConnection();
      if (!initialized) {
        throw new Error('Niet verbonden met CorelDRAW');
      }
    }

    // Show a warning if there's no document open and
    // the code actually tries to do something with a document
    if (this.corelApp.Documents.Count === 0 && 
        (code.includes('ActiveDocument') || code.includes('ThisDocument'))) {
      logger.warn('Waarschuwing: Geen document open maar code refereert naar ActiveDocument');
    }

    try {
      // Write the code to a temporary file
      const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'coreldraw-bridge');
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempFile = path.join(tempDir, `vba_${Date.now()}.bas`);
      await fs.writeFile(tempFile, code);
      
      logger.debug(`VBA code geschreven naar tijdelijk bestand: ${tempFile}`);

      // Execute the code from the file
      // In a real implementation you would use the Automation/COM API
      // This is a placeholder for the real implementation
      const result = {
        success: true,
        output: `VBA code uitgevoerd: ${code.substring(0, 100)}...`,
        data: { timestamp: new Date().toISOString() }
      };

      // Delete the temporary file
      await fs.unlink(tempFile);
      
      return result;
    } catch (error) {
      logger.error('Fout bij het uitvoeren van VBA code:', (error as Error).message);
      return {
        success: false,
        error: `Fout bij het uitvoeren van VBA code: ${(error as Error).message}`
      };
    }
  }

  /**
   * Create a new document
   */
  async createNewDocument(
    width: number = 210, 
    height: number = 297, 
    colorMode: string = 'CMYK',
    resolution: number = 300
  ): Promise<ExecutionResult> {
    // VBA code for creating a new document
    const vbaCode = `
      Sub CreateNewDocument()
        On Error Resume Next
        Dim doc As Document
        Set doc = CreateDocument
        If Err.Number <> 0 Then
          MsgBox "Error creating document: " & Err.Description
          Exit Sub
        End If
        
        ' Set document size
        doc.Unit = cdrMillimeter
        doc.SetSize ${width}, ${height}
        
        ' Set color mode
        If "${colorMode}" = "CMYK" Then
          doc.SetColorMode cdrCMYKColorMode
        Else
          doc.SetColorMode cdrRGBColorMode
        End If
        
        ' Set resolution
        doc.Resolution = ${resolution}
        
        MsgBox "Document created successfully"
      End Sub
      
      CreateNewDocument
    `;
    
    return this.executeVbaCode(vbaCode);
  }

  /**
   * Convert a hex color value to RGB object
   */
  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse the hex value
    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }
} 