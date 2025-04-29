/**
 * End-to-End tests for the Context API
 */

import { api, utils } from '../setup';

describe('Context API E2E Tests', () => {
  const contextEndpoints = {
    analyze: '/api/context/analyze',
    track: '/api/context/track',
    stop: '/api/context/stop',
    status: '/api/context/status',
    thumbnail: '/api/context/thumbnail'
  };

  // Helper to track context for a specific platform
  async function startTracking(platform: 'coreldraw' | 'blender') {
    return api.post(`${contextEndpoints.track}/${platform}`, {});
  }

  // Helper to stop tracking
  async function stopTracking() {
    return api.post(contextEndpoints.stop, {});
  }

  // Clean up after tests
  afterAll(async () => {
    await stopTracking();
  });

  describe('Tracking Status', () => {
    it('should report inactive status when not tracking', async () => {
      // Ensure we're not tracking
      await stopTracking();
      
      // Check status
      const status = await api.get(contextEndpoints.status);
      
      expect(status).toEqual({
        active: false,
        platform: null
      });
    });

    it('should report active status when tracking CorelDRAW', async () => {
      // Start tracking CorelDRAW
      await startTracking('coreldraw');
      
      // Check status
      const status = await api.get(contextEndpoints.status);
      
      expect(status).toEqual({
        active: true,
        platform: 'coreldraw'
      });
      
      // Stop tracking for cleanup
      await stopTracking();
    });

    it('should report active status when tracking Blender', async () => {
      // Start tracking Blender
      await startTracking('blender');
      
      // Check status
      const status = await api.get(contextEndpoints.status);
      
      expect(status).toEqual({
        active: true,
        platform: 'blender'
      });
      
      // Stop tracking for cleanup
      await stopTracking();
    });
  });

  describe('Context Analysis', () => {
    it('should analyze CorelDRAW context', async () => {
      // Start tracking CorelDRAW
      await startTracking('coreldraw');
      
      // Wait for initial context capture
      await utils.wait(500);
      
      // Analyze context
      const analysisResult = await api.get(contextEndpoints.analyze);
      
      // Verify results
      expect(analysisResult).toHaveProperty('context');
      expect(analysisResult.context.platform).toBe('coreldraw');
      expect(analysisResult).toHaveProperty('dominantElements');
      expect(analysisResult).toHaveProperty('suggestedActions');
      expect(analysisResult).toHaveProperty('relevantDocumentation');
      
      // Clean up
      await stopTracking();
    });

    it('should analyze Blender context', async () => {
      // Start tracking Blender
      await startTracking('blender');
      
      // Wait for initial context capture
      await utils.wait(500);
      
      // Analyze context
      const analysisResult = await api.get(contextEndpoints.analyze);
      
      // Verify results
      expect(analysisResult).toHaveProperty('context');
      expect(analysisResult.context.platform).toBe('blender');
      expect(analysisResult).toHaveProperty('dominantElements');
      expect(analysisResult).toHaveProperty('suggestedActions');
      expect(analysisResult).toHaveProperty('relevantDocumentation');
      
      // Clean up
      await stopTracking();
    });

    it('should fail to analyze when not tracking', async () => {
      // Ensure we're not tracking
      await stopTracking();
      
      // Try to analyze
      try {
        await api.get(contextEndpoints.analyze);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data).toHaveProperty('message');
        expect(error.response.data.message).toContain('No active context tracker');
      }
    });
  });

  describe('Tracking Control', () => {
    it('should successfully start tracking CorelDRAW', async () => {
      const response = await startTracking('coreldraw');
      
      expect(response).toEqual({
        success: true,
        message: 'Started tracking for coreldraw'
      });
      
      // Verify tracking is active
      const status = await api.get(contextEndpoints.status);
      expect(status.active).toBe(true);
      expect(status.platform).toBe('coreldraw');
      
      // Clean up
      await stopTracking();
    });

    it('should successfully start tracking Blender', async () => {
      const response = await startTracking('blender');
      
      expect(response).toEqual({
        success: true,
        message: 'Started tracking for blender'
      });
      
      // Verify tracking is active
      const status = await api.get(contextEndpoints.status);
      expect(status.active).toBe(true);
      expect(status.platform).toBe('blender');
      
      // Clean up
      await stopTracking();
    });

    it('should reject invalid platform', async () => {
      try {
        await api.post(`${contextEndpoints.track}/invalid-platform`, {});
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data).toHaveProperty('message');
        expect(error.response.data.message).toContain('Invalid platform');
      }
    });

    it('should successfully stop tracking', async () => {
      // Start tracking first
      await startTracking('coreldraw');
      
      // Stop tracking
      const response = await stopTracking();
      
      expect(response).toEqual({
        success: true,
        message: 'Stopped tracking'
      });
      
      // Verify tracking is inactive
      const status = await api.get(contextEndpoints.status);
      expect(status.active).toBe(false);
      expect(status.platform).toBeNull();
    });
  });

  describe('Thumbnails', () => {
    it('should retrieve a thumbnail from CorelDRAW', async () => {
      // Start tracking CorelDRAW
      await startTracking('coreldraw');
      
      // Get thumbnail
      const response = await api.getRaw(contextEndpoints.thumbnail);
      
      // Check response type
      expect(response.headers['content-type']).toMatch(/^image\/(png|jpeg)/);
      expect(response.data).toBeTruthy();
      
      // Clean up
      await stopTracking();
    });

    it('should retrieve a thumbnail from Blender', async () => {
      // Start tracking Blender
      await startTracking('blender');
      
      // Get thumbnail
      const response = await api.getRaw(contextEndpoints.thumbnail);
      
      // Check response type
      expect(response.headers['content-type']).toMatch(/^image\/(png|jpeg)/);
      expect(response.data).toBeTruthy();
      
      // Clean up
      await stopTracking();
    });

    it('should fail to get thumbnail when not tracking', async () => {
      // Ensure we're not tracking
      await stopTracking();
      
      // Try to get thumbnail
      try {
        await api.getRaw(contextEndpoints.thumbnail);
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.response.status).toBe(500);
        expect(error.response.data).toHaveProperty('message');
        expect(error.response.data.message).toContain('Failed to capture screenshot');
      }
    });
  });
}); 