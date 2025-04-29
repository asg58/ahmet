/**
 * Design Commands Intent Recognition Tests
 * 
 * This module tests recognition of natural language design commands.
 */

import { api, utils, WebSocketTestClient } from '../setup';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Design Commands Intent Recognition', () => {
  let wsClient: WebSocketTestClient;
  
  beforeAll(async () => {
    // Initialize WebSocket client
    wsClient = new WebSocketTestClient();
    await wsClient.connect();
    
    // Check if CorelDRAW and Blender are available
    try {
      await api.get(`${api.config.apiEndpoints.software.coreldraw}/status`);
      console.log('CorelDRAW is available');
    } catch (error) {
      console.warn('CorelDRAW might not be available');
    }
    
    try {
      await api.get(`${api.config.apiEndpoints.software.blender}/status`);
      console.log('Blender is available');
    } catch (error) {
      console.warn('Blender might not be available');
    }
  });

  afterAll(async () => {
    // Disconnect WebSocket
    wsClient.disconnect();
    
    // Clean up after tests
    try {
      const corelCleanupCode = `
        Sub CleanupTest()
          Dim s As Shape
          For Each s In ActiveDocument.ActivePage.Shapes
            If InStr(s.Name, "Test") > 0 Then
              s.Delete
            End If
          Next s
        End Sub
        
        CleanupTest
      `;
      await api.executeCorelDrawCode(corelCleanupCode);
      
      const blenderCleanupCode = `
        import bpy
        
        # Select all objects
        bpy.ops.object.select_all(action='SELECT')
        
        # Delete all selected objects
        bpy.ops.object.delete()
      `;
      await api.executeBlenderCode(blenderCleanupCode);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  it('should detect intent to create a rectangle in CorelDRAW', async () => {
    const message = 'Create a red rectangle in CorelDRAW';
    const result = await api.detectIntent(message);
    
    expect(result).toBeDefined();
    expect(result.intent).toBeDefined();
    expect(result.intent.action).toBe('create');
    expect(result.intent.object).toBe('rectangle');
    expect(result.intent.software).toBe('coreldraw');
    expect(result.intent.properties).toBeDefined();
    expect(result.intent.properties.color).toBe('red');
  });

  it('should detect intent to create a cube in Blender', async () => {
    const message = 'Add a blue cube to the scene in Blender';
    const result = await api.detectIntent(message);
    
    expect(result).toBeDefined();
    expect(result.intent).toBeDefined();
    expect(result.intent.action).toBe('create');
    expect(result.intent.object).toBe('cube');
    expect(result.intent.software).toBe('blender');
    expect(result.intent.properties).toBeDefined();
    expect(result.intent.properties.color).toBe('blue');
  });
  
  it('should handle ambiguous commands by detecting context', async () => {
    // First set up context by mentioning Blender
    const contextMessage = 'I want to work with Blender for this project';
    await api.detectIntent(contextMessage);
    
    // Now send an ambiguous command
    const ambiguousMessage = 'Create a sphere with radius 2';
    const result = await api.detectIntent(ambiguousMessage, [
      { role: 'user', content: contextMessage }
    ]);
    
    expect(result).toBeDefined();
    expect(result.intent).toBeDefined();
    expect(result.intent.action).toBe('create');
    expect(result.intent.object).toBe('sphere');
    expect(result.intent.software).toBe('blender');
    expect(result.intent.properties).toBeDefined();
    expect(result.intent.properties.radius).toBe(2);
  });
  
  it('should detect transformation commands', async () => {
    const message = 'Move the selected object 5 units to the right';
    const result = await api.detectIntent(message);
    
    expect(result).toBeDefined();
    expect(result.intent).toBeDefined();
    expect(result.intent.action).toBe('transform');
    expect(result.intent.subAction).toBe('move');
    expect(result.intent.properties).toBeDefined();
    expect(result.intent.properties.direction).toBe('right');
    expect(result.intent.properties.distance).toBe(5);
  });
  
  it('should detect style commands', async () => {
    const message = 'Change the color of the circle to green';
    const result = await api.detectIntent(message);
    
    expect(result).toBeDefined();
    expect(result.intent).toBeDefined();
    expect(result.intent.action).toBe('modify');
    expect(result.intent.property).toBe('color');
    expect(result.intent.target).toBe('circle');
    expect(result.intent.properties).toBeDefined();
    expect(result.intent.properties.color).toBe('green');
  });
  
  it('should convert natural language to executable code', async () => {
    // For CorelDRAW
    const corelMessage = 'Draw a blue rectangle with black outline';
    const corelResult = await api.detectIntent(corelMessage);
    
    expect(corelResult).toBeDefined();
    expect(corelResult.generatedCode).toBeDefined();
    expect(corelResult.generatedCode.coreldraw).toContain('CreateRectangle');
    expect(corelResult.generatedCode.coreldraw).toContain('ApplyUniformFill');
    expect(corelResult.generatedCode.coreldraw).toContain('SetProperties');
    
    // For Blender
    const blenderMessage = 'Create a red cube at position (1,2,3)';
    const blenderResult = await api.detectIntent(blenderMessage);
    
    expect(blenderResult).toBeDefined();
    expect(blenderResult.generatedCode).toBeDefined();
    expect(blenderResult.generatedCode.blender).toContain('primitive_cube_add');
    expect(blenderResult.generatedCode.blender).toContain('location=(1, 2, 3)');
    expect(blenderResult.generatedCode.blender).toContain('diffuse_color');
  });
  
  it('should handle context-dependent commands via websocket chat', async () => {
    // Register message handler
    const messages: any[] = [];
    wsClient.on('newMessage', (data) => {
      messages.push(data);
    });
    
    // First message to set context
    await wsClient.sendChatMessage('Let\'s create some shapes in CorelDRAW');
    
    // Wait for response
    await utils.wait(1000);
    
    // Second message with context-dependent command
    await wsClient.sendChatMessage('Add a red circle with 2cm radius');
    
    // Wait for response
    await utils.wait(1000);
    
    // Check responses
    expect(messages.length).toBeGreaterThanOrEqual(2);
    
    // Check for code generation in the response
    const secondResponse = messages[1];
    expect(secondResponse).toBeDefined();
    expect(secondResponse.content).toContain('circle'); // Should mention circle in the response
    
    // Check if there's an execution plan or generated code
    expect(secondResponse.executionPlan || secondResponse.generatedCode).toBeDefined();
  });
}); 