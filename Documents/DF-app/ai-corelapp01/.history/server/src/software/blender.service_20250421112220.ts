import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import WebSocket from 'ws';
import { DockerService } from './docker/docker.service';

export interface ExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  visualData?: any;
  returnValue?: any;
}

/**
 * Blender Service
 *
 * Provides operations for working with Blender models and communicating with the
 * Blender Bridge service which handles communication with Blender itself.
 */
@Injectable()
export class BlenderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BlenderService.name);
  private restEndpoint: string;
  private wsEndpoint: string;
  private wsClient: WebSocket | null = null;
  private wsReconnectInterval: NodeJS.Timeout | null = null;
  
  constructor(
    private readonly configService: ConfigService,
    private readonly dockerService: DockerService,
  ) {
    // Get configuration for the Blender Bridge service
    this.restEndpoint = this.configService.get<string>('BLENDER_BRIDGE_ENDPOINT', 'http://localhost:4201');
    this.wsEndpoint = this.configService.get<string>('BLENDER_BRIDGE_WS_ENDPOINT', 'ws://localhost:4202');
  }
  
  async onModuleInit() {
    // Connect to WebSocket server
    await this.connectWebSocket();
    
    // Set up reconnection handler
    this.wsReconnectInterval = setInterval(() => {
      if (!this.wsClient || this.wsClient.readyState === WebSocket.CLOSED) {
        this.logger.warn('WebSocket connection lost, attempting to reconnect...');
        this.connectWebSocket();
      }
    }, 10000); // Try to reconnect every 10 seconds
    
    this.logger.log(`Blender service initialized with REST endpoint: ${this.restEndpoint}`);
    this.logger.log(`WebSocket connection established at: ${this.wsEndpoint}`);
  }
  
  async onModuleDestroy() {
    // Clean up WebSocket connection
    if (this.wsReconnectInterval) {
      clearInterval(this.wsReconnectInterval);
    }
    
    if (this.wsClient) {
      this.wsClient.close();
      this.wsClient = null;
    }
    
    this.logger.log('Blender service destroyed, connections closed');
  }
  
  /**
   * Connect to the WebSocket server
   */
  private async connectWebSocket(): Promise<void> {
    try {
      // Close existing connection if any
      if (this.wsClient) {
        this.wsClient.close();
      }
      
      // Create new connection
      this.wsClient = new WebSocket(this.wsEndpoint);
      
      // Set up event handlers
      this.wsClient.on('open', () => {
        this.logger.log('WebSocket connection established with Blender Bridge');
      });
      
      this.wsClient.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.logger.debug(`WebSocket message received: ${message.type}`);
          
          // Handle different message types if needed
          if (message.type === 'status_update') {
            this.logger.debug(`Blender status update: ${message.status}`);
          }
        } catch (error) {
          this.logger.error(`Error parsing WebSocket message: ${error.message}`);
        }
      });
      
      this.wsClient.on('error', (error) => {
        this.logger.error(`WebSocket error: ${error.message}`);
      });
      
      this.wsClient.on('close', (code, reason) => {
        this.logger.warn(`WebSocket connection closed with code ${code}: ${reason}`);
      });
      
      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);
        
        this.wsClient!.on('open', () => {
          clearTimeout(timeout);
          resolve();
        });
        
        this.wsClient!.on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
      });
      
    } catch (error) {
      this.logger.error(`Failed to connect to WebSocket: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Send a WebSocket message and get a response
   */
  private async sendWebSocketMessage<T = any>(message: any): Promise<T> {
    if (!this.wsClient || this.wsClient.readyState !== WebSocket.OPEN) {
      await this.connectWebSocket();
    }
    
    return new Promise<T>((resolve, reject) => {
      const messageId = Date.now().toString();
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket response timeout'));
      }, 30000); // 30 seconds timeout
      
      const messageHandler = (data: WebSocket.Data) => {
        try {
          const response = JSON.parse(data.toString());
          
          // Check if this is a response to our message
          if (response.type === 'result' || response.type === 'error') {
            // Remove listeners
            this.wsClient!.removeListener('message', messageHandler);
            clearTimeout(timeout);
            
            if (response.type === 'error') {
              reject(new Error(response.error));
            } else {
              resolve(response.data);
            }
          }
        } catch (error) {
          // Continue listening, this might be an unrelated message
        }
      };
      
      // Listen for message response
      this.wsClient!.on('message', messageHandler);
      
      // Send the message
      this.wsClient!.send(JSON.stringify({
        ...message,
        id: messageId,
        timestamp: Date.now()
      }));
    });
  }
  
  /**
   * Create a 3D cube in Blender
   */
  async createCube(params: { 
    location?: [number, number, number]; 
    size?: number; 
    name?: string; 
  } = {}): Promise<any> {
    try {
      // Try to use WebSocket first
      if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
        return await this.sendWebSocketMessage({
          command: 'create_object',
          object_type: 'cube',
          params
        });
      }
      
      // Fall back to REST API
      const response = await axios.post(`${this.restEndpoint}/api/object/create_cube`, params);
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating cube: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Create a 3D sphere in Blender
   */
  async createSphere(params: {
    location?: [number, number, number];
    radius?: number;
    segments?: number;
    rings?: number;
    name?: string;
  } = {}): Promise<any> {
    try {
      // Try to use WebSocket first
      if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
        return await this.sendWebSocketMessage({
          command: 'create_object',
          object_type: 'sphere',
          params
        });
      }
      
      // Fall back to REST API
      const response = await axios.post(`${this.restEndpoint}/api/object/create_sphere`, params);
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating sphere: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Apply a material to an object in Blender
   */
  async applyMaterial(params: {
    object_name: string;
    material_name?: string;
    color?: [number, number, number, number];
    metallic?: number;
    roughness?: number;
  }): Promise<any> {
    try {
      const response = await axios.post(`${this.restEndpoint}/api/material/apply`, params);
      return response.data;
    } catch (error) {
      this.logger.error(`Error applying material: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Render the current scene in Blender
   */
  async renderScene(params: {
    width?: number;
    height?: number;
    samples?: number;
    engine?: 'CYCLES' | 'BLENDER_EEVEE';
    format?: 'PNG' | 'JPEG' | 'BMP';
  } = {}): Promise<any> {
    try {
      // Try to use WebSocket first
      if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
        return await this.sendWebSocketMessage({
          command: 'render',
          params
        });
      }
      
      // Fall back to REST API
      const response = await axios.post(`${this.restEndpoint}/api/render/scene`, params);
      return response.data;
    } catch (error) {
      this.logger.error(`Error rendering scene: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Get all objects in the current scene
   */
  async getObjects(): Promise<any> {
    try {
      // Try to use WebSocket first
      if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
        return await this.sendWebSocketMessage({
          command: 'get_objects'
        });
      }
      
      // Fall back to REST API
      const response = await axios.get(`${this.restEndpoint}/api/scene/get_objects`);
      return response.data;
    } catch (error) {
      this.logger.error(`Error getting objects: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Execute custom Python code in Blender
   */
  async executeCode(code: string): Promise<any> {
    try {
      // Try to use WebSocket first
      if (this.wsClient && this.wsClient.readyState === WebSocket.OPEN) {
        return await this.sendWebSocketMessage({
          command: 'execute',
          code
        });
      }
      
      // Fall back to REST API
      const response = await axios.post(`${this.restEndpoint}/api/execute`, { code });
      return response.data;
    } catch (error) {
      this.logger.error(`Error executing code: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Start a new Blender container using Docker
   */
  async startBlenderContainer(): Promise<string> {
    try {
      const containerId = await this.dockerService.startContainer('blender');
      this.logger.log(`Started Blender container with ID: ${containerId}`);
      
      // Get the endpoint for the container
      const endpoint = await this.dockerService.getContainerEndpoint(containerId);
      this.logger.log(`Blender container available at: ${endpoint}`);
      
      // Update the endpoints
      const parsedUrl = new URL(endpoint);
      const host = parsedUrl.hostname;
      const port = parseInt(parsedUrl.port);
      
      this.restEndpoint = `http://${host}:${port}`;
      this.wsEndpoint = `ws://${host}:${port + 1}`; // Assuming WebSocket is on the next port
      
      // Reconnect WebSocket
      await this.connectWebSocket();
      
      return containerId;
    } catch (error) {
      this.logger.error(`Error starting Blender container: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Stop a Blender container
   */
  async stopBlenderContainer(containerId: string): Promise<void> {
    try {
      await this.dockerService.stopContainer(containerId);
      this.logger.log(`Stopped Blender container with ID: ${containerId}`);
    } catch (error) {
      this.logger.error(`Error stopping Blender container: ${error.message}`);
      throw error;
    }
  }
} 