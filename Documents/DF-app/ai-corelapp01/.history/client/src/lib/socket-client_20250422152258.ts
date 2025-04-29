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
  
  constructor(private url: string = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4000') {}
  
  // Getter for the socket instance
  get socketInstance(): Socket | null {
    return this.socket;
  }
  
  // Connect to the WebSocket server
  connect() {
    if (this.socket) {
      return
    }
    
    try {
      console.log('Connecting to WebSocket server at:', this.url);
      this.socket = io(this.url, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        transports: ['websocket', 'polling'],
        forceNew: true,
        timeout: 20000 // Verhoog timeout naar 20 seconden
      })
      
      this.socket.on('connect', () => {
        console.log('Socket connected successfully')
        this.notifyConnectionHandlers({ connected: true })
      })
      
      this.socket.on('disconnect', () => {
        console.log('Socket disconnected')
        this.notifyConnectionHandlers({ connected: false })
      })
      
      this.socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err)
        this.notifyConnectionHandlers({ connected: false, error: err.message })
      })
      
      this.socket.on('message', (data: StreamingResponse) => {
        this.notifyMessageHandlers(data)
      })
    } catch (err) {
      console.error('Socket connection error:', err)
      this.notifyConnectionHandlers({ 
        connected: false, 
        error: err instanceof Error ? err.message : 'Unknown error' 
      })
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
  
  // Send a message through the WebSocket
  sendMessage(message: string, sessionId: string) {
    if (!this.socket || !this.socket.connected) {
      this.connect()
    }
    
    this.socket?.emit('sendMessage', {
      message: message
    })
    
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