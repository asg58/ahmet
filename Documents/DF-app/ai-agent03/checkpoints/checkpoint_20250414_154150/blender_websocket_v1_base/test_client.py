#!/usr/bin/env python
# Test Client for Blender WebSocket Server
# Run with: python test_client.py

import asyncio
import json
import sys
import websockets

# WebSocket server address
SERVER_URI = "ws://localhost:8765"

async def send_bpy_script(uri, script_code):
    """
    Send a script to the Blender WebSocket server and get the response.
    
    Args:
        uri (str): WebSocket server URI
        script_code (str): Blender Python code to execute
    """
    try:
        # Connect to the server
        print(f"Connecting to {uri}...")
        async with websockets.connect(uri) as websocket:
            print("Connected. Sending bpy script...")
            
            # Prepare the message
            message = {
                "type": "bpy_script",
                "code": script_code
            }
            
            # Send the message as JSON
            await websocket.send(json.dumps(message))
            print(f"Message sent. Waiting for response...")
            
            # Wait for the response
            response = await websocket.recv()
            parsed_response = json.loads(response)
            
            # Print formatted response
            print("\nResponse from Blender:")
            print("-" * 50)
            print(f"Status: {parsed_response.get('status')}")
            print(f"Details: {parsed_response.get('details')}")
            
            # Print traceback if there was an error
            if parsed_response.get('status') == 'error' and 'traceback' in parsed_response:
                print("\nError Traceback:")
                print(parsed_response.get('traceback'))
                
            print("-" * 50)
            
            return parsed_response
            
    except Exception as e:
        if "connect" in str(e).lower() or "connection" in str(e).lower() or "refused" in str(e).lower():
            print(f"Error: Could not connect to {uri}")
            print("Make sure Blender is running with the WebSocket server script.")
            print("Run: blender -b -P blender_agent/websocket_server.py")
        else:
            print(f"Error: {str(e)}")
        return None

async def main():
    # Example Blender script to create a cube
    cube_script = """
import bpy

# Clear existing objects (optional)
bpy.ops.object.select_all(action='DESELECT')
bpy.ops.object.select_by_type(type='MESH')
bpy.ops.object.delete()

# Create a cube
bpy.ops.mesh.primitive_cube_add(size=2, location=(0, 0, 0))

# Name the cube
cube = bpy.context.active_object
cube.name = 'WebSocketCube'

# Add a material
material = bpy.data.materials.new(name="CubeMaterial")
material.diffuse_color = (1, 0, 0, 1)  # Red color
cube.data.materials.append(material)

print("Cube created successfully!")
"""

    # Send the script to Blender
    await send_bpy_script(SERVER_URI, cube_script)

if __name__ == "__main__":
    try:
        # For Windows compatibility
        if sys.platform == 'win32':
            asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
            
        # Run the main function
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nClient stopped by keyboard interrupt")
    except Exception as e:
        print(f"Client error: {e}") 