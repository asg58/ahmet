#!/usr/bin/env python
# Blender WebSocket Client Library
# Gedeelde functionaliteit voor alle client scripts

import asyncio
import json
import sys
import websockets
from typing import Dict, Any, Optional, Union

# Default WebSocket server adres
DEFAULT_SERVER_URI = "ws://localhost:8765"

async def send_bpy_script(script_code: str, server_uri: str = DEFAULT_SERVER_URI) -> Optional[Dict[str, Any]]:
    """
    Stuur een Blender Python script naar de WebSocket server
    
    Args:
        script_code (str): Blender Python code om uit te voeren
        server_uri (str): WebSocket server URI, standaard localhost:8765
        
    Returns:
        Optional[Dict[str, Any]]: Response data of None bij een fout
    """
    try:
        # Verbind met de server
        print(f"Verbinden met Blender WebSocket server op {server_uri}...")
        async with websockets.connect(server_uri) as websocket:
            print("Verbonden. Script verzenden...")
            
            # Bericht voorbereiden
            message = {
                "type": "bpy_script",
                "code": script_code
            }
            
            # Bericht versturen
            await websocket.send(json.dumps(message))
            print("Bericht verzonden, wachten op antwoord...")
            
            # Antwoord ontvangen
            response = await websocket.recv()
            response_data = json.loads(response)
            
            # Print geformatteerde response
            print("\nAntwoord van Blender:")
            print("-" * 50)
            print(f"Status: {response_data.get('status')}")
            print(f"Details: {response_data.get('details', '')}")
            
            # Print traceback bij een fout
            if response_data.get('status') != 'ok' and 'traceback' in response_data:
                print("\nError Traceback:")
                print(response_data.get('traceback'))
                
            print("-" * 50)
            
            return response_data
            
    except ConnectionRefusedError:
        print(f"Fout: Kon geen verbinding maken met {server_uri}")
        print("Controleer of de Blender WebSocket server draait.")
        print("Start met: blender -b -P blender_agent/websocket_server.py")
    except Exception as e:
        print(f"Fout: {str(e)}")
    
    return None

def setup_asyncio_for_windows() -> None:
    """
    Stel asyncio correct in voor Windows platforms
    """
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy()) 