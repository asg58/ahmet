import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { CorelDrawService } from './coreldraw.service';
import * as http from 'http';

// WebSocket clients bijhouden
const wsClients = new Set<WebSocket>();
// CorelDraw service instantie
let corelDrawService: CorelDrawService;

// Status van de uitvoering bijhouden
const executionStatus = {
  lastCommand: null as string | null,
  lastExecutionTime: null as number | null,
  running: false,
  successCount: 0,
  errorCount: 0
};

/**
 * Stelt de WebSocket server op en configureert de handlers
 * @param port Poort voor de WebSocket server
 * @param host Host voor de WebSocket server
 */
export function setupWebSocketServer(port: number, host: string): void {
  const wsServer = new WebSocket.Server({ port });
  corelDrawService = new CorelDrawService();

  logger.info(`WebSocket server gestart op ws://${host}:${port}`);

  wsServer.on('connection', handleConnection);
  wsServer.on('error', (error: unknown) => {
    const err = error as Error;
    logger.error(`WebSocket server error: ${err.message}`);
  });
}

/**
 * Handelt een nieuwe WebSocket verbinding af
 * @param ws WebSocket verbinding
 * @param req HTTP request (indien beschikbaar)
 */
function handleConnection(ws: WebSocket, req: http.IncomingMessage): void {
  const clientId = req?.socket?.remoteAddress || 'unknown';
  logger.info(`Nieuwe WebSocket verbinding: ${clientId}`);

  // Voeg client toe aan de set
  wsClients.add(ws);

  // Stuur initiële status
  sendInitialStatus(ws);

  // Stel handlers in voor deze verbinding
  ws.on('message', (message) => handleMessage(ws, message));
  ws.on('close', () => handleDisconnect(ws, clientId));
  ws.on('error', (error: unknown) => {
    const err = error as Error;
    logger.error(`WebSocket client error (${clientId}): ${err.message}`);
  });
}

/**
 * Verwerkt binnenkomende WebSocket berichten
 * @param ws WebSocket verbinding
 * @param message Ontvangen bericht
 */
async function handleMessage(ws: WebSocket, message: WebSocket.Data): Promise<void> {
  try {
    const data = JSON.parse(message.toString());
    const command = data.command;

    logger.info(`WebSocket bericht ontvangen: ${command}`);

    // Update status
    executionStatus.lastCommand = command;
    executionStatus.running = true;

    // Stuur status update naar alle clients
    broadcastStatus('processing', { command });

    switch (command) {
      case 'ping':
        handlePing(ws);
        break;
      case 'execute':
        await handleExecute(ws, data);
        break;
      case 'create_rectangle':
        await handleCreateRectangle(ws, data);
        break;
      case 'create_ellipse':
        await handleCreateEllipse(ws, data);
        break;
      case 'create_text':
        await handleCreateText(ws, data);
        break;
      case 'create_document':
        await handleCreateDocument(ws, data);
        break;
      case 'save_document':
        await handleSaveDocument(ws, data);
        break;
      case 'get_status':
        await handleGetStatus(ws);
        break;
      default:
        sendError(ws, `Onbekend commando: ${command}`);
    }

    // Update status
    executionStatus.running = false;
    executionStatus.lastExecutionTime = Date.now();

    // Stuur status update naar alle clients
    broadcastStatus('idle', { command, completed: true });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Fout bij verwerken WebSocket bericht: ${err.message}`);
    
    sendError(ws, `Fout bij verwerken bericht: ${err.message}`);
    
    // Update status
    executionStatus.running = false;
    executionStatus.errorCount++;
    
    // Stuur status update naar alle clients
    broadcastStatus('error', { error: err.message });
  }
}

/**
 * Handelt een ping commando af
 * @param ws WebSocket verbinding
 */
function handlePing(ws: WebSocket): void {
  send(ws, {
    type: 'pong',
    timestamp: Date.now()
  });
}

/**
 * Handelt een execute commando af
 * @param ws WebSocket verbinding
 * @param data Commando data
 */
async function handleExecute(ws: WebSocket, data: any): Promise<void> {
  const code = data.code;
  const timeout = data.timeout || 30000;
  
  if (!code) {
    sendError(ws, 'Geen code opgegeven');
    return;
  }
  
  try {
    const result = await corelDrawService.executeVbaCode(code, timeout);
    
    if (result.success) {
      executionStatus.successCount++;
      send(ws, {
        type: 'result',
        success: true,
        data: result
      });
    } else {
      executionStatus.errorCount++;
      send(ws, {
        type: 'result',
        success: false,
        error: 'Onbekende fout',
        data: result
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    executionStatus.errorCount++;
    sendError(ws, `Fout bij uitvoeren code: ${err.message}`);
  }
}

/**
 * Handelt een create_rectangle commando af
 * @param ws WebSocket verbinding
 * @param data Commando data
 */
async function handleCreateRectangle(ws: WebSocket, data: any): Promise<void> {
  const params = data.params || {};
  
  try {
    // Mock implementation since the method doesn't exist in CorelDrawService
    // const result = await corelDrawService.createRectangle(
    //   params.x || 0,
    //   params.y || 0,
    //   params.width || 100,
    //   params.height || 100,
    //   params.fillColor,
    //   params.outlineColor,
    //   params.outlineWidth
    // );
    
    // Mock result
    const result = {
      success: true,
      output: 'Rectangle created (mock)',
      data: { 
        x: params.x || 0, 
        y: params.y || 0, 
        width: params.width || 100, 
        height: params.height || 100,
        fillColor: params.fillColor,
        outlineColor: params.outlineColor,
        outlineWidth: params.outlineWidth,
        timestamp: new Date().toISOString()
      }
    };
    
    if (result.success) {
      executionStatus.successCount++;
      send(ws, {
        type: 'result',
        success: true,
        data: result
      });
    } else {
      executionStatus.errorCount++;
      send(ws, {
        type: 'result',
        success: false,
        error: 'Onbekende fout',
        data: result
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    executionStatus.errorCount++;
    sendError(ws, `Fout bij maken rechthoek: ${err.message}`);
  }
}

/**
 * Handelt een create_ellipse commando af
 * @param ws WebSocket verbinding
 * @param data Commando data
 */
async function handleCreateEllipse(ws: WebSocket, data: any): Promise<void> {
  const params = data.params || {};
  
  try {
    // Mock implementation since the method doesn't exist in CorelDrawService
    // const result = await corelDrawService.createEllipse(
    //   params.x || 0,
    //   params.y || 0,
    //   params.width || 100,
    //   params.height || 100,
    //   params.fillColor,
    //   params.outlineColor,
    //   params.outlineWidth
    // );
    
    // Mock result
    const result = {
      success: true,
      output: 'Ellipse created (mock)',
      data: { 
        x: params.x || 0, 
        y: params.y || 0, 
        width: params.width || 100, 
        height: params.height || 100,
        fillColor: params.fillColor,
        outlineColor: params.outlineColor,
        outlineWidth: params.outlineWidth,
        timestamp: new Date().toISOString()
      }
    };
    
    if (result.success) {
      executionStatus.successCount++;
      send(ws, {
        type: 'result',
        success: true,
        data: result
      });
    } else {
      executionStatus.errorCount++;
      send(ws, {
        type: 'result',
        success: false,
        error: 'Onbekende fout',
        data: result
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    executionStatus.errorCount++;
    sendError(ws, `Fout bij maken ellips: ${err.message}`);
  }
}

/**
 * Handelt een create_text commando af
 * @param ws WebSocket verbinding
 * @param data Commando data
 */
async function handleCreateText(ws: WebSocket, data: any): Promise<void> {
  const params = data.params || {};
  
  try {
    // Mock implementation since the method doesn't exist in CorelDrawService
    // const result = await corelDrawService.createText(
    //   params.x || 0,
    //   params.y || 0,
    //   params.text || '',
    //   params.fontName || 'Arial',
    //   params.fontSize || 12,
    //   params.fillColor,
    //   params.outlineColor,
    //   params.outlineWidth
    // );
    
    // Mock result
    const result = {
      success: true,
      output: 'Text created (mock)',
      data: { 
        x: params.x || 0, 
        y: params.y || 0, 
        text: params.text || '',
        fontName: params.fontName || 'Arial',
        fontSize: params.fontSize || 12,
        fillColor: params.fillColor,
        outlineColor: params.outlineColor,
        outlineWidth: params.outlineWidth,
        timestamp: new Date().toISOString()
      }
    };
    
    if (result.success) {
      executionStatus.successCount++;
      send(ws, {
        type: 'result',
        success: true,
        data: result
      });
    } else {
      executionStatus.errorCount++;
      send(ws, {
        type: 'result',
        success: false,
        error: 'Onbekende fout',
        data: result
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    executionStatus.errorCount++;
    sendError(ws, `Fout bij maken tekst: ${err.message}`);
  }
}

/**
 * Handelt een create_document commando af
 * @param ws WebSocket verbinding
 * @param data Commando data
 */
async function handleCreateDocument(ws: WebSocket, data: any): Promise<void> {
  const params = data.params || {};
  
  try {
    const result = await corelDrawService.createNewDocument(
      params.width,
      params.height,
      params.colorMode,
      params.resolution
    );
    
    if (result.success) {
      executionStatus.successCount++;
      send(ws, {
        type: 'result',
        success: true,
        data: result
      });
    } else {
      executionStatus.errorCount++;
      send(ws, {
        type: 'result',
        success: false,
        error: 'Onbekende fout',
        data: result
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    executionStatus.errorCount++;
    sendError(ws, `Fout bij maken document: ${err.message}`);
  }
}

/**
 * Handelt een save_document commando af
 * @param ws WebSocket verbinding
 * @param data Commando data
 */
async function handleSaveDocument(ws: WebSocket, data: any): Promise<void> {
  const params = data.params || {};
  
  try {
    // Mock implementation since the method doesn't exist in CorelDrawService
    // const result = await corelDrawService.saveDocument(
    //   params.path,
    //   params.format || 'CDR'
    // );
    
    // Mock result
    const result = {
      success: true,
      output: 'Document saved (mock)',
      data: { 
        path: params.path, 
        format: params.format || 'CDR',
        timestamp: new Date().toISOString()
      }
    };
    
    if (result.success) {
      executionStatus.successCount++;
      send(ws, {
        type: 'result',
        success: true,
        data: result
      });
    } else {
      executionStatus.errorCount++;
      send(ws, {
        type: 'result',
        success: false,
        error: 'Onbekende fout',
        data: result
      });
    }
  } catch (error: unknown) {
    const err = error as Error;
    executionStatus.errorCount++;
    sendError(ws, `Fout bij opslaan document: ${err.message}`);
  }
}

/**
 * Handelt een get_status commando af
 * @param ws WebSocket verbinding
 */
async function handleGetStatus(ws: WebSocket): Promise<void> {
  try {
    const isRunning = await corelDrawService.isRunning();
    let version = 'Onbekend';
    
    if (isRunning) {
      try {
        version = await corelDrawService.getVersion();
      } catch (e: unknown) {
        const err = e as Error;
        logger.error(`Fout bij ophalen versie: ${err.message}`);
      }
    }
    
    send(ws, {
      type: 'status',
      data: {
        connected: isRunning,
        version,
        executionStatus
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Fout bij ophalen status: ${err.message}`);
    sendError(ws, `Fout bij ophalen status: ${err.message}`);
  }
}

/**
 * Stuurt de initiële status naar een nieuwe client
 * @param ws WebSocket verbinding
 */
async function sendInitialStatus(ws: WebSocket): Promise<void> {
  try {
    const isRunning = await corelDrawService.isRunning();
    let version = 'Onbekend';
    
    if (isRunning) {
      try {
        version = await corelDrawService.getVersion();
      } catch (e: unknown) {
        const err = e as Error;
        logger.error(`Fout bij ophalen versie: ${err.message}`);
      }
    }
    
    send(ws, {
      type: 'status',
      data: {
        connected: isRunning,
        version,
        executionStatus
      }
    });
  } catch (error: unknown) {
    const err = error as Error;
    logger.error(`Fout bij verzenden initiële status: ${err.message}`);
    sendError(ws, `Fout bij ophalen status: ${err.message}`);
  }
}

/**
 * Handelt het verbreken van een WebSocket verbinding af
 * @param ws WebSocket verbinding
 * @param clientId ID van de client
 */
function handleDisconnect(ws: WebSocket, clientId: string): void {
  logger.info(`WebSocket verbinding gesloten: ${clientId}`);
  
  // Verwijder client uit de set
  wsClients.delete(ws);
}

/**
 * Stuurt een bericht naar een WebSocket client
 * @param ws WebSocket verbinding
 * @param data Gegevens om te verzenden
 */
function send(ws: WebSocket, data: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      ...data,
      timestamp: Date.now()
    }));
  }
}

/**
 * Stuurt een foutmelding naar een WebSocket client
 * @param ws WebSocket verbinding
 * @param errorMessage Foutmelding
 */
function sendError(ws: WebSocket, errorMessage: string): void {
  send(ws, {
    type: 'error',
    error: errorMessage
  });
}

/**
 * Stuurt een statusbericht naar alle verbonden clients
 * @param status Status string
 * @param data Extra gegevens
 */
function broadcastStatus(status: string, data: any = {}): void {
  const message = JSON.stringify({
    type: 'status_update',
    status,
    timestamp: Date.now(),
    data
  });
  
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
} 