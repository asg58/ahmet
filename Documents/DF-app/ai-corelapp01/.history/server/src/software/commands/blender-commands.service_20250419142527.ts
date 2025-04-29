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
      rotation = [Math.PI/2, 0, 0],
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

  /**
   * Apply material to an object
   */
  async applyMaterial(params: {
    objectName: string;
    material?: {
      name?: string;
      color?: [number, number, number];
      metallic?: number;
      roughness?: number;
      specular?: number;
      transmission?: number; // For glass-like materials
      emission?: [number, number, number]; // For glowing materials
      emissionStrength?: number; // Strength of emission
    };
  }): Promise<CommandResult> {
    this.logger.debug(`Applying material with params: ${JSON.stringify(params)}`);
    
    const {
      objectName,
      material = {
        name: 'NewMaterial',
        color: [0.8, 0.8, 0.8],
        metallic: 0,
        roughness: 0.5,
        specular: 0.5,
        transmission: 0,
        emission: [0, 0, 0],
        emissionStrength: 0
      }
    } = params;
    
    if (!objectName) {
      return {
        success: false,
        error: "Object name is required to apply material"
      };
    }
    
    // Generate Python code for applying material
    const pythonCode = `
import bpy

# Find the object by name
if "${objectName}" in bpy.data.objects:
    obj = bpy.data.objects["${objectName}"]
    
    # Create material if specified
    mat_name = "${material.name}"
    
    # Check if material already exists
    mat = bpy.data.materials.get(mat_name)
    if not mat:
        # Create new material
        mat = bpy.data.materials.new(name=mat_name)
    
    # Enable use nodes
    mat.use_nodes = True
    
    # Set principled BSDF node properties
    if mat.node_tree:
        principled = mat.node_tree.nodes.get("Principled BSDF")
        if principled:
            principled.inputs["Base Color"].default_value = (${material.color?.[0] ?? 0.8}, ${material.color?.[1] ?? 0.8}, ${material.color?.[2] ?? 0.8}, 1.0)
            principled.inputs["Metallic"].default_value = ${material.metallic ?? 0}
            principled.inputs["Roughness"].default_value = ${material.roughness ?? 0.5}
            principled.inputs["Specular"].default_value = ${material.specular ?? 0.5}
            principled.inputs["Transmission"].default_value = ${material.transmission ?? 0}
            
            # Set emission if specified
            if principled.inputs.get("Emission"):
                principled.inputs["Emission"].default_value = (${material.emission?.[0] ?? 0}, ${material.emission?.[1] ?? 0}, ${material.emission?.[2] ?? 0}, 1.0)
            
            # Set emission strength if specified
            if principled.inputs.get("Emission Strength"):
                principled.inputs["Emission Strength"].default_value = ${material.emissionStrength ?? 0}
    
    # Assign material to object
    if obj.data.materials:
        # Replace the first material slot
        obj.data.materials[0] = mat
    else:
        # Add new material slot
        obj.data.materials.append(mat)
    
    print(f"Applied material '{mat_name}' to {objectName}")
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
      this.logger.error(`Error applying material: ${error.message}`);
      return {
        success: false,
        error: `Failed to apply material: ${error.message}`,
      };
    }
  }

  /**
   * Render the current scene
   */
  async renderScene(params: {
    resolution?: [number, number];
    samples?: number;
    output_path?: string;
    engine?: 'CYCLES' | 'EEVEE' | 'WORKBENCH';
    format?: 'PNG' | 'JPEG' | 'BMP' | 'OPEN_EXR';
  }): Promise<CommandResult> {
    this.logger.debug(`Rendering scene with params: ${JSON.stringify(params)}`);
    
    const {
      resolution = [1920, 1080],
      samples = 64,
      output_path = '',
      engine = 'EEVEE',
      format = 'PNG'
    } = params;
    
    // Generate Python code for rendering
    const pythonCode = `
import bpy
import os
import tempfile
import base64

# Set render settings
scene = bpy.context.scene
render = scene.render

# Set resolution
render.resolution_x = ${resolution[0]}
render.resolution_y = ${resolution[1]}

# Set render engine
scene.render.engine = "${engine}"

# Set samples for the render
if "${engine}" == "CYCLES":
    scene.cycles.samples = ${samples}
elif "${engine}" == "EEVEE":
    scene.eevee.taa_render_samples = ${samples}

# Set output format
render.image_settings.file_format = "${format}"

# Determine output path
output_file = "${output_path}"
if not output_file:
    output_file = os.path.join(tempfile.gettempdir(), 'blender_render.png')

render.filepath = output_file

# Render
bpy.ops.render.render(write_still=True)

# Read the rendered image and convert to base64
with open(output_file, 'rb') as image_file:
    encoded_image = base64.b64encode(image_file.read()).decode('utf-8')

print(f"Scene rendered to {output_file}")
print(encoded_image)
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      
      // The output should contain the base64 encoded image
      if (result.success && result.output) {
        // Extract the base64 string from the output (assuming it's the last line)
        const lines = result.output.trim().split('\n');
        const base64Data = lines[lines.length - 1];
        
        return {
          success: true,
          output: `Scene rendered successfully with ${engine} at ${resolution[0]}x${resolution[1]}`,
          visualData: {
            type: 'image',
            data: `data:image/${format.toLowerCase()};base64,${base64Data}`
          }
        };
      } else {
        return {
          success: false,
          error: result.error || 'Failed to render scene',
        };
      }
    } catch (error) {
      this.logger.error(`Error rendering scene: ${error.message}`);
      return {
        success: false,
        error: `Failed to render scene: ${error.message}`,
      };
    }
  }

  /**
   * Set up lighting in the scene
   */
  async setupLighting(params: {
    type?: 'SUN' | 'POINT' | 'SPOT' | 'AREA';
    name?: string;
    location?: [number, number, number];
    rotation?: [number, number, number];
    energy?: number;
    color?: [number, number, number];
  }): Promise<CommandResult> {
    this.logger.debug(`Setting up lighting with params: ${JSON.stringify(params)}`);
    
    const {
      type = 'SUN',
      name = 'AILight',
      location = [4, 1, 6],
      rotation = [0.5, 0.2, 0.3],
      energy = 1.0,
      color = [1, 1, 1]
    } = params;
    
    // Generate Python code for setting up lighting
    const pythonCode = `
import bpy
import math

# Create a new light or use existing
if "${name}" not in bpy.data.objects:
    # Create new light
    bpy.ops.object.light_add(
        type="${type}",
        location=(${location[0]}, ${location[1]}, ${location[2]}),
        rotation=(${rotation[0]}, ${rotation[1]}, ${rotation[2]})
    )
    light = bpy.context.active_object
    light.name = "${name}"
else:
    # Use existing light
    light = bpy.data.objects["${name}"]
    light.location = (${location[0]}, ${location[1]}, ${location[2]})
    light.rotation_euler = (${rotation[0]}, ${rotation[1]}, ${rotation[2]})

# Configure light properties
light.data.energy = ${energy}
light.data.color = (${color[0]}, ${color[1]}, ${color[2]})

# Additional settings based on light type
if "${type}" == "SPOT":
    light.data.spot_size = math.radians(45)  # 45 degrees spotlight cone
    light.data.spot_blend = 0.15  # Soft edge
elif "${type}" == "AREA":
    light.data.size = 2  # Size of the area light
    light.data.shape = 'RECTANGLE'  # Shape of the area light
    light.data.size_y = 1  # Height of rectangle

print(f"Light setup complete: {light.name} ({type})")
    `;
    
    try {
      const result = await this.blenderService.executeCode(pythonCode);
      return {
        success: result.success,
        output: result.output,
        error: result.error
      };
    } catch (error) {
      this.logger.error(`Error setting up lighting: ${error.message}`);
      return {
        success: false,
        error: `Failed to set up lighting: ${error.message}`,
      };
    }
  }

  /**
   * Add texture to object
   */
  async addTexture(params: {
    objectName: string;
    textureType?: 'COLOR' | 'ROUGHNESS' | 'NORMAL' | 'BUMP' | 'DISPLACEMENT';
    texturePath?: string;
    procedural?: {
      type?: 'NOISE' | 'VORONOI' | 'MUSGRAVE' | 'WAVE' | 'CHECKER';
      scale?: number;
      detail?: number;
      distortion?: number;
    };
  }): Promise<CommandResult> {
    this.logger.debug(`Adding texture with params: ${JSON.stringify(params)}`);
    
    const {
      objectName,
      textureType = 'COLOR',
      texturePath = '',
      procedural = {
        type: 'NOISE',
        scale: 1.0,
        detail: 2.0,
        distortion: 0.0
      }
    } = params;
    
    if (!objectName) {
      return {
        success: false,
        error: "Object name is required to apply texture"
      };
    }
    
    // Generate Python code for applying texture
    const pythonCode = `
import bpy

# Find the object by name
if "${objectName}" in bpy.data.objects:
    obj = bpy.data.objects["${objectName}"]
    
    # Ensure object has a material
    if not obj.data.materials:
        # Create a new material
        mat = bpy.data.materials.new(name=f"{objectName}_mat")
        obj.data.materials.append(mat)
    else:
        mat = obj.data.materials[0]
    
    # Enable use nodes for the material
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    
    # Clear all nodes to start fresh
    for node in nodes:
        nodes.remove(node)
    
    # Add a basic material output node
    output_node = nodes.new(type='ShaderNodeOutputMaterial')
    output_node.location = (300, 0)
    
    # Add Principled BSDF
    principled = nodes.new(type='ShaderNodeBsdfPrincipled')
    principled.location = (0, 0)
    
    # Link principled to output
    links.new(principled.outputs['BSDF'], output_node.inputs['Surface'])
    
    # Create texture node based on type
    if "${texturePath}":
        # Using an image texture
        tex_node = nodes.new(type='ShaderNodeTexImage')
        tex_node.location = (-300, 0)
        
        # Load image if path provided
        try:
            img = bpy.data.images.load("${texturePath}")
            tex_node.image = img
        except:
            print(f"Could not load image: ${texturePath}")
    else:
        # Using a procedural texture
        if "${procedural.type}" == "NOISE":
            tex_node = nodes.new(type='ShaderNodeTexNoise')
            tex_node.inputs['Scale'].default_value = ${procedural.scale}
            tex_node.inputs['Detail'].default_value = ${procedural.detail}
            tex_node.inputs['Distortion'].default_value = ${procedural.distortion}
        elif "${procedural.type}" == "VORONOI":
            tex_node = nodes.new(type='ShaderNodeTexVoronoi')
            tex_node.inputs['Scale'].default_value = ${procedural.scale}
        elif "${procedural.type}" == "CHECKER":
            tex_node = nodes.new(type='ShaderNodeTexChecker')
            tex_node.inputs['Scale'].default_value = ${procedural.scale}
        else:
            tex_node = nodes.new(type='ShaderNodeTexNoise')
            tex_node.inputs['Scale'].default_value = ${procedural.scale}
    
    tex_node.location = (-300, 0)
    
    # Connect texture to the appropriate input based on texture type
    if "${textureType}" == "COLOR":
        links.new(tex_node.outputs['Color'], principled.inputs['Base Color'])
    elif "${textureType}" == "ROUGHNESS":
        links.new(tex_node.outputs['Color'], principled.inputs['Roughness'])
    elif "${textureType}" == "NORMAL":
        # For normal maps, we need a Normal Map node
        normal_map = nodes.new(type='ShaderNodeNormalMap')
        normal_map.location = (-150, -150)
        links.new(tex_node.outputs['Color'], normal_map.inputs['Color'])
        links.new(normal_map.outputs['Normal'], principled.inputs['Normal'])
    elif "${textureType}" == "BUMP":
        # For bump maps, we need a Bump node
        bump = nodes.new(type='ShaderNodeBump')
        bump.location = (-150, -150)
        links.new(tex_node.outputs['Color'], bump.inputs['Height'])
        links.new(bump.outputs['Normal'], principled.inputs['Normal'])
    elif "${textureType}" == "DISPLACEMENT":
        # For displacement, connect to material output displacement
        links.new(tex_node.outputs['Color'], output_node.inputs['Displacement'])
    
    print(f"Applied {textureType} texture to {objectName}")
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
      this.logger.error(`Error adding texture: ${error.message}`);
      return {
        success: false,
        error: `Failed to add texture: ${error.message}`,
      };
    }
  }
} 