import React from 'react'
import Head from 'next/head'
import Layout from '@/components/ui/layout'
import dynamic from 'next/dynamic'

// Dynamically import the 3D viewer component with no SSR
// This is because it uses browser-only APIs
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
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-h-[calc(100vh-200px)]">
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold mb-4">3D Model Viewer</h2>
              <p className="text-gray-600 mb-8">
                Deze pagina toont 3D modellen gemaakt in Blender via de CorelDRAW AI assistent.
              </p>
              <div className="bg-gray-100 rounded-lg p-8 max-w-4xl mx-auto">
                <p className="text-gray-500 mb-4">Geen modellen beschikbaar om weer te geven.</p>
                <p className="text-sm text-gray-400">
                  Gebruik de AI assistent om 3D modellen te maken in Blender.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default ViewerPage