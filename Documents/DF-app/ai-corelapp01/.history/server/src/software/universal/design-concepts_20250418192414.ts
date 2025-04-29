/**
 * Design Concepts
 * 
 * Defines common design concepts and mappings to platform-specific objects
 * to enable more natural interaction with design software.
 */

import { Injectable, Logger } from '@nestjs/common';

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
 * Service to find and map between universal design concepts and platform-specific implementations
 */
@Injectable()
export class DesignConceptMapper {
  private readonly logger = new Logger(DesignConceptMapper.name);
  
  /**
   * Find the platform-specific implementation of a universal concept
   * 
   * @param concept The universal concept name
   * @param platform The target platform
   * @returns The platform-specific mapping
   */
  mapConceptToPlatform(
    concept: string,
    platform: 'coreldraw' | 'blender'
  ): any {
    // Check object type mappings
    const objectTypeMatch = Object.values(OBJECT_TYPE_MAPPINGS).find(
      mapping => mapping.universalConcept.toLowerCase() === concept.toLowerCase()
    );
    
    if (objectTypeMatch) {
      return objectTypeMatch[platform];
    }
    
    // Check operation mappings
    const operationMatch = Object.values(OPERATION_MAPPINGS).find(
      mapping => mapping.universalConcept.toLowerCase() === concept.toLowerCase()
    );
    
    if (operationMatch) {
      return operationMatch[platform];
    }
    
    this.logger.warn(`No mapping found for concept: ${concept} on platform: ${platform}`);
    return null;
  }
  
  /**
   * Generate platform-specific code for a universal concept with parameters
   * 
   * @param concept The universal concept
   * @param platform The target platform
   * @param params The parameters for the operation
   * @returns Platform-specific code
   */
  generateCode(
    concept: string,
    platform: 'coreldraw' | 'blender',
    params: Record<string, any> = {}
  ): string {
    const mapping = this.mapConceptToPlatform(concept, platform);
    
    if (!mapping) {
      throw new Error(`No mapping found for concept: ${concept} on platform: ${platform}`);
    }
    
    if (mapping.code) {
      // If there's pre-defined code, use it as a template
      let code = mapping.code;
      
      // Replace parameter placeholders
      Object.entries(params).forEach(([key, value]) => {
        code = code.replace(`{${key}}`, String(value));
      });
      
      return code;
    } else if (mapping.method && mapping.objectPath) {
      // Generate code from method and object path
      if (platform === 'coreldraw') {
        let args = '';
        if (params) {
          args = Object.values(params).map(val => {
            if (typeof val === 'string') return `"${val}"`;
            return val;
          }).join(', ');
        }
        return `${mapping.objectPath}.${mapping.method}(${args})`;
      } else if (platform === 'blender') {
        let args = '';
        if (params) {
          args = Object.entries(params).map(([key, val]) => {
            if (typeof val === 'string') return `${key}="${val}"`;
            return `${key}=${val}`;
          }).join(', ');
        }
        return `${mapping.objectPath}.${mapping.method}(${args})`;
      }
    }
    
    throw new Error(`Unable to generate code for concept: ${concept} on platform: ${platform}`);
  }
} 