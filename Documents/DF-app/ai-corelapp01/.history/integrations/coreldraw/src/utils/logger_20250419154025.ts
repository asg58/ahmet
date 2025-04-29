import winston from 'winston';

// De logger instantie
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message} ${stack || ''}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Configureer de logger op basis van omgevingsvariabelen
 */
export function configureLogger(): void {
  // Stel het log niveau in
  const logLevel = process.env.LOG_LEVEL || 'info';
  logger.level = logLevel;

  // Voeg file transport toe in productie
  if (process.env.NODE_ENV === 'production') {
    logger.add(
      new winston.transports.File({ 
        filename: 'logs/corel-bridge.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      })
    );
  }

  logger.info(`Logger geconfigureerd op niveau: ${logLevel}`);
} 