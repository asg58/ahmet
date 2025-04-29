/**
 * Context Tracker Interfaces
 * 
 * This module defines the interfaces for tracking design context across different platforms.
 */

/**
 * Represents the current state of a design document
 */
export interface DesignContext {
  /**
   * The platform the context is from
   */
  platform: 'coreldraw' | 'blender';
  
  /**
   * Timestamp when the context was captured
   */
  timestamp: number;
  
  /**
   * Properties of the document
   */
  documentProperties: Record<string, any>;
  
  /**
   * Array of IDs of selected objects
   */
  selectedObjects: string[];
  
  /**
   * ID of the active layer, if any
   */
  activeLayer?: string;
  
  /**
   * Properties related to the current view
   */
  viewProperties: {
    zoom: number;
    viewportCenter: [number, number];
    visibleObjects: string[];
  };
  
  /**
   * Any custom metadata
   */
  customMetadata?: Record<string, any>;
}

/**
 * Represents an update to the context
 */
export interface ContextUpdate {
  /**
   * Type of update
   */
  type: 'full' | 'partial';
  
  /**
   * The updated context
   */
  context: Partial<DesignContext>;
  
  /**
   * Description of what changed
   */
  changeDescription?: string;
}

/**
 * Interface for context trackers
 */
export interface ContextTracker {
  /**
   * Start tracking document context
   */
  startTracking(): Promise<void>;
  
  /**
   * Stop tracking document context
   */
  stopTracking(): Promise<void>;
  
  /**
   * Get the current context
   */
  getCurrentContext(): Promise<DesignContext>;
  
  /**
   * Register a callback to be called on context updates
   */
  onContextUpdate(callback: (update: ContextUpdate) => void): void;
  
  /**
   * Capture a screenshot of the current view
   */
  captureScreenshot(): Promise<{ data: string; format: 'png' | 'jpeg' }>;
} 