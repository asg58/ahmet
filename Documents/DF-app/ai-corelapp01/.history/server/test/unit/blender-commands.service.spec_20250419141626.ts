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
      debug: jest.fn(),
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
    it('should generate Python code to create a cube with default parameters', async () => {
      const result = await service.createCube();
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.mesh.primitive_cube_add(');
      expect(result.code).toContain('location=(0, 0, 0)');
      expect(result.code).toContain('size=2');
    });

    it('should generate Python code to create a cube with custom parameters', async () => {
      const result = await service.createCube({
        location: [1, 2, 3],
        size: 3,
        material: {
          color: [1, 0, 0, 1],
          metallic: 0.5,
          roughness: 0.2
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.mesh.primitive_cube_add(');
      expect(result.code).toContain('location=(1, 2, 3)');
      expect(result.code).toContain('size=3');
      expect(result.code).toContain('mat.diffuse_color = (1, 0, 0, 1)');
      expect(result.code).toContain('mat.metallic = 0.5');
      expect(result.code).toContain('mat.roughness = 0.2');
    });
  });

  describe('createSphere', () => {
    it('should generate Python code to create a sphere with default parameters', async () => {
      const result = await service.createSphere();
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.mesh.primitive_uv_sphere_add(');
      expect(result.code).toContain('location=(0, 0, 0)');
      expect(result.code).toContain('radius=1');
      expect(result.code).toContain('segments=32');
      expect(result.code).toContain('ring_count=16');
    });

    it('should generate Python code to create a sphere with custom parameters', async () => {
      const result = await service.createSphere({
        location: [1, 2, 3],
        radius: 2.5,
        segments: 64,
        rings: 32,
        material: {
          color: [0, 1, 0, 1]
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.mesh.primitive_uv_sphere_add(');
      expect(result.code).toContain('location=(1, 2, 3)');
      expect(result.code).toContain('radius=2.5');
      expect(result.code).toContain('segments=64');
      expect(result.code).toContain('ring_count=32');
      expect(result.code).toContain('mat.diffuse_color = (0, 1, 0, 1)');
    });
  });

  describe('createCylinder', () => {
    it('should generate Python code to create a cylinder with default parameters', async () => {
      const result = await service.createCylinder();
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.mesh.primitive_cylinder_add(');
      expect(result.code).toContain('location=(0, 0, 0)');
      expect(result.code).toContain('radius=1');
      expect(result.code).toContain('depth=2');
      expect(result.code).toContain('vertices=32');
    });

    it('should generate Python code to create a cylinder with custom parameters', async () => {
      const result = await service.createCylinder({
        location: [1, 2, 3],
        radius: 1.5,
        depth: 3,
        vertices: 16,
        material: {
          color: [0, 0, 1, 1]
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.mesh.primitive_cylinder_add(');
      expect(result.code).toContain('location=(1, 2, 3)');
      expect(result.code).toContain('radius=1.5');
      expect(result.code).toContain('depth=3');
      expect(result.code).toContain('vertices=16');
      expect(result.code).toContain('mat.diffuse_color = (0, 0, 1, 1)');
    });
  });

  describe('createPlane', () => {
    it('should generate Python code to create a plane with default parameters', async () => {
      const result = await service.createPlane();
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.mesh.primitive_plane_add(');
      expect(result.code).toContain('location=(0, 0, 0)');
      expect(result.code).toContain('size=2');
    });

    it('should generate Python code to create a plane with custom parameters', async () => {
      const result = await service.createPlane({
        location: [1, 2, 0],
        size: 5,
        material: {
          color: [0.5, 0.5, 0.5, 1]
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.mesh.primitive_plane_add(');
      expect(result.code).toContain('location=(1, 2, 0)');
      expect(result.code).toContain('size=5');
      expect(result.code).toContain('mat.diffuse_color = (0.5, 0.5, 0.5, 1)');
    });
  });

  describe('createText', () => {
    it('should generate Python code to create text with default parameters', async () => {
      const result = await service.createText({ 
        text: 'Hello Blender'
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.object.text_add(');
      expect(result.code).toContain('location=(0, 0, 0)');
      expect(result.code).toContain('text_obj.data.body = "Hello Blender"');
      expect(result.code).toContain('text_obj.data.extrude = 0.1');
    });

    it('should generate Python code to create text with custom parameters', async () => {
      const result = await service.createText({
        text: 'Custom Text',
        location: [1, 2, 3],
        size: 2,
        extrude: 0.2,
        material: {
          color: [1, 1, 0, 1]
        }
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.object.text_add(');
      expect(result.code).toContain('location=(1, 2, 3)');
      expect(result.code).toContain('text_obj.data.body = "Custom Text"');
      expect(result.code).toContain('text_obj.data.size = 2');
      expect(result.code).toContain('text_obj.data.extrude = 0.2');
      expect(result.code).toContain('mat.diffuse_color = (1, 1, 0, 1)');
    });

    it('should return error when no text is provided', async () => {
      const result = await service.createText({});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('text parameter is required');
    });
  });

  describe('selectObjects', () => {
    it('should generate Python code to select all objects', async () => {
      const result = await service.selectObjects({ selectAll: true });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.object.select_all(action="SELECT")');
    });

    it('should generate Python code to select objects by type', async () => {
      const result = await service.selectObjects({ type: 'MESH' });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('if obj.type == "MESH"');
      expect(result.code).toContain('obj.select_set(True)');
    });

    it('should generate Python code to select objects by name', async () => {
      const result = await service.selectObjects({ name: 'Cube' });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('if "Cube" in obj.name');
      expect(result.code).toContain('obj.select_set(True)');
    });
  });

  describe('transformObject', () => {
    it('should generate Python code to transform an object', async () => {
      const result = await service.transformObject({
        objectName: 'Cube',
        location: [1, 2, 3],
        rotation: [0, 0, 90],
        scale: [2, 2, 2]
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('obj = bpy.data.objects.get("Cube")');
      expect(result.code).toContain('obj.location = (1, 2, 3)');
      expect(result.code).toContain('obj.rotation_euler = (0, 0, 1.5707');  // 90 degrees in radians
      expect(result.code).toContain('obj.scale = (2, 2, 2)');
    });

    it('should return error when no object name is provided', async () => {
      const result = await service.transformObject({
        location: [1, 2, 3]
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('objectName parameter is required');
    });
  });

  describe('setupCamera', () => {
    it('should generate Python code to set up a camera with default parameters', async () => {
      const result = await service.setupCamera();
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('cam = bpy.data.objects.get("Camera")');
      expect(result.code).toContain('cam.location = (0, -10, 0)');
      expect(result.code).toContain('cam.rotation_euler = (1.5707');  // 90 degrees in radians
    });

    it('should generate Python code to set up a camera with custom parameters', async () => {
      const result = await service.setupCamera({
        location: [5, -15, 2],
        rotation: [70, 0, 0],
        lens: 50
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('cam = bpy.data.objects.get("Camera")');
      expect(result.code).toContain('cam.location = (5, -15, 2)');
      expect(result.code).toContain('cam.rotation_euler = (1.2217');  // 70 degrees in radians
      expect(result.code).toContain('cam.data.lens = 50');
    });
  });

  describe('applyMaterial', () => {
    it('should generate Python code to apply a material with default parameters', async () => {
      const result = await service.applyMaterial({ objectName: 'Cube' });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('obj = bpy.data.objects.get("Cube")');
      expect(result.code).toContain('mat = bpy.data.materials.new');
      expect(result.code).toContain('mat.diffuse_color = (0.8, 0.8, 0.8, 1)');
    });

    it('should generate Python code to apply a material with custom parameters', async () => {
      const result = await service.applyMaterial({
        objectName: 'Sphere',
        color: [1, 0, 0, 1],
        metallic: 0.8,
        roughness: 0.2,
        specular: 0.5,
        transmission: 0.3,
        emission: [0, 0.5, 0, 1],
        emissionStrength: 2.0
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('obj = bpy.data.objects.get("Sphere")');
      expect(result.code).toContain('mat.diffuse_color = (1, 0, 0, 1)');
      expect(result.code).toContain('mat.metallic = 0.8');
      expect(result.code).toContain('mat.roughness = 0.2');
      expect(result.code).toContain('mat.specular_intensity = 0.5');
      expect(result.code).toContain('mat.transmission = 0.3');
      expect(result.code).toContain('mat.emission_color = (0, 0.5, 0, 1)');
      expect(result.code).toContain('mat.emission_strength = 2.0');
    });

    it('should return error when no object name is provided', async () => {
      const result = await service.applyMaterial({});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('objectName parameter is required');
    });
  });

  describe('addTexture', () => {
    it('should generate Python code to add an image texture', async () => {
      const result = await service.addTexture({
        objectName: 'Cube',
        textureType: 'IMAGE',
        texturePath: '/path/to/texture.jpg'
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('obj = bpy.data.objects.get("Cube")');
      expect(result.code).toContain('image_tex = mat_nodes.new(type="ShaderNodeTexImage")');
      expect(result.code).toContain('image_tex.image = bpy.data.images.load');
      expect(result.code).toContain('/path/to/texture.jpg');
    });

    it('should generate Python code to add a procedural texture', async () => {
      const result = await service.addTexture({
        objectName: 'Cube',
        textureType: 'PROCEDURAL',
        proceduralType: 'NOISE'
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('obj = bpy.data.objects.get("Cube")');
      expect(result.code).toContain('noise_tex = mat_nodes.new(type="ShaderNodeTexNoise")');
      expect(result.code).toContain('scale=5.0');
    });

    it('should return error when no object name is provided', async () => {
      const result = await service.addTexture({
        textureType: 'IMAGE',
        texturePath: '/path/to/texture.jpg'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('objectName parameter is required');
    });

    it('should return error with invalid texture type', async () => {
      const result = await service.addTexture({
        objectName: 'Cube',
        textureType: 'INVALID'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('textureType must be either IMAGE or PROCEDURAL');
    });

    it('should return error with missing texture path for image texture', async () => {
      const result = await service.addTexture({
        objectName: 'Cube',
        textureType: 'IMAGE'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('texturePath is required for IMAGE textures');
    });
  });

  describe('setupLighting', () => {
    it('should generate Python code to set up lighting with default parameters', async () => {
      const result = await service.setupLighting();
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.object.light_add(type="POINT"');
      expect(result.code).toContain('location=(0, 0, 5)');
      expect(result.code).toContain('light.data.energy = 1000');
    });

    it('should generate Python code to set up lighting with custom parameters', async () => {
      const result = await service.setupLighting({
        type: 'SUN',
        name: 'MainSun',
        location: [5, 5, 10],
        rotation: [45, 0, 45],
        energy: 5,
        color: [1, 0.9, 0.8]
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.ops.object.light_add(type="SUN"');
      expect(result.code).toContain('location=(5, 5, 10)');
      expect(result.code).toContain('light.name = "MainSun"');
      expect(result.code).toContain('light.rotation_euler = (0.7853');  // 45 degrees in radians
      expect(result.code).toContain('light.data.energy = 5');
      expect(result.code).toContain('light.data.color = (1, 0.9, 0.8)');
    });
  });

  describe('renderScene', () => {
    it('should generate Python code to render a scene with default parameters', async () => {
      const result = await service.renderScene();
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.context.scene.render.resolution_x = 1920');
      expect(result.code).toContain('bpy.context.scene.render.resolution_y = 1080');
      expect(result.code).toContain('bpy.context.scene.render.engine = "CYCLES"');
      expect(result.code).toContain('bpy.context.scene.cycles.samples = 128');
      expect(result.code).toContain('bpy.context.scene.render.filepath');
      expect(result.code).toContain('bpy.context.scene.render.image_settings.file_format = "PNG"');
    });

    it('should generate Python code to render a scene with custom parameters', async () => {
      const result = await service.renderScene({
        width: 3840,
        height: 2160,
        samples: 256,
        outputPath: '/custom/path/render.jpg',
        engine: 'EEVEE',
        format: 'JPEG'
      });
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('bpy.context.scene.render.resolution_x = 3840');
      expect(result.code).toContain('bpy.context.scene.render.resolution_y = 2160');
      expect(result.code).toContain('bpy.context.scene.render.engine = "EEVEE"');
      expect(result.code).toContain('bpy.context.scene.eevee.taa_render_samples = 256');
      expect(result.code).toContain('bpy.context.scene.render.filepath = "/custom/path/render.jpg"');
      expect(result.code).toContain('bpy.context.scene.render.image_settings.file_format = "JPEG"');
    });
  });

  describe('getSceneScreenshot', () => {
    it('should generate Python code to get a scene screenshot', async () => {
      const result = await service.getSceneScreenshot();
      
      expect(result.success).toBe(true);
      expect(result.code).toContain('import base64');
      expect(result.code).toContain('bpy.context.scene.render.resolution_x = 1920');
      expect(result.code).toContain('bpy.context.scene.render.resolution_y = 1080');
      expect(result.code).toContain('bpy.context.scene.render.filepath =');
      expect(result.code).toContain('bpy.ops.render.render(write_still=True)');
      expect(result.code).toContain('with open(temp_file_path, "rb") as img_file:');
      expect(result.code).toContain('base64_data = base64.b64encode(img_file.read()).decode()');
      expect(result.code).toContain('return base64_data');
    });
  });
}); 