import React, { useState, useEffect, useCallback } from 'react';
import { Socket, io } from 'socket.io-client';

interface Position {
  x: number;
  y: number;
  z?: number;
}

interface Size {
  width: number;
  height: number;
  depth?: number;
}

interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

interface DesignElement {
  id: string;
  name: string;
  type: string;
  objectPath: string;
  position: Position;
  size?: Size;
  rotation?: Position;
  color?: Color;
  properties: Record<string, any>;
  children?: DesignElement[];
}

interface Layer {
  id: string;
  name: string;
  objectPath: string;
  visible: boolean;
  locked: boolean;
  elements: DesignElement[];
}

interface DesignContext {
  documentId: string;
  documentName: string;
  documentPath: string;
  platform: 'coreldraw' | 'blender';
  size: Size;
  currentPage?: number;
  currentFrame?: number;
  layers: Layer[];
  selectedElements: DesignElement[];
  viewTransform: {
    zoom: number;
    panX: number;
    panY: number;
    rotation?: number;
  };
  screenshot?: string;
  lastAction?: {
    type: string;
    description: string;
    timestamp: number;
  };
}

interface ContextUpdate {
  timestamp: number;
  documentId: string;
  sessionId?: string;
  changes: {
    added?: DesignElement[];
    modified?: {
      id: string;
      properties: Record<string, any>;
    }[];
    removed?: string[];
    selected?: string[];
    deselected?: string[];
    viewTransform?: Partial<DesignContext['viewTransform']>;
  };
  lastAction?: DesignContext['lastAction'];
}

const ContextViewerContainer: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [platform, setPlatform] = useState<'coreldraw' | 'blender'>('coreldraw');
  const [sessionId, setSessionId] = useState('default');
  const [context, setContext] = useState<DesignContext | null>(null);
  const [updates, setUpdates] = useState<ContextUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize the socket connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    console.log('Connecting to context socket at:', socketUrl);
    
    // Create a socket connection to the context namespace
    const newSocket = io(`${socketUrl}/context`, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      path: '/socket.io',
      forceNew: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: {
        sessionId: sessionId || 'anonymous'
      }
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to context namespace');
      setConnected(true);
      setError(null);
      
      // Now subscribe to context updates
      try {
        console.log('Attempting to subscribe to context updates');
        newSocket.emit('subscribeContext', { platform, sessionId });
      } catch (err: unknown) {
        console.error('Error subscribing to context:', err);
        setError(`Error subscribing to context: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from context namespace');
      setConnected(false);
    });
    
    newSocket.on('connect_error', (err: unknown) => {
      console.error('Socket connection error:', err);
      setError(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setConnected(false);
    });
    
    newSocket.on('subscribeContextResponse', (response) => {
      console.log('Subscribe context response:', response);
      if (response && response.success) {
        console.log('Successfully subscribed to context updates');
      } else {
        setError('Failed to subscribe to context updates');
      }
    });
    
    setSocket(newSocket);
    
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, []);
  
  // Set up context update listener
  useEffect(() => {
    if (socket) {
      const handleContextUpdate = (update: ContextUpdate) => {
        console.log('Received context update:', update);
        setUpdates(prev => [update, ...prev].slice(0, 10)); // Keep last 10 updates
        
        // If we have context, apply the update
        if (context && context.documentId === update.documentId) {
          updateContext(context, update);
        }
      };
      
      socket.on('contextUpdate', handleContextUpdate);
      
      socket.on('contextResponse', (response: DesignContext | {error: string}) => {
        console.log('Received context response:', response);
        if ('error' in response) {
          setError(response.error);
        } else {
          setContext(response);
          setError(null);
        }
      });
      
      // Add listeners for subscription responses
      socket.on('unsubscribeContextResponse', (response) => {
        console.log('Unsubscribe response:', response);
      });
      
      return () => {
        socket.off('contextUpdate', handleContextUpdate);
        socket.off('contextResponse');
        socket.off('subscribeContextResponse');
        socket.off('unsubscribeContextResponse');
      };
    }
  }, [socket, context]);
  
  // Apply an update to the current context
  const updateContext = useCallback((ctx: DesignContext, update: ContextUpdate) => {
    const newContext = { ...ctx };
    
    // Apply changes
    if (update.changes.added) {
      // In a real implementation, we would add these elements to the correct layers
    }
    
    if (update.changes.modified) {
      update.changes.modified.forEach(mod => {
        // Find and update the element
        newContext.layers.forEach(layer => {
          const element = findElementById(layer.elements, mod.id);
          if (element) {
            Object.assign(element.properties, mod.properties);
          }
        });
      });
    }
    
    if (update.changes.removed) {
      // In a real implementation, we would remove these elements
    }
    
    if (update.changes.selected) {
      // Update selected elements
      const selectedElements: DesignElement[] = [];
      
      update.changes.selected.forEach(id => {
        newContext.layers.forEach(layer => {
          const element = findElementById(layer.elements, id);
          if (element) {
            selectedElements.push(element);
          }
        });
      });
      
      newContext.selectedElements = selectedElements;
    }
    
    if (update.changes.viewTransform) {
      newContext.viewTransform = {
        ...newContext.viewTransform,
        ...update.changes.viewTransform
      };
    }
    
    if (update.lastAction) {
      newContext.lastAction = update.lastAction;
    }
    
    setContext(newContext);
  }, []);
  
  // Helper function to find an element by ID
  const findElementById = (elements: DesignElement[], id: string): DesignElement | null => {
    for (const element of elements) {
      if (element.id === id) {
        return element;
      }
      
      if (element.children) {
        const found = findElementById(element.children, id);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  };
  
  // Handle subscribing to a platform
  const handleSubscribe = () => {
    if (socket) {
      socket.emit('subscribeContext', { platform, sessionId });
      console.log(`Subscribing to ${platform} with session ID ${sessionId}`);
      
      // Request the initial context
      socket.emit('requestContext', { platform, sessionId });
    }
  };
  
  // Handle unsubscribing from a platform
  const handleUnsubscribe = () => {
    if (socket) {
      socket.emit('unsubscribeContext', { platform, sessionId });
      console.log(`Unsubscribing from ${platform} with session ID ${sessionId}`);
      setContext(null);
    }
  };
  
  // Request the current context
  const handleRequestContext = () => {
    if (socket) {
      console.log(`Requesting context for ${platform} with session ID ${sessionId}`);
      socket.emit('requestContext', { platform, sessionId });
    }
  };
  
  // Format timestamp to human readable date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };
  
  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center space-x-4">
        <div>
          <label htmlFor="platform" className="block text-sm font-medium text-gray-700">Platform</label>
          <select 
            id="platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value as 'coreldraw' | 'blender')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="coreldraw">CorelDRAW</option>
            <option value="blender">Blender</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="sessionId" className="block text-sm font-medium text-gray-700">Session ID</label>
          <input
            type="text"
            id="sessionId"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        
        <div className="flex items-end space-x-2">
          <button
            onClick={handleSubscribe}
            disabled={!connected}
            className={`px-4 py-2 rounded-md text-white ${
              connected ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Subscribe
          </button>
          
          <button
            onClick={handleUnsubscribe}
            disabled={!connected || !context}
            className={`px-4 py-2 rounded-md text-white ${
              connected && context ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Unsubscribe
          </button>
          
          <button
            onClick={handleRequestContext}
            disabled={!connected}
            className={`px-4 py-2 rounded-md text-white ${
              connected ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Refresh Context
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left column: Context overview */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Context Overview</h2>
          
          {context ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Document</h3>
                <p>Name: {context.documentName}</p>
                <p>Path: {context.documentPath}</p>
                <p>Size: {context.size.width} x {context.size.height}{context.size.depth ? ` x ${context.size.depth}` : ''}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">Layers ({context.layers.length})</h3>
                <ul className="mt-2 space-y-2">
                  {context.layers.map(layer => (
                    <li key={layer.id} className="p-2 bg-white rounded shadow-sm">
                      <div className="flex justify-between">
                        <span>{layer.name}</span>
                        <span className="text-gray-500 text-sm">
                          {layer.elements.length} element(s)
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold">Selected Elements ({context.selectedElements.length})</h3>
                <ul className="mt-2 space-y-2">
                  {context.selectedElements.map(element => (
                    <li key={element.id} className="p-2 bg-blue-50 rounded shadow-sm">
                      <div className="flex justify-between">
                        <span>{element.name} ({element.type})</span>
                      </div>
                      <div className="text-xs text-gray-500">
                        ID: {element.id}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              {context.lastAction && (
                <div>
                  <h3 className="font-semibold">Last Action</h3>
                  <p>Type: {context.lastAction.type}</p>
                  <p>Description: {context.lastAction.description}</p>
                  <p>Time: {formatDate(context.lastAction.timestamp)}</p>
                </div>
              )}
            </div>
          ) : connected ? (
            <div className="text-center p-4">
              <p className="text-gray-500">No context data available. Subscribe to receive updates.</p>
            </div>
          ) : (
            <div className="text-center p-4">
              <p className="text-gray-500">Not connected to server.</p>
            </div>
          )}
        </div>
        
        {/* Right column: Recent updates or preview */}
        <div className="bg-gray-50 p-4 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Updates</h2>
          
          {updates.length > 0 ? (
            <div className="space-y-4">
              {updates.map((update, index) => (
                <div key={index} className="bg-white p-3 rounded shadow-sm">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Update at {formatDate(update.timestamp)}</h4>
                  </div>
                  <div className="mt-2 text-sm">
                    {update.lastAction && (
                      <p>Action: {update.lastAction.description}</p>
                    )}
                    <p>Changes:</p>
                    <ul className="list-disc list-inside">
                      {update.changes.added && update.changes.added.length > 0 && (
                        <li>Added {update.changes.added.length} element(s)</li>
                      )}
                      {update.changes.modified && update.changes.modified.length > 0 && (
                        <li>Modified {update.changes.modified.length} element(s)</li>
                      )}
                      {update.changes.removed && update.changes.removed.length > 0 && (
                        <li>Removed {update.changes.removed.length} element(s)</li>
                      )}
                      {update.changes.selected && update.changes.selected.length > 0 && (
                        <li>Selected {update.changes.selected.length} element(s)</li>
                      )}
                      {update.changes.deselected && update.changes.deselected.length > 0 && (
                        <li>Deselected {update.changes.deselected.length} element(s)</li>
                      )}
                      {update.changes.viewTransform && (
                        <li>View transform changed</li>
                      )}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-4">
              <p className="text-gray-500">No updates received yet.</p>
            </div>
          )}
          
          {context?.screenshot && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Document Preview</h3>
              <img 
                src={context.screenshot} 
                alt="Document preview" 
                className="w-full h-auto border rounded"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContextViewerContainer; 