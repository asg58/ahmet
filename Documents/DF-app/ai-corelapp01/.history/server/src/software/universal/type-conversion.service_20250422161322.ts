import { Injectable, Logger } from '@nestjs/common';

// Type definition voor de bron types en target types
export type SourceType = 
  | 'string' 
  | 'number' 
  | 'bigint' 
  | 'boolean' 
  | 'symbol' 
  | 'undefined' 
  | 'object' 
  | 'function'
  | 'array'
  | 'null'
  | 'color'
  | 'vector';

export type TargetType = string;

interface ColorValue {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface VectorValue {
  x: number;
  y: number;
  z?: number;
}

@Injectable()
export class TypeConversionService {
  private readonly logger = new Logger(TypeConversionService.name);
  
  /**
   * Convert a value from source type to target type
   */
  convert(value: any, sourceType: SourceType, targetType: TargetType): any {
    this.logger.debug(`Converting value from ${sourceType} to ${targetType}`);
    
    // No conversion needed if types match
    if (sourceType === targetType) {
      return value;
    }
    
    // Handle basic type conversions
    if (sourceType === 'string') {
      return this.convertFromString(value, targetType);
    } else if (sourceType === 'number') {
      return this.convertFromNumber(value, targetType);
    } else if (sourceType === 'boolean') {
      return this.convertFromBoolean(value, targetType);
    } else if (sourceType === 'object') {
      return this.convertFromObject(value, targetType);
    } else if (sourceType === 'array') {
      return this.convertFromArray(value, targetType);
    } else if (sourceType === 'color') {
      return this.convertFromColor(value, targetType);
    } else if (sourceType === 'vector') {
      return this.convertFromVector(value, targetType);
    } else if (sourceType === 'null') {
      // Handle null values based on target type
      switch (targetType) {
        case 'string': return '';
        case 'number': return 0;
        case 'boolean': return false;
        case 'array': return [];
        case 'object': return {};
        case 'color': return { r: 0, g: 0, b: 0, a: 1 };
        case 'vector': return { x: 0, y: 0 };
        default: return null;
      }
    }
    
    // Default - return as is with warning
    this.logger.warn(`No conversion defined from ${sourceType} to ${targetType}`);
    return value;
  }
  
  private convertFromString(value: string, targetType: string): any {
    switch (targetType) {
      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          this.logger.warn(`Failed to convert string '${value}' to number`);
          return 0;
        }
        return num;
        
      case 'boolean':
        return value.toLowerCase() === 'true' || value === '1';
        
      case 'array':
        try {
          // Try to parse as JSON array
          if (value.startsWith('[') && value.endsWith(']')) {
            return JSON.parse(value);
          }
          // Comma-separated values
          return value.split(',').map(item => item.trim());
        } catch (error) {
          this.logger.warn(`Failed to convert string '${value}' to array: ${error.message}`);
          return [];
        }
        
      case 'object':
        try {
          return JSON.parse(value);
        } catch (error) {
          this.logger.warn(`Failed to convert string '${value}' to object: ${error.message}`);
          return {};
        }
        
      case 'color':
        return this.parseColorString(value);
        
      case 'vector':
        return this.parseVectorString(value);
        
      default:
        return value;
    }
  }
  
  private parseColorString(value: string): ColorValue {
    // Handle hex color (#RRGGBB or #RRGGBBAA)
    if (value.startsWith('#')) {
      return this.parseHexColor(value);
    }
    
    // Handle rgb(r, g, b) or rgba(r, g, b, a) format
    if (value.startsWith('rgb')) {
      return this.parseRgbColor(value);
    }
    
    // Handle comma-separated values (r,g,b) or (r,g,b,a)
    if (value.includes(',')) {
      const parts = value.replace(/[()]/g, '').split(',').map(v => parseFloat(v.trim()));
      return {
        r: parts[0] || 0,
        g: parts[1] || 0,
        b: parts[2] || 0,
        a: parts.length > 3 ? parts[3] : 1
      };
    }
    
    // Default to black
    this.logger.warn(`Could not parse color string: ${value}`);
    return { r: 0, g: 0, b: 0, a: 1 };
  }
  
  private parseHexColor(value: string): ColorValue {
    let hex = value.replace('#', '');
    
    // Handle shorthand hex (#RGB)
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Handle alpha if present
    let a = 1;
    if (hex.length === 8) {
      a = parseInt(hex.substring(6, 8), 16) / 255;
    }
    
    return { r, g, b, a };
  }
  
  private parseRgbColor(value: string): ColorValue {
    // Extract values from rgb(r, g, b) or rgba(r, g, b, a)
    const parts = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d*(?:\.\d+)?))?\)/);
    
    if (!parts) {
      this.logger.warn(`Could not parse RGB color string: ${value}`);
      return { r: 0, g: 0, b: 0, a: 1 };
    }
    
    return {
      r: parseInt(parts[1], 10),
      g: parseInt(parts[2], 10),
      b: parseInt(parts[3], 10),
      a: parts[4] ? parseFloat(parts[4]) : 1
    };
  }
  
  private parseVectorString(value: string): VectorValue {
    // Handle (x, y, z) format
    if (value.includes(',')) {
      const parts = value.replace(/[()]/g, '').split(',').map(v => parseFloat(v.trim()));
      return {
        x: parts[0] || 0,
        y: parts[1] || 0,
        z: parts.length > 2 ? parts[2] : undefined
      };
    }
    
    // Handle JSON format
    if (value.includes('{') || value.includes('[')) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return {
            x: parsed[0] || 0,
            y: parsed[1] || 0,
            z: parsed.length > 2 ? parsed[2] : undefined
          };
        } else {
          return {
            x: parsed.x || 0,
            y: parsed.y || 0,
            z: parsed.z
          };
        }
      } catch (error) {
        this.logger.warn(`Failed to parse vector string as JSON: ${error.message}`);
      }
    }
    
    // Default to origin
    this.logger.warn(`Could not parse vector string: ${value}`);
    return { x: 0, y: 0 };
  }
  
  private convertFromNumber(value: number, targetType: string): any {
    switch (targetType) {
      case 'string':
        return value.toString();
        
      case 'boolean':
        return value !== 0;
        
      case 'color':
        // Interpret as grayscale value (0-255)
        const gray = Math.min(255, Math.max(0, Math.round(value)));
        return { r: gray, g: gray, b: gray, a: 1 };
        
      case 'vector':
        // Uniform vector
        return { x: value, y: value, z: value };
        
      default:
        return value;
    }
  }
  
  private convertFromBoolean(value: boolean, targetType: string): any {
    switch (targetType) {
      case 'string':
        return value ? 'true' : 'false';
        
      case 'number':
        return value ? 1 : 0;
        
      case 'color':
        return value ? { r: 255, g: 255, b: 255, a: 1 } : { r: 0, g: 0, b: 0, a: 1 };
        
      default:
        return value;
    }
  }
  
  private convertFromObject(value: Record<string, any>, targetType: string): any {
    switch (targetType) {
      case 'string':
        try {
          return JSON.stringify(value);
        } catch (error) {
          this.logger.warn(`Failed to convert object to string: ${error.message}`);
          return '{}';
        }
        
      case 'array':
        return Object.values(value);
        
      case 'color':
        if ('r' in value && 'g' in value && 'b' in value) {
          return {
            r: value.r || 0,
            g: value.g || 0,
            b: value.b || 0,
            a: value.a ?? 1
          };
        }
        this.logger.warn('Cannot convert object to color: missing RGB values');
        return { r: 0, g: 0, b: 0, a: 1 };
        
      case 'vector':
        if ('x' in value && 'y' in value) {
          return {
            x: value.x || 0,
            y: value.y || 0,
            z: value.z
          };
        }
        this.logger.warn('Cannot convert object to vector: missing x/y values');
        return { x: 0, y: 0 };
        
      default:
        return value;
    }
  }
  
  private convertFromArray(value: any[], targetType: string): any {
    switch (targetType) {
      case 'string':
        try {
          return JSON.stringify(value);
        } catch (error) {
          this.logger.warn(`Failed to convert array to string: ${error.message}`);
          return '[]';
        }
        
      case 'number':
        if (value.length > 0 && typeof value[0] === 'number') {
          return value[0];
        }
        this.logger.warn('Cannot convert array to number');
        return 0;
        
      case 'boolean':
        return value.length > 0;
        
      case 'color':
        if (value.length >= 3) {
          return {
            r: value[0] || 0,
            g: value[1] || 0,
            b: value[2] || 0,
            a: value.length > 3 ? value[3] : 1
          };
        }
        this.logger.warn('Cannot convert array to color: insufficient elements');
        return { r: 0, g: 0, b: 0, a: 1 };
        
      case 'vector':
        if (value.length >= 2) {
          return {
            x: value[0] || 0,
            y: value[1] || 0,
            z: value.length > 2 ? value[2] : undefined
          };
        }
        this.logger.warn('Cannot convert array to vector: insufficient elements');
        return { x: 0, y: 0 };
        
      case 'object':
        const obj: Record<string, any> = {};
        value.forEach((item, index) => {
          obj[`item${index}`] = item;
        });
        return obj;
        
      default:
        return value;
    }
  }
  
  private convertFromColor(value: ColorValue, targetType: string): any {
    switch (targetType) {
      case 'string':
        if ('a' in value && value.a !== 1) {
          return `rgba(${value.r}, ${value.g}, ${value.b}, ${value.a})`;
        }
        return `rgb(${value.r}, ${value.g}, ${value.b})`;
        
      case 'number':
        // Convert to grayscale using standard luminance formula
        return Math.round(0.299 * value.r + 0.587 * value.g + 0.114 * value.b);
        
      case 'array':
        if ('a' in value) {
          return [value.r, value.g, value.b, value.a];
        }
        return [value.r, value.g, value.b];
        
      case 'object':
        return { ...value };
        
      default:
        return value;
    }
  }
  
  private convertFromVector(value: VectorValue, targetType: string): any {
    switch (targetType) {
      case 'string':
        if ('z' in value) {
          return `(${value.x}, ${value.y}, ${value.z})`;
        }
        return `(${value.x}, ${value.y})`;
        
      case 'number':
        // Return magnitude (length) of vector
        if ('z' in value) {
          return Math.sqrt(value.x * value.x + value.y * value.y + value.z * value.z);
        }
        return Math.sqrt(value.x * value.x + value.y * value.y);
        
      case 'array':
        if ('z' in value) {
          return [value.x, value.y, value.z];
        }
        return [value.x, value.y];
        
      case 'object':
        return { ...value };
        
      default:
        return value;
    }
  }
} 