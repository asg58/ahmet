import React from 'react';
import { ModelViewerSettings } from '@/types/models';

interface ViewerControlsProps {
  settings: ModelViewerSettings;
  onSettingsChange: (settings: Partial<ModelViewerSettings>) => void;
  modelType?: 'model' | 'vector';
}

export const ViewerControls: React.FC<ViewerControlsProps> = ({
  settings,
  onSettingsChange,
  modelType = 'model'
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Weergave instellingen</h3>
      
      <div className="space-y-4">
        {/* AutoRotate toggle */}
        <div className="flex items-center justify-between">
          <label htmlFor="autoRotate" className="text-sm font-medium text-gray-700">
            Automatisch draaien
          </label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              id="autoRotate"
              checked={settings.autoRotate}
              onChange={(e) => onSettingsChange({ autoRotate: e.target.checked })}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label
              htmlFor="autoRotate"
              className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                settings.autoRotate ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            ></label>
          </div>
        </div>
        
        {/* Wireframe toggle */}
        <div className="flex items-center justify-between">
          <label htmlFor="wireframe" className="text-sm font-medium text-gray-700">
            Wireframe
          </label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              id="wireframe"
              checked={settings.wireframe}
              onChange={(e) => onSettingsChange({ wireframe: e.target.checked })}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label
              htmlFor="wireframe"
              className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                settings.wireframe ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            ></label>
          </div>
        </div>
        
        {/* Grid toggle */}
        <div className="flex items-center justify-between">
          <label htmlFor="showGrid" className="text-sm font-medium text-gray-700">
            Toon raster
          </label>
          <div className="relative inline-block w-10 mr-2 align-middle select-none">
            <input
              type="checkbox"
              id="showGrid"
              checked={settings.showGrid}
              onChange={(e) => onSettingsChange({ showGrid: e.target.checked })}
              className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
            />
            <label
              htmlFor="showGrid"
              className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                settings.showGrid ? 'bg-blue-500' : 'bg-gray-300'
              }`}
            ></label>
          </div>
        </div>
        
        {/* Vector-specifieke instellingen */}
        {modelType === 'vector' && (
          <>
            {/* Render mode selectie */}
            <div>
              <label htmlFor="renderMode" className="block text-sm font-medium text-gray-700 mb-1">
                Render modus
              </label>
              <select
                id="renderMode"
                value={settings.renderMode || '3d'}
                onChange={(e) => onSettingsChange({ renderMode: e.target.value as '3d' | 'flat' })}
                className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-md"
              >
                <option value="flat">2D (Plat)</option>
                <option value="3d">3D (Geëxtrudeerd)</option>
              </select>
            </div>
            
            {/* Extrude depth slider (alleen voor 3D modus) */}
            {settings.renderMode === '3d' && (
              <div>
                <label htmlFor="extrudeDepth" className="block text-sm font-medium text-gray-700 mb-1">
                  Extrusiediepte: {settings.extrudeDepth?.toFixed(2)}
                </label>
                <input
                  type="range"
                  id="extrudeDepth"
                  min="0.01"
                  max="2"
                  step="0.01"
                  value={settings.extrudeDepth || 0.2}
                  onChange={(e) => onSettingsChange({ extrudeDepth: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
            
            {/* Show vector points toggle */}
            <div className="flex items-center justify-between">
              <label htmlFor="showVectorPoints" className="text-sm font-medium text-gray-700">
                Toon vectorpunten
              </label>
              <div className="relative inline-block w-10 mr-2 align-middle select-none">
                <input
                  type="checkbox"
                  id="showVectorPoints"
                  checked={settings.showVectorPoints}
                  onChange={(e) => onSettingsChange({ showVectorPoints: e.target.checked })}
                  className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
                />
                <label
                  htmlFor="showVectorPoints"
                  className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${
                    settings.showVectorPoints ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                ></label>
              </div>
            </div>
          </>
        )}
        
        {/* Achtergrondkleur */}
        <div>
          <label htmlFor="backgroundColor" className="block text-sm font-medium text-gray-700 mb-1">
            Achtergrondkleur
          </label>
          <div className="flex">
            <input
              type="color"
              id="backgroundColor"
              value={settings.backgroundColor}
              onChange={(e) => onSettingsChange({ backgroundColor: e.target.value })}
              className="h-8 w-8 rounded mr-2"
            />
            <input
              type="text"
              value={settings.backgroundColor}
              onChange={(e) => onSettingsChange({ backgroundColor: e.target.value })}
              className="block w-full px-3 py-1 text-sm border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>
      
      {/* Actie knoppen */}
      <div className="mt-6 flex space-x-2">
        <button
          onClick={() => onSettingsChange({
            cameraPosition: [0, 0, 5],
          })}
          className="px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
        >
          Reset Camera
        </button>
        
        <button
          onClick={() => {
            const defaultSettings = {
              backgroundColor: '#f5f5f5',
              wireframe: false,
              autoRotate: false,
              showGrid: true,
              showAxes: true,
              cameraPosition: [0, 0, 5],
            };
            
            // Voeg vector-specifieke instellingen toe indien nodig
            if (modelType === 'vector') {
              Object.assign(defaultSettings, {
                extrudeDepth: 0.2,
                renderMode: '3d',
                showVectorPoints: false,
              });
            }
            
            onSettingsChange(defaultSettings);
          }}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
        >
          Reset Alles
        </button>
      </div>
    </div>
  );
};

export default ViewerControls; 