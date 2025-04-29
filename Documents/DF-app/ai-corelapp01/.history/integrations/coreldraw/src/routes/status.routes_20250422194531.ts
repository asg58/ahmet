import { Express } from 'express';
import { CorelDrawService } from '../services/coreldraw.service';
import { logger } from '../utils/logger';

// Define interfaces for the response types
interface CorelDrawStatusBase {
  running: boolean;
  configured: boolean;
  configuredPath: string | undefined;
  version: string;
}

interface CorelDrawStatusExtended extends CorelDrawStatusBase {
  actualVersion?: string;
  applicationInfo?: any;
}

/**
 * Stelt de status routes in voor de API
 * @param app Express applicatie instantie
 * @param prefix API route prefix
 */
export function setupStatusRoutes(app: Express, prefix: string): void {
  const corelDrawService = new CorelDrawService();

  /**
   * GET /api/status - Controleert de algemene status van de bridge service
   */
  app.get(`${prefix}/status`, (req, res) => {
    const status = {
      service: 'running',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      coreldraw: {
        configured: Boolean(process.env.CORELDRAW_PATH),
        version: process.env.CORELDRAW_VERSION || 'unknown'
      }
    };
    
    res.json(status);
  });

  /**
   * GET /api/status/coreldraw - Controleert de verbinding met CorelDRAW
   */
  app.get(`${prefix}/status/coreldraw`, async (req, res) => {
    try {
      const isRunning = await corelDrawService.isRunning();
      const version = isRunning ? await corelDrawService.getVersion() : null;
      
      res.json({
        running: isRunning,
        version: version,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      logger.error(`Fout bij ophalen status: ${error.message}`);
      return res.status(500).json({
        running: false,
        error: error.message,
        status: 'error'
      });
    }
  });

  /**
   * GET /api/status/details - Uitgebreide details over de bridge en CorelDRAW
   */
  app.get(`${prefix}/status/details`, async (req, res) => {
    try {
      const isRunning = await corelDrawService.isRunning();
      let details = {
        bridge: {
          service: 'running',
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
          nodeVersion: process.version,
          environment: process.env.NODE_ENV || 'development'
        },
        coreldraw: {
          running: isRunning,
          configured: Boolean(process.env.CORELDRAW_PATH),
          configuredPath: process.env.CORELDRAW_PATH,
          version: process.env.CORELDRAW_VERSION || 'unknown'
        } as CorelDrawStatusExtended
      };
      
      // Voeg verbindingsdetails toe als CorelDRAW draait
      if (isRunning) {
        const version = await corelDrawService.getVersion();
        const applicationInfo = await corelDrawService.getApplicationInfo();
        
        details.coreldraw = {
          ...details.coreldraw,
          actualVersion: version,
          applicationInfo
        };
      }
      
      res.json(details);
    } catch (error: any) {
      logger.error(`Fout bij ophalen VSTA status: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
} 