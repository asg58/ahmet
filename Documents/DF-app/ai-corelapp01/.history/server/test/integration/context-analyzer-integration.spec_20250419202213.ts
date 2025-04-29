import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ContextAnalyzerService } from '../../src/context/context-analyzer.service';
import { CorelDrawContextTracker } from '../../src/context/coreldraw-context-tracker';
import { BlenderContextTracker } from '../../src/context/blender-context-tracker';
import { ChromaService } from '../../src/chroma/chroma.service';
import { CorelDrawObjectModel } from '../../src/software/universal/coreldraw-object-model';
import { BlenderObjectModel } from '../../src/software/universal/blender-object-model';
import { CorelDrawService } from '../../src/software/coreldraw.service';
import { BlenderService } from '../../src/software/blender.service';
import { ContextModule } from '../../src/context/context.module';
import { SoftwareModule } from '../../src/software/software.module';
import { DatabaseModule } from '../../src/database/database.module';

describe('ContextAnalyzerService Integration', () => {
  let service: ContextAnalyzerService;
  let corelDrawObjectModel: CorelDrawObjectModel;
  let blenderObjectModel: BlenderObjectModel;
  let corelDrawService: CorelDrawService;
  let blenderService: BlenderService;
  let eventEmitter: EventEmitter2;

  // Mock the CorelDRAW and Blender services
  const mockCorelDrawService = {
    executeCode: jest.fn().mockResolvedValue({
      success: true,
      output: JSON.stringify({
        name: 'IntegrationTest.cdr',
        pages: 2,
        width: 800,
        height: 600,
        zoom: 1.2,
        center: [400, 300]
      })
    }),
    executeCommand: jest.fn().mockResolvedValue({
      success: true,
      output: 'Command executed successfully'
    }),
    getStatus: jest.fn().mockResolvedValue({
      connected: true,
      version: '2023'
    })
  };

  const mockBlenderService = {
    executeCode: jest.fn().mockResolvedValue({
      success: true,
      output: JSON.stringify({
        name: 'IntegrationTest.blend',
        frame_current: 1,
        frame_start: 1,
        frame_end: 250,
        render_engine: 'CYCLES',
        view: { zoom: 1.0 },
        selected_objects: ['Cube', 'Light'],
        active_object: 'Cube',
        object_counts: {
          mesh: 3,
          camera: 1,
          light: 1
        }
      })
    }),
    executeCommand: jest.fn().mockResolvedValue({
      success: true,
      output: 'Command executed successfully'
    }),
    getStatus: jest.fn().mockResolvedValue({
      connected: true,
      version: '3.6'
    })
  };

  // Mock ChromaService
  const mockChromaService = {
    queryCollection: jest.fn().mockResolvedValue([
      { metadata: { title: 'CorelDRAW API Doc', source: 'CorelDRAW API' }, distance: 0.85 },
      { metadata: { title: 'Blender Python API', source: 'Blender API' }, distance: 0.75 }
    ]),
    ping: jest.fn().mockResolvedValue({ status: 'ok' }),
    addApiDocumentation: jest.fn().mockResolvedValue({ added: true }),
    addConversationMemory: jest.fn().mockResolvedValue({ added: true }),
    queryConversationMemory: jest.fn().mockResolvedValue([])
  };

  // Setup the testing module with real implementations but mocked external services
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        EventEmitterModule.forRoot(),
      ],
      providers: [
        ContextAnalyzerService,
        CorelDrawContextTracker,
        BlenderContextTracker,
        CorelDrawObjectModel,
        BlenderObjectModel,
        { provide: CorelDrawService, useValue: mockCorelDrawService },
        { provide: BlenderService, useValue: mockBlenderService },
        { provide: ChromaService, useValue: mockChromaService }
      ],
    }).compile();

    service = module.get<ContextAnalyzerService>(ContextAnalyzerService);
    corelDrawObjectModel = module.get<CorelDrawObjectModel>(CorelDrawObjectModel);
    blenderObjectModel = module.get<BlenderObjectModel>(BlenderObjectModel);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(corelDrawObjectModel).toBeDefined();
    expect(blenderObjectModel).toBeDefined();
  });

  describe('CorelDRAW Integration', () => {
    beforeEach(async () => {
      // Start tracking for CorelDRAW
      await service.startTracking('coreldraw');
    });

    afterEach(async () => {
      // Stop tracking
      await service.stopTracking();
    });

    it('should analyze CorelDRAW context with object model data', async () => {
      // Analyze context
      const analysisResult = await service.analyzeCurrentContext();
      
      // Verify correct analysis
      expect(analysisResult.context.platform).toBe('coreldraw');
      expect(analysisResult.context.documentProperties.name).toBe('IntegrationTest.cdr');
      expect(analysisResult.relevantDocumentation.length).toBeGreaterThan(0);
      expect(analysisResult.relevantDocumentation[0].title).toBe('CorelDRAW API Doc');
    });

    it('should emit context.analyzed event on context updates', async () => {
      // Listen for events
      const analyzePromise = new Promise<void>(resolve => {
        eventEmitter.on('context.analyzed', (result) => {
          // Verify the analysis result
          expect(result.context.platform).toBe('coreldraw');
          expect(result.dominantElements).toBeDefined();
          expect(result.suggestedActions).toBeDefined();
          resolve();
        });
      });

      // Trigger context update
      eventEmitter.emit('context.updated', {
        type: 'full',
        context: {
          platform: 'coreldraw',
          timestamp: Date.now(),
          documentProperties: {
            name: 'UpdatedTest.cdr'
          },
          selectedObjects: ['Rectangle1'],
          viewProperties: {
            zoom: 1.0,
            viewportCenter: [0, 0],
            visibleObjects: []
          }
        },
        changeDescription: 'Test update'
      });

      // Wait for analysis to complete
      await analyzePromise;
    });
  });

  describe('Blender Integration', () => {
    beforeEach(async () => {
      // Start tracking for Blender
      await service.startTracking('blender');
    });

    afterEach(async () => {
      // Stop tracking
      await service.stopTracking();
    });

    it('should analyze Blender context with object model data', async () => {
      // Analyze context
      const analysisResult = await service.analyzeCurrentContext();
      
      // Verify correct analysis
      expect(analysisResult.context.platform).toBe('blender');
      expect(analysisResult.context.documentProperties.name).toBe('IntegrationTest.blend');
      expect(analysisResult.relevantDocumentation.length).toBeGreaterThan(0);
      expect(analysisResult.relevantDocumentation[1].title).toBe('Blender Python API');
    });

    it('should provide platform-specific suggested actions', async () => {
      // Analyze context
      const analysisResult = await service.analyzeCurrentContext();
      
      // Verify Blender-specific suggestions
      const suggestions = analysisResult.suggestedActions;
      expect(suggestions).toContain(expect.stringMatching(/Edit (?:object|mesh) properties/));
      
      // Based on cube and light selection
      expect(suggestions).toContain(expect.stringMatching(/materials/i));
      expect(suggestions).toContain(expect.stringMatching(/light/i));
    });
  });

  describe('Context-aware search', () => {
    it('should enhance documentations queries with context information', async () => {
      // Start tracking for CorelDRAW
      await service.startTracking('coreldraw');
      
      // Analyze context
      await service.analyzeCurrentContext();
      
      // Verify that ChromaDB was queried with context-enhanced query
      expect(mockChromaService.queryCollection).toHaveBeenCalledWith(
        'coreldraw_docs',
        expect.stringContaining('Platform: coreldraw'),
        expect.any(Number)
      );
    });
  });
}); 