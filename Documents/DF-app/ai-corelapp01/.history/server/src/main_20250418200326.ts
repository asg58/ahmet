import './polyfills'; // Import polyfills first
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  dotenv.config();
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule);
  
  // Setup CORS
  app.enableCors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  logger.log(`Server running on port ${port}`);
  logger.log(`Ollama host: ${process.env.OLLAMA_HOST || 'localhost'}`);
  logger.log(`Chroma host: ${process.env.CHROMA_HOST || 'localhost'}`);
}
bootstrap(); 