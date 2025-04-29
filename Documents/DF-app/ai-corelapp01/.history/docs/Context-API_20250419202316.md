# Context API Documentation

The Context API provides access to the design context of the currently active application (CorelDRAW or Blender). This API enables applications to track, analyze, and respond to changes in the design context.

## API Endpoints

### Status Endpoint

#### GET `/api/context/status`

Returns the current tracking status.

**Response**

```json
{
  "active": true,
  "platform": "coreldraw"
}
```

| Field | Type | Description |
|-------|------|-------------|
| active | boolean | Whether context tracking is active |
| platform | string or null | The platform being tracked, or null if not tracking |

### Tracking Endpoints

#### POST `/api/context/track/:platform`

Start tracking context for the specified platform.

**URL Parameters**

| Parameter | Description |
|-----------|-------------|
| platform | The platform to track ('coreldraw' or 'blender') |

**Response**

```json
{
  "success": true,
  "message": "Started tracking for coreldraw"
}
```

#### POST `/api/context/stop`

Stop tracking context.

**Response**

```json
{
  "success": true,
  "message": "Stopped tracking"
}
```

### Analysis Endpoint

#### GET `/api/context/analyze`

Analyze the current context and return detailed information.

**Response**

```json
{
  "context": {
    "platform": "coreldraw",
    "timestamp": 1682523298767,
    "documentProperties": {
      "name": "Document1.cdr",
      "width": 800,
      "height": 600,
      "pages": 1
    },
    "selectedObjects": ["Rectangle1", "Ellipse2"],
    "activeLayer": "Layer1",
    "viewProperties": {
      "zoom": 1.5,
      "viewportCenter": [400, 300],
      "visibleObjects": ["Rectangle1", "Ellipse2", "Text1"]
    }
  },
  "dominantElements": ["rectangle", "ellipse"],
  "suggestedActions": [
    "Edit object properties",
    "Apply fill and outline",
    "Group the selected objects"
  ],
  "relevantDocumentation": [
    {
      "title": "Working with Shapes",
      "source": "CorelDRAW API",
      "relevance": 0.85
    },
    {
      "title": "Text Formatting",
      "source": "CorelDRAW API",
      "relevance": 0.72
    }
  ],
  "visualSummary": {
    "thumbnailUrl": "/api/context/thumbnail?platform=coreldraw&t=1682523298767",
    "elementCount": 3,
    "complexity": "low"
  }
}
```

### Thumbnail Endpoint

#### GET `/api/context/thumbnail`

Get a screenshot of the current design.

**Query Parameters**

| Parameter | Description |
|-----------|-------------|
| platform | Optional. The platform to use ('coreldraw' or 'blender'). If not specified, uses the active platform. |
| t | Optional. Timestamp for cache busting. |

**Response**

Returns the image data with the appropriate Content-Type header (image/png or image/jpeg).

## Event System

The Context API also includes a WebSocket-based event system that emits context updates to connected clients.

### Events

| Event | Description | Payload |
|-------|-------------|---------|
| `context.updated` | Emitted when the context changes | ContextUpdate object |
| `context.analyzed` | Emitted after context analysis completes | ContextAnalysisResult object |

### Example WebSocket Usage

```javascript
// Connect to WebSocket
const socket = new WebSocket('ws://localhost:4001');

// Listen for context updates
socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);
  
  if (data.event === 'context.analyzed') {
    console.log('Context analysis:', data.data);
  }
});
```

## Error Handling

The API returns standard HTTP status codes:

* `200 OK` - The request was successful
* `400 Bad Request` - Invalid parameters
* `500 Internal Server Error` - Server-side error

Error responses include a message field describing the error:

```json
{
  "statusCode": 400,
  "message": "Invalid platform: photoshop. Must be 'coreldraw' or 'blender'."
}
```

## Data Models

### DesignContext

```typescript
interface DesignContext {
  platform: 'coreldraw' | 'blender';
  timestamp: number;
  documentProperties: Record<string, any>;
  selectedObjects: string[];
  activeLayer?: string;
  viewProperties: {
    zoom: number;
    viewportCenter: [number, number];
    visibleObjects: string[];
  };
  customMetadata?: Record<string, any>;
}
```

### ContextAnalysisResult

```typescript
interface ContextAnalysisResult {
  context: DesignContext;
  dominantElements: string[];
  suggestedActions: string[];
  relevantDocumentation: Array<{
    title: string;
    source: string;
    relevance: number;
  }>;
  visualSummary?: {
    thumbnailUrl: string;
    elementCount: number;
    complexity: 'low' | 'medium' | 'high';
  };
}
```

### ContextUpdate

```typescript
interface ContextUpdate {
  type: 'full' | 'partial';
  context: Partial<DesignContext>;
  changeDescription?: string;
}
```

## Usage Examples

### Start tracking CorelDRAW context

```javascript
fetch('/api/context/track/coreldraw', {
  method: 'POST'
})
.then(response => response.json())
.then(data => console.log(data));
```

### Get context analysis

```javascript
fetch('/api/context/analyze')
.then(response => response.json())
.then(analysis => {
  console.log('Document:', analysis.context.documentProperties.name);
  console.log('Selected:', analysis.context.selectedObjects);
  console.log('Suggestions:', analysis.suggestedActions);
});
```

### Display a thumbnail

```html
<img src="/api/context/thumbnail?t=1682523298767" alt="Design thumbnail" />
```

## Implementation Notes

- The Context API tracks document state changes using polling and event listeners
- Changes in selection, active layer, view properties, and document properties are tracked
- Context updates can be full updates or partial updates for efficiency
- Screenshots are captured using platform-specific APIs and returned as base64-encoded PNG or JPEG images
- Context information is used to enhance AI query results with relevant context 