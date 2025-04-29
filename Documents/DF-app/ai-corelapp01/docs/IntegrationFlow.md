# Design Software Integration Flow

```
┌──────────┐      ┌───────────────────┐      ┌────────────────────┐
│  Client  │─────▶│SoftwareController │─────▶│  SoftwareService   │
└──────────┘      └───────────────────┘      └────────────────────┘
                                                      │
                                                      ▼
                  ┌───────────────────────────────────────────────┐
                  │           Execution Attempt Flow              │
                  └───────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────┐    ┌─────────────────────┐     ┌─────────────────┐
│ObjectModelCommandAdapter│◀───│    First Attempt    │────▶│  CommandFactory │
└─────────────────────────┘    └─────────────────────┘     └─────────────────┘
           │                                                       │
           ▼                                                       ▼
┌─────────────────────────┐                             ┌─────────────────────┐
│   UniversalObjectModel  │                             │ Command Services    │
│  (Platform-specific)    │                             │ (Platform-specific) │
└─────────────────────────┘                             └─────────────────────┘
           │                                                       │
           │                                                       │
           ▼                                                       ▼
┌─────────────────────────┐                             ┌─────────────────────┐
│     Success? YES        │                             │    Success? YES     │
└─────────────────────────┘                             └─────────────────────┘
           │                                                       │
           │                                                       │
           ▼                                                       ▼
         Return                                                  Return
        Response                                                Response
           ▲                                                       ▲
           │                                                       │
           │                   ┌────────────────┐                  │
           │                   │  Third Attempt │                  │
           │                   └────────────────┘                  │
           │                            │                          │
           │                            ▼                          │
           │                   ┌────────────────┐                  │
           │                   │ Code Generation│                  │
           │                   └────────────────┘                  │
           │                            │                          │
           │                            ▼                          │
           │                   ┌────────────────┐                  │
           └───────────────────│    Success?    │──────────────────┘
                               └────────────────┘
```

## Flow Description

1. **Client Request**:
   - User sends a request to the `SoftwareController`
   - Request includes platform (CorelDRAW/Blender), action, and parameters

2. **Controller Processing**:
   - `SoftwareController` validates the request
   - Routes to appropriate endpoint in `SoftwareService`

3. **Service Execution**:
   - `SoftwareService` captures current design context
   - Begins multi-stage execution process

4. **First Attempt - Object Model Adapter**:
   - Tries to execute via `ObjectModelCommandAdapter`
   - Adapter translates command to object model operations
   - Uses platform-specific object model implementation:
     - `CorelDrawObjectModel` for CorelDRAW
     - `BlenderObjectModel` for Blender
   - If successful, returns response

5. **Second Attempt - Command Factory**:
   - If object model fails, falls back to `CommandFactoryService`
   - Factory routes to platform-specific command service:
     - `CorelDrawCommandsService` for CorelDRAW
     - `BlenderCommandsService` for Blender
   - If successful, returns response

6. **Third Attempt - Code Generation**:
   - If command factory doesn't recognize command:
     - Builds context-aware prompt with design context
     - Sends to language model to generate code
     - Executes generated code
   - Returns final response

7. **Response Handling**:
   - Records action in history
   - Updates design context
   - Returns result to controller, which returns to client

## Key Components

- **Object Model Adapter**: Bridges command-based and object-model-based paradigms
- **Command Factory**: Handles platform-specific command routing
- **Context Analyzers**: Capture and analyze design context
- **Universal Object Model**: Provides uniform access to software object models
- **Design Concept Mapper**: Maps universal design concepts to platform implementations

## Error Handling

- Graceful degradation through multiple execution attempts
- Comprehensive logging at each stage
- Action history tracking for debugging and context awareness 