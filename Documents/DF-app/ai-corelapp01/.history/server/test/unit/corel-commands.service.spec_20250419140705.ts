import { Test, TestingModule } from '@nestjs/testing';
import { CorelDrawCommandsService } from '../../src/software/commands/corel-commands.service';
import { Logger } from '@nestjs/common';

describe('CorelDrawCommandsService', () => {
  let service: CorelDrawCommandsService;
  let loggerMock: any;

  beforeEach(async () => {
    loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorelDrawCommandsService,
        {
          provide: Logger,
          useValue: loggerMock
        }
      ],
    }).compile();

    service = module.get<CorelDrawCommandsService>(CorelDrawCommandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRectangle', () => {
    it('should generate VBA code to create a rectangle', async () => {
      const params = {
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        fillColor: '#FF0000',
        outlineColor: '#000000',
        outlineWidth: 2
      };

      const result = await service.createRectangle(params);

      expect(result).toContain('ActiveDocument.ActivePage.ActiveLayer.CreateRectangle');
      expect(result).toContain('100, 100, 200, 150');
      expect(result).toContain('rect.Fill.UniformColor.RGBAssign');
      expect(result).toContain('255, 0, 0');
      expect(result).toContain('rect.Outline.Color.RGBAssign');
      expect(result).toContain('0, 0, 0');
      expect(result).toContain('rect.Outline.Width = 2');
    });

    it('should use default values when parameters are not provided', async () => {
      const result = await service.createRectangle({});

      expect(result).toContain('ActiveDocument.ActivePage.ActiveLayer.CreateRectangle');
      expect(result).toContain('0, 0, 100, 100');
      expect(result).toContain('rect.Fill.ApplyNoFill');
      expect(result).toContain('rect.Outline.Color.RGBAssign');
      expect(result).toContain('0, 0, 0');
      expect(result).toContain('rect.Outline.Width = 1');
    });
  });

  describe('createEllipse', () => {
    it('should generate VBA code to create an ellipse', async () => {
      const params = {
        x: 100,
        y: 100,
        width: 200,
        height: 150,
        fillColor: '#00FF00',
        outlineColor: '#000000',
        outlineWidth: 2
      };

      const result = await service.createEllipse(params);

      expect(result).toContain('ActiveDocument.ActivePage.ActiveLayer.CreateEllipse');
      expect(result).toContain('100, 100, 200, 150');
      expect(result).toContain('ellipse.Fill.UniformColor.RGBAssign');
      expect(result).toContain('0, 255, 0');
      expect(result).toContain('ellipse.Outline.Color.RGBAssign');
      expect(result).toContain('0, 0, 0');
      expect(result).toContain('ellipse.Outline.Width = 2');
    });

    it('should use default values when parameters are not provided', async () => {
      const result = await service.createEllipse({});

      expect(result).toContain('ActiveDocument.ActivePage.ActiveLayer.CreateEllipse');
      expect(result).toContain('0, 0, 100, 100');
      expect(result).toContain('ellipse.Fill.ApplyNoFill');
      expect(result).toContain('ellipse.Outline.Color.RGBAssign');
      expect(result).toContain('0, 0, 0');
      expect(result).toContain('ellipse.Outline.Width = 1');
    });
  });

  describe('createText', () => {
    it('should generate VBA code to create text', async () => {
      const params = {
        x: 100,
        y: 100,
        text: 'Hello CorelDRAW',
        font: 'Arial',
        fontSize: 24,
        fillColor: '#0000FF'
      };

      const result = await service.createText(params);

      expect(result).toContain('ActiveDocument.ActivePage.ActiveLayer.CreateArtisticText');
      expect(result).toContain('100, 100, "Hello CorelDRAW"');
      expect(result).toContain('text.Text.Story.Font = "Arial"');
      expect(result).toContain('text.Text.Story.Size = 24');
      expect(result).toContain('text.Fill.UniformColor.RGBAssign');
      expect(result).toContain('0, 0, 255');
    });

    it('should throw error when text is not provided', async () => {
      await expect(service.createText({})).rejects.toThrow('Text content is required');
    });
  });

  describe('createPolygon', () => {
    it('should generate VBA code to create a polygon', async () => {
      const params = {
        x: 100,
        y: 100,
        radius: 50,
        sides: 6,
        fillColor: '#FFFF00',
        outlineColor: '#000000',
        outlineWidth: 1.5
      };

      const result = await service.createPolygon(params);

      expect(result).toContain('Set polygon = ActiveDocument.ActivePage.ActiveLayer.CreatePolygon');
      expect(result).toContain('100, 100, 50, 6');
      expect(result).toContain('polygon.Fill.UniformColor.RGBAssign');
      expect(result).toContain('255, 255, 0');
      expect(result).toContain('polygon.Outline.Color.RGBAssign');
      expect(result).toContain('0, 0, 0');
      expect(result).toContain('polygon.Outline.Width = 1.5');
    });

    it('should use default values when parameters are not provided', async () => {
      const result = await service.createPolygon({});

      expect(result).toContain('Set polygon = ActiveDocument.ActivePage.ActiveLayer.CreatePolygon');
      expect(result).toContain('0, 0, 50, 5');
      expect(result).toContain('polygon.Fill.ApplyNoFill');
      expect(result).toContain('polygon.Outline.Color.RGBAssign');
      expect(result).toContain('0, 0, 0');
      expect(result).toContain('polygon.Outline.Width = 1');
    });
  });

  describe('selectObjects', () => {
    it('should generate VBA code to select objects by type', async () => {
      const result = await service.selectObjects({ type: 'Rectangle' });

      expect(result).toContain('ActiveDocument.ClearSelection');
      expect(result).toContain('For Each shape In ActiveDocument.ActivePage.Shapes');
      expect(result).toContain('If TypeOf shape Is Rectangle Then');
      expect(result).toContain('ActiveDocument.SelectObject shape');
    });

    it('should generate VBA code to select objects by name', async () => {
      const result = await service.selectObjects({ name: 'MyShape' });

      expect(result).toContain('ActiveDocument.ClearSelection');
      expect(result).toContain('For Each shape In ActiveDocument.ActivePage.Shapes');
      expect(result).toContain('If shape.Name = "MyShape" Then');
      expect(result).toContain('ActiveDocument.SelectObject shape');
    });

    it('should generate VBA code to select all objects', async () => {
      const result = await service.selectObjects({ all: true });

      expect(result).toContain('ActiveDocument.SelectAllShapes');
    });
  });

  describe('groupSelectedObjects', () => {
    it('should generate VBA code to group selected objects', async () => {
      const result = await service.groupSelectedObjects({});

      expect(result).toContain('Set groupShape = ActiveDocument.ActiveSelection.Group');
    });
  });

  describe('applyFill', () => {
    it('should generate VBA code to apply a solid fill', async () => {
      const params = {
        objectName: 'MyShape',
        fillType: 'solid',
        fillColor: '#FF5500'
      };

      const result = await service.applyFill(params);

      expect(result).toContain('For Each shape In ActiveDocument.ActivePage.Shapes');
      expect(result).toContain('If shape.Name = "MyShape" Then');
      expect(result).toContain('shape.Fill.UniformColor.RGBAssign');
      expect(result).toContain('255, 85, 0');
    });

    it('should generate VBA code to apply a gradient fill', async () => {
      const params = {
        objectName: 'MyShape',
        fillType: 'gradient',
        gradientType: 'linear',
        startColor: '#FF0000',
        endColor: '#0000FF',
        angle: 45
      };

      const result = await service.applyFill(params);

      expect(result).toContain('shape.Fill.Type = cdrFountainFill');
      expect(result).toContain('shape.Fill.Fountain.Type = cdrLinearFountainFill');
      expect(result).toContain('shape.Fill.Fountain.AngleOfFill = 45');
      expect(result).toContain('shape.Fill.Fountain.Colors.Add');
      expect(result).toContain('255, 0, 0');
      expect(result).toContain('0, 0, 255');
    });

    it('should throw error if objectName is not provided', async () => {
      await expect(service.applyFill({})).rejects.toThrow('Object name is required');
    });
  });

  describe('applyOutline', () => {
    it('should generate VBA code to apply an outline', async () => {
      const params = {
        objectName: 'MyShape',
        outlineColor: '#000000',
        outlineWidth: 2.5,
        outlineStyle: 'dashed'
      };

      const result = await service.applyOutline(params);

      expect(result).toContain('For Each shape In ActiveDocument.ActivePage.Shapes');
      expect(result).toContain('If shape.Name = "MyShape" Then');
      expect(result).toContain('shape.Outline.Color.RGBAssign');
      expect(result).toContain('0, 0, 0');
      expect(result).toContain('shape.Outline.Width = 2.5');
      expect(result).toContain('shape.Outline.Style = cdrDashedLine');
    });

    it('should throw error if objectName is not provided', async () => {
      await expect(service.applyOutline({})).rejects.toThrow('Object name is required');
    });
  });
}); 