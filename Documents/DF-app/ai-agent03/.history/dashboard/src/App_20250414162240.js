import React, { useState, useEffect } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import io from 'socket.io-client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import Header from './components/Header';
import ChatInterface from './components/ChatInterface';
import ModelBrowser from './pages/ModelBrowser';

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('browser'); // 'browser' of 'chat'

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
    
    newSocket.on('chat_response', (data) => {
      setChatHistory(prev => [...prev, data]);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);
  
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

  return (
    <div className="app-container">
      <Header 
        connected={connected} 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      
      <Container fluid className="dashboard-container">
        {activeTab === 'browser' ? (
          <ModelBrowser />
        ) : (
          <Row className="h-100">
            <Col md={8} className="h-100 d-flex flex-column">
              <div className="viewer-container flex-grow-1 mb-3 bg-white rounded shadow-sm">
                <div className="p-5 d-flex flex-column justify-content-center align-items-center h-100 text-center">
                  <h3>AI Blender Assistant</h3>
                  <p className="text-muted">
                    Stel een vraag aan de AI assistent om Blender modellen te maken of aan te passen.
                  </p>
                </div>
              </div>
            </Col>
            
            <Col md={4} className="h-100">
              <div className="chat-container h-100 bg-white rounded shadow-sm">
                <ChatInterface 
                  chatHistory={chatHistory}
                  onSendMessage={sendMessage}
                  connected={connected}
                />
              </div>
            </Col>
          </Row>
        )}
      </Container>
    </div>
  );
}

export default App; 