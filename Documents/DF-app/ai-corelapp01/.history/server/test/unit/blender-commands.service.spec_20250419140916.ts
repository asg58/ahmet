import { Test, TestingModule } from '@nestjs/testing';
import { BlenderCommandsService } from '../../src/software/commands/blender-commands.service';
import { Logger } from '@nestjs/common';

describe('BlenderCommandsService', () => {
  let service: BlenderCommandsService;
  let loggerMock: any;

  beforeEach(async () => {
    loggerMock = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlenderCommandsService,
        {
          provide: Logger,
          useValue: loggerMock
        }
      ],
    }).compile();

    service = module.get<BlenderCommandsService>(BlenderCommandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCube', () => {
    it('should generate Python code to create a cube', async () => {
      const params = {
        location: [1, 2, 3],
        size: [2, 2, 2],
        material: {
          color: [1, 0, 0],
          metallic: 0.5,
          roughness: 0.2
        }
      };

      const result = await service.createCube(params);

      expect(result).toContain('bpy.ops.mesh.primitive_cube_add');
      expect(result).toContain('location=(1, 2, 3)');
      expect(result).toContain('obj.scale = (2, 2, 2)');
      expect(result).toContain('material.metallic = 0.5');
      expect(result).toContain('material.roughness = 0.2');
      expect(result).toContain('material.diffuse_color = (1, 0, 0, 1)');
    });

    it('should use default values when parameters are not provided', async () => {
      const result = await service.createCube({});

      expect(result).toContain('bpy.ops.mesh.primitive_cube_add');
      expect(result).toContain('location=(0, 0, 0)');
      expect(result).toContain('obj.scale = (1, 1, 1)');
      expect(result).toContain('material.diffuse_color = (0.8, 0.8, 0.8, 1)');
    });
  });

  describe('createSphere', () => {
    it('should generate Python code to create a sphere', async () => {
      const params = {
        location: [1, 2, 3],
        radius: 2,
        segments: 32,
        rings: 16,
        material: {
          color: [0, 1, 0],
          metallic: 0,
          roughness: 1
        }
      };

      const result = await service.createSphere(params);

      expect(result).toContain('bpy.ops.mesh.primitive_uv_sphere_add');
      expect(result).toContain('location=(1, 2, 3)');
      expect(result).toContain('radius=2');
      expect(result).toContain('segments=32');
      expect(result).toContain('ring_count=16');
      expect(result).toContain('material.diffuse_color = (0, 1, 0, 1)');
    });

    it('should use default values when parameters are not provided', async () => {
      const result = await service.createSphere({});

      expect(result).toContain('bpy.ops.mesh.primitive_uv_sphere_add');
      expect(result).toContain('location=(0, 0, 0)');
      expect(result).toContain('radius=1');
      expect(result).toContain('segments=32');
      expect(result).toContain('ring_count=16');
    });
  });

  describe('createText', () => {
    it('should generate Python code to create text', async () => {
      const params = {
        text: 'Hello Blender',
        location: [1, 2, 3],
        size: 1.5,
        extrude: 0.2,
        material: {
          color: [0, 0, 1],
          metallic: 0.7,
          roughness: 0.3
        }
      };

      const result = await service.createText(params);

      expect(result).toContain('bpy.ops.object.text_add');
      expect(result).toContain('location=(1, 2, 3)');
      expect(result).toContain('text_obj.data.body = "Hello Blender"');
      expect(result).toContain('text_obj.data.size = 1.5');
      expect(result).toContain('text_obj.data.extrude = 0.2');
      expect(result).toContain('material.diffuse_color = (0, 0, 1, 1)');
      expect(result).toContain('material.metallic = 0.7');
      expect(result).toContain('material.roughness = 0.3');
    });

    it('should throw error when text is not provided', async () => {
      await expect(service.createText({})).rejects.toThrow('Text content is required');
    });
  });

  describe('createCylinder', () => {
    it('should generate Python code to create a cylinder', async () => {
      const params = {
        location: [1, 2, 3],
        radius: 1.5,
        depth: 3,
        vertices: 32,
        material: {
          color: [0.5, 0.5, 0],
          metallic: 0.2,
          roughness: 0.8
        }
      };

      const result = await service.createCylinder(params);

      expect(result).toContain('bpy.ops.mesh.primitive_cylinder_add');
      expect(result).toContain('location=(1, 2, 3)');
      expect(result).toContain('radius=1.5');
      expect(result).toContain('depth=3');
      expect(result).toContain('vertices=32');
      expect(result).toContain('material.diffuse_color = (0.5, 0.5, 0, 1)');
    });
  });

  describe('createPlane', () => {
    it('should generate Python code to create a plane', async () => {
      const params = {
        location: [1, 2, 3],
        size: 5,
        material: {
          color: [0.7, 0.7, 0.7],
          metallic: 0,
          roughness: 1
        }
      };

      const result = await service.createPlane(params);

      expect(result).toContain('bpy.ops.mesh.primitive_plane_add');
      expect(result).toContain('location=(1, 2, 3)');
      expect(result).toContain('obj.scale = (5, 5, 1)');
      expect(result).toContain('material.diffuse_color = (0.7, 0.7, 0.7, 1)');
    });
  });

  describe('selectObjects', () => {
    it('should generate Python code to select objects by type', async () => {
      const result = await service.selectObjects({ type: 'MESH' });

      expect(result).toContain('for obj in bpy.context.scene.objects:');
      expect(result).toContain('if obj.type == "MESH":');
      expect(result).toContain('obj.select_set(True)');
    });

    it('should generate Python code to select objects by name', async () => {
      const result = await service.selectObjects({ name: 'Cube' });

      expect(result).toContain('for obj in bpy.context.scene.objects:');
      expect(result).toContain('if obj.name == "Cube":');
      expect(result).toContain('obj.select_set(True)');
    });

    it('should generate Python code to select all objects', async () => {
      const result = await service.selectObjects({ all: true });

      expect(result).toContain('for obj in bpy.context.scene.objects:');
      expect(result).toContain('obj.select_set(True)');
    });
  });

  describe('applyMaterial', () => {
    it('should generate Python code to apply material to an object', async () => {
      const params = {
        objectName: 'Cube',
        color: [1, 0, 0],
        metallic: 0.8,
        roughness: 0.2,
        specular: 0.5,
        transmission: 0,
        emission: [0, 0, 0],
        emissionStrength: 0
      };

      const result = await service.applyMaterial(params);

      expect(result).toContain('obj = bpy.context.scene.objects.get("Cube")');
      expect(result).toContain('material.diffuse_color = (1, 0, 0, 1)');
      expect(result).toContain('material.metallic = 0.8');
      expect(result).toContain('material.roughness = 0.2');
      expect(result).toContain('material.specular_intensity = 0.5');
    });

    it('should throw error when objectName is not provided', async () => {
      await expect(service.applyMaterial({})).rejects.toThrow('Object name is required');
    });
  });

  describe('setupLighting', () => {
    it('should generate Python code to set up lighting', async () => {
      const params = {
        type: 'SUN',
        name: 'MainLight',
        location: [5, 5, 5],
        rotation: [0.5, 0.5, 0.5],
        energy: 2,
        color: [1, 0.9, 0.8]
      };

      const result = await service.setupLighting(params);

      expect(result).toContain('bpy.ops.object.light_add');
      expect(result).toContain('type="SUN"');
      expect(result).toContain('location=(5, 5, 5)');
      expect(result).toContain('rotation=(0.5, 0.5, 0.5)');
      expect(result).toContain('light.energy = 2');
      expect(result).toContain('light.color = (1, 0.9, 0.8)');
      expect(result).toContain('light_obj.name = "MainLight"');
    });
  });

  describe('renderScene', () => {
    it('should generate Python code to render the scene', async () => {
      const params = {
        resolution: [1920, 1080],
        samples: 128,
        output: '/tmp/render.png',
        engine: 'CYCLES',
        format: 'PNG'
      };

      const result = await service.renderScene(params);

      expect(result).toContain('bpy.context.scene.render.resolution_x = 1920');
      expect(result).toContain('bpy.context.scene.render.resolution_y = 1080');
      expect(result).toContain('bpy.context.scene.cycles.samples = 128');
      expect(result).toContain('bpy.context.scene.render.engine = "CYCLES"');
      expect(result).toContain('bpy.context.scene.render.image_settings.file_format = "PNG"');
      expect(result).toContain('bpy.context.scene.render.filepath = "/tmp/render.png"');
    });
  });

  describe('addTexture', () => {
    it('should generate Python code to add an image texture', async () => {
      const params = {
        objectName: 'Cube',
        textureType: 'IMAGE',
        texturePath: '/path/to/texture.jpg'
      };

      const result = await service.addTexture(params);

      expect(result).toContain('obj = bpy.context.scene.objects.get("Cube")');
      expect(result).toContain('tex_image = material.node_tree.nodes.new("ShaderNodeTexImage")');
      expect(result).toContain('tex_image.image = bpy.data.images.load("/path/to/texture.jpg")');
    });

    it('should generate Python code to add a procedural texture', async () => {
      const params = {
        objectName: 'Cube',
        textureType: 'PROCEDURAL',
        proceduralType: 'NOISE',
        scale: 2,
        detail: 5
      };

      const result = await service.addTexture(params);

      expect(result).toContain('obj = bpy.context.scene.objects.get("Cube")');
      expect(result).toContain('tex_noise = material.node_tree.nodes.new("ShaderNodeTexNoise")');
      expect(result).toContain('tex_noise.inputs["Scale"].default_value = 2');
      expect(result).toContain('tex_noise.inputs["Detail"].default_value = 5');
    });

    it('should throw error when objectName is not provided', async () => {
      await expect(service.addTexture({})).rejects.toThrow('Object name is required');
    });
  });

  describe('getSceneScreenshot', () => {
    it('should generate Python code to get a screenshot', async () => {
      const result = await service.getSceneScreenshot({});

      expect(result).toContain('import base64');
      expect(result).toContain('bpy.context.scene.render.image_settings.file_format = "PNG"');
      expect(result).toContain('bpy.context.scene.render.filepath = temp_file');
      expect(result).toContain('bpy.ops.render.render(write_still=True)');
      expect(result).toContain('with open(temp_file, "rb") as image_file:');
      expect(result).toContain('base64_image = base64.b64encode(image_file.read()).decode("utf-8")');
    });
  });
}); 