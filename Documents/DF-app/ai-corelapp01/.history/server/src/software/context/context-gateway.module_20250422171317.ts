import { Module } from '@nestjs/common';
import { ContextGateway } from './context.gateway';
import { CorelContextAnalyzer } from './corel-context';
import { BlenderContextAnalyzer } from './blender-context';

/**
 * This module registers the WebSocket gateway for context updates.
 * It ensures that the ContextGateway is properly registered with NestJS.
 */
@Module({
  providers: [ContextGateway],
  exports: [ContextGateway],
})
export class ContextGatewayModule {} 