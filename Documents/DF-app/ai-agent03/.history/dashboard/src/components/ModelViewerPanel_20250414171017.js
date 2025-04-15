import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Card, Button, ButtonGroup, Badge, Spinner, Alert, Tab, Tabs } from 'react-bootstrap';
import { FaDownload, FaEdit, FaCube, FaInfo, FaExclamationTriangle, FaSync, FaBug, FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import blenderService from '../services/BlenderWebSocketService';

function ModelViewerPanel({ model, onDownload, onEdit }) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameRef = useRef(null);
  const modelMeshesRef = useRef({});
  const modelViewerRef = useRef(null);
  
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
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Setup scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      mountRef.current.clientWidth / mountRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);
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
      if (mountRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        
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
      
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
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
  
  // Functie om live model data op te halen en weer te geven
  const loadLiveModelData = async () => {
    if (!sceneRef.current) return;
    
    try {
      // Status update
      setLiveStatus({ type: 'info', message: 'Updating model...' });
      
      // Haal data op van Blender
      const response = await blenderService.getLiveModelData();
      
      // Debug info bijwerken
      setDebugInfo({
        response: response,
        timestamp: new Date().toISOString()
      });
      
      if (response.status === 'ok' && response.data && response.data.objects && response.data.objects.length > 0) {
        // Reset retry count als er data is
        setRetryCount(0);
        
        // Verwijder bestaande model meshes die niet meer in de nieuwe data voorkomen
        Object.keys(modelMeshesRef.current).forEach(name => {
          const stillExists = response.data.objects.some(obj => obj.name === name);
          if (!stillExists) {
            const mesh = modelMeshesRef.current[name];
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
            delete modelMeshesRef.current[name];
          }
        });
        
        // Voeg nieuwe objecten toe of update bestaande
        response.data.objects.forEach(obj => {
          createOrUpdateMesh(obj);
        });
        
        // Center camera on all objects
        if (Object.keys(modelMeshesRef.current).length > 0) {
          const allMeshes = Object.values(modelMeshesRef.current);
          const group = new THREE.Group();
          sceneRef.current.add(group);
          allMeshes.forEach(mesh => group.add(mesh.clone()));
          
          const box = new THREE.Box3().setFromObject(group);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = cameraRef.current.fov * (Math.PI / 180);
          let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
          
          cameraRef.current.position.set(
            center.x,
            center.y,
            center.z + cameraDistance * 1.5
          );
          
          controlsRef.current.target.set(center.x, center.y, center.z);
          controlsRef.current.update();
          
          sceneRef.current.remove(group);
        }
        
        setLiveStatus({ type: 'success', message: 'Model updated successfully' });
        setTimeout(() => setLiveStatus(null), 2000);
      } else {
        console.error('Geen geldige model data ontvangen:', response);
        // Probeer automatisch opnieuw als er geen objecten zijn
        if (retryCount < 5) { // Verhoog naar 5 pogingen
          const nextRetry = retryCount + 1;
          setRetryCount(nextRetry);
          setLiveStatus({ 
            type: 'warning', 
            message: `No model data found, retrying (${nextRetry}/5)...` 
          });
          
          // Stel de nieuwe retry in als een aparte timeout
          setTimeout(() => {
            // Alleen opnieuw proberen als live view nog steeds ingeschakeld is
            if (liveViewEnabled) {
              loadLiveModelData();
            }
          }, 3000);
        } else {
          setLiveStatus({ 
            type: 'warning', 
            message: 'Could not get model data from Blender after multiple attempts. Try editing the model.' 
          });
        }
      }
    } catch (err) {
      console.error('Fout bij ophalen live model data:', err);
      setDebugInfo({
        error: err.message,
        timestamp: new Date().toISOString()
      });
      setLiveStatus({ 
        type: 'danger', 
        message: `Error: ${err.message}` 
      });
    }
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
  
  // Cleanup polling bij unmount of model change
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);
  
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
    setRetryCount(0);
    
    // Als live view actief is, haal dan direct de live data op
    if (liveViewEnabled) {
      loadLiveModelData();
      
      // Maak nieuw polling interval als er nog geen is
      if (!pollingInterval) {
        const interval = setInterval(() => {
          if (liveViewEnabled) {
            loadLiveModelData();
          }
        }, 2000);
        setPollingInterval(interval);
      }
    }
    // Anders, probeer de modelUrl te laden als die beschikbaar is
    else if (model.modelUrl) {
      const loadModel = async () => {
        setLoading(true);
        setError(null);
        
        try {
          // Load model from URL
          const loader = new GLTFLoader();
          const gltf = await new Promise((resolve, reject) => {
            loader.load(
              model.modelUrl,
              (gltf) => resolve(gltf),
              (xhr) => console.log(`Loading model: ${(xhr.loaded / xhr.total * 100)}% loaded`),
              (error) => reject(error)
            );
          });
          
          // Add model to scene
          sceneRef.current.add(gltf.scene);
          
          // Center model
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = cameraRef.current.fov * (Math.PI / 180);
          let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
          
          // Position camera to see the entire model
          cameraRef.current.position.set(
            center.x,
            center.y,
            center.z + cameraDistance * 1.5
          );
          
          // Update controls target to model center
          controlsRef.current.target.set(center.x, center.y, center.z);
          controlsRef.current.update();
          
          setLoading(false);
        } catch (err) {
          console.error('Error loading model:', err);
          
          // Als het laden van het model via URL mislukt, probeer dan live data
          setError('Kan modelbestand niet laden. Schakel live view in om het model direct uit Blender te laden.');
          setLoading(false);
        }
      };
      
      loadModel();
    } else {
      // Als er geen modelUrl is, schakel automatisch live view in
      setLiveViewEnabled(true);
      loadLiveModelData();
      const interval = setInterval(loadLiveModelData, 2000);
      setPollingInterval(interval);
    }
  }, [model, liveViewEnabled]);
  
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
                <li>WebSocket Status: {blenderService.isConnected ? 
                  <Badge bg="success">Verbonden</Badge> : 
                  <Badge bg="danger">Niet verbonden</Badge>}
                </li>
                <li>Retry Count: {retryCount}/5</li>
                <li>Live View: {liveViewEnabled ? 'Ingeschakeld' : 'Uitgeschakeld'}</li>
              </ul>
              
              <Button 
                variant="outline-secondary" 
                size="sm" 
                className="mt-2"
                onClick={() => {
                  setRetryCount(0);
                  loadLiveModelData();
                }}
              >
                Handmatig verversen
              </Button>
            </div>
          </Card.Body>
        </Tab>
      </Tabs>
    </Card>
  );
}

export default ModelViewerPanel; 