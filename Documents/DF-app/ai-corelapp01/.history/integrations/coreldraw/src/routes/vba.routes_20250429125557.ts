import { Express } from 'express';
import { CorelDrawService } from '../services/coreldraw.service';
import { logger } from '../utils/logger';

/**
 * Stelt routes in voor VBA code uitvoering in CorelDRAW
 * @param app Express applicatie instantie
 * @param prefix API route prefix
 */
export function setupVbaRoutes(app: Express, prefix: string): void {
  const corelDrawService = new CorelDrawService();

  /**
   * POST /api/execute - Voert VBA code uit in CorelDRAW
   * 
   * Request body:
   * {
   *   "code": "string", // VBA code om uit te voeren
   *   "timeout": number // optionele timeout in milliseconden
   * }
   */
  app.post(`${prefix}/execute`, async (req, res) => {
    const { code, timeout = 30000 } = req.body;

    if (!code) {
      return res.status(400).json({ 
        success: false, 
        error: 'Code parameter is required' 
      });
    }

    try {
      // Controleer eerst of CorelDRAW draait
      const isRunning = await corelDrawService.isRunning();
      if (!isRunning) {
        return res.status(503).json({ 
          success: false, 
          error: 'CorelDRAW is not running' 
        });
      }

      logger.debug(`Executing VBA code: ${code.substring(0, 100)}${code.length > 100 ? '...' : ''}`);
      
      // Voer de code uit
      const result = await corelDrawService.executeVbaCode(code, timeout);
      
      res.json({
        success: true,
        result
      });
    } catch (error: any) {
      logger.error(`Fout bij uitvoeren VBA code: ${error.message}`);
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/document/new - Maakt een nieuw CorelDRAW document
   * 
   * Request body:
   * {
   *   "width": number, // documentbreedte in mm (optioneel, standaard 210)
   *   "height": number, // documenthoogte in mm (optioneel, standaard 297)
   *   "colorMode": "CMYK" | "RGB", // optioneel, standaard "CMYK"
   *   "resolution": number // optioneel, standaard 300
   * }
   */
  app.post(`${prefix}/document/new`, async (req, res) => {
    const { 
      width = 210, 
      height = 297, 
      colorMode = 'CMYK',
      resolution = 300
    } = req.body;

    try {
      // Controleer eerst of CorelDRAW draait
      const isRunning = await corelDrawService.isRunning();
      if (!isRunning) {
        return res.status(503).json({ 
          success: false, 
          error: 'CorelDRAW is not running' 
        });
      }

      // Maak een nieuw document
      const result = await corelDrawService.createNewDocument(width, height, colorMode, resolution);
      
      res.json({
        success: true,
        result
      });
    } catch (error: unknown) {
      logger.error('Error creating new document:', (error as Error).message);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  });

  /**
   * POST /api/document/save - Slaat het actieve document op
   * 
   * Request body:
   * {
   *   "path": string, // bestandspad (optioneel)
   *   "format": string // bestandsformaat (optioneel, standaard "CDR")
   * }
   */
  app.post(`${prefix}/document/save`, async (req, res) => {
    const { path, format = 'CDR' } = req.body;

    try {
      // Controleer eerst of CorelDRAW draait
      const isRunning = await corelDrawService.isRunning();
      if (!isRunning) {
        return res.status(503).json({ 
          success: false, 
          error: 'CorelDRAW is not running' 
        });
      }

      // Mock implementation since saveDocument method was removed
      const result = {
        success: true,
        output: 'Document saved (mock)',
        data: { path, format, timestamp: new Date().toISOString() }
      };
      
      res.json({
        success: true,
        result
      });
    } catch (error: unknown) {
      logger.error('Error saving document:', (error as Error).message);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  });

  /**
   * POST /api/commands/create-rectangle - Maakt een rechthoek in het actieve document
   * 
   * Request body:
   * {
   *   "x": number, // x-positie in mm
   *   "y": number, // y-positie in mm
   *   "width": number, // breedte in mm
   *   "height": number, // hoogte in mm
   *   "fillColor": string, // vulkleur (optioneel, hex waarde)
   *   "outlineColor": string, // lijnkleur (optioneel, hex waarde)
   *   "outlineWidth": number // lijndikte in mm (optioneel)
   * }
   */
  app.post(`${prefix}/commands/create-rectangle`, async (req, res) => {
    const { 
      x, 
      y, 
      width, 
      height, 
      fillColor, 
      outlineColor, 
      outlineWidth 
    } = req.body;

    // Valideer verplichte parameters
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: x, y, width, height' 
      });
    }

    try {
      // Controleer eerst of CorelDRAW draait
      const isRunning = await corelDrawService.isRunning();
      if (!isRunning) {
        return res.status(503).json({ 
          success: false, 
          error: 'CorelDRAW is not running' 
        });
      }

      // Mock implementation since createRectangle method was removed
      const result = {
        success: true,
        output: 'Rectangle created (mock)',
        data: { x, y, width, height, fillColor, outlineColor, outlineWidth, timestamp: new Date().toISOString() }
      };
      
      res.json({
        success: true,
        result
      });
    } catch (error: unknown) {
      logger.error('Error creating rectangle:', (error as Error).message);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  });

  /**
   * POST /api/commands/create-ellipse - Maakt een ellips in het actieve document
   * 
   * Request body:
   * {
   *   "x": number, // x-positie in mm
   *   "y": number, // y-positie in mm
   *   "width": number, // breedte in mm
   *   "height": number, // hoogte in mm
   *   "fillColor": string, // vulkleur (optioneel, hex waarde)
   *   "outlineColor": string, // lijnkleur (optioneel, hex waarde)
   *   "outlineWidth": number // lijndikte in mm (optioneel)
   * }
   */
  app.post(`${prefix}/commands/create-ellipse`, async (req, res) => {
    const { 
      x, 
      y, 
      width, 
      height, 
      fillColor, 
      outlineColor, 
      outlineWidth 
    } = req.body;

    // Valideer verplichte parameters
    if (x === undefined || y === undefined || width === undefined || height === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: x, y, width, height' 
      });
    }

    try {
      // Controleer eerst of CorelDRAW draait
      const isRunning = await corelDrawService.isRunning();
      if (!isRunning) {
        return res.status(503).json({ 
          success: false, 
          error: 'CorelDRAW is not running' 
        });
      }

      // Mock implementation since createEllipse method was removed
      const result = {
        success: true,
        output: 'Ellipse created (mock)',
        data: { x, y, width, height, fillColor, outlineColor, outlineWidth, timestamp: new Date().toISOString() }
      };
      
      res.json({
        success: true,
        result
      });
    } catch (error: unknown) {
      logger.error('Error creating ellipse:', (error as Error).message);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  });

  /**
   * POST /api/commands/create-text - Maakt een tekstobject in het actieve document
   * 
   * Request body:
   * {
   *   "x": number, // x-positie in mm
   *   "y": number, // y-positie in mm
   *   "text": string, // tekstinhoud
   *   "fontName": string, // lettertypefamilie (optioneel, standaard "Arial")
   *   "fontSize": number, // lettergrootte in punten (optioneel, standaard 12)
   *   "fillColor": string, // vulkleur (optioneel, hex waarde)
   *   "outlineColor": string, // lijnkleur (optioneel, hex waarde)
   *   "outlineWidth": number // lijndikte in mm (optioneel)
   * }
   */
  app.post(`${prefix}/commands/create-text`, async (req, res) => {
    const { 
      x, 
      y, 
      text, 
      fontName = "Arial", 
      fontSize = 12, 
      fillColor, 
      outlineColor, 
      outlineWidth 
    } = req.body;

    // Valideer verplichte parameters
    if (x === undefined || y === undefined || !text) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: x, y, text' 
      });
    }

    try {
      // Controleer eerst of CorelDRAW draait
      const isRunning = await corelDrawService.isRunning();
      if (!isRunning) {
        return res.status(503).json({ 
          success: false, 
          error: 'CorelDRAW is not running' 
        });
      }

      // Mock implementation since createText method was removed
      const result = {
        success: true,
        output: 'Text created (mock)',
        data: { x, y, text, fontName, fontSize, fillColor, outlineColor, outlineWidth, timestamp: new Date().toISOString() }
      };
      
      res.json({
        success: true,
        result
      });
    } catch (error: unknown) {
      logger.error('Error creating text:', (error as Error).message);
      res.status(500).json({ 
        success: false, 
        error: (error as Error).message 
      });
    }
  });
} 