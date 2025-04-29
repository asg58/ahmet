import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000', '*'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  transports: ['polling', 'websocket'],
  path: '/socket.io',
  serveClient: false,
  namespace: '/',
  allowEIO3: true, // Allow Engine.IO version 3 compatibility
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e8, // 100MB
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private readonly logger = new Logger(ChatGateway.name);
  
  @WebSocketServer()
  server: Server;

  constructor(private readonly chatService: ChatService) {}
  
  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
    
    // Log adapter details
    const adapter = this.server.adapter;
    this.logger.log(`Using adapter: ${adapter.constructor.name}`);
  }

  handleConnection(client: Socket) {
    const sessionId = client.handshake.query.sessionId as string || uuidv4();
    const auth = client.handshake.auth;
    
    this.logger.log(`Client connected: ${client.id}, Session ID: ${sessionId}`);
    this.logger.debug(`Connection details - Transport: ${client.conn.transport.name}, Headers: ${JSON.stringify(client.handshake.headers['user-agent'])}`);
    
    if (auth) {
      this.logger.debug(`Auth data: ${JSON.stringify(auth)}`);
    }
    
    // Store sessionId in socket data
    client.data.sessionId = sessionId;
    
    // Initialize session if it doesn't exist
    if (!this.chatService.getSession(sessionId)) {
      this.chatService.createSession(sessionId);
    }
    
    // Send session info back to client
    client.emit('session', { sessionId });
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
    // We don't delete the session on disconnect as the user might reconnect
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string },
  ) {
    const sessionId = client.data.sessionId;
    this.logger.debug(`Received message from client ${client.id}: ${data.message}`);
    
    try {
      // Start typing indicator
      client.emit('typing', { typing: true });
      
      // Process message and get response
      const response = await this.chatService.processMessage(sessionId, data.message);
      
      // Stop typing indicator and send response
      client.emit('typing', { typing: false });
      client.emit('newMessage', response);
      
      return { status: 'ok' };
    } catch (error) {
      this.logger.error(`Error handling message: ${error.message}`);
      client.emit('error', { message: `Error: ${error.message}` });
      client.emit('typing', { typing: false });
      return { status: 'error', message: error.message };
    }
  }

  @SubscribeMessage('clearChat')
  handleClearChat(@ConnectedSocket() client: Socket) {
    const sessionId = client.data.sessionId;
    this.logger.debug(`Clearing chat for session ${sessionId}`);
    
    // Clear the session and create a new one
    this.chatService.clearSession(sessionId);
    const newSession = this.chatService.createSession(sessionId);
    
    // Send welcome message
    client.emit('chatCleared', {
      message: 'Chat history cleared',
      initialMessage: newSession.messages[0],
    });
    
    return { status: 'ok' };
  }
} 