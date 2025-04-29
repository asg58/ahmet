import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, Center, PerspectiveCamera, Stats } from '@react-three/drei';
import { ModelViewerSettings } from '@/types/models';

interface ViewerSceneProps {
  children?: React.ReactNode;
  settings: ModelViewerSettings;
}

export const ViewerScene: React.FC<ViewerSceneProps> = ({ children, settings }) => {
  const controlsRef = useRef(null);

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        style={{ background: settings.backgroundColor }}
        camera={{ position: settings.cameraPosition, fov: 50 }}
      >
        <PerspectiveCamera makeDefault position={settings.cameraPosition} />
        
        {/* Draaibare camera controls */}
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.1}
          rotateSpeed={0.5}
          autoRotate={settings.autoRotate}
          autoRotateSpeed={0.5}
        />
        
        {/* Omgevingslicht */}
        <ambientLight intensity={0.5} />
        <spotLight 
          position={[10, 10, 10]} 
          angle={0.15} 
          penumbra={1} 
          intensity={0.8} 
          castShadow 
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        {/* Grids en helpers */}
        {settings.showGrid && (
          <Grid
            infiniteGrid
            cellSize={1}
            sectionSize={3}
            cellThickness={0.5}
            sectionThickness={1}
            cellColor="#6f6f6f"
            sectionColor="#9d4b4b"
            fadeDistance={30}
            fadeStrength={1.5}
          />
        )}
        
        {/* 3D scene content */}
        <Center>
          {children}
        </Center>
        
        {/* Omgeving en achtergrond */}
        <Environment preset="city" />
        
        {/* Performance stats (voor ontwikkeling) */}
        {process.env.NODE_ENV === 'development' && <Stats />}
      </Canvas>
    </div>
  );
};

export default ViewerScene; 