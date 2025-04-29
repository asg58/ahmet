import { Express } from 'express';
import { CorelDrawService } from '../services/coreldraw.service';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

/**
 * Stelt routes in voor het ophalen van vectordata uit CorelDRAW
 * @param app Express applicatie instantie
 * @param prefix API route prefix
 */
export function setupVectorRoutes(app: Express, prefix: string): void {
  const corelDrawService = new CorelDrawService();
  const tempDir = path.join(os.tmpdir(), 'coreldraw-vector-output');

  // Zorg ervoor dat de temp directory bestaat
  (async () => {
    try {
      await fs.mkdir(tempDir, { recursive: true });
      logger.info(`Vector output directory aangemaakt: ${tempDir}`);
    } catch (error: any) {
      logger.error(`Fout bij aanmaken vector output directory: ${error.message}`);
    }
  })();

  /**
   * POST /api/vector/export - Exporteert het huidige document naar SVG/PDF
   * 
   * Request body:
   * {
   *   "format": "SVG" | "PDF", // Format to export (default: SVG)
   *   "pageRange": "1" | "1-3" | "all", // Pages to export (default: "all")
   *   "quality": "low" | "medium" | "high" // Export quality (default: "high")
   * }
   */
  app.post(`${prefix}/vector/export`, async (req, res) => {
    const { 
      format = 'SVG', 
      pageRange = 'all',
      quality = 'high' 
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

      // Genereer een unieke bestandsnaam
      const timestamp = Date.now();
      const outputFilename = `export-${timestamp}.${format.toLowerCase()}`;
      const outputPath = path.join(tempDir, outputFilename);

      // Genereer de VBA code voor export
      const vbaCode = format === 'SVG' 
        ? generateSvgExportCode(outputPath, pageRange, quality) 
        : generatePdfExportCode(outputPath, pageRange, quality);
      
      // Voer de code uit
      const result = await corelDrawService.executeVbaCode(vbaCode);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Fout bij exporteren van document'
        });
      }

      // Controleer of het bestand bestaat
      try {
        await fs.access(outputPath);
      } catch (error: any) {
        return res.status(500).json({
          success: false,
          error: `Kon het geëxporteerde bestand niet vinden: ${error.message}`
        });
      }

      // Lees het bestand en stuur het terug
      const fileContent = await fs.readFile(outputPath);
      
      // Set the appropriate content type
      if (format === 'SVG') {
        res.setHeader('Content-Type', 'image/svg+xml');
      } else {
        res.setHeader('Content-Type', 'application/pdf');
      }
      
      res.setHeader('Content-Disposition', `attachment; filename=${outputFilename}`);
      res.send(fileContent);

      // Verwijder het tijdelijke bestand
      try {
        await fs.unlink(outputPath);
      } catch (err: any) {
        logger.error(`Fout bij verwijderen tijdelijk bestand: ${err.message}`);
      }
    } catch (error: any) {
      logger.error(`Fout bij exporteren vector: ${error.message}`);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });

  /**
   * POST /api/vector/capture - Capture the current document state as SVG/PDF
   * 
   * Request body:
   * {
   *   "format": "SVG" | "PDF" | "BASE64", // Format to capture (default: "BASE64")
   *   "selection": boolean // Only capture selection (default: false)
   * }
   */
  app.post(`${prefix}/vector/capture`, async (req, res) => {
    const { 
      format = 'BASE64', 
      selection = false 
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

      // Genereer een unieke bestandsnaam
      const timestamp = Date.now();
      const outputFilename = `capture-${timestamp}.svg`;
      const outputPath = path.join(tempDir, outputFilename);

      // Genereer de VBA code voor capture
      let vbaCode;
      if (selection) {
        vbaCode = generateSelectionCaptureCode(outputPath);
      } else {
        vbaCode = generateDocumentCaptureCode(outputPath);
      }
      
      // Voer de code uit
      const result = await corelDrawService.executeVbaCode(vbaCode);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error || 'Fout bij vastleggen van document'
        });
      }

      // Controleer of het bestand bestaat
      try {
        await fs.access(outputPath);
      } catch (error: any) {
        return res.status(500).json({
          success: false,
          error: `Kon het vastgelegde bestand niet vinden: ${error.message}`
        });
      }

      // Lees het bestand
      const fileContent = await fs.readFile(outputPath);
      
      // Return in het gevraagde formaat
      if (format === 'SVG') {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename=${outputFilename}`);
        res.send(fileContent);
      } else if (format === 'PDF') {
        // Converteer SVG naar PDF (vereenvoudigd, in werkelijkheid zou je een SVG-naar-PDF conversie doen)
        const pdfOutputPath = outputPath.replace('.svg', '.pdf');
        const pdfConversionCode = generateSvgToPdfConversionCode(outputPath, pdfOutputPath);
        
        const conversionResult = await corelDrawService.executeVbaCode(pdfConversionCode);
        if (!conversionResult.success) {
          return res.status(500).json({
            success: false,
            error: conversionResult.error || 'Fout bij converteren naar PDF'
          });
        }
        
        const pdfContent = await fs.readFile(pdfOutputPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${outputFilename.replace('.svg', '.pdf')}`);
        res.send(pdfContent);
        
        // Verwijder het PDF-bestand
        try {
          await fs.unlink(pdfOutputPath);
        } catch (err: any) {
          logger.error(`Fout bij verwijderen tijdelijk PDF-bestand: ${err.message}`);
        }
      } else {
        // BASE64 formaat
        const base64Content = fileContent.toString('base64');
        res.json({
          success: true,
          format: 'svg+xml',
          data: base64Content
        });
      }

      // Verwijder het tijdelijke bestand
      try {
        await fs.unlink(outputPath);
      } catch (err) {
        logger.error(`Fout bij verwijderen tijdelijk bestand: ${err.message}`);
      }
    } catch (error) {
      logger.error(`Fout bij vastleggen vector: ${error.message}`);
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  });
}

/**
 * Genereert VBA code voor SVG export
 */
function generateSvgExportCode(outputPath: string, pageRange: string, quality: string): string {
  const qualityLevel = quality === 'high' ? 100 : (quality === 'medium' ? 75 : 50);
  
  return `
  Sub ExportToSVG()
    On Error GoTo ErrorHandler
    
    Dim expOpt As ExportOptions
    Set expOpt = CreateObject("CorelDRAW.ExportOptions")
    
    ' Stel SVG export opties in
    expOpt.UseColorProfile = True
    expOpt.UseLayers = True
    expOpt.TextAsCurves = False
    expOpt.EmbedFonts = True
    
    ' Stel kwaliteitsniveau in
    expOpt.JPEGQuality = ${qualityLevel}
    
    ' Bepaal pagina bereik
    Dim pages As String
    pages = "${pageRange}"
    
    If pages = "all" Then
      ' Exporteer alle pagina's
      ActiveDocument.ExportEx "${outputPath.replace(/\\/g, '\\\\')}", cdrSVG, cdrAllPages, expOpt
    ElseIf InStr(pages, "-") > 0 Then
      ' Exporteer een reeks pagina's
      Dim pageRange As String
      pageRange = pages
      ActiveDocument.ExportEx "${outputPath.replace(/\\/g, '\\\\')}", cdrSVG, cdrRangeOfPages, expOpt, , pageRange
    Else
      ' Exporteer één pagina
      Dim pageNum As Long
      pageNum = Val(pages)
      ActiveDocument.Pages(pageNum).ExportEx "${outputPath.replace(/\\/g, '\\\\')}", cdrSVG, , expOpt
    End If
    
    MsgBox "Export voltooid naar: ${outputPath}"
    Exit Sub
    
  ErrorHandler:
    MsgBox "Fout bij exporteren naar SVG: " & Err.Description
  End Sub
  
  ExportToSVG
  `;
}

/**
 * Genereert VBA code voor PDF export
 */
function generatePdfExportCode(outputPath: string, pageRange: string, quality: string): string {
  const qualityLevel = quality === 'high' ? 100 : (quality === 'medium' ? 75 : 50);
  
  return `
  Sub ExportToPDF()
    On Error GoTo ErrorHandler
    
    Dim pdfOpt As StructPDFOptions
    Set pdfOpt = CreateObject("CorelDRAW.StructPDFOptions")
    
    ' Stel PDF export opties in
    pdfOpt.TextAsCurves = False
    pdfOpt.EmbedFonts = True
    pdfOpt.JPEGQuality = ${qualityLevel}
    
    ' Bepaal pagina bereik
    Dim pages As String
    pages = "${pageRange}"
    
    If pages = "all" Then
      ' Exporteer alle pagina's
      ActiveDocument.PublishToPDF "${outputPath.replace(/\\/g, '\\\\')}", pdfOpt
    ElseIf InStr(pages, "-") > 0 Then
      ' Exporteer een reeks pagina's
      Dim pageRange As Variant
      pageRange = Split(pages, "-")
      Dim startPage As Long, endPage As Long
      startPage = CLng(Trim(pageRange(0)))
      endPage = CLng(Trim(pageRange(1)))
      
      ' Stel pagina bereik in voor PDF opties
      pdfOpt.PagesRange = 2  ' Pages range option
      pdfOpt.RangeFrom = startPage
      pdfOpt.RangeTo = endPage
      
      ActiveDocument.PublishToPDF "${outputPath.replace(/\\/g, '\\\\')}", pdfOpt
    Else
      ' Exporteer één pagina
      Dim pageNum As Long
      pageNum = Val(pages)
      
      ' Stel pagina bereik in voor PDF opties
      pdfOpt.PagesRange = 2  ' Pages range option
      pdfOpt.RangeFrom = pageNum
      pdfOpt.RangeTo = pageNum
      
      ActiveDocument.PublishToPDF "${outputPath.replace(/\\/g, '\\\\')}", pdfOpt
    End If
    
    MsgBox "Export voltooid naar: ${outputPath}"
    Exit Sub
    
  ErrorHandler:
    MsgBox "Fout bij exporteren naar PDF: " & Err.Description
  End Sub
  
  ExportToPDF
  `;
}

/**
 * Genereert VBA code voor het vastleggen van de huidige selectie als SVG
 */
function generateSelectionCaptureCode(outputPath: string): string {
  return `
  Sub CaptureSelection()
    On Error GoTo ErrorHandler
    
    ' Controleer of er een selectie is
    If ActiveSelectionRange.Count = 0 Then
      MsgBox "Geen objecten geselecteerd"
      Exit Sub
    End If
    
    ' Kopieer selectie naar nieuw document
    ActiveDocument.ActivePage.CreateSelection ActiveSelectionRange
    ActiveDocument.ActivePage.Selection.Copy
    
    Dim tempDoc As Document
    Set tempDoc = CreateDocument
    tempDoc.ActivePage.Selection.Paste
    
    ' Exporteer als SVG
    Dim expOpt As ExportOptions
    Set expOpt = CreateObject("CorelDRAW.ExportOptions")
    
    ' Stel SVG export opties in
    expOpt.UseColorProfile = True
    expOpt.UseLayers = True
    expOpt.TextAsCurves = False
    expOpt.EmbedFonts = True
    expOpt.JPEGQuality = 100
    
    ' Exporteer naar SVG
    tempDoc.ExportEx "${outputPath.replace(/\\/g, '\\\\')}", cdrSVG, cdrCurrentPage, expOpt
    
    ' Sluit tijdelijk document zonder opslaan
    tempDoc.Close (False)
    
    MsgBox "Selectie vastgelegd als SVG: ${outputPath}"
    Exit Sub
    
  ErrorHandler:
    MsgBox "Fout bij vastleggen selectie: " & Err.Description
    
    ' Probeer het tijdelijke document te sluiten als het bestaat
    On Error Resume Next
    If Not tempDoc Is Nothing Then
      tempDoc.Close (False)
    End If
  End Sub
  
  CaptureSelection
  `;
}

/**
 * Genereert VBA code voor het vastleggen van het huidige document als SVG
 */
function generateDocumentCaptureCode(outputPath: string): string {
  return `
  Sub CaptureDocument()
    On Error GoTo ErrorHandler
    
    ' Exporteer als SVG
    Dim expOpt As ExportOptions
    Set expOpt = CreateObject("CorelDRAW.ExportOptions")
    
    ' Stel SVG export opties in
    expOpt.UseColorProfile = True
    expOpt.UseLayers = True
    expOpt.TextAsCurves = False
    expOpt.EmbedFonts = True
    expOpt.JPEGQuality = 100
    
    ' Exporteer naar SVG
    ActiveDocument.ExportEx "${outputPath.replace(/\\/g, '\\\\')}", cdrSVG, cdrCurrentPage, expOpt
    
    MsgBox "Document vastgelegd als SVG: ${outputPath}"
    Exit Sub
    
  ErrorHandler:
    MsgBox "Fout bij vastleggen document: " & Err.Description
  End Sub
  
  CaptureDocument
  `;
}

/**
 * Genereert VBA code voor het converteren van SVG naar PDF
 */
function generateSvgToPdfConversionCode(svgPath: string, pdfPath: string): string {
  return `
  Sub ConvertSvgToPdf()
    On Error GoTo ErrorHandler
    
    ' Open het SVG bestand
    Dim doc As Document
    Set doc = OpenDocument("${svgPath.replace(/\\/g, '\\\\')}")
    
    ' Exporteer als PDF
    Dim pdfOpt As StructPDFOptions
    Set pdfOpt = CreateObject("CorelDRAW.StructPDFOptions")
    
    ' Stel PDF export opties in
    pdfOpt.TextAsCurves = False
    pdfOpt.EmbedFonts = True
    pdfOpt.JPEGQuality = 100
    
    ' Exporteer naar PDF
    doc.PublishToPDF "${pdfPath.replace(/\\/g, '\\\\')}", pdfOpt
    
    ' Sluit document zonder opslaan
    doc.Close (False)
    
    MsgBox "SVG geconverteerd naar PDF: ${pdfPath}"
    Exit Sub
    
  ErrorHandler:
    MsgBox "Fout bij converteren SVG naar PDF: " & Err.Description
    
    ' Probeer het document te sluiten als het bestaat
    On Error Resume Next
    If Not doc Is Nothing Then
      doc.Close (False)
    End If
  End Sub
  
  ConvertSvgToPdf
  `;
} 