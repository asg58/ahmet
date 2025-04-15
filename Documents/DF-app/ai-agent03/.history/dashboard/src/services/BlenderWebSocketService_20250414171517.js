/**
 * Service voor communicatie met de Blender WebSocket server
 */
class BlenderWebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.connectionListeners = [];
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 5;
    this.reconnectTimer = null;
    this.lastErrorMessage = null;
    this.connectionStats = {
      lastConnected: null,
      lastDisconnected: null,
      totalConnections: 0,
      totalFailures: 0,
      reconnectAttempts: 0
    };
    this.lastConnectionAttempt = null;
    this._cleanDisconnect = false;
  }

  /**
   * Verbinding maken met de Blender WebSocket server
   * @param {string} url - De URL van de WebSocket server
   * @returns {Promise<void>}
   */
  async connect(url = 'ws://localhost:8765') {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Don't try to connect if already connected or connecting
    if (this.isConnected && this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('Already connected to Blender WebSocket server');
      return;
    }
    
    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      console.log('Connection already in progress to Blender WebSocket server');
      return;
    }

    // Implement connection throttling to avoid rapid reconnection attempts
    const now = Date.now();
    if (this.lastConnectionAttempt && (now - this.lastConnectionAttempt < 1000)) {
      console.log('Connection attempts throttled, waiting...');
      return;
    }
    this.lastConnectionAttempt = now;

    // Clean up existing socket if any
    if (this.socket) {
      this.disconnect();
    }

    console.log(`Connecting to Blender WebSocket server at ${url}...`);
    
    try {
      this.socket = new WebSocket(url);
      this.connectionAttempts++;
      this.connectionStats.reconnectAttempts++;

      // Setup event handlers
      this.socket.onopen = () => {
        console.log('Connected to Blender WebSocket server');
        this.isConnected = true;
        this.connectionAttempts = 0; // Reset connection attempts on successful connection
        this.lastErrorMessage = null;
        this.connectionStats.lastConnected = new Date();
        this.connectionStats.totalConnections++;
        this._notifyConnectionListeners(true);
      };

      this.socket.onclose = (event) => {
        // Only log if we're not in the middle of a clean disconnect
        if (!this._cleanDisconnect) {
          console.log(`Disconnected from Blender WebSocket server: ${event.code} - ${event.reason}`);
        }
        this.isConnected = false;
        this.connectionStats.lastDisconnected = new Date();
        this._notifyConnectionListeners(false);
        
        // Only attempt to reconnect if it wasn't a clean closure and reconnect is allowed
        if (!this._cleanDisconnect && event.code !== 1000 && event.code !== 1001) {
          this._handleReconnect(url);
        }
        this._cleanDisconnect = false;
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.lastErrorMessage = 'WebSocket connection error';
        this.connectionStats.totalFailures++;
        // Error will trigger onclose, so we'll handle reconnection there
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnected = false;
      this.lastErrorMessage = `Connection error: ${error.message}`;
      this.connectionStats.totalFailures++;
      this._notifyConnectionListeners(false);
      this._handleReconnect(url);
    }
  }

  /**
   * Private method to handle reconnection logic
   * @param {string} url - The URL of the WebSocket server
   */
  _handleReconnect(url) {
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      const backoffTime = Math.min(1000 * Math.pow(1.5, this.connectionAttempts), 10000);
      console.log(`Reconnecting in ${backoffTime/1000} seconds (attempt ${this.connectionAttempts}/${this.maxConnectionAttempts})...`);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect(url);
      }, backoffTime);
    } else {
      console.error(`Failed to connect after ${this.maxConnectionAttempts} attempts`);
      this.lastErrorMessage = `Failed to connect after ${this.maxConnectionAttempts} attempts`;
    }
  }

  /**
   * Verbinding verbreken met de server
   */
  disconnect() {
    if (this.socket) {
      this._cleanDisconnect = true; // Mark this as a clean disconnect
      console.log('Disconnecting from Blender WebSocket server...');
      // Use a clean closure code
      try {
        this.socket.close(1000, 'Normal closure');
      } catch (error) {
        console.warn('Error during WebSocket close:', error);
      }
      this.socket = null;
      this.isConnected = false;
      this.connectionStats.lastDisconnected = new Date();
      this._notifyConnectionListeners(false);
      
      // Clear any pending reconnect
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    }
  }

  /**
   * Forceer herverbinding met de server
   * @param {string} url - De URL van de WebSocket server
   * @returns {Promise<void>}
   */
  async reconnect(url = 'ws://localhost:8765') {
    console.log('Forcing reconnection to Blender WebSocket server...');
    this.disconnect();
    this.connectionAttempts = 0; // Reset connection attempts for forced reconnect
    return this.connect(url);
  }

  /**
   * Blender Python script verzenden naar de server
   * @param {string} script - De Blender Python code om uit te voeren
   * @param {number} timeout - De timeout voor de respons (standaard 30 seconden)
   * @returns {Promise<object>} Het resultaat van de uitvoering
   */
  async sendBlenderScript(script, timeout = 30000) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
        // Try to connect first if not already connected
        this.connect().then(() => {
          // Check again after connect attempt
          if (!this.isConnected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return reject(new Error('Not connected to Blender WebSocket server'));
          }
          this._sendScriptWithTimeout(script, timeout, resolve, reject);
        }).catch(err => {
          reject(new Error(`Failed to connect to WebSocket server: ${err.message}`));
        });
      } else {
        this._sendScriptWithTimeout(script, timeout, resolve, reject);
      }
    });
  }

  /**
   * Private method to send script with timeout handling
   * @param {string} script - De Blender Python code om uit te voeren
   * @param {number} timeout - De timeout voor de respons (standaard 30 seconden)
   * @param {function} resolve - De resolve functie voor de Promise
   * @param {function} reject - De reject functie voor de Promise
   */
  _sendScriptWithTimeout(script, timeout, resolve, reject) {
    const requestId = Date.now().toString();
    let timeoutId;
    
    const responseHandler = (event) => {
      try {
        const response = JSON.parse(event.data);
        
        // Only handle responses for this request
        if (response.request_id === requestId) {
          clearTimeout(timeoutId);
          this.socket.removeEventListener('message', responseHandler);
          
          if (response.status === 'error') {
            reject(new Error(`Blender error: ${response.message}`));
          } else {
            resolve(response);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket response:', error);
        // Don't reject here as it might be an unrelated message
      }
    };
    
    // Set timeout
    timeoutId = setTimeout(() => {
      this.socket.removeEventListener('message', responseHandler);
      reject(new Error(`Request timed out after ${timeout}ms`));
    }, timeout);
    
    // Listen for response
    this.socket.addEventListener('message', responseHandler);
    
    // Send the request
    try {
      const message = JSON.stringify({
        type: 'execute_script',
        script: script,
        request_id: requestId
      });
      this.socket.send(message);
    } catch (error) {
      clearTimeout(timeoutId);
      this.socket.removeEventListener('message', responseHandler);
      reject(new Error(`Failed to send message: ${error.message}`));
    }
  }

  /**
   * 3D model maken in Blender
   * @param {object} modelData - Data voor het model dat gemaakt moet worden
   * @returns {Promise<object>} Resultaat van het maken van het model
   */
  async createModel(modelData) {
    // Voorbeeld script code die gegenereerd kan worden op basis van modelData
    const scriptCode = this.generateModelScript(modelData);
    
    try {
      const result = await this.sendBlenderScript(scriptCode);
      return result;
    } catch (error) {
      console.error('Fout bij maken van model:', error);
      throw error;
    }
  }

  /**
   * Haal realtime geometriedata op van het huidige model in Blender
   * @returns {Promise<object>} Object met model geometrie informatie
   */
  async getLiveModelData() {
    const script = `
import bpy
import json
import math

# Helper functie om mesh data naar JSON te converteren
def mesh_to_json(obj):
    mesh_data = {}
    mesh_data['name'] = obj.name
    
    # Vertices
    vertices = []
    for v in obj.data.vertices:
        vertices.extend([v.co.x, v.co.y, v.co.z])
    mesh_data['vertices'] = vertices
    
    # Faces (indices)
    indices = []
    for poly in obj.data.polygons:
        if len(poly.vertices) == 3:
            # Driehoek
            indices.extend([poly.vertices[0], poly.vertices[1], poly.vertices[2]])
        elif len(poly.vertices) == 4:
            # Vierhoek - split in twee driehoeken
            indices.extend([poly.vertices[0], poly.vertices[1], poly.vertices[2]])
            indices.extend([poly.vertices[0], poly.vertices[2], poly.vertices[3]])
        else:
            # N-gon - trianguleren
            for i in range(1, len(poly.vertices) - 1):
                indices.extend([poly.vertices[0], poly.vertices[i], poly.vertices[i+1]])
    mesh_data['indices'] = indices
    
    # Normalen
    normals = []
    for v in obj.data.vertices:
        normals.extend([v.normal.x, v.normal.y, v.normal.z])
    mesh_data['normals'] = normals
    
    # UV coördinaten (indien beschikbaar)
    if obj.data.uv_layers.active:
        uvs = []
        uv_layer = obj.data.uv_layers.active.data
        for poly in obj.data.polygons:
            for loop_idx in poly.loop_indices:
                uv = uv_layer[loop_idx].uv
                uvs.extend([uv.x, uv.y])
        mesh_data['uvs'] = uvs
    
    # Materiaal informatie
    materials = []
    for slot in obj.material_slots:
        if slot.material:
            mat = slot.material
            mat_data = {
                'name': mat.name
            }
            
            # Haal BSDF node eigenschappen op
            if mat.use_nodes and mat.node_tree.nodes.get('Principled BSDF'):
                principled = mat.node_tree.nodes.get('Principled BSDF')
                base_color = principled.inputs['Base Color'].default_value
                mat_data['color'] = [base_color[0], base_color[1], base_color[2]]
                mat_data['metallic'] = principled.inputs['Metallic'].default_value
                mat_data['roughness'] = principled.inputs['Roughness'].default_value
            else:
                # Fallback voor materialen zonder nodes
                diffuse_color = mat.diffuse_color
                mat_data['color'] = [diffuse_color[0], diffuse_color[1], diffuse_color[2]]
            
            materials.append(mat_data)
    
    mesh_data['materials'] = materials
    
    # Transformatie
    mesh_data['position'] = [obj.location.x, obj.location.y, obj.location.z]
    mesh_data['rotation'] = [obj.rotation_euler.x, obj.rotation_euler.y, obj.rotation_euler.z]
    mesh_data['scale'] = [obj.scale.x, obj.scale.y, obj.scale.z]
    
    return mesh_data

# Verzamel data van alle mesh objecten in de scene
scene_data = {
    'objects': []
}

# Lijst met mesh objecten
mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

for obj in mesh_objects:
    scene_data['objects'].append(mesh_to_json(obj))

# Zet om naar JSON en print resultaat met speciale markering
json_result = json.dumps(scene_data)
print("JSON_DATA_START")
print(json_result)
print("JSON_DATA_END")
    `;
    
    try {
      const result = await this.sendBlenderScript(script);
      
      if (result.status === 'ok' && result.details) {
        try {
          // Zoek naar de JSON data tussen de markers
          const regex = /JSON_DATA_START\s*([\s\S]*?)\s*JSON_DATA_END/;
          const match = result.details.match(regex);
          
          if (match && match[1]) {
            const jsonData = match[1].trim();
            try {
              return {
                status: 'ok',
                data: JSON.parse(jsonData)
              };
            } catch (parseJsonError) {
              console.error('Fout bij parsen van geometrie data JSON:', parseJsonError);
              console.log('Ongeldig JSON formaat, ruwe data:', jsonData);
              
              // Probeer op een simpelere manier te zoeken naar de JSON object
              const startIdx = result.details.indexOf('{');
              const endIdx = result.details.lastIndexOf('}');
              
              if (startIdx >= 0 && endIdx > startIdx) {
                const extractedJson = result.details.substring(startIdx, endIdx + 1);
                try {
                  return {
                    status: 'ok',
                    data: JSON.parse(extractedJson),
                    extracted: true
                  };
                } catch (fallbackError) {
                  return {
                    status: 'error',
                    details: `Kon geen geldige JSON vinden in Blender output: ${fallbackError.message}`,
                    rawDetails: result.details
                  };
                }
              }
              
              return {
                status: 'error',
                details: `Fout bij parsen van geometrie data: ${parseJsonError.message}`,
                rawDetails: jsonData
              };
            }
          } else {
            console.error('Geen JSON data markers gevonden in Blender output');
            
            // Probeer op een simpelere manier te zoeken naar de JSON object
            const startIdx = result.details.indexOf('{');
            const endIdx = result.details.lastIndexOf('}');
            
            if (startIdx >= 0 && endIdx > startIdx) {
              const extractedJson = result.details.substring(startIdx, endIdx + 1);
              try {
                return {
                  status: 'ok',
                  data: JSON.parse(extractedJson),
                  extracted: true
                };
              } catch (fallbackError) {
                return {
                  status: 'error',
                  details: `Kon geen geldige JSON vinden in Blender output: ${fallbackError.message}`,
                  rawDetails: result.details
                };
              }
            }
            
            return {
              status: 'error',
              details: 'Geen JSON data markers gevonden in Blender output',
              rawDetails: result.details
            };
          }
        } catch (parseError) {
          console.error('Fout bij parsen van geometrie data:', parseError);
          return {
            status: 'error',
            details: `Fout bij parsen van geometrie data: ${parseError.message}`,
            rawDetails: result.details
          };
        }
      }
      
      return result;
    } catch (error) {
      console.error('Fout bij ophalen live model data:', error);
      return {
        status: 'error',
        details: `Fout bij ophalen van live model data: ${error.message}`
      };
    }
  }

  /**
   * Genereert een Blender Python script op basis van model data
   * @param {object} modelData - Object met model gegevens
   * @returns {string} Blender Python script
   */
  generateModelScript(modelData) {
    const { type = 'cube', name = 'NewModel', color = [1, 0, 0], size = 2, saveAs } = modelData;
    
    // Basis script
    let script = `
import bpy
import os

# Clear existing objects
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Create the object
`;

    // Voeg het juiste object toe op basis van type
    switch (type.toLowerCase()) {
      case 'sphere':
        script += `bpy.ops.mesh.primitive_uv_sphere_add(radius=${size/2}, location=(0, 0, 0))`;
        break;
      case 'cylinder':
        script += `bpy.ops.mesh.primitive_cylinder_add(radius=${size/2}, depth=${size}, location=(0, 0, 0))`;
        break;
      case 'torus':
        script += `bpy.ops.mesh.primitive_torus_add(major_radius=${size/2}, minor_radius=${size/4}, location=(0, 0, 0))`;
        break;
      default: // cube
        script += `bpy.ops.mesh.primitive_cube_add(size=${size}, location=(0, 0, 0))`;
    }

    // Voeg de naam en materiaal toe
    script += `
# Name the object
obj = bpy.context.active_object
obj.name = "${name}"

# Add a material
material = bpy.data.materials.new(name="${name}Material")
material.use_nodes = True
principled = material.node_tree.nodes.get('Principled BSDF')
if principled:
    principled.inputs['Base Color'].default_value = (${color[0]}, ${color[1]}, ${color[2]}, 1)
    principled.inputs['Metallic'].default_value = 0.2
    principled.inputs['Roughness'].default_value = 0.3
obj.data.materials.append(material)

# Verzamel data van het object en print als JSON
import json
print("JSON_DATA_START")
print(json.dumps({
    "objects": [{
        "name": obj.name,
        "position": [obj.location.x, obj.location.y, obj.location.z],
        "rotation": [obj.rotation_euler.x, obj.rotation_euler.y, obj.rotation_euler.z],
        "scale": [obj.scale.x, obj.scale.y, obj.scale.z]
    }]
}))
print("JSON_DATA_END")
print("${name} created successfully!")
`;

    // Voeg opslaan code toe indien gewenst
    if (saveAs) {
      script += `
# Save the .blend file
blend_file_path = "${saveAs}"
bpy.ops.wm.save_as_mainfile(filepath=blend_file_path)
print(f"Scene saved to: {blend_file_path}")
`;
    }

    return script;
  }

  /**
   * Een listener toevoegen voor verbindingsstatusveranderingen
   * @param {function} listener - Functie die aangeroepen wordt bij statusverandering
   */
  addConnectionListener(listener) {
    if (typeof listener === 'function' && !this.connectionListeners.includes(listener)) {
      this.connectionListeners.push(listener);
      // Immediately notify with current status
      listener(this.isConnected);
    }
    return () => this.removeConnectionListener(listener); // Return unsubscribe function
  }

  /**
   * Een listener verwijderen
   * @param {function} listener - De listener functie om te verwijderen
   */
  removeConnectionListener(listener) {
    const index = this.connectionListeners.indexOf(listener);
    if (index !== -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  /**
   * Alle listeners notificeren van een statusverandering
   * @param {boolean} connected - Huidige verbindingsstatus
   */
  _notifyConnectionListeners(connected) {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Fout in connection listener:', error);
      }
    });
  }

  /**
   * Get connection status details
   * @returns {object} Object met verbindingsstatusdetails
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      socketState: this.socket ? this.socket.readyState : 'no socket',
      connectionAttempts: this.connectionAttempts,
      maxConnectionAttempts: this.maxConnectionAttempts,
      lastErrorMessage: this.lastErrorMessage,
      stats: this.connectionStats
    };
  }
}

// Singleton instantie
const blenderService = new BlenderWebSocketService();
export default blenderService; 