import { Test, TestingModule } from '@nestjs/testing';
import { CommandFactoryService } from '../../src/software/commands/command-factory.service';
import { CorelDrawCommandsService } from '../../src/software/commands/corel-commands.service';
import { BlenderCommandsService } from '../../src/software/commands/blender-commands.service';
import { ObjectModelCommandAdapter } from '../../src/software/universal/object-model-command-adapter';
import { BlenderObjectModel } from '../../src/software/universal/blender-object-model';
import { CorelDrawObjectModel } from '../../src/software/universal/coreldraw-object-model';
import { BlenderService } from '../../src/software/blender.service';
import { CorelDrawService } from '../../src/software/coreldraw.service';
import { Logger } from '@nestjs/common';

describe('ObjectModelCommandAdapter Integration', () => {
  let objectModelAdapter: ObjectModelCommandAdapter;
  let commandFactoryService: CommandFactoryService;
  let blenderObjectModel: BlenderObjectModel;
  let corelDrawObjectModel: CorelDrawObjectModel;
  let corelDrawService: jest.Mocked<CorelDrawService>;
  let blenderService: jest.Mocked<BlenderService>;
  
  beforeEach(async () => {
    // Create mock implementations for external services
    const mockCorelDrawService = {
      executeCode: jest.fn().mockResolvedValue({
        success: true,
        output: 'Executed CorelDRAW code'
      }),
      executeMethod: jest.fn().mockResolvedValue({
        success: true,
        result: { objectId: 'corel-123' }
      }),
      getStatus: jest.fn().mockResolvedValue({ connected: true, version: 'Test CorelDRAW' })
    };
    
    const mockBlenderService = {
      executeCode: jest.fn().mockResolvedValue({
        success: true,
        output: 'Executed Blender code'
      }),
      executeMethod: jest.fn().mockResolvedValue({
        success: true,
        result: { objectId: 'blender-456' }
      }),
      getStatus: jest.fn().mockResolvedValue({ connected: true, version: 'Test Blender' })
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommandFactoryService,
        CorelDrawCommandsService,
        BlenderCommandsService,
        ObjectModelCommandAdapter,
        BlenderObjectModel,
        CorelDrawObjectModel,
        {
          provide: BlenderService,
          useValue: mockBlenderService
        },
        {
          provide: CorelDrawService,
          useValue: mockCorelDrawService
        },
        {
          provide: Logger,
          useFactory: () => ({
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          }),
        },
      ]
    }).compile();
    
    objectModelAdapter = module.get<ObjectModelCommandAdapter>(ObjectModelCommandAdapter);
    commandFactoryService = module.get<CommandFactoryService>(CommandFactoryService);
    blenderObjectModel = module.get<BlenderObjectModel>(BlenderObjectModel);
    corelDrawObjectModel = module.get<CorelDrawObjectModel>(CorelDrawObjectModel);
    corelDrawService = module.get(CorelDrawService) as jest.Mocked<CorelDrawService>;
    blenderService = module.get(BlenderService) as jest.Mocked<BlenderService>;
    
    // Setup spies for object model methods
    jest.spyOn(corelDrawObjectModel, 'createRectangle').mockResolvedValue({
      id: 'rect-1',
      type: 'rectangle',
      x: 100,
      y: 200,
      width: 300,
      height: 150,
      success: true
    });
    
    jest.spyOn(corelDrawObjectModel, 'createEllipse').mockResolvedValue({
      id: 'ellipse-1',
      type: 'ellipse',
      x: 100,
      y: 200,
      width: 300,
      height: 300,
      success: true
    });
    
    jest.spyOn(blenderObjectModel, 'createCube').mockResolvedValue({
      id: 'cube-1',
      type: 'cube',
      location: [1, 1, 1],
      dimensions: [2, 2, 2],
      success: true
    });
    
    jest.spyOn(blenderObjectModel, 'createSphere').mockResolvedValue({
      id: 'sphere-1',
      type: 'sphere',
      location: [0, 0, 0],
      radius: 2,
      success: true
    });
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('executeCommandViaObjectModel', () => {
    it('should execute a CorelDRAW rectangle command via object model', async () => {
      const result = await objectModelAdapter.executeCommandViaObjectModel(
        'coreldraw',
        'create_rectangle', 
        { 
          x: 100, 
          y: 200, 
          width: 300, 
          height: 150 
        }
      );
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(corelDrawObjectModel.createRectangle).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        width: 300,
        height: 150
      });
      expect(result.data).toEqual({
        id: 'rect-1',
        type: 'rectangle',
        x: 100,
        y: 200,
        width: 300,
        height: 150,
        success: true
      });
    });
    
    it('should execute a CorelDRAW ellipse command via object model', async () => {
      const result = await objectModelAdapter.executeCommandViaObjectModel(
        'coreldraw',
        'create_ellipse', 
        { 
          x: 100, 
          y: 200, 
          width: 300, 
          height: 300 
        }
      );
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(corelDrawObjectModel.createEllipse).toHaveBeenCalledWith({
        x: 100,
        y: 200,
        width: 300,
        height: 300
      });
      expect(result.data).toEqual({
        id: 'ellipse-1',
        type: 'ellipse',
        x: 100,
        y: 200,
        width: 300,
        height: 300,
        success: true
      });
    });
    
    it('should execute a Blender cube command via object model', async () => {
      const result = await objectModelAdapter.executeCommandViaObjectModel(
        'blender',
        'create_cube', 
        { 
          location: [1, 1, 1], 
          size: 2 
        }
      );
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(blenderObjectModel.createCube).toHaveBeenCalledWith({
        location: [1, 1, 1],
        size: 2
      });
      expect(result.data).toEqual({
        id: 'cube-1',
        type: 'cube',
        location: [1, 1, 1],
        dimensions: [2, 2, 2],
        success: true
      });
    });
    
    it('should execute a Blender sphere command via object model', async () => {
      const result = await objectModelAdapter.executeCommandViaObjectModel(
        'blender',
        'create_sphere', 
        { 
          location: [0, 0, 0], 
          radius: 2 
        }
      );
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(blenderObjectModel.createSphere).toHaveBeenCalledWith({
        location: [0, 0, 0],
        radius: 2
      });
      expect(result.data).toEqual({
        id: 'sphere-1',
        type: 'sphere',
        location: [0, 0, 0],
        radius: 2,
        success: true
      });
    });
    
    it('should fall back to the command factory for unsupported object model methods', async () => {
      // Setup spy to simulate unsupported command in object model but available in command factory
      jest.spyOn(commandFactoryService, 'executeCommand').mockResolvedValue({
        success: true,
        output: 'Executed via command factory',
        data: { id: 'fallback-object' }
      });
      
      const result = await objectModelAdapter.executeCommandViaObjectModel(
        'coreldraw',
        'create_polygon', 
        { 
          x: 100, 
          y: 100, 
          radius: 50, 
          sides: 6 
        }
      );
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(commandFactoryService.executeCommand).toHaveBeenCalledWith(
        'coreldraw',
        'create_polygon',
        { x: 100, y: 100, radius: 50, sides: 6 }
      );
      expect(result.output).toBe('Executed via command factory');
    });
    
    it('should handle unsupported platforms', async () => {
      const result = await objectModelAdapter.executeCommandViaObjectModel(
        'unsupported_platform',
        'any_command',
        {}
      );
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unsupported platform');
    });
    
    it('should handle errors from the object model', async () => {
      // Setup spy to simulate error in object model
      jest.spyOn(corelDrawObjectModel, 'createRectangle').mockRejectedValue(
        new Error('Test error from object model')
      );
      
      const result = await objectModelAdapter.executeCommandViaObjectModel(
        'coreldraw',
        'create_rectangle',
        { x: 100, y: 200, width: 300, height: 150 }
      );
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Test error from object model');
    });
  });
}); 