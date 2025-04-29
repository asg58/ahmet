/**
 * DesignContext
 * 
 * This module defines the interfaces and classes for capturing and analyzing
 * the current context of a design document in CorelDRAW or Blender.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ObjectPath } from '../universal/universal-object-model';

/**
 * Represents a position in 2D or 3D space
 */
export interface Position {
  x: number;
  y: number;
  z?: number;
}

/**
 * Represents a size in 2D or 3D space
 */
export interface Size {
  width: number;
  height: number;
  depth?: number;
}

/**
 * Represents a color
 */
export interface Color {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a?: number; // 0-1
}

/**
 * Represents a design element (shape, object, etc.)
 */
export interface DesignElement {
  id: string;
  name: string;
  type: string;
  objectPath: ObjectPath;
  position: Position;
  size?: Size;
  rotation?: Position; // x, y, z rotation in degrees
  color?: Color;
  properties: Record<string, any>;
  children?: DesignElement[];
}

/**
 * Represents a layer in the design
 */
export interface Layer {
  id: string;
  name: string;
  objectPath: ObjectPath;
  visible: boolean;
  locked: boolean;
  elements: DesignElement[];
}

/**
 * Represents the current context of a design document
 */
export interface DesignContext {
  documentId: string;
  documentName: string;
  documentPath: ObjectPath;
  platform: 'coreldraw' | 'blender';
  size: Size;
  currentPage?: number; // For CorelDRAW
  currentFrame?: number; // For Blender
  layers: Layer[];
  selectedElements: DesignElement[];
  viewTransform: {
    zoom: number;
    panX: number;
    panY: number;
    rotation?: number;
  };
  screenshot?: string; // Base64 encoded image
  lastAction?: {
    type: string;
    description: string;
    timestamp: number;
  };
  // Extended contextual information
  metadata?: {
    creator?: string;
    created?: string;
    modified?: string;
    tags?: string[];
    description?: string;
  };
  // History of recent actions
  actionHistory?: Array<{
    type: string;
    description: string;
    timestamp: number;
    parameters?: Record<string, any>;
    success: boolean;
  }>;
  // Statistics about document
  statistics?: {
    totalElements: number;
    elementsByType: Record<string, number>;
    documentComplexity: 'simple' | 'medium' | 'complex';
  };
  // User intent (if available)
  userIntent?: {
    current: string;
    previous?: string;
    inferredGoal?: string;
  };
}

/**
 * Context capture options
 */
export interface ContextCaptureOptions {
  includeScreenshot?: boolean;
  includeHiddenLayers?: boolean;
  maxElementsPerLayer?: number;
  detailLevel?: 'minimal' | 'standard' | 'full';
}

/**
 * Context update (delta changes only)
 */
export interface ContextUpdate {
  timestamp: number;
  documentId: string;
  changes: {
    added?: DesignElement[];
    modified?: {
      id: string;
      properties: Record<string, any>;
    }[];
    removed?: string[]; // Element IDs
    selected?: string[]; // Element IDs
    deselected?: string[]; // Element IDs
    viewTransform?: Partial<DesignContext['viewTransform']>;
  };
  lastAction?: DesignContext['lastAction'];
}

/**
 * Design context analyzer abstract class
 */
export abstract class DesignContextAnalyzer {
  protected readonly logger = new Logger(this.constructor.name);
  
  /**
   * Get the current context of the design document
   */
  abstract captureContext(options?: ContextCaptureOptions): Promise<DesignContext>;
  
  /**
   * Start listening for context updates
   */
  abstract startContextTracking(callback: (update: ContextUpdate) => void): Promise<void>;
  
  /**
   * Stop listening for context updates
   */
  abstract stopContextTracking(): Promise<void>;
  
  /**
   * Convert context to a simple text description for LLM prompts
   */
  contextToDescription(context: DesignContext): string {
    const description: string[] = [
      `Document: ${context.documentName} (${context.platform})`,
      `Size: ${context.size.width}x${context.size.height}${context.size.depth ? 'x' + context.size.depth : ''}`
    ];
    
    if (context.selectedElements.length > 0) {
      description.push('Selected elements:');
      context.selectedElements.forEach(elem => {
        description.push(`- ${elem.name} (${elem.type}) at position (${elem.position.x}, ${elem.position.y}${elem.position.z ? ', ' + elem.position.z : ''})`);
      });
    }
    
    // Count elements by type
    const elementCounts: Record<string, number> = {};
    context.layers.forEach(layer => {
      layer.elements.forEach(elem => {
        elementCounts[elem.type] = (elementCounts[elem.type] || 0) + 1;
      });
    });
    
    description.push('Document contains:');
    Object.entries(elementCounts).forEach(([type, count]) => {
      description.push(`- ${count} ${type}${count !== 1 ? 's' : ''}`);
    });
    
    return description.join('\n');
  }
  
  /**
   * Find an element by ID or name
   */
  findElement(context: DesignContext, idOrName: string): DesignElement | null {
    // Try to find by ID first
    for (const layer of context.layers) {
      for (const element of layer.elements) {
        if (element.id === idOrName) {
          return element;
        }
        
        // Check children recursively
        if (element.children) {
          const found = this._findElementInChildren(element.children, idOrName);
          if (found) return found;
        }
      }
    }
    
    // Then try by name
    for (const layer of context.layers) {
      for (const element of layer.elements) {
        if (element.name === idOrName) {
          return element;
        }
        
        // Check children recursively
        if (element.children) {
          const found = this._findElementInChildren(element.children, idOrName);
          if (found) return found;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Find elements by type
   */
  findElementsByType(context: DesignContext, type: string): DesignElement[] {
    const results: DesignElement[] = [];
    
    for (const layer of context.layers) {
      for (const element of layer.elements) {
        if (element.type === type) {
          results.push(element);
        }
        
        // Check children recursively
        if (element.children) {
          results.push(...this._findElementsByTypeInChildren(element.children, type));
        }
      }
    }
    
    return results;
  }
  
  /**
   * Helper to find element in children recursively
   */
  private _findElementInChildren(children: DesignElement[], idOrName: string): DesignElement | null {
    for (const child of children) {
      if (child.id === idOrName || child.name === idOrName) {
        return child;
      }
      
      if (child.children) {
        const found = this._findElementInChildren(child.children, idOrName);
        if (found) return found;
      }
    }
    
    return null;
  }
  
  /**
   * Helper to find elements by type in children recursively
   */
  private _findElementsByTypeInChildren(children: DesignElement[], type: string): DesignElement[] {
    const results: DesignElement[] = [];
    
    for (const child of children) {
      if (child.type === type) {
        results.push(child);
      }
      
      if (child.children) {
        results.push(...this._findElementsByTypeInChildren(child.children, type));
      }
    }
    
    return results;
  }
} 