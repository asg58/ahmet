import React, { useState, useEffect } from 'react';
import ViewerScene from './scene/viewer-scene';
import ModelObject from './scene/model-object';
import VectorObject from './scene/vector-object';
import ViewerControls from './controls/viewer-controls';
import ModelSelector from './model-selector';
import { ModelInfo, ModelViewerSettings, defaultViewerSettings, sampleModels } from '@/types/models';
import { blenderApiService } from '@/lib/blender-api.service';

interface ModelViewerProps {
  initialModelUrl?: string;
}

const ModelViewer: React.FC<ModelViewerProps> = ({ initialModelUrl }) => {
  // State voor het momenteel geselecteerde model
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  
  // State voor de modellen lijst (nu opgehaald via API)
  const [models, setModels] = useState<ModelInfo[]>([]);
  
  // State voor viewer instellingen
  const [settings, setSettings] = useState<ModelViewerSettings>(defaultViewerSettings);
  
  // State voor laad- en foutstatus
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // State voor connectie status
  const [isBlenderConnected, setIsBlenderConnected] = useState<boolean>(false);

  // Haal modellen op van Blender API bij het laden
  useEffect(() => {
    async function fetchModels() {
      try {
        setLoading(true);
        
        // Check Blender connection status
        const status = await blenderApiService.getStatus();
        setIsBlenderConnected(status.connected);
        
        if (status.connected) {
          // Try to fetch models from API
          const apiModels = await blenderApiService.getModels();
          
          if (apiModels && apiModels.length > 0) {
            setModels(apiModels);
          } else {
            // If no models from API, fall back to sample models
            setModels(sampleModels);
          }
        } else {
          // If Blender is not connected, use sample models
          setModels(sampleModels);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching models:', err);
        setError('Fout bij laden van modellen');
        setModels(sampleModels); // Fallback to sample models
        setLoading(false);
      }
    }
    
    fetchModels();
  }, []);

  // Effect voor het laden van een initieel model als URL wordt opgegeven
  useEffect(() => {
    if (initialModelUrl && models.length > 0) {
      // Zoek model met de opgegeven URL
      const model = models.find(m => m.url === initialModelUrl);
      if (model) {
        setSelectedModel(model);
      }
    }
  }, [initialModelUrl, models]);

  // Handler voor het wijzigen van viewer instellingen
  const handleSettingsChange = (newSettings: Partial<ModelViewerSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Handler voor het selecteren van een model
  const handleSelectModel = (model: ModelInfo) => {
    setLoading(true);
    setError(null);
    setSelectedModel(model);
    
    // Echte network request simuleren
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };
  
  // Handler voor het creëren van een kubus
  const handleCreateCube = async () => {
    if (!isBlenderConnected) {
      setError('Blender is niet verbonden. Kon geen nieuwe kubus maken.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await blenderApiService.createCube({
        name: `Cube_${Date.now()}`,
        size: 2,
        location: [0, 0, 0],
        color: [0.8, 0.2, 0.2, 1.0] // Red color
      });
      
      if (result.success && result.modelUrl) {
        const newModel = blenderApiService.convertToModelInfo(result);
        if (newModel) {
          // Add to models list and select it
          setModels(prev => [...prev, newModel]);
          setSelectedModel(newModel);
        }
      } else {
        setError(result.error || 'Fout bij maken van kubus');
      }
    } catch (err) {
      console.error('Error creating cube:', err);
      setError('Fout bij het maken van een kubus');
    } finally {
      setLoading(false);
    }
  };
  
  // Handler voor het creëren van een bol
  const handleCreateSphere = async () => {
    if (!isBlenderConnected) {
      setError('Blender is niet verbonden. Kon geen nieuwe bol maken.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await blenderApiService.createSphere({
        name: `Sphere_${Date.now()}`,
        radius: 1,
        segments: 32,
        rings: 16,
        location: [0, 0, 0],
        color: [0.2, 0.6, 0.8, 1.0] // Blue color
      });
      
      if (result.success && result.modelUrl) {
        const newModel = blenderApiService.convertToModelInfo(result);
        if (newModel) {
          // Add to models list and select it
          setModels(prev => [...prev, newModel]);
          setSelectedModel(newModel);
        }
      } else {
        setError(result.error || 'Fout bij maken van bol');
      }
    } catch (err) {
      console.error('Error creating sphere:', err);
      setError('Fout bij het maken van een bol');
    } finally {
      setLoading(false);
    }
  };

  // Bepaal het modeltype (3D model of vector)
  const modelType = selectedModel?.type || 'model';

  // Helper function to parse SVG string data into vector data object
  const parseSVGString = (svgString: string) => {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
    const svgElement = svgDoc.querySelector('svg');
    
    if (!svgElement) {
      throw new Error('Invalid SVG string: No SVG element found');
    }
    
    const width = Number(svgElement.getAttribute('width') || 100);
    const height = Number(svgElement.getAttribute('height') || 100);
    const viewBox = svgElement.getAttribute('viewBox') || undefined;
    
    const paths = Array.from(svgDoc.querySelectorAll('path')).map((path, index) => {
      return {
        id: path.getAttribute('id') || `path-${index}`,
        pathData: path.getAttribute('d') || '',
        fillColor: path.getAttribute('fill') || undefined,
        strokeColor: path.getAttribute('stroke') || undefined,
        strokeWidth: path.getAttribute('stroke-width') ? Number(path.getAttribute('stroke-width')) : undefined,
        transform: path.getAttribute('transform') || undefined
      };
    });
    
    return {
      paths,
      width,
      height,
      viewBox
    };
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* Linker paneel - Modelkiezer en acties */}
      <div className="w-full md:w-64 md:min-w-64 flex-shrink-0 space-y-4">
        <ModelSelector 
          models={models}
          selectedModelId={selectedModel?.id || null}
          onSelectModel={handleSelectModel}
        />
        
        {/* Create Actions Panel */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium mb-3">Maak nieuw model</h3>
          <div className="flex flex-col gap-2">
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:bg-gray-400"
              onClick={handleCreateCube}
              disabled={!isBlenderConnected}
            >
              Nieuwe Kubus
            </button>
            <button
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:bg-gray-400"
              onClick={handleCreateSphere}
              disabled={!isBlenderConnected}
            >
              Nieuwe Bol
            </button>
          </div>
          {!isBlenderConnected && (
            <p className="text-sm text-red-500 mt-2">
              Blender is niet verbonden. Nieuwe modellen maken is niet mogelijk.
            </p>
          )}
        </div>
        
        {selectedModel && (
          <ViewerControls 
            settings={settings}
            onSettingsChange={handleSettingsChange}
            modelType={modelType}
          />
        )}
      </div>
      
      {/* Rechter paneel - 3D Viewer */}
      <div className="flex-1 min-h-[400px] bg-gray-100 rounded-lg overflow-hidden">
        {!selectedModel ? (
          // Toon een placeholder als geen model is geselecteerd
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center p-8">
              <svg 
                className="w-24 h-24 mx-auto text-gray-400 mb-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1} 
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900">Geen model geselecteerd</h3>
              <p className="mt-2 text-gray-500">
                Selecteer een model om het in 3D te bekijken of maak een nieuw model.
              </p>
            </div>
          </div>
        ) : loading ? (
          // Toon laad-indicator
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">Model wordt geladen...</p>
            </div>
          </div>
        ) : error ? (
          // Toon foutmelding
          <div className="w-full h-full flex items-center justify-center bg-red-50">
            <div className="text-center p-8">
              <svg 
                className="w-16 h-16 mx-auto text-red-500 mb-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
              <h3 className="text-lg font-medium text-red-800">Fout bij laden model</h3>
              <p className="mt-2 text-red-600">{error}</p>
            </div>
          </div>
        ) : (
          // Toon het model (3D of vector)
          <ViewerScene settings={settings}>
            {selectedModel.type === 'vector' && selectedModel.vectorData ? (
              // Render vector data
              <VectorObject 
                vectorData={typeof selectedModel.vectorData === 'string' ? 
                  parseSVGString(selectedModel.vectorData) : selectedModel.vectorData}
                extrudeDepth={settings.renderMode === '3d' ? settings.extrudeDepth : 0}
                position={[0, 0, 0]}
              />
            ) : (
              // Render 3D model
              <ModelObject 
                model={selectedModel} 
                wireframe={settings.wireframe}
              />
            )}
          </ViewerScene>
        )}
      </div>
    </div>
  );
};

export default ModelViewer; 