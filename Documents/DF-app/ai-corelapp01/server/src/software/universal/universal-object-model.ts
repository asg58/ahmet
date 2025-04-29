/**
 * UniversalObjectModel
 * 
 * This module defines the interfaces for a platform-agnostic object model
 * that can be used to interact with both CorelDRAW and Blender in a
 * consistent manner.
 */

/**
 * Represents a path to an object in the object hierarchy
 */
export type ObjectPath = string;

/**
 * Represents a property descriptor
 */
export interface PropertyDescriptor {
  name: string;
  type: string;
  readable: boolean;
  writable: boolean;
  description?: string;
}

/**
 * Represents a parameter descriptor for a method
 */
export interface ParameterDescriptor {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: any;
  description?: string;
}

/**
 * Represents a method descriptor
 */
export interface MethodDescriptor {
  name: string;
  parameters: ParameterDescriptor[];
  returnType: string;
  description?: string;
}

/**
 * Represents an object in the object model
 */
export interface ObjectDescriptor {
  path: ObjectPath;
  type: string;
  properties: PropertyDescriptor[];
  methods: MethodDescriptor[];
  children?: ObjectPath[];
}

/**
 * Result of a property access
 */
export interface PropertyResult {
  value: any;
  type: string;
  success: boolean;
  error?: string;
}

/**
 * Result of a method invocation
 */
export interface MethodResult {
  returnValue: any;
  success: boolean;
  error?: string;
  visualResult?: {
    type: 'svg' | 'image' | '3d';
    data: string;
  };
}

/**
 * Main interface for the Universal Object Model
 */
export interface UniversalObjectModel {
  /**
   * Get the root objects of the application
   */
  getRootObjects(): Promise<ObjectPath[]>;
  
  /**
   * Get a descriptor for an object at the given path
   */
  getObjectDescriptor(path: ObjectPath): Promise<ObjectDescriptor>;
  
  /**
   * Get the value of a property
   */
  getProperty(objectPath: ObjectPath, propertyName: string): Promise<PropertyResult>;
  
  /**
   * Set the value of a property
   */
  setProperty(objectPath: ObjectPath, propertyName: string, value: any): Promise<PropertyResult>;
  
  /**
   * Invoke a method on an object
   */
  invokeMethod(objectPath: ObjectPath, methodName: string, args: any[]): Promise<MethodResult>;
  
  /**
   * Execute a code snippet directly
   */
  executeCode(code: string): Promise<MethodResult>;
  
  /**
   * Search for objects by type or name pattern
   */
  findObjects(typeOrPattern: string): Promise<ObjectPath[]>;
  
  /**
   * Get the current document/scene context
   */
  getCurrentContext(): Promise<{
    documentPath: ObjectPath;
    selectedObjects: ObjectPath[];
    activeLayer?: ObjectPath;
    documentProperties: Record<string, any>;
  }>;
  
  /**
   * Get platform-specific capabilities
   */
  getCapabilities(): Promise<{
    platform: 'coreldraw' | 'blender';
    supportsInspection: boolean;
    supportsThumbnails: boolean;
    supportsUndo: boolean;
    supportsBatchOperations: boolean;
  }>;
} 