# API Documentation

## Chat API

### GET /api/chat/health

Check the health status of the chat service.

**Response:**
```json
{
  "status": "ok"
}
```

### POST /api/chat/message

Send a message to the chat service.

**Request Body:**
```json
{
  "message": "string",
  "conversationHistory": [
    {
      "role": "user" | "assistant" | "system",
      "content": "string"
    }
  ],
  "model": "string" (optional)
}
```

**Response:**
```json
{
  "message": "string",
  "model": "string",
  "conversationHistory": [
    {
      "role": "user" | "assistant" | "system",
      "content": "string"
    }
  ]
}
```

### GET /api/chat/:sessionId/summary

Get a summary of the conversation history for a specific session.

**Parameters:**
- `sessionId` (path): Session ID for the conversation
- `maxLength` (query, optional): Maximum length of the summary in characters

**Response:**
```json
{
  "summary": "string"
}
```

## Software API

### GET /api/software/health

Check the health status of the software service.

**Response:**
```json
{
  "status": "ok",
  "connections": {
    "coreldraw": "connected" | "disconnected",
    "blender": "connected" | "disconnected"
  }
}
``` 