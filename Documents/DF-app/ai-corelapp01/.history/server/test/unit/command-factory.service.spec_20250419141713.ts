import { Test, TestingModule } from '@nestjs/testing';
import { CommandFactoryService } from '../../src/software/commands/command-factory.service';
import { CorelDrawCommandsService } from '../../src/software/commands/corel-commands.service';
import { BlenderCommandsService } from '../../src/software/commands/blender-commands.service';
import { Logger } from '@nestjs/common';

describe('CommandFactoryService', () => {
  let service: CommandFactoryService;
  let corelDrawCommands: CorelDrawCommandsService;
  let blenderCommands: BlenderCommandsService;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const mockCorelDrawCommands = {
      createRectangle: jest.fn().mockResolvedValue('VBA rectangle code'),
      createEllipse: jest.fn().mockResolvedValue('VBA ellipse code'),
      createText: jest.fn().mockResolvedValue('VBA text code'),
      createPolygon: jest.fn().mockResolvedValue('VBA polygon code'),
      selectObjects: jest.fn().mockResolvedValue('VBA select code'),
      groupSelectedObjects: jest.fn().mockResolvedValue('VBA group code'),
      applyFill: jest.fn().mockResolvedValue('VBA fill code'),
      applyOutline: jest.fn().mockResolvedValue('VBA outline code'),
    };

    const mockBlenderCommands = {
      createCube: jest.fn().mockResolvedValue('Python cube code'),
      createSphere: jest.fn().mockResolvedValue('Python sphere code'),
      createCylinder: jest.fn().mockResolvedValue('Python cylinder code'),
      createPlane: jest.fn().mockResolvedValue('Python plane code'),
      createText: jest.fn().mockResolvedValue('Python text code'),
      selectObjects: jest.fn().mockResolvedValue('Python select code'),
      transformObject: jest.fn().mockResolvedValue('Python transform code'),
      setupCamera: jest.fn().mockResolvedValue('Python camera code'),
      getSceneScreenshot: jest.fn().mockResolvedValue('Python screenshot code'),
      applyMaterial: jest.fn().mockResolvedValue('Python material code'),
      setupLighting: jest.fn().mockResolvedValue('Python lighting code'),
      addTexture: jest.fn().mockResolvedValue('Python texture code'),
      renderScene: jest.fn().mockResolvedValue('Python render code'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandFactoryService,
        {
          provide: CorelDrawCommandsService,
          useValue: mockCorelDrawCommands,
        },
        {
          provide: BlenderCommandsService,
          useValue: mockBlenderCommands,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CommandFactoryService>(CommandFactoryService);
    corelDrawCommands = module.get<CorelDrawCommandsService>(CorelDrawCommandsService);
    blenderCommands = module.get<BlenderCommandsService>(BlenderCommandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeCommand', () => {
    it('should execute a CorelDRAW command', async () => {
      const result = await service.executeCommand('coreldraw', 'create_rectangle', {
        width: 200,
        height: 150,
      });
      
      expect(result).toBe('VBA rectangle code');
      expect(corelDrawCommands.createRectangle).toHaveBeenCalledWith({
        width: 200,
        height: 150,
      });
    });

    it('should execute a Blender command', async () => {
      const result = await service.executeCommand('blender', 'create_cube', {
        sizeX: 2,
        sizeY: 2,
        sizeZ: 2,
      });
      
      expect(result).toBe('Python cube code');
      expect(blenderCommands.createCube).toHaveBeenCalledWith({
        sizeX: 2,
        sizeY: 2,
        sizeZ: 2,
      });
    });

    it('should throw an error for unknown platform', async () => {
      await expect(
        service.executeCommand('unknown' as any, 'create_rectangle', {})
      ).rejects.toThrow('Unknown platform: unknown');
    });

    it('should throw an error for unknown action', async () => {
      await expect(
        service.executeCommand('coreldraw', 'unknown_action', {})
      ).rejects.toThrow('Unknown CorelDRAW action: unknown_action');
    });
  });

  describe('executeCorelDrawAction', () => {
    it('should call createRectangle', async () => {
      await service.executeCorelDrawAction('create_rectangle', { width: 100 });
      expect(corelDrawCommands.createRectangle).toHaveBeenCalledWith({ width: 100 });
    });

    it('should call createEllipse', async () => {
      await service.executeCorelDrawAction('create_ellipse', { radius: 50 });
      expect(corelDrawCommands.createEllipse).toHaveBeenCalledWith({ radius: 50 });
    });

    it('should call createText', async () => {
      await service.executeCorelDrawAction('create_text', { text: 'Hello' });
      expect(corelDrawCommands.createText).toHaveBeenCalledWith({ text: 'Hello' });
    });

    it('should call createPolygon', async () => {
      await service.executeCorelDrawAction('create_polygon', { sides: 6 });
      expect(corelDrawCommands.createPolygon).toHaveBeenCalledWith({ sides: 6 });
    });

    it('should call selectObjects', async () => {
      await service.executeCorelDrawAction('select_objects', { type: 'Rectangle' });
      expect(corelDrawCommands.selectObjects).toHaveBeenCalledWith({ type: 'Rectangle' });
    });

    it('should call groupSelectedObjects', async () => {
      await service.executeCorelDrawAction('group_objects', {});
      expect(corelDrawCommands.groupSelectedObjects).toHaveBeenCalledWith({});
    });

    it('should call applyFill', async () => {
      await service.executeCorelDrawAction('apply_fill', { fillColor: '#FF0000' });
      expect(corelDrawCommands.applyFill).toHaveBeenCalledWith({ fillColor: '#FF0000' });
    });

    it('should call applyOutline', async () => {
      await service.executeCorelDrawAction('apply_outline', { outlineWidth: 2 });
      expect(corelDrawCommands.applyOutline).toHaveBeenCalledWith({ outlineWidth: 2 });
    });

    it('should throw error for unknown action', async () => {
      await expect(
        service.executeCorelDrawAction('unknown_action', {})
      ).rejects.toThrow('Unknown CorelDRAW action: unknown_action');
    });
  });

  describe('executeBlenderAction', () => {
    it('should call createCube', async () => {
      await service.executeBlenderAction('create_cube', { sizeX: 2 });
      expect(blenderCommands.createCube).toHaveBeenCalledWith({ sizeX: 2 });
    });

    it('should call createSphere', async () => {
      await service.executeBlenderAction('create_sphere', { radius: 1.5 });
      expect(blenderCommands.createSphere).toHaveBeenCalledWith({ radius: 1.5 });
    });

    it('should call createCylinder', async () => {
      await service.executeBlenderAction('create_cylinder', { depth: 3 });
      expect(blenderCommands.createCylinder).toHaveBeenCalledWith({ depth: 3 });
    });

    it('should call createPlane', async () => {
      await service.executeBlenderAction('create_plane', { size: 5 });
      expect(blenderCommands.createPlane).toHaveBeenCalledWith({ size: 5 });
    });

    it('should call createText', async () => {
      await service.executeBlenderAction('create_text', { text: 'Blender Text' });
      expect(blenderCommands.createText).toHaveBeenCalledWith({ text: 'Blender Text' });
    });

    it('should call selectObjects', async () => {
      await service.executeBlenderAction('select_objects', { type: 'MESH' });
      expect(blenderCommands.selectObjects).toHaveBeenCalledWith({ type: 'MESH' });
    });

    it('should call transformObject', async () => {
      await service.executeBlenderAction('transform_object', { objectName: 'Cube' });
      expect(blenderCommands.transformObject).toHaveBeenCalledWith({ objectName: 'Cube' });
    });

    it('should call setupCamera', async () => {
      await service.executeBlenderAction('setup_camera', { x: 5, y: 5, z: 5 });
      expect(blenderCommands.setupCamera).toHaveBeenCalledWith({ x: 5, y: 5, z: 5 });
    });

    it('should call getSceneScreenshot', async () => {
      await service.executeBlenderAction('get_screenshot', { width: 1920, height: 1080 });
      expect(blenderCommands.getSceneScreenshot).toHaveBeenCalledWith({ width: 1920, height: 1080 });
    });

    it('should call applyMaterial', async () => {
      await service.executeBlenderAction('apply_material', { objectName: 'Cube', color: '#FF0000' });
      expect(blenderCommands.applyMaterial).toHaveBeenCalledWith({ objectName: 'Cube', color: '#FF0000' });
    });

    it('should call setupLighting', async () => {
      await service.executeBlenderAction('setup_lighting', { lightType: 'SUN' });
      expect(blenderCommands.setupLighting).toHaveBeenCalledWith({ lightType: 'SUN' });
    });

    it('should call addTexture', async () => {
      await service.executeBlenderAction('add_texture', { objectName: 'Cube', textureType: 'image' });
      expect(blenderCommands.addTexture).toHaveBeenCalledWith({ objectName: 'Cube', textureType: 'image' });
    });

    it('should call renderScene', async () => {
      await service.executeBlenderAction('render_scene', { samples: 64 });
      expect(blenderCommands.renderScene).toHaveBeenCalledWith({ samples: 64 });
    });

    it('should throw error for unknown action', async () => {
      await expect(
        service.executeBlenderAction('unknown_action', {})
      ).rejects.toThrow('Unknown Blender action: unknown_action');
    });
  });

  describe('getAvailableCommands', () => {
    it('should return CorelDRAW commands', () => {
      const commands = service.getAvailableCommands('coreldraw');
      expect(commands).toContain('create_rectangle');
      expect(commands).toContain('create_ellipse');
      expect(commands).toContain('create_text');
      expect(commands).toContain('create_polygon');
      expect(commands).toContain('select_objects');
      expect(commands).toContain('group_objects');
      expect(commands).toContain('apply_fill');
      expect(commands).toContain('apply_outline');
    });

    it('should return Blender commands', () => {
      const commands = service.getAvailableCommands('blender');
      expect(commands).toContain('create_cube');
      expect(commands).toContain('create_sphere');
      expect(commands).toContain('create_cylinder');
      expect(commands).toContain('create_plane');
      expect(commands).toContain('create_text');
      expect(commands).toContain('select_objects');
      expect(commands).toContain('transform_object');
      expect(commands).toContain('setup_camera');
      expect(commands).toContain('get_screenshot');
      expect(commands).toContain('apply_material');
      expect(commands).toContain('setup_lighting');
      expect(commands).toContain('add_texture');
      expect(commands).toContain('render_scene');
    });

    it('should throw error for unknown platform', () => {
      expect(() =>
        service.getAvailableCommands('unknown' as any)
      ).toThrow('Unknown platform: unknown');
    });
  });
}); 