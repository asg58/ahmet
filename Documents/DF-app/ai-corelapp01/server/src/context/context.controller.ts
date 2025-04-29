/**
 * Context Controller
 * 
 * REST API for accessing and controlling the design context.
 */

import { Controller, Get, Post, Delete, Param, Body, Query, Res, HttpStatus, HttpException } from '@nestjs/common';
import { ContextAnalyzerService, ContextAnalysisResult } from './context-analyzer.service';
import { Response } from 'express';

@Controller('context')
export class ContextController {
  constructor(private readonly contextAnalyzer: ContextAnalyzerService) {}
  
  /**
   * Get an analysis of the current context
   */
  @Get('analyze')
  async analyzeContext(): Promise<ContextAnalysisResult> {
    try {
      return await this.contextAnalyzer.analyzeCurrentContext();
    } catch (error) {
      throw new HttpException(
        `Failed to analyze context: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Start tracking context for a specific platform
   */
  @Post('track/:platform')
  async startTracking(@Param('platform') platform: string): Promise<{ success: boolean; message: string }> {
    // Validate platform
    if (platform !== 'coreldraw' && platform !== 'blender') {
      throw new HttpException(
        `Invalid platform: ${platform}. Must be 'coreldraw' or 'blender'.`,
        HttpStatus.BAD_REQUEST
      );
    }
    
    try {
      await this.contextAnalyzer.startTracking(platform as 'coreldraw' | 'blender');
      return { 
        success: true, 
        message: `Started tracking for ${platform}` 
      };
    } catch (error) {
      throw new HttpException(
        `Failed to start tracking: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Stop tracking context
   */
  @Post('stop')
  async stopTracking(): Promise<{ success: boolean; message: string }> {
    try {
      await this.contextAnalyzer.stopTracking();
      return { 
        success: true, 
        message: 'Stopped tracking'
      };
    } catch (error) {
      throw new HttpException(
        `Failed to stop tracking: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Get the current active tracker
   */
  @Get('status')
  getTrackingStatus(): { active: boolean; platform: string | null } {
    const platform = this.contextAnalyzer.getActiveTracker();
    return {
      active: platform !== null,
      platform
    };
  }
  
  /**
   * Get a thumbnail screenshot of the current design
   */
  @Get('thumbnail')
  async getThumbnail(@Res() res: Response): Promise<void> {
    try {
      const screenshot = await this.contextAnalyzer.captureScreenshot();
      
      // Set appropriate content type
      if (screenshot.format === 'png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (screenshot.format === 'jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      }
      
      // Convert base64 to buffer
      const imageBuffer = Buffer.from(screenshot.data, 'base64');
      
      // Send buffer as response
      res.send(imageBuffer);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `Failed to capture screenshot: ${error.message}`
      });
    }
  }
} 