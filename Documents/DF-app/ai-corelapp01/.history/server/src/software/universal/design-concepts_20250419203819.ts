/**
 * Design Concepts
 * 
 * Defines common design concepts and mappings to platform-specific objects
 * to enable more natural interaction with design software.
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Design concept interface
 * 
 * Describes a high-level design concept that can be mapped to specific
 * platform implementations.
 */
export interface DesignConcept {
  concept: string;
  description: string;
  corelDrawMapping?: string | string[];
  blenderMapping?: string | string[];
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
    corelDrawParam?: string;
    blenderParam?: string;
    defaultValue?: any;
  }>;
}

/**
 * Common design operations that can be performed across platforms
 */
export enum DesignOperation {
  CREATE = 'create',
  MODIFY = 'modify',
  DELETE = 'delete',
  SELECT = 'select',
  GROUP = 'group',
  UNGROUP = 'ungroup',
  ALIGN = 'align',
  DISTRIBUTE = 'distribute',
  TRANSFORM = 'transform',
}

/**
 * Common design object types that exist across platforms
 */
export enum DesignObjectType {
  RECTANGLE = 'rectangle',
  CIRCLE = 'circle',
  ELLIPSE = 'ellipse',
  POLYGON = 'polygon',
  TEXT = 'text',
  LINE = 'line',
  PATH = 'path',
  GROUP = 'group',
  IMAGE = 'image',
  CURVE = 'curve',
}

/**
 * Common properties for design objects
 */
export enum DesignPropertyType {
  POSITION = 'position',
  SIZE = 'size',
  ROTATION = 'rotation',
  COLOR = 'color',
  FILL = 'fill',
  STROKE = 'stroke',
  TRANSPARENCY = 'transparency',
  TEXT_CONTENT = 'text_content',
  FONT = 'font',
  LAYER = 'layer',
}

/**
 * Structure to map common design concepts to platform-specific terms
 */
export interface ConceptMapping {
  universalConcept: string;
  coreldraw: {
    objectPath?: string;
    method?: string;
    property?: string;
    code?: string;
  };
  blender: {
    objectPath?: string;
    method?: string;
    property?: string;
    code?: string;
  };
  description: string;
}

/**
 * Mappings for common design object types
 */
export const OBJECT_TYPE_MAPPINGS: Record<DesignObjectType, ConceptMapping> = {
  [DesignObjectType.RECTANGLE]: {
    universalConcept: 'rectangle',
    coreldraw: {
      method: 'CreateRectangle',
      objectPath: 'ActivePage',
    },
    blender: {
      method: 'primitive_cube_add',
      objectPath: 'bpy.ops.mesh',
    },
    description: 'A four-sided shape with straight sides and right angles',
  },
  [DesignObjectType.CIRCLE]: {
    universalConcept: 'circle',
    coreldraw: {
      method: 'CreateEllipse',
      objectPath: 'ActivePage',
    },
    blender: {
      method: 'primitive_cylinder_add',
      objectPath: 'bpy.ops.mesh',
      code: 'bpy.ops.mesh.primitive_circle_add()',
    },
    description: 'A perfectly round shape',
  },
  [DesignObjectType.ELLIPSE]: {
    universalConcept: 'ellipse',
    coreldraw: {
      method: 'CreateEllipse',
      objectPath: 'ActivePage',
    },
    blender: {
      code: 'bpy.ops.mesh.primitive_circle_add(vertices=32)',
      objectPath: 'bpy.ops.mesh',
    },
    description: 'An oval shape',
  },
  [DesignObjectType.POLYGON]: {
    universalConcept: 'polygon',
    coreldraw: {
      method: 'CreatePolygon',
      objectPath: 'ActivePage',
    },
    blender: {
      code: 'bpy.ops.mesh.primitive_regular_polygon_add()',
      objectPath: 'bpy.ops.mesh',
    },
    description: 'A multi-sided shape with straight edges',
  },
  [DesignObjectType.TEXT]: {
    universalConcept: 'text',
    coreldraw: {
      method: 'CreateArtisticText',
      objectPath: 'ActivePage',
    },
    blender: {
      code: 'bpy.ops.object.text_add()',
      objectPath: 'bpy.ops.object',
    },
    description: 'Text content that can be styled and placed in the design',
  },
  [DesignObjectType.LINE]: {
    universalConcept: 'line',
    coreldraw: {
      method: 'CreateLineSegment',
      objectPath: 'ActivePage',
    },
    blender: {
      code: 'bpy.ops.curve.primitive_nurbs_curve_add()',
      objectPath: 'bpy.ops.curve',
    },
    description: 'A straight line connecting two points',
  },
  [DesignObjectType.PATH]: {
    universalConcept: 'path',
    coreldraw: {
      method: 'CreateBezier',
      objectPath: 'ActivePage',
    },
    blender: {
      code: 'bpy.ops.curve.primitive_bezier_curve_add()',
      objectPath: 'bpy.ops.curve',
    },
    description: 'A curve or path with control points',
  },
  [DesignObjectType.GROUP]: {
    universalConcept: 'group',
    coreldraw: {
      method: 'Group',
      objectPath: 'ActiveShape',
    },
    blender: {
      code: 'bpy.ops.object.group_link()',
      objectPath: 'bpy.ops.object',
    },
    description: 'A collection of objects treated as a single entity',
  },
  [DesignObjectType.IMAGE]: {
    universalConcept: 'image',
    coreldraw: {
      method: 'ImportBitmap',
      objectPath: 'ActivePage',
    },
    blender: {
      code: 'bpy.ops.import_image.to_plane()',
      objectPath: 'bpy.ops.import_image',
    },
    description: 'An imported bitmap or raster image',
  },
  [DesignObjectType.CURVE]: {
    universalConcept: 'curve',
    coreldraw: {
      method: 'CreateCurve',
      objectPath: 'ActivePage',
    },
    blender: {
      code: 'bpy.ops.curve.primitive_nurbs_curve_add()',
      objectPath: 'bpy.ops.curve',
    },
    description: 'A curved or non-linear path',
  },
};

/**
 * Mappings for common design operations
 */
export const OPERATION_MAPPINGS: Record<DesignOperation, ConceptMapping> = {
  [DesignOperation.CREATE]: {
    universalConcept: 'create',
    coreldraw: {},
    blender: {},
    description: 'Create a new object',
  },
  [DesignOperation.MODIFY]: {
    universalConcept: 'modify',
    coreldraw: {},
    blender: {},
    description: 'Modify an existing object',
  },
  [DesignOperation.DELETE]: {
    universalConcept: 'delete',
    coreldraw: {
      method: 'Delete',
      objectPath: 'Shape',
    },
    blender: {
      code: 'bpy.ops.object.delete()',
      objectPath: 'bpy.ops.object',
    },
    description: 'Delete an object',
  },
  [DesignOperation.SELECT]: {
    universalConcept: 'select',
    coreldraw: {
      method: 'Selected',
      property: 'Selected',
      objectPath: 'Shape',
    },
    blender: {
      method: 'select_set',
      objectPath: 'Object',
      code: 'obj.select_set(True)',
    },
    description: 'Select an object or objects',
  },
  [DesignOperation.GROUP]: {
    universalConcept: 'group',
    coreldraw: {
      method: 'Group',
      objectPath: 'ActiveSelection',
    },
    blender: {
      code: 'bpy.ops.object.group_link()',
      objectPath: 'bpy.ops.object',
    },
    description: 'Group multiple objects together',
  },
  [DesignOperation.UNGROUP]: {
    universalConcept: 'ungroup',
    coreldraw: {
      method: 'Ungroup',
      objectPath: 'Shape',
    },
    blender: {
      code: 'bpy.ops.object.group_remove()',
      objectPath: 'bpy.ops.object',
    },
    description: 'Separate a group into individual objects',
  },
  [DesignOperation.ALIGN]: {
    universalConcept: 'align',
    coreldraw: {
      code: 'ActiveDocument.AlignToCenterOfPage()',
    },
    blender: {
      code: 'bpy.ops.object.align()',
      objectPath: 'bpy.ops.object',
    },
    description: 'Align objects relative to each other or to the page/scene',
  },
  [DesignOperation.DISTRIBUTE]: {
    universalConcept: 'distribute',
    coreldraw: {
      code: 'ActiveDocument.DistributeHorizontally()',
    },
    blender: {
      code: 'bpy.ops.object.distribute()',
      objectPath: 'bpy.ops.object',
    },
    description: 'Distribute objects evenly',
  },
  [DesignOperation.TRANSFORM]: {
    universalConcept: 'transform',
    coreldraw: {
      code: 'Shape.Move(dx, dy)',
    },
    blender: {
      code: 'bpy.ops.transform.translate()',
      objectPath: 'bpy.ops.transform',
    },
    description: 'Move, scale, or rotate objects',
  },
};

/**
 * Basic shape concepts shared between platforms
 */
export const SHAPE_CONCEPTS: Record<string, DesignConcept> = {
  'rectangle': {
    concept: 'rectangle',
    description: 'A four-sided shape with straight sides where all interior angles are 90°',
    corelDrawMapping: 'CreateRectangle',
    blenderMapping: 'bpy.ops.mesh.primitive_cube_add',
    parameters: [
      { 
        name: 'width', 
        type: 'number', 
        description: 'Width of the rectangle',
        corelDrawParam: 'width',
        blenderParam: 'scale.x',
        defaultValue: 100
      },
      { 
        name: 'height', 
        type: 'number', 
        description: 'Height of the rectangle',
        corelDrawParam: 'height',
        blenderParam: 'scale.y',
        defaultValue: 100
      },
      {
        name: 'x',
        type: 'number',
        description: 'X position',
        corelDrawParam: 'x',
        blenderParam: 'location[0]',
        defaultValue: 0
      },
      {
        name: 'y',
        type: 'number',
        description: 'Y position',
        corelDrawParam: 'y',
        blenderParam: 'location[1]',
        defaultValue: 0
      },
      {
        name: 'fillColor',
        type: 'string',
        description: 'Fill color of the shape',
        corelDrawParam: 'fill',
        blenderParam: 'material.color',
        defaultValue: '#FF0000'
      }
    ]
  },
  'circle': {
    concept: 'circle',
    description: 'A perfectly round shape',
    corelDrawMapping: 'CreateEllipse',
    blenderMapping: 'bpy.ops.mesh.primitive_uv_sphere_add',
    parameters: [
      {
        name: 'radius',
        type: 'number',
        description: 'Radius of the circle',
        corelDrawParam: 'width', // In CorelDRAW we use width/height with equal values
        blenderParam: 'radius',
        defaultValue: 50
      },
      {
        name: 'x',
        type: 'number',
        description: 'X position',
        corelDrawParam: 'x',
        blenderParam: 'location[0]',
        defaultValue: 0
      },
      {
        name: 'y',
        type: 'number',
        description: 'Y position',
        corelDrawParam: 'y',
        blenderParam: 'location[1]',
        defaultValue: 0
      },
      {
        name: 'fillColor',
        type: 'string',
        description: 'Fill color of the shape',
        corelDrawParam: 'fill',
        blenderParam: 'material.color',
        defaultValue: '#0000FF'
      }
    ]
  },
  'text': {
    concept: 'text',
    description: 'Text content on the canvas',
    corelDrawMapping: 'CreateArtisticText',
    blenderMapping: 'bpy.ops.object.text_add',
    parameters: [
      {
        name: 'content',
        type: 'string',
        description: 'The text content',
        corelDrawParam: 'text',
        blenderParam: 'body',
        defaultValue: 'Text'
      },
      {
        name: 'x',
        type: 'number',
        description: 'X position',
        corelDrawParam: 'x',
        blenderParam: 'location[0]',
        defaultValue: 0
      },
      {
        name: 'y',
        type: 'number',
        description: 'Y position',
        corelDrawParam: 'y',
        blenderParam: 'location[1]',
        defaultValue: 0
      },
      {
        name: 'fontSize',
        type: 'number',
        description: 'Font size',
        corelDrawParam: 'fontSize',
        blenderParam: 'size',
        defaultValue: 12
      },
      {
        name: 'fontName',
        type: 'string',
        description: 'Font name',
        corelDrawParam: 'fontName',
        blenderParam: 'font',
        defaultValue: 'Arial'
      }
    ]
  }
};

/**
 * Material concepts shared between platforms
 */
export const MATERIAL_CONCEPTS: Record<string, DesignConcept> = {
  'solidColor': {
    concept: 'solidColor',
    description: 'A solid color material',
    corelDrawMapping: 'Fill.ApplyUniformFill',
    blenderMapping: 'Material.diffuse_color',
    parameters: [
      {
        name: 'color',
        type: 'string',
        description: 'Color value (hex or RGB)',
        corelDrawParam: 'color',
        blenderParam: 'color',
        defaultValue: '#FF0000'
      },
      {
        name: 'opacity',
        type: 'number',
        description: 'Opacity/transparency (0-1)',
        corelDrawParam: 'transparency',
        blenderParam: 'alpha',
        defaultValue: 1
      }
    ]
  },
  'gradient': {
    concept: 'gradient',
    description: 'A gradient fill/material',
    corelDrawMapping: 'Fill.ApplyFountainFill',
    blenderMapping: 'ShaderNodeGradientTexture',
    parameters: [
      {
        name: 'startColor',
        type: 'string',
        description: 'Starting color of gradient',
        corelDrawParam: 'startColor',
        blenderParam: 'colorRamp[0].color',
        defaultValue: '#FFFFFF'
      },
      {
        name: 'endColor',
        type: 'string',
        description: 'Ending color of gradient',
        corelDrawParam: 'endColor',
        blenderParam: 'colorRamp[1].color',
        defaultValue: '#000000'
      },
      {
        name: 'angle',
        type: 'number',
        description: 'Angle of the gradient',
        corelDrawParam: 'angle',
        blenderParam: 'rotation',
        defaultValue: 0
      }
    ]
  }
};

/**
 * Operation concepts shared between platforms
 */
export const OPERATION_CONCEPTS: Record<string, DesignConcept> = {
  'select': {
    concept: 'select',
    description: 'Select objects in the document',
    corelDrawMapping: 'Range.AddToSelection',
    blenderMapping: 'bpy.ops.object.select_all',
    parameters: [
      {
        name: 'type',
        type: 'string',
        description: 'Type of objects to select',
        corelDrawParam: 'type',
        blenderParam: 'type',
        defaultValue: null
      },
      {
        name: 'name',
        type: 'string',
        description: 'Name of objects to select',
        corelDrawParam: 'name',
        blenderParam: 'name',
        defaultValue: null
      },
      {
        name: 'all',
        type: 'boolean',
        description: 'Select all objects',
        corelDrawParam: 'all',
        blenderParam: 'action',
        defaultValue: false
      }
    ]
  },
  'group': {
    concept: 'group',
    description: 'Group selected objects together',
    corelDrawMapping: 'CreateGroup',
    blenderMapping: 'bpy.ops.object.parent_set',
    parameters: [
      {
        name: 'name',
        type: 'string',
        description: 'Name for the group',
        corelDrawParam: 'name',
        blenderParam: 'name',
        defaultValue: 'Group'
      }
    ]
  },
  'move': {
    concept: 'move',
    description: 'Move objects to a new position',
    corelDrawMapping: 'MoveToPosition',
    blenderMapping: 'bpy.ops.transform.translate',
    parameters: [
      {
        name: 'x',
        type: 'number',
        description: 'X position',
        corelDrawParam: 'x',
        blenderParam: 'value[0]',
        defaultValue: 0
      },
      {
        name: 'y',
        type: 'number',
        description: 'Y position',
        corelDrawParam: 'y',
        blenderParam: 'value[1]',
        defaultValue: 0
      },
      {
        name: 'z',
        type: 'number',
        description: 'Z position (Blender only)',
        blenderParam: 'value[2]',
        defaultValue: 0
      }
    ]
  }
};

/**
 * All concepts combined
 */
export const ALL_CONCEPTS: Record<string, DesignConcept> = {
  ...SHAPE_CONCEPTS,
  ...MATERIAL_CONCEPTS,
  ...OPERATION_CONCEPTS
};

/**
 * Service for mapping between universal design concepts and platform-specific code
 */
@Injectable()
export class DesignConceptMapper {
  private readonly logger = new Logger(DesignConceptMapper.name);
  
  /**
   * Find a concept by name or alias
   */
  findConcept(conceptName: string): DesignConcept | null {
    // Direct match
    if (ALL_CONCEPTS[conceptName]) {
      return ALL_CONCEPTS[conceptName];
    }

    // Check aliases and similar terms
    const normalizedName = conceptName.toLowerCase().trim();
    
    // Check for approximate matches
    const possibleMatches = Object.entries(ALL_CONCEPTS).filter(([key, concept]) => {
      // Check if the concept name contains the query
      if (key.toLowerCase().includes(normalizedName)) return true;
      
      // Check if the description contains the query
      if (concept.description.toLowerCase().includes(normalizedName)) return true;
      
      return false;
    });
    
    if (possibleMatches.length > 0) {
      // Return the first match
      return possibleMatches[0][1];
    }
    
    return null;
  }
  
  /**
   * Get platform-specific parameters from a concept
   */
  mapParameters(
    concept: DesignConcept, 
    platform: 'coreldraw' | 'blender',
    userParams: Record<string, any> = {}
  ): Record<string, any> {
    const result: Record<string, any> = {};
    
    // Handle parameters according to platform
    concept.parameters?.forEach(param => {
      const paramName = platform === 'coreldraw' ? param.corelDrawParam : param.blenderParam;
      const userValue = userParams[param.name];
      
      // Skip parameters that don't apply to this platform
      if (!paramName) return;
      
      // Use user value if provided, otherwise use default
      if (userValue !== undefined) {
        result[paramName] = userValue;
      } else if (param.defaultValue !== undefined) {
        result[paramName] = param.defaultValue;
      }
    });
    
    return result;
  }
  
  /**
   * Map a design concept to platform-specific code
   */
  mapConceptToCode(
    conceptName: string,
    platform: 'coreldraw' | 'blender',
    parameters: Record<string, any> = {}
  ): string {
    this.logger.debug(`Mapping concept ${conceptName} to ${platform} code`);
    
    // Find the concept definition
    const concept = this.findConcept(conceptName);
    if (!concept) {
      throw new Error(`Unknown design concept: ${conceptName}`);
    }
    
    // Get the platform-specific mapping
    const mapping = platform === 'coreldraw' 
      ? concept.corelDrawMapping 
      : concept.blenderMapping;
    
    if (!mapping) {
      throw new Error(`Concept ${conceptName} is not supported on ${platform}`);
    }
    
    // Map parameters to platform-specific format
    const mappedParams = this.mapParameters(concept, platform, parameters);
    
    // Generate code based on platform
    if (platform === 'coreldraw') {
      return this.generateCorelDrawCode(mapping as string, mappedParams);
    } else {
      return this.generateBlenderCode(mapping as string, mappedParams);
    }
  }
  
  /**
   * Generate code for CorelDRAW
   */
  private generateCorelDrawCode(mapping: string, params: Record<string, any>): string {
    let code = '';
    
    // Handle different CorelDRAW functions
    if (mapping === 'CreateRectangle') {
      const { x = 0, y = 0, width = 100, height = 100, fill } = params;
      
      code = `
        Dim rect As Shape
        Set rect = ActivePage.CreateRectangle(${x}, ${y}, ${width}, ${height})
        
        ${fill ? `rect.Fill.ApplyUniformFill "${fill}"` : ''}
        
        Set CreateRectangleShape = rect
      `;
    } 
    else if (mapping === 'CreateEllipse') {
      const { x = 0, y = 0, width = 100, height = width, fill } = params;
      
      code = `
        Dim ellipse As Shape
        Set ellipse = ActivePage.CreateEllipse(${x}, ${y}, ${width}, ${height})
        
        ${fill ? `ellipse.Fill.ApplyUniformFill "${fill}"` : ''}
        
        Set CreateEllipseShape = ellipse
      `;
    }
    else if (mapping === 'CreateArtisticText') {
      const { x = 0, y = 0, text = 'Text', fontSize = 12, fontName = 'Arial', fill = '#000000' } = params;
      
      code = `
        Dim textShape As Shape
        Set textShape = ActivePage.CreateArtisticText(${x}, ${y}, "${text}", , , "${fontName}", ${fontSize})
        
        ${fill ? `textShape.Fill.ApplyUniformFill "${fill}"` : ''}
        
        Set CreateTextShape = textShape
      `;
    }
    else {
      // Generic handling for other functions
      const paramString = Object.entries(params)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key}:="${value}"`;
          } else {
            return `${key}:=${value}`;
          }
        })
        .join(', ');
      
      code = `${mapping} ${paramString}`;
    }
      
      return code;
  }
  
  /**
   * Generate code for Blender
   */
  private generateBlenderCode(mapping: string, params: Record<string, any>): string {
    // Format parameters for Python
    const formattedParams = Object.entries(params)
      .map(([key, value]) => {
        if (typeof value === 'string') {
          // Handle arrays in parameter names (e.g., location[0])
          if (key.includes('[')) {
            const [baseKey, index] = key.split('[');
            return `${baseKey}[${index.replace(']', '')}] = "${value}"`;
          }
          return `${key}="${value}"`;
        } else if (Array.isArray(value)) {
          return `${key}=(${value.join(', ')})`;
        } else {
          return `${key}=${value}`;
        }
      })
      .join(', ');
    
    // Handle specific Blender operators
    if (mapping.startsWith('bpy.ops')) {
      return `${mapping}(${formattedParams})`;
    } 
    // Handle material assignment
    else if (mapping.includes('Material')) {
      const materialCode = `
        import bpy
        
        # Get active object
        obj = bpy.context.active_object
        
        # Create or get material
        mat_name = "Material"
        mat = bpy.data.materials.get(mat_name) or bpy.data.materials.new(mat_name)
        mat.use_nodes = True
        
        # Assign material properties
        ${this.generateBlenderMaterialCode(params)}
        
        # Assign material to object
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
      `;
      
      return materialCode;
    }
    // Generic property assignment
    else {
      return `${mapping} = ${formattedParams}`;
    }
  }
  
  /**
   * Generate Blender material-specific code
   */
  private generateBlenderMaterialCode(params: Record<string, any>): string {
    const { color = '#FF0000', metallic = 0, roughness = 0.5, transmission = 0 } = params;
    
    // Convert hex to RGB if needed
    let colorValues = color;
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;
      colorValues = `${r}, ${g}, ${b}, 1.0`;
    }
    
    return `
      # Get the principled BSDF node
      if mat.node_tree:
          principled = mat.node_tree.nodes.get("Principled BSDF")
          if principled:
              principled.inputs["Base Color"].default_value = (${colorValues})
              principled.inputs["Metallic"].default_value = ${metallic}
              principled.inputs["Roughness"].default_value = ${roughness}
              principled.inputs["Transmission"].default_value = ${transmission}
    `;
  }
  
  /**
   * Map semantic input to the closest design concept
   */
  findConceptFromInput(input: string): { concept: DesignConcept; confidence: number } | null {
    const normalizedInput = input.toLowerCase().trim();
    
    // Define some keyword mappings to recognize intents
    const conceptKeywords: Record<string, string[]> = {
      'rectangle': ['rectangle', 'rect', 'box', 'square', 'rechthoek', 'vierkant'],
      'circle': ['circle', 'ellipse', 'oval', 'round', 'cirkel', 'ovaal', 'rond'],
      'text': ['text', 'label', 'caption', 'tekst', 'label'],
      'select': ['select', 'choose', 'pick', 'selecteer', 'kies'],
      'group': ['group', 'combine', 'join', 'groepeer', 'combineer'],
      'move': ['move', 'translate', 'position', 'place', 'verplaats', 'positioneer']
    };
    
    // Check for direct keyword matches
    for (const [conceptName, keywords] of Object.entries(conceptKeywords)) {
      for (const keyword of keywords) {
        if (normalizedInput.includes(keyword)) {
          return { 
            concept: ALL_CONCEPTS[conceptName], 
            confidence: 0.8 
          };
        }
      }
    }
    
    // Simple fuzzy matching based on word similarity
    let bestMatch: { concept: DesignConcept; similarity: number } | null = null;
    
    for (const [name, concept] of Object.entries(ALL_CONCEPTS)) {
      // Calculate simple string similarity
      const similarity = this.calculateStringSimilarity(normalizedInput, name.toLowerCase());
      
      // Check for description matches too
      const descSimilarity = this.calculateStringSimilarity(
        normalizedInput, 
        concept.description.toLowerCase()
      );
      
      const maxSimilarity = Math.max(similarity, descSimilarity);
      
      if (!bestMatch || maxSimilarity > bestMatch.similarity) {
        bestMatch = { concept, similarity: maxSimilarity };
      }
    }
    
    // Return if we found a reasonable match
    if (bestMatch && bestMatch.similarity > 0.3) {
      return {
        concept: bestMatch.concept,
        confidence: bestMatch.similarity
      };
    }
    
    return null;
  }
  
  /**
   * Simple string similarity calculation (0-1)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    // Very simple implementation - can be replaced with more sophisticated algorithms
    const words1 = str1.split(/\s+/);
    const words2 = str2.split(/\s+/);
    
    let matches = 0;
    
    // Count matching words
    for (const word1 of words1) {
      if (word1.length < 3) continue; // Skip very short words
      
      for (const word2 of words2) {
        if (word2.length < 3) continue;
        
        if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
          matches++;
          break;
        }
      }
    }
    
    // Calculate similarity score
    return matches / Math.max(words1.length, words2.length);
  }
  
  /**
   * Extract parameter values from natural language input
   */
  extractParameters(
    input: string, 
    concept: DesignConcept
  ): Record<string, any> {
    const params: Record<string, any> = {};
    
    // Check for each parameter type in the input
    concept.parameters?.forEach(param => {
      // Skip if no parameter name is defined
      if (!param.name) return;
      
      const normalizedInput = input.toLowerCase();
      
      // Handle different parameter types
      switch (param.type) {
        case 'number':
          // Try to find numbers associated with this parameter
          const numberRegex = new RegExp(`${param.name}\\s*[=:]?\\s*(\\d+(\\.\\d+)?)`, 'i');
          const dimensionRegex = new RegExp(`(\\d+(\\.\\d+)?)\\s*(${param.name})`, 'i');
          
          const numberMatch = normalizedInput.match(numberRegex) || normalizedInput.match(dimensionRegex);
          if (numberMatch) {
            params[param.name] = parseFloat(numberMatch[1]);
          }
          break;
          
        case 'string':
          // Try to find quoted strings or words associated with this parameter
          const stringRegex = new RegExp(`${param.name}\\s*[=:]?\\s*["']([^"']+)["']`, 'i');
          const wordRegex = new RegExp(`${param.name}\\s*[=:]?\\s*(\\w+)`, 'i');
          
          const stringMatch = normalizedInput.match(stringRegex) || normalizedInput.match(wordRegex);
          if (stringMatch) {
            params[param.name] = stringMatch[1];
          }
          break;
          
        case 'boolean':
          // Check for boolean indicators
          const booleanTerms = [param.name, `${param.name}=true`, `${param.name}:true`];
          const negativeTerms = [`no ${param.name}`, `not ${param.name}`, `${param.name}=false`, `${param.name}:false`];
          
          const hasPositive = booleanTerms.some(term => normalizedInput.includes(term.toLowerCase()));
          const hasNegative = negativeTerms.some(term => normalizedInput.includes(term.toLowerCase()));
          
          if (hasPositive && !hasNegative) {
            params[param.name] = true;
          } else if (hasNegative && !hasPositive) {
            params[param.name] = false;
          }
          break;
          
        default:
          // For other types, use default handling
          break;
      }
    });
    
    // Handle color values specially (common in design)
    const colorRegex = /#[0-9A-Fa-f]{6}/;
    const colorMatch = input.match(colorRegex);
    if (colorMatch) {
      // Find which parameter is likely to be a color
      const colorParam = concept.parameters?.find(p => 
        p.name.toLowerCase().includes('color') || 
        p.name.toLowerCase().includes('fill') ||
        p.description?.toLowerCase().includes('color')
      );
      
      if (colorParam) {
        params[colorParam.name] = colorMatch[0];
      }
    }
    
    return params;
  }
}

/**
 * Common interfaces and types for design elements across different platforms
 */

/**
 * Position information for a design element
 */
export interface Position {
  x: number;
  y: number;
  z?: number;
}

/**
 * Dimensions of a design element
 */
export interface Dimensions {
  width: number;
  height: number;
  depth?: number;
}

/**
 * Color information, can be string or RGB/RGBA object
 */
export type Color = string | {
  r: number;
  g: number;
  b: number;
  a?: number;
};

/**
 * Style properties for a design element
 */
export interface ElementStyle {
  fillColor?: Color;
  strokeColor?: Color;
  strokeWidth?: number;
  opacity?: number;
  font?: string;
  fontSize?: number;
  fontWeight?: string | number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  [key: string]: any; // Allow for platform-specific style properties
}

/**
 * Universal design element interface
 */
export interface DesignElement {
  id: string;
  type: string;
  name?: string;
  position?: Position;
  dimensions?: Dimensions;
  rotation?: number;
  style?: ElementStyle;
  children?: string[];
  parentId?: string;
  layerId?: string;
  locked?: boolean;
  visible?: boolean;
  selected?: boolean;
  metadata?: Record<string, any>;
  platformSpecific?: Record<string, any>;
}

/**
 * Describes the spatial relationship between two design elements
 */
export interface ElementSpatialRelationship {
  distance: number;
  overlapping: boolean;
  direction: string;
  horizontallyAligned: boolean;
  verticallyAligned: boolean;
}

/**
 * Describes the style relationship between two design elements
 */
export interface ElementStyleRelationship {
  similarity: number;
  matchingProperties: string[];
}

/**
 * Describes a grouping of design elements
 */
export interface ElementGroup {
  id: string;
  name?: string;
  elementIds: string[];
  groupType?: string;
}

/**
 * Describes a layer in the document
 */
export interface DesignLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  elementIds?: string[];
}

/**
 * Document dimensions and properties
 */
export interface DocumentProperties {
  width: number;
  height: number;
  units: string;
  name?: string;
  backgroundColor?: Color;
} 