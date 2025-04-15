import React from 'react';
import { Navbar, Nav, Container, Badge } from 'react-bootstrap';
import { FaCube, FaRobot, FaCircle } from 'react-icons/fa';

function Header({ connected, activeTab, onTabChange }) {
  return (
    <Navbar bg="dark" variant="dark" expand="lg" className="mb-3">
      <Container fluid>
        <Navbar.Brand href="#">
          <FaCube className="me-2" />
          Blender AI Dashboard
        </Navbar.Brand>
        
        <Nav className="me-auto">
          <Nav.Link 
            active={activeTab === 'browser'} 
            onClick={() => onTabChange('browser')}
          >
            <FaCube className="me-1" /> Modellen Browser
          </Nav.Link>
          <Nav.Link 
            active={activeTab === 'chat'} 
            onClick={() => onTabChange('chat')}
          >
            <FaRobot className="me-1" /> AI Assistent
          </Nav.Link>
        </Nav>
        
        <Navbar.Text>
          <FaCircle 
            className={`me-2 ${connected ? 'text-success' : 'text-danger'}`} 
            size={10} 
          />
          {connected ? (
            <span>Verbonden met Blender server</span>
          ) : (
            <span>Niet verbonden</span>
          )}
        </Navbar.Text>
      </Container>
    </Navbar>
  );
}

export default Header; 