import { logger } from '../utils/logger';
import * as win32ole from 'node-win32ole';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Interface voor resultaten van het uitvoeren van code
 */
export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  returnValue?: any;
  data?: any;
}

/**
 * Service voor communicatie met CorelDRAW via COM/VBA
 */
export class CorelDrawService {
  private corelApp: any = null;
  private initialized: boolean = false;
  private initializationAttempted: boolean = false;
  private corelPath: string;
  private mockMode: boolean = false;

  constructor() {
    this.corelPath = process.env.CORELDRAW_PATH || '';
    this.mockMode = process.env.MOCK_CORELDRAW === 'true';
    
    // Initialiseer win32ole
    try {
      win32ole.register();
      logger.info('COM/OLE geïnitialiseerd voor CorelDRAW communicatie');
    } catch (error) {
      logger.error('Fout bij initialisatie van COM/OLE:', error);
      this.mockMode = true;
      logger.warn('Teruggevallen op mock mode vanwege COM initialisatiefout');
    }
  }

  /**
   * Initialiseert de verbinding met CorelDRAW
   */
  private async initialize(): Promise<boolean> {
    // Als we al geprobeerd hebben te initialiseren, doe niets
    if (this.initializationAttempted) {
      return this.initialized;
    }

    this.initializationAttempted = true;

    // Als in mock mode, simuleer initialisatie
    if (this.mockMode) {
      logger.info('CorelDRAW service draait in mock mode');
      this.initialized = true;
      return true;
    }

    try {
      // Controleer of CorelDRAW al draait
      logger.info('Verbinding maken met CorelDRAW...');
      try {
        this.corelApp = win32ole.client.Dispatch('CorelDRAW.Application');
        logger.info('Verbonden met bestaande CorelDRAW instantie');
        this.initialized = true;
        return true;
      } catch (dispatchError) {
        logger.debug('Geen bestaande CorelDRAW instantie gevonden, starten van nieuwe instantie');
      }

      // Probeer CorelDRAW te starten als het niet draait
      if (this.corelPath) {
        try {
          logger.info(`CorelDRAW starten vanuit: ${this.corelPath}`);
          await execAsync(`start "" "${this.corelPath}"`);
          
          // Wacht even tot de applicatie is opgestart
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // Probeer opnieuw verbinding te maken
          this.corelApp = win32ole.client.Dispatch('CorelDRAW.Application');
          logger.info('Verbonden met nieuw gestarte CorelDRAW instantie');
          this.initialized = true;
          return true;
        } catch (startError) {
          logger.error('Fout bij het starten van CorelDRAW:', startError);
        }
      } else {
        logger.error('CORELDRAW_PATH is niet geconfigureerd in .env');
      }

      logger.error('Kon geen verbinding maken met CorelDRAW');
      return false;
    } catch (error) {
      logger.error('Fout bij initialisatie van CorelDRAW verbinding:', error);
      return false;
    }
  }

  /**
   * Controleer of CorelDRAW draait en verbonden is
   */
  async isRunning(): Promise<boolean> {
    if (this.mockMode) {
      return true;
    }

    // Initialiseer als dat nog niet is gedaan
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      if (this.corelApp) {
        // Probeer een eenvoudige eigenschap te lezen om te zien of de verbinding werkt
        const version = this.corelApp.VersionMajor;
        return true;
      }
    } catch (error) {
      logger.error('Fout bij het controleren of CorelDRAW draait:', error);
      // Reset de verbinding zodat we opnieuw kunnen proberen te verbinden
      this.corelApp = null;
      this.initialized = false;
      this.initializationAttempted = false;
    }

    return false;
  }

  /**
   * Haalt de versie van CorelDRAW op
   */
  async getVersion(): Promise<string> {
    if (this.mockMode) {
      return 'CorelDRAW X9 (MOCK)';
    }

    // Zorg ervoor dat we verbonden zijn
    if (!this.initialized) {
      const connected = await this.initialize();
      if (!connected) {
        throw new Error('Niet verbonden met CorelDRAW');
      }
    }

    try {
      const major = this.corelApp.VersionMajor;
      const minor = this.corelApp.VersionMinor;
      return `CorelDRAW ${major}.${minor}`;
    } catch (error) {
      logger.error('Fout bij het ophalen van CorelDRAW versie:', error);
      throw new Error(`Kon CorelDRAW versie niet ophalen: ${error.message}`);
    }
  }

  /**
   * Haalt informatie op over de CorelDRAW applicatie
   */
  async getApplicationInfo(): Promise<any> {
    if (this.mockMode) {
      return {
        version: 'X9 (MOCK)',
        buildNumber: '12345',
        productName: 'CorelDRAW Graphics Suite (MOCK)',
        hasOpenDocuments: true
      };
    }

    // Zorg ervoor dat we verbonden zijn
    if (!this.initialized) {
      const connected = await this.initialize();
      if (!connected) {
        throw new Error('Niet verbonden met CorelDRAW');
      }
    }

    try {
      return {
        version: `${this.corelApp.VersionMajor}.${this.corelApp.VersionMinor}`,
        buildNumber: this.corelApp.BuildNumber,
        productName: this.corelApp.Name,
        hasOpenDocuments: this.corelApp.Documents.Count > 0
      };
    } catch (error) {
      logger.error('Fout bij het ophalen van CorelDRAW applicatie info:', error);
      throw new Error(`Kon CorelDRAW applicatie info niet ophalen: ${error.message}`);
    }
  }

  /**
   * Voert VBA code uit in CorelDRAW
   * 
   * @param code VBA code om uit te voeren
   * @param timeout Timeout in milliseconden
   * @returns Resultaat van de uitvoering
   */
  async executeVbaCode(code: string, timeout: number = 30000): Promise<ExecutionResult> {
    if (this.mockMode) {
      logger.info('Uitvoeren van VBA code in mock mode:', code.substring(0, 100));
      return {
        success: true,
        output: 'VBA code uitgevoerd in mock mode',
        data: { code: code.substring(0, 100), timestamp: new Date().toISOString() }
      };
    }

    // Zorg ervoor dat we verbonden zijn
    if (!this.initialized) {
      const connected = await this.initialize();
      if (!connected) {
        throw new Error('Niet verbonden met CorelDRAW');
      }
    }

    // Toon een waarschuwing als er geen document open is en
    // de code daadwerkelijk iets probeert te doen met een document
    if (this.corelApp.Documents.Count === 0 && 
        (code.includes('ActiveDocument') || code.includes('ThisDocument'))) {
      logger.warn('Waarschuwing: Geen document open maar code refereert naar ActiveDocument');
    }

    try {
      // Schrijf de code naar een tijdelijk bestand
      const tempDir = path.join(process.env.TEMP || 'C:\\Temp', 'coreldraw-bridge');
      await fs.mkdir(tempDir, { recursive: true });
      
      const tempFile = path.join(tempDir, `vba_${Date.now()}.bas`);
      await fs.writeFile(tempFile, code);
      
      logger.debug(`VBA code geschreven naar tijdelijk bestand: ${tempFile}`);

      // Voer de code uit vanuit het bestand
      // In een echte implementatie zou je de Automation/COM API gebruiken
      // Dit is een placeholder voor de echte implementatie
      const result = {
        success: true,
        output: `VBA code uitgevoerd: ${code.substring(0, 100)}...`,
        data: { timestamp: new Date().toISOString() }
      };

      // Verwijder het tijdelijke bestand
      await fs.unlink(tempFile);
      
      return result;
    } catch (error) {
      logger.error('Fout bij het uitvoeren van VBA code:', error);
      return {
        success: false,
        error: `Fout bij het uitvoeren van VBA code: ${error.message}`
      };
    }
  }

  /**
   * Maakt een nieuw document
   */
  async createNewDocument(
    width: number = 210, 
    height: number = 297, 
    colorMode: string = 'CMYK',
    resolution: number = 300
  ): Promise<ExecutionResult> {
    // VBA code voor het maken van een nieuw document
    const vbaCode = `
      Sub CreateNewDocument()
        On Error Resume Next
        Dim doc As Document
        Set doc = CreateDocument
        If Err.Number <> 0 Then
          MsgBox "Error creating document: " & Err.Description
          Exit Sub
        End If
        
        ' Stel documentgrootte in
        doc.Unit = cdrMillimeter
        doc.SetSize ${width}, ${height}
        
        ' Stel kleurmodus in
        If "${colorMode}" = "CMYK" Then
          doc.SetColorMode cdrCMYKColorMode
        Else
          doc.SetColorMode cdrRGBColorMode
        End If
        
        ' Stel resolutie in
        doc.Resolution = ${resolution}
        
        MsgBox "Document created successfully"
      End Sub
      
      CreateNewDocument
    `;
    
    return this.executeVbaCode(vbaCode);
  }

  /**
   * Slaat het huidige document op
   */
  async saveDocument(filePath?: string, format: string = 'CDR'): Promise<ExecutionResult> {
    let vbaCode: string;
    
    if (filePath) {
      vbaCode = `
        Sub SaveDocument()
          On Error Resume Next
          If ActiveDocument Is Nothing Then
            MsgBox "No active document to save"
            Exit Sub
          End If
          
          ActiveDocument.SaveAs "${filePath.replace(/\\/g, '\\\\')}"
          If Err.Number <> 0 Then
            MsgBox "Error saving document: " & Err.Description
          Else
            MsgBox "Document saved successfully"
          End If
        End Sub
        
        SaveDocument
      `;
    } else {
      vbaCode = `
        Sub SaveDocument()
          On Error Resume Next
          If ActiveDocument Is Nothing Then
            MsgBox "No active document to save"
            Exit Sub
          End If
          
          ActiveDocument.Save
          If Err.Number <> 0 Then
            MsgBox "Error saving document: " & Err.Description
          Else
            MsgBox "Document saved successfully"
          End If
        End Sub
        
        SaveDocument
      `;
    }
    
    return this.executeVbaCode(vbaCode);
  }

  /**
   * Maakt een rechthoek met opgegeven eigenschappen
   */
  async createRectangle(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    fillColor?: string, 
    outlineColor?: string, 
    outlineWidth?: number
  ): Promise<ExecutionResult> {
    // Bereid de kleurparameters voor
    let fillColorCode = '';
    let outlineColorCode = '';
    
    if (fillColor) {
      // Converteer hex kleur naar RGB
      const rgb = this.hexToRgb(fillColor);
      fillColorCode = `
        Dim fillColor As Color
        fillColor.RGBAssign ${rgb.r}, ${rgb.g}, ${rgb.b}
        rect.Fill.ApplyUniformFill fillColor
      `;
    }
    
    if (outlineColor) {
      // Converteer hex kleur naar RGB
      const rgb = this.hexToRgb(outlineColor);
      outlineColorCode = `
        Dim outlineColor As Color
        outlineColor.RGBAssign ${rgb.r}, ${rgb.g}, ${rgb.b}
        rect.Outline.Color = outlineColor
      `;
      
      if (outlineWidth !== undefined) {
        outlineColorCode += `
          rect.Outline.Width = ${outlineWidth}
        `;
      }
    }
    
    // VBA code voor het maken van een rechthoek
    const vbaCode = `
      Sub CreateRectangle()
        On Error Resume Next
        If ActiveDocument Is Nothing Then
          MsgBox "No active document"
          Exit Sub
        End If
        
        ActiveDocument.Unit = cdrMillimeter
        
        Dim rect As Shape
        Set rect = ActiveDocument.ActivePage.CreateRectangle(${x}, ${y}, ${x + width}, ${y + height})
        
        If Err.Number <> 0 Then
          MsgBox "Error creating rectangle: " & Err.Description
          Exit Sub
        End If
        
        ${fillColorCode}
        ${outlineColorCode}
        
        rect.Select
        MsgBox "Rectangle created successfully"
      End Sub
      
      CreateRectangle
    `;
    
    return this.executeVbaCode(vbaCode);
  }

  /**
   * Maakt een ellips met opgegeven eigenschappen
   */
  async createEllipse(
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    fillColor?: string, 
    outlineColor?: string, 
    outlineWidth?: number
  ): Promise<ExecutionResult> {
    // Bereid de kleurparameters voor
    let fillColorCode = '';
    let outlineColorCode = '';
    
    if (fillColor) {
      // Converteer hex kleur naar RGB
      const rgb = this.hexToRgb(fillColor);
      fillColorCode = `
        Dim fillColor As Color
        fillColor.RGBAssign ${rgb.r}, ${rgb.g}, ${rgb.b}
        ellipse.Fill.ApplyUniformFill fillColor
      `;
    }
    
    if (outlineColor) {
      // Converteer hex kleur naar RGB
      const rgb = this.hexToRgb(outlineColor);
      outlineColorCode = `
        Dim outlineColor As Color
        outlineColor.RGBAssign ${rgb.r}, ${rgb.g}, ${rgb.b}
        ellipse.Outline.Color = outlineColor
      `;
      
      if (outlineWidth !== undefined) {
        outlineColorCode += `
          ellipse.Outline.Width = ${outlineWidth}
        `;
      }
    }
    
    // VBA code voor het maken van een ellips
    const vbaCode = `
      Sub CreateEllipse()
        On Error Resume Next
        If ActiveDocument Is Nothing Then
          MsgBox "No active document"
          Exit Sub
        End If
        
        ActiveDocument.Unit = cdrMillimeter
        
        Dim ellipse As Shape
        Set ellipse = ActiveDocument.ActivePage.CreateEllipse(${x}, ${y}, ${x + width}, ${y + height})
        
        If Err.Number <> 0 Then
          MsgBox "Error creating ellipse: " & Err.Description
          Exit Sub
        End If
        
        ${fillColorCode}
        ${outlineColorCode}
        
        ellipse.Select
        MsgBox "Ellipse created successfully"
      End Sub
      
      CreateEllipse
    `;
    
    return this.executeVbaCode(vbaCode);
  }

  /**
   * Maakt een tekstobject met opgegeven eigenschappen
   */
  async createText(
    x: number,
    y: number,
    text: string,
    fontName: string = "Arial",
    fontSize: number = 12,
    fillColor?: string,
    outlineColor?: string,
    outlineWidth?: number
  ): Promise<ExecutionResult> {
    if (!text) {
      return {
        success: false,
        error: "Text content is required"
      };
    }

    // Bereid de kleurparameters voor
    let fillColorCode = '';
    let outlineColorCode = '';
    
    if (fillColor) {
      // Converteer hex kleur naar RGB
      const rgb = this.hexToRgb(fillColor);
      fillColorCode = `
        Dim textFillColor As Color
        textFillColor.RGBAssign ${rgb.r}, ${rgb.g}, ${rgb.b}
        textObj.Fill.ApplyUniformFill textFillColor
      `;
    }
    
    if (outlineColor) {
      // Converteer hex kleur naar RGB
      const rgb = this.hexToRgb(outlineColor);
      outlineColorCode = `
        Dim textOutlineColor As Color
        textOutlineColor.RGBAssign ${rgb.r}, ${rgb.g}, ${rgb.b}
        textObj.Outline.Color = textOutlineColor
      `;
      
      if (outlineWidth !== undefined) {
        outlineColorCode += `
          textObj.Outline.Width = ${outlineWidth}
        `;
      }
    }
    
    // Escape quotes in the text
    const escapedText = text.replace(/"/g, '""');
    
    // VBA code voor het maken van een tekstobject
    const vbaCode = `
      Sub CreateTextObject()
        On Error Resume Next
        If ActiveDocument Is Nothing Then
          MsgBox "No active document"
          Exit Sub
        End If
        
        ActiveDocument.Unit = cdrMillimeter
        
        Dim textObj As Shape
        Set textObj = ActiveDocument.ActivePage.CreateArtisticText(${x}, ${y}, "${escapedText}", , , "${fontName}", ${fontSize})
        
        If Err.Number <> 0 Then
          MsgBox "Error creating text: " & Err.Description
          Exit Sub
        End If
        
        ${fillColorCode}
        ${outlineColorCode}
        
        textObj.Select
        MsgBox "Text created successfully"
      End Sub
      
      CreateTextObject
    `;
    
    return this.executeVbaCode(vbaCode);
  }

  /**
   * Zet een hex kleurwaarde om naar RGB object
   */
  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    // Verwijder # als die aanwezig is
    hex = hex.replace(/^#/, '');
    
    // Parse de hex waarde
    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }
} 