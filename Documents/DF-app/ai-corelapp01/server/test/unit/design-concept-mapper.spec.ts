import { Test, TestingModule } from '@nestjs/testing';
import { DesignConceptMapper } from '../../src/software/universal/design-concepts';

describe('DesignConceptMapper', () => {
  let mapper: DesignConceptMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DesignConceptMapper],
    }).compile();

    mapper = module.get<DesignConceptMapper>(DesignConceptMapper);
  });

  describe('mapShapeConcept', () => {
    it('should map rectangle concept to CorelDRAW format', () => {
      const rectangleConcept = {
        type: 'shape',
        shape: 'rectangle',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 150 },
        fill: { color: { r: 255, g: 0, b: 0 } },
        outline: { color: { r: 0, g: 0, b: 0 }, width: 1 }
      };

      const result = mapper.mapShapeConcept(rectangleConcept, 'coreldraw');
      
      expect(result).toEqual({
        command: 'createRectangle',
        params: {
          x: 100,
          y: 200,
          width: 300,
          height: 150,
          fillColor: { r: 255, g: 0, b: 0 },
          outlineColor: { r: 0, g: 0, b: 0 },
          outlineWidth: 1
        }
      });
    });

    it('should map rectangle concept to Blender format', () => {
      const rectangleConcept = {
        type: 'shape',
        shape: 'rectangle',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 150 },
        fill: { color: { r: 255, g: 0, b: 0 } },
        outline: { color: { r: 0, g: 0, b: 0 }, width: 1 }
      };

      const result = mapper.mapShapeConcept(rectangleConcept, 'blender');
      
      expect(result).toEqual({
        command: 'createCube',
        params: {
          location: [100, 200, 0],
          size: [300, 150, 1],
          material: {
            color: [1, 0, 0],
            metallic: 0,
            roughness: 0.8
          }
        }
      });
    });

    it('should map circle concept to CorelDRAW format', () => {
      const circleConcept = {
        type: 'shape',
        shape: 'circle',
        position: { x: 150, y: 150 },
        radius: 75,
        fill: { color: { r: 0, g: 255, b: 0 } },
        outline: { color: { r: 0, g: 0, b: 0 }, width: 1 }
      };

      const result = mapper.mapShapeConcept(circleConcept, 'coreldraw');
      
      expect(result).toEqual({
        command: 'createEllipse',
        params: {
          x: 150,
          y: 150,
          width: 150,
          height: 150,
          fillColor: { r: 0, g: 255, b: 0 },
          outlineColor: { r: 0, g: 0, b: 0 },
          outlineWidth: 1
        }
      });
    });

    it('should map circle concept to Blender format', () => {
      const circleConcept = {
        type: 'shape',
        shape: 'circle',
        position: { x: 150, y: 150 },
        radius: 75,
        fill: { color: { r: 0, g: 255, b: 0 } },
        outline: { color: { r: 0, g: 0, b: 0 }, width: 1 }
      };

      const result = mapper.mapShapeConcept(circleConcept, 'blender');
      
      expect(result).toEqual({
        command: 'createSphere',
        params: {
          location: [150, 150, 0],
          radius: 75,
          segments: 32,
          rings: 16,
          material: {
            color: [0, 1, 0],
            metallic: 0,
            roughness: 0.8
          }
        }
      });
    });

    it('should map text concept correctly', () => {
      const textConcept = {
        type: 'text',
        text: 'Hello World',
        position: { x: 100, y: 100 },
        font: 'Arial',
        size: 24,
        color: { r: 0, g: 0, b: 0 }
      };

      const corelResult = mapper.mapShapeConcept(textConcept, 'coreldraw');
      expect(corelResult).toEqual({
        command: 'createText',
        params: {
          x: 100,
          y: 100,
          text: 'Hello World',
          font: 'Arial',
          size: 24,
          color: { r: 0, g: 0, b: 0 }
        }
      });

      const blenderResult = mapper.mapShapeConcept(textConcept, 'blender');
      expect(blenderResult).toEqual({
        command: 'createText',
        params: {
          text: 'Hello World',
          location: [100, 100, 0],
          size: 1,
          extrude: 0.1,
          material: {
            color: [0, 0, 0],
            metallic: 0,
            roughness: 0.8
          }
        }
      });
    });
  });

  describe('mapMaterialConcept', () => {
    it('should map material concept to CorelDRAW format', () => {
      const materialConcept = {
        type: 'material',
        color: { r: 255, g: 128, b: 0 },
        transparency: 0.2,
        glossiness: 0.8
      };

      const result = mapper.mapMaterialConcept(materialConcept, 'coreldraw');
      
      expect(result).toEqual({
        command: 'applyFill',
        params: {
          color: { r: 255, g: 128, b: 0 },
          transparency: 20, // Scaled to percentage
          gradient: null
        }
      });
    });

    it('should map material concept to Blender format', () => {
      const materialConcept = {
        type: 'material',
        color: { r: 255, g: 128, b: 0 },
        transparency: 0.2,
        glossiness: 0.8,
        metallic: 0.5
      };

      const result = mapper.mapMaterialConcept(materialConcept, 'blender');
      
      expect(result).toEqual({
        command: 'applyMaterial',
        params: {
          color: [1, 0.502, 0], // Normalized RGB
          metallic: 0.5,
          roughness: 0.2, // Inverted glossiness
          transmission: 0.2, // Transparency maps to transmission
          specular: 0.8 // Glossiness maps to specular
        }
      });
    });

    it('should handle gradient materials for CorelDRAW', () => {
      const gradientMaterial = {
        type: 'material',
        gradient: {
          type: 'linear',
          start: { r: 255, g: 0, b: 0 },
          end: { r: 0, g: 0, b: 255 },
          angle: 45
        }
      };

      const result = mapper.mapMaterialConcept(gradientMaterial, 'coreldraw');
      
      expect(result).toEqual({
        command: 'applyFill',
        params: {
          color: null,
          transparency: 0,
          gradient: {
            type: 'linear',
            startColor: { r: 255, g: 0, b: 0 },
            endColor: { r: 0, g: 0, b: 255 },
            angle: 45
          }
        }
      });
    });
  });

  describe('findMatchingConcept', () => {
    it('should find rectangle concept from object properties', () => {
      const objectProperties = {
        type: 'Rectangle',
        position: { x: 100, y: 200 },
        size: { width: 300, height: 150 },
        fill: { color: { r: 255, g: 0, b: 0 } }
      };

      const result = mapper.findMatchingConcept(objectProperties);
      
      expect(result.type).toBe('shape');
      expect(result.shape).toBe('rectangle');
    });

    it('should find circle concept from object properties', () => {
      const objectProperties = {
        type: 'Ellipse',
        position: { x: 150, y: 150 },
        size: { width: 100, height: 100 },
        fill: { color: { r: 0, g: 255, b: 0 } }
      };

      const result = mapper.findMatchingConcept(objectProperties);
      
      expect(result.type).toBe('shape');
      expect(result.shape).toBe('circle');
    });

    it('should find text concept from object properties', () => {
      const objectProperties = {
        type: 'TextFrame',
        text: 'Hello World',
        position: { x: 100, y: 100 },
        font: 'Arial',
        fontSize: 24
      };

      const result = mapper.findMatchingConcept(objectProperties);
      
      expect(result.type).toBe('text');
      expect(result.text).toBe('Hello World');
    });

    it('should handle Blender objects', () => {
      const blenderObject = {
        type: 'MESH',
        name: 'Cube',
        position: { x: 0, y: 0, z: 0 },
        dimensions: { x: 2, y: 2, z: 2 },
        material: {
          name: 'Material',
          color: [0.8, 0.2, 0.2]
        }
      };

      const result = mapper.findMatchingConcept(blenderObject);
      
      expect(result.type).toBe('shape');
      expect(result.shape).toBe('cube');
    });
  });

  describe('normalizeColor', () => {
    it('should normalize RGB values 0-255 to 0-1 range', () => {
      const rgbColor = { r: 255, g: 128, b: 0 };
      const result = mapper['normalizeColor'](rgbColor); // Access private method
      
      expect(result).toEqual([1, 0.502, 0]);
    });

    it('should handle already normalized values', () => {
      const normalizedColor = { r: 0.5, g: 0.25, b: 0.75 };
      const result = mapper['normalizeColor'](normalizedColor, true); // Assume values already in 0-1
      
      expect(result).toEqual([0.5, 0.25, 0.75]);
    });
  });
}); 