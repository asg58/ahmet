/**
 * End-to-End Test Setup
 * 
 * This module sets up the environment for testing the AI Design Agent.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as WebSocket from 'ws';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Test configuration
 */
export const config = {
  baseUrl: process.env.TEST_API_URL || 'http://localhost:4000',
  wsUrl: process.env.TEST_WS_URL || 'ws://localhost:4001',
  apiEndpoints: {
    ollama: {
      status: '/api/ollama/status',
      models: '/api/ollama/models',
      chat: '/api/ollama/chat',
    },
    software: {
      coreldraw: '/api/software/coreldraw',
      blender: '/api/software/blender',
    },
    intent: '/api/intent',
  },
  timeout: parseInt(process.env.TEST_TIMEOUT || '10000', 10),
  defaultModel: process.env.TEST_MODEL || 'llama3.2:11b-q4_K_M',
};

/**
 * Test helper for API calls
 */
export const api = {
  config: {
    baseUrl: process.env.TEST_API_URL || 'http://localhost:4000',
    wsUrl: process.env.TEST_WS_URL || 'ws://localhost:4001',
    apiEndpoints: {
      ollama: {
        status: '/api/ollama/status',
        models: '/api/ollama/models',
        chat: '/api/ollama/chat',
      },
      software: {
        coreldraw: '/api/software/coreldraw',
        blender: '/api/software/blender',
      },
      intent: '/api/intent',
    },
    timeout: parseInt(process.env.TEST_TIMEOUT || '10000', 10),
    defaultModel: process.env.TEST_MODEL || 'llama3.2:11b-q4_K_M',
  },
  /**
   * Make a GET request to the API
   */
  async get(endpoint: string) {
    const url = `${config.baseUrl}${endpoint}`;
    try {
      const response = await axios.get(url, { timeout: config.timeout });
      return response.data;
    } catch (error) {
      console.error(`Error in GET ${url}: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Make a POST request to the API
   */
  async post(endpoint: string, data: any) {
    const url = `${config.baseUrl}${endpoint}`;
    try {
      const response = await axios.post(url, data, { timeout: config.timeout });
      return response.data;
    } catch (error) {
      console.error(`Error in POST ${url}: ${error.message}`);
      throw error;
    }
  },
  
  /**
   * Check if Ollama is available
   */
  async checkOllamaStatus() {
    return api.get(config.apiEndpoints.ollama.status);
  },
  
  /**
   * List available Ollama models
   */
  async listOllamaModels() {
    return api.get(config.apiEndpoints.ollama.models);
  },
  
  /**
   * Chat with Ollama
   */
  async chatWithOllama(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
    return api.post(config.apiEndpoints.ollama.chat, {
      model: config.defaultModel,
      messages,
    });
  },
  
  /**
   * Test intent recognition
   */
  async detectIntent(message: string, conversationHistory: { role: 'user' | 'assistant' | 'system'; content: string }[] = []) {
    return api.post(config.apiEndpoints.intent, {
      message,
      conversationHistory,
    });
  },
  
  /**
   * Execute code in CorelDRAW
   */
  async executeCorelDrawCode(code: string) {
    return api.post(`${config.apiEndpoints.software.coreldraw}/execute`, { code });
  },
  
  /**
   * Execute code in Blender
   */
  async executeBlenderCode(code: string) {
    return api.post(`${config.apiEndpoints.software.blender}/execute`, { code });
  },
};

/**
 * WebSocket test client for real-time communication
 */
export class WebSocketTestClient {
  private ws: WebSocket;
  private sessionId: string;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  
  /**
   * Create a new WebSocket client and connect
   */
  async connect() {
    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(config.wsUrl);
      
      this.ws.on('open', () => {
        console.log('WebSocket connected');
        resolve();
      });
      
      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      });
      
      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.event && this.messageHandlers.has(message.event)) {
            this.messageHandlers.get(message.event)(message.data);
          }
          
          // Store session ID when received
          if (message.event === 'session' && message.data.sessionId) {
            this.sessionId = message.data.sessionId;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });
    });
  }
  
  /**
   * Disconnect the WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
  
  /**
   * Send a message through the WebSocket
   */
  send(event: string, data: any) {
    this.ws.send(JSON.stringify({ event, data }));
  }
  
  /**
   * Register a handler for a specific event
   */
  on(event: string, handler: (data: any) => void) {
    this.messageHandlers.set(event, handler);
  }
  
  /**
   * Get the session ID
   */
  getSessionId() {
    return this.sessionId;
  }
  
  /**
   * Send a chat message and wait for response
   */
  async sendChatMessage(message: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for chat response'));
      }, config.timeout);
      
      this.on('newMessage', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });
      
      this.send('sendMessage', { message });
    });
  }
}

/**
 * Test utilities
 */
export const utils = {
  /**
   * Wait for a specific amount of time
   */
  async wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * Create a basic test rectangle in CorelDRAW
   */
  getCreateRectangleCode() {
    return `
      Sub CreateTestRectangle()
        Dim s As Shape
        Set s = ActiveDocument.ActivePage.CreateRectangle(100, 100, 200, 150)
        s.Fill.ApplyUniformFill CreateRGBColor(255, 0, 0)
        s.Outline.SetProperties 1, CreateRGBColor(0, 0, 0)
        s.Name = "TestRectangle"
      End Sub
      
      CreateTestRectangle
    `;
  },
  
  /**
   * Create a basic test cube in Blender
   */
  getCreateCubeCode() {
    return `
      import bpy
      
      # Clear existing objects
      bpy.ops.object.select_all(action='SELECT')
      bpy.ops.object.delete()
      
      # Create a cube
      bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
      
      # Get the cube object
      cube = bpy.context.active_object
      cube.name = "TestCube"
      
      # Add a material
      material = bpy.data.materials.new(name="TestMaterial")
      material.diffuse_color = (1, 0, 0, 1)  # Red
      
      # Assign the material to the cube
      if cube.data.materials:
          cube.data.materials[0] = material
      else:
          cube.data.materials.append(material)
    `;
  },
}; 