import React from 'react'
import Head from 'next/head'
import Layout from '@/components/ui/layout'
import dynamic from 'next/dynamic'

// Dynamically import the context viewer component with no SSR
// This is because it uses browser-only APIs like sockets
const ContextViewerComponent = dynamic(
  () => import('@/components/context-viewer/context-viewer-container'),
  { ssr: false }
)

const ContextViewerPage = () => {
  return (
    <>
      <Head>
        <title>CorelDRAW AI Assistant - Context Viewer</title>
        <meta name="description" content="Bekijk de huidige design context van CorelDRAW en Blender" />
      </Head>
      
      <Layout title="Design Context Viewer">
        <div className="container mx-auto p-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-h-[calc(100vh-200px)]">
            <ContextViewerComponent />
          </div>
        </div>
      </Layout>
    </>
  )
}

export default ContextViewerPage 