import { Test, TestingModule } from '@nestjs/testing';
import { CommandFactoryService } from '../../src/software/commands/command-factory.service';
import { CorelDrawCommandsService } from '../../src/software/commands/corel-commands.service';
import { BlenderCommandsService } from '../../src/software/commands/blender-commands.service';
import { Logger } from '@nestjs/common';

jest.mock('../../src/software/commands/corel-commands.service');
jest.mock('../../src/software/commands/blender-commands.service');

describe('CommandFactoryService', () => {
  let service: CommandFactoryService;
  let mockCorelDrawCommandsService: any;
  let mockBlenderCommandsService: any;
  let mockLogger: any;

  beforeEach(async () => {
    mockCorelDrawCommandsService = {
      createRectangle: jest.fn().mockResolvedValue({ success: true, code: 'CorelDRAW rectangle VBA' }),
      createEllipse: jest.fn().mockResolvedValue({ success: true, code: 'CorelDRAW ellipse VBA' }),
      createText: jest.fn().mockResolvedValue({ success: true, code: 'CorelDRAW text VBA' }),
      createPolygon: jest.fn().mockResolvedValue({ success: true, code: 'CorelDRAW polygon VBA' }),
      selectObjects: jest.fn().mockResolvedValue({ success: true, code: 'CorelDRAW select VBA' }),
      groupSelectedObjects: jest.fn().mockResolvedValue({ success: true, code: 'CorelDRAW group VBA' }),
      applyFill: jest.fn().mockResolvedValue({ success: true, code: 'CorelDRAW fill VBA' }),
      applyOutline: jest.fn().mockResolvedValue({ success: true, code: 'CorelDRAW outline VBA' }),
    };

    mockBlenderCommandsService = {
      createCube: jest.fn().mockResolvedValue({ success: true, code: 'Blender cube Python' }),
      createSphere: jest.fn().mockResolvedValue({ success: true, code: 'Blender sphere Python' }),
      createText: jest.fn().mockResolvedValue({ success: true, code: 'Blender text Python' }),
      createCylinder: jest.fn().mockResolvedValue({ success: true, code: 'Blender cylinder Python' }),
      createPlane: jest.fn().mockResolvedValue({ success: true, code: 'Blender plane Python' }),
      selectObjects: jest.fn().mockResolvedValue({ success: true, code: 'Blender select Python' }),
      transformObject: jest.fn().mockResolvedValue({ success: true, code: 'Blender transform Python' }),
      setupCamera: jest.fn().mockResolvedValue({ success: true, code: 'Blender camera Python' }),
      getSceneScreenshot: jest.fn().mockResolvedValue({ success: true, code: 'Blender screenshot Python' }),
      applyMaterial: jest.fn().mockResolvedValue({ success: true, code: 'Blender material Python' }),
      addTexture: jest.fn().mockResolvedValue({ success: true, code: 'Blender texture Python' }),
      setupLighting: jest.fn().mockResolvedValue({ success: true, code: 'Blender lighting Python' }),
      renderScene: jest.fn().mockResolvedValue({ success: true, code: 'Blender render Python' }),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandFactoryService,
        {
          provide: CorelDrawCommandsService,
          useValue: mockCorelDrawCommandsService,
        },
        {
          provide: BlenderCommandsService,
          useValue: mockBlenderCommandsService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<CommandFactoryService>(CommandFactoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeCommand', () => {
    it('should execute CorelDRAW commands', async () => {
      const result = await service.executeCommand('coreldraw', 'create_rectangle', { 
        width: 100, 
        height: 50 
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toBe('CorelDRAW rectangle VBA');
      expect(mockCorelDrawCommandsService.createRectangle).toHaveBeenCalledWith({
        width: 100,
        height: 50
      });
    });

    it('should execute Blender commands', async () => {
      const result = await service.executeCommand('blender', 'create_cube', { 
        size: 2 
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toBe('Blender cube Python');
      expect(mockBlenderCommandsService.createCube).toHaveBeenCalledWith({
        size: 2
      });
    });

    it('should return error for unsupported platform', async () => {
      const result = await service.executeCommand('photoshop', 'create_layer', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported platform: photoshop');
    });

    it('should return error for unsupported action', async () => {
      const result = await service.executeCommand('coreldraw', 'unsupported_action', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported action for platform coreldraw: unsupported_action');
    });
  });

  describe('executeCorelDrawAction', () => {
    it('should execute createRectangle action', async () => {
      const result = await service.executeCorelDrawAction('create_rectangle', { width: 100, height: 50 });
      
      expect(result.success).toBe(true);
      expect(mockCorelDrawCommandsService.createRectangle).toHaveBeenCalledWith({ width: 100, height: 50 });
    });

    it('should execute createEllipse action', async () => {
      const result = await service.executeCorelDrawAction('create_ellipse', { width: 100, height: 50 });
      
      expect(result.success).toBe(true);
      expect(mockCorelDrawCommandsService.createEllipse).toHaveBeenCalledWith({ width: 100, height: 50 });
    });

    it('should execute createText action', async () => {
      const result = await service.executeCorelDrawAction('create_text', { text: 'Hello' });
      
      expect(result.success).toBe(true);
      expect(mockCorelDrawCommandsService.createText).toHaveBeenCalledWith({ text: 'Hello' });
    });

    it('should execute createPolygon action', async () => {
      const result = await service.executeCorelDrawAction('create_polygon', { sides: 6 });
      
      expect(result.success).toBe(true);
      expect(mockCorelDrawCommandsService.createPolygon).toHaveBeenCalledWith({ sides: 6 });
    });

    it('should execute selectObjects action', async () => {
      const result = await service.executeCorelDrawAction('select_objects', { selectAll: true });
      
      expect(result.success).toBe(true);
      expect(mockCorelDrawCommandsService.selectObjects).toHaveBeenCalledWith({ selectAll: true });
    });

    it('should execute groupSelectedObjects action', async () => {
      const result = await service.executeCorelDrawAction('group_selected_objects', {});
      
      expect(result.success).toBe(true);
      expect(mockCorelDrawCommandsService.groupSelectedObjects).toHaveBeenCalledWith({});
    });

    it('should execute applyFill action', async () => {
      const result = await service.executeCorelDrawAction('apply_fill', { 
        objectName: 'Rectangle', 
        color: '#FF0000' 
      });
      
      expect(result.success).toBe(true);
      expect(mockCorelDrawCommandsService.applyFill).toHaveBeenCalledWith({ 
        objectName: 'Rectangle', 
        color: '#FF0000' 
      });
    });

    it('should execute applyOutline action', async () => {
      const result = await service.executeCorelDrawAction('apply_outline', { 
        objectName: 'Rectangle', 
        width: 2 
      });
      
      expect(result.success).toBe(true);
      expect(mockCorelDrawCommandsService.applyOutline).toHaveBeenCalledWith({ 
        objectName: 'Rectangle', 
        width: 2 
      });
    });

    it('should return error for unsupported action', async () => {
      const result = await service.executeCorelDrawAction('unsupported_action', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported action for CorelDRAW: unsupported_action');
    });
  });

  describe('executeBlenderAction', () => {
    it('should execute createCube action', async () => {
      const result = await service.executeBlenderAction('create_cube', { size: 2 });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.createCube).toHaveBeenCalledWith({ size: 2 });
    });

    it('should execute createSphere action', async () => {
      const result = await service.executeBlenderAction('create_sphere', { radius: 1.5 });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.createSphere).toHaveBeenCalledWith({ radius: 1.5 });
    });

    it('should execute createText action', async () => {
      const result = await service.executeBlenderAction('create_text', { text: 'Hello' });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.createText).toHaveBeenCalledWith({ text: 'Hello' });
    });

    it('should execute createCylinder action', async () => {
      const result = await service.executeBlenderAction('create_cylinder', { radius: 1.5, depth: 3 });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.createCylinder).toHaveBeenCalledWith({ radius: 1.5, depth: 3 });
    });

    it('should execute createPlane action', async () => {
      const result = await service.executeBlenderAction('create_plane', { size: 5 });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.createPlane).toHaveBeenCalledWith({ size: 5 });
    });

    it('should execute selectObjects action', async () => {
      const result = await service.executeBlenderAction('select_objects', { type: 'MESH' });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.selectObjects).toHaveBeenCalledWith({ type: 'MESH' });
    });

    it('should execute transformObject action', async () => {
      const result = await service.executeBlenderAction('transform_object', { 
        objectName: 'Cube', 
        location: [1, 2, 3] 
      });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.transformObject).toHaveBeenCalledWith({ 
        objectName: 'Cube', 
        location: [1, 2, 3] 
      });
    });

    it('should execute setupCamera action', async () => {
      const result = await service.executeBlenderAction('setup_camera', { 
        location: [0, -10, 5] 
      });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.setupCamera).toHaveBeenCalledWith({ 
        location: [0, -10, 5] 
      });
    });

    it('should execute getSceneScreenshot action', async () => {
      const result = await service.executeBlenderAction('get_screenshot', {});
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.getSceneScreenshot).toHaveBeenCalledWith({});
    });

    it('should execute applyMaterial action', async () => {
      const result = await service.executeBlenderAction('apply_material', { 
        objectName: 'Cube', 
        color: [1, 0, 0, 1] 
      });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.applyMaterial).toHaveBeenCalledWith({ 
        objectName: 'Cube', 
        color: [1, 0, 0, 1] 
      });
    });

    it('should execute addTexture action', async () => {
      const result = await service.executeBlenderAction('add_texture', { 
        objectName: 'Cube', 
        textureType: 'IMAGE',
        texturePath: '/path/to/texture.jpg'
      });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.addTexture).toHaveBeenCalledWith({ 
        objectName: 'Cube', 
        textureType: 'IMAGE',
        texturePath: '/path/to/texture.jpg' 
      });
    });

    it('should execute setupLighting action', async () => {
      const result = await service.executeBlenderAction('setup_lighting', { 
        type: 'SUN', 
        energy: 5 
      });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.setupLighting).toHaveBeenCalledWith({ 
        type: 'SUN', 
        energy: 5 
      });
    });

    it('should execute renderScene action', async () => {
      const result = await service.executeBlenderAction('render_scene', { 
        width: 1920, 
        height: 1080 
      });
      
      expect(result.success).toBe(true);
      expect(mockBlenderCommandsService.renderScene).toHaveBeenCalledWith({ 
        width: 1920, 
        height: 1080 
      });
    });

    it('should return error for unsupported action', async () => {
      const result = await service.executeBlenderAction('unsupported_action', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported action for Blender: unsupported_action');
    });
  });

  describe('getAvailableCommands', () => {
    it('should return available commands for CorelDRAW', () => {
      const commands = service.getAvailableCommands('coreldraw');
      
      expect(commands).toContain('create_rectangle');
      expect(commands).toContain('create_ellipse');
      expect(commands).toContain('create_text');
      expect(commands).toContain('create_polygon');
      expect(commands).toContain('select_objects');
      expect(commands).toContain('group_selected_objects');
      expect(commands).toContain('apply_fill');
      expect(commands).toContain('apply_outline');
    });

    it('should return available commands for Blender', () => {
      const commands = service.getAvailableCommands('blender');
      
      expect(commands).toContain('create_cube');
      expect(commands).toContain('create_sphere');
      expect(commands).toContain('create_text');
      expect(commands).toContain('create_cylinder');
      expect(commands).toContain('create_plane');
      expect(commands).toContain('select_objects');
      expect(commands).toContain('transform_object');
      expect(commands).toContain('setup_camera');
      expect(commands).toContain('get_screenshot');
      expect(commands).toContain('apply_material');
      expect(commands).toContain('add_texture');
      expect(commands).toContain('setup_lighting');
      expect(commands).toContain('render_scene');
    });

    it('should return empty array for unsupported platform', () => {
      const commands = service.getAvailableCommands('photoshop');
      
      expect(commands).toEqual([]);
    });
  });
}); 