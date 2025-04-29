/**
 * Types en constanten voor de 3D Viewer
 */

// Model type definitie
export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  type: 'model' | 'vector'; // 3D model of vector data
  url: string;
  thumbnail?: string;
  vectorData?: string; // SVG data voor vector modellen
}

// Viewer instellingen
export interface ModelViewerSettings {
  wireframe: boolean;
  showGrid: boolean;
  showAxes: boolean;
  backgroundColor: string;
  renderMode: '3d' | 'flat';  // Changed from '2d' to 'flat' to match usage
  extrudeDepth: number; // Voor het extruderen van 2D vectoren naar 3D
  autoRotate: boolean;  // Added for auto-rotation functionality
  showVectorPoints?: boolean; // Voor het tonen van vectorpunten bij vector modellen
  cameraPosition?: [number, number, number]; // Voor het instellen van de camerapositie
}

// Standaard instellingen
export const defaultViewerSettings: ModelViewerSettings = {
  wireframe: false,
  showGrid: true,
  showAxes: true,
  backgroundColor: '#f5f5f5',
  renderMode: '3d',
  extrudeDepth: 5,
  autoRotate: false,  // Standaard staat autoRotate uit
};

// Voorbeeld modellen voor ontwikkeling
export const sampleModels: ModelInfo[] = [
  {
    id: 'cube',
    name: 'Kubus',
    description: 'Een eenvoudige 3D kubus',
    type: 'model',
    url: '/models/cube.glb',
    thumbnail: '/thumbnails/cube.png',
  },
  {
    id: 'sphere',
    name: 'Bol',
    description: 'Een 3D bol met textuur',
    type: 'model',
    url: '/models/sphere.glb',
    thumbnail: '/thumbnails/sphere.png',
  },
  {
    id: 'logo',
    name: 'Logo',
    description: 'Vector logo uit CorelDRAW',
    type: 'vector',
    url: '/models/logo.svg',
    thumbnail: '/thumbnails/logo.png',
    vectorData: '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" stroke="black" stroke-width="2" fill="red" /></svg>'
  }
]; 