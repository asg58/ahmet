import React, { useState, useEffect } from 'react';
import ViewerScene from './scene/viewer-scene';
import ModelObject from './scene/model-object';
import ViewerControls from './controls/viewer-controls';
import ModelSelector from './model-selector';
import { ModelInfo, ModelViewerSettings, defaultViewerSettings, sampleModels } from '@/types/models';

interface ModelViewerProps {
  initialModelUrl?: string;
}

const ModelViewer: React.FC<ModelViewerProps> = ({ initialModelUrl }) => {
  // State voor het momenteel geselecteerde model
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  
  // State voor de modellen lijst (in een echte applicatie zou dit van een API komen)
  const [models, setModels] = useState<ModelInfo[]>(sampleModels);
  
  // State voor viewer instellingen
  const [settings, setSettings] = useState<ModelViewerSettings>(defaultViewerSettings);
  
  // State voor laad- en foutstatus
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    
    // Simuleer laden van het model (in een echte app zou dit netwerk-activiteit zijn)
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-4">
      {/* Linker paneel - Modelkiezer */}
      <div className="w-full md:w-64 md:min-w-64 flex-shrink-0 space-y-4">
        <ModelSelector 
          models={models}
          selectedModelId={selectedModel?.id || null}
          onSelectModel={handleSelectModel}
        />
        
        {selectedModel && (
          <ViewerControls 
            settings={settings}
            onSettingsChange={handleSettingsChange}
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
                Selecteer een model om het in 3D te bekijken.
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
          // Toon het 3D model
          <ViewerScene settings={settings}>
            <ModelObject 
              model={selectedModel} 
              wireframe={settings.wireframe}
            />
          </ViewerScene>
        )}
      </div>
    </div>
  );
};

export default ModelViewer; 