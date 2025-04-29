import { Test, TestingModule } from '@nestjs/testing';
import { SoftwareService } from '../../src/software/software.service';
import { CommandFactoryService } from '../../src/software/commands/command-factory.service';
import { ObjectModelCommandAdapter } from '../../src/software/universal/object-model-command-adapter';
import { BlenderService } from '../../src/software/blender.service';
import { CorelDrawService } from '../../src/software/coreldraw.service';
import { CorelContextAnalyzer } from '../../src/software/context/corel-context';
import { BlenderContextAnalyzer } from '../../src/software/context/blender-context';
import { OllamaService } from '../../src/ollama/ollama.service';
import { ContextAwareQueryService } from '../../src/software/context/context-aware-query.service';
import { Logger } from '@nestjs/common';

describe('SoftwareService', () => {
  let service: SoftwareService;
  let commandFactory: jest.Mocked<CommandFactoryService>;
  let objectModelAdapter: jest.Mocked<ObjectModelCommandAdapter>;
  let blenderService: jest.Mocked<BlenderService>;
  let corelDrawService: jest.Mocked<CorelDrawService>;
  let corelContextAnalyzer: jest.Mocked<CorelContextAnalyzer>;
  let blenderContextAnalyzer: jest.Mocked<BlenderContextAnalyzer>;
  let ollamaService: jest.Mocked<OllamaService>;
  
  beforeEach(async () => {
    // Create mock implementations
    const mockCommandFactory = {
      executeCommand: jest.fn(),
      executeCorelDrawAction: jest.fn(),
      executeBlenderAction: jest.fn(),
      getAvailableCommands: jest.fn()
    };
    
    const mockObjectModelAdapter = {
      executeCommandViaObjectModel: jest.fn()
    };
    
    const mockBlenderService = {
      executeCode: jest.fn(),
      getStatus: jest.fn().mockResolvedValue({ connected: true, version: 'Test Blender' })
    };
    
    const mockCorelDrawService = {
      executeCode: jest.fn(),
      getStatus: jest.fn().mockResolvedValue({ connected: true, version: 'Test CorelDRAW' })
    };
    
    const mockContext = {
      documentId: 'test-doc',
      documentName: 'test.cdr',
      platform: 'coreldraw',
      selectedElements: [],
      layers: [],
      size: { width: 100, height: 100 },
      viewTransform: { zoom: 1, panX: 0, panY: 0 },
      statistics: { totalElements: 0, elementsByType: {}, documentComplexity: 'simple' },
      actionHistory: []
    };
    
    const mockCorelContextAnalyzer = {
      captureContext: jest.fn().mockResolvedValue({ ...mockContext, platform: 'coreldraw' })
    };
    
    const mockBlenderContextAnalyzer = {
      captureContext: jest.fn().mockResolvedValue({ ...mockContext, platform: 'blender' })
    };
    
    const mockOllamaService = {
      chatCompletion: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'generated code' } }]
      })
    };
    
    const mockContextAwareQueryService = {
      calculateDocumentStats: jest.fn().mockReturnValue({
        totalElements: 0,
        elementsByType: {},
        documentComplexity: 'simple'
      }),
      buildPromptWithContext: jest.fn().mockImplementation((basePrompt, context, userPrompt) => {
        return [...userPrompt, { role: 'system', content: 'Context added' }];
      }),
      enhanceQueryWithContext: jest.fn()
    };
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SoftwareService,
        {
          provide: CommandFactoryService,
          useValue: mockCommandFactory
        },
        {
          provide: ObjectModelCommandAdapter,
          useValue: mockObjectModelAdapter
        },
        {
          provide: BlenderService,
          useValue: mockBlenderService
        },
        {
          provide: CorelDrawService,
          useValue: mockCorelDrawService
        },
        {
          provide: CorelContextAnalyzer,
          useValue: mockCorelContextAnalyzer
        },
        {
          provide: BlenderContextAnalyzer,
          useValue: mockBlenderContextAnalyzer
        },
        {
          provide: OllamaService,
          useValue: mockOllamaService
        },
        {
          provide: ContextAwareQueryService,
          useValue: mockContextAwareQueryService
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
          }
        }
      ]
    }).compile();
    
    service = module.get<SoftwareService>(SoftwareService);
    commandFactory = module.get(CommandFactoryService) as jest.Mocked<CommandFactoryService>;
    objectModelAdapter = module.get(ObjectModelCommandAdapter) as jest.Mocked<ObjectModelCommandAdapter>;
    blenderService = module.get(BlenderService) as jest.Mocked<BlenderService>;
    corelDrawService = module.get(CorelDrawService) as jest.Mocked<CorelDrawService>;
    corelContextAnalyzer = module.get(CorelContextAnalyzer) as jest.Mocked<CorelContextAnalyzer>;
    blenderContextAnalyzer = module.get(BlenderContextAnalyzer) as jest.Mocked<BlenderContextAnalyzer>;
    ollamaService = module.get(OllamaService) as jest.Mocked<OllamaService>;
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
  
  describe('getAvailablePlatforms', () => {
    it('should return available platforms', async () => {
      const result = await service.getAvailablePlatforms();
      
      expect(result).toEqual({
        coreldraw: true,
        blender: true
      });
    });
    
    it('should handle platform errors', async () => {
      corelDrawService.getStatus.mockRejectedValueOnce(new Error('Connection error'));
      
      const result = await service.getAvailablePlatforms();
      
      expect(result).toEqual({
        coreldraw: false,
        blender: true
      });
    });
  });
  
  describe('executeCommand', () => {
    it('should execute commands on CorelDRAW', async () => {
      corelDrawService.executeCode.mockResolvedValueOnce({ success: true, output: 'Command executed' });
      
      const result = await service.executeCommand('coreldraw', 'test command');
      
      expect(corelDrawService.executeCode).toHaveBeenCalledWith('test command', {});
      expect(result).toEqual({ success: true, output: 'Command executed' });
    });
    
    it('should execute commands on Blender', async () => {
      blenderService.executeCode.mockResolvedValueOnce({ success: true, output: 'Command executed' });
      
      const result = await service.executeCommand('blender', 'test command');
      
      expect(blenderService.executeCode).toHaveBeenCalledWith('test command', {});
      expect(result).toEqual({ success: true, output: 'Command executed' });
    });
    
    it('should throw error for unsupported platform', async () => {
      await expect(
        service.executeCommand('unsupported' as any, 'test command')
      ).rejects.toThrow('Unsupported platform: unsupported');
    });
  });
  
  describe('getDesignContext', () => {
    it('should get CorelDRAW context', async () => {
      const result = await service.getDesignContext('coreldraw');
      
      expect(corelContextAnalyzer.captureContext).toHaveBeenCalled();
      expect(result.platform).toBe('coreldraw');
    });
    
    it('should get Blender context', async () => {
      const result = await service.getDesignContext('blender');
      
      expect(blenderContextAnalyzer.captureContext).toHaveBeenCalled();
      expect(result.platform).toBe('blender');
    });
  });
  
  describe('executeAction', () => {
    it('should try object model adapter first', async () => {
      objectModelAdapter.executeCommandViaObjectModel.mockResolvedValueOnce({
        success: true,
        output: 'Command executed via object model'
      });
      
      const result = await service.executeAction(
        'coreldraw',
        'create_rectangle',
        { width: 200, height: 150 },
        []
      );
      
      expect(objectModelAdapter.executeCommandViaObjectModel).toHaveBeenCalledWith(
        'coreldraw',
        'create_rectangle',
        { width: 200, height: 150 }
      );
      expect(result.success).toBe(true);
      expect(result.output).toBe('Command executed via object model');
      
      // Verify command factory was not called
      expect(commandFactory.executeCommand).not.toHaveBeenCalled();
      expect(corelDrawService.executeCode).not.toHaveBeenCalled();
    });
    
    it('should fall back to command factory if object model fails', async () => {
      // Make object model fail
      objectModelAdapter.executeCommandViaObjectModel.mockRejectedValueOnce(
        new Error('Object model failed')
      );
      
      // Make command factory succeed
      commandFactory.executeCommand.mockResolvedValueOnce({
        success: true,
        output: 'Command executed via factory'
      });
      
      const result = await service.executeAction(
        'coreldraw',
        'create_rectangle',
        { width: 200, height: 150 },
        []
      );
      
      expect(commandFactory.executeCommand).toHaveBeenCalledWith(
        'coreldraw',
        'create_rectangle',
        { width: 200, height: 150 }
      );
      expect(result.success).toBe(true);
      expect(result.output).toBe('Command executed via factory');
      
      // Verify code generation was not used
      expect(ollamaService.chatCompletion).not.toHaveBeenCalled();
    });
    
    it('should fall back to code generation if both previous methods fail', async () => {
      // Make object model fail
      objectModelAdapter.executeCommandViaObjectModel.mockRejectedValueOnce(
        new Error('Object model failed')
      );
      
      // Make command factory fail with an unknown command error
      commandFactory.executeCommand.mockResolvedValueOnce({
        success: false,
        error: 'Unknown CorelDRAW action: create_custom_action'
      });
      
      // Setup code generation response
      ollamaService.chatCompletion.mockResolvedValueOnce({
        choices: [{ message: { content: '```vba\ngenerated VBA code\n```' } }]
      });
      
      // Setup code execution response
      corelDrawService.executeCode.mockResolvedValueOnce({
        success: true,
        output: 'Generated code executed successfully'
      });
      
      const result = await service.executeAction(
        'coreldraw',
        'create_custom_action',
        { custom: true },
        []
      );
      
      // Verify code generation was used
      expect(ollamaService.chatCompletion).toHaveBeenCalled();
      expect(corelDrawService.executeCode).toHaveBeenCalledWith('generated VBA code');
      
      expect(result.success).toBe(true);
      expect(result.output).toBe('Generated code executed successfully');
    });
    
    it('should record actions in history', async () => {
      objectModelAdapter.executeCommandViaObjectModel.mockResolvedValueOnce({
        success: true,
        output: 'Command executed'
      });
      
      await service.executeAction('coreldraw', 'create_rectangle', {}, []);
      
      // Execute a second action to verify history is maintained
      objectModelAdapter.executeCommandViaObjectModel.mockResolvedValueOnce({
        success: true,
        output: 'Second command executed'
      });
      
      await service.executeAction('coreldraw', 'create_ellipse', {}, []);
      
      // Get context to verify action history
      const context = await service.getDesignContext('coreldraw');
      
      expect(context.actionHistory.length).toBe(2);
      expect(context.actionHistory[0].type).toBe('create_rectangle');
      expect(context.actionHistory[1].type).toBe('create_ellipse');
    });
  });
}); 