/**
 * Test script for the integration between ContextAnalyzer and the UniversalObjectModel
 * 
 * This script tests the full context analysis pipeline by:
 * 1. Connecting to a software (CorelDRAW or Blender)
 * 2. Starting context tracking
 * 3. Creating a test object
 * 4. Analyzing the context
 * 5. Printing the results
 * 
 * Usage: npm run script:test-context-integration -- [coreldraw|blender]
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ContextAnalyzerService } from '../context/context-analyzer.service';
import { CorelDrawService } from '../software/coreldraw.service';
import { BlenderService } from '../software/blender.service';
import { CorelDrawObjectModel } from '../software/universal/coreldraw-object-model';
import { BlenderObjectModel } from '../software/universal/blender-object-model';

// Default platform to test
const DEFAULT_PLATFORM = 'coreldraw';

async function bootstrap() {
  // Get platform argument from command line (default to CorelDRAW)
  const platform = process.argv[2]?.toLowerCase() || DEFAULT_PLATFORM;
  if (platform !== 'coreldraw' && platform !== 'blender') {
    console.error('Invalid platform. Use "coreldraw" or "blender".');
    process.exit(1);
  }

  // Create NestJS application context to get the services
  const app = await NestFactory.createApplicationContext(AppModule);
  
  // Get required services
  const contextAnalyzer = app.get(ContextAnalyzerService);
  const corelDrawService = app.get(CorelDrawService);
  const blenderService = app.get(BlenderService);
  const corelDrawObjectModel = app.get(CorelDrawObjectModel);
  const blenderObjectModel = app.get(BlenderObjectModel);

  try {
    console.log(`Testing context integration with ${platform}...`);

    // Check if the selected software is running
    let connected = false;
    if (platform === 'coreldraw') {
      const status = await corelDrawService.getStatus();
      connected = status.connected;
      console.log(`CorelDRAW status: ${connected ? 'Connected' : 'Not connected'}`);
    } else {
      const status = await blenderService.getStatus();
      connected = status.connected;
      console.log(`Blender status: ${connected ? 'Connected' : 'Not connected'}`);
    }

    if (!connected) {
      console.error(`${platform === 'coreldraw' ? 'CorelDRAW' : 'Blender'} is not running. Please start it first.`);
      process.exit(1);
    }

    // Start context tracking
    console.log(`Starting context tracking for ${platform}...`);
    await contextAnalyzer.startTracking(platform as 'coreldraw' | 'blender');
    console.log('Context tracking started');

    // Create a test object using the universal object model
    console.log('Creating test object...');
    if (platform === 'coreldraw') {
      await createCorelDrawTestShape(corelDrawObjectModel);
    } else {
      await createBlenderTestObject(blenderObjectModel);
    }
    console.log('Test object created');

    // Wait for context to update
    console.log('Waiting for context update...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get and analyze context
    console.log('Analyzing context...');
    const analysisResult = await contextAnalyzer.analyzeCurrentContext();
    
    // Output results
    console.log('\n===== Context Analysis Results =====');
    console.log(`Platform: ${analysisResult.context.platform}`);
    console.log(`Document: ${analysisResult.context.documentProperties.name || 'Untitled'}`);
    console.log(`Selected Objects: ${JSON.stringify(analysisResult.context.selectedObjects)}`);
    console.log(`Dominant Elements: ${JSON.stringify(analysisResult.dominantElements)}`);
    console.log(`Element Count: ${analysisResult.visualSummary?.elementCount}`);
    console.log(`Complexity: ${analysisResult.visualSummary?.complexity}`);
    console.log('\nSuggested Actions:');
    analysisResult.suggestedActions.forEach((action, i) => console.log(`  ${i + 1}. ${action}`));
    console.log('\nRelevant Documentation:');
    analysisResult.relevantDocumentation.forEach((doc, i) => 
      console.log(`  ${i + 1}. ${doc.title} (${doc.source}, relevance: ${doc.relevance.toFixed(2)})`)
    );

    // Try to capture a screenshot
    console.log('\nCapturing screenshot...');
    const screenshot = await contextAnalyzer.captureScreenshot();
    console.log(`Screenshot captured (format: ${screenshot.format}, size: ${screenshot.data.length} bytes)`);

    // Wait a moment before stopping
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Stop tracking and clean up
    console.log('\nStopping context tracking...');
    await contextAnalyzer.stopTracking();
    console.log('Context tracking stopped');

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    // Close the application context
    await app.close();
  }
}

/**
 * Create a test rectangle in CorelDRAW
 */
async function createCorelDrawTestShape(objectModel: CorelDrawObjectModel) {
  const result = await objectModel.executeCode(`
    Sub CreateTestObjects()
      On Error Resume Next
      
      ' Create a new document if none exists
      If Documents.Count = 0 Then
        Documents.Add
      End If
      
      ' Clear any existing selection
      ActiveDocument.ClearSelection
      
      ' Create a rectangle
      Dim rect As Shape
      Set rect = ActiveDocument.ActivePage.CreateRectangle(100, 100, 300, 200)
      rect.Fill.ApplyUniformFill CreateRGBColor(255, 0, 0)
      rect.Outline.SetProperties 1, CreateRGBColor(0, 0, 0)
      rect.Name = "TestRectangle"
      
      ' Create an ellipse
      Dim ellipse As Shape
      Set ellipse = ActiveDocument.ActivePage.CreateEllipse(400, 150, 500, 200)
      ellipse.Fill.ApplyUniformFill CreateRGBColor(0, 0, 255)
      ellipse.Outline.SetProperties 1, CreateRGBColor(0, 0, 0)
      ellipse.Name = "TestEllipse"
      
      ' Create text
      Dim text As Shape
      Set text = ActiveDocument.ActivePage.CreateArtisticText(250, 300, "Context Test", , , "Arial", 24)
      text.Name = "TestText"
      
      ' Select all objects
      rect.Selected = True
      ellipse.Selected = True
      text.Selected = True
      
      If Err.Number <> 0 Then
        MsgBox "Error: " & Err.Description
      End If
    End Sub
    
    CreateTestObjects
  `);

  if (!result.success) {
    throw new Error(`Failed to create test shape: ${result.error}`);
  }

  return result;
}

/**
 * Create a test object in Blender
 */
async function createBlenderTestObject(objectModel: BlenderObjectModel) {
  const result = await objectModel.executeCode(`
    import bpy
    
    def create_test_objects():
        # Clear existing selection
        bpy.ops.object.select_all(action='DESELECT')
        
        # Create a cube if it doesn't exist
        if "Cube" not in bpy.data.objects:
            bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))
            cube = bpy.context.active_object
            cube.name = "TestCube"
        else:
            cube = bpy.data.objects["Cube"]
            cube.location = (0, 0, 0)
            
        # Create a sphere
        bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(3, 0, 0))
        sphere = bpy.context.active_object
        sphere.name = "TestSphere"
        
        # Create a light if it doesn't exist
        if "Light" not in bpy.data.objects:
            bpy.ops.object.light_add(type='POINT', radius=1, location=(0, 0, 5))
            light = bpy.context.active_object
            light.name = "TestLight"
        else:
            light = bpy.data.objects["Light"]
            light.location = (0, 0, 5)
        
        # Select all objects
        cube.select_set(True)
        sphere.select_set(True)
        light.select_set(True)
        
        # Set active object
        bpy.context.view_layer.objects.active = sphere
        
        return "Objects created successfully"
    
    result = create_test_objects()
    print(result)
  `);

  if (!result.success) {
    throw new Error(`Failed to create test object: ${result.error}`);
  }

  return result;
}

// Run the test
bootstrap()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  }); 