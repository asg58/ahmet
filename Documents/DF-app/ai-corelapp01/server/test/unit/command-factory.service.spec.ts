import { Test, TestingModule } from '@nestjs/testing';
import { CommandFactoryService, CommandExecutionResult } from '../../src/software/commands/command-factory.service';
import { CorelDrawCommandsService } from '../../src/software/commands/corel-commands.service';
import { BlenderCommandsService } from '../../src/software/commands/blender-commands.service';
import { Logger } from '@nestjs/common';
import { CommandResult, SupportedPlatform } from '../../src/software/commands/command.types';

// Mock the command services
jest.mock('../../src/software/commands/corel-commands.service');
jest.mock('../../src/software/commands/blender-commands.service');

describe('CommandFactoryService', () => {
  let service: CommandFactoryService;
  let corelCommandsService: jest.Mocked<CorelDrawCommandsService>;
  let blenderCommandsService: jest.Mocked<BlenderCommandsService>;
  let logger: jest.Mocked<Logger>;

  beforeEach(async () => {
    // Create mocks
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    } as unknown as jest.Mocked<Logger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandFactoryService,
        {
          provide: CorelDrawCommandsService,
          useValue: {
            createRectangle: jest.fn(),
            createEllipse: jest.fn(),
            createText: jest.fn(),
            createPolygon: jest.fn(),
            selectObjects: jest.fn(),
            groupSelectedObjects: jest.fn(),
            applyFill: jest.fn(),
            applyOutline: jest.fn(),
          },
        },
        {
          provide: BlenderCommandsService,
          useValue: {
            createCube: jest.fn(),
            createSphere: jest.fn(),
            createCylinder: jest.fn(),
            createPlane: jest.fn(),
            createText: jest.fn(),
            selectObjects: jest.fn(),
            getSceneScreenshot: jest.fn(),
            transformObject: jest.fn(),
            setupCamera: jest.fn(),
            setupLighting: jest.fn(),
            applyMaterial: jest.fn(),
            addTexture: jest.fn(),
            renderScene: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get<CommandFactoryService>(CommandFactoryService);
    corelCommandsService = module.get(CorelDrawCommandsService) as jest.Mocked<CorelDrawCommandsService>;
    blenderCommandsService = module.get(BlenderCommandsService) as jest.Mocked<BlenderCommandsService>;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeCommand', () => {
    it('should call executeCorelDrawAction for CorelDRAW platform', async () => {
      // Arrange
      const platform = 'coreldraw';
      const action = 'create_rectangle';
      const params = { x: 100, y: 100, width: 200, height: 100 };
      const executeCorelDrawActionSpy = jest.spyOn(service as any, 'executeCorelDrawAction').mockResolvedValue({ success: true });

      // Act
      const result = await service.executeCommand(platform, action, params);

      // Assert
      expect(executeCorelDrawActionSpy).toHaveBeenCalledWith(action, params);
      expect(result).toEqual({ success: true });
    });

    it('should call executeBlenderAction for Blender platform', async () => {
      // Arrange
      const platform = 'blender';
      const action = 'create_cube';
      const params = { location: [0, 0, 0], size: 2 };
      const executeBlenderActionSpy = jest.spyOn(service as any, 'executeBlenderAction').mockResolvedValue({ success: true });

      // Act
      const result = await service.executeCommand(platform, action, params);

      // Assert
      expect(executeBlenderActionSpy).toHaveBeenCalledWith(action, params);
      expect(result).toEqual({ success: true });
    });

    it('should return error for unsupported platform', async () => {
      // Arrange
      const platform = 'unsupported' as SupportedPlatform;
      const action = 'some_action';
      const params = {};

      // Act
      const result = await service.executeCommand(platform, action, params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain(`Unsupported platform: ${platform}`);
    });
  });

  describe('executeCorelDrawAction', () => {
    it('should call createRectangle for create_rectangle action', async () => {
      // Arrange
      const action = 'create_rectangle';
      const params = { x: 100, y: 100, width: 200, height: 100 };
      corelCommandsService.createRectangle.mockResolvedValue({ 
        success: true, 
        code: 'Rectangle created' 
      } as CommandResult);

      // Act
      const result = await (service as any).executeCorelDrawAction(action, params);

      // Assert
      expect(corelCommandsService.createRectangle).toHaveBeenCalledWith(params);
      expect(result).toEqual({ success: true, code: 'Rectangle created' });
    });

    it('should call createEllipse for create_ellipse action', async () => {
      // Arrange
      const action = 'create_ellipse';
      const params = { x: 100, y: 100, width: 200, height: 100 };
      corelCommandsService.createEllipse.mockResolvedValue({ 
        success: true, 
        code: 'Ellipse created' 
      } as CommandResult);

      // Act
      const result = await (service as any).executeCorelDrawAction(action, params);

      // Assert
      expect(corelCommandsService.createEllipse).toHaveBeenCalledWith(params);
      expect(result).toEqual({ success: true, code: 'Ellipse created' });
    });

    it('should return error for unsupported action', async () => {
      // Arrange
      const action = 'unsupported_action';
      const params = {};

      // Act
      const result = await (service as any).executeCorelDrawAction(action, params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain(`Unknown CorelDRAW action: ${action}`);
    });
  });

  describe('executeBlenderAction', () => {
    it('should call createCube for create_cube action', async () => {
      // Arrange
      const action = 'create_cube';
      const params = { location: [0, 0, 0], size: 2 };
      blenderCommandsService.createCube.mockResolvedValue({ 
        success: true, 
        code: 'Cube created' 
      } as CommandResult);

      // Act
      const result = await (service as any).executeBlenderAction(action, params);

      // Assert
      expect(blenderCommandsService.createCube).toHaveBeenCalledWith(params);
      expect(result).toEqual({ success: true, code: 'Cube created' });
    });

    it('should call createSphere for create_sphere action', async () => {
      // Arrange
      const action = 'create_sphere';
      const params = { location: [0, 0, 0], radius: 1 };
      blenderCommandsService.createSphere.mockResolvedValue({ 
        success: true, 
        code: 'Sphere created' 
      } as CommandResult);

      // Act
      const result = await (service as any).executeBlenderAction(action, params);

      // Assert
      expect(blenderCommandsService.createSphere).toHaveBeenCalledWith(params);
      expect(result).toEqual({ success: true, code: 'Sphere created' });
    });

    it('should return error for unsupported action', async () => {
      // Arrange
      const action = 'unsupported_action';
      const params = {};

      // Act
      const result = await (service as any).executeBlenderAction(action, params);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toContain(`Unknown Blender action: ${action}`);
    });
  });

  describe('getAvailableCommands', () => {
    it('should return available commands for CorelDRAW', () => {
      // Act
      const commands = service.getAvailableCommands('coreldraw');

      // Assert
      expect(commands).toContain('create_rectangle');
      expect(commands).toContain('create_ellipse');
      expect(commands).toContain('create_text');
      expect(commands).toContain('create_polygon');
      expect(commands).toContain('select_objects');
      expect(commands).toContain('group_objects');
    });

    it('should return available commands for Blender', () => {
      // Act
      const commands = service.getAvailableCommands('blender');

      // Assert
      expect(commands).toContain('create_cube');
      expect(commands).toContain('create_sphere');
      expect(commands).toContain('create_cylinder');
      expect(commands).toContain('create_plane');
      expect(commands).toContain('create_text');
      expect(commands).toContain('select_objects');
      expect(commands).toContain('get_screenshot');
      expect(commands).toContain('transform_object');
      expect(commands).toContain('setup_camera');
      expect(commands).toContain('setup_lighting');
      expect(commands).toContain('apply_material');
      expect(commands).toContain('add_texture');
      expect(commands).toContain('render_scene');
    });

    it('should return empty array for unsupported platform', () => {
      // Act
      const commands = service.getAvailableCommands('unsupported' as SupportedPlatform);

      // Assert
      expect(commands).toEqual([]);
    });
  });
}); 