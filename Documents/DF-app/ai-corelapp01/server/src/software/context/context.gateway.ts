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
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e8, // 100MB
})
@Injectable()
export class ContextGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  
  private readonly logger = new Logger(ContextGateway.name);
  private readonly subscriptions = new Map<string, ContextSubscription>();
  private readonly activeTracking = new Set<string>(); // Set of active platforms
  
  // Add a message queue and processing flag for context updates
  private readonly updateQueue: { platform: 'coreldraw' | 'blender', update: ContextUpdate }[] = [];
  private isProcessingQueue = false;
  private queueProcessingInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly blenderContextAnalyzer: BlenderContextAnalyzer,
    private readonly corelContextAnalyzer: CorelContextAnalyzer,
  ) {}
  
  afterInit(server: Server) {
    this.logger.log('Context Gateway initialized');
    
    // Log adapter details
    const adapter = this.server.adapter;
    this.logger.log(`Using adapter: ${adapter.constructor.name}`);
    
    // Start queue processing
    this.startQueueProcessing();
  }
  
  // Add cleanup method for queue processing
  private startQueueProcessing() {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
    }
    
    this.queueProcessingInterval = setInterval(() => {
      this.processNextQueueItem();
    }, 50); // Process queue items every 50ms
  }
  
  // Process next item in the queue
  private async processNextQueueItem() {
    // If already processing or queue is empty, skip
    if (this.isProcessingQueue || this.updateQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // Take the next item from the queue
      const item = this.updateQueue.shift();
      
      if (item) {
        // Process the update
        await this.distributeContextUpdate(item.platform, item.update);
      }
    } catch (error) {
      this.logger.error(`Error processing context update queue: ${error.message}`);
    } finally {
      this.isProcessingQueue = false;
    }
  }
  
  // Cleanup on destroy
  async onModuleDestroy() {
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = null;
    }
    
    // Stop all active tracking
    for (const platform of this.activeTracking) {
      await this.stopTracking(platform as 'coreldraw' | 'blender');
    }
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
    // Add update to queue instead of processing immediately
    this.updateQueue.push({ platform, update });
  }
  
  /**
   * Distribute context update to relevant clients
   */
  private async distributeContextUpdate(platform: 'coreldraw' | 'blender', update: ContextUpdate) {
    // Get all subscriptions for this platform
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
    const updatePromises: Promise<void>[] = [];
    
    sessionSubs.forEach((clientIds, sessionId) => {
      // Include session ID in update
      const sessionUpdate = {
        ...update,
        sessionId,
        timestamp: Date.now() // Add timestamp for ordering
      };
      
      // Send to all clients subscribed to this session
      clientIds.forEach(clientId => {
        // Use a promise to track sending completion
        const sendPromise = new Promise<void>((resolve) => {
          this.server.to(clientId).emit('contextUpdate', sessionUpdate, () => {
            resolve();
          });
        });
        
        updatePromises.push(sendPromise);
      });
    });
    
    // Wait for all updates to be sent
    await Promise.all(updatePromises);
  }
  
  /**
   * Improved throttle function to prevent race conditions
   */
  private throttle<T>(func: (arg: T) => void, delay: number): (arg: T) => void {
    let lastCall = 0;
    let timeout: NodeJS.Timeout | null = null;
    let lastArgs: T | null = null;
    let isExecuting = false;
    
    return (arg: T) => {
      const now = Date.now();
      const timeSinceLastCall = now - lastCall;
      
      // Update last args
      lastArgs = arg;
      
      // If already scheduled, don't schedule again
      if (timeout !== null) {
        return;
      }
      
      // If currently executing or enough time has passed, execute on next tick
      if (isExecuting || timeSinceLastCall >= delay) {
        if (!isExecuting) {
          isExecuting = true;
          lastCall = now;
          
          // Execute on next tick to avoid blocking
          process.nextTick(() => {
            if (lastArgs !== null) {
              func(lastArgs);
              lastArgs = null;
            }
            isExecuting = false;
          });
        }
      } else {
        // Schedule to run after delay
        timeout = setTimeout(() => {
          lastCall = Date.now();
          isExecuting = true;
          
          if (lastArgs !== null) {
            func(lastArgs);
            lastArgs = null;
          }
          
          isExecuting = false;
          timeout = null;
        }, delay - timeSinceLastCall);
      }
    };
  }
  
  @SubscribeMessage('ping')
  handlePing(client: Socket): WsResponse<{timestamp: number}> {
    this.logger.debug(`Ping received from context client ${client.id}`);
    return { event: 'pong', data: { timestamp: Date.now() } };
  }
} 