# Blender and CorelDRAW Integration: Frontend-Backend Analysis

## Overview

This document provides a comprehensive analysis of the integration between the frontend client and backend server for both Blender and CorelDRAW functionality within the application. The integration enables the application to communicate with these design software platforms for 3D modeling, 2D vector design, rendering, and model/shape viewing.

## Architecture Components

### Frontend Components

#### Model Viewer
- **Main Component**: `ModelViewer` (client/src/components/viewer/model-viewer.tsx)
  - Renders 3D models using Three.js via React Three Fiber
  - Handles model selection, loading, and viewing options
  - Uses real models from Blender or sample models if unavailable
  - Supports vector shapes from CorelDRAW

#### Scene Components
- **ViewerScene** (client/src/components/viewer/scene/viewer-scene.tsx)
  - Configures the 3D scene with lighting, camera, controls
  - Uses React Three Fiber's Canvas, OrbitControls, Grid, Environment, etc.

#### Model Object
- **ModelObject** (client/src/components/viewer/scene/model-object.tsx)
  - Loads and displays GLTF/GLB 3D models
  - Handles loading states and errors
  - Applies wireframe and other visual properties

#### Vector Object
- **VectorObject** (client/src/components/viewer/scene/vector-object.tsx)
  - Renders vector data from CorelDRAW as 3D objects
  - Supports extrusion of 2D shapes into 3D

#### User Interface
- **ModelSelector** (client/src/components/viewer/model-selector.tsx)
  - Provides UI for selecting different models to view
  - Displays thumbnails and model information

### Client API Services

#### Blender API Service (`client/src/lib/blender-api.service.ts`)
- Client-side service for communicating with Blender endpoints
- Provides methods for:
  - Checking connection status
  - Fetching models
  - Creating 3D objects
  - Applying materials
  - Rendering scenes
  - Executing Python code
- Includes type definitions for API responses
- Handles error scenarios gracefully with fallbacks

#### CorelDRAW API Service (`client/src/lib/coreldraw-api.service.ts`)
- Client-side service for communicating with CorelDRAW endpoints
- Provides methods for:
  - Checking connection status
  - Fetching design context and shapes
  - Creating vector shapes (rectangles, ellipses, text)
  - Applying colors and properties
  - Grouping/ungrouping objects
  - Exporting documents to various formats
  - Executing custom code
- Includes SVG generation for previewing shapes
- Converts CorelDRAW shapes to ModelInfo format for the viewer

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

#### CorelDRAW Service (`server/src/software/coreldraw.service.ts`)
- NestJS service that communicates with the CorelDRAW API
- Manages connection to CorelDRAW
- Provides operations:
  - Creating vector shapes
  - Modifying object properties
  - Retrieving document context
  - Executing custom commands
  - Exporting documents

#### Software Controller (`server/src/software/software.controller.ts`)
- Exposes REST API endpoints for both software platforms
- Blender endpoints:
  - `GET /api/software/blender/status`: Check Blender connection status
  - `GET /api/software/blender/models`: Get models from Blender
  - `POST /api/software/blender/render`: Render Blender scene
  - `POST /api/software/blender/execute`: Execute Python code
  - `POST /api/software/execute/blender`: Execute commands
  - `POST /api/software/action/blender`: Execute actions with parameters
- CorelDRAW endpoints:
  - `GET /api/software/coreldraw/status`: Check CorelDRAW connection status
  - `GET /api/software/coreldraw/shapes`: Get shapes from CorelDRAW
  - `POST /api/software/coreldraw/export`: Export document
  - `POST /api/software/coreldraw/execute`: Execute code
  - `POST /api/software/execute/coreldraw`: Execute commands
  - `POST /api/software/action/coreldraw`: Execute actions with parameters

#### Universal Object Model (`server/src/software/universal/blender-object-model.ts` and `coreldraw-object-model.ts`)
- Provides a universal interface for interacting with both software platforms
- Maps common operations to platform-specific commands
- Methods:
  - `getProperty`: Read object properties
  - `setProperty`: Set object properties
  - `invokeMethod`: Call methods on objects
  - `getCurrentContext`: Get current design context

#### Context Trackers
- **BlenderContextTracker** (`server/src/context/blender-context-tracker.ts`)
  - Tracks design context changes in Blender
  - Captures snapshots of the current state
  - Fetches scene information using Python code execution
- **CorelContextTracker** (similar structure for CorelDRAW)
  - Tracks design context changes in CorelDRAW
  - Monitors selected shapes and document properties

## Communication Flow

### WebSocket Communication
1. `BlenderService` establishes a WebSocket connection to the Blender Bridge
2. The service attempts multiple connection endpoints (localhost, host.docker.internal)
3. If connected, it sends messages using `sendWebSocketMessage` method
4. The service handles reconnection attempts if the connection is lost

### REST Communication
1. REST API calls are made for both Blender and CorelDRAW services
2. Endpoints are configured via environment variables
3. API services use standardized interfaces for both platforms
4. Error handling provides fallback mechanisms

### Frontend-Backend Integration
1. Client-side API services communicate with backend controllers
2. Model/shape data is fetched and transformed for the viewer
3. Creation operations trigger updates in the model list
4. Real-time status indicators show connection state

### Configuration

**Environment Variables:**
- `BLENDER_BRIDGE_ENDPOINT`: REST API endpoint for Blender (default: http://localhost:4201)
- `BLENDER_BRIDGE_WS_ENDPOINT`: WebSocket endpoint for Blender (default: ws://localhost:4202)
- `CORELDRAW_HOST`: Host for CorelDRAW service (default: localhost)
- `CORELDRAW_PORT`: Port for CorelDRAW service (default: 4500)

**Docker Configuration:**
- Services should be accessible from the server container
- Server container has host.docker.internal mapping configured to access host services

## Data Flow Examples

### Example 1: Creating a 3D Cube in Blender
```
Frontend → blenderApiService.createCube() → Software Controller → BlenderService → Blender Bridge → Blender
```

1. User clicks "Create Cube" button in UI
2. `blenderApiService.createCube()` makes request to `/api/software/action/blender`
3. SoftwareController routes request to BlenderService
4. BlenderService attempts WebSocket communication
5. If WebSocket fails, falls back to REST API call
6. Blender Bridge executes the command in Blender
7. Response is returned with success/failure and object data
8. New model is added to the model list and displayed in the viewer

### Example 2: Creating a Rectangle in CorelDRAW
```
Frontend → corelDrawApiService.createRectangle() → Software Controller → CorelDrawService → CorelDRAW
```

1. User triggers rectangle creation
2. `corelDrawApiService.createRectangle()` makes request to `/api/software/action/coreldraw`
3. SoftwareController routes request to CorelDrawService
4. CorelDrawService executes the command in CorelDRAW
5. Response is returned with shape data
6. New shape is converted to vector format and displayed in the viewer

## Error Handling

- API services provide mock responses when services are unavailable
- Error logging is implemented throughout the communication chain
- UI components display user-friendly error messages
- Connection failures trigger automatic reconnection attempts
- Fallback to sample models/shapes when APIs are unavailable

## Current Limitations

1. Limited real-time updates between software platforms and frontend
2. SVG generation for CorelDRAW shapes is simplified
3. File export path handling needs improvement
4. Thumbnails for models and shapes need to be generated automatically

## Recommended Improvements

1. Implement WebSocket connections for real-time updates from both platforms
2. Enhance SVG generation for more accurate representation of CorelDRAW shapes
3. Add file storage and retrieval system for exported models and documents
4. Implement user permissions and access control
5. Add automatic thumbnail generation for models and shapes

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
- SVG support for vector shape rendering
- Dynamic imports for browser-only components

## Conclusion

The integration with both Blender and CorelDRAW provides a foundation for comprehensive design capabilities within the application. The architecture allows for seamless switching between 3D modeling and 2D vector design, with a unified viewer interface. The client-side API services provide a clean abstraction for communicating with the backend, handling errors gracefully and providing fallback mechanisms. While the backend services and communication infrastructure are well-established, some aspects of the frontend integration require further development to fully utilize the capabilities of both design platforms. 