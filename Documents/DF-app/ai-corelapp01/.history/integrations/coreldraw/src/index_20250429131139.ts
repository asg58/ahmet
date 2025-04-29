import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import WebSocket from 'ws';
import http from 'http';
import { setupRoutes } from './routes';
import { configureLogger, logger } from './utils/logger';
import { setupWebSocketServer } from './services/websocket.service';

// Laad omgevingsvariabelen
dotenv.config();

// Configureer de logger
configureLogger();

// Log belangrijke omgevingsvariabelen
logger.info(`MOCK_MODE is ingesteld op: ${process.env.MOCK_MODE || 'false'}`);
logger.info(`NODE_ENV is ingesteld op: ${process.env.NODE_ENV || 'development'}`);

// Creëer Express app
const app = express();
const port = parseInt(process.env.PORT || '3001');
const wsPort = parseInt(process.env.WEBSOCKET_PORT || '3002');
const host = process.env.HOST || 'localhost';

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes instellen
setupRoutes(app);

// HTTP server maken voor de REST API
const server = http.createServer(app);

// Start de REST API server
server.listen(port, () => {
  logger.info(`CorelDRAW Bridge REST API gestart op http://${host}:${port}`);
  logger.info(`Mock mode: ${process.env.MOCK_MODE || 'false'}`);
  logger.info(`Geconfigureerd voor CorelDRAW versie: ${process.env.CORELDRAW_VERSION || 'Niet geconfigureerd'}`);
});

// WebSocket server opzetten
try {
  setupWebSocketServer(wsPort, host);
} catch (error) {
  if (error instanceof Error) {
    logger.error(`Fout bij opstarten van WebSocket server: ${error.message}`);
  } else {
    logger.error('Onbekende fout bij opstarten van WebSocket server');
  }
}

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Onbehandelde exceptie:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Onbehandelde promise rejection:', reason);
}); 