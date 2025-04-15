import React, { Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF } from '@react-three/drei';
import { FaExclamationCircle } from 'react-icons/fa';

// Model component - laadt en toont een 3D model
function Model({ url }) {
  const { scene } = useGLTF(url);
  
  // Gebruik effect om model te resetten bij URL wijziging
  useEffect(() => {
    // Cleanup functie om model resources vrij te geven
    return () => {
      if (url) useGLTF.preload(url);
    };
  }, [url]);
  
  return <primitive object={scene} />;
}

// Fallback / placeholder component
function ModelPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="lightgray" />
    </mesh>
  );
}

// Error display voor wanneer een model niet geladen kan worden
function LoadError() {
  return (
    <div className="load-error">
      <FaExclamationCircle size={40} />
      <p>Fout bij het laden van het model</p>
    </div>
  );
}

// Geen model geselecteerd placeholder
function NoModelSelected() {
  return (
    <div className="no-model-message">
      <p>Geen model geselecteerd</p>
      <p className="text-muted small">Selecteer een model uit de lijst of genereer een nieuw model via de AI assistent</p>
    </div>
  );
}

// Hoofd ModelViewer component
function ModelViewer({ modelUrl }) {
  const [error, setError] = useState(false);
  
  // Reset error status wanneer model URL wijzigt
  useEffect(() => {
    setError(false);
  }, [modelUrl]);
  
  // Handle error in model laden
  const handleError = () => {
    console.error('Error loading model:', modelUrl);
    setError(true);
  };
  
  return (
    <div className="model-viewer">
      {!modelUrl ? (
        <NoModelSelected />
      ) : error ? (
        <LoadError />
      ) : (
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          onError={handleError}
        >
          <color attach="background" args={['#f5f5f5']} />
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          
          <Suspense fallback={<ModelPlaceholder />}>
            <Stage environment="city" intensity={0.6}>
              <Model url={modelUrl} />
            </Stage>
          </Suspense>
          
          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={10}
          />
        </Canvas>
      )}
    </div>
  );
}

export default ModelViewer; 