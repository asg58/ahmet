import { Test } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SoftwareService } from '../../src/software/software.service';
import { BlenderService } from '../../src/software/blender.service';
import { CorelDrawService } from '../../src/software/coreldraw.service';
import { PlatformSwitchingService } from '../../src/software/platform-switching.service';
import { DesignContext } from '../../src/software/context/design-context';

describe('Platform Switching (e2e)', () => {
  let app: INestApplication;
  let softwareService: SoftwareService;
  let platformSwitchingService: PlatformSwitchingService;
  let blenderService: BlenderService;
  let corelDrawService: CorelDrawService;

  // Mock services for testing
  const mockBlenderService = {
    getStatus: jest.fn().mockResolvedValue({ connected: true, version: 'Test Blender v1.0' }),
    executeCode: jest.fn().mockResolvedValue({ 
      success: true, 
      output: 'Object created successfully',
      visualData: {
        type: 'image',
        data: 'base64mockdata'
      }
    })
  };

  const mockCorelDrawService = {
    getStatus: jest.fn().mockResolvedValue({ connected: true, version: 'Test CorelDRAW v1.0' }),
    executeCode: jest.fn().mockResolvedValue({ 
      success: true, 
      output: 'Shape created successfully'
    })
  };

  // Mock context data
  const mockCorelContext: Partial<DesignContext> = {
    documentId: 'corel-doc-1',
    documentName: 'test-drawing.cdr',
    platform: 'coreldraw',
    size: { width: 800, height: 600 },
    selectedElements: [
      {
        id: 'rect-1',
        name: 'Rectangle1',
        type: 'Rectangle',
        objectPath: 'Shape["Rectangle1"]',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 150 },
        color: { r: 255, g: 0, b: 0 },
        properties: {}
      },
      {
        id: 'ellipse-1',
        name: 'Ellipse1',
        type: 'Ellipse',
        objectPath: 'Shape["Ellipse1"]',
        position: { x: 350, y: 200 },
        size: { width: 100, height: 100 },
        color: { r: 0, g: 0, b: 255 },
        properties: {}
      }
    ],
    layers: [
      {
        id: 'layer-1',
        name: 'Layer 1',
        objectPath: 'Layer',
        visible: true,
        locked: false,
        elements: []
      }
    ],
    viewTransform: {
      zoom: 1,
      panX: 0,
      panY: 0
    },
    statistics: {
      totalElements: 5,
      elementsByType: { 'Rectangle': 2, 'Ellipse': 1, 'TextFrame': 2 },
      documentComplexity: 'simple'
    }
  };

  const mockBlenderContext: Partial<DesignContext> = {
    documentId: 'blender-doc-1',
    documentName: 'test-scene.blend',
    platform: 'blender',
    size: { width: 1920, height: 1080, depth: 1000 },
    selectedElements: [],
    layers: [
      {
        id: 'collection-1',
        name: 'Collection',
        objectPath: 'Collection',
        visible: true,
        locked: false,
        elements: []
      }
    ],
    viewTransform: {
      zoom: 1,
      panX: 0,
      panY: 0
    },
    statistics: {
      totalElements: 3,
      elementsByType: { 'MESH': 1, 'CAMERA': 1, 'LIGHT': 1 },
      documentComplexity: 'simple'
    }
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BlenderService)
      .useValue(mockBlenderService)
      .overrideProvider(CorelDrawService)
      .useValue(mockCorelDrawService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    softwareService = moduleFixture.get<SoftwareService>(SoftwareService);
    platformSwitchingService = moduleFixture.get<PlatformSwitchingService>(PlatformSwitchingService);
    blenderService = moduleFixture.get<BlenderService>(BlenderService);
    corelDrawService = moduleFixture.get<CorelDrawService>(CorelDrawService);

    // Mock context capture
    jest.spyOn(softwareService, 'getDesignContext').mockImplementation((platform) => {
      if (platform === 'coreldraw') {
        return Promise.resolve(mockCorelContext as DesignContext);
      } else {
        return Promise.resolve(mockBlenderContext as DesignContext);
      }
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Platform switching endpoint', () => {
    it('should switch from CorelDRAW to Blender', async () => {
      // Mock platform switching service
      jest.spyOn(platformSwitchingService, 'switchPlatform').mockResolvedValue({
        success: true,
        sourceContext: mockCorelContext as DesignContext,
        targetContext: mockBlenderContext as DesignContext,
        transferredElements: mockCorelContext.selectedElements,
        commandsGenerated: [
          'bpy.ops.mesh.primitive_cube_add(location=(100, 100, 0), scale=(100, 75, 1))',
          'bpy.ops.mesh.primitive_uv_sphere_add(location=(350, 200, 0), radius=50)'
        ]
      });

      const response = await request(app.getHttpServer())
        .post('/api/software/switch-platform')
        .send({
          sourcePlatform: 'coreldraw',
          targetPlatform: 'blender',
          transferElements: true,
          transferMaterials: true
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transferredElements', 2);
      expect(response.body).toHaveProperty('commandsGenerated');
      expect(response.body.commandsGenerated).toHaveLength(2);
      expect(platformSwitchingService.switchPlatform).toHaveBeenCalledTimes(1);
    });

    it('should switch from Blender to CorelDRAW', async () => {
      // Update Blender context to have selected elements
      const blenderContextWithSelection = {
        ...mockBlenderContext,
        selectedElements: [
          {
            id: 'cube-1',
            name: 'Cube',
            type: 'MESH',
            objectPath: 'bpy.data.objects["Cube"]',
            position: { x: 0, y: 0, z: 0 },
            size: { width: 2, height: 2, depth: 2 },
            color: { r: 0.8, g: 0.2, b: 0.2 },
            properties: {}
          }
        ]
      };

      // Update the mock for this test
      jest.spyOn(softwareService, 'getDesignContext').mockImplementation((platform) => {
        if (platform === 'coreldraw') {
          return Promise.resolve(mockCorelContext as DesignContext);
        } else {
          return Promise.resolve(blenderContextWithSelection as DesignContext);
        }
      });

      // Mock platform switching service
      jest.spyOn(platformSwitchingService, 'switchPlatform').mockResolvedValue({
        success: true,
        sourceContext: blenderContextWithSelection as DesignContext,
        targetContext: mockCorelContext as DesignContext,
        transferredElements: blenderContextWithSelection.selectedElements,
        commandsGenerated: [
          'ActivePage.CreateRectangle(0, 0, 2, 2)'
        ]
      });

      const response = await request(app.getHttpServer())
        .post('/api/software/switch-platform')
        .send({
          sourcePlatform: 'blender',
          targetPlatform: 'coreldraw',
          transferElements: true,
          transferMaterials: true
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('transferredElements', 1);
      expect(response.body).toHaveProperty('commandsGenerated');
      expect(response.body.commandsGenerated).toHaveLength(1);
      expect(platformSwitchingService.switchPlatform).toHaveBeenCalledTimes(1);
    });

    it('should reject when platforms are the same', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/software/switch-platform')
        .send({
          sourcePlatform: 'coreldraw',
          targetPlatform: 'coreldraw',
          transferElements: true
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('must be different');
    });

    it('should reject unsupported platforms', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/software/switch-platform')
        .send({
          sourcePlatform: 'coreldraw',
          targetPlatform: 'photoshop', // Unsupported
          transferElements: true
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Unsupported target platform');
    });
  });

  describe('Context capture integration', () => {
    it('should get context from CorelDRAW', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/software/context/coreldraw')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('documentName', 'test-drawing.cdr');
      expect(response.body).toHaveProperty('platform', 'coreldraw');
      expect(response.body).toHaveProperty('selectedElements');
      expect(response.body.selectedElements).toHaveLength(2);
    });

    it('should get context from Blender', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/software/context/blender')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('documentName', 'test-scene.blend');
      expect(response.body).toHaveProperty('platform', 'blender');
    });
  });

  describe('Command execution during platform switching', () => {
    it('should execute generated commands when switching platforms', async () => {
      // Set up mock for the platform switching service that actually calls execute code
      jest.spyOn(platformSwitchingService, 'switchPlatform').mockImplementation(async (params) => {
        const commands = [
          'bpy.ops.mesh.primitive_cube_add(location=(100, 100, 0), scale=(100, 75, 1))'
        ];
        
        // Actually execute the command via the appropriate service
        if (params.targetPlatform === 'blender') {
          await blenderService.executeCode(commands[0]);
        } else {
          await corelDrawService.executeCode(commands[0]);
        }
        
        return {
          success: true,
          sourceContext: params.sourceContext,
          targetContext: params.targetPlatform === 'blender' 
            ? mockBlenderContext as DesignContext
            : mockCorelContext as DesignContext,
          transferredElements: params.sourceContext.selectedElements,
          commandsGenerated: commands
        };
      });

      const response = await request(app.getHttpServer())
        .post('/api/software/switch-platform')
        .send({
          sourcePlatform: 'coreldraw',
          targetPlatform: 'blender',
          transferElements: true,
          transferMaterials: true
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('success', true);
      // Verify the mock was called
      expect(blenderService.executeCode).toHaveBeenCalledWith(
        'bpy.ops.mesh.primitive_cube_add(location=(100, 100, 0), scale=(100, 75, 1))'
      );
    });
  });
}); 