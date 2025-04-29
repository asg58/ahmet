import React, { useState } from 'react'
import Head from 'next/head'
import Layout from '@/components/ui/layout'

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    apiUrl: 'http://localhost:4000',
    useCorsProxy: false,
    activeModel: 'llama3',
    contextHistory: 10,
    maxTokens: 4096,
    temperature: 0.7,
    defaultPlatform: 'coreldraw',
    debugMode: false
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked
        : type === 'number' 
          ? parseFloat(value) 
          : value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    
    // Simulate saving settings
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage({
        type: 'success',
        text: 'Instellingen opgeslagen'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    }, 1000);
  };

  return (
    <>
      <Head>
        <title>CorelDRAW AI Assistant - Instellingen</title>
        <meta name="description" content="Configureer de instellingen van de CorelDRAW AI Assistant" />
      </Head>
      
      <Layout title="Instellingen">
        <div className="container mx-auto max-w-4xl p-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            <h2 className="text-2xl font-semibold mb-6">Applicatie Instellingen</h2>
            
            {saveMessage && (
              <div className={`mb-6 p-4 rounded-md ${
                saveMessage.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {saveMessage.text}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900">Server Instellingen</h3>
                  
                  <div className="mb-4">
                    <label htmlFor="apiUrl" className="block text-sm font-medium text-gray-700 mb-1">API URL</label>
                    <input
                      type="text"
                      id="apiUrl"
                      name="apiUrl"
                      value={settings.apiUrl}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="useCorsProxy"
                        checked={settings.useCorsProxy}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Gebruik CORS proxy</span>
                    </label>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900">AI Model Instellingen</h3>
                  
                  <div className="mb-4">
                    <label htmlFor="activeModel" className="block text-sm font-medium text-gray-700 mb-1">Actief Model</label>
                    <select
                      id="activeModel"
                      name="activeModel"
                      value={settings.activeModel}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="llama3">Llama 3 (8B)</option>
                      <option value="llama3-70b">Llama 3 (70B)</option>
                      <option value="mistral">Mistral 7B</option>
                      <option value="codellama">CodeLlama 13B</option>
                    </select>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="maxTokens" className="block text-sm font-medium text-gray-700 mb-1">
                      Max Tokens: {settings.maxTokens}
                    </label>
                    <input
                      type="range"
                      id="maxTokens"
                      name="maxTokens"
                      min="1024"
                      max="8192"
                      step="512"
                      value={settings.maxTokens}
                      onChange={handleChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-1">
                      Temperature: {settings.temperature.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      id="temperature"
                      name="temperature"
                      min="0"
                      max="1"
                      step="0.1"
                      value={settings.temperature}
                      onChange={handleChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900">Context Instellingen</h3>
                  
                  <div className="mb-4">
                    <label htmlFor="contextHistory" className="block text-sm font-medium text-gray-700 mb-1">
                      Aantal berichten in context: {settings.contextHistory}
                    </label>
                    <input
                      type="range"
                      id="contextHistory"
                      name="contextHistory"
                      min="5"
                      max="20"
                      value={settings.contextHistory}
                      onChange={handleChange}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="defaultPlatform" className="block text-sm font-medium text-gray-700 mb-1">Standaard Platform</label>
                    <select
                      id="defaultPlatform"
                      name="defaultPlatform"
                      value={settings.defaultPlatform}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="coreldraw">CorelDRAW</option>
                      <option value="blender">Blender</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-4 text-gray-900">Overige Instellingen</h3>
                  
                  <div className="mb-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="debugMode"
                        checked={settings.debugMode}
                        onChange={handleChange}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Debug modus</span>
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className={`px-4 py-2 rounded-md text-white font-medium ${
                    isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {isSaving ? 'Opslaan...' : 'Instellingen Opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Layout>
    </>
  )
}

export default SettingsPage 