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
  type?: 'model' | 'vector';
  vectorData?: VectorData;
}

export type ModelFormat = 'gltf' | 'glb' | 'obj' | 'fbx' | 'stl' | 'svg' | 'cdr';

export interface VectorData {
  paths: VectorPath[];
  width: number;
  height: number;
  viewBox?: string;
  originalFormat: string;
}

export interface VectorPath {
  id: string;
  pathData: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  transform?: string;
  type?: 'curve' | 'rectangle' | 'ellipse' | 'polygon' | 'text' | 'other';
  corelProps?: {
    outlineWidth?: number;
    outlineColor?: string;
    fillType?: string;
    fontName?: string;
    fontSize?: number;
    effects?: string[];
    [key: string]: any;
  };
}

export interface ModelViewerSettings {
  backgroundColor: string;
  wireframe: boolean;
  autoRotate: boolean;
  showGrid: boolean;
  showAxes: boolean;
  cameraPosition: [number, number, number];
  extrudeDepth?: number;
  renderMode?: 'flat' | '3d';
  showVectorPoints?: boolean;
}

export const defaultViewerSettings: ModelViewerSettings = {
  backgroundColor: '#f5f5f5',
  wireframe: false,
  autoRotate: false,
  showGrid: true,
  showAxes: true,
  cameraPosition: [0, 0, 5],
  extrudeDepth: 0.2,
  renderMode: '3d',
  showVectorPoints: false,
};

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
    type: 'model'
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
    type: 'model'
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
    type: 'model'
  },
  {
    id: '4',
    name: 'CorelDRAW Vector Voorbeeld',
    description: 'Vector voorbeeld van een logo ontwerp uit CorelDRAW',
    thumbnailUrl: '/thumbnails/vector-sample.jpg',
    format: 'svg',
    createdBy: 'AI Assistent',
    createdAt: new Date('2023-04-20'),
    platform: 'coreldraw',
    type: 'vector',
    vectorData: {
      width: 400,
      height: 300,
      originalFormat: 'cdr',
      paths: [
        {
          id: 'path1',
          pathData: 'M100,100 L300,100 L200,250 Z',
          fillColor: '#3498db',
          strokeColor: '#2980b9',
          strokeWidth: 2,
          type: 'polygon'
        },
        {
          id: 'path2',
          pathData: 'M150,150 C150,100 250,100 250,150 C250,200 150,200 150,150 Z',
          fillColor: '#e74c3c',
          strokeColor: '#c0392b',
          strokeWidth: 1,
          type: 'curve'
        },
        {
          id: 'path3',
          pathData: 'M100,200 h200 v50 h-200 Z',
          fillColor: '#2ecc71',
          strokeColor: '#27ae60',
          strokeWidth: 1,
          type: 'rectangle'
        }
      ]
    }
  }
]; 