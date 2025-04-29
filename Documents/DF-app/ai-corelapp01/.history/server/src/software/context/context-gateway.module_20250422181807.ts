import { Module, forwardRef } from '@nestjs/common';
import { ContextGateway } from './context.gateway';
import { SoftwareModule } from '../software.module';

/**
 * This module registers the WebSocket gateway for context updates.
 * It ensures that the ContextGateway is properly registered with NestJS.
 */
@Module({
  imports: [forwardRef(() => SoftwareModule)],
  providers: [ContextGateway],
  exports: [ContextGateway],
})
export class ContextGatewayModule {} 