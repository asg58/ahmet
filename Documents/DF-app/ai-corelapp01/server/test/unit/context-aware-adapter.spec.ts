import { Test, TestingModule } from '@nestjs/testing';
import { ContextAwareCommandAdapter } from '../../src/software/universal/context-aware-adapter';
import { CommandFactoryService } from '../../src/software/commands/command-factory.service';
import { BlenderContextAnalyzer } from '../../src/software/context/blender-context';
import { CorelContextAnalyzer } from '../../src/software/context/corel-context';
import { ContextAwareQueryService } from '../../src/software/context/context-aware-query.service';
import { BlenderObjectModel } from '../../src/software/universal/blender-object-model';
import { CorelDrawObjectModel } from '../../src/software/universal/coreldraw-object-model';
import { Logger } from '@nestjs/common';
import { DesignContext } from '../../src/software/context/design-context';

describe('ContextAwareCommandAdapter', () => {
  let adapter: ContextAwareCommandAdapter;
  let commandFactory: CommandFactoryService;
  let blenderObjectModel: BlenderObjectModel;
  let corelDrawObjectModel: CorelDrawObjectModel;
  let blenderContextAnalyzer: BlenderContextAnalyzer;
  let corelContextAnalyzer: CorelContextAnalyzer;
  let contextAwareQueryService: ContextAwareQueryService;

  const mockBlenderContext: DesignContext = {
    documentId: 'test-blender',
    documentName: 'test.blend',
    documentPath: 'bpy.data',
    platform: 'blender',
    size: { width: 1920, height: 1080, depth: 10 },
    currentFrame: 1,
    layers: [
      {
        id: 'collection1',
        name: 'Collection',
        objectPath: 'bpy.data.collections["Collection"]',
        visible: true,
        locked: false,
        elements: [
          {
            id: 'cube1',
            name: 'Cube',
            type: 'MESH',
            objectPath: 'bpy.data.objects["Cube"]',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 2, height: 2, depth: 2 },
            properties: {
              material: 'Material',
              visible: true,
              selected: true
            }
          }
        ]
      }
    ],
    selectedElements: [
      {
        id: 'cube1',
        name: 'Cube',
        type: 'MESH',
        objectPath: 'bpy.data.objects["Cube"]',
        position: { x: 0, y: 0, z: 0 },
        size: { width: 2, height: 2, depth: 2 },
        properties: {
          material: 'Material',
          visible: true,
          selected: true
        }
      }
    ],
    viewTransform: {
      zoom: 1,
      panX: 0,
      panY: 0
    }
  };

  const mockCorelContext: DesignContext = {
    documentId: 'test-corel',
    documentName: 'test.cdr',
    documentPath: 'ActiveDocument',
    platform: 'coreldraw',
    size: { width: 800, height: 600, depth: 0 },
    currentFrame: 0,
    layers: [
      {
        id: 'layer1',
        name: 'Layer 1',
        objectPath: 'ActiveDocument.Layers["Layer 1"]',
        visible: true,
        locked: false,
        elements: [
          {
            id: 'rect1',
            name: 'Rectangle 1',
            type: 'Rectangle',
            objectPath: 'ActiveDocument.Shapes["Rectangle 1"]',
            position: { x: 100, y: 100 },
            size: { width: 200, height: 150 },
            color: { r: 255, g: 0, b: 0, a: 1 },
            properties: {
              visible: true,
              selected: true
            }
          }
        ]
      }
    ],
    selectedElements: [
      {
        id: 'rect1',
        name: 'Rectangle 1',
        type: 'Rectangle',
        objectPath: 'ActiveDocument.Shapes["Rectangle 1"]',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 150 },
        color: { r: 255, g: 0, b: 0, a: 1 },
        properties: {
          visible: true,
          selected: true
        }
      }
    ],
    viewTransform: {
      zoom: 1,
      panX: 0,
      panY: 0
    }
  };

  beforeEach(async () => {
    // Create mocks
    const commandFactoryMock = {
      executeCommand: jest.fn().mockImplementation((platform, action, params) => {
        return Promise.resolve({
          success: true,
          output: `Executed ${action} on ${platform}`,
          data: { result: 'success' }
        });
      })
    };

    const blenderObjectModelMock = {
      invokeMethod: jest.fn().mockResolvedValue({ success: true, returnValue: 'bpy.data.objects["New Object"]' }),
      executeCode: jest.fn().mockResolvedValue({ success: true }),
      getCurrentContext: jest.fn().mockResolvedValue({
        documentPath: 'bpy.data',
        selectedObjects: ['bpy.data.objects["Cube"]']
      })
    };

    const corelDrawObjectModelMock = {
      invokeMethod: jest.fn().mockResolvedValue({ success: true, returnValue: 'ActiveDocument.Shapes["New Rectangle"]' }),
      executeCode: jest.fn().mockResolvedValue({ success: true }),
      getCurrentContext: jest.fn().mockResolvedValue({
        documentPath: 'ActiveDocument',
        selectedObjects: ['ActiveDocument.Shapes["Rectangle 1"]']
      })
    };

    const blenderContextAnalyzerMock = {
      captureContext: jest.fn().mockResolvedValue(mockBlenderContext),
      contextToDescription: jest.fn().mockReturnValue('Blender context description')
    };

    const corelContextAnalyzerMock = {
      captureContext: jest.fn().mockResolvedValue(mockCorelContext),
      contextToDescription: jest.fn().mockReturnValue('CorelDRAW context description')
    };

    const contextAwareQueryServiceMock = {
      enhanceQueryWithContext: jest.fn().mockImplementation((query, context) => {
        return `${query} with context ${context.platform}`;
      }),
      buildPromptWithContext: jest.fn().mockImplementation((prompt, context) => {
        return [{ role: 'system', content: `${prompt} with ${context.platform} context` }];
      })
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextAwareCommandAdapter,
        { provide: CommandFactoryService, useValue: commandFactoryMock },
        { provide: BlenderObjectModel, useValue: blenderObjectModelMock },
        { provide: CorelDrawObjectModel, useValue: corelDrawObjectModelMock },
        { provide: BlenderContextAnalyzer, useValue: blenderContextAnalyzerMock },
        { provide: CorelContextAnalyzer, useValue: corelContextAnalyzerMock },
        { provide: ContextAwareQueryService, useValue: contextAwareQueryServiceMock },
      ],
    })
      .setLogger(new Logger())
      .compile();

    adapter = module.get<ContextAwareCommandAdapter>(ContextAwareCommandAdapter);
    commandFactory = module.get<CommandFactoryService>(CommandFactoryService);
    blenderObjectModel = module.get<BlenderObjectModel>(BlenderObjectModel);
    corelDrawObjectModel = module.get<CorelDrawObjectModel>(CorelDrawObjectModel);
    blenderContextAnalyzer = module.get<BlenderContextAnalyzer>(BlenderContextAnalyzer);
    corelContextAnalyzer = module.get<CorelContextAnalyzer>(CorelContextAnalyzer);
    contextAwareQueryService = module.get<ContextAwareQueryService>(ContextAwareQueryService);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('executeContextAwareCommand', () => {
    it('should execute a CorelDRAW command with enhanced parameters', async () => {
      const result = await adapter.executeContextAwareCommand(
        'coreldraw', 
        'create_rectangle', 
        { width: 100, height: 80 }
      );

      // Verify that context was captured
      expect(corelContextAnalyzer.captureContext).toHaveBeenCalled();
      
      // Method should have been called on the parent class (mocked)
      expect(corelDrawObjectModel.invokeMethod).toHaveBeenCalled();
      
      // Should succeed
      expect(result.success).toBeTruthy();
    });

    it('should execute a Blender command with enhanced parameters', async () => {
      const result = await adapter.executeContextAwareCommand(
        'blender', 
        'create_cube', 
        { size: 2 }
      );

      // Verify that context was captured
      expect(blenderContextAnalyzer.captureContext).toHaveBeenCalled();
      
      // Method should have been called on the parent class (mocked)
      expect(blenderObjectModel.invokeMethod).toHaveBeenCalled();
      
      // Should succeed
      expect(result.success).toBeTruthy();
    });

    it('should handle errors and fall back to parent class execution', async () => {
      // Mock the context analyzer to throw an error
      jest.spyOn(blenderContextAnalyzer, 'captureContext').mockRejectedValueOnce(new Error('Context error'));
      
      // Call should not fail, but fall back to parent class
      const result = await adapter.executeContextAwareCommand(
        'blender', 
        'create_cube', 
        { size: 2 }
      );
      
      // Should still succeed using the fallback mechanism
      expect(result.success).toBeTruthy();
    });
  });

  describe('enhanceParamsWithContext', () => {
    it('should add smart positioning for creation actions without explicit position', async () => {
      // Access the private method using any type
      const enhancedParams = await (adapter as any).enhanceParamsWithContext(
        'create_rectangle', 
        { width: 100, height: 80 }, 
        mockCorelContext
      );

      // Should have added x, y coordinates based on context
      expect(enhancedParams.x).toBeDefined();
      expect(enhancedParams.y).toBeDefined();
      
      // Should not modify explicitly provided parameters
      expect(enhancedParams.width).toBe(100);
      expect(enhancedParams.height).toBe(80);
    });

    it('should apply style consistency from selected elements', async () => {
      // Access the private method using any type
      const enhancedParams = await (adapter as any).enhanceParamsWithContext(
        'create_rectangle', 
        { width: 100, height: 80 }, 
        mockCorelContext
      );

      // Should copy fillColor from selected element in context
      expect(enhancedParams.fillColor).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    });
  });
}); 