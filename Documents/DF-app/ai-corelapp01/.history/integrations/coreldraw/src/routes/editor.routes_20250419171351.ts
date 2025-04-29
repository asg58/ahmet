const express = require('express');
const router = express.Router();
const corelDrawService = require('../services/corelDrawService');

/**
 * Create a rectangle in the active document
 */
router.post('/create-rectangle', async (req, res) => {
  const { x = 0, y = 0, width = 100, height = 50, fillColor, outlineColor, outlineWidth } = req.body;

  // Validate parameters
  if (width <= 0 || height <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Width and height must be positive values'
    });
  }

  const result = await corelDrawService.createRectangle(x, y, width, height, fillColor, outlineColor, outlineWidth);
  return res.json(result);
});

/**
 * Create an ellipse in the active document
 */
router.post('/create-ellipse', async (req, res) => {
  const { x = 0, y = 0, width = 100, height = 50, fillColor, outlineColor, outlineWidth } = req.body;

  // Validate parameters
  if (width <= 0 || height <= 0) {
    return res.status(400).json({
      success: false,
      error: 'Width and height must be positive values'
    });
  }

  const result = await corelDrawService.createEllipse(x, y, width, height, fillColor, outlineColor, outlineWidth);
  return res.json(result);
});

/**
 * Create a text object in the active document
 */
router.post('/create-text', async (req, res) => {
  const { 
    x = 0, 
    y = 0, 
    text, 
    fontName = 'Arial', 
    fontSize = 12,
    fillColor,
    outlineColor,
    outlineWidth
  } = req.body;

  // Validate parameters
  if (!text) {
    return res.status(400).json({
      success: false,
      error: 'Text content is required'
    });
  }

  const result = await corelDrawService.createText(x, y, text, fontName, fontSize, fillColor, outlineColor, outlineWidth);
  return res.json(result);
});

return router; 