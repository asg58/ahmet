/**
 * CorelDRAW Basic Shapes Test
 * 
 * This module tests basic shape creation and manipulation in CorelDRAW.
 */

import { api, utils } from '../setup';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('CorelDRAW Basic Shapes', () => {
  beforeAll(async () => {
    // Check if CorelDRAW is available
    try {
      await api.post(`${api.config.apiEndpoints.software.coreldraw}/status`, {});
      console.log('CorelDRAW is available');
    } catch (error) {
      console.warn('CorelDRAW might not be available, mock responses will be used');
    }
  });

  afterAll(async () => {
    // Clean up after tests
    try {
      const cleanupCode = `
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
      await api.executeCorelDrawCode(cleanupCode);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  it('should create a rectangle', async () => {
    const code = utils.getCreateRectangleCode();
    const result = await api.executeCorelDrawCode(code);
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    
    // Check if the rectangle exists
    const checkCode = `
      Function CheckRectangle()
        Dim s As Shape
        For Each s In ActiveDocument.ActivePage.Shapes
          If s.Name = "TestRectangle" Then
            CheckRectangle = "found"
            Exit Function
          End If
        Next s
        CheckRectangle = "not_found"
      End Function
      
      CheckRectangle
    `;
    
    const checkResult = await api.executeCorelDrawCode(checkCode);
    expect(checkResult.success).toBe(true);
    expect(checkResult.output).toContain('found');
  });

  it('should create a circle', async () => {
    const code = `
      Sub CreateTestCircle()
        Dim s As Shape
        Set s = ActiveDocument.ActivePage.CreateEllipse(300, 300, 100, 100)
        s.Fill.ApplyUniformFill CreateRGBColor(0, 0, 255)
        s.Outline.SetProperties 2, CreateRGBColor(0, 0, 0)
        s.Name = "TestCircle"
      End Sub
      
      CreateTestCircle
    `;
    
    const result = await api.executeCorelDrawCode(code);
    expect(result.success).toBe(true);
    
    // Verify the circle was created
    const verifyCode = `
      Function VerifyCircle()
        Dim s As Shape
        Dim found As Boolean
        found = False
        
        For Each s In ActiveDocument.ActivePage.Shapes
          If s.Name = "TestCircle" Then
            found = True
            Exit For
          End If
        Next s
        
        VerifyCircle = found
      End Function
      
      VerifyCircle
    `;
    
    const verifyResult = await api.executeCorelDrawCode(verifyCode);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.output).toContain('True');
  });
  
  it('should modify a shape', async () => {
    // First create a shape
    const createCode = `
      Sub CreateTestTriangle()
        ' Create a simple triangle using 3 points
        Dim s As Shape
        Dim points(5) As Double
        
        ' Define three points for the triangle
        points(0) = 100: points(1) = 400  ' Point 1
        points(2) = 200: points(3) = 500  ' Point 2
        points(4) = 300: points(5) = 400  ' Point 3
        
        Set s = ActiveDocument.ActivePage.CreateCurve(points)
        s.Closed = True
        s.Fill.ApplyUniformFill CreateRGBColor(0, 255, 0)
        s.Outline.SetProperties 1, CreateRGBColor(0, 0, 0)
        s.Name = "TestTriangle"
      End Sub
      
      CreateTestTriangle
    `;
    
    const createResult = await api.executeCorelDrawCode(createCode);
    expect(createResult.success).toBe(true);
    
    // Now modify the shape
    const modifyCode = `
      Sub ModifyTriangle()
        Dim s As Shape
        
        For Each s In ActiveDocument.ActivePage.Shapes
          If s.Name = "TestTriangle" Then
            ' Move the triangle
            s.Move 50, 50
            
            ' Change fill color to yellow
            s.Fill.ApplyUniformFill CreateRGBColor(255, 255, 0)
            
            ' Make outline thicker
            s.Outline.SetProperties 3, CreateRGBColor(255, 0, 0)
            
            Exit For
          End If
        Next s
      End Sub
      
      ModifyTriangle
    `;
    
    const modifyResult = await api.executeCorelDrawCode(modifyCode);
    expect(modifyResult.success).toBe(true);
    
    // Verify modifications
    const verifyCode = `
      Function VerifyModifiedTriangle()
        Dim s As Shape
        Dim result As String
        
        For Each s In ActiveDocument.ActivePage.Shapes
          If s.Name = "TestTriangle" Then
            ' Check if properties were changed
            Dim fillColor As Color
            Set fillColor = s.Fill.UniformColor
            
            ' Return position and color info
            result = "x:" & s.PositionX & " y:" & s.PositionY & " outlineWidth:" & s.Outline.Width
            VerifyModifiedTriangle = result
            Exit Function
          End If
        Next s
        
        VerifyModifiedTriangle = "not_found"
      End Function
      
      VerifyModifiedTriangle
    `;
    
    const verifyResult = await api.executeCorelDrawCode(verifyCode);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.output).toContain('x:');
    expect(verifyResult.output).not.toContain('not_found');
  });
  
  it('should delete a shape', async () => {
    // First check if shapes exist
    const checkCode = `
      Function CountTestShapes()
        Dim s As Shape
        Dim count As Integer
        count = 0
        
        For Each s In ActiveDocument.ActivePage.Shapes
          If InStr(s.Name, "Test") > 0 Then
            count = count + 1
          End If
        Next s
        
        CountTestShapes = count
      End Function
      
      CountTestShapes
    `;
    
    const initialCount = await api.executeCorelDrawCode(checkCode);
    
    // Delete a specific shape
    const deleteCode = `
      Sub DeleteShape()
        Dim s As Shape
        
        For Each s In ActiveDocument.ActivePage.Shapes
          If s.Name = "TestRectangle" Then
            s.Delete
            Exit For
          End If
        Next s
      End Sub
      
      DeleteShape
    `;
    
    const deleteResult = await api.executeCorelDrawCode(deleteCode);
    expect(deleteResult.success).toBe(true);
    
    // Verify the shape was deleted
    const verifyCode = `
      Function VerifyDeleted()
        Dim s As Shape
        
        For Each s In ActiveDocument.ActivePage.Shapes
          If s.Name = "TestRectangle" Then
            VerifyDeleted = False
            Exit Function
          End If
        Next s
        
        VerifyDeleted = True
      End Function
      
      VerifyDeleted
    `;
    
    const verifyResult = await api.executeCorelDrawCode(verifyCode);
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.output).toContain('True');
  });
  
  it('should work with object properties', async () => {
    // Create a new shape with properties
    const createCode = `
      Sub CreateShapeWithProperties()
        Dim s As Shape
        Set s = ActiveDocument.ActivePage.CreateRectangle(400, 100, 200, 100)
        
        ' Set various properties
        s.Name = "TestProperties"
        s.AddToSelection
        s.Outline.SetProperties 2, CreateRGBColor(128, 128, 128)
        s.Rotate 45  ' Rotate 45 degrees
        s.PositionX = 450  ' Move to specific X position
        s.PositionY = 150  ' Move to specific Y position
      End Sub
      
      CreateShapeWithProperties
    `;
    
    const createResult = await api.executeCorelDrawCode(createCode);
    expect(createResult.success).toBe(true);
    
    // Check if properties were applied correctly
    const checkCode = `
      Function CheckProperties()
        Dim s As Shape
        Dim result As String
        
        For Each s In ActiveDocument.ActivePage.Shapes
          If s.Name = "TestProperties" Then
            result = "posX:" & s.PositionX & " posY:" & s.PositionY & " rotation:" & s.RotationAngle
            CheckProperties = result
            Exit Function
          End If
        Next s
        
        CheckProperties = "not_found"
      End Function
      
      CheckProperties
    `;
    
    const checkResult = await api.executeCorelDrawCode(checkCode);
    expect(checkResult.success).toBe(true);
    expect(checkResult.output).toContain('posX:');
    expect(checkResult.output).toContain('rotation:');
    expect(checkResult.output).not.toContain('not_found');
  });
}); 