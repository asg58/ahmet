import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContextAnalyzerService } from '../../src/context/context-analyzer.service';
import { CorelDrawContextTracker } from '../../src/context/coreldraw-context-tracker';
import { BlenderContextTracker } from '../../src/context/blender-context-tracker';
import { ChromaService } from '../../src/chroma/chroma.service';
import { DesignContext } from '../../src/context/context-tracker.interface';

describe('ContextAnalyzerService', () => {
  let service: ContextAnalyzerService;
  let corelDrawTracker: jest.Mocked<CorelDrawContextTracker>;
  let blenderTracker: jest.Mocked<BlenderContextTracker>;
  let chromaService: jest.Mocked<ChromaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockCorelDrawContext: DesignContext = {
    platform: 'coreldraw',
    timestamp: Date.now(),
    documentProperties: {
      name: 'Test Document',
      width: 800,
      height: 600,
      pages: 1
    },
    selectedObjects: ['Rectangle1', 'Ellipse2'],
    activeLayer: 'Layer1',
    viewProperties: {
      zoom: 1.5,
      viewportCenter: [400, 300],
      visibleObjects: ['Rectangle1', 'Ellipse2', 'Text3']
    }
  };

  const mockBlenderContext: DesignContext = {
    platform: 'blender',
    timestamp: Date.now(),
    documentProperties: {
      name: 'Test Scene',
      frame_current: 1,
      frame_start: 1,
      frame_end: 250,
      render_engine: 'CYCLES',
      object_counts: {
        mesh: 3,
        light: 1,
        camera: 1
      }
    },
    selectedObjects: ['Cube', 'Light'],
    activeLayer: 'Scene',
    viewProperties: {
      zoom: 1.0,
      viewportCenter: [0, 0],
      visibleObjects: ['Cube', 'Light', 'Camera']
    }
  };

  beforeEach(async () => {
    // Create mocks
    corelDrawTracker = {
      startTracking: jest.fn().mockResolvedValue(undefined),
      stopTracking: jest.fn().mockResolvedValue(undefined),
      getCurrentContext: jest.fn().mockResolvedValue(mockCorelDrawContext),
      onContextUpdate: jest.fn(),
      captureScreenshot: jest.fn().mockResolvedValue({ data: 'base64data', format: 'png' })
    } as any;

    blenderTracker = {
      startTracking: jest.fn().mockResolvedValue(undefined),
      stopTracking: jest.fn().mockResolvedValue(undefined),
      getCurrentContext: jest.fn().mockResolvedValue(mockBlenderContext),
      onContextUpdate: jest.fn(),
      captureScreenshot: jest.fn().mockResolvedValue({ data: 'base64data', format: 'png' })
    } as any;

    chromaService = {
      queryCollection: jest.fn().mockResolvedValue([
        { metadata: { title: 'Doc 1', source: 'CorelDRAW API' }, distance: 0.8 },
        { metadata: { title: 'Doc 2', source: 'Blender Python API' }, distance: 0.7 }
      ])
    } as any;

    eventEmitter = {
      on: jest.fn(),
      emit: jest.fn()
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextAnalyzerService,
        { provide: CorelDrawContextTracker, useValue: corelDrawTracker },
        { provide: BlenderContextTracker, useValue: blenderTracker },
        { provide: ChromaService, useValue: chromaService },
        { provide: EventEmitter2, useValue: eventEmitter }
      ],
    }).compile();

    service = module.get<ContextAnalyzerService>(ContextAnalyzerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startTracking', () => {
    it('should start tracking CorelDRAW context', async () => {
      await service.startTracking('coreldraw');
      expect(corelDrawTracker.startTracking).toHaveBeenCalled();
      expect(service.getActiveTracker()).toBe('coreldraw');
    });

    it('should start tracking Blender context', async () => {
      await service.startTracking('blender');
      expect(blenderTracker.startTracking).toHaveBeenCalled();
      expect(service.getActiveTracker()).toBe('blender');
    });

    it('should stop previous tracking before starting new one', async () => {
      await service.startTracking('coreldraw');
      await service.startTracking('blender');
      
      expect(corelDrawTracker.stopTracking).toHaveBeenCalled();
      expect(blenderTracker.startTracking).toHaveBeenCalled();
      expect(service.getActiveTracker()).toBe('blender');
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking CorelDRAW context', async () => {
      await service.startTracking('coreldraw');
      await service.stopTracking();
      
      expect(corelDrawTracker.stopTracking).toHaveBeenCalled();
      expect(service.getActiveTracker()).toBeNull();
    });

    it('should stop tracking Blender context', async () => {
      await service.startTracking('blender');
      await service.stopTracking();
      
      expect(blenderTracker.stopTracking).toHaveBeenCalled();
      expect(service.getActiveTracker()).toBeNull();
    });
  });

  describe('analyzeCurrentContext', () => {
    it('should analyze CorelDRAW context', async () => {
      await service.startTracking('coreldraw');
      const result = await service.analyzeCurrentContext();
      
      expect(corelDrawTracker.getCurrentContext).toHaveBeenCalled();
      expect(result.context).toEqual(mockCorelDrawContext);
      expect(result.relevantDocumentation.length).toBeGreaterThan(0);
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should analyze Blender context', async () => {
      await service.startTracking('blender');
      const result = await service.analyzeCurrentContext();
      
      expect(blenderTracker.getCurrentContext).toHaveBeenCalled();
      expect(result.context).toEqual(mockBlenderContext);
      expect(result.relevantDocumentation.length).toBeGreaterThan(0);
      expect(result.suggestedActions.length).toBeGreaterThan(0);
    });

    it('should throw error when no active tracker', async () => {
      await expect(service.analyzeCurrentContext()).rejects.toThrow('No active context tracker');
    });
  });

  describe('captureScreenshot', () => {
    it('should capture CorelDRAW screenshot', async () => {
      await service.startTracking('coreldraw');
      const screenshot = await service.captureScreenshot();
      
      expect(corelDrawTracker.captureScreenshot).toHaveBeenCalled();
      expect(screenshot.data).toBe('base64data');
      expect(screenshot.format).toBe('png');
    });

    it('should capture Blender screenshot', async () => {
      await service.startTracking('blender');
      const screenshot = await service.captureScreenshot();
      
      expect(blenderTracker.captureScreenshot).toHaveBeenCalled();
      expect(screenshot.data).toBe('base64data');
      expect(screenshot.format).toBe('png');
    });

    it('should throw error when no active tracker', async () => {
      await expect(service.captureScreenshot()).rejects.toThrow('No active context tracker');
    });
  });

  describe('context updates', () => {
    it('should handle context updates and emit analyzed result', async () => {
      // Simulate update from coreldraw tracker
      const updateHandler = eventEmitter.on.mock.calls.find(
        call => call[0] === 'context.updated'
      )[1];
      
      await updateHandler({
        type: 'full',
        context: mockCorelDrawContext,
        changeDescription: 'Test update'
      });
      
      expect(eventEmitter.emit).toHaveBeenCalledWith('context.analyzed', expect.any(Object));
    });
  });
}); 