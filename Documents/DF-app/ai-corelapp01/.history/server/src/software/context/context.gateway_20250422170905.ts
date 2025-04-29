/**
 * Context Gateway
 * 
 * WebSocket gateway voor real-time context updates vanuit de ontwerpsoftware.
 * Deze gateway zorgt ervoor dat clients automatisch updates ontvangen over
 * wijzigingen in het ontwerpdocument zonder dat ze hoeven te pollen.
 */

import { 
  WebSocketGateway, 
  WebSocketServer, 
  SubscribeMessage, 
  OnGatewayConnection, 
  OnGatewayDisconnect, 
  OnGatewayInit,
  WsResponse
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { DesignContext, ContextUpdate } from './design-context';
import { BlenderContextAnalyzer } from './blender-context';
import { CorelContextAnalyzer } from './corel-context';

interface ContextSubscription {
  clientId: string;
  platform: 'coreldraw' | 'blender';
  sessionId: string;
  lastUpdate: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  namespace: 'context',
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Allow Engine.IO version 3 compatibility
})
@Injectable()
export class ContextGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  
  private readonly logger = new Logger(ContextGateway.name);
  private readonly subscriptions = new Map<string, ContextSubscription>();
  private readonly activeTracking = new Set<string>(); // Set of active platforms
  
  constructor(
    private readonly blenderContextAnalyzer: BlenderContextAnalyzer,
    private readonly corelContextAnalyzer: CorelContextAnalyzer,
  ) {}
  
  afterInit(server: Server) {
    this.logger.log('Context Gateway initialized');
    
    // Log adapter details
    const adapter = this.server.adapter;
    this.logger.log(`Using adapter: ${adapter.constructor.name}`);
  }
  
  handleConnection(client: Socket) {
    this.logger.log(`Context Client connected: ${client.id}`);
    
    // Log connection details
    const transport = client.conn?.transport?.name || 'unknown';
    const address = client.handshake?.address || 'unknown';
    const userAgent = client.handshake?.headers?.['user-agent'] || 'unknown';
    
    this.logger.debug(`Client details - ID: ${client.id}, Transport: ${transport}, Address: ${address}, Agent: ${userAgent}`);
    
    const auth = client.handshake?.auth;
    if (auth) {
      this.logger.debug(`Auth data: ${JSON.stringify(auth)}`);
    }
  }
  
  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
    
    // Remove subscriptions for this client
    const clientSubs = Array.from(this.subscriptions.entries())
      .filter(([_, sub]) => sub.clientId === client.id);
    
    clientSubs.forEach(([key]) => {
      this.subscriptions.delete(key);
    });
    
    // Check if we need to stop tracking for any platforms
    this.updateTrackingStatus();
  }
  
  /**
   * Subscribe to context updates for a platform
   */
  @SubscribeMessage('subscribeContext')
  handleSubscribeContext(client: Socket, payload: { platform: 'coreldraw' | 'blender', sessionId: string }): WsResponse<{success: boolean}> {
    const { platform, sessionId } = payload;
    const subKey = `${platform}:${sessionId}`;
    
    this.logger.debug(`Client ${client.id} subscribing to ${platform} context updates for session ${sessionId}`);
    
    // Add subscription
    this.subscriptions.set(subKey, {
      clientId: client.id,
      platform,
      sessionId,
      lastUpdate: Date.now(),
    });
    
    // Start tracking if not already active
    this.updateTrackingStatus();
    
    return { event: 'subscribeContextResponse', data: { success: true } };
  }
  
  /**
   * Unsubscribe from context updates
   */
  @SubscribeMessage('unsubscribeContext')
  handleUnsubscribeContext(client: Socket, payload: { platform: 'coreldraw' | 'blender', sessionId: string }): WsResponse<{success: boolean}> {
    const { platform, sessionId } = payload;
    const subKey = `${platform}:${sessionId}`;
    
    this.logger.debug(`Client ${client.id} unsubscribing from ${platform} context updates for session ${sessionId}`);
    
    // Remove subscription
    this.subscriptions.delete(subKey);
    
    // Update tracking status
    this.updateTrackingStatus();
    
    return { event: 'unsubscribeContextResponse', data: { success: true } };
  }
  
  /**
   * Manually request current context for a platform
   */
  @SubscribeMessage('requestContext')
  async handleRequestContext(client: Socket, payload: { platform: 'coreldraw' | 'blender' }): Promise<WsResponse<DesignContext | {error: string}>> {
    const { platform } = payload;
    
    try {
      let context: DesignContext;
      
      if (platform === 'blender') {
        context = await this.blenderContextAnalyzer.captureContext();
      } else if (platform === 'coreldraw') {
        context = await this.corelContextAnalyzer.captureContext();
      } else {
        return { 
          event: 'contextResponse', 
          data: { error: `Unsupported platform: ${platform}` } 
        };
      }
      
      return { event: 'contextResponse', data: context };
    } catch (error) {
      this.logger.error(`Error capturing context for ${platform}: ${error.message}`);
      return { 
        event: 'contextResponse', 
        data: { error: `Failed to capture context: ${error.message}` } 
      };
    }
  }
  
  /**
   * Update or enable tracking for all necessary platforms
   */
  private async updateTrackingStatus() {
    // Get all unique platforms from subscriptions
    const activePlatforms = new Set<'coreldraw' | 'blender'>();
    
    this.subscriptions.forEach(sub => {
      activePlatforms.add(sub.platform);
    });
    
    // Start tracking for newly active platforms
    for (const platform of activePlatforms) {
      if (!this.activeTracking.has(platform)) {
        await this.startTracking(platform);
      }
    }
    
    // Stop tracking for platforms with no subscriptions
    for (const platform of this.activeTracking) {
      if (!activePlatforms.has(platform as 'coreldraw' | 'blender')) {
        await this.stopTracking(platform as 'coreldraw' | 'blender');
      }
    }
  }
  
  /**
   * Start tracking for a platform
   */
  private async startTracking(platform: 'coreldraw' | 'blender') {
    this.logger.log(`Starting context tracking for ${platform}`);
    
    try {
      if (platform === 'blender') {
        await this.blenderContextAnalyzer.startContextTracking(update => {
          this.handleContextUpdate(platform, update);
        });
      } else if (platform === 'coreldraw') {
        await this.corelContextAnalyzer.startContextTracking(update => {
          this.handleContextUpdate(platform, update);
        });
      }
      
      this.activeTracking.add(platform);
    } catch (error) {
      this.logger.error(`Failed to start tracking for ${platform}: ${error.message}`);
    }
  }
  
  /**
   * Stop tracking for a platform
   */
  private async stopTracking(platform: 'coreldraw' | 'blender') {
    this.logger.log(`Stopping context tracking for ${platform}`);
    
    try {
      if (platform === 'blender') {
        await this.blenderContextAnalyzer.stopContextTracking();
      } else if (platform === 'coreldraw') {
        await this.corelContextAnalyzer.stopContextTracking();
      }
      
      this.activeTracking.delete(platform);
    } catch (error) {
      this.logger.error(`Failed to stop tracking for ${platform}: ${error.message}`);
    }
  }
  
  /**
   * Process a context update and broadcast to relevant clients
   */
  private handleContextUpdate(platform: 'coreldraw' | 'blender', update: ContextUpdate) {
    // Get all subscriptions for this platform and document
    const relevantSubs = Array.from(this.subscriptions.values())
      .filter(sub => sub.platform === platform);
    
    if (relevantSubs.length === 0) {
      return;
    }
    
    // Group subscriptions by session
    const sessionSubs = new Map<string, string[]>();
    
    relevantSubs.forEach(sub => {
      if (!sessionSubs.has(sub.sessionId)) {
        sessionSubs.set(sub.sessionId, []);
      }
      sessionSubs.get(sub.sessionId).push(sub.clientId);
    });
    
    // Send updates to each session
    sessionSubs.forEach((clientIds, sessionId) => {
      // Include session ID in update
      const sessionUpdate = {
        ...update,
        sessionId,
      };
      
      // Send to all clients subscribed to this session
      clientIds.forEach(clientId => {
        this.server.to(clientId).emit('contextUpdate', sessionUpdate);
      });
    });
  }
  
  /**
   * Throttle function to limit the rate of context updates
   */
  private throttle<T>(func: (arg: T) => void, delay: number): (arg: T) => void {
    let lastCall = 0;
    let timeout: NodeJS.Timeout | null = null;
    let lastArgs: T | null = null;
    
    return (arg: T) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      // Clear any pending calls
      if (timeout !== null) {
        clearTimeout(timeout);
        timeout = null;
      }
      
      if (timeSinceLastCall >= delay) {
        // Execute immediately
        lastCall = now;
        func(arg);
      } else {
        // Schedule to run after delay
        lastArgs = arg;
        timeout = setTimeout(() => {
          lastCall = Date.now();
          if (lastArgs !== null) {
            func(lastArgs);
          }
          timeout = null;
          lastArgs = null;
        }, delay - timeSinceLastCall);
      }
    };
  }
} 