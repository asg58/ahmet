import './polyfills'; // Import polyfills first
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  try {
    dotenv.config();
    const logger = new Logger('Bootstrap');
    
    logger.log('Creating NestJS application...');
    
    const app = await NestFactory.create(AppModule, {
      cors: true,
      logger: ['error', 'warn', 'debug', 'log', 'verbose'],
    });
    
    // Enable CORS
    app.enableCors({
      origin: ['http://localhost:3001', 'http://localhost:3000', '*'],
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
    
    // Add global health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
      logger.log('Health check endpoint called');
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    });
    
    // Add global health check endpoint under /api/health
    app.getHttpAdapter().get('/api/health', (req, res) => {
      logger.log('API health check endpoint called');
      res.json({
        status: 'ok',
        service: 'ai-corelapp01-server',
        timestamp: new Date().toISOString()
      });
    });
    
    // Setup Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('CorelDRAW & Blender AI Assistant API')
      .setDescription('API documentation for the context-aware AI assistant for design software')
      .setVersion('1.0')
      .addTag('chat', 'Chat and conversation management endpoints')
      .addTag('software', 'Software integration and command execution endpoints')
      .addTag('poc', 'Proof of concept integration testing endpoints')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    
    const port = process.env.PORT || 4000;
    logger.log(`Attempting to start server on port ${port}...`);
    
    await app.listen(port, '0.0.0.0');
    
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
    logger.log(`WebSocket server available at: ws://localhost:${port}/socket.io`);
    logger.log(`Ollama host: ${process.env.OLLAMA_HOST || 'localhost'}`);
    logger.log(`Chroma host: ${process.env.CHROMA_HOST || 'localhost'}`);
  } catch (error) {
    console.error('Failed to start the application:', error);
    process.exit(1);
  }
}

bootstrap(); 