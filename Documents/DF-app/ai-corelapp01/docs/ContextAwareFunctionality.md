# Context-Aware Command Functionality

## Introduction

The Context-Aware Command functionality enhances the design software integration system by incorporating the current state of the design document into command execution. This allows for more intelligent, adaptive command behavior that understands the design context and adjusts parameters accordingly.

## Key Components

### 1. ContextAwareCommandAdapter

The `ContextAwareCommandAdapter` extends the base `ObjectModelCommandAdapter` by adding context awareness:

```typescript
@Injectable()
export class ContextAwareCommandAdapter extends ObjectModelCommandAdapter {
  async executeContextAwareCommand(
    platform: 'coreldraw' | 'blender',
    action: string,
    params: Record<string, any> = {}
  ): Promise<CommandExecutionResult> {
    // Get context and enhance command parameters
    const context = await this.getDesignContext(platform);
    const enhancedParams = this.enhanceParamsWithContext(action, params, context);
    
    // Execute with enhanced parameters
    return super.executeCommandViaObjectModel(platform, action, enhancedParams);
  }
}
```

### 2. Design Context Analyzers

The system uses specialized context analyzers for each platform:

- `BlenderContextAnalyzer` - Captures the current state of the Blender scene
- `CorelContextAnalyzer` - Captures the current state of the CorelDRAW document

These analyzers capture rich information about the design document, including:
- Document properties (size, name)
- Layer structure
- Selected elements
- Visual properties of elements
- Current view state

### 3. Context-Enhanced Parameters

Commands are enhanced with contextual information:

- **Smart Positioning** - New elements are placed intelligently relative to the current selection
- **Style Consistency** - Visual properties like colors and materials are inherited from selected elements
- **Adaptive Sizing** - Size of new elements can adjust based on document context
- **Platform-Specific Adaptations** - Each platform gets context-aware behavior tailored to its paradigm

## Usage

### API Endpoint

A dedicated endpoint is available for context-aware command execution:

```
POST /api/software/context-aware/:platform
```

Example request:

```json
{
  "action": "create_rectangle",
  "params": {
    "width": 100,
    "height": 50
  }
}
```

In this example, the position would be determined automatically based on context.

### Integration Flow

1. Client sends request to execute a context-aware command
2. System captures the current design context
3. Command parameters are enhanced based on context
4. Command is executed with the enhanced parameters
5. Result is returned to the client

## Benefits

1. **Reduced Parameter Specification** - Users don't need to specify all parameters; the system infers reasonable defaults from context
2. **Consistent Design Style** - New elements maintain visual consistency with existing ones
3. **Intelligent Positioning** - Elements are placed in logical positions relative to the current selection
4. **Improved User Experience** - Fewer parameters to specify means faster workflow and reduced cognitive load
5. **Adaptive Behavior** - The system adapts to the user's current task and design state

## Example Scenarios

### CorelDRAW: Creating a New Rectangle

**Without Context Awareness:**
```json
{
  "action": "create_rectangle",
  "params": {
    "x": 150,
    "y": 200,
    "width": 100,
    "height": 50,
    "fillColor": {"r": 255, "g": 0, "b": 0},
    "outlineColor": {"r": 0, "g": 0, "b": 0}
  }
}
```

**With Context Awareness:**
```json
{
  "action": "create_rectangle",
  "params": {
    "width": 100,
    "height": 50
  }
}
```

The system automatically:
- Positions next to the currently selected shape
- Uses fill and outline colors from the selected shape
- Places on the active layer

### Blender: Creating a New Cube

**Without Context Awareness:**
```json
{
  "action": "create_cube",
  "params": {
    "location": [1, 2, 0],
    "size": 2,
    "material": {
      "color": [1, 0, 0],
      "metallic": 0.5,
      "roughness": 0.2
    }
  }
}
```

**With Context Awareness:**
```json
{
  "action": "create_cube",
  "params": {
    "size": 2
  }
}
```

The system automatically:
- Places the cube near the selected object
- Applies the same material as the selected object
- Sets the size appropriately for the current scene scale

## Implementation Details

The context-aware functionality operates through several key mechanisms:

1. **Context Capture** - Python/VBA code extracts the current state of the design document
2. **Parameter Enhancement** - The adapter analyzes context and enhances command parameters
3. **Smart Execution** - The enhanced command is executed through the object model
4. **Fallback Mechanisms** - If context-aware execution fails, the system falls back to standard execution methods

This layered approach ensures robust execution while providing enhanced intelligence when possible. 