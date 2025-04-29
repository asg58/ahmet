import { io, Socket } from 'socket.io-client'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string | Date  // Allow both string and Date for flexibility
}

export interface StreamingResponse {
  messageId: string
  content: string
  isComplete: boolean
}

export interface ConnectionStatus {
  connected: boolean
  error?: string
}

class SocketClient {
  private socket: Socket | null = null
  private messageHandlers: ((message: StreamingResponse) => void)[] = []
  private connectionHandlers: ((status: ConnectionStatus) => void)[] = []
  
  constructor(private url: string = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000') {}
  
  // Getter for the socket instance
  get socketInstance(): Socket | null {
    return this.socket;
  }
  
  // Connect to the WebSocket server
  connect(sessionId?: string) {
    if (this.socket) {
      console.log('Socket already connected, reusing existing connection');
      return;
    }
    
    try {
      console.log(`Connecting to WebSocket server at: ${this.url} with session: ${sessionId || 'new session'}`);
      
      // Disconnect any existing connection first
      this.disconnect();
      
      // Create a new socket connection
      this.socket = io(this.url, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        transports: ['websocket', 'polling'],
        forceNew: true,
        timeout: 20000,
        query: sessionId ? { sessionId } : undefined
      });
      
      // Debug all Socket.IO events
      const originalEmit = this.socket.emit;
      this.socket.emit = function(event: any, ...args: any[]) {
        console.log(`[Socket.IO] Emitting event: ${event}`, args);
        return originalEmit.apply(this, [event, ...args]);
      };
      
      this.socket.on('connect', () => {
        console.log('Socket connected successfully');
        this.notifyConnectionHandlers({ connected: true });
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log(`Socket disconnected: ${reason}`);
        this.notifyConnectionHandlers({ connected: false, error: reason });
      });
      
      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err);
        this.notifyConnectionHandlers({ connected: false, error: err.message });
      });
      
      // Debug all Socket.IO events
      this.socket.onAny((event, ...args) => {
        console.log(`[Socket.IO] Received event: ${event}`, args);
      });
      
      this.socket.on('message', (data: any) => {
        console.log('Socket message received:', data);
        
        // Handle different message formats
        if (data && typeof data === 'object') {
          const streamingResponse: StreamingResponse = {
            messageId: data.id || data.messageId || '',
            content: data.content || '',
            isComplete: data.isComplete !== undefined ? data.isComplete : true
          };
          this.notifyMessageHandlers(streamingResponse);
        }
      });
      
      this.socket.on('newMessage', (data: any) => {
        console.log('New message received:', data);
        
        // Convert to StreamingResponse format if necessary
        if (data && typeof data === 'object') {
          const streamingResponse: StreamingResponse = {
            messageId: data.id || data.messageId || '',
            content: data.content || '',
            isComplete: data.isComplete !== undefined ? data.isComplete : true
          };
          this.notifyMessageHandlers(streamingResponse);
        }
      });
    } catch (err) {
      console.error('Socket connection error:', err);
      this.notifyConnectionHandlers({ 
        connected: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      });
    }
  }
  
  // Disconnect from the WebSocket server
  disconnect() {
    if (!this.socket) {
      return
    }
    
    this.socket.disconnect()
    this.socket = null
  }
  
  // Check connection status
  isConnected(): boolean {
    return !!this.socket?.connected;
  }
  
  // Retry connection if disconnected
  ensureConnection(sessionId?: string): void {
    if (!this.socket || !this.socket.connected) {
      console.log('Socket not connected, reconnecting...');
      this.connect(sessionId);
    }
  }
  
  // Send a message through the WebSocket
  sendMessage(message: string, sessionId: string) {
    // Ensure connection
    this.ensureConnection(sessionId);
    
    console.log(`Sending message to server with sessionId: ${sessionId}`, message);
    
    if (!this.socket?.connected) {
      console.error('Cannot send message: Socket not connected');
      return Promise.reject(new Error('Socket not connected'));
    }
    
    this.socket.emit('sendMessage', {
      message,
      sessionId
    });
    
    return Promise.resolve(); // Return a promise to maintain API compatibility
  }
  
  // Register a message handler
  onMessage(handler: (message: StreamingResponse) => void) {
    this.messageHandlers.push(handler)
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler)
    }
  }
  
  // Register a connection status handler
  onConnectionChange(handler: (status: ConnectionStatus) => void) {
    this.connectionHandlers.push(handler)
    return () => {
      this.connectionHandlers = this.connectionHandlers.filter(h => h !== handler)
    }
  }
  
  // Notify all message handlers
  private notifyMessageHandlers(message: StreamingResponse) {
    this.messageHandlers.forEach(handler => handler(message))
  }
  
  // Notify all connection handlers
  private notifyConnectionHandlers(status: ConnectionStatus) {
    this.connectionHandlers.forEach(handler => handler(status))
  }
}

// Export a singleton instance
export const socketClient = new SocketClient() 