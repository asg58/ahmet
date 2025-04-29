import { Injectable, Logger } from '@nestjs/common';

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
  }>;
}

@Injectable()
export class ConceptMappingService {
  private readonly logger = new Logger(ConceptMappingService.name);
  private readonly concepts: Record<string, DesignConcept> = {
    'rectangle': {
      concept: 'rectangle',
      description: 'A four-sided shape with straight sides where all interior angles are 90°',
      corelDrawMapping: 'Page.CreateRectangle',
      blenderMapping: 'bpy.ops.mesh.primitive_cube_add',
      parameters: [
        { 
          name: 'width', 
          type: 'number', 
          description: 'Width of the rectangle',
          corelDrawParam: 'width',
          blenderParam: 'scale.x'
        },
        { 
          name: 'height', 
          type: 'number', 
          description: 'Height of the rectangle',
          corelDrawParam: 'height',
          blenderParam: 'scale.y'
        },
        { 
          name: 'x', 
          type: 'number', 
          description: 'X position',
          corelDrawParam: 'x',
          blenderParam: 'location[0]'
        },
        { 
          name: 'y', 
          type: 'number', 
          description: 'Y position',
          corelDrawParam: 'y',
          blenderParam: 'location[1]'
        }
      ]
    },
    'circle': {
      concept: 'circle',
      description: 'A perfectly round shape where all points are equidistant from the center',
      corelDrawMapping: 'Page.CreateEllipse',
      blenderMapping: 'bpy.ops.mesh.primitive_circle_add',
      parameters: [
        { 
          name: 'radius', 
          type: 'number', 
          description: 'Radius of the circle',
          corelDrawParam: 'width',
          blenderParam: 'radius'
        },
        { 
          name: 'x', 
          type: 'number', 
          description: 'X position of the center',
          corelDrawParam: 'x',
          blenderParam: 'location[0]'
        },
        { 
          name: 'y', 
          type: 'number', 
          description: 'Y position of the center',
          corelDrawParam: 'y',
          blenderParam: 'location[1]'
        }
      ]
    },
    'text': {
      concept: 'text',
      description: 'A textual element with specified content and formatting',
      corelDrawMapping: 'Page.CreateArtisticText',
      blenderMapping: 'bpy.ops.object.text_add',
      parameters: [
        { 
          name: 'content', 
          type: 'string', 
          description: 'Text content',
          corelDrawParam: 'text',
          blenderParam: 'body'
        },
        { 
          name: 'x', 
          type: 'number', 
          description: 'X position',
          corelDrawParam: 'x',
          blenderParam: 'location[0]'
        },
        { 
          name: 'y', 
          type: 'number', 
          description: 'Y position',
          corelDrawParam: 'y',
          blenderParam: 'location[1]'
        },
        { 
          name: 'fontSize', 
          type: 'number', 
          description: 'Font size',
          corelDrawParam: 'size',
          blenderParam: 'size'
        },
        { 
          name: 'fontName', 
          type: 'string', 
          description: 'Font name',
          corelDrawParam: 'font',
          blenderParam: 'font'
        }
      ]
    },
    'line': {
      concept: 'line',
      description: 'A straight line between two points',
      corelDrawMapping: 'Page.CreateLineSegment',
      blenderMapping: 'bpy.ops.mesh.primitive_line_add',
      parameters: [
        { 
          name: 'startX', 
          type: 'number', 
          description: 'Starting X coordinate',
          corelDrawParam: 'startX',
          blenderParam: 'start_position[0]'
        },
        { 
          name: 'startY', 
          type: 'number', 
          description: 'Starting Y coordinate',
          corelDrawParam: 'startY',
          blenderParam: 'start_position[1]'
        },
        { 
          name: 'endX', 
          type: 'number', 
          description: 'Ending X coordinate',
          corelDrawParam: 'endX',
          blenderParam: 'end_position[0]'
        },
        { 
          name: 'endY', 
          type: 'number', 
          description: 'Ending Y coordinate',
          corelDrawParam: 'endY',
          blenderParam: 'end_position[1]'
        }
      ]
    },
    'color': {
      concept: 'color',
      description: 'Change the color of a selected object',
      corelDrawMapping: 'Shape.Fill.UniformColor',
      blenderMapping: 'bpy.context.object.active_material.diffuse_color',
      parameters: [
        { 
          name: 'color', 
          type: 'color', 
          description: 'Color value',
          corelDrawParam: 'color',
          blenderParam: ''
        },
        { 
          name: 'r', 
          type: 'number', 
          description: 'Red component (0-255)',
          corelDrawParam: 'red',
          blenderParam: '[0]'
        },
        { 
          name: 'g', 
          type: 'number', 
          description: 'Green component (0-255)',
          corelDrawParam: 'green',
          blenderParam: '[1]'
        },
        { 
          name: 'b', 
          type: 'number', 
          description: 'Blue component (0-255)',
          corelDrawParam: 'blue',
          blenderParam: '[2]'
        }
      ]
    },
    'rotate': {
      concept: 'rotate',
      description: 'Rotate an object around its center or a specified point',
      corelDrawMapping: 'Shape.Rotate',
      blenderMapping: 'bpy.context.object.rotation_euler',
      parameters: [
        { 
          name: 'angle', 
          type: 'number', 
          description: 'Rotation angle in degrees',
          corelDrawParam: 'angle',
          blenderParam: '[2]'
        },
        { 
          name: 'centerX', 
          type: 'number', 
          description: 'X coordinate of rotation center',
          corelDrawParam: 'centerX',
          blenderParam: 'rotation_center_x'
        },
        { 
          name: 'centerY', 
          type: 'number', 
          description: 'Y coordinate of rotation center',
          corelDrawParam: 'centerY',
          blenderParam: 'rotation_center_y'
        }
      ]
    },
    'scale': {
      concept: 'scale',
      description: 'Resize an object by a factor or to specific dimensions',
      corelDrawMapping: 'Shape.Scale',
      blenderMapping: 'bpy.context.object.scale',
      parameters: [
        { 
          name: 'scaleX', 
          type: 'number', 
          description: 'Scale factor in X direction',
          corelDrawParam: 'scaleX',
          blenderParam: '[0]'
        },
        { 
          name: 'scaleY', 
          type: 'number', 
          description: 'Scale factor in Y direction',
          corelDrawParam: 'scaleY',
          blenderParam: '[1]'
        },
        { 
          name: 'scaleZ', 
          type: 'number', 
          description: 'Scale factor in Z direction (3D only)',
          corelDrawParam: '',
          blenderParam: '[2]'
        }
      ]
    },
    'move': {
      concept: 'move',
      description: 'Move an object to a new position',
      corelDrawMapping: 'Shape.Move',
      blenderMapping: 'bpy.context.object.location',
      parameters: [
        { 
          name: 'x', 
          type: 'number', 
          description: 'Target X coordinate',
          corelDrawParam: 'x',
          blenderParam: '[0]'
        },
        { 
          name: 'y', 
          type: 'number', 
          description: 'Target Y coordinate',
          corelDrawParam: 'y',
          blenderParam: '[1]'
        },
        { 
          name: 'z', 
          type: 'number', 
          description: 'Target Z coordinate (3D only)',
          corelDrawParam: '',
          blenderParam: '[2]'
        }
      ]
    }
  };
  
  /**
   * Get mapping for a concept on a specific platform
   */
  getConceptMapping(
    concept: string,
    platform: 'coreldraw' | 'blender'
  ): { objectPath: string; parameters: Record<string, any> } | null {
    const conceptInfo = this.concepts[concept.toLowerCase()];
    if (!conceptInfo) {
      return null;
    }
    
    let objectPath: string | null = null;
    const parameters: Record<string, any> = {};
    
    if (platform === 'coreldraw' && conceptInfo.corelDrawMapping) {
      objectPath = typeof conceptInfo.corelDrawMapping === 'string' 
        ? conceptInfo.corelDrawMapping 
        : conceptInfo.corelDrawMapping[0];
        
      // Map parameters
      conceptInfo.parameters?.forEach(param => {
        if (param.corelDrawParam && param.corelDrawParam.length > 0) {
          parameters[param.corelDrawParam] = `{${param.name}}`;  // Template for later substitution
        }
      });
    } else if (platform === 'blender' && conceptInfo.blenderMapping) {
      objectPath = typeof conceptInfo.blenderMapping === 'string' 
        ? conceptInfo.blenderMapping 
        : conceptInfo.blenderMapping[0];
        
      // Map parameters
      conceptInfo.parameters?.forEach(param => {
        if (param.blenderParam && param.blenderParam.length > 0) {
          parameters[param.blenderParam] = `{${param.name}}`;  // Template for later substitution
        }
      });
    }
    
    if (!objectPath) {
      return null;
    }
    
    return { objectPath, parameters };
  }
  
  /**
   * Get all available concepts
   */
  getAllConcepts(): string[] {
    return Object.keys(this.concepts);
  }
  
  /**
   * Get detailed information about a concept
   */
  getConceptInfo(concept: string): DesignConcept | null {
    return this.concepts[concept.toLowerCase()] || null;
  }
  
  /**
   * Find concepts that match a fuzzy search term
   */
  findConcepts(searchTerm: string): string[] {
    const lowerSearch = searchTerm.toLowerCase();
    
    return Object.keys(this.concepts).filter(concept => {
      const conceptInfo = this.concepts[concept];
      
      // Check for concept name match
      if (concept.includes(lowerSearch)) {
        return true;
      }
      
      // Check for match in description
      if (conceptInfo.description.toLowerCase().includes(lowerSearch)) {
        return true;
      }
      
      // Check for match in parameter names or descriptions
      if (conceptInfo.parameters?.some(param => 
        param.name.toLowerCase().includes(lowerSearch) || 
        (param.description && param.description.toLowerCase().includes(lowerSearch))
      )) {
        return true;
      }
      
      return false;
    });
  }
  
  /**
   * Map a natural language description to a concept
   */
  mapDescriptionToConcept(description: string): { 
    concept: string; 
    confidence: number;
    parameters?: Record<string, any>;
  } | null {
    const lowerDesc = description.toLowerCase();
    
    // Simple keyword matching for now
    // In a real implementation, this would use NLP or ML
    const matches: Array<{ concept: string; score: number; parameters?: Record<string, any> }> = [];
    
    for (const [concept, info] of Object.entries(this.concepts)) {
      let score = 0;
      const extractedParams: Record<string, any> = {};
      
      // Check for direct concept mention
      if (lowerDesc.includes(concept)) {
        score += 10;
      }
      
      // Check for keywords in description
      const keywords = info.description.toLowerCase().split(' ');
      for (const keyword of keywords) {
        if (keyword.length > 3 && lowerDesc.includes(keyword)) {
          score += 2;
        }
      }
      
      // Try to extract parameters
      if (info.parameters) {
        for (const param of info.parameters) {
          // Look for parameter mentions
          if (lowerDesc.includes(param.name.toLowerCase())) {
            score += 1;
            
            // Try to extract parameter value using simple regex patterns
            if (param.type === 'number') {
              const numberMatch = lowerDesc.match(
                new RegExp(`${param.name}\\s*[=:]?\\s*(\\d+(\\.\\d+)?)`)
              );
              if (numberMatch) {
                extractedParams[param.name] = parseFloat(numberMatch[1]);
              }
            } else if (param.type === 'string') {
              const stringMatch = lowerDesc.match(
                new RegExp(`${param.name}\\s*[=:]?\\s*["']([^"']*)["']`)
              );
              if (stringMatch) {
                extractedParams[param.name] = stringMatch[1];
              }
            } else if (param.type === 'color') {
              // Common color names
              const colorNames = ['red', 'green', 'blue', 'yellow', 'black', 'white', 'purple', 'orange'];
              for (const color of colorNames) {
                if (lowerDesc.includes(color)) {
                  extractedParams[param.name] = color;
                  break;
                }
              }
            }
          }
        }
      }
      
      if (score > 0) {
        matches.push({ 
          concept, 
          score,
          parameters: Object.keys(extractedParams).length > 0 ? extractedParams : undefined
        });
      }
    }
    
    // Return the best match
    if (matches.length > 0) {
      matches.sort((a, b) => b.score - a.score);
      const bestMatch = matches[0];
      
      return {
        concept: bestMatch.concept,
        confidence: Math.min(1, bestMatch.score / 20),  // Normalize to 0-1 range
        parameters: bestMatch.parameters
      };
    }
    
    return null;
  }
} 