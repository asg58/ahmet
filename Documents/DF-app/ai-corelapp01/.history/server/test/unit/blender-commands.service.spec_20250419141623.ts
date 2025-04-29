import { Test, TestingModule } from '@nestjs/testing';
import { BlenderCommandsService } from '../../src/software/commands/blender-commands.service';
import { Logger } from '@nestjs/common';

describe('BlenderCommandsService', () => {
  let service: BlenderCommandsService;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlenderCommandsService,
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<BlenderCommandsService>(BlenderCommandsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCube', () => {
    it('should generate proper Python code for creating a cube with defaults', async () => {
      const result = await service.createCube({});
      expect(result).toContain('bpy.ops.mesh.primitive_cube_add(');
      expect(result).toContain('location=(0, 0, 0)');
      expect(result).toContain('scale=(1, 1, 1)');
    });

    it('should generate proper Python code for creating a cube with custom parameters', async () => {
      const result = await service.createCube({
        x: 5,
        y: 2,
        z: 3,
        sizeX: 2,
        sizeY: 3,
        sizeZ: 4,
        materialColor: '#FF0000',
      });
      
      expect(result).toContain('location=(5, 2, 3)');
      expect(result).toContain('scale=(2, 3, 4)');
      expect(result).toContain('diffuse_color=(1.0, 0.0, 0.0, 1.0)');
    });
  });

  describe('createSphere', () => {
    it('should generate proper Python code for creating a sphere with defaults', async () => {
      const result = await service.createSphere({});
      expect(result).toContain('bpy.ops.mesh.primitive_uv_sphere_add(');
      expect(result).toContain('location=(0, 0, 0)');
      expect(result).toContain('radius=1');
      expect(result).toContain('segments=32');
      expect(result).toContain('ring_count=16');
    });

    it('should generate proper Python code for creating a sphere with custom parameters', async () => {
      const result = await service.createSphere({
        x: 3,
        y: 4,
        z: 5,
        radius: 2.5,
        segments: 64,
        rings: 32,
        materialColor: '#00FF00',
      });
      
      expect(result).toContain('location=(3, 4, 5)');
      expect(result).toContain('radius=2.5');
      expect(result).toContain('segments=64');
      expect(result).toContain('ring_count=32');
      expect(result).toContain('diffuse_color=(0.0, 1.0, 0.0, 1.0)');
    });
  });

  describe('createCylinder', () => {
    it('should generate proper Python code for creating a cylinder with defaults', async () => {
      const result = await service.createCylinder({});
      expect(result).toContain('bpy.ops.mesh.primitive_cylinder_add(');
      expect(result).toContain('location=(0, 0, 0)');
      expect(result).toContain('radius=1');
      expect(result).toContain('depth=2');
      expect(result).toContain('vertices=32');
    });

    it('should generate proper Python code for creating a cylinder with custom parameters', async () => {
      const result = await service.createCylinder({
        x: 2,
        y: 3,
        z: 4,
        radius: 1.5,
        depth: 3,
        vertices: 16,
        materialColor: '#0000FF',
      });
      
      expect(result).toContain('location=(2, 3, 4)');
      expect(result).toContain('radius=1.5');
      expect(result).toContain('depth=3');
      expect(result).toContain('vertices=16');
      expect(result).toContain('diffuse_color=(0.0, 0.0, 1.0, 1.0)');
    });
  });

  describe('createPlane', () => {
    it('should generate proper Python code for creating a plane with defaults', async () => {
      const result = await service.createPlane({});
      expect(result).toContain('bpy.ops.mesh.primitive_plane_add(');
      expect(result).toContain('location=(0, 0, 0)');
      expect(result).toContain('size=2');
    });

    it('should generate proper Python code for creating a plane with custom parameters', async () => {
      const result = await service.createPlane({
        x: 1,
        y: 2,
        z: 3,
        size: 5,
        materialColor: '#FFFF00',
      });
      
      expect(result).toContain('location=(1, 2, 3)');
      expect(result).toContain('size=5');
      expect(result).toContain('diffuse_color=(1.0, 1.0, 0.0, 1.0)');
    });
  });

  describe('createText', () => {
    it('should throw an error when text is not provided', async () => {
      await expect(service.createText({})).rejects.toThrow('Text content is required');
    });

    it('should generate proper Python code for creating text with defaults', async () => {
      const result = await service.createText({ text: 'Hello Blender' });
      expect(result).toContain('bpy.ops.object.text_add(');
      expect(result).toContain('location=(0, 0, 0)');
      expect(result).toContain("text_obj.data.body = 'Hello Blender'");
      expect(result).toContain('extrude = 0.1');
    });

    it('should generate proper Python code for creating text with custom parameters', async () => {
      const result = await service.createText({
        text: 'Custom Text',
        x: 2,
        y: 3,
        z: 4,
        size: 2.5,
        extrude: 0.2,
        materialColor: '#FF00FF',
      });
      
      expect(result).toContain('location=(2, 3, 4)');
      expect(result).toContain("text_obj.data.body = 'Custom Text'");
      expect(result).toContain('text_obj.data.size = 2.5');
      expect(result).toContain('text_obj.data.extrude = 0.2');
      expect(result).toContain('diffuse_color=(1.0, 0.0, 1.0, 1.0)');
    });
  });

  describe('selectObjects', () => {
    it('should generate proper Python code for selecting all objects', async () => {
      const result = await service.selectObjects({ all: true });
      expect(result).toContain('bpy.ops.object.select_all(action=\'SELECT\')');
    });

    it('should generate proper Python code for selecting objects by type', async () => {
      const result = await service.selectObjects({ type: 'MESH' });
      expect(result).toContain('if obj.type == \'MESH\'');
      expect(result).toContain('obj.select_set(True)');
    });

    it('should generate proper Python code for selecting objects by name', async () => {
      const result = await service.selectObjects({ name: 'Cube' });
      expect(result).toContain('if obj.name == \'Cube\'');
      expect(result).toContain('obj.select_set(True)');
    });
  });

  describe('transformObject', () => {
    it('should throw an error when object name is not provided', async () => {
      await expect(service.transformObject({})).rejects.toThrow('Object name is required');
    });

    it('should generate proper Python code for transforming an object', async () => {
      const result = await service.transformObject({
        objectName: 'Cube',
        x: 1,
        y: 2,
        z: 3,
        rotationX: 45,
        rotationY: 90,
        rotationZ: 180,
        scaleX: 2,
        scaleY: 3,
        scaleZ: 4,
      });
      
      expect(result).toContain('obj = bpy.data.objects.get(\'Cube\')');
      expect(result).toContain('obj.location = (1, 2, 3)');
      expect(result).toContain('obj.rotation_euler = (0.7853981633974483, 1.5707963267948966, 3.141592653589793)');
      expect(result).toContain('obj.scale = (2, 3, 4)');
    });
  });

  describe('setupCamera', () => {
    it('should generate proper Python code for setting up a camera with defaults', async () => {
      const result = await service.setupCamera({});
      expect(result).toContain('bpy.ops.object.camera_add(');
      expect(result).toContain('location=(0, -10, 2)');
      expect(result).toContain('camera.rotation_euler = (1.5707963267948966, 0, 0)');
      expect(result).toContain('bpy.context.scene.camera = camera');
    });

    it('should generate proper Python code for setting up a camera with custom parameters', async () => {
      const result = await service.setupCamera({
        x: 5,
        y: 6,
        z: 7,
        rotationX: 30,
        rotationY: 45,
        rotationZ: 60,
        focalLength: 35,
      });
      
      expect(result).toContain('location=(5, 6, 7)');
      expect(result).toContain('camera.rotation_euler = (0.5235987755982988, 0.7853981633974483, 1.0471975511965976)');
      expect(result).toContain('camera.data.lens = 35');
    });
  });

  describe('getSceneScreenshot', () => {
    it('should generate proper Python code for taking a screenshot with defaults', async () => {
      const result = await service.getSceneScreenshot({});
      expect(result).toContain('bpy.context.scene.render.resolution_x = 1920');
      expect(result).toContain('bpy.context.scene.render.resolution_y = 1080');
      expect(result).toContain('bpy.context.scene.render.filepath');
      expect(result).toContain('bpy.ops.render.render(write_still=True)');
      expect(result).toContain('import base64');
    });

    it('should generate proper Python code for taking a screenshot with custom parameters', async () => {
      const result = await service.getSceneScreenshot({
        width: 800,
        height: 600,
        filepath: '/tmp/custom_render.png',
      });
      
      expect(result).toContain('bpy.context.scene.render.resolution_x = 800');
      expect(result).toContain('bpy.context.scene.render.resolution_y = 600');
      expect(result).toContain("bpy.context.scene.render.filepath = '/tmp/custom_render.png'");
    });
  });

  describe('applyMaterial', () => {
    it('should throw an error when object name is not provided', async () => {
      await expect(service.applyMaterial({})).rejects.toThrow('Object name is required');
    });

    it('should generate proper Python code for applying material with defaults', async () => {
      const result = await service.applyMaterial({
        objectName: 'Cube',
      });
      
      expect(result).toContain('obj = bpy.data.objects.get(\'Cube\')');
      expect(result).toContain('material = bpy.data.materials.new(name="Material_Cube")');
      expect(result).toContain('material.use_nodes = True');
      expect(result).toContain('principled_bsdf = material.node_tree.nodes.get(\'Principled BSDF\')');
    });

    it('should generate proper Python code for applying material with custom parameters', async () => {
      const result = await service.applyMaterial({
        objectName: 'Sphere',
        color: '#FF0000',
        metallic: 0.8,
        roughness: 0.2,
        specular: 0.5,
        transmission: 0.3,
        emission: '#00FF00',
        emissionStrength: 2.0,
      });
      
      expect(result).toContain('obj = bpy.data.objects.get(\'Sphere\')');
      expect(result).toContain('principled_bsdf.inputs[\'Base Color\'].default_value = (1.0, 0.0, 0.0, 1.0)');
      expect(result).toContain('principled_bsdf.inputs[\'Metallic\'].default_value = 0.8');
      expect(result).toContain('principled_bsdf.inputs[\'Roughness\'].default_value = 0.2');
      expect(result).toContain('principled_bsdf.inputs[\'Specular\'].default_value = 0.5');
      expect(result).toContain('principled_bsdf.inputs[\'Transmission\'].default_value = 0.3');
      expect(result).toContain('principled_bsdf.inputs[\'Emission\'].default_value = (0.0, 1.0, 0.0, 1.0)');
      expect(result).toContain('principled_bsdf.inputs[\'Emission Strength\'].default_value = 2.0');
    });
  });

  describe('setupLighting', () => {
    it('should generate proper Python code for setting up lighting with defaults', async () => {
      const result = await service.setupLighting({});
      expect(result).toContain('bpy.ops.object.light_add(type=\'SUN\'');
      expect(result).toContain('location=(0, 0, 5)');
      expect(result).toContain('light.data.energy = 1.0');
      expect(result).toContain('light.data.color = (1, 1, 1)');
    });

    it('should generate proper Python code for setting up lighting with custom parameters', async () => {
      const result = await service.setupLighting({
        lightType: 'POINT',
        name: 'MyLight',
        x: 3,
        y: 4,
        z: 5,
        rotationX: 45,
        rotationY: 30,
        rotationZ: 60,
        energy: 2.5,
        color: '#FFFF00',
      });
      
      expect(result).toContain('bpy.ops.object.light_add(type=\'POINT\'');
      expect(result).toContain('location=(3, 4, 5)');
      expect(result).toContain('light.name = \'MyLight\'');
      expect(result).toContain('light.rotation_euler = (0.7853981633974483, 0.5235987755982988, 1.0471975511965976)');
      expect(result).toContain('light.data.energy = 2.5');
      expect(result).toContain('light.data.color = (1.0, 1.0, 0.0)');
    });
  });

  describe('addTexture', () => {
    it('should throw an error when object name is not provided', async () => {
      await expect(service.addTexture({})).rejects.toThrow('Object name is required');
    });

    it('should throw an error when texture type is neither image nor procedural', async () => {
      await expect(service.addTexture({ 
        objectName: 'Cube', 
        textureType: 'INVALID'
      })).rejects.toThrow('Texture type must be either "image" or "procedural"');
    });

    it('should throw an error when texture type is image but path is not provided', async () => {
      await expect(service.addTexture({
        objectName: 'Cube',
        textureType: 'image'
      })).rejects.toThrow('Image texture path is required for image textures');
    });

    it('should generate proper Python code for adding an image texture', async () => {
      const result = await service.addTexture({
        objectName: 'Cube',
        textureType: 'image',
        texturePath: '/path/to/texture.png',
      });
      
      expect(result).toContain('obj = bpy.data.objects.get(\'Cube\')');
      expect(result).toContain('material.use_nodes = True');
      expect(result).toContain('image_texture = material.node_tree.nodes.new(\'ShaderNodeTexImage\')');
      expect(result).toContain('image_texture.image = bpy.data.images.load(\'/path/to/texture.png\')');
      expect(result).toContain('material.node_tree.links.new(image_texture.outputs[\'Color\'], principled_bsdf.inputs[\'Base Color\'])');
    });

    it('should generate proper Python code for adding a procedural texture', async () => {
      const result = await service.addTexture({
        objectName: 'Cube',
        textureType: 'procedural',
        proceduralType: 'NOISE',
        scale: 1.5,
        detail: 8,
        distortion: 2.0,
      });
      
      expect(result).toContain('obj = bpy.data.objects.get(\'Cube\')');
      expect(result).toContain('material.use_nodes = True');
      expect(result).toContain('noise_texture = material.node_tree.nodes.new(\'ShaderNodeTexNoise\')');
      expect(result).toContain('noise_texture.inputs[\'Scale\'].default_value = 1.5');
      expect(result).toContain('noise_texture.inputs[\'Detail\'].default_value = 8');
      expect(result).toContain('noise_texture.inputs[\'Distortion\'].default_value = 2.0');
      expect(result).toContain('material.node_tree.links.new(noise_texture.outputs[\'Color\'], principled_bsdf.inputs[\'Base Color\'])');
    });
  });

  describe('renderScene', () => {
    it('should generate proper Python code for rendering a scene with defaults', async () => {
      const result = await service.renderScene({});
      expect(result).toContain('bpy.context.scene.render.resolution_x = 1920');
      expect(result).toContain('bpy.context.scene.render.resolution_y = 1080');
      expect(result).toContain('bpy.context.scene.render.engine = \'CYCLES\'');
      expect(result).toContain('bpy.context.scene.cycles.samples = 128');
      expect(result).toContain('bpy.context.scene.render.filepath = ');
      expect(result).toContain('bpy.context.scene.render.image_settings.file_format = \'PNG\'');
      expect(result).toContain('bpy.ops.render.render(write_still=True)');
    });

    it('should generate proper Python code for rendering a scene with custom parameters', async () => {
      const result = await service.renderScene({
        width: 800,
        height: 600,
        samples: 64,
        outputPath: '/tmp/custom_render.jpg',
        renderEngine: 'EEVEE',
        outputFormat: 'JPEG',
      });
      
      expect(result).toContain('bpy.context.scene.render.resolution_x = 800');
      expect(result).toContain('bpy.context.scene.render.resolution_y = 600');
      expect(result).toContain('bpy.context.scene.render.engine = \'EEVEE\'');
      expect(result).toContain('bpy.context.scene.eevee.taa_render_samples = 64');
      expect(result).toContain("bpy.context.scene.render.filepath = '/tmp/custom_render.jpg'");
      expect(result).toContain('bpy.context.scene.render.image_settings.file_format = \'JPEG\'');
    });
  });
}); 