import React, { useRef, useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Line, Html, Extrude } from '@react-three/drei';
import * as THREE from 'three';
import { SVGLoader, SVGResult } from 'three/examples/jsm/loaders/SVGLoader';

interface VectorPathData {
  id: string;
  pathData: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  transform?: string;
}

interface VectorObjectProps {
  vectorData: {
    paths: VectorPathData[];
    width: number;
    height: number;
    viewBox?: string;
  };
  extrudeDepth?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export const VectorObject: React.FC<VectorObjectProps> = ({
  vectorData,
  extrudeDepth = 0.1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [svgData, setSvgData] = useState<SVGResult | null>(null);
  const { scene } = useThree();

  // Generate SVG string from vector data
  const generateSVG = () => {
    const { paths, width, height, viewBox } = vectorData;
    const viewBoxAttr = viewBox || `0 0 ${width} ${height}`;
    
    const pathElements = paths.map(path => {
      const { id, pathData, fillColor, strokeColor, strokeWidth, transform } = path;
      return `<path
        id="${id}"
        d="${pathData}"
        fill="${fillColor || 'none'}"
        stroke="${strokeColor || 'black'}"
        stroke-width="${strokeWidth || 1}"
        ${transform ? `transform="${transform}"` : ''}
      />`;
    }).join('');
    
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBoxAttr}">
      ${pathElements}
    </svg>`;
  };

  useEffect(() => {
    try {
      setLoading(true);
      const svgString = generateSVG();
      
      // Create a blob URL from the SVG string
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      
      // Load the SVG
      const loader = new SVGLoader();
      loader.load(
        url,
        (data) => {
          setSvgData(data);
          setLoading(false);
          // Clean up the blob URL
          URL.revokeObjectURL(url);
        },
        undefined,
        (error) => {
          setError(`Error loading vector data: ${error.message}`);
          setLoading(false);
          URL.revokeObjectURL(url);
          console.error('Vector loading error:', error);
        }
      );
    } catch (err) {
      setError(`Failed to process vector data: ${err instanceof Error ? err.message : String(err)}`);
      setLoading(false);
    }
    
    // Clean up
    return () => {
      if (groupRef.current) {
        groupRef.current.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [vectorData]);

  // Center the model based on the SVG dimensions
  const centerOffset = useRef<[number, number, number]>([0, 0, 0]);
  
  useEffect(() => {
    if (svgData && groupRef.current) {
      const box = new THREE.Box3().setFromObject(groupRef.current);
      const center = box.getCenter(new THREE.Vector3());
      centerOffset.current = [-center.x, -center.y, 0];
      
      // Apply centering
      groupRef.current.position.set(
        position[0] + centerOffset.current[0],
        position[1] + centerOffset.current[1],
        position[2] + centerOffset.current[2]
      );
    }
  }, [svgData, position]);

  // Render loading or error state
  if (loading || error) {
    return (
      <Html center>
        {loading ? (
          <div className="bg-white bg-opacity-80 p-4 rounded shadow-lg">
            <p className="text-gray-800">Vector data wordt verwerkt...</p>
          </div>
        ) : (
          <div className="bg-white bg-opacity-80 p-4 rounded shadow-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}
      </Html>
    );
  }

  // Render the vector object
  return (
    <group 
      ref={groupRef} 
      position={position} 
      rotation={[rotation[0], rotation[1], rotation[2]]}
      scale={scale}
    >
      {svgData && svgData.paths.map((path, i) => {
        // Create shapes from the path subpaths
        const shapes = path.toShapes(true);
        
        return shapes.map((shape, j) => {
          // Get the path style
          const fillColor = path.userData?.style.fill;
          const strokeColor = path.userData?.style.stroke;
          
          return (
            <group key={`path-${i}-shape-${j}`}>
              {/* Render filled shape with extrusion */}
              {fillColor && fillColor !== 'none' && (
                <Extrude
                  args={[shape, { depth: extrudeDepth, bevelEnabled: false }]}
                >
                  <meshStandardMaterial
                    color={fillColor}
                    side={THREE.DoubleSide}
                  />
                </Extrude>
              )}
              
              {/* Render stroke */}
              {strokeColor && strokeColor !== 'none' && (
                <Line
                  points={shape.getPoints()}
                  color={strokeColor}
                  lineWidth={1}
                  closed
                />
              )}
            </group>
          );
        });
      })}
    </group>
  );
};

export default VectorObject; 