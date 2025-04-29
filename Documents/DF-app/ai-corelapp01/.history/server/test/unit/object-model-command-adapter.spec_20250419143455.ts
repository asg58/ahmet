import { Test, TestingModule } from '@nestjs/testing';
import { ObjectModelCommandAdapter } from '../../src/software/universal/object-model-command-adapter';
import { CommandFactoryService } from '../../src/software/commands/command-factory.service';
import { BlenderObjectModel } from '../../src/software/universal/blender-object-model';
import { CorelDrawObjectModel } from '../../src/software/universal/coreldraw-object-model';
import { Logger } from '@nestjs/common';

describe('ObjectModelCommandAdapter', () => {
  let adapter: ObjectModelCommandAdapter;
  let commandFactory: jest.Mocked<CommandFactoryService>;
  let blenderObjectModel: jest.Mocked<BlenderObjectModel>;
  let corelDrawObjectModel: jest.Mocked<CorelDrawObjectModel>;
  
  beforeEach(async () => {
    // Create mock implementations
    const mockCommandFactory = {
      executeCommand: jest.fn(),
      executeCorelDrawAction: jest.fn(),
      executeBlenderAction: jest.fn(),
      getAvailableCommands: jest.fn()
    };
    
    const mockMethodResult = {
      success: true,
      returnValue: 'mock-object-path',
      error: null
    };

    const mockBlenderObjectModel = {
      invokeMethod: jest.fn().mockResolvedValue(mockMethodResult),
      executeCode: jest.fn().mockResolvedValue(mockMethodResult),
      getCurrentContext: jest.fn().mockResolvedValue({
        documentPath: 'bpy.data',
        selectedObjects: ['bpy.data.objects["Cube"]'],
        documentProperties: {}
      }),
      getObjectDescriptor: jest.fn(),
      getProperty: jest.fn(),
      setProperty: jest.fn(),
      getRootObjects: jest.fn(),
      findObjects: jest.fn(),
      getCapabilities: jest.fn()
    };
    
    const mockCorelDrawObjectModel = {
      invokeMethod: jest.fn().mockResolvedValue(mockMethodResult),
      executeCode: jest.fn().mockResolvedValue(mockMethodResult),
      getCurrentContext: jest.fn().mockResolvedValue({
        documentPath: 'Application.ActiveDocument',
        selectedObjects: [],
        documentProperties: {}
      }),
      getObjectDescriptor: jest.fn(),
      getProperty: jest.fn(),
      setProperty: jest.fn(),
      getRootObjects: jest.fn(),
      findObjects: jest.fn(),
      getCapabilities: jest.fn()
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectModelCommandAdapter,
        {
          provide: CommandFactoryService,
          useValue: mockCommandFactory
        },
        {
          provide: BlenderObjectModel,
          useValue: mockBlenderObjectModel
        },
        {
          provide: CorelDrawObjectModel,
          useValue: mockCorelDrawObjectModel
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          }
        }
      ],
    }).compile();
    
    adapter = module.get<ObjectModelCommandAdapter>(ObjectModelCommandAdapter);
    commandFactory = module.get(CommandFactoryService) as jest.Mocked<CommandFactoryService>;
    blenderObjectModel = module.get(BlenderObjectModel) as jest.Mocked<BlenderObjectModel>;
    corelDrawObjectModel = module.get(CorelDrawObjectModel) as jest.Mocked<CorelDrawObjectModel>;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });
  
  describe('executeCommandViaObjectModel', () => {
    it('should execute a Blender cube creation command via object model', async () => {
      await adapter.executeCommandViaObjectModel('blender', 'create_cube', {
        size: 2,
        location: [0, 0, 0]
      });
      
      expect(blenderObjectModel.invokeMethod).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.arrayContaining([expect.objectContaining({
          size: 2,
          location: [0, 0, 0]
        })])
      );
    });
    
    it('should execute a CorelDRAW rectangle creation command via object model', async () => {
      await adapter.executeCommandViaObjectModel('coreldraw', 'create_rectangle', {
        x: 100,
        y: 100,
        width: 200,
        height: 100
      });
      
      expect(corelDrawObjectModel.invokeMethod).toHaveBeenCalledWith(
        expect.stringContaining('ActivePage'),
        'CreateRectangle',
        expect.any(Array)
      );
    });
    
    it('should apply fill to created rectangle when specified', async () => {
      await adapter.executeCommandViaObjectModel('coreldraw', 'create_rectangle', {
        x: 100,
        y: 200,
        width: 300,
        height: 150,
        fill: '#FF0000'
      });
      
      // Check if executeCode was called to apply the fill
      expect(corelDrawObjectModel.executeCode).toHaveBeenCalledWith(
        expect.stringContaining('obj.Fill.ApplyUniformFill')
      );
    });
    
    it('should apply material to created cube when specified', async () => {
      await adapter.executeCommandViaObjectModel('blender', 'create_cube', {
        location: [1, 2, 3],
        size: 2,
        material: {
          color: [1, 0, 0],
          metallic: 0.5,
          roughness: 0.2
        }
      });
      
      // Verify getCurrentContext was called to get the active object
      expect(blenderObjectModel.getCurrentContext).toHaveBeenCalled();
      
      // Verify executeCode was called to apply the material
      expect(blenderObjectModel.executeCode).toHaveBeenCalledWith(
        expect.stringContaining('mat.node_tree.nodes.get("Principled BSDF")')
      );
    });
    
    it('should execute a Blender sphere creation command', async () => {
      await adapter.executeCommandViaObjectModel('blender', 'create_sphere', {
        location: [1, 2, 3],
        radius: 2,
        segments: 32,
        rings: 16
      });
      
      expect(blenderObjectModel.invokeMethod).toHaveBeenCalledWith(
        'bpy.ops.mesh',
        'primitive_uv_sphere_add',
        [expect.objectContaining({ 
          location: [1, 2, 3],
          radius: 2,
          segments: 32,
          ring_count: 16
        })]
      );
    });
    
    it('should execute a Blender select objects command', async () => {
      await adapter.executeCommandViaObjectModel('blender', 'select_objects', {
        type: 'MESH'
      });
      
      expect(blenderObjectModel.executeCode).toHaveBeenCalledWith(
        expect.stringContaining('obj.type == "MESH"')
      );
    });
    
    it('should execute a CorelDRAW ellipse creation command', async () => {
      await adapter.executeCommandViaObjectModel('coreldraw', 'create_ellipse', {
        x: 100,
        y: 100,
        width: 200,
        height: 200
      });
      
      expect(corelDrawObjectModel.invokeMethod).toHaveBeenCalledWith(
        'Application.ActiveDocument.ActivePage',
        'CreateEllipse',
        [100, 100, 200, 200]
      );
    });
    
    it('should fall back to command factory for unknown actions', async () => {
      commandFactory.executeCommand.mockResolvedValue({
        success: true,
        output: 'Command executed via factory',
        error: null
      });
      
      await adapter.executeCommandViaObjectModel('blender', 'unknown_action', {
        param1: 'value1'
      });
      
      expect(commandFactory.executeCommand).toHaveBeenCalledWith(
        'blender',
        'unknown_action',
        { param1: 'value1' }
      );
    });
    
    it('should fall back to command factory when object model execution fails', async () => {
      // Make the object model fail
      blenderObjectModel.invokeMethod.mockRejectedValue(new Error('Model failure'));
      
      // Set up command factory to succeed
      commandFactory.executeCommand.mockResolvedValue({
        success: true,
        output: 'Command executed via factory',
        error: null
      });
      
      const result = await adapter.executeCommandViaObjectModel('blender', 'create_cube', {});
      
      // Verify command factory was called as fallback
      expect(commandFactory.executeCommand).toHaveBeenCalledWith(
        'blender',
        'create_cube',
        {}
      );
      expect(result.success).toBe(true);
    });
    
    it('should throw error for unsupported platform', async () => {
      await expect(
        adapter.executeCommandViaObjectModel('unsupported' as any, 'create_rectangle', {})
      ).rejects.toThrow('Unsupported platform: unsupported');
    });
  });
}); 