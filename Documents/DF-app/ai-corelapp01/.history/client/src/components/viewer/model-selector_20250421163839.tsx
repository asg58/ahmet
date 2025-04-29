import React from 'react';
import { ModelInfo } from '@/types/models';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModelId: string | null;
  onSelectModel: (model: ModelInfo) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModelId,
  onSelectModel,
}) => {
  if (models.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-center">
        <p className="text-gray-500">Geen modellen beschikbaar.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold">Beschikbare Modellen</h3>
        <p className="text-sm text-gray-500">Selecteer een model om te bekijken</p>
      </div>
      
      <div className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
        {models.map((model) => (
          <div
            key={model.id}
            className={`p-4 hover:bg-gray-50 cursor-pointer ${
              selectedModelId === model.id ? 'bg-blue-50' : ''
            }`}
            onClick={() => onSelectModel(model)}
          >
            <div className="flex items-center space-x-4">
              {model.thumbnail ? (
                <img
                  src={model.thumbnail}
                  alt={model.name}
                  className="w-16 h-16 object-cover rounded bg-gray-100"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-gray-400"
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
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{model.name}</p>
                {model.description && (
                  <p className="text-sm text-gray-500 truncate">{model.description}</p>
                )}
                <div className="flex items-center text-xs text-gray-500 mt-1">
                  <span className="capitalize">{model.platform}</span>
                  <span className="mx-1">•</span>
                  <span>{model.format.toUpperCase()}</span>
                  <span className="mx-1">•</span>
                  <span>{new Date(model.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {selectedModelId === model.id && (
                <div className="text-blue-500">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModelSelector; 