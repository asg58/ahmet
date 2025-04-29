import { CorelDrawService, ExecutionResult } from './coreldraw.service';

// Mock win32ole module
jest.mock('node-win32ole', () => ({
  register: jest.fn(),
  client: {
    Dispatch: jest.fn()
  }
}));

// Mock child_process exec
jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => {
    callback(null, { stdout: 'success' }, '');
  })
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('file content'),
  access: jest.fn().mockResolvedValue(undefined)
}));

describe('CorelDrawService', () => {
  let service: CorelDrawService;
  let mockCorelApp: any;
  
  // Original environment variables
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock environment variables
    process.env = { 
      ...originalEnv,
      CORELDRAW_PATH: 'C:\\Program Files\\Corel\\CorelDRAW Graphics Suite 24\\Programs\\CorelDRW.exe',
      MOCK_CORELDRAW: 'false'
    };
    
    // Setup mock Corel App
    mockCorelApp = {
      VersionMajor: 24,
      VersionMinor: 0,
      BuildNumber: '12345',
      Name: 'CorelDRAW Graphics Suite',
      Documents: {
        Count: 1,
        Add: jest.fn()
      },
      ActiveDocument: {
        Unit: 3, // mm
        ReferencePoint: 0,
        CreateRectangle: jest.fn(),
        CreateEllipse: jest.fn(),
        CreateArtisticText: jest.fn(),
        Save: jest.fn(),
        SaveAs: jest.fn()
      }
    };
    
    // Mock win32ole.client.Dispatch to return our mockCorelApp
    const win32ole = require('node-win32ole');
    win32ole.client.Dispatch.mockReturnValue(mockCorelApp);
    
    // Create service instance
    service = new CorelDrawService();
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
  });

  describe('initialization', () => {
    it('should initialize win32ole on construction', () => {
      const win32ole = require('node-win32ole');
      expect(win32ole.register).toHaveBeenCalled();
    });
    
    it('should set mockMode to true when COM initialization fails', () => {
      const win32ole = require('node-win32ole');
      win32ole.register.mockImplementationOnce(() => {
        throw new Error('COM initialization failed');
      });
      
      const service = new CorelDrawService();
      expect((service as any).mockMode).toBe(true);
    });
  });

  describe('isRunning', () => {
    it('should return true when CorelDRAW is running', async () => {
      const result = await service.isRunning();
      expect(result).toBe(true);
    });
    
    it('should return true in mock mode', async () => {
      process.env.MOCK_CORELDRAW = 'true';
      const service = new CorelDrawService();
      const result = await service.isRunning();
      expect(result).toBe(true);
    });
    
    it('should return false when checking CorelDRAW status throws an error', async () => {
      // Setup mock to throw on accessing VersionMajor
      Object.defineProperty(mockCorelApp, 'VersionMajor', {
        get: () => { throw new Error('Cannot read property'); }
      });
      
      const result = await service.isRunning();
      expect(result).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should return the CorelDRAW version', async () => {
      const result = await service.getVersion();
      expect(result).toBe('CorelDRAW 24.0');
    });
    
    it('should return a mock version in mock mode', async () => {
      process.env.MOCK_CORELDRAW = 'true';
      const service = new CorelDrawService();
      const result = await service.getVersion();
      expect(result).toBe('CorelDRAW X9 (MOCK)');
    });
    
    it('should throw an error when getting version fails', async () => {
      // Setup mock to throw on accessing VersionMajor
      Object.defineProperty(mockCorelApp, 'VersionMajor', {
        get: () => { throw new Error('Cannot read property'); }
      });
      
      await expect(service.getVersion()).rejects.toThrow();
    });
  });

  describe('executeVbaCode', () => {
    it('should execute VBA code successfully', async () => {
      const code = 'Sub Main()\nMsgBox "Hello"\nEnd Sub';
      const result = await service.executeVbaCode(code);
      
      expect(result.success).toBe(true);
    });
    
    it('should handle VBA execution errors', async () => {
      const fs = require('fs/promises');
      fs.writeFile.mockRejectedValueOnce(new Error('File write error'));
      
      const code = 'Sub Main()\nMsgBox "Hello"\nEnd Sub';
      const result = await service.executeVbaCode(code);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
    
    it('should return a mock result in mock mode', async () => {
      process.env.MOCK_CORELDRAW = 'true';
      const service = new CorelDrawService();
      
      const code = 'Sub Main()\nMsgBox "Hello"\nEnd Sub';
      const result = await service.executeVbaCode(code);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('MOCK');
    });
  });

  describe('createNewDocument', () => {
    it('should create a new document with default parameters', async () => {
      const result = await service.createNewDocument();
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.Documents.Add).toHaveBeenCalled();
    });
    
    it('should create a new document with custom parameters', async () => {
      const result = await service.createNewDocument(100, 200, 'RGB', 150);
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.Documents.Add).toHaveBeenCalled();
    });
    
    it('should return a mock result in mock mode', async () => {
      process.env.MOCK_CORELDRAW = 'true';
      const service = new CorelDrawService();
      
      const result = await service.createNewDocument();
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('MOCK');
    });
  });

  describe('createRectangle', () => {
    it('should create a rectangle with default parameters', async () => {
      const result = await service.createRectangle(10, 20, 100, 50);
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.ActiveDocument.CreateRectangle).toHaveBeenCalled();
    });
    
    it('should create a rectangle with custom fill and outline', async () => {
      const result = await service.createRectangle(10, 20, 100, 50, '#FF0000', '#000000', 2);
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.ActiveDocument.CreateRectangle).toHaveBeenCalled();
    });
    
    it('should return a mock result in mock mode', async () => {
      process.env.MOCK_CORELDRAW = 'true';
      const service = new CorelDrawService();
      
      const result = await service.createRectangle(10, 20, 100, 50);
      
      expect(result.success).toBe(true);
      expect(result.output).toContain('MOCK');
    });
  });

  describe('createEllipse', () => {
    it('should create an ellipse with default parameters', async () => {
      const result = await service.createEllipse(10, 20, 100, 50);
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.ActiveDocument.CreateEllipse).toHaveBeenCalled();
    });
    
    it('should create an ellipse with custom fill and outline', async () => {
      const result = await service.createEllipse(10, 20, 100, 50, '#FF0000', '#000000', 2);
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.ActiveDocument.CreateEllipse).toHaveBeenCalled();
    });
  });

  describe('createText', () => {
    it('should create a text object with default parameters', async () => {
      const result = await service.createText(10, 20, 'Hello World');
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.ActiveDocument.CreateArtisticText).toHaveBeenCalled();
    });
    
    it('should create a text object with custom font and style', async () => {
      const result = await service.createText(10, 20, 'Hello World', 'Arial', 16, '#FF0000', '#000000', 1);
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.ActiveDocument.CreateArtisticText).toHaveBeenCalled();
    });
  });

  describe('saveDocument', () => {
    it('should save the document with default parameters', async () => {
      const result = await service.saveDocument();
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.ActiveDocument.Save).toHaveBeenCalled();
    });
    
    it('should save the document with custom path and format', async () => {
      const result = await service.saveDocument('C:\\test.cdr', 'CDR');
      
      expect(result.success).toBe(true);
      expect(mockCorelApp.ActiveDocument.SaveAs).toHaveBeenCalled();
    });
  });

  describe('hexToRgb', () => {
    it('should convert hex color to RGB', () => {
      const service = new CorelDrawService();
      const hexToRgb = (service as any).hexToRgb;
      
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#00FF00')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#0000FF')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
      expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    });
    
    it('should handle shorthand hex colors', () => {
      const service = new CorelDrawService();
      const hexToRgb = (service as any).hexToRgb;
      
      expect(hexToRgb('#F00')).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb('#0F0')).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb('#00F')).toEqual({ r: 0, g: 0, b: 255 });
      expect(hexToRgb('#FFF')).toEqual({ r: 255, g: 255, b: 255 });
    });
    
    it('should return null for invalid hex colors', () => {
      const service = new CorelDrawService();
      const hexToRgb = (service as any).hexToRgb;
      
      expect(hexToRgb('invalid')).toBeNull();
      expect(hexToRgb('#XYZ')).toBeNull();
      expect(hexToRgb('')).toBeNull();
    });
  });
}); 