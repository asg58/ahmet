# Blender Integration: Frontend-Backend Analysis

## Overview

This document provides a comprehensive analysis of the integration between the frontend client and backend server for Blender functionality within the application. The integration enables the application to communicate with Blender for 3D modeling operations, rendering, and model viewing.

## Architecture Components

### Frontend Components

#### Model Viewer
- **Main Component**: `ModelViewer` (client/src/components/viewer/model-viewer.tsx)
  - Renders 3D models using Three.js via React Three Fiber
  - Handles model selection, loading, and viewing options
  - Uses sample models defined in `sampleModels` array

#### Scene Components
- **ViewerScene** (client/src/components/viewer/scene/viewer-scene.tsx)
  - Configures the 3D scene with lighting, camera, controls
  - Uses React Three Fiber's Canvas, OrbitControls, Grid, Environment, etc.

#### Model Object
- **ModelObject** (client/src/components/viewer/scene/model-object.tsx)
  - Loads and displays GLTF/GLB 3D models
  - Handles loading states and errors
  - Applies wireframe and other visual properties

#### User Interface
- **ModelSelector** (client/src/components/viewer/model-selector.tsx)
  - Provides UI for selecting different models to view
  - Displays thumbnails and model information

### Backend Components

#### Blender Service (`server/src/software/blender.service.ts`)
- NestJS service that communicates with the Blender Bridge service
- Supports both WebSocket and REST API communication
- Supports operations:
  - Creating 3D objects (cubes, spheres)
  - Applying materials
  - Rendering scenes
  - Executing custom Python code in Blender
  - Getting scene objects

#### Software Controller (`server/src/software/software.controller.ts`)
- Exposes REST API endpoints for software-related operations
- Relevant endpoints:
  - `GET /api/software/blender/status`: Check Blender connection status
  - `POST /api/software/blender/execute`: Execute Python code
  - `POST /api/software/execute/:platform`: Execute commands
  - `POST /api/software/action/:platform`: Execute actions with parameters

#### Universal Object Model (`server/src/software/universal/blender-object-model.ts`)
- Provides a universal interface for interacting with Blender's object model
- Maps common operations to Blender Python commands
- Methods:
  - `getProperty`: Read object properties
  - `setProperty`: Set object properties
  - `invokeMethod`: Call methods on objects
  - `getCurrentContext`: Get current scene context

#### Context Tracker (`server/src/context/blender-context-tracker.ts`)
- Tracks design context changes in Blender
- Captures snapshots of the current state
- Fetches scene information using Python code execution

## Communication Flow

### WebSocket Communication
1. `BlenderService` establishes a WebSocket connection to the Blender Bridge
2. The service attempts multiple connection endpoints (localhost, host.docker.internal)
3. If connected, it sends messages using `sendWebSocketMessage` method
4. The service handles reconnection attempts if the connection is lost

### REST Fallback
1. If WebSocket communication fails, the service falls back to REST API calls
2. Endpoint is configured via environment variable `BLENDER_BRIDGE_ENDPOINT`
3. REST calls are made using axios to the Blender Bridge service

### Frontend-Backend Integration
Currently, the frontend uses sample models rather than directly fetching generated models from Blender. There is no dedicated client-side API service for communicating with the Blender endpoints.

### Configuration

**Environment Variables:**
- `BLENDER_BRIDGE_ENDPOINT`: REST API endpoint (default: http://localhost:4201)
- `BLENDER_BRIDGE_WS_ENDPOINT`: WebSocket endpoint (default: ws://localhost:4202)

**Docker Configuration:**
- Blender Bridge should be accessible from the server container
- Server container has host.docker.internal mapping configured to access host services

## Data Flow Examples

### Example 1: Creating a 3D Cube
```
Frontend → Software Controller → BlenderService → Blender Bridge → Blender
```

1. Client sends request to `/api/software/action/blender` with action "createCube"
2. Software controller routes request to BlenderService
3. BlenderService attempts WebSocket communication
4. If WebSocket fails, falls back to REST API call
5. Blender Bridge executes the command in Blender
6. Response is returned with success/failure and object data

### Example 2: Viewing a Model
Currently, the model viewer uses predefined sample models:
```
ModelViewer → ModelSelector → [User selects model] → ModelObject → Three.js rendering
```

## Error Handling

- The BlenderService provides mock responses when Blender is unavailable
- Error logging is implemented throughout the communication chain
- The ModelObject component displays user-friendly error messages
- Connection failures trigger automatic reconnection attempts

## Current Limitations

1. Frontend doesn't directly communicate with the Blender service
2. Model viewer uses sample models rather than fetching generated models
3. No dedicated client-side API service for the Blender integration
4. Limited real-time updates from Blender to the frontend

## Recommended Improvements

1. Create a dedicated client-side API service for Blender communication
2. Implement WebSocket connections for real-time model updates
3. Extend the model viewer to display models created in Blender
4. Add functionality to export/download created models
5. Implement user permissions and access control

## Technical Specifications

### Server Environment
- NestJS backend
- WebSockets for real-time communication
- Docker containerization
- Environment variable configuration

### Client Environment
- React frontend
- Three.js for 3D rendering
- React Three Fiber for declarative Three.js integration
- Dynamic imports for browser-only components

## Conclusion

The Blender integration provides a foundation for 3D modeling capabilities within the application. While the backend services and communication infrastructure are well-established, the frontend integration requires further development to fully utilize the capabilities of the Blender service. 