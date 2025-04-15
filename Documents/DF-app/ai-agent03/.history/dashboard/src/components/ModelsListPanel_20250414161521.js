import React from 'react';
import { Card, Badge, Button, Spinner } from 'react-bootstrap';
import { FaCube, FaSearch } from 'react-icons/fa';

function ModelsListPanel({ models, loading, onSelectModel, selectedModelId }) {
  if (loading) {
    return (
      <div className="models-loading text-center py-4">
        <Spinner animation="border" role="status" variant="primary" />
        <p className="mt-2">Modellen laden...</p>
      </div>
    );
  }

  if (!models || models.length === 0) {
    return (
      <div className="no-models text-center py-4">
        <FaCube size={30} className="text-muted mb-3" />
        <p>Geen modellen gevonden. Vraag de AI om een 3D model te maken.</p>
      </div>
    );
  }

  return (
    <div className="models-list">
      <div className="models-header d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Beschikbare Modellen</h5>
        <div className="models-search">
          <div className="input-group input-group-sm">
            <input 
              type="text" 
              className="form-control" 
              placeholder="Zoek modellen..." 
              aria-label="Zoek modellen" 
            />
            <button className="btn btn-outline-secondary" type="button">
              <FaSearch />
            </button>
          </div>
        </div>
      </div>

      <div className="models-grid">
        {models.map((model) => (
          <Card 
            key={model.id} 
            className={`model-card mb-3 ${selectedModelId === model.id ? 'selected' : ''}`}
          >
            <div className="model-thumbnail">
              {model.thumbnail ? (
                <img 
                  src={model.thumbnail} 
                  alt={model.name || 'Model thumbnail'} 
                  className="img-fluid" 
                />
              ) : (
                <div className="placeholder-thumbnail d-flex justify-content-center align-items-center">
                  <FaCube size={40} className="text-muted" />
                </div>
              )}
            </div>
            
            <Card.Body>
              <Card.Title className="text-truncate">{model.name || 'Onbenoemd model'}</Card.Title>
              
              <div className="model-metadata mb-2">
                <small className="text-muted text-truncate d-block">
                  {model.description || 'Geen beschrijving'}
                </small>
                
                <div className="model-tags mt-1">
                  {model.tags && model.tags.length > 0 ? (
                    model.tags.map((tag, idx) => (
                      <Badge bg="secondary" className="me-1 mb-1" key={idx}>
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <Badge bg="light" text="dark">Geen tags</Badge>
                  )}
                </div>
              </div>
              
              <Button 
                variant={selectedModelId === model.id ? "primary" : "outline-primary"} 
                size="sm" 
                className="w-100"
                onClick={() => onSelectModel(model)}
              >
                {selectedModelId === model.id ? 'Geselecteerd' : 'Bekijk Model'}
              </Button>
            </Card.Body>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ModelsListPanel; 