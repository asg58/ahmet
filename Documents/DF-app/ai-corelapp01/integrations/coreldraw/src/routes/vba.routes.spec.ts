import { Express } from 'express';
import { setupVbaRoutes } from './vba.routes';
import { CorelDrawService } from '../services/coreldraw.service';
import request from 'supertest';
import express from 'express';

// Mock CorelDrawService
jest.mock('../services/coreldraw.service');

describe('VBA Routes', () => {
  let app: Express;
  let mockCorelDrawService: jest.Mocked<CorelDrawService>;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup Express app
    app = express();
    app.use(express.json());
    
    // Setup mock CorelDrawService
    mockCorelDrawService = new CorelDrawService() as jest.Mocked<CorelDrawService>;
    
    // Mock the constructor to return our mockCorelDrawService
    (CorelDrawService as jest.Mock).mockImplementation(() => mockCorelDrawService);
    
    // Setup routes
    setupVbaRoutes(app, '/api');
  });
  
  describe('POST /api/execute', () => {
    it('should execute VBA code successfully', async () => {
      // Mock service responses
      mockCorelDrawService.isRunning.mockResolvedValue(true);
      mockCorelDrawService.executeVbaCode.mockResolvedValue({
        success: true,
        output: 'Executed successfully'
      });
      
      // Test API endpoint
      const response = await request(app)
        .post('/api/execute')
        .send({ code: 'Sub Main()\nEnd Sub' });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockCorelDrawService.executeVbaCode).toHaveBeenCalledWith(
        'Sub Main()\nEnd Sub',
        30000 // default timeout
      );
    });
    
    it('should return 400 when code is missing', async () => {
      // Test API endpoint with missing code
      const response = await request(app)
        .post('/api/execute')
        .send({});
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
      expect(mockCorelDrawService.executeVbaCode).not.toHaveBeenCalled();
    });
    
    it('should return 503 when CorelDRAW is not running', async () => {
      // Mock service responses
      mockCorelDrawService.isRunning.mockResolvedValue(false);
      
      // Test API endpoint
      const response = await request(app)
        .post('/api/execute')
        .send({ code: 'Sub Main()\nEnd Sub' });
      
      // Assertions
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not running');
      expect(mockCorelDrawService.executeVbaCode).not.toHaveBeenCalled();
    });
    
    it('should return 500 when execution fails', async () => {
      // Mock service responses
      mockCorelDrawService.isRunning.mockResolvedValue(true);
      mockCorelDrawService.executeVbaCode.mockRejectedValue(new Error('Execution failed'));
      
      // Test API endpoint
      const response = await request(app)
        .post('/api/execute')
        .send({ code: 'Sub Main()\nEnd Sub' });
      
      // Assertions
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Execution failed');
    });
  });
  
  describe('POST /api/document/new', () => {
    it('should create a new document with default parameters', async () => {
      // Mock service responses
      mockCorelDrawService.isRunning.mockResolvedValue(true);
      mockCorelDrawService.createNewDocument.mockResolvedValue({
        success: true,
        output: 'Document created'
      });
      
      // Test API endpoint
      const response = await request(app)
        .post('/api/document/new')
        .send({});
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockCorelDrawService.createNewDocument).toHaveBeenCalledWith(
        210, 297, 'CMYK', 300 // default values
      );
    });
    
    it('should create a new document with custom parameters', async () => {
      // Mock service responses
      mockCorelDrawService.isRunning.mockResolvedValue(true);
      mockCorelDrawService.createNewDocument.mockResolvedValue({
        success: true,
        output: 'Document created'
      });
      
      // Test API endpoint with custom parameters
      const response = await request(app)
        .post('/api/document/new')
        .send({
          width: 100,
          height: 150,
          colorMode: 'RGB',
          resolution: 150
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockCorelDrawService.createNewDocument).toHaveBeenCalledWith(
        100, 150, 'RGB', 150
      );
    });
  });
  
  describe('POST /api/commands/create-rectangle', () => {
    it('should create a rectangle successfully', async () => {
      // Mock service responses
      mockCorelDrawService.isRunning.mockResolvedValue(true);
      mockCorelDrawService.createRectangle.mockResolvedValue({
        success: true,
        output: 'Rectangle created'
      });
      
      // Test API endpoint
      const response = await request(app)
        .post('/api/commands/create-rectangle')
        .send({
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          fillColor: '#FF0000',
          outlineColor: '#000000',
          outlineWidth: 1
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockCorelDrawService.createRectangle).toHaveBeenCalledWith(
        10, 20, 100, 50, '#FF0000', '#000000', 1
      );
    });
    
    it('should return 400 when required parameters are missing', async () => {
      // Test API endpoint with missing parameters
      const response = await request(app)
        .post('/api/commands/create-rectangle')
        .send({
          x: 10,
          y: 20
          // width and height missing
        });
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required parameters');
      expect(mockCorelDrawService.createRectangle).not.toHaveBeenCalled();
    });
  });
  
  describe('POST /api/commands/create-ellipse', () => {
    it('should create an ellipse successfully', async () => {
      // Mock service responses
      mockCorelDrawService.isRunning.mockResolvedValue(true);
      mockCorelDrawService.createEllipse.mockResolvedValue({
        success: true,
        output: 'Ellipse created'
      });
      
      // Test API endpoint
      const response = await request(app)
        .post('/api/commands/create-ellipse')
        .send({
          x: 10,
          y: 20,
          width: 100,
          height: 50,
          fillColor: '#FF0000',
          outlineColor: '#000000',
          outlineWidth: 1
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('POST /api/commands/create-text', () => {
    it('should create a text object successfully', async () => {
      // Mock service responses
      mockCorelDrawService.isRunning.mockResolvedValue(true);
      mockCorelDrawService.createText.mockResolvedValue({
        success: true,
        output: 'Text created'
      });
      
      // Test API endpoint
      const response = await request(app)
        .post('/api/commands/create-text')
        .send({
          x: 10,
          y: 20,
          text: 'Hello World',
          fontName: 'Arial',
          fontSize: 12,
          fillColor: '#FF0000'
        });
      
      // Assertions
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should return 400 when text is missing', async () => {
      // Test API endpoint with missing text
      const response = await request(app)
        .post('/api/commands/create-text')
        .send({
          x: 10,
          y: 20,
          fontName: 'Arial',
          fontSize: 12
          // text missing
        });
      
      // Assertions
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Text content is required');
    });
  });
}); 