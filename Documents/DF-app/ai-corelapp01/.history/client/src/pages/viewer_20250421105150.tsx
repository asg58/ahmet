import React, { useState } from 'react'
import Head from 'next/head'
import Layout from '@/components/ui/layout'
import dynamic from 'next/dynamic'
import { sampleModels } from '@/types/models'

// Dynamically import the 3D viewer component with no SSR
// This is because it uses browser-only APIs like Three.js
const ModelViewer = dynamic(
  () => import('@/components/viewer/model-viewer'),
  { ssr: false }
)

const ViewerPage = () => {
  return (
    <>
      <Head>
        <title>CorelDRAW AI Assistant - 3D Viewer</title>
        <meta name="description" content="Bekijk en interacteer met 3D modellen gemaakt in Blender" />
      </Head>
      
      <Layout title="3D Model Viewer">
        <div className="container mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold mb-2">3D Model Viewer</h2>
              <p className="text-gray-600">
                Bekijk en interacteer met 3D modellen gemaakt in Blender via de CorelDRAW AI assistent.
              </p>
            </div>
            
            <div className="h-[calc(100vh-300px)] min-h-[500px]">
              <ModelViewer />
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Tips voor het bekijken van modellen</h3>
              <ul className="list-disc list-inside text-blue-700 space-y-1">
                <li>Klik en sleep om het model te draaien</li>
                <li>Scroll om in en uit te zoomen</li>
                <li>Rechtermuisknop + slepen om het model te verplaatsen</li>
                <li>Gebruik de instellingen om de weergave aan te passen</li>
              </ul>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default ViewerPage