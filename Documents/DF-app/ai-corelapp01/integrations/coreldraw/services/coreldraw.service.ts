import { Application } from './application.interface';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

// Mock implementation for node-win32ole when not available
let win32ole: any;
let W32OLE: any;

try {
  // Try to load real module
  win32ole = require('node-win32ole');
  W32OLE = win32ole.W32OLE;
} catch (err) {
  // Create mock implementation
  logger.warn('node-win32ole module not available, using mock implementation');
  
  class MockW32OLE {
    constructor() {
      logger.debug('Created mock W32OLE instance');
    }
    
    static new(progID: string) {
      logger.debug(`Mock: Creating new OLE object for ${progID}`);
      return new MockW32OLE();
    }
    
    invoke(method: string, ...args: any[]) {
      logger.debug(`Mock: Invoking method ${method} with args: ${JSON.stringify(args)}`);
      return null;
    }
    
    property(property: string) {
      logger.debug(`Mock: Getting property ${property}`);
      return null;
    }
    
    setProperty(property: string, value: any) {
      logger.debug(`Mock: Setting property ${property} to ${value}`);
      return null;
    }
  }
  
  // Create mock exports
  win32ole = {
    W32OLE: MockW32OLE
  };
  W32OLE = MockW32OLE;
}

export class CorelDrawService implements Application {
  private app: any | null = null;
  private isMockMode: boolean = false;
  private isConnected: boolean = false;

  constructor() {
    this.isMockMode = config.MOCK_MODE === 'true';
    logger.info(`CorelDRAW service initialized (mock mode: ${this.isMockMode})`);
  }

  async connect(): Promise<boolean> {
    if (this.isMockMode) {
      logger.info('Using mock mode, simulating connection');
      this.isConnected = true;
      return true;
    }

    try {
      logger.info('Attempting to connect to CorelDRAW');
      this.app = W32OLE.new('CorelDRAW.Application');
      
      if (!this.app) {
        throw new Error('Failed to create CorelDRAW application instance');
      }
      
      logger.info('Successfully connected to CorelDRAW');
      this.isConnected = true;
      return true;
    } catch (error) {
      logger.error(`Failed to connect to CorelDRAW: ${error}`);
      this.isConnected = false;
      return false;
    }
  }

  isAvailable(): boolean {
    if (this.isMockMode) {
      return true;
    }
    return this.isConnected && this.app !== null;
  }

  getVersion(): string {
    if (this.isMockMode) {
      return 'CorelDRAW (Mock) v2023';
    }
    
    if (!this.isConnected || !this.app) {
      throw new Error('Not connected to CorelDRAW');
    }
    
    try {
      // Get version from CorelDRAW
      const version = this.app.property('Version');
      return `CorelDRAW v${version}`;
    } catch (error) {
      logger.error(`Failed to get CorelDRAW version: ${error}`);
      return 'Unknown';
    }
  }

  async createNewDocument(width: number = 210, height: number = 297, units: string = 'mm'): Promise<boolean> {
    if (this.isMockMode) {
      logger.info(`Mock: Creating new document ${width}x${height}${units}`);
      return true;
    }
    
    if (!this.isConnected || !this.app) {
      throw new Error('Not connected to CorelDRAW');
    }
    
    try {
      // Create new document
      this.app.invoke('CreateDocument');
      
      // Set document properties
      const activeDocument = this.app.property('ActiveDocument');
      
      // Set units
      let unitType = 3; // mm
      if (units === 'cm') unitType = 2;
      if (units === 'inch') unitType = 1;
      
      activeDocument.setProperty('Unit', unitType);
      
      // Set dimensions
      const pageSetup = activeDocument.invoke('ActivePage');
      pageSetup.setProperty('SizeWidth', width);
      pageSetup.setProperty('SizeHeight', height);
      
      return true;
    } catch (error) {
      logger.error(`Failed to create new document: ${error}`);
      return false;
    }
  }

  // Additional methods for CorelDRAW operations would be added here
}

export default new CorelDrawService(); 