import asyncio
import websockets
import os
import sys

async def handler(websocket, path):
    print(f"Connection established with path: {path}")
    try:
        async for message in websocket:
            print(f"Received message: {message}")
            await websocket.send(f"Echo: {message}")
    except Exception as e:
        print(f"Error in handler: {e}")

async def main():
    port = int(os.getenv('WEBSOCKET_PORT', 4203))
    host = '0.0.0.0'
    
    print(f"Starting WebSocket server on {host}:{port}")
    print(f"Using websockets version: {websockets.__version__}")
    
    try:
        server = await websockets.serve(handler, host, port)
        print("WebSocket server started successfully!")
        await asyncio.Future()  # Run forever
    except Exception as e:
        print(f"Failed to start server: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user")
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc() 