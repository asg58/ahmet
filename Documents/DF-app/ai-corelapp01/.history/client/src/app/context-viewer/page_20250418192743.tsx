'use client';

import { useState, useEffect, useCallback } from 'react';
import { Socket, io } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

export default function ContextViewerPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [platform, setPlatform] = useState<'coreldraw' | 'blender'>('coreldraw');
  const [sessionId, setSessionId] = useState('default');
  const [context, setContext] = useState<DesignContext | null>(null);
  const [updates, setUpdates] = useState<ContextUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  
  // Initialize the socket connection
  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const newSocket = io(`${socketUrl}/context`, {
      transports: ['websocket'],
      autoConnect: true,
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to context socket');
      setConnected(true);
      setError(null);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from context socket');
      setConnected(false);
    });
    
    newSocket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
      setError(`Connection error: ${err.message}`);
      setConnected(false);
    });
    
    setSocket(newSocket);
    
    return () => {
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
        if ('error' in response) {
          setError(response.error);
        } else {
          setContext(response);
          setError(null);
        }
      });
      
      return () => {
        socket.off('contextUpdate', handleContextUpdate);
        socket.off('contextResponse');
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
        ...update.changes.viewTransform,
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
        if (found) return found;
      }
    }
    
    return null;
  };
  
  // Subscribe to context updates
  const handleSubscribe = () => {
    if (socket && connected) {
      socket.emit('subscribeContext', { platform, sessionId }, (response: any) => {
        if (response && response.success) {
          console.log(`Subscribed to ${platform} context updates for session ${sessionId}`);
        } else {
          setError(`Failed to subscribe: ${response?.error || 'Unknown error'}`);
        }
      });
    }
  };
  
  // Unsubscribe from context updates
  const handleUnsubscribe = () => {
    if (socket && connected) {
      socket.emit('unsubscribeContext', { platform, sessionId }, (response: any) => {
        if (response && response.success) {
          console.log(`Unsubscribed from ${platform} context updates for session ${sessionId}`);
        } else {
          setError(`Failed to unsubscribe: ${response?.error || 'Unknown error'}`);
        }
      });
    }
  };
  
  // Request current context
  const handleRequestContext = () => {
    if (socket && connected) {
      socket.emit('requestContext', { platform });
    }
  };
  
  // Format a date for display
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Design Context Viewer</h1>
      
      <div className="mb-6">
        <Link href="/" className="text-blue-500 hover:underline">
          ← Back to Home
        </Link>
      </div>
      
      <div className="bg-white shadow-md rounded p-4 mb-6">
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="block text-gray-700 mb-2">Platform</label>
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as 'coreldraw' | 'blender')}
              className="border rounded px-2 py-1"
            >
              <option value="coreldraw">CorelDRAW</option>
              <option value="blender">Blender</option>
            </select>
          </div>
          
          <div>
            <label className="block text-gray-700 mb-2">Session ID</label>
            <input
              type="text"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="border rounded px-2 py-1"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSubscribe}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={!connected}
          >
            Subscribe
          </button>
          
          <button
            onClick={handleUnsubscribe}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50"
            disabled={!connected}
          >
            Unsubscribe
          </button>
          
          <button
            onClick={handleRequestContext}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            disabled={!connected}
          >
            Request Current Context
          </button>
        </div>
        
        {error && (
          <div className="mt-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
            <p>{error}</p>
          </div>
        )}
        
        <div className="mt-4">
          <p>
            Status: <span className={connected ? "text-green-500" : "text-red-500"}>
              {connected ? "Connected" : "Disconnected"}
            </span>
          </p>
        </div>
      </div>
      
      {context && (
        <div className="bg-white shadow-md rounded p-4 mb-6">
          <h2 className="text-xl font-bold mb-2">Current Context</h2>
          
          <div className="mb-4">
            <p><span className="font-semibold">Document:</span> {context.documentName}</p>
            <p><span className="font-semibold">Platform:</span> {context.platform}</p>
            <p><span className="font-semibold">Size:</span> {context.size.width} x {context.size.height}{context.size.depth ? ` x ${context.size.depth}` : ''}</p>
            {context.currentPage !== undefined && (
              <p><span className="font-semibold">Current Page:</span> {context.currentPage}</p>
            )}
            {context.currentFrame !== undefined && (
              <p><span className="font-semibold">Current Frame:</span> {context.currentFrame}</p>
            )}
          </div>
          
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">View Transform</h3>
            <p><span className="font-semibold">Zoom:</span> {context.viewTransform.zoom.toFixed(2)}</p>
            <p><span className="font-semibold">Pan:</span> ({context.viewTransform.panX.toFixed(2)}, {context.viewTransform.panY.toFixed(2)})</p>
            {context.viewTransform.rotation !== undefined && (
              <p><span className="font-semibold">Rotation:</span> {context.viewTransform.rotation.toFixed(2)}°</p>
            )}
          </div>
          
          {context.lastAction && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Last Action</h3>
              <p><span className="font-semibold">Type:</span> {context.lastAction.type}</p>
              <p><span className="font-semibold">Description:</span> {context.lastAction.description}</p>
              <p><span className="font-semibold">Time:</span> {formatDate(context.lastAction.timestamp)}</p>
            </div>
          )}
          
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Selected Elements ({context.selectedElements.length})</h3>
            
            {context.selectedElements.length > 0 ? (
              <ul className="list-disc list-inside">
                {context.selectedElements.map(element => (
                  <li key={element.id}>
                    {element.name} ({element.type}) - Position: ({element.position.x}, {element.position.y}{element.position.z ? `, ${element.position.z}` : ''})
                  </li>
                ))}
              </ul>
            ) : (
              <p>No elements selected</p>
            )}
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2">Layers ({context.layers.length})</h3>
            
            {context.layers.map(layer => (
              <div key={layer.id} className="mb-2">
                <p>
                  <span className="font-semibold">{layer.name}</span>
                  {' '}
                  ({layer.elements.length} elements)
                  {' '}
                  {!layer.visible && <span className="text-gray-500">[hidden]</span>}
                  {layer.locked && <span className="text-orange-500">[locked]</span>}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {updates.length > 0 && (
        <div className="bg-white shadow-md rounded p-4">
          <h2 className="text-xl font-bold mb-2">Recent Updates</h2>
          
          {updates.map((update, index) => (
            <div key={index} className="mb-4 pb-4 border-b">
              <p><span className="font-semibold">Time:</span> {formatDate(update.timestamp)}</p>
              
              {update.lastAction && (
                <p><span className="font-semibold">Action:</span> {update.lastAction.description}</p>
              )}
              
              <div className="mt-2">
                <p className="font-semibold">Changes:</p>
                <ul className="list-disc list-inside">
                  {update.changes.added && update.changes.added.length > 0 && (
                    <li>{update.changes.added.length} elements added</li>
                  )}
                  
                  {update.changes.modified && update.changes.modified.length > 0 && (
                    <li>{update.changes.modified.length} elements modified</li>
                  )}
                  
                  {update.changes.removed && update.changes.removed.length > 0 && (
                    <li>{update.changes.removed.length} elements removed</li>
                  )}
                  
                  {update.changes.selected && update.changes.selected.length > 0 && (
                    <li>{update.changes.selected.length} elements selected</li>
                  )}
                  
                  {update.changes.deselected && update.changes.deselected.length > 0 && (
                    <li>{update.changes.deselected.length} elements deselected</li>
                  )}
                  
                  {update.changes.viewTransform && (
                    <li>View transform updated</li>
                  )}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 