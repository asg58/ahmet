/**
 * Service voor communicatie met de Blender WebSocket server
 */
class BlenderWebSocketService {
  constructor(serverUri = 'ws://localhost:8765') {
    this.serverUri = serverUri;
    this.socket = null;
    this.isConnected = false;
    this.connectionListeners = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.autoReconnect = true;
    this.isConnecting = false; // Voorkom dubbele verbindingspogingen
    this.reconnectTimeout = null;
  }

  /**
   * Verbinding maken met de Blender WebSocket server
   * @param {boolean} force - Forceer een nieuwe verbinding, zelfs als er al een is
   * @returns {Promise<boolean>} Succes van de verbinding
   */
  async connect(force = false) {
    // Voorkom dubbele verbindingspogingen
    if (this.isConnecting) {
      console.log('Reeds bezig met verbinden, wacht op resultaat...');
      return new Promise((resolve) => {
        const checkConnection = setInterval(() => {
          if (!this.isConnecting) {
            clearInterval(checkConnection);
            resolve(this.isConnected);
          }
        }, 100);
      });
    }

    if (this.isConnected && !force) {
      console.log('Reeds verbonden met Blender WebSocket server');
      return true;
    }

    // Sluit bestaande verbinding als er een is
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    // Reset reconnect pogingen
    this.reconnectAttempts = 0;
    this.isConnecting = true;
    
    try {
      const result = await this.attemptConnect();
      this.isConnecting = false;
      return result;
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  /**
   * Probeer verbinding te maken, met mogelijkheid tot herverbinden
   * @private
   * @returns {Promise<boolean>} Succes van de verbinding
   */
  async attemptConnect() {
    // Annuleer eventuele openstaande reconnect timers
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    try {
      this.socket = new WebSocket(this.serverUri);
      
      return new Promise((resolve, reject) => {
        // Voeg een timeout toe voor de verbinding
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected && this.socket) {
            this.socket.close();
            reject(new Error('Verbinding timeout na 5 seconden'));
          }
        }, 5000);
        
        this.socket.onopen = () => {
          console.log('Verbonden met Blender WebSocket server');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.notifyConnectionListeners(true);
          clearTimeout(connectionTimeout);
          resolve(true);
        };
        
        this.socket.onclose = (event) => {
          console.log(`Verbinding verbroken: Code ${event.code}`);
          this.isConnected = false;
          this.notifyConnectionListeners(false);
          this.socket = null;
          clearTimeout(connectionTimeout);
          
          // Probeer automatisch te herverbinden als dat is ingeschakeld
          if (this.autoReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Herverbinden poging ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
            
            // Wacht iets langer bij elke poging (exponentiële backoff)
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
            this.reconnectTimeout = setTimeout(() => this.attemptConnect(), delay);
          }
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error(`Kon niet verbinden na ${this.maxReconnectAttempts} pogingen`));
          }
        };
        
        this.socket.onerror = (error) => {
          console.error('WebSocket fout:', error);
          this.isConnected = false;
          // Sluit niet hier, laat de onclose handler het afhandelen
        };
      });
    } catch (error) {
      console.error('Fout bij verbinding maken:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Verbinding verbreken met de server
   */
  disconnect() {
    // Annuleer eventuele openstaande reconnect timers
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Zet auto reconnect uit tijdens handmatige disconnectie
    this.autoReconnect = false;
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
      this.notifyConnectionListeners(false);
    }
    
    // Zet auto reconnect weer aan voor volgende keer
    this.autoReconnect = true;
  }

  /**
   * Forceer herverbinding met de server
   * @returns {Promise<boolean>} Succes van de herverbinding
   */
  async reconnect() {
    console.log('Forceer herverbinding met Blender WebSocket server...');
    return this.connect(true);
  }

  /**
   * Blender Python script verzenden naar de server
   * @param {string} scriptCode - De Blender Python code om uit te voeren
   * @returns {Promise<object>} Het resultaat van de uitvoering
   */
  async sendBlenderScript(scriptCode) {
    if (!this.isConnected || !this.socket) {
      try {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('Kon geen verbinding maken met Blender WebSocket server');
        }
      } catch (error) {
        throw new Error(`Verbindingsprobleem: ${error.message}`);
      }
    }

    const message = {
      type: 'bpy_script',
      code: scriptCode
    };

    return new Promise((resolve, reject) => {
      // Stel een timeout in voor de response
      const messageTimeout = setTimeout(() => {
        reject(new Error('Timeout bij wachten op response'));
      }, 30000); // 30 seconden timeout
      
      // Setup message handler voor de respons
      const messageHandler = (event) => {
        try {
          const response = JSON.parse(event.data);
          clearTimeout(messageTimeout);
          this.socket.onmessage = null;
          resolve(response);
        } catch (error) {
          clearTimeout(messageTimeout);
          this.socket.onmessage = null;
          reject(new Error('Ongeldige respons van server'));
        }
      };
      
      this.socket.onmessage = messageHandler;

      // Verstuur het bericht
      try {
        this.socket.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(messageTimeout);
        this.socket.onmessage = null;
        reject(new Error(`Fout bij versturen bericht: ${error.message}`));
      }
    });
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

print("${name} created successfully!")
`;

    // Voeg opslaan code toe indien gewenst
    if (saveAs) {
      // Naam zonder extensie voor de glTF export
      const baseName = saveAs.replace('.blend', '');
      
      script += `
# Save the .blend file
blend_file_path = "${saveAs}"
bpy.ops.wm.save_as_mainfile(filepath=blend_file_path)
print(f"Scene saved to: {blend_file_path}")

# Export to glTF format for web viewing
gltf_path = "${baseName}.gltf"
bpy.ops.export_scene.gltf(
    filepath=gltf_path,
    export_format='GLTF_SEPARATE',
    export_selected=False,
    use_selection=False
)
print(f"Exported to glTF: {gltf_path}")

# Create a simple JSON metadata file with paths to both files
import json
metadata = {
    "name": "${name}",
    "type": "${type}",
    "blendFile": blend_file_path,
    "gltfFile": gltf_path,
    "thumbnail": "${baseName}.png"
}

# Generate a thumbnail
bpy.context.scene.render.resolution_x = 512
bpy.context.scene.render.resolution_y = 512
bpy.context.scene.render.film_transparent = True
bpy.context.scene.render.filepath = "${baseName}.png"
bpy.ops.render.render(write_still=True)
print(f"Thumbnail saved as: ${baseName}.png")

# Save metadata
with open("${baseName}.json", 'w') as f:
    json.dump(metadata, f)
print(f"Metadata saved to: ${baseName}.json")
`;
    }

    return script;
  }

  /**
   * Een listener toevoegen voor verbindingsstatusveranderingen
   * @param {function} listener - Functie die aangeroepen wordt bij statusverandering
   */
  addConnectionListener(listener) {
    this.connectionListeners.push(listener);
  }

  /**
   * Een listener verwijderen
   * @param {function} listener - De listener functie om te verwijderen
   */
  removeConnectionListener(listener) {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }

  /**
   * Alle listeners notificeren van een statusverandering
   * @param {boolean} connected - Huidige verbindingsstatus
   */
  notifyConnectionListeners(connected) {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Fout in connection listener:', error);
      }
    });
  }
}

// Singleton instantie
const blenderService = new BlenderWebSocketService();
export default blenderService; 