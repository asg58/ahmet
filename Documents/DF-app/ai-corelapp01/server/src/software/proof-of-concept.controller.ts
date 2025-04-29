import { Controller, Get, Post, Body, Param, Query, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ProofOfConceptIntegration, TestResult } from './proof-of-concept.integration';

/**
 * Controller for the Proof-of-Concept Integration
 * 
 * Provides endpoints to test natural language commands in both CorelDRAW and Blender,
 * demonstrate the context-aware execution pipeline, and run test cases.
 */
@Controller('api/poc')
export class ProofOfConceptController {
  private readonly logger = new Logger(ProofOfConceptController.name);
  
  constructor(private readonly pocService: ProofOfConceptIntegration) {}
  
  /**
   * Health check endpoint
   */
  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
  
  /**
   * Test a natural language command on a specific platform
   */
  @Post(':platform/test')
  async testNaturalLanguageCommand(
    @Param('platform') platform: string,
    @Body() body: { query: string }
  ) {
    try {
      // Validate platform
      if (platform !== 'coreldraw' && platform !== 'blender') {
        throw new HttpException(
          `Invalid platform: ${platform}. Use 'coreldraw' or 'blender'.`,
          HttpStatus.BAD_REQUEST
        );
      }
      
      // Validate query
      if (!body.query || typeof body.query !== 'string') {
        throw new HttpException(
          'Missing or invalid query parameter',
          HttpStatus.BAD_REQUEST
        );
      }
      
      this.logger.log(`Testing command: "${body.query}" on ${platform}`);
      
      // Execute the test
      const result = await this.pocService.testNaturalLanguageCommand(
        platform as 'coreldraw' | 'blender',
        body.query
      );
      
      return {
        status: result.success ? 'success' : 'error',
        platform,
        query: body.query,
        result
      };
    } catch (error) {
      this.logger.error(`Error testing command: ${error.message}`);
      
      throw new HttpException(
        `Failed to test command: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  
  /**
   * Run all the test cases for a platform
   */
  @Post(':platform/run-tests')
  async runPlatformTests(@Param('platform') platform: string) {
    try {
      // Validate platform
      if (platform !== 'coreldraw' && platform !== 'blender') {
        throw new HttpException(
          `Invalid platform: ${platform}. Use 'coreldraw' or 'blender'.`,
          HttpStatus.BAD_REQUEST
        );
      }
      
      this.logger.log(`Running all test cases for ${platform}`);
      
      // Run the tests
      const results = await this.pocService.runPlatformTests(
        platform as 'coreldraw' | 'blender'
      );
      
      // Calculate statistics
      const totalTests = results.length;
      const successfulTests = results.filter(result => result.success).length;
      const successRate = (successfulTests / totalTests) * 100;
      
      return {
        status: 'completed',
        platform,
        statistics: {
          totalTests,
          successfulTests,
          successRate: `${successRate.toFixed(1)}%`
        },
        results
      };
    } catch (error) {
      this.logger.error(`Error running tests: ${error.message}`);
      
      throw new HttpException(
        `Failed to run tests: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 