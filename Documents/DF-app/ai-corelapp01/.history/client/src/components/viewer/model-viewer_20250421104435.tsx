import React, { useState } from 'react';

interface ModelViewerProps {
  modelUrl?: string;
}

const ModelViewer: React.FC<ModelViewerProps> = ({ modelUrl }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // In a real implementation, this component would use Three.js or another 
  // 3D rendering library to display the model

  return (
    <div className="w-full h-full min-h-[400px] flex flex-col">
      {!modelUrl ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
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
            <h3 className="text-lg font-medium text-gray-900">Geen model geladen</h3>
            <p className="mt-2 text-gray-500">
              Selecteer een model om het in 3D te bekijken of maak een nieuw model met de AI assistent.
            </p>
          </div>
        </div>
      ) : loading ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Model wordt geladen...</p>
          </div>
        </div>
      ) : error ? (
        <div className="w-full h-full flex items-center justify-center bg-red-50 rounded-lg">
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
        <div className="w-full h-full bg-gray-800 rounded-lg overflow-hidden relative">
          {/* In a real implementation, this would be a Three.js canvas or similar */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-white bg-black bg-opacity-50 p-4 rounded">
              3D Viewer Placeholder
            </p>
          </div>
          <div className="absolute bottom-4 right-4 bg-white bg-opacity-80 rounded-lg p-2 shadow-lg">
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-200 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button className="p-2 hover:bg-gray-200 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              </button>
              <button className="p-2 hover:bg-gray-200 rounded">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelViewer; 