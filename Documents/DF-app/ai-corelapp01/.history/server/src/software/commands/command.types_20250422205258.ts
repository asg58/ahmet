/**
 * Common types for command services
 */

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: any;
  returnValue?: any;
  code?: string;
  visualData?: {
    type: 'image' | '3d' | 'svg';
    data: string;
  };
}

export interface CommandOptions {
  timeout?: number;
  retryCount?: number;
  params?: Record<string, any>;
}

export type SupportedPlatform = 'coreldraw' | 'blender'; 