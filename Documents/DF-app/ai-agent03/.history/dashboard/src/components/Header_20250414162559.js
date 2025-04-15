import React from 'react';
import { Navbar, Nav, Container, Badge, Button } from 'react-bootstrap';
import { FaCube, FaRobot, FaCircle, FaCubes, FaCheck } from 'react-icons/fa';
import blenderService from '../services/BlenderWebSocketService';

function Header({ connected, blenderConnected, activeTab, onTabChange }) {
  // Test functie voor Blender verbinding
  const testBlenderConnection = async () => {
    try {
      // Eenvoudig test script dat een kubus maakt
      const testScript = `
import bpy

# Clear existing objects (optional)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Create a test cube
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
cube = bpy.context.active_object
cube.name = 'TestCube'

# Add a material
material = bpy.data.materials.new(name="TestMaterial")
material.diffuse_color = (0, 1, 0, 1)  # Groen
cube.data.materials.append(material)

print("Test cube created successfully!")
`;
      
      const result = await blenderService.sendBlenderScript(testScript);
      
      if (result.status === 'ok') {
        alert("Test succesvol! Groene test kubus gemaakt in Blender.");
      } else {
        alert(`Test mislukt: ${result.details}`);
      }
    } catch (error) {
      alert(`Kon geen verbinding maken met Blender: ${error.message}`);
    }
  };

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
        
        <Button 
          variant={blenderConnected ? "outline-success" : "outline-danger"}
          size="sm"
          className="me-3 d-flex align-items-center"
          onClick={testBlenderConnection}
        >
          <FaCheck className="me-2" /> Test Blender
        </Button>
        
        <Navbar.Text className="d-flex align-items-center me-3">
          <FaCircle 
            className={`me-2 ${connected ? 'text-success' : 'text-danger'}`} 
            size={10} 
          />
          <span className="d-none d-md-inline">API:</span> {connected ? 'Verbonden' : 'Niet verbonden'}
        </Navbar.Text>
        
        <Navbar.Text className="d-flex align-items-center">
          <FaCubes 
            className={`me-2 ${blenderConnected ? 'text-success' : 'text-danger'}`} 
            size={10} 
          />
          <span className="d-none d-md-inline">Blender:</span> {blenderConnected ? 'Verbonden' : 'Niet verbonden'}
        </Navbar.Text>
      </Container>
    </Navbar>
  );
}

export default Header; 