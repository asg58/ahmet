/**
 * Blender Basic Shapes Test
 * 
 * This module tests basic shape creation and manipulation in Blender.
 */

import { api, utils } from '../setup';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Blender Basic Shapes', () => {
  beforeAll(async () => {
    // Check if Blender is available
    try {
      await api.post(`${api.config.apiEndpoints.software.blender}/status`, {});
      console.log('Blender is available');
    } catch (error) {
      console.warn('Blender might not be available, mock responses will be used');
    }
  });

  afterAll(async () => {
    // Clean up after tests
    try {
      const cleanupCode = `
        import bpy
        
        # Select all objects
        bpy.ops.object.select_all(action='SELECT')
        
        # Delete all selected objects
        bpy.ops.object.delete()
      `;
      await api.executeBlenderCode(cleanupCode);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  it('should create a cube', async () => {
    const code = utils.getCreateCubeCode();
    const result = await api.executeBlenderCode(code);
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    
    // Check if the cube exists
    const checkCode = `
      import bpy
      import json
      
      # Find all cube objects
      cubes = [obj.name for obj in bpy.data.objects if obj.type == 'MESH' and 'Cube' in obj.name]
      
      print(json.dumps({"found": len(cubes) > 0, "cubes": cubes}))
    `;
    
    const checkResult = await api.executeBlenderCode(checkCode);
    expect(checkResult.success).toBe(true);
    
    // Parse the JSON output
    const output = JSON.parse(checkResult.output);
    expect(output.found).toBe(true);
    expect(output.cubes.length).toBeGreaterThan(0);
  });

  it('should create a sphere', async () => {
    const code = `
      import bpy
      
      # Create a UV sphere
      bpy.ops.mesh.primitive_uv_sphere_add(
        radius=1.5,
        location=(3, 0, 0),
        segments=32,
        ring_count=16
      )
      
      # Get the active object (the sphere we just created)
      sphere = bpy.context.active_object
      
      # Rename it for easier identification
      sphere.name = "TestSphere"
      
      # Add a material
      if "SphereMateriaal" not in bpy.data.materials:
          mat = bpy.data.materials.new("SphereMateriaal")
          mat.diffuse_color = (0, 0, 1, 1)  # Blue color
      else:
          mat = bpy.data.materials["SphereMateriaal"]
      
      # Assign material to the sphere
      if len(sphere.data.materials) == 0:
          sphere.data.materials.append(mat)
      else:
          sphere.data.materials[0] = mat
      
      print("Sphere created successfully")
    `;
    
    const result = await api.executeBlenderCode(code);
    expect(result.success).toBe(true);
    
    // Verify the sphere was created
    const verifyCode = `
      import bpy
      import json
      
      # Check if our sphere exists
      sphere_exists = "TestSphere" in bpy.data.objects
      
      # Get additional info if it exists
      sphere_info = {}
      if sphere_exists:
          sphere = bpy.data.objects["TestSphere"]
          sphere_info = {
              "location": [round(v, 2) for v in sphere.location],
              "has_material": len(sphere.data.materials) > 0
          }
      
      print(json.dumps({
          "exists": sphere_exists,
          "info": sphere_info
      }))
    `;
    
    const verifyResult = await api.executeBlenderCode(verifyCode);
    expect(verifyResult.success).toBe(true);
    
    // Parse the JSON output
    const output = JSON.parse(verifyResult.output);
    expect(output.exists).toBe(true);
    expect(output.info.location).toEqual([3, 0, 0]);
    expect(output.info.has_material).toBe(true);
  });
  
  it('should modify an object', async () => {
    // First create a cylinder
    const createCode = `
      import bpy
      
      # Create a cylinder
      bpy.ops.mesh.primitive_cylinder_add(
        radius=1,
        depth=2,
        location=(0, 3, 0)
      )
      
      # Rename it for easier identification
      cylinder = bpy.context.active_object
      cylinder.name = "TestCylinder"
    `;
    
    const createResult = await api.executeBlenderCode(createCode);
    expect(createResult.success).toBe(true);
    
    // Now modify the cylinder
    const modifyCode = `
      import bpy
      
      # Get the cylinder
      if "TestCylinder" in bpy.data.objects:
          cylinder = bpy.data.objects["TestCylinder"]
          
          # Make sure it's the active object
          bpy.ops.object.select_all(action='DESELECT')
          cylinder.select_set(True)
          bpy.context.view_layer.objects.active = cylinder
          
          # Modify the cylinder
          cylinder.scale = (1.5, 1.5, 3.0)  # Make it taller and wider
          cylinder.location.z = 1  # Move it up
          
          # Add a material
          if "CylinderMaterial" not in bpy.data.materials:
              mat = bpy.data.materials.new("CylinderMaterial")
              mat.diffuse_color = (1, 0, 0, 1)  # Red color
          else:
              mat = bpy.data.materials["CylinderMaterial"]
          
          # Assign material
          if len(cylinder.data.materials) == 0:
              cylinder.data.materials.append(mat)
          else:
              cylinder.data.materials[0] = mat
          
          print("Cylinder modified successfully")
      else:
          print("Cylinder not found")
    `;
    
    const modifyResult = await api.executeBlenderCode(modifyCode);
    expect(modifyResult.success).toBe(true);
    
    // Verify the modifications
    const verifyCode = `
      import bpy
      import json
      
      # Check if our cylinder exists and get its properties
      if "TestCylinder" in bpy.data.objects:
          cylinder = bpy.data.objects["TestCylinder"]
          
          info = {
              "location": [round(v, 2) for v in cylinder.location],
              "scale": [round(v, 2) for v in cylinder.scale],
              "has_material": len(cylinder.data.materials) > 0
          }
          
          print(json.dumps({
              "exists": True,
              "info": info
          }))
      else:
          print(json.dumps({
              "exists": False
          }))
    `;
    
    const verifyResult = await api.executeBlenderCode(verifyCode);
    expect(verifyResult.success).toBe(true);
    
    // Parse the JSON output
    const output = JSON.parse(verifyResult.output);
    expect(output.exists).toBe(true);
    expect(output.info.location[2]).toBe(1); // Z position should be 1
    expect(output.info.scale[2]).toBe(3); // Z scale should be 3
    expect(output.info.has_material).toBe(true);
  });
  
  it('should delete an object', async () => {
    // First create an object to delete
    const createCode = `
      import bpy
      
      # Create a cone
      bpy.ops.mesh.primitive_cone_add(
        radius1=1,
        radius2=0,
        depth=2,
        location=(3, 3, 0)
      )
      
      # Get the active object (the cone we just created)
      cone = bpy.context.active_object
      
      # Rename it for easier identification
      cone.name = "TestCone"
    `;
    
    const createResult = await api.executeBlenderCode(createCode);
    expect(createResult.success).toBe(true);
    
    // Verify the cone was created
    const verifyCreateCode = `
      import bpy
      import json
      
      print(json.dumps({
          "exists": "TestCone" in bpy.data.objects
      }))
    `;
    
    const verifyCreateResult = await api.executeBlenderCode(verifyCreateCode);
    expect(verifyCreateResult.success).toBe(true);
    expect(JSON.parse(verifyCreateResult.output).exists).toBe(true);
    
    // Now delete the cone
    const deleteCode = `
      import bpy
      
      # Get the cone
      if "TestCone" in bpy.data.objects:
          # Select the cone
          bpy.ops.object.select_all(action='DESELECT')
          bpy.data.objects["TestCone"].select_set(True)
          
          # Delete it
          bpy.ops.object.delete()
          
          print("Cone deleted successfully")
      else:
          print("Cone not found")
    `;
    
    const deleteResult = await api.executeBlenderCode(deleteCode);
    expect(deleteResult.success).toBe(true);
    
    // Verify the cone was deleted
    const verifyDeleteCode = `
      import bpy
      import json
      
      print(json.dumps({
          "exists": "TestCone" in bpy.data.objects
      }))
    `;
    
    const verifyDeleteResult = await api.executeBlenderCode(verifyDeleteCode);
    expect(verifyDeleteResult.success).toBe(true);
    expect(JSON.parse(verifyDeleteResult.output).exists).toBe(false);
  });
}); 