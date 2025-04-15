import React, { useRef, useEffect, useState } from 'react';
import { Card, Button, ButtonGroup, Badge, Spinner, Alert, Tab, Tabs } from 'react-bootstrap';
import { FaDownload, FaEdit, FaCube, FaInfo, FaExclamationTriangle, FaSync, FaBug, FaCheckCircle, FaTimesCircle, FaSpinner, FaWifi, FaExclamationCircle } from 'react-icons/fa';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import BlenderWebSocketService from '../services/BlenderWebSocketService';

// Constants
const MAX_RETRIES = 5;

function ModelViewerPanel({ model, onDownload, onEdit }) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameRef = useRef(null);
  const modelMeshesRef = useRef({});
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('viewer');
  const [liveViewEnabled, setLiveViewEnabled] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(null);
  const [liveStatus, setLiveStatus] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [debugInfo, setDebugInfo] = useState(null);
  const [currentRetryCount, setCurrentRetryCount] = useState(0);
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [lastRequest, setLastRequest] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(null);
  const [blenderService] = useState(() => new BlenderWebSocketService());
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Bewaar een referentie naar het huidige element voor gebruik in de cleanup functie
    const mountElement = mountRef.current;
    
    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      mountElement.clientWidth / mountElement.clientHeight, 
      0.1, 
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountElement.clientWidth, mountElement.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountElement.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controlsRef.current = controls;
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Add grid and axes helpers
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // Handle resize
    const handleResize = () => {
      if (mountElement) {
        const width = mountElement.clientWidth;
        const height = mountElement.clientHeight;
        
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      
      if (mountElement && rendererRef.current) {
        mountElement.removeChild(rendererRef.current.domElement);
      }
      
      // Dispose resources
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      
      renderer.dispose();
    };
  }, []);
  
  // Function to load live model data from the WebSocket connection
  const loadLiveModelData = async () => {
    setLoading(true);
    setError(null);
    setRetryCount(0);
    
    // Update request time and tracking data
    const requestTime = new Date().toISOString();
    setLastRequest(requestTime);
    setWsStatus(blenderService.isConnected ? 'Connected' : 'Disconnected');
    setRequestSuccess(false);

    console.log(`[${requestTime}] Requesting live model data...`);
    console.log(`WebSocket status: ${blenderService.isConnected ? 'Connected' : 'Disconnected'}`);
    
    // Helper function to process model data
    const processModelData = (modelData) => {
      // Remove meshes that don't exist in the new data
      Object.keys(modelMeshesRef.current).forEach(name => {
        const stillExists = modelData.objects.some(obj => obj.name === name);
        if (!stillExists) {
          const mesh = modelMeshesRef.current[name];
          if (mesh && sceneRef.current) {
            sceneRef.current.remove(mesh);
            delete modelMeshesRef.current[name];
          }
        }
      });
      
      // Add or update objects
      modelData.objects.forEach(obj => {
        createOrUpdateMesh(obj);
      });
    };
    
    const attemptLoad = async (attempt = 0) => {
      try {
        if (attempt > 0) {
          console.log(`[${new Date().toISOString()}] Retry attempt ${attempt}/${MAX_RETRIES}`);
        }
        
        setRetryCount(attempt);
        
        // Use the WebSocket service to get live model data
        const data = await blenderService.getLiveModelData();
        
        console.log(`[${new Date().toISOString()}] Received live model data:`, data);
        
        if (data && data.status === 'ok' && data.data && data.data.objects && data.data.objects.length > 0) {
          setRequestSuccess(true);
          console.log('Live model data loaded successfully');
           
          // Process model data
          processModelData(data.data);
          
          setLiveViewEnabled(true);
          setTimeout(() => setLiveStatus(null), 2000);
        } else {
          throw new Error('Invalid model data received');
        }
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Error loading live model:`, err);
        
        // Retry logic with exponential backoff
        if (attempt < MAX_RETRIES) {
          const backoffTime = Math.min(2000 * Math.pow(2, attempt), 10000);
          console.log(`Retrying in ${backoffTime}ms...`);
          
          setTimeout(() => {
            attemptLoad(attempt + 1);
          }, backoffTime);
          
        } else {
          setError(`Failed to load live model: ${err.message}`);
          setLoading(false);
          setLiveStatus({ 
            type: 'danger', 
            message: 'Failed to get model data after multiple attempts' 
          });
        }
      } finally {
        if (attempt === 0 || attempt === MAX_RETRIES) {
          setLoading(false);
          setWsStatus(blenderService.isConnected ? 'Connected' : 'Disconnected');
        }
      }
    };
    
    attemptLoad();
  };
  
  // Functie om een mesh te maken of bij te werken op basis van objectdata
  const createOrUpdateMesh = (objData) => {
    if (!objData.name || !objData.vertices || !objData.indices || !sceneRef.current) {
      return;
    }
    
    let mesh = modelMeshesRef.current[objData.name];
    const hasExistingMesh = !!mesh;
    
    // Maak een nieuwe geometry aan of update de bestaande
    const geometry = hasExistingMesh ? mesh.geometry : new THREE.BufferGeometry();
    
    // Update vertices
    geometry.setAttribute(
      'position', 
      new THREE.Float32BufferAttribute(objData.vertices, 3)
    );
    
    // Update indices
    geometry.setIndex(objData.indices);
    
    // Update normalen indien beschikbaar
    if (objData.normals) {
      geometry.setAttribute(
        'normal',
        new THREE.Float32BufferAttribute(objData.normals, 3)
      );
    } else {
      geometry.computeVertexNormals();
    }
    
    // Update UV's indien beschikbaar
    if (objData.uvs) {
      geometry.setAttribute(
        'uv',
        new THREE.Float32BufferAttribute(objData.uvs, 2)
      );
    }
    
    // Maak of update materiaal
    let material;
    if (hasExistingMesh) {
      material = mesh.material;
    } else {
      // Basis materiaal aanmaken
      material = new THREE.MeshStandardMaterial({
        color: 0x7f7f7f,
        metalness: 0.2,
        roughness: 0.5
      });
    }
    
    // Update materiaal op basis van eerste materiaal in de lijst
    if (objData.materials && objData.materials.length > 0) {
      const matData = objData.materials[0];
      if (matData.color) {
        material.color.setRGB(
          matData.color[0],
          matData.color[1],
          matData.color[2]
        );
      }
      
      if (matData.metallic !== undefined) {
        material.metalness = matData.metallic;
      }
      
      if (matData.roughness !== undefined) {
        material.roughness = matData.roughness;
      }
    }
    
    // Maak een nieuwe mesh of update de bestaande
    if (hasExistingMesh) {
      mesh.geometry = geometry;
      mesh.material = material;
    } else {
      mesh = new THREE.Mesh(geometry, material);
      mesh.name = objData.name;
      sceneRef.current.add(mesh);
      modelMeshesRef.current[objData.name] = mesh;
    }
    
    // Update transformatie
    if (objData.position) {
      mesh.position.set(
        objData.position[0],
        objData.position[1],
        objData.position[2]
      );
    }
    
    if (objData.rotation) {
      mesh.rotation.set(
        objData.rotation[0],
        objData.rotation[1],
        objData.rotation[2]
      );
    }
    
    if (objData.scale) {
      mesh.scale.set(
        objData.scale[0],
        objData.scale[1],
        objData.scale[2]
      );
    }
    
    geometry.computeBoundingSphere();
  };
  
  // Activeer of deactiveer live view
  const toggleLiveView = () => {
    const newState = !liveViewEnabled;
    setLiveViewEnabled(newState);
    
    if (newState) {
      // Start polling voor live updates
      setRetryCount(0); // Reset retry count
      loadLiveModelData();
      const interval = setInterval(loadLiveModelData, 2000);
      setPollingInterval(interval);
      setLiveStatus({ type: 'success', message: 'Live view enabled' });
    } else {
      // Stop polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      setLiveStatus({ type: 'info', message: 'Live view disabled' });
    }
  };
  
  // Initialize WebSocket connection
  useEffect(() => {
    // Initialize WebSocket connection
    const initializeWebSocket = async () => {
      try {
        await blenderService.connect();
      } catch (error) {
        console.error('Failed to connect to Blender WebSocket server:', error);
      }
    };
    
    // Call once on mount
    initializeWebSocket();
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      // Don't disconnect on every re-render, only on unmount
    };
  }, [blenderService, pollingInterval]);
  
  // Load model when it changes
  useEffect(() => {
    if (!model || !sceneRef.current) return;
    
    // Clear existing model meshes
    Object.values(modelMeshesRef.current).forEach(mesh => {
      if (mesh && mesh.parent) {
        mesh.parent.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(m => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });
    modelMeshesRef.current = {};
    
    // Reset debug info en retry count voor het nieuwe model
    setDebugInfo(null);
    setCurrentRetryCount(0);
    
    // Als live view actief is, haal dan direct de live data op
    if (liveViewEnabled) {
      loadLiveModelData();
      
      // Clear any existing interval
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      
      // Create new polling interval
      const interval = setInterval(() => {
        if (liveViewEnabled) {
          loadLiveModelData();
        }
      }, 2000);
      setPollingInterval(interval);
    }
    // Cleanup on unmount or when model changes
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };
  }, [model, liveViewEnabled, loadLiveModelData, pollingInterval]);
  
  // Add explicit cleanup function for component unmount
  useEffect(() => {
    return () => {
      // Stop any polling
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      // Clean up Three.js resources
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
      
      // Clear model meshes references
      modelMeshesRef.current = {};
    };
  }, [pollingInterval]);
  
  if (!model) {
    return (
      <Card className="h-100 shadow-sm">
        <Card.Body className="d-flex flex-column justify-content-center align-items-center text-center p-5">
          <FaCube size={50} className="text-muted mb-3" />
          <h5>Geen model geselecteerd</h5>
          <p className="text-muted">
            Selecteer een model uit de lijst om het hier weer te geven.
          </p>
        </Card.Body>
      </Card>
    );
  }
  
  return (
    <Card className="h-100 shadow-sm">
      <Card.Header className="bg-primary text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">{model.name}</h5>
          <div>
            <ButtonGroup size="sm">
              <Button 
                variant={liveViewEnabled ? "success" : "light"} 
                onClick={toggleLiveView} 
                title={liveViewEnabled ? "Disable live view" : "Enable live view"}
              >
                <FaSync />
              </Button>
              <Button 
                variant="info" 
                onClick={() => setActiveTab(activeTab === 'debug' ? 'viewer' : 'debug')} 
                title="Debug info"
              >
                <FaBug />
              </Button>
              <Button variant="light" onClick={() => onEdit(model.id)} title="Bewerk model">
                <FaEdit />
              </Button>
              <Button variant="light" onClick={() => onDownload(model.id)} title="Download model">
                <FaDownload />
              </Button>
            </ButtonGroup>
          </div>
        </div>
      </Card.Header>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-0"
      >
        <Tab eventKey="viewer" title="Viewer">
          <div className="position-relative" style={{ height: '400px' }}>
            {/* 3D Viewer Container */}
            <div 
              ref={mountRef}
              className="w-100 h-100"
              style={{ position: 'relative' }}
            />
            
            {/* Loading overlay */}
            {loading && (
              <div className="position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-light bg-opacity-75">
                <div className="text-center">
                  <Spinner animation="border" role="status" variant="primary" />
                  <p className="mt-2">Model laden...</p>
                </div>
              </div>
            )}
            
            {/* Live status indicator */}
            {liveStatus && (
              <div className="position-absolute top-0 end-0 m-2">
                <Alert variant={liveStatus.type} className="py-1 px-2 m-0" style={{ fontSize: '0.8rem' }}>
                  {liveStatus.message}
                </Alert>
              </div>
            )}
            
            {/* Live view indicator */}
            {liveViewEnabled && (
              <div className="position-absolute bottom-0 end-0 m-2">
                <Badge bg="success" className="d-flex align-items-center">
                  <FaSync className="me-1" /> Live view
                </Badge>
              </div>
            )}
            
            {/* Error message */}
            {error && (
              <Alert 
                variant="danger" 
                className="position-absolute top-0 start-0 m-3"
                style={{ maxWidth: '80%' }}
              >
                <FaExclamationTriangle className="me-2" />
                {error}
              </Alert>
            )}
          </div>
        </Tab>
        
        <Tab eventKey="info" title="Informatie">
          <Card.Body>
            <div className="model-info">
              <h6><FaInfo className="me-2" />Model details</h6>
              
              <div className="mb-3">
                <strong>Beschrijving:</strong>
                <p>{model.description || 'Geen beschrijving beschikbaar.'}</p>
              </div>
              
              <div className="mb-3">
                <strong>Aangemaakt op:</strong>
                <p>{new Date(model.createdAt).toLocaleString()}</p>
              </div>
              
              <div className="mb-3">
                <strong>Tags:</strong>
                <div className="mt-1">
                  {model.tags?.length > 0 ? (
                    model.tags.map(tag => (
                      <Badge key={tag} bg="secondary" className="me-1 mb-1">
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted">Geen tags</span>
                  )}
                </div>
              </div>
              
              <div className="mb-3">
                <strong>Bestandslocatie:</strong>
                <p className="text-break">{model.modelUrl}</p>
              </div>
            </div>
          </Card.Body>
        </Tab>
        
        <Tab eventKey="debug" title="Debug">
          <Card.Body>
            <h6>Debug Informatie</h6>
            <div className="bg-light p-3 mt-2" style={{ overflowX: 'auto' }}>
              <pre style={{ fontSize: '0.8rem' }}>
                {debugInfo ? JSON.stringify(debugInfo, null, 2) : 'Geen debug info beschikbaar'}
              </pre>
            </div>
            
            <div className="mt-3">
              <h6>Troubleshooting</h6>
              <ul className="small">
                <li>
                  WebSocket Status: {wsStatus === 'Connected' ? 
                    <Badge bg="success"><FaWifi className="me-1" /> Connected</Badge> : 
                    wsStatus === 'Connecting' ?
                    <Badge bg="warning"><FaSpinner className="me-1" /> Connecting</Badge> :
                    wsStatus === 'Disconnected' ?
                    <Badge bg="danger"><FaExclamationCircle className="me-1" /> Disconnected</Badge> :
                    <Badge bg="secondary"><FaTimesCircle className="me-1" /> Disconnected</Badge>
                  }
                </li>
                <li>Last Request: {lastRequest ? new Date(lastRequest).toLocaleTimeString() : 'None'}</li>
                <li>Success: {requestSuccess === true ? 
                  <Badge bg="success"><FaCheckCircle className="me-1" />Yes</Badge> : 
                  requestSuccess === false ?
                  <Badge bg="danger"><FaTimesCircle className="me-1" />No</Badge> :
                  'Unknown'
                }</li>
                <li>Retry Count: {retryCount}/5</li>
                <li>Live View: {liveViewEnabled ? 'Enabled' : 'Disabled'}</li>
              </ul>
              
              <Button 
                variant="outline-secondary" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setCurrentRetryCount(0);
                  loadLiveModelData();
                }}
              >
                Refresh Manually
              </Button>
            </div>
          </Card.Body>
        </Tab>
      </Tabs>
    </Card>
  );
}

export default ModelViewerPanel; 