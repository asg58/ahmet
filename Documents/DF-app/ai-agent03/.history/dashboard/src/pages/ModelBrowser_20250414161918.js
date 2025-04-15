import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert } from 'react-bootstrap';
import ModelsListPanel from '../components/ModelsListPanel';
import ModelViewerPanel from '../components/ModelViewerPanel';

// Mock data voor modellen (vervang dit later door API calls)
const MOCK_MODELS = [
  {
    id: 1,
    name: 'Kubus',
    description: 'Een eenvoudige kubus model',
    thumbnail: 'https://via.placeholder.com/150?text=Kubus',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF/Box.gltf',
    tags: ['basis', 'geometrie'],
    createdAt: '2023-09-15'
  },
  {
    id: 2,
    name: 'Drone',
    description: 'Een gedetailleerd drone model',
    thumbnail: 'https://via.placeholder.com/150?text=Drone',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DragonAttenuation/glTF/DragonAttenuation.gltf',
    tags: ['voertuig', 'technologie'],
    createdAt: '2023-10-20'
  },
  {
    id: 3,
    name: 'Plant',
    description: 'Een realistisch plant model',
    thumbnail: 'https://via.placeholder.com/150?text=Plant',
    modelUrl: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/AntiqueCamera/glTF/AntiqueCamera.gltf',
    tags: ['natuur', 'decoratie'],
    createdAt: '2023-11-05'
  }
];

function ModelBrowser() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  
  // Simuleer het laden van modellen van een API
  useEffect(() => {
    const fetchModels = async () => {
      setLoading(true);
      
      try {
        // Simuleer API vertraging
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Gebruik mock data
        setModels(MOCK_MODELS);
        setLoading(false);
      } catch (err) {
        console.error('Fout bij het laden van modellen:', err);
        setError('Er is een fout opgetreden bij het laden van de modellen. Probeer het later opnieuw.');
        setLoading(false);
      }
    };
    
    fetchModels();
  }, []);
  
  // Handler voor model selectie
  const handleSelectModel = (modelId) => {
    const model = models.find(m => m.id === modelId);
    setSelectedModel(model);
    console.log(`Model geselecteerd: ${model.name}`);
  };
  
  // Handler voor model download
  const handleDownloadModel = (modelId) => {
    const model = models.find(m => m.id === modelId);
    // In een echte applicatie: implementeer download logica
    console.log(`Downloading model: ${model.name}`);
    alert(`Download gestart voor ${model.name}`);
  };
  
  // Handler voor model bewerking
  const handleEditModel = (modelId) => {
    const model = models.find(m => m.id === modelId);
    // In een echte applicatie: stuur naar Blender voor bewerking
    console.log(`Editing model in Blender: ${model.name}`);
    alert(`${model.name} wordt geopend in Blender voor bewerking`);
  };
  
  return (
    <Container fluid className="p-4">
      <h1 className="mb-4">3D Model Browser</h1>
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Row className="g-4">
        <Col md={4}>
          <ModelsListPanel
            models={models}
            loading={loading}
            onSelectModel={handleSelectModel}
            selectedModelId={selectedModel?.id}
          />
        </Col>
        
        <Col md={8}>
          <ModelViewerPanel
            model={selectedModel}
            onDownload={handleDownloadModel}
            onEdit={handleEditModel}
          />
        </Col>
      </Row>
    </Container>
  );
}

export default ModelBrowser; 