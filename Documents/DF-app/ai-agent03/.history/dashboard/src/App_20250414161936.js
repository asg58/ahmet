import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import io from 'socket.io-client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import ModelViewer from './components/ModelViewer';
import ChatInterface from './components/ChatInterface';
import Header from './components/Header';
import ModelsList from './components/ModelsList';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentModel, setCurrentModel] = useState(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verbinding maken met Socket.IO server
  useEffect(() => {
    // Indien in ontwikkelomgeving, gebruik de proxy in package.json
    const newSocket = io();
    
    newSocket.on('connect', () => {
      console.log('Verbonden met Socket.IO server');
      setConnected(true);
    });
    
    newSocket.on('disconnect', () => {
      console.log('Verbinding met Socket.IO server verbroken');
      setConnected(false);
    });
    
    newSocket.on('model_update', (data) => {
      console.log('Model update ontvangen:', data);
      setCurrentModel(data.model_url);
    });
    
    newSocket.on('render_progress', (data) => {
      setRenderProgress(data.progress);
    });
    
    newSocket.on('chat_response', (data) => {
      setChatHistory(prev => [...prev, data]);
    });
    
    setSocket(newSocket);
    
    // Fetch beschikbare modellen
    fetchModels();
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
  // Functie om modellen op te halen
  const fetchModels = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      setModels(data);
    } catch (error) {
      console.error('Fout bij ophalen modellen:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Functie om een bericht te versturen
  const sendMessage = (message) => {
    if (socket && connected) {
      // Voeg bericht toe aan chat geschiedenis
      setChatHistory(prev => [...prev, {
        role: 'user',
        content: message
      }]);
      
      // Stuur bericht naar server
      socket.emit('chat_message', { message });
    }
  };
  
  // Functie om een model te selecteren
  const selectModel = (model) => {
    setCurrentModel(`/static/models/${model.metadata.filename.replace('.blend', '.glb')}`);
  };

  return (
    <div className="app-container">
      <Header connected={connected} />
      
      <Container fluid className="dashboard-container">
        <Row className="main-content">
          {/* 3D Viewer Paneel - 2/3 van de breedte */}
          <Col md={8} className="viewer-panel">
            <div className="viewer-container">
              <ModelViewer modelUrl={currentModel} />
              
              {renderProgress > 0 && (
                <div className="render-progress">
                  <p>Rendering: {renderProgress}%</p>
                  <div className="progress">
                    <div 
                      className="progress-bar" 
                      role="progressbar" 
                      style={{ width: `${renderProgress}%` }}
                      aria-valuenow={renderProgress} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </Col>
          
          {/* Chat Paneel - 1/3 van de breedte */}
          <Col md={4} className="chat-panel">
            <ChatInterface 
              chatHistory={chatHistory}
              onSendMessage={sendMessage}
              connected={connected}
            />
          </Col>
        </Row>
        
        {/* Modellen Lijst - Onderaan */}
        <Row className="models-section">
          <Col>
            <ModelsList 
              models={models} 
              loading={loading} 
              onSelectModel={selectModel}
              onRefresh={fetchModels}
            />
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App; 