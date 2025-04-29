import { Injectable, Logger } from '@nestjs/common';
import { BlenderService } from '../blender.service';

export interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  data?: any;
  visualData?: {
    type: 'image' | '3d' | 'svg';
    data: string;
  };
}

/**
 * BlenderCommandsService
 * 
 * Service for executing high-level commands in Blender
 */
@Injectable()
export class BlenderCommandsService {
  private readonly logger = new Logger(BlenderCommandsService.name);

  constructor(
    private readonly blenderService: BlenderService,
  ) {}

  /**
   * Create a cube in Blender
   */
  async createCube(params: {
    location?: [number, number, number];
    size?: number;
    material?: {
      name?: string;
      color?: [number, number, number];
      metallic?: number;
      roughness?: number;
    };
  }): Promise<CommandResult> {
    this.logger.debug(`Creating cube with params: ${JSON.stringify(params)}`);
    
    const {
      location = [0, 0, 0],
      size = 2,
      material = {
        name: 'Material',
        color: [0.8, 0.2, 0.2],
        metallic: 0,
        roughness: 0.5
      }
    } = params;
    
    // Generate Python code for creating a cube
    const pythonCode = `
import bpy
import random

# Create a unique name for the cube
cube_name = f"Cube_{random.randint(1000, 9999)}"

# Delete object if it already exists
if cube_name in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects[cube_name])

# Create a cube
bpy.ops.mesh.primitive_cube_add(size=${size}, location=(${location[0]}, ${location[1]}, ${location[2]}))
cube = bpy.context.active_object
cube.name = cube_name

# Create material if specified
if "${material.name}":
    # Check if material already exists
    mat = bpy.data.materials.get("${material.name}")
    if not mat:
        # Create material
        mat = bpy.data.materials.new(name="${material.name}")
    
    # Enable use nodes
    mat.use_nodes = True
    
    # Set principled BSDF node properties
    if mat.node_tree:
        principled = mat.node_tree.nodes.get("Principled BSDF")
        if principled:
            principled.inputs["Base Color"].default_value = (${material.color[0]}, ${material.color[1]}, ${material.color[2]}, 1.0)
            principled.inputs["Metallic"].default_value = ${material.metallic}
            principled.inputs["Roughness"].default_value = ${material.roughness}
    
    # Assign material to cube
    if cube.data.materials:
        cube.data.materials[0] = mat
    else:
        cube.data.materials.append(mat)

print(f"Created cube: {cube.name}")
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        visualData: result.visualData
      };
    } catch (error) {
      this.logger.error(`Error creating cube: ${error.message}`);
      return {
        success: false,
        error: `Failed to create cube: ${error.message}`,
      };
    }
  }

  /**
   * Create a sphere in Blender
   */
  async createSphere(params: {
    location?: [number, number, number];
    radius?: number;
    segments?: number;
    rings?: number;
    material?: {
      name?: string;
      color?: [number, number, number];
      metallic?: number;
      roughness?: number;
    };
  }): Promise<CommandResult> {
    this.logger.debug(`Creating sphere with params: ${JSON.stringify(params)}`);
    
    const {
      location = [0, 0, 0],
      radius = 1,
      segments = 32,
      rings = 16,
      material = {
        name: 'Material',
        color: [0.2, 0.2, 0.8],
        metallic: 0,
        roughness: 0.5
      }
    } = params;
    
    // Generate Python code for creating a sphere
    const pythonCode = `
import bpy
import random

# Create a unique name for the sphere
sphere_name = f"Sphere_{random.randint(1000, 9999)}"

# Delete object if it already exists
if sphere_name in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects[sphere_name])

# Create a UV sphere
bpy.ops.mesh.primitive_uv_sphere_add(
    segments=${segments},
    ring_count=${rings},
    radius=${radius},
    location=(${location[0]}, ${location[1]}, ${location[2]})
)
sphere = bpy.context.active_object
sphere.name = sphere_name

# Create material if specified
if "${material.name}":
    # Check if material already exists
    mat = bpy.data.materials.get("${material.name}")
    if not mat:
        # Create material
        mat = bpy.data.materials.new(name="${material.name}")
    
    # Enable use nodes
    mat.use_nodes = True
    
    # Set principled BSDF node properties
    if mat.node_tree:
        principled = mat.node_tree.nodes.get("Principled BSDF")
        if principled:
            principled.inputs["Base Color"].default_value = (${material.color[0]}, ${material.color[1]}, ${material.color[2]}, 1.0)
            principled.inputs["Metallic"].default_value = ${material.metallic}
            principled.inputs["Roughness"].default_value = ${material.roughness}
    
    # Assign material to sphere
    if sphere.data.materials:
        sphere.data.materials[0] = mat
    else:
        sphere.data.materials.append(mat)

print(f"Created sphere: {sphere.name}")
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        visualData: result.visualData
      };
    } catch (error) {
      this.logger.error(`Error creating sphere: ${error.message}`);
      return {
        success: false,
        error: `Failed to create sphere: ${error.message}`,
      };
    }
  }

  /**
   * Create text in Blender
   */
  async createText(params: {
    text?: string;
    location?: [number, number, number];
    size?: number;
    extrude?: number;
    material?: {
      name?: string;
      color?: [number, number, number];
    };
  }): Promise<CommandResult> {
    this.logger.debug(`Creating text with params: ${JSON.stringify(params)}`);
    
    const {
      text = "Blender",
      location = [0, 0, 0],
      size = 1,
      extrude = 0.1,
      material = {
        name: 'TextMaterial',
        color: [1, 0.8, 0],
      }
    } = params;
    
    // Generate Python code for creating text
    const pythonCode = `
import bpy
import random

# Create a unique name for the text
text_name = f"Text_{random.randint(1000, 9999)}"

# Delete object if it already exists
if text_name in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects[text_name])

# Create text
bpy.ops.object.text_add(location=(${location[0]}, ${location[1]}, ${location[2]}))
text_obj = bpy.context.active_object
text_obj.name = text_name

# Set text properties
text_obj.data.body = "${text}"
text_obj.data.size = ${size}
text_obj.data.extrude = ${extrude}

# Create material if specified
if "${material.name}":
    # Check if material already exists
    mat = bpy.data.materials.get("${material.name}")
    if not mat:
        # Create material
        mat = bpy.data.materials.new(name="${material.name}")
    
    # Enable use nodes
    mat.use_nodes = True
    
    # Set principled BSDF node properties
    if mat.node_tree:
        principled = mat.node_tree.nodes.get("Principled BSDF")
        if principled:
            principled.inputs["Base Color"].default_value = (${material.color[0]}, ${material.color[1]}, ${material.color[2]}, 1.0)
    
    # Assign material to text
    if text_obj.data.materials:
        text_obj.data.materials[0] = mat
    else:
        text_obj.data.materials.append(mat)

print(f"Created text: {text_obj.name}")
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        visualData: result.visualData
      };
    } catch (error) {
      this.logger.error(`Error creating text: ${error.message}`);
      return {
        success: false,
        error: `Failed to create text: ${error.message}`,
      };
    }
  }

  /**
   * Select objects in Blender based on criteria
   */
  async selectObjects(params: {
    type?: string;
    name?: string;
    all?: boolean;
  }): Promise<CommandResult> {
    this.logger.debug(`Selecting objects with params: ${JSON.stringify(params)}`);
    
    const {
      type,
      name,
      all = false
    } = params;
    
    let pythonCode: string;
    
    if (all) {
      // Select all objects
      pythonCode = `
import bpy

# Deselect all objects first
bpy.ops.object.select_all(action='DESELECT')

# Select all objects
bpy.ops.object.select_all(action='SELECT')

print(f"Selected all objects: {len(bpy.context.selected_objects)} objects")
      `;
    } else if (type) {
      // Select objects by type
      pythonCode = `
import bpy

# Deselect all objects first
bpy.ops.object.select_all(action='DESELECT')

# Select objects by type
count = 0
for obj in bpy.data.objects:
    if obj.type == "${type}":
        obj.select_set(True)
        count += 1

print(f"Selected {count} objects of type {type}")
      `;
    } else if (name) {
      // Select objects by name pattern
      pythonCode = `
import bpy

# Deselect all objects first
bpy.ops.object.select_all(action='DESELECT')

# Select objects by name pattern
count = 0
for obj in bpy.data.objects:
    if "${name}" in obj.name:
        obj.select_set(True)
        count += 1

print(f"Selected {count} objects with name containing '{name}'")
      `;
    } else {
      return {
        success: false,
        error: "No selection criteria provided"
      };
    }
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
      };
    } catch (error) {
      this.logger.error(`Error selecting objects: ${error.message}`);
      return {
        success: false,
        error: `Failed to select objects: ${error.message}`,
      };
    }
  }

  /**
   * Get a screenshot of the current Blender scene
   */
  async getSceneScreenshot(): Promise<CommandResult> {
    this.logger.debug('Getting scene screenshot');
    
    const pythonCode = `
import bpy
import os
import tempfile
import base64

# Create a temporary file to save the render
temp_file = os.path.join(tempfile.gettempdir(), 'blender_screenshot.png')

# Set render settings
bpy.context.scene.render.filepath = temp_file
bpy.context.scene.render.image_settings.file_format = 'PNG'

# Render image
bpy.ops.render.opengl(write_still=True)

# Read the rendered image and convert to base64
with open(temp_file, 'rb') as image_file:
    encoded_image = base64.b64encode(image_file.read()).decode('utf-8')

print(encoded_image)
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      
      // The output should contain the base64 encoded image
      if (result.success && result.output) {
        return {
          success: true,
          output: 'Screenshot taken successfully',
          visualData: {
            type: 'image',
            data: `data:image/png;base64,${result.output.trim()}`
          }
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to get screenshot',
        };
      }
    } catch (error) {
      this.logger.error(`Error getting screenshot: ${error.message}`);
      return {
        success: false,
        error: `Failed to get screenshot: ${error.message}`,
      };
    }
  }

  /**
   * Create a cylinder in Blender
   */
  async createCylinder(params: {
    location?: [number, number, number];
    radius?: number;
    depth?: number;
    vertices?: number;
    material?: {
      name?: string;
      color?: [number, number, number];
      metallic?: number;
      roughness?: number;
    };
  }): Promise<CommandResult> {
    this.logger.debug(`Creating cylinder with params: ${JSON.stringify(params)}`);
    
    const {
      location = [0, 0, 0],
      radius = 1,
      depth = 2,
      vertices = 32,
      material = {
        name: 'Material',
        color: [0.2, 0.8, 0.2],
        metallic: 0,
        roughness: 0.5
      }
    } = params;
    
    // Generate Python code for creating a cylinder
    const pythonCode = `
import bpy
import random

# Create a unique name for the cylinder
cylinder_name = f"Cylinder_{random.randint(1000, 9999)}"

# Delete object if it already exists
if cylinder_name in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects[cylinder_name])

# Create a cylinder
bpy.ops.mesh.primitive_cylinder_add(
    vertices=${vertices},
    radius=${radius},
    depth=${depth},
    location=(${location[0]}, ${location[1]}, ${location[2]})
)
cylinder = bpy.context.active_object
cylinder.name = cylinder_name

# Create material if specified
if "${material.name}":
    # Check if material already exists
    mat = bpy.data.materials.get("${material.name}")
    if not mat:
        # Create material
        mat = bpy.data.materials.new(name="${material.name}")
    
    # Enable use nodes
    mat.use_nodes = True
    
    # Set principled BSDF node properties
    if mat.node_tree:
        principled = mat.node_tree.nodes.get("Principled BSDF")
        if principled:
            principled.inputs["Base Color"].default_value = (${material.color[0]}, ${material.color[1]}, ${material.color[2]}, 1.0)
            principled.inputs["Metallic"].default_value = ${material.metallic}
            principled.inputs["Roughness"].default_value = ${material.roughness}
    
    # Assign material to cylinder
    if cylinder.data.materials:
        cylinder.data.materials[0] = mat
    else:
        cylinder.data.materials.append(mat)

print(f"Created cylinder: {cylinder.name}")
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        visualData: result.visualData
      };
    } catch (error) {
      this.logger.error(`Error creating cylinder: ${error.message}`);
      return {
        success: false,
        error: `Failed to create cylinder: ${error.message}`,
      };
    }
  }

  /**
   * Create a plane in Blender
   */
  async createPlane(params: {
    location?: [number, number, number];
    size?: number;
    material?: {
      name?: string;
      color?: [number, number, number];
      metallic?: number;
      roughness?: number;
    };
  }): Promise<CommandResult> {
    this.logger.debug(`Creating plane with params: ${JSON.stringify(params)}`);
    
    const {
      location = [0, 0, 0],
      size = 2,
      material = {
        name: 'Material',
        color: [0.8, 0.8, 0.8],
        metallic: 0,
        roughness: 0.5
      }
    } = params;
    
    // Generate Python code for creating a plane
    const pythonCode = `
import bpy
import random

# Create a unique name for the plane
plane_name = f"Plane_{random.randint(1000, 9999)}"

# Delete object if it already exists
if plane_name in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects[plane_name])

# Create a plane
bpy.ops.mesh.primitive_plane_add(
    size=${size},
    location=(${location[0]}, ${location[1]}, ${location[2]})
)
plane = bpy.context.active_object
plane.name = plane_name

# Create material if specified
if "${material.name}":
    # Check if material already exists
    mat = bpy.data.materials.get("${material.name}")
    if not mat:
        # Create material
        mat = bpy.data.materials.new(name="${material.name}")
    
    # Enable use nodes
    mat.use_nodes = True
    
    # Set principled BSDF node properties
    if mat.node_tree:
        principled = mat.node_tree.nodes.get("Principled BSDF")
        if principled:
            principled.inputs["Base Color"].default_value = (${material.color[0]}, ${material.color[1]}, ${material.color[2]}, 1.0)
            principled.inputs["Metallic"].default_value = ${material.metallic}
            principled.inputs["Roughness"].default_value = ${material.roughness}
    
    # Assign material to plane
    if plane.data.materials:
        plane.data.materials[0] = mat
    else:
        plane.data.materials.append(mat)

print(f"Created plane: {plane.name}")
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error,
        visualData: result.visualData
      };
    } catch (error) {
      this.logger.error(`Error creating plane: ${error.message}`);
      return {
        success: false,
        error: `Failed to create plane: ${error.message}`,
      };
    }
  }

  /**
   * Transform an object in Blender (scale, rotate, move)
   */
  async transformObject(params: {
    objectName?: string;
    location?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  }): Promise<CommandResult> {
    this.logger.debug(`Transforming object with params: ${JSON.stringify(params)}`);
    
    const {
      objectName,
      location,
      rotation,
      scale
    } = params;
    
    if (!objectName) {
      return {
        success: false,
        error: "Object name is required for transformation"
      };
    }
    
    // Generate Python code for transforming an object
    const pythonCode = `
import bpy
import math

# Find the object by name
if "${objectName}" in bpy.data.objects:
    obj = bpy.data.objects["${objectName}"]
    
    # Apply transformations
    ${location ? `obj.location = (${location[0]}, ${location[1]}, ${location[2]})` : ''}
    ${rotation ? `obj.rotation_euler = (${rotation[0]}, ${rotation[1]}, ${rotation[2]})` : ''}
    ${scale ? `obj.scale = (${scale[0]}, ${scale[1]}, ${scale[2]})` : ''}
    
    print(f"Transformed object: {obj.name}")
else:
    print(f"Object '{objectName}' not found")
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error
      };
    } catch (error) {
      this.logger.error(`Error transforming object: ${error.message}`);
      return {
        success: false,
        error: `Failed to transform object: ${error.message}`,
      };
    }
  }

  /**
   * Set up camera in Blender
   */
  async setupCamera(params: {
    location?: [number, number, number];
    rotation?: [number, number, number];
    focalLength?: number;
    name?: string;
  }): Promise<CommandResult> {
    this.logger.debug(`Setting up camera with params: ${JSON.stringify(params)}`);
    
    const {
      location = [0, -10, 0],
      rotation = [math.PI/2, 0, 0],
      focalLength = 50,
      name = 'AICamera'
    } = params;
    
    // Generate Python code for setting up camera
    const pythonCode = `
import bpy
import math

# Create a new camera if it doesn't exist
if "${name}" not in bpy.data.objects:
    bpy.ops.object.camera_add(
        location=(${location[0]}, ${location[1]}, ${location[2]}),
        rotation=(${rotation[0]}, ${rotation[1]}, ${rotation[2]})
    )
    camera = bpy.context.active_object
    camera.name = "${name}"
else:
    # Use existing camera
    camera = bpy.data.objects["${name}"]
    camera.location = (${location[0]}, ${location[1]}, ${location[2]})
    camera.rotation_euler = (${rotation[0]}, ${rotation[1]}, ${rotation[2]})

# Set camera properties
camera.data.lens = ${focalLength}

# Set this camera as active camera
bpy.context.scene.camera = camera

print(f"Camera setup complete: {camera.name}")
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error
      };
    } catch (error) {
      this.logger.error(`Error setting up camera: ${error.message}`);
      return {
        success: false,
        error: `Failed to set up camera: ${error.message}`,
      };
    }
  }
} 