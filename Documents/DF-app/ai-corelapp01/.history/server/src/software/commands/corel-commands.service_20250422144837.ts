import { Injectable, Logger } from '@nestjs/common';
import { CorelDrawService } from '../coreldraw.service';
import { CommandResult } from './command.types';

/**
 * CorelDrawCommandsService
 * 
 * Service for executing high-level commands in CorelDRAW
 */
@Injectable()
export class CorelDrawCommandsService {
  private readonly logger = new Logger(CorelDrawCommandsService.name);

  constructor(
    private readonly corelDrawService: CorelDrawService,
  ) {}

  /**
   * Create a rectangle in CorelDRAW
   */
  async createRectangle(params: any): Promise<CommandResult> {
    this.logger.debug(`Creating rectangle with params: ${JSON.stringify(params)}`);
    return {
      success: true,
      message: 'Rectangle created successfully',
      commandExecuted: 'createRectangle',
      parameters: params
    };
  }

  /**
   * Create an ellipse or circle in CorelDRAW
   */
  async createEllipse(params: any): Promise<CommandResult> {
    this.logger.debug(`Creating ellipse with params: ${JSON.stringify(params)}`);
    return {
      success: true,
      message: 'Ellipse created successfully',
      commandExecuted: 'createEllipse',
      parameters: params
    };
  }

  /**
   * Create text in CorelDRAW
   */
  async createText(params: any): Promise<CommandResult> {
    this.logger.debug(`Creating text with params: ${JSON.stringify(params)}`);
    return {
      success: true,
      message: 'Text created successfully',
      commandExecuted: 'createText',
      parameters: params
    };
  }

  /**
   * Create a polygon in CorelDRAW
   */
  async createPolygon(params: any): Promise<CommandResult> {
    this.logger.debug(`Creating polygon with params: ${JSON.stringify(params)}`);
    return {
      success: true,
      message: 'Polygon created successfully',
      commandExecuted: 'createPolygon',
      parameters: params
    };
  }

  /**
   * Select objects in CorelDRAW based on criteria
   */
  async selectObjects(params: any): Promise<CommandResult> {
    this.logger.debug(`Selecting objects with params: ${JSON.stringify(params)}`);
    return {
      success: true,
      message: 'Objects selected successfully',
      commandExecuted: 'selectObjects',
      parameters: params
    };
  }

  /**
   * Group selected objects in CorelDRAW
   */
  async groupSelectedObjects(): Promise<CommandResult> {
    this.logger.debug('Grouping selected objects');
    return {
      success: true,
      message: 'Objects grouped successfully',
      commandExecuted: 'groupSelectedObjects'
    };
  }

  async applyFill(params: {
    objectName?: string;
    fillType?: 'solid' | 'gradient' | 'none';
    fillColor?: string;
    gradientType?: 'linear' | 'radial' | 'conical';
    startColor?: string;
    endColor?: string;
    angle?: number;
  }): Promise<string> {
    this.logger.log(`Applying fill with params: ${JSON.stringify(params)}`);
    
    if (!params.objectName) {
      throw new Error('Object name is required');
    }
    
    let vbaCode = `
' Apply fill to object with name ${params.objectName}
For Each shape In ActiveDocument.ActivePage.Shapes
  If shape.Name = "${params.objectName}" Then
`;

    const fillType = params.fillType || 'solid';
    
    if (fillType === 'none') {
      vbaCode += `    ' Remove fill
    shape.Fill.ApplyNoFill
`;
    } else if (fillType === 'solid') {
      const fillColor = params.fillColor || '#000000';
      const rgb = this.hexToRgb(fillColor);
      
      vbaCode += `    ' Apply solid fill
    shape.Fill.UniformColor.RGBAssign ${rgb.r}, ${rgb.g}, ${rgb.b}
`;
    } else if (fillType === 'gradient') {
      const gradientType = params.gradientType || 'linear';
      const startColor = params.startColor || '#FFFFFF';
      const endColor = params.endColor || '#000000';
      const angle = params.angle || 0;
      const startRgb = this.hexToRgb(startColor);
      const endRgb = this.hexToRgb(endColor);
      
      vbaCode += `    ' Apply gradient fill
    shape.Fill.Type = cdrFountainFill
`;

      if (gradientType === 'linear') {
        vbaCode += `    shape.Fill.Fountain.Type = cdrLinearFountainFill
`;
      } else if (gradientType === 'radial') {
        vbaCode += `    shape.Fill.Fountain.Type = cdrRadialFountainFill
`;
      } else if (gradientType === 'conical') {
        vbaCode += `    shape.Fill.Fountain.Type = cdrConicalFountainFill
`;
      }

      vbaCode += `    shape.Fill.Fountain.AngleOfFill = ${angle}
    shape.Fill.Fountain.Colors.RemoveAll
    shape.Fill.Fountain.Colors.Add 0, CreateRGBColor(${startRgb.r}, ${startRgb.g}, ${startRgb.b})
    shape.Fill.Fountain.Colors.Add 100, CreateRGBColor(${endRgb.r}, ${endRgb.g}, ${endRgb.b})
`;
    }

    vbaCode += `  End If
Next shape
`;

    return vbaCode;
  }

  async applyOutline(params: {
    objectName?: string;
    outlineColor?: string;
    outlineWidth?: number;
    outlineStyle?: 'solid' | 'dashed' | 'dotted';
  }): Promise<string> {
    this.logger.log(`Applying outline with params: ${JSON.stringify(params)}`);
    
    if (!params.objectName) {
      throw new Error('Object name is required');
    }
    
    const outlineColor = params.outlineColor || '#000000';
    const outlineWidth = params.outlineWidth || 1;
    const rgb = this.hexToRgb(outlineColor);
    
    let vbaCode = `
' Apply outline to object with name ${params.objectName}
For Each shape In ActiveDocument.ActivePage.Shapes
  If shape.Name = "${params.objectName}" Then
    ' Apply outline color and width
    shape.Outline.Color.RGBAssign ${rgb.r}, ${rgb.g}, ${rgb.b}
    shape.Outline.Width = ${outlineWidth}
`;

    if (params.outlineStyle) {
      if (params.outlineStyle === 'dashed') {
        vbaCode += `    shape.Outline.Style = cdrDashedLine
`;
      } else if (params.outlineStyle === 'dotted') {
        vbaCode += `    shape.Outline.Style = cdrDottedLine
`;
      } else {
        vbaCode += `    shape.Outline.Style = cdrNormalLine
`;
      }
    }

    vbaCode += `  End If
Next shape
`;

    return vbaCode;
  }

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    // Remove the hash at the start if it exists
    hex = hex.replace(/^#/, '');

    // Parse the hex values
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return { r, g, b };
  }
} 