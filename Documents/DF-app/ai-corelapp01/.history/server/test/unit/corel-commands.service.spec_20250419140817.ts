import { Test, TestingModule } from '@nestjs/testing';
import { CorelDrawCommandsService } from '../../src/software/commands/corel-commands.service';
import { Logger } from '@nestjs/common';

describe('CorelDrawCommandsService', () => {
  let service: CorelDrawCommandsService;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorelDrawCommandsService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CorelDrawCommandsService>(CorelDrawCommandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRectangle', () => {
    it('should generate proper VBA code for creating a rectangle with defaults', async () => {
      const result = await service.createRectangle({});
      expect(result).toContain('CreateRectangle(0, 0, 100, 100)');
      expect(result).toContain('Outline.Width = 1');
    });

    it('should generate proper VBA code for creating a rectangle with custom parameters', async () => {
      const result = await service.createRectangle({
        x: 10,
        y: 20,
        width: 200,
        height: 150,
        fillColor: '#FF0000',
        outlineColor: '#0000FF',
        outlineWidth: 2,
      });
      
      expect(result).toContain('CreateRectangle(10, 20, 200, 150)');
      expect(result).toContain('RGBAssign 255, 0, 0'); // Fill color
      expect(result).toContain('RGBAssign 0, 0, 255'); // Outline color
      expect(result).toContain('Outline.Width = 2');
    });
  });

  describe('createEllipse', () => {
    it('should generate proper VBA code for creating an ellipse with defaults', async () => {
      const result = await service.createEllipse({});
      expect(result).toContain('CreateEllipse(0, 0, 100, 100)');
      expect(result).toContain('Outline.Width = 1');
    });

    it('should generate proper VBA code for creating an ellipse with custom parameters', async () => {
      const result = await service.createEllipse({
        x: 30,
        y: 40,
        width: 120,
        height: 80,
        fillColor: '#00FF00',
        outlineColor: '#FF00FF',
        outlineWidth: 3,
      });
      
      expect(result).toContain('CreateEllipse(30, 40, 120, 80)');
      expect(result).toContain('RGBAssign 0, 255, 0'); // Fill color
      expect(result).toContain('RGBAssign 255, 0, 255'); // Outline color
      expect(result).toContain('Outline.Width = 3');
    });
  });

  describe('createText', () => {
    it('should throw an error when text is not provided', async () => {
      await expect(service.createText({})).rejects.toThrow('Text content is required');
    });

    it('should generate proper VBA code for creating text with defaults', async () => {
      const result = await service.createText({ text: 'Hello World' });
      expect(result).toContain('CreateArtisticText(0, 0, "Hello World")');
      expect(result).toContain('Font = "Arial"');
      expect(result).toContain('Size = 18');
    });

    it('should generate proper VBA code for creating text with custom parameters', async () => {
      const result = await service.createText({
        x: 50,
        y: 60,
        text: 'Custom Text',
        font: 'Times New Roman',
        fontSize: 24,
        fillColor: '#FF5500',
      });
      
      expect(result).toContain('CreateArtisticText(50, 60, "Custom Text")');
      expect(result).toContain('Font = "Times New Roman"');
      expect(result).toContain('Size = 24');
      expect(result).toContain('RGBAssign 255, 85, 0'); // Fill color
    });
  });

  describe('createPolygon', () => {
    it('should generate proper VBA code for creating a polygon with defaults', async () => {
      const result = await service.createPolygon({});
      expect(result).toContain('CreatePolygon(0, 0, 50, 5)');
      expect(result).toContain('Outline.Width = 1');
    });

    it('should generate proper VBA code for creating a polygon with custom parameters', async () => {
      const result = await service.createPolygon({
        x: 70,
        y: 80,
        radius: 100,
        sides: 6,
        fillColor: '#FFFF00',
        outlineColor: '#00FFFF',
        outlineWidth: 2,
      });
      
      expect(result).toContain('CreatePolygon(70, 80, 100, 6)');
      expect(result).toContain('RGBAssign 255, 255, 0'); // Fill color
      expect(result).toContain('RGBAssign 0, 255, 255'); // Outline color
      expect(result).toContain('Outline.Width = 2');
    });
  });

  describe('selectObjects', () => {
    it('should generate proper VBA code for selecting all objects', async () => {
      const result = await service.selectObjects({ all: true });
      expect(result).toContain('ActiveDocument.SelectAllShapes');
    });

    it('should generate proper VBA code for selecting objects by type', async () => {
      const result = await service.selectObjects({ type: 'Rectangle' });
      expect(result).toContain('TypeOf shape Is Rectangle');
      expect(result).toContain('ActiveDocument.SelectObject shape');
    });

    it('should generate proper VBA code for selecting objects by name', async () => {
      const result = await service.selectObjects({ name: 'MyShape' });
      expect(result).toContain('shape.Name = "MyShape"');
      expect(result).toContain('ActiveDocument.SelectObject shape');
    });
  });

  describe('groupSelectedObjects', () => {
    it('should generate proper VBA code for grouping selected objects', async () => {
      const result = await service.groupSelectedObjects({});
      expect(result).toContain('ActiveDocument.ActiveSelection.Group');
    });
  });

  describe('applyFill', () => {
    it('should throw an error when object name is not provided', async () => {
      await expect(service.applyFill({})).rejects.toThrow('Object name is required');
    });

    it('should generate proper VBA code for applying no fill', async () => {
      const result = await service.applyFill({
        objectName: 'MyShape',
        fillType: 'none'
      });
      
      expect(result).toContain('shape.Name = "MyShape"');
      expect(result).toContain('shape.Fill.ApplyNoFill');
    });

    it('should generate proper VBA code for applying solid fill', async () => {
      const result = await service.applyFill({
        objectName: 'MyShape',
        fillType: 'solid',
        fillColor: '#FF0000'
      });
      
      expect(result).toContain('shape.Name = "MyShape"');
      expect(result).toContain('shape.Fill.UniformColor.RGBAssign 255, 0, 0');
    });

    it('should generate proper VBA code for applying gradient fill', async () => {
      const result = await service.applyFill({
        objectName: 'MyShape',
        fillType: 'gradient',
        gradientType: 'linear',
        startColor: '#FFFFFF',
        endColor: '#000000',
        angle: 45
      });
      
      expect(result).toContain('shape.Name = "MyShape"');
      expect(result).toContain('shape.Fill.Type = cdrFountainFill');
      expect(result).toContain('shape.Fill.Fountain.Type = cdrLinearFountainFill');
      expect(result).toContain('shape.Fill.Fountain.AngleOfFill = 45');
      expect(result).toContain('CreateRGBColor(255, 255, 255)'); // Start color
      expect(result).toContain('CreateRGBColor(0, 0, 0)'); // End color
    });
  });

  describe('applyOutline', () => {
    it('should throw an error when object name is not provided', async () => {
      await expect(service.applyOutline({})).rejects.toThrow('Object name is required');
    });

    it('should generate proper VBA code for applying solid outline', async () => {
      const result = await service.applyOutline({
        objectName: 'MyShape',
        outlineColor: '#0000FF',
        outlineWidth: 2,
        outlineStyle: 'solid'
      });
      
      expect(result).toContain('shape.Name = "MyShape"');
      expect(result).toContain('shape.Outline.Color.RGBAssign 0, 0, 255');
      expect(result).toContain('shape.Outline.Width = 2');
      expect(result).toContain('shape.Outline.Style = cdrNormalLine');
    });

    it('should generate proper VBA code for applying dashed outline', async () => {
      const result = await service.applyOutline({
        objectName: 'MyShape',
        outlineStyle: 'dashed'
      });
      
      expect(result).toContain('shape.Name = "MyShape"');
      expect(result).toContain('shape.Outline.Style = cdrDashedLine');
    });

    it('should generate proper VBA code for applying dotted outline', async () => {
      const result = await service.applyOutline({
        objectName: 'MyShape',
        outlineStyle: 'dotted'
      });
      
      expect(result).toContain('shape.Name = "MyShape"');
      expect(result).toContain('shape.Outline.Style = cdrDottedLine');
    });
  });
}); 