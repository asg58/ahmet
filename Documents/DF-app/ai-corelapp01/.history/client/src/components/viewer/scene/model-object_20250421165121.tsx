import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import { Group, Object3D, Mesh } from 'three';
import { ModelInfo } from '@/types/models';

interface ModelObjectProps {
  model: ModelInfo;
  wireframe?: boolean;
}

export const ModelObject: React.FC<ModelObjectProps> = ({ model, wireframe = false }) => {
  const group = useRef<Group>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Laad het model
  const { scene } = useGLTF(model.url);
  
  // Update loading state when scene is available
  useEffect(() => {
    if (scene) {
      setLoading(false);
    }
  }, [scene]);
  
  // Handle error
  useEffect(() => {
    const handleError = (e: ErrorEvent) => {
      if (e.message.includes(model.url)) {
        setLoading(false);
        setError(`Fout bij laden model: ${e.message}`);
        console.error('Model laad fout:', e);
      }
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [model.url]);

  // Pas wireframe toe op alle meshes
  useEffect(() => {
    if (scene) {
      scene.traverse((object) => {
        if (object instanceof Mesh) {
          // @ts-ignore - wireframe staat niet in de types, maar werkt wel
          if (object.material) object.material.wireframe = wireframe;
        }
      });
    }
  }, [scene, wireframe]);

  // Roteer het model licht bij elke frame
  useFrame((state, delta) => {
    if (group.current) {
      // Lichte rotate animatie
      group.current.rotation.y += delta * 0.1;
    }
  });

  // Geef laadstatus of foutmelding weer
  if (loading || error) {
    return (
      <Html center>
        {loading ? (
          <div className="bg-white bg-opacity-80 p-4 rounded shadow-lg">
            <p className="text-gray-800">Model wordt geladen...</p>
          </div>
        ) : (
          <div className="bg-white bg-opacity-80 p-4 rounded shadow-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </Html>
    );
  }

  // Geef het model weer
  return (
    <group ref={group} dispose={null}>
      <primitive object={scene} />
    </group>
  );
};

export default ModelObject; 