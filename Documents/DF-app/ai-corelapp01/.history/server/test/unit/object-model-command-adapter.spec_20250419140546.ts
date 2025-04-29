import { Test, TestingModule } from '@nestjs/testing';
import { ObjectModelCommandAdapter } from '../../src/software/universal/object-model-command-adapter';
import { UniversalObjectModel } from '../../src/software/universal/universal-object-model';
import { CommandFactoryService } from '../../src/software/commands/command-factory.service';
import { CorelDrawObjectModel } from '../../src/software/universal/coreldraw-object-model';
import { BlenderObjectModel } from '../../src/software/universal/blender-object-model';
import { Logger } from '@nestjs/common';

class MockCorelDrawObjectModel {
  createRectangle = jest.fn();
  createEllipse = jest.fn();
  createText = jest.fn();
  applyFill = jest.fn();
  applyOutline = jest.fn();
  selectObjects = jest.fn();
  groupSelectedObjects = jest.fn();
}

class MockBlenderObjectModel {
  createCube = jest.fn();
  createSphere = jest.fn();
  createText = jest.fn();
  createCylinder = jest.fn();
  createPlane = jest.fn();
  applyMaterial = jest.fn();
  setupLighting = jest.fn();
  renderScene = jest.fn();
  selectObjects = jest.fn();
  getSceneScreenshot = jest.fn();
}

class MockUniversalObjectModel {
  getCorelDrawObjectModel = jest.fn();
  getBlenderObjectModel = jest.fn();
}

class MockCommandFactoryService {
  executeCommand = jest.fn();
  getAvailableCommands = jest.fn();
}

describe('ObjectModelCommandAdapter', () => {
  let adapter: ObjectModelCommandAdapter;
  let universalObjectModel: MockUniversalObjectModel;
  let commandFactory: MockCommandFactoryService;
  let corelDrawObjectModel: MockCorelDrawObjectModel;
  let blenderObjectModel: MockBlenderObjectModel;

  beforeEach(async () => {
    corelDrawObjectModel = new MockCorelDrawObjectModel();
    blenderObjectModel = new MockBlenderObjectModel();
    universalObjectModel = new MockUniversalObjectModel();
    universalObjectModel.getCorelDrawObjectModel.mockReturnValue(corelDrawObjectModel);
    universalObjectModel.getBlenderObjectModel.mockReturnValue(blenderObjectModel);
    
    commandFactory = new MockCommandFactoryService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ObjectModelCommandAdapter,
        {
          provide: UniversalObjectModel,
          useValue: universalObjectModel,
        },
        {
          provide: CommandFactoryService,
          useValue: commandFactory,
        },
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    adapter = module.get<ObjectModelCommandAdapter>(ObjectModelCommandAdapter);
  });

  describe('executeCommandViaObjectModel', () => {
    it('should execute CorelDRAW commands via object model', async () => {
      await adapter.executeCommandViaObjectModel('coreldraw', 'createRectangle', {
        x: 100,
        y: 200,
        width: 300,
        height: 150,
        fillColor: { r: 255, g: 0, b: 0 },
        outlineColor: { r: 0, g: 0, b: 0 },
        outlineWidth: 1
      });

      expect(corelDrawObjectModel.createRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 200,
          width: 300,
          height: 150,
          fillColor: { r: 255, g: 0, b: 0 },
          outlineColor: { r: 0, g: 0, b: 0 },
          outlineWidth: 1
        })
      );
    });

    it('should execute Blender commands via object model', async () => {
      await adapter.executeCommandViaObjectModel('blender', 'createCube', {
        location: [0, 0, 0],
        size: [2, 2, 2],
        material: {
          color: [1, 0, 0],
          metallic: 0,
          roughness: 0.8
        }
      });

      expect(blenderObjectModel.createCube).toHaveBeenCalledWith(
        expect.objectContaining({
          location: [0, 0, 0],
          size: [2, 2, 2],
          material: {
            color: [1, 0, 0],
            metallic: 0,
            roughness: 0.8
          }
        })
      );
    });

    it('should fall back to command factory if command not supported by object model', async () => {
      commandFactory.executeCommand.mockResolvedValue('Command executed via factory');

      const result = await adapter.executeCommandViaObjectModel('coreldraw', 'unsupportedCommand', {
        param1: 'value1',
        param2: 'value2'
      });

      expect(commandFactory.executeCommand).toHaveBeenCalledWith(
        'coreldraw',
        'unsupportedCommand',
        {
          param1: 'value1',
          param2: 'value2'
        }
      );
      expect(result).toBe('Command executed via factory');
    });

    it('should throw error for unsupported platform', async () => {
      await expect(
        adapter.executeCommandViaObjectModel('unsupported', 'createRectangle', {})
      ).rejects.toThrow('Unsupported platform: unsupported');
    });
  });

  describe('executeCorelDrawCommand', () => {
    it('should call createRectangle method', async () => {
      await adapter.executeCorelDrawCommand('createRectangle', {
        x: 100,
        y: 200,
        width: 300,
        height: 150
      });

      expect(corelDrawObjectModel.createRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 200,
          width: 300,
          height: 150
        })
      );
    });

    it('should call createEllipse method', async () => {
      await adapter.executeCorelDrawCommand('createEllipse', {
        x: 150,
        y: 150,
        width: 100,
        height: 100
      });

      expect(corelDrawObjectModel.createEllipse).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 150,
          y: 150,
          width: 100,
          height: 100
        })
      );
    });

    it('should call createText method', async () => {
      await adapter.executeCorelDrawCommand('createText', {
        x: 100,
        y: 100,
        text: 'Hello World',
        font: 'Arial',
        size: 24
      });

      expect(corelDrawObjectModel.createText).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 100,
          y: 100,
          text: 'Hello World',
          font: 'Arial',
          size: 24
        })
      );
    });

    it('should call applyFill method', async () => {
      await adapter.executeCorelDrawCommand('applyFill', {
        color: { r: 255, g: 0, b: 0 },
        transparency: 20
      });

      expect(corelDrawObjectModel.applyFill).toHaveBeenCalledWith(
        expect.objectContaining({
          color: { r: 255, g: 0, b: 0 },
          transparency: 20
        })
      );
    });

    it('should throw error for unsupported command', async () => {
      await expect(
        adapter.executeCorelDrawCommand('unsupportedCommand', {})
      ).rejects.toThrow('Unsupported CorelDRAW command: unsupportedCommand');
    });
  });

  describe('executeBlenderCommand', () => {
    it('should call createCube method', async () => {
      await adapter.executeBlenderCommand('createCube', {
        location: [0, 0, 0],
        size: [2, 2, 2]
      });

      expect(blenderObjectModel.createCube).toHaveBeenCalledWith(
        expect.objectContaining({
          location: [0, 0, 0],
          size: [2, 2, 2]
        })
      );
    });

    it('should call createSphere method', async () => {
      await adapter.executeBlenderCommand('createSphere', {
        location: [0, 0, 0],
        radius: 1
      });

      expect(blenderObjectModel.createSphere).toHaveBeenCalledWith(
        expect.objectContaining({
          location: [0, 0, 0],
          radius: 1
        })
      );
    });

    it('should call createText method', async () => {
      await adapter.executeBlenderCommand('createText', {
        text: 'Hello World',
        location: [0, 0, 0]
      });

      expect(blenderObjectModel.createText).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Hello World',
          location: [0, 0, 0]
        })
      );
    });

    it('should call applyMaterial method', async () => {
      await adapter.executeBlenderCommand('applyMaterial', {
        color: [1, 0, 0],
        metallic: 0.5,
        roughness: 0.2
      });

      expect(blenderObjectModel.applyMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          color: [1, 0, 0],
          metallic: 0.5,
          roughness: 0.2
        })
      );
    });

    it('should call setupLighting method', async () => {
      await adapter.executeBlenderCommand('setupLighting', {
        type: 'SUN',
        location: [5, 5, 5],
        energy: 1.5
      });

      expect(blenderObjectModel.setupLighting).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'SUN',
          location: [5, 5, 5],
          energy: 1.5
        })
      );
    });

    it('should call renderScene method', async () => {
      await adapter.executeBlenderCommand('renderScene', {
        resolution: [1920, 1080],
        samples: 64
      });

      expect(blenderObjectModel.renderScene).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution: [1920, 1080],
          samples: 64
        })
      );
    });

    it('should throw error for unsupported command', async () => {
      await expect(
        adapter.executeBlenderCommand('unsupportedCommand', {})
      ).rejects.toThrow('Unsupported Blender command: unsupportedCommand');
    });
  });
}); 