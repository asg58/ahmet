import React, { useState } from 'react';
import { Card, ListGroup, Form, InputGroup, Button, Badge, Spinner } from 'react-bootstrap';
import { FaSearch, FaFilter, FaTags, FaCalendarAlt } from 'react-icons/fa';

function ModelsListPanel({ models, loading, onSelectModel, selectedModelId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  
  // Verzamel alle unieke tags uit modellen
  const allTags = [...new Set(models.flatMap(model => model.tags || []))];
  
  // Filter modellen op basis van zoekterm en geselecteerde tags
  const filteredModels = models.filter(model => {
    const matchesSearch = searchTerm === '' || 
      model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      model.description.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.every(tag => model.tags?.includes(tag));
      
    return matchesSearch && matchesTags;
  });
  
  // Toggle een tag selectie
  const toggleTag = (tag) => {
    setSelectedTags(prevTags => 
      prevTags.includes(tag)
        ? prevTags.filter(t => t !== tag)
        : [...prevTags, tag]
    );
  };
  
  // Reset alle filters
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
  };
  
  return (
    <Card className="h-100 shadow-sm">
      <Card.Header className="bg-primary text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Beschikbare Modellen</h5>
          <Button 
            variant="outline-light" 
            size="sm"
            onClick={() => setFilterVisible(!filterVisible)}
            aria-expanded={filterVisible}
          >
            <FaFilter /> Filter
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body className="p-0">
        {/* Zoekbalk */}
        <div className="p-3 border-bottom">
          <InputGroup>
            <InputGroup.Text>
              <FaSearch />
            </InputGroup.Text>
            <Form.Control
              placeholder="Zoek modellen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button variant="outline-secondary" onClick={() => setSearchTerm('')}>
                ×
              </Button>
            )}
          </InputGroup>
        </div>
        
        {/* Filters */}
        {filterVisible && (
          <div className="p-3 border-bottom bg-light">
            <div className="d-flex justify-content-between mb-2">
              <h6 className="mb-0"><FaTags className="me-1" /> Tags</h6>
              <Button 
                variant="link" 
                size="sm" 
                className="p-0 text-decoration-none"
                onClick={resetFilters}
              >
                Reset
              </Button>
            </div>
            <div className="d-flex flex-wrap gap-1 mb-2">
              {allTags.map(tag => (
                <Badge 
                  key={tag}
                  bg={selectedTags.includes(tag) ? "primary" : "secondary"}
                  className="px-2 py-1 cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
              {allTags.length === 0 && <small className="text-muted">Geen tags beschikbaar</small>}
            </div>
          </div>
        )}
        
        {/* Model lijst */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2 text-muted">Modellen laden...</p>
          </div>
        ) : filteredModels.length > 0 ? (
          <ListGroup variant="flush">
            {filteredModels.map(model => (
              <ListGroup.Item 
                key={model.id}
                action
                active={model.id === selectedModelId}
                onClick={() => onSelectModel(model.id)}
                className="py-3"
              >
                <div className="d-flex">
                  <div className="flex-shrink-0">
                    <img 
                      src={model.thumbnail} 
                      alt={model.name} 
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                      className="rounded"
                    />
                  </div>
                  <div className="ms-3 flex-grow-1">
                    <h6 className="mb-1">{model.name}</h6>
                    <p className="text-muted small mb-1">{model.description}</p>
                    
                    <div className="d-flex align-items-center">
                      <small className="text-muted me-2">
                        <FaCalendarAlt className="me-1" size={12} />
                        {new Date(model.createdAt).toLocaleDateString()}
                      </small>
                      
                      <div className="d-flex flex-wrap gap-1">
                        {model.tags?.map(tag => (
                          <Badge key={tag} bg="light" text="dark" className="small px-2">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <div className="text-center py-5">
            <p className="text-muted">Geen modellen gevonden</p>
            {(searchTerm || selectedTags.length > 0) && (
              <Button variant="link" onClick={resetFilters}>
                Reset filters
              </Button>
            )}
          </div>
        )}
      </Card.Body>
      
      <Card.Footer className="bg-white">
        <small className="text-muted">
          {filteredModels.length} van {models.length} modellen weergegeven
        </small>
      </Card.Footer>
    </Card>
  );
}

export default ModelsListPanel; 