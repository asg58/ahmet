import React from 'react';
import { ModelViewerSettings } from '@/types/models';

interface ViewerControlsProps {
  settings: ModelViewerSettings;
  onSettingsChange: (settings: Partial<ModelViewerSettings>) => void;
}

export const ViewerControls: React.FC<ViewerControlsProps> = ({
  settings,
  onSettingsChange,
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
          onClick={() => onSettingsChange({
            backgroundColor: '#f5f5f5',
            wireframe: false,
            autoRotate: false,
            showGrid: true,
            showAxes: true,
            cameraPosition: [0, 0, 5],
          })}
          className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
        >
          Reset Alles
        </button>
      </div>
    </div>
  );
};

export default ViewerControls; 