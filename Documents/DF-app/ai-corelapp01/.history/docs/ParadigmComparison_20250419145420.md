# Command-Based vs Object-Model-Based Paradigms

This document compares the two fundamental paradigms used in the design software integration system.

## Command-Based Paradigm

The command-based paradigm uses high-level commands with parameters to execute operations. Commands are typically represented as strings with associated parameter objects.

### Key Components
- `CommandFactoryService` - Routes commands to appropriate command service
- `CorelDrawCommandsService` - Implements CorelDRAW commands
- `BlenderCommandsService` - Implements Blender commands

### Example: Creating a Rectangle in CorelDRAW

```typescript
// Command-based approach
const result = await commandFactory.executeCommand(
  'coreldraw',
  'create_rectangle',
  {
    x: 100,
    y: 100,
    width: 200,
    height: 150,
    fillColor: { r: 255, g: 0, b: 0 },
    outlineColor: { r: 0, g: 0, b: 0 }
  }
);
```

Inside `CorelDrawCommandsService`:

```typescript
async createRectangle(params: RectangleParams): Promise<ExecutionResult> {
  const { x = 0, y = 0, width = 100, height = 100, fillColor, outlineColor } = params;
  
  // Generate VBA code
  let vbaCode = `
    Sub CreateRect()
      Dim s As Shape
      Set s = ActiveDocument.ActivePage.CreateRectangle(${x}, ${y}, ${x + width}, ${y + height})
  `;
  
  if (fillColor) {
    vbaCode += `
      Dim fillColor As Color
      s.Fill.ApplyUniformFill CreateRGBColor(${fillColor.r}, ${fillColor.g}, ${fillColor.b})
    `;
  }
  
  if (outlineColor) {
    vbaCode += `
      s.Outline.SetProperties 0.5, OutlineStyles(0), CreateRGBColor(${outlineColor.r}, ${outlineColor.g}, ${outlineColor.b})
    `;
  }
  
  vbaCode += `
    End Sub
    CreateRect
  `;
  
  // Execute the VBA code
  return this.corelDrawService.executeCode(vbaCode);
}
```

### Example: Creating a Cube in Blender

```typescript
// Command-based approach
const result = await commandFactory.executeCommand(
  'blender',
  'create_cube',
  {
    location: [0, 0, 0],
    size: 2,
    material: {
      color: [1, 0, 0],
      metallic: 0.5,
      roughness: 0.2
    }
  }
);
```

Inside `BlenderCommandsService`:

```typescript
async createCube(params: CubeParams): Promise<ExecutionResult> {
  const { location = [0, 0, 0], size = 2, material } = params;
  
  // Generate Python code
  let pythonCode = `
import bpy

# Create cube
bpy.ops.mesh.primitive_cube_add(size=${size}, location=(${location.join(', ')}))
obj = bpy.context.active_object
  `;
  
  if (material) {
    const { color = [0.8, 0.8, 0.8], metallic = 0, roughness = 0.5 } = material;
    
    pythonCode += `
# Create material
mat = bpy.data.materials.new(name="Material")
mat.use_nodes = True
nodes = mat.node_tree.nodes
bsdf = nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (${color[0]}, ${color[1]}, ${color[2]}, 1.0)
bsdf.inputs['Metallic'].default_value = ${metallic}
bsdf.inputs['Roughness'].default_value = ${roughness}

# Assign material to object
if obj.data.materials:
    obj.data.materials[0] = mat
else:
    obj.data.materials.append(mat)
    `;
  }
  
  // Execute the Python code
  return this.blenderService.executeCode(pythonCode);
}
```

## Object-Model-Based Paradigm

The object-model paradigm provides direct access to the application's object hierarchy, allowing more granular control and interaction with objects.

### Key Components
- `UniversalObjectModel` - Defines interface for object model interactions
- `CorelDrawObjectModel` - Maps to CorelDRAW's COM/VBA object model
- `BlenderObjectModel` - Maps to Blender's Python API
- `ObjectModelCommandAdapter` - Bridges between commands and object models

### Example: Creating a Rectangle in CorelDRAW

```typescript
// Object-model approach
const corelObjectModel = getObjectModel('coreldraw');

// Get the active page
const context = await corelObjectModel.getCurrentContext();
const activePage = context.documentPath + '.ActivePage';

// Create rectangle via object model
const result = await corelObjectModel.invokeMethod(
  activePage,
  'CreateRectangle',
  [100, 100, 300, 250]
);

// Apply fill if rectangle created successfully
if (result.success && result.returnValue) {
  const rectPath = result.returnValue;
  
  // Create a fill color
  await corelObjectModel.invokeMethod(
    rectPath + '.Fill',
    'ApplyUniformFill',
    ['CreateRGBColor(255, 0, 0)']
  );
}
```

### Example: Creating a Cube in Blender

```typescript
// Object-model approach
const blenderObjectModel = getObjectModel('blender');

// Create cube via object model
const result = await blenderObjectModel.invokeMethod(
  'bpy.ops.mesh', 
  'primitive_cube_add', 
  [{ size: 2, location: [0, 0, 0] }]
);

// Apply material if cube created successfully
if (result.success) {
  // Get the active object
  const context = await blenderObjectModel.getCurrentContext();
  const activeObj = context.selectedObjects[0];
  
  // Create new material
  const matResult = await blenderObjectModel.executeCode(`
    import bpy
    
    # Create new material
    mat = bpy.data.materials.new(name="Material")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (1.0, 0.0, 0.0, 1.0)
    bsdf.inputs['Metallic'].default_value = 0.5
    bsdf.inputs['Roughness'].default_value = 0.2
    
    # Return material name
    mat.name
  `);
  
  if (matResult.success && matResult.returnValue) {
    // Assign material to object
    await blenderObjectModel.executeCode(`
      import bpy
      
      obj = bpy.data.objects['${activeObj.split('"')[1]}']
      mat = bpy.data.materials['${matResult.returnValue}']
      
      if obj.data.materials:
          obj.data.materials[0] = mat
      else:
          obj.data.materials.append(mat)
    `);
  }
}
```

## Comparison

### Command-Based Advantages
1. **Simplicity** - More straightforward API for common operations
2. **Abstraction** - Hides complex implementation details
3. **Consistency** - Unified interface across platforms
4. **Discoverability** - Available commands can be easily enumerated

### Object-Model Advantages
1. **Flexibility** - More powerful and granular control
2. **Direct Access** - Works directly with application's native object model
3. **Full Capability** - Access to all features of the software
4. **Efficiency** - Can potentially minimize unnecessary code generation

### Integration via Adapter
The `ObjectModelCommandAdapter` provides the best of both worlds:
1. Exposes a simple command-based interface
2. Internally uses object model for more robust execution
3. Falls back to command-based execution if object model fails
4. Provides a unified error handling mechanism

## When to Use Each Approach

### Use Command-Based When:
- Building high-level features that use common operations
- Working with both platforms in a consistent way
- Creating simple shapes and applying basic styling
- Performing standard operations with predictable parameters

### Use Object-Model When:
- Needing access to platform-specific features
- Working with complex object hierarchies
- Performing multiple operations on the same object
- Implementing advanced features unique to a specific platform 