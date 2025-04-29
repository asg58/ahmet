import { Injectable, Logger } from '@nestjs/common';

/**
 * Service voor het beheren van de software context op verschillende platformen
 */
@Injectable()
export class SoftwareContextService {
  private readonly logger = new Logger(SoftwareContextService.name);
  
  // Cache voor huidige context per platform
  private contextCache: Record<string, any> = {};

  constructor() {}

  /**
   * Verkrijgt de huidige context voor het gegeven platform
   */
  async getContext(platform: string): Promise<any> {
    this.logger.debug(`Getting context for platform: ${platform}`);
    
    // Gebruik cache indien beschikbaar
    if (this.contextCache[platform]) {
      return this.contextCache[platform];
    }
    
    // Standaard implementatie - zal worden uitgebreid met echte context
    const context = {
      platform,
      timestamp: new Date().toISOString(),
      elements: [],
      documentProperties: {
        name: `Mock Document (${platform})`,
        size: { width: 800, height: 600 },
        units: 'px',
      },
      activeSelection: null,
      viewportSettings: {
        zoom: 100,
        centerPoint: { x: 400, y: 300 }
      }
    };
    
    // Sla op in cache
    this.contextCache[platform] = context;
    
    return context;
  }
  
  /**
   * Werkt de cache bij met nieuwe context
   */
  updateContext(platform: string, context: any): void {
    this.logger.debug(`Updating context for platform: ${platform}`);
    this.contextCache[platform] = {
      ...this.contextCache[platform],
      ...context,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Wist de context cache voor een specifiek platform of alle platformen
   */
  clearContext(platform?: string): void {
    if (platform) {
      this.logger.debug(`Clearing context for platform: ${platform}`);
      delete this.contextCache[platform];
    } else {
      this.logger.debug('Clearing all context caches');
      this.contextCache = {};
    }
  }
} 