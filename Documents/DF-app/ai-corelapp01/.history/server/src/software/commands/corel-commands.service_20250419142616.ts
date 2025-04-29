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
  async createRectangle(params: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fillColor?: string;
    outlineWidth?: number;
    outlineColor?: string;
  }): Promise<CommandResult> {
    this.logger.debug(`Creating rectangle with params: ${JSON.stringify(params)}`);
    
    const {
      x = 100,
      y = 100,
      width = 200,
      height = 100,
      fillColor = "255,0,0",
      outlineWidth = 1,
      outlineColor = "0,0,0"
    } = params;
    
    // Generate VBA code for creating a rectangle
    const vbaCode = `
      Sub CreateRectangle()
        Dim s As Shape
        Set s = ActiveDocument.ActivePage.CreateRectangle(${x}, ${y}, ${x + width}, ${y + height})
        
        ' Apply fill if specified
        s.Fill.ApplyUniformFill CreateRGBColor(${fillColor})
        
        ' Apply outline if specified
        s.Outline.SetProperties ${outlineWidth}
        s.Outline.Color.RGBAssign ${outlineColor}
        
        ' Return the shape name
        MsgBox "Created rectangle: " & s.Name
      End Sub
      
      CreateRectangle
    `;
    
    try {
      const result = await this.corelDrawService.executeCode(vbaCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Error creating rectangle: ${error.message}`);
      return {
        success: false,
        error: `Failed to create rectangle: ${error.message}`,
      };
    }
  }

  /**
   * Create an ellipse or circle in CorelDRAW
   */
  async createEllipse(params: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    fillColor?: string;
    outlineWidth?: number;
    outlineColor?: string;
  }): Promise<CommandResult> {
    this.logger.debug(`Creating ellipse with params: ${JSON.stringify(params)}`);
    
    const {
      x = 100,
      y = 100,
      width = 200,
      height = 200, // Same width and height for a circle
      fillColor = "0,0,255",
      outlineWidth = 1,
      outlineColor = "0,0,0"
    } = params;
    
    // Generate VBA code for creating an ellipse
    const vbaCode = `
      Sub CreateEllipse()
        Dim s As Shape
        Set s = ActiveDocument.ActivePage.CreateEllipse(${x}, ${y}, ${x + width}, ${y + height})
        
        ' Apply fill if specified
        s.Fill.ApplyUniformFill CreateRGBColor(${fillColor})
        
        ' Apply outline if specified
        s.Outline.SetProperties ${outlineWidth}
        s.Outline.Color.RGBAssign ${outlineColor}
        
        ' Return the shape name
        MsgBox "Created ellipse: " & s.Name
      End Sub
      
      CreateEllipse
    `;
    
    try {
      const result = await this.corelDrawService.executeCode(vbaCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Error creating ellipse: ${error.message}`);
      return {
        success: false,
        error: `Failed to create ellipse: ${error.message}`,
      };
    }
  }

  /**
   * Create text in CorelDRAW
   */
  async createText(params: {
    x?: number;
    y?: number;
    text?: string;
    fontName?: string;
    fontSize?: number;
    fontColor?: string;
  }): Promise<CommandResult> {
    this.logger.debug(`Creating text with params: ${JSON.stringify(params)}`);
    
    const {
      x = 100,
      y = 100,
      text = "Sample Text",
      fontName = "Arial",
      fontSize = 24,
      fontColor = "0,0,0"
    } = params;
    
    // Generate VBA code for creating text
    const vbaCode = `
      Sub CreateText()
        Dim s As Shape
        Set s = ActiveDocument.ActivePage.CreateArtisticText(${x}, ${y}, "${text}", , , "${fontName}", ${fontSize})
        
        ' Set text color
        s.Fill.ApplyUniformFill CreateRGBColor(${fontColor})
        
        ' Return the shape name
        MsgBox "Created text: " & s.Name
      End Sub
      
      CreateText
    `;
    
    try {
      const result = await this.corelDrawService.executeCode(vbaCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Error creating text: ${error.message}`);
      return {
        success: false,
        error: `Failed to create text: ${error.message}`,
      };
    }
  }

  /**
   * Create a polygon in CorelDRAW
   */
  async createPolygon(params: {
    x?: number;
    y?: number;
    radius?: number;
    sides?: number;
    fillColor?: string;
    outlineWidth?: number;
    outlineColor?: string;
  }): Promise<CommandResult> {
    this.logger.debug(`Creating polygon with params: ${JSON.stringify(params)}`);
    
    const {
      x = 100,
      y = 100,
      radius = 100,
      sides = 6,
      fillColor = "0,255,0",
      outlineWidth = 1,
      outlineColor = "0,0,0"
    } = params;
    
    // Generate VBA code for creating a polygon
    const vbaCode = `
      Sub CreatePolygon()
        Dim s As Shape
        Set s = ActiveDocument.ActivePage.CreatePolygon(${x}, ${y}, ${radius}, ${sides})
        
        ' Apply fill if specified
        s.Fill.ApplyUniformFill CreateRGBColor(${fillColor})
        
        ' Apply outline if specified
        s.Outline.SetProperties ${outlineWidth}
        s.Outline.Color.RGBAssign ${outlineColor}
        
        ' Return the shape name
        MsgBox "Created polygon: " & s.Name
      End Sub
      
      CreatePolygon
    `;
    
    try {
      const result = await this.corelDrawService.executeCode(vbaCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Error creating polygon: ${error.message}`);
      return {
        success: false,
        error: `Failed to create polygon: ${error.message}`,
      };
    }
  }

  /**
   * Select objects in CorelDRAW based on criteria
   */
  async selectObjects(params: {
    type?: string;
    name?: string;
    all?: boolean;
  }): Promise<CommandResult> {
    this.logger.debug(`Selecting objects with params: ${JSON.stringify(params)}`);
    
    const {
      type,
      name,
      all = false
    } = params;
    
    let vbaCode: string;
    
    if (all) {
      // Select all objects
      vbaCode = `
        Sub SelectAllObjects()
          ActiveDocument.ActivePage.Shapes.All.Selected = True
          MsgBox "Selected all objects: " & ActiveDocument.ActivePage.Shapes.Count & " objects"
        End Sub
        
        SelectAllObjects
      `;
    } else if (type) {
      // Select objects by type
      vbaCode = `
        Sub SelectByType()
          Dim s As Shape
          Dim count As Integer
          count = 0
          
          For Each s In ActiveDocument.ActivePage.Shapes
            If s.Type = ${type} Then
              s.Selected = True
              count = count + 1
            End If
          Next s
          
          MsgBox "Selected " & count & " objects of type " & ${type}
        End Sub
        
        SelectByType
      `;
    } else if (name) {
      // Select objects by name pattern
      vbaCode = `
        Sub SelectByName()
          Dim s As Shape
          Dim count As Integer
          count = 0
          
          For Each s In ActiveDocument.ActivePage.Shapes
            If InStr(s.Name, "${name}") > 0 Then
              s.Selected = True
              count = count + 1
            End If
          Next s
          
          MsgBox "Selected " & count & " objects with name containing '${name}'"
        End Sub
        
        SelectByName
      `;
    } else {
      return {
        success: false,
        error: "No selection criteria provided"
      };
    }
    
    try {
      const result = await this.corelDrawService.executeCode(vbaCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Error selecting objects: ${error.message}`);
      return {
        success: false,
        error: `Failed to select objects: ${error.message}`,
      };
    }
  }

  /**
   * Group selected objects in CorelDRAW
   */
  async groupSelectedObjects(): Promise<CommandResult> {
    this.logger.debug('Grouping selected objects');
    
    const vbaCode = `
      Sub GroupSelected()
        If ActiveSelectionRange.Count < 2 Then
          MsgBox "Select at least 2 objects to group"
          Exit Sub
        End If
        
        Dim g As ShapeRange
        Set g = ActiveSelectionRange.Group
        MsgBox "Grouped " & ActiveSelectionRange.Count & " objects: " & g.Name
      End Sub
      
      GroupSelected
    `;
    
    try {
      const result = await this.corelDrawService.executeCode(vbaCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Error grouping objects: ${error.message}`);
      return {
        success: false,
        error: `Failed to group objects: ${error.message}`,
      };
    }
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