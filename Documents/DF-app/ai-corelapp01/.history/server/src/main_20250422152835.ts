import './polyfills'; // Import polyfills first
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  dotenv.config();
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });
  
  // Enable CORS
  app.enableCors({
    origin: ['http://localhost:3001', 'http://localhost:3000', '*'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
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
  await app.listen(port, '0.0.0.0');
  
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`WebSocket server available at: ws://localhost:${port}/socket.io`);
  logger.log(`Ollama host: ${process.env.OLLAMA_HOST || 'localhost'}`);
  logger.log(`Chroma host: ${process.env.CHROMA_HOST || 'localhost'}`);
}
bootstrap(); 