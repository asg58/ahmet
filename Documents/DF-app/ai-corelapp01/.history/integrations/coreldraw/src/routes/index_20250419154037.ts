import { Express } from 'express';
import { setupStatusRoutes } from './status.routes';
import { setupVbaRoutes } from './vba.routes';

/**
 * Stelt alle API routes in voor de applicatie
 * @param app Express applicatie instantie
 */
export function setupRoutes(app: Express): void {
  // API prefix
  const apiPrefix = '/api';
  
  // Basis route
  app.get(apiPrefix, (req, res) => {
    res.json({
      name: 'CorelDRAW Bridge API',
      version: '1.0.0',
      status: 'running'
    });
  });

  // Status routes voor health checks en informatie
  setupStatusRoutes(app, apiPrefix);
  
  // VBA routes voor het uitvoeren van CorelDRAW code
  setupVbaRoutes(app, apiPrefix);
} 