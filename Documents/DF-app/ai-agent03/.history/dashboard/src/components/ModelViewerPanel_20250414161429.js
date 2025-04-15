import React, { useState, useEffect, useRef } from 'react';
import { Button, ButtonGroup, Card, Spinner } from 'react-bootstrap';
import { FaDownload, FaEdit, FaExpand, FaSync, FaCube } from 'react-icons/fa';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

function ModelViewerPanel({ selectedModel, onDownload, onEdit }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const animationRef = useRef(null);

  // Initialiseer Three.js-scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Scene opzetten
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // Camera opzetten
    const camera = new THREE.PerspectiveCamera(
      75, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // Renderer opzetten
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Controls toevoegen
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // Licht toevoegen
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(1, 2, 3);
    scene.add(directionalLight);
    
    // Helper grid toevoegen
    const gridHelper = new THREE.GridHelper(10, 10);
    scene.add(gridHelper);
    
    // Animatie loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);
  
  // Laad model wanneer geselecteerd
  useEffect(() => {
    if (!selectedModel || !sceneRef.current || !cameraRef.current) return;
    
    const loadModel = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Verwijder bestaande modellen
        sceneRef.current.children = sceneRef.current.children.filter(
          child => child instanceof THREE.Light || child instanceof THREE.GridHelper
        );
        
        // Laad nieuw model
        const loader = new GLTFLoader();
        const gltf = await new Promise((resolve, reject) => {
          loader.load(
            selectedModel.modelUrl,
            resolve,
            undefined,
            reject
          );
        });
        
        const model = gltf.scene;
        sceneRef.current.add(model);
        
        // Centreer model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const distance = maxDim * 1.5;
        
        // Reset camera positie
        cameraRef.current.position.set(center.x, center.y + size.y / 3, center.z + distance);
        cameraRef.current.lookAt(center);
        
        // Reset controls target
        if (controlsRef.current) {
          controlsRef.current.target.set(center.x, center.y, center.z);
          controlsRef.current.update();
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading model:', err);
        setError('Kon het 3D model niet laden. Controleer of het bestandsformaat ondersteund wordt.');
        setLoading(false);
      }
    };
    
    loadModel();
  }, [selectedModel]);
  
  // Reset camera view
  const resetView = () => {
    if (!sceneRef.current || !cameraRef.current || !controlsRef.current) return;
    
    const modelsInScene = sceneRef.current.children.filter(
      child => !(child instanceof THREE.Light || child instanceof THREE.GridHelper)
    );
    
    if (modelsInScene.length === 0) return;
    
    const box = new THREE.Box3().setFromObject(modelsInScene[0]);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 1.5;
    
    cameraRef.current.position.set(center.x, center.y + size.y / 3, center.z + distance);
    cameraRef.current.lookAt(center);
    
    controlsRef.current.target.set(center.x, center.y, center.z);
    controlsRef.current.update();
  };
  
  // Fullscreen weergave
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  return (
    <Card className="model-viewer-panel h-100">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          {selectedModel ? selectedModel.name : 'Geen model geselecteerd'}
        </h5>
        
        <ButtonGroup size="sm">
          <Button 
            variant="outline-secondary" 
            onClick={resetView}
            disabled={!selectedModel}
            title="Reset view"
          >
            <FaSync />
          </Button>
          <Button 
            variant="outline-secondary" 
            onClick={toggleFullscreen}
            disabled={!selectedModel}
            title="Fullscreen"
          >
            <FaExpand />
          </Button>
          {onEdit && (
            <Button 
              variant="outline-primary" 
              onClick={() => onEdit(selectedModel)}
              disabled={!selectedModel}
              title="Bewerk in Blender"
            >
              <FaEdit />
            </Button>
          )}
          {onDownload && (
            <Button 
              variant="outline-success" 
              onClick={() => onDownload(selectedModel)}
              disabled={!selectedModel}
              title="Download model"
            >
              <FaDownload />
            </Button>
          )}
        </ButtonGroup>
      </Card.Header>
      
      <div className="model-viewer-container position-relative" ref={containerRef}>
        {!selectedModel && (
          <div className="no-model-placeholder d-flex flex-column justify-content-center align-items-center h-100 text-muted">
            <FaCube size={50} className="mb-3" />
            <p>Selecteer een model om te bekijken</p>
          </div>
        )}
        
        {loading && (
          <div className="loading-overlay position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-light bg-opacity-75">
            <div className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Model laden...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="error-overlay position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center bg-light bg-opacity-75">
            <div className="text-center text-danger p-3">
              <FaCube size={40} className="mb-3" />
              <p>{error}</p>
              <Button 
                variant="outline-danger" 
                size="sm"
                onClick={() => setError(null)}
              >
                Sluiten
              </Button>
            </div>
          </div>
        )}
      </div>
      
      {selectedModel && (
        <Card.Footer className="bg-white">
          <small className="text-muted">
            {selectedModel.description || 'Geen beschrijving beschikbaar'}
          </small>
        </Card.Footer>
      )}
    </Card>
  );
}

export default ModelViewerPanel; 