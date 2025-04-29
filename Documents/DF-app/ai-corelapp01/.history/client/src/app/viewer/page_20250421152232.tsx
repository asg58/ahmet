'use client';

import React from 'react';
import ModelViewer from '@/components/viewer/model-viewer';

export default function ViewerPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-blue-600">3D Viewer</h1>
        <p className="mt-2 text-gray-600">
          Bekijk en interacteer met 3D modellen uit Blender en vector data uit CorelDRAW
        </p>
      </header>

      <div className="bg-white rounded-lg shadow-md p-6 min-h-[600px]">
        <ModelViewer />
      </div>

      <footer className="mt-8 pt-4 border-t border-gray-200 text-center text-gray-500 text-sm">
        <p>
          De 3D Viewer maakt gebruik van React Three Fiber voor het renderen van 3D modellen en vector data.
        </p>
      </footer>
    </div>
  );
} 