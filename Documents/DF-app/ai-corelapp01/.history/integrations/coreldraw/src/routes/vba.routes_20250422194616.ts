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
    } catch (error) {
      logger.error('Error creating new document:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
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

      // Sla het document op
      const result = await corelDrawService.saveDocument(path, format);
      
      res.json({
        success: true,
        result
      });
    } catch (error) {
      logger.error('Error saving document:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
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

      // Maak de rechthoek
      const result = await corelDrawService.createRectangle(x, y, width, height, fillColor, outlineColor, outlineWidth);
      
      res.json({
        success: true,
        result
      });
    } catch (error) {
      logger.error('Error creating rectangle:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
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

      // Maak de ellips
      const result = await corelDrawService.createEllipse(x, y, width, height, fillColor, outlineColor, outlineWidth);
      
      res.json({
        success: true,
        result
      });
    } catch (error) {
      logger.error('Error creating ellipse:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
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
   *   "text": string, // tekst
   *   "fontName": string, // lettertype
   *   "fontSize": number, // lettergrootte in pt
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
      fontName, 
      fontSize, 
      fillColor, 
      outlineColor, 
      outlineWidth 
    } = req.body;

    // Valideer verplichte parameters
    if (x === undefined || y === undefined || text === undefined || fontName === undefined || fontSize === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: x, y, text, fontName, fontSize' 
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

      // Maak het tekstobject
      const result = await corelDrawService.createText(x, y, text, fontName, fontSize, fillColor, outlineColor, outlineWidth);
      
      res.json({
        success: true,
        result
      });
    } catch (error) {
      logger.error('Error creating text:', error);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
} 