import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Alert, Button, Modal, Form } from 'react-bootstrap';
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

function ModelBrowser({ createBlenderModel }) {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newModelData, setNewModelData] = useState({
    name: '',
    type: 'cube',
    color: '#ff0000',
    size: 2,
    description: '',
    tags: ''
  });
  const [createStatus, setCreateStatus] = useState(null);
  
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
  
  // Handler voor nieuw model formulier
  const handleNewModelChange = (e) => {
    const { name, value } = e.target;
    setNewModelData({
      ...newModelData,
      [name]: value
    });
  };
  
  // Maak nieuw model in Blender
  const handleCreateModel = async () => {
    setCreateStatus({ type: 'info', message: 'Model wordt gemaakt in Blender...' });
    
    // Verwerk kleur van hex naar RGB array [0-1]
    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return [r, g, b];
    };
    
    // Format tags van string naar array
    const tagsArray = newModelData.tags
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag !== '');
    
    // Bereid model data voor
    const modelData = {
      name: newModelData.name,
      type: newModelData.type,
      color: hexToRgb(newModelData.color),
      size: parseFloat(newModelData.size),
      saveAs: `${newModelData.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.blend`
    };
    
    try {
      // Roep de Blender service aan
      const result = await createBlenderModel(modelData);
      
      if (result.status === 'ok') {
        // Model succesvol gemaakt, voeg toe aan lijst
        const newModelId = models.length > 0 ? Math.max(...models.map(m => m.id)) + 1 : 1;
        const timestamp = new Date().toISOString();
        
        const newModel = {
          id: newModelId,
          name: newModelData.name,
          description: newModelData.description,
          thumbnail: `https://via.placeholder.com/150?text=${encodeURIComponent(newModelData.name)}`,
          modelUrl: 'SAMPLE_URL', // In een echte app: genereer en converteer naar glTF
          tags: tagsArray,
          createdAt: timestamp
        };
        
        setModels([...models, newModel]);
        setSelectedModel(newModel);
        setCreateStatus({ type: 'success', message: 'Model succesvol gemaakt in Blender!' });
        
        // Reset form en sluit modal na 2 seconden
        setTimeout(() => {
          setShowCreateModal(false);
          setCreateStatus(null);
          setNewModelData({
            name: '',
            type: 'cube',
            color: '#ff0000',
            size: 2,
            description: '',
            tags: ''
          });
        }, 2000);
      } else {
        setCreateStatus({ 
          type: 'danger', 
          message: `Fout bij het maken van model: ${result.details}` 
        });
      }
    } catch (err) {
      console.error('Fout bij maken model:', err);
      setCreateStatus({ 
        type: 'danger', 
        message: `Fout: ${err.message}` 
      });
    }
  };
  
  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>3D Model Browser</h1>
        <Button 
          variant="primary" 
          onClick={() => setShowCreateModal(true)}
        >
          Nieuw Model Maken
        </Button>
      </div>
      
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
      
      {/* Modal voor nieuw model maken */}
      <Modal 
        show={showCreateModal} 
        onHide={() => {
          if (!createStatus || createStatus.type !== 'info') {
            setShowCreateModal(false);
            setCreateStatus(null);
          }
        }}
        backdrop={createStatus?.type === 'info' ? 'static' : true}
        keyboard={createStatus?.type !== 'info'}
      >
        <Modal.Header closeButton={createStatus?.type !== 'info'}>
          <Modal.Title>Nieuw 3D Model Maken</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createStatus && (
            <Alert variant={createStatus.type} className="mb-3">
              {createStatus.message}
            </Alert>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Naam</Form.Label>
              <Form.Control 
                type="text" 
                name="name"
                value={newModelData.name}
                onChange={handleNewModelChange}
                disabled={createStatus?.type === 'info'}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Type</Form.Label>
              <Form.Select 
                name="type"
                value={newModelData.type}
                onChange={handleNewModelChange}
                disabled={createStatus?.type === 'info'}
              >
                <option value="cube">Kubus</option>
                <option value="sphere">Bol</option>
                <option value="cylinder">Cilinder</option>
                <option value="torus">Torus</option>
              </Form.Select>
            </Form.Group>
            
            <Row className="mb-3">
              <Col>
                <Form.Group>
                  <Form.Label>Kleur</Form.Label>
                  <Form.Control 
                    type="color" 
                    name="color"
                    value={newModelData.color}
                    onChange={handleNewModelChange}
                    disabled={createStatus?.type === 'info'}
                  />
                </Form.Group>
              </Col>
              <Col>
                <Form.Group>
                  <Form.Label>Grootte</Form.Label>
                  <Form.Control 
                    type="number" 
                    name="size"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={newModelData.size}
                    onChange={handleNewModelChange}
                    disabled={createStatus?.type === 'info'}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Beschrijving</Form.Label>
              <Form.Control 
                as="textarea" 
                rows={2}
                name="description"
                value={newModelData.description}
                onChange={handleNewModelChange}
                disabled={createStatus?.type === 'info'}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Tags (gescheiden door komma's)</Form.Label>
              <Form.Control 
                type="text" 
                name="tags"
                placeholder="bijv. geometrie, rood, klein"
                value={newModelData.tags}
                onChange={handleNewModelChange}
                disabled={createStatus?.type === 'info'}
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          {!createStatus || createStatus.type !== 'info' ? (
            <>
              <Button 
                variant="secondary" 
                onClick={() => setShowCreateModal(false)}
              >
                Annuleren
              </Button>
              <Button 
                variant="primary" 
                onClick={handleCreateModel}
                disabled={!newModelData.name.trim()}
              >
                Model Maken
              </Button>
            </>
          ) : (
            <div className="w-100 text-center">
              <div className="spinner-border text-primary me-2" role="status">
                <span className="visually-hidden">Laden...</span>
              </div>
              <span>Even geduld...</span>
            </div>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
}

export default ModelBrowser; 