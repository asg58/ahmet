import React, { useRef, useEffect, useState } from 'react';
import { Card, Button, ButtonGroup, Badge, Spinner, Alert, Tab, Tabs } from 'react-bootstrap';
import { FaDownload, FaEdit, FaCube, FaInfo, FaExclamationTriangle } from 'react-icons/fa';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function ModelViewerPanel({ model, onDownload, onEdit }) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('viewer');
  
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
    renderer.outputEncoding = THREE.sRGBEncoding;
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
  
  // Load model when it changes
  useEffect(() => {
    if (!model || !model.modelUrl || !sceneRef.current) return;
    
    const loadModel = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Clear previous model
        sceneRef.current.traverse((object) => {
          if (object.type === 'Mesh') {
            sceneRef.current.remove(object);
          }
        });
        
        // Load new model
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
        setError('Fout bij het laden van het model. Controleer of het bestandsformaat ondersteund wordt.');
        setLoading(false);
      }
    };
    
    loadModel();
  }, [model]);
  
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
      </Tabs>
    </Card>
  );
}

export default ModelViewerPanel; 