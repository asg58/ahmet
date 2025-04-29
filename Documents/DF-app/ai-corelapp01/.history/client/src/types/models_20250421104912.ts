export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  format: ModelFormat;
  createdBy: string;
  createdAt: Date;
  platform: 'blender' | 'coreldraw';
  sessionId?: string;
  metadata?: Record<string, any>;
}

export type ModelFormat = 'gltf' | 'glb' | 'obj' | 'fbx' | 'stl';

export interface ModelViewerSettings {
  backgroundColor: string;
  wireframe: boolean;
  autoRotate: boolean;
  showGrid: boolean;
  showAxes: boolean;
  cameraPosition: [number, number, number];
}

export const defaultViewerSettings: ModelViewerSettings = {
  backgroundColor: '#f5f5f5',
  wireframe: false,
  autoRotate: false,
  showGrid: true,
  showAxes: true,
  cameraPosition: [0, 0, 5],
};

// Voorbeeld modellen voor test doeleinden
export const sampleModels: ModelInfo[] = [
  {
    id: '1',
    name: 'Suzanne (Blender Monkey)',
    description: 'Het klassieke aap model uit Blender',
    url: '/models/suzanne.glb',
    thumbnailUrl: '/thumbnails/suzanne.jpg',
    format: 'glb',
    createdBy: 'Blender Foundation',
    createdAt: new Date('2023-04-01'),
    platform: 'blender',
  },
  {
    id: '2',
    name: 'Eenvoudige kubus',
    description: 'Een basis 3D kubus',
    url: '/models/cube.glb',
    thumbnailUrl: '/thumbnails/cube.jpg',
    format: 'glb',
    createdBy: 'AI Assistent',
    createdAt: new Date('2023-04-10'),
    platform: 'blender',
  },
  {
    id: '3',
    name: 'CorelDRAW Logo 3D',
    description: 'CorelDRAW logo geëxtrudeerd naar 3D',
    url: '/models/corel-logo.glb',
    thumbnailUrl: '/thumbnails/corel-logo.jpg',
    format: 'glb',
    createdBy: 'AI Assistent',
    createdAt: new Date('2023-04-15'),
    platform: 'coreldraw',
  },
]; 