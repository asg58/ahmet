/**
 * Service voor communicatie met de Blender WebSocket server
 */
export default class BlenderWebSocketService {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.connecting = false;
    this.lastConnectionAttempt = 0;
    this.connectionTimeout = null;
    this._cleanDisconnect = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = {
      message: [],
      open: [],
      close: [],
      error: [],
      connection: [] // Add connection listeners
    };
    
    // Bind methods
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.send = this.send.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.getLiveModelData = this.getLiveModelData.bind(this);
    this.addConnectionListener = this.addConnectionListener.bind(this);
    this.removeConnectionListener = this.removeConnectionListener.bind(this);
  }
  
  /**
   * Connect to the WebSocket server
   */
  async connect() {
    // Check if already connected
    if (this.connected) {
      console.log('WebSocket already connected');
      this.notifyConnectionListeners(true);
      return true;
    }
    
    // Check if connection is in progress
    if (this.connecting) {
      console.log('WebSocket connection in progress');
      return false;
    }
    
    // Throttle connection attempts (prevent more than 1 attempt per second)
    const now = Date.now();
    if (now - this.lastConnectionAttempt < 1000) {
      console.log(`Throttling connection attempt. Last attempt was ${now - this.lastConnectionAttempt}ms ago`);
      return false;
    }
    
    this.lastConnectionAttempt = now;
    this.connecting = true;
    this._cleanDisconnect = false;
    
    try {
      // Disconnect any existing socket
      if (this.socket) {
        this.disconnect();
      }
      
      console.log('Connecting to Blender WebSocket server...');
      this.socket = new WebSocket('ws://localhost:8765');
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (!this.connected && this.connecting) {
          console.error('WebSocket connection timeout');
          this.socket.close();
          this.connecting = false;
          this.notifyListeners('error', new Error('Connection timeout'));
          this.notifyConnectionListeners(false);
        }
      }, 5000);
      
      this.socket.onopen = () => {
        console.log('Connected to Blender WebSocket server');
        this.connected = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        
        // Clear timeout
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        this.notifyListeners('open');
        this.notifyConnectionListeners(true);
      };
      
      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received message from server:', data);
          this.notifyListeners('message', data);
        } catch (error) {
          console.error('Error parsing message:', error);
          this.notifyListeners('error', error);
        }
      };
      
      this.socket.onclose = (event) => {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
        
        this.connected = false;
        this.connecting = false;
        
        // Only log and attempt reconnect if this wasn't a clean disconnect
        if (!this._cleanDisconnect) {
          console.warn(`WebSocket connection closed: ${event.code} - ${event.reason}`);
          this.notifyListeners('close', event);
          this.notifyConnectionListeners(false);
          
          // Attempt to reconnect if appropriate
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`Attempting to reconnect in ${delay/1000} seconds (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            
            setTimeout(() => {
              this.connect();
            }, delay);
          } else {
            console.error('Max reconnect attempts reached. Giving up.');
          }
        } else {
          console.log('Clean disconnect complete');
          this._cleanDisconnect = false;
          this.notifyConnectionListeners(false);
        }
      };
      
      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifyListeners('error', error);
        this.notifyConnectionListeners(false);
        
        // Connection errors don't trigger onclose automatically in some browsers
        if (this.connecting) {
          this.connecting = false;
          if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
          }
        }
      };
      
      // Wait for connection to complete or fail
      return new Promise((resolve, reject) => {
        const onOpen = () => {
          this.removeEventListener('open', onOpen);
          this.removeEventListener('error', onError);
          resolve(true);
        };
        
        const onError = (error) => {
          this.removeEventListener('open', onOpen);
          this.removeEventListener('error', onError);
          reject(error || new Error('Connection failed'));
        };
        
        this.addEventListener('open', onOpen);
        this.addEventListener('error', onError);
      });
      
    } catch (error) {
      console.error('Failed to connect to WebSocket server:', error);
      this.connecting = false;
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }
      
      this.notifyConnectionListeners(false);
      throw error;
    }
  }
  
  /**
   * Disconnect from the WebSocket server
   */
  disconnect() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    if (this.socket) {
      // Mark this as a clean disconnect to prevent automatic reconnect
      this._cleanDisconnect = true;
      
      try {
        this.socket.close();
      } catch (error) {
        console.error('Error closing WebSocket:', error);
      }
      
      this.socket = null;
    }
    
    this.connected = false;
    this.connecting = false;
    this.notifyConnectionListeners(false);
  }
  
  /**
   * Send data to the WebSocket server
   */
  send(data) {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        return reject(new Error('WebSocket not connected'));
      }
      
      try {
        const message = typeof data === 'string' ? data : JSON.stringify(data);
        this.socket.send(message);
        console.log('Sent message to server:', data);
        resolve();
      } catch (error) {
        console.error('Error sending message:', error);
        reject(error);
      }
    });
  }
  
  /**
   * Add event listener
   */
  addEventListener(type, callback) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }
  
  /**
   * Remove event listener
   */
  removeEventListener(type, callback) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
  }
  
  /**
   * Notify all listeners of an event
   */
  notifyListeners(type, data) {
    if (!this.listeners[type]) return;
    this.listeners[type].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in ${type} listener:`, error);
      }
    });
  }
  
  /**
   * Add a connection listener
   * This listener will be called whenever the connection status changes
   * @param {function} listener - Callback function that takes a boolean parameter (connected)
   */
  addConnectionListener(listener) {
    this.addEventListener('connection', listener);
    // Immediately notify with current status
    listener(this.connected);
  }
  
  /**
   * Remove a connection listener
   * @param {function} listener - The listener function to remove
   */
  removeConnectionListener(listener) {
    this.removeEventListener('connection', listener);
  }
  
  /**
   * Notify all connection listeners of the current connection status
   * @param {boolean} connected - The current connection status
   */
  notifyConnectionListeners(connected) {
    this.notifyListeners('connection', connected);
  }
  
  /**
   * Convenience method for 'message' event listeners
   */
  onMessage(callback) {
    this.addEventListener('message', callback);
    return () => this.removeEventListener('message', callback);
  }
  
  /**
   * Get live model data from the Blender server
   * @returns {Promise<Object>} Promise that resolves to the model data response
   */
  async getLiveModelData() {
    if (!this.connected) {
      // Try to connect if not already connected
      try {
        await this.connect();
      } catch (error) {
        console.error('Failed to connect for getLiveModelData:', error);
        throw new Error(`Connection failed: ${error.message}`);
      }
    }
    
    return new Promise((resolve, reject) => {
      const messageId = 'get_model_' + Date.now();
      
      // Create message handler for this specific request
      const handleResponse = (data) => {
        if (data.id === messageId || !data.id) {
          // Remove the event listener to avoid memory leaks
          this.removeEventListener('message', handleResponse);
          
          // Resolve with the data
          resolve(data);
        }
      };
      
      // Listen for response
      this.addEventListener('message', handleResponse);
      
      // Handle timeout
      const timeout = setTimeout(() => {
        this.removeEventListener('message', handleResponse);
        reject(new Error('Request timed out after 10 seconds'));
      }, 10000);
      
      // Handle errors
      const handleError = (error) => {
        clearTimeout(timeout);
        this.removeEventListener('message', handleResponse);
        this.removeEventListener('error', handleError);
        reject(error);
      };
      
      this.addEventListener('error', handleError);
      
      // Send the request
      this.send({
        action: 'get_model_data',
        id: messageId
      }).catch(error => {
        clearTimeout(timeout);
        this.removeEventListener('message', handleResponse);
        this.removeEventListener('error', handleError);
        reject(error);
      });
    });
  }
} 