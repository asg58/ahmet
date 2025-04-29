import { Test } from '@nestjs/testing';
import { INestApplication, HttpStatus } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { SoftwareService } from '../../src/software/software.service';
import { BlenderService } from '../../src/software/blender.service';
import { CorelDrawService } from '../../src/software/coreldraw.service';

describe('Context-Aware Actions (e2e)', () => {
  let app: INestApplication;
  let softwareService: SoftwareService;
  let blenderService: BlenderService;
  let corelDrawService: CorelDrawService;

  // Mock services for testing
  const mockBlenderService = {
    getStatus: jest.fn().mockResolvedValue({ connected: true, version: 'Test Blender v1.0' }),
    executeCode: jest.fn().mockResolvedValue({ 
      success: true, 
      output: 'Cube created successfully',
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
      output: 'Rectangle created successfully'
    })
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
    blenderService = moduleFixture.get<BlenderService>(BlenderService);
    corelDrawService = moduleFixture.get<CorelDrawService>(CorelDrawService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Context-aware action execution', () => {
    it('should execute an action with context awareness for Blender', async () => {
      // Mock context data
      jest.spyOn(softwareService, 'getDesignContext').mockResolvedValue({
        documentId: 'test-doc-1',
        documentName: 'test-scene.blend',
        documentPath: 'Scene',
        platform: 'blender',
        size: { width: 1920, height: 1080 },
        layers: [],
        selectedElements: [
          {
            id: 'cube-1',
            name: 'Cube',
            type: 'MESH',
            objectPath: 'bpy.data.objects["Cube"]',
            position: { x: 0, y: 0, z: 0 },
            properties: {}
          }
        ],
        viewTransform: {
          zoom: 1,
          panX: 0,
          panY: 0
        },
        statistics: {
          totalElements: 5,
          elementsByType: { 'MESH': 3, 'CAMERA': 1, 'LIGHT': 1 },
          documentComplexity: 'simple'
        }
      } as any);

      const response = await request(app.getHttpServer())
        .post('/api/software/blender/action')
        .send({
          action: 'create_sphere',
          parameters: {
            location: [1, 2, 3],
            radius: 2,
          },
          conversationContext: [
            { role: 'user', content: 'Create a sphere near the existing cube' }
          ]
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('success', true);
      expect(mockBlenderService.executeCode).toHaveBeenCalled();
    });

    it('should execute an action with context awareness for CorelDRAW', async () => {
      // Mock context data
      jest.spyOn(softwareService, 'getDesignContext').mockResolvedValue({
        documentId: 'test-doc-2',
        documentName: 'test-drawing.cdr',
        documentPath: 'Document',
        platform: 'coreldraw',
        size: { width: 800, height: 600 },
        currentPage: 1,
        layers: [],
        selectedElements: [],
        viewTransform: {
          zoom: 1,
          panX: 0,
          panY: 0
        },
        statistics: {
          totalElements: 3,
          elementsByType: { 'Rectangle': 2, 'Ellipse': 1 },
          documentComplexity: 'simple'
        }
      } as any);

      const response = await request(app.getHttpServer())
        .post('/api/software/coreldraw/action')
        .send({
          action: 'create_rectangle',
          parameters: {
            x: 100,
            y: 100,
            width: 200,
            height: 150,
            fill: '#FF0000'
          },
          conversationContext: [
            { role: 'user', content: 'Create a red rectangle' }
          ]
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('success', true);
      expect(mockCorelDrawService.executeCode).toHaveBeenCalled();
    });
  });

  describe('Context retrieval', () => {
    it('should get context description for a platform', async () => {
      jest.spyOn(softwareService, 'getDesignContext').mockResolvedValue({
        documentId: 'test-doc-1',
        documentName: 'test-scene.blend',
        documentPath: 'Scene',
        platform: 'blender',
        size: { width: 1920, height: 1080 },
        layers: [],
        selectedElements: [],
        viewTransform: {
          zoom: 1,
          panX: 0,
          panY: 0
        },
        statistics: {
          totalElements: 5,
          elementsByType: { 'MESH': 3, 'CAMERA': 1, 'LIGHT': 1 },
          documentComplexity: 'simple'
        }
      } as any);

      const response = await request(app.getHttpServer())
        .get('/api/software/context/blender/description')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('platform', 'blender');
      expect(response.body).toHaveProperty('description');
      expect(response.body).toHaveProperty('statistics');
    });

    it('should enhance a query with context information', async () => {
      jest.spyOn(softwareService, 'getDesignContext').mockResolvedValue({
        documentId: 'test-doc-1',
        documentName: 'test-scene.blend',
        documentPath: 'Scene',
        platform: 'blender',
        size: { width: 1920, height: 1080 },
        layers: [],
        selectedElements: [
          {
            id: 'cube-1',
            name: 'Cube',
            type: 'MESH',
            objectPath: 'bpy.data.objects["Cube"]',
            position: { x: 0, y: 0, z: 0 },
            properties: {}
          }
        ],
        viewTransform: {
          zoom: 1,
          panX: 0,
          panY: 0
        }
      } as any);

      const response = await request(app.getHttpServer())
        .post('/api/software/blender/context-query')
        .send({
          query: 'make it bigger'
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('originalQuery', 'make it bigger');
      expect(response.body).toHaveProperty('enhancedQuery');
      expect(response.body.enhancedQuery).toContain('blender');
      expect(response.body.enhancedQuery).toContain('mesh');
    });
  });
}); 