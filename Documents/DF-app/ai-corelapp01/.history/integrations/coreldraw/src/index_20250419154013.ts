import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { setupRoutes } from './routes';
import { configureLogger, logger } from './utils/logger';

// Laad omgevingsvariabelen
dotenv.config();

// Configureer de logger
configureLogger();

// Creëer Express app
const app = express();
const port = process.env.PORT || 3001;
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

// Start de server
app.listen(port, () => {
  logger.info(`CorelDRAW Bridge service gestart op http://${host}:${port}`);
  logger.info(`Geconfigueerd voor CorelDRAW versie: ${process.env.CORELDRAW_VERSION || 'Niet geconfigureerd'}`);
});

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Onbehandelde exceptie:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Onbehandelde promise rejection:', reason);
}); 