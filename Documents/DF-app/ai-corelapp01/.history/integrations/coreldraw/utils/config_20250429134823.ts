import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config();

export const config = {
  PORT: process.env.PORT || '4500',
  WEBSOCKET_PORT: process.env.WEBSOCKET_PORT || '4501',
  HOST: process.env.HOST || '0.0.0.0',
  CORELDRAW_VERSION: process.env.CORELDRAW_VERSION || '2022',
  CORELDRAW_PATH: process.env.CORELDRAW_PATH || 'C:\\Program Files\\Corel\\CorelDRAW Graphics Suite 2022\\Programs\\CorelDRW.exe',
  MOCK_MODE: process.env.MOCK_CORELDRAW || 'true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default config; 