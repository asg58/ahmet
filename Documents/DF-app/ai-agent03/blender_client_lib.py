from typing import Dict, Any, Optional, Union
import asyncio
import json
import sys
import websockets

DEFAULT_SERVER_URI = 'ws://localhost:8765'
async def send_bpy_script(script_code: str, server_uri: str=DEFAULT_SERVER_URI) -> Optional[Dict[str, Any]]:
    """
    Stuur een Blender Python script naar de WebSocket server
    
    Args:
        script_code (str): Blender Python code om uit te voeren
        server_uri (str): WebSocket server URI, standaard localhost:8765
        
    Returns:
        Optional[Dict[str, Any]]: Response data of None bij een fout
    """
    try:
        print(f'Verbinden met Blender WebSocket server op {server_uri}...')
        async with websockets.connect(server_uri) as websocket:
            print('Verbonden. Script verzenden...')
            message = {'type': 'bpy_script', 'code': script_code}
            await websocket.send(json.dumps(message))
            print('Bericht verzonden, wachten op antwoord...')
            response = await websocket.recv()
            response_data = json.loads(response)
            print('\nAntwoord van Blender:')
            print('-' * 50)
            print(f"Status: {response_data.get('status')}")
            print(f"Details: {response_data.get('details', '')}")
            if response_data.get('status') != 'ok' and 'traceback' in response_data:
                print('\nError Traceback:')
                print(response_data.get('traceback'))
            print('-' * 50)
            return response_data
    except ConnectionRefusedError:
        print(f'Fout: Kon geen verbinding maken met {server_uri}')
        print('Controleer of de Blender WebSocket server draait.')
        print('Start met: blender -b -P blender_agent/websocket_server.py')
    except Exception as e:
        print(f'Fout: {str(e)}')
    return None
def setup_asyncio_for_windows() -> None:
    """
    Stel asyncio correct in voor Windows platforms
    """
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio
json
sys
websockets
Dict
Any
Optional
Union
DEFAULT_SERVER_URI
'ws://localhost:8765'
script_code: str, server_uri: str=DEFAULT_SERVER_URI
'\n    Stuur een Blender Python script naar de WebSocket server\n    \n    Args:\n        script_code (str): Blender Python code om uit te voeren\n        server_uri (str): WebSocket server URI, standaard localhost:8765\n        \n    Returns:\n        Optional[Dict[str, Any]]: Response data of None bij een fout\n    '
try:
    print(f'Verbinden met Blender WebSocket server op {server_uri}...')
    async with websockets.connect(server_uri) as websocket:
        print('Verbonden. Script verzenden...')
        message = {'type': 'bpy_script', 'code': script_code}
        await websocket.send(json.dumps(message))
        print('Bericht verzonden, wachten op antwoord...')
        response = await websocket.recv()
        response_data = json.loads(response)
        print('\nAntwoord van Blender:')
        print('-' * 50)
        print(f"Status: {response_data.get('status')}")
        print(f"Details: {response_data.get('details', '')}")
        if response_data.get('status') != 'ok' and 'traceback' in response_data:
            print('\nError Traceback:')
            print(response_data.get('traceback'))
        print('-' * 50)
        return response_data
except ConnectionRefusedError:
    print(f'Fout: Kon geen verbinding maken met {server_uri}')
    print('Controleer of de Blender WebSocket server draait.')
    print('Start met: blender -b -P blender_agent/websocket_server.py')
except Exception as e:
    print(f'Fout: {str(e)}')
return None
Optional[Dict[str, Any]]

'\n    Stel asyncio correct in voor Windows platforms\n    '
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
None

script_code: str
server_uri: str
DEFAULT_SERVER_URI
'\n    Stuur een Blender Python script naar de WebSocket server\n    \n    Args:\n        script_code (str): Blender Python code om uit te voeren\n        server_uri (str): WebSocket server URI, standaard localhost:8765\n        \n    Returns:\n        Optional[Dict[str, Any]]: Response data of None bij een fout\n    '
print(f'Verbinden met Blender WebSocket server op {server_uri}...')
async with websockets.connect(server_uri) as websocket:
    print('Verbonden. Script verzenden...')
    message = {'type': 'bpy_script', 'code': script_code}
    await websocket.send(json.dumps(message))
    print('Bericht verzonden, wachten op antwoord...')
    response = await websocket.recv()
    response_data = json.loads(response)
    print('\nAntwoord van Blender:')
    print('-' * 50)
    print(f"Status: {response_data.get('status')}")
    print(f"Details: {response_data.get('details', '')}")
    if response_data.get('status') != 'ok' and 'traceback' in response_data:
        print('\nError Traceback:')
        print(response_data.get('traceback'))
    print('-' * 50)
    return response_data
except ConnectionRefusedError:
    print(f'Fout: Kon geen verbinding maken met {server_uri}')
    print('Controleer of de Blender WebSocket server draait.')
    print('Start met: blender -b -P blender_agent/websocket_server.py')
except Exception as e:
    print(f'Fout: {str(e)}')
None
Optional
Dict[str, Any]

'\n    Stel asyncio correct in voor Windows platforms\n    '
sys.platform == 'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
str
str

print(f'Verbinden met Blender WebSocket server op {server_uri}...')
websockets.connect(server_uri) as websocket
print('Verbonden. Script verzenden...')
message = {'type': 'bpy_script', 'code': script_code}
await websocket.send(json.dumps(message))
print('Bericht verzonden, wachten op antwoord...')
response = await websocket.recv()
response_data = json.loads(response)
print('\nAntwoord van Blender:')
print('-' * 50)
print(f"Status: {response_data.get('status')}")
print(f"Details: {response_data.get('details', '')}")
if response_data.get('status') != 'ok' and 'traceback' in response_data:
    print('\nError Traceback:')
    print(response_data.get('traceback'))
print('-' * 50)
return response_data
ConnectionRefusedError
print(f'Fout: Kon geen verbinding maken met {server_uri}')
print('Controleer of de Blender WebSocket server draait.')
print('Start met: blender -b -P blender_agent/websocket_server.py')
Exception
print(f'Fout: {str(e)}')

Dict
(str, Any)

sys.platform

'win32'
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


print
f'Verbinden met Blender WebSocket server op {server_uri}...'
websockets.connect(server_uri)
websocket
print('Verbonden. Script verzenden...')
message
{'type': 'bpy_script', 'code': script_code}
await websocket.send(json.dumps(message))
print('Bericht verzonden, wachten op antwoord...')
response
await websocket.recv()
response_data
json.loads(response)
print('\nAntwoord van Blender:')
print('-' * 50)
print(f"Status: {response_data.get('status')}")
print(f"Details: {response_data.get('details', '')}")
response_data.get('status') != 'ok' and 'traceback' in response_data
print('\nError Traceback:')
print(response_data.get('traceback'))
print('-' * 50)
response_data

print(f'Fout: Kon geen verbinding maken met {server_uri}')
print('Controleer of de Blender WebSocket server draait.')
print('Start met: blender -b -P blender_agent/websocket_server.py')

print(f'Fout: {str(e)}')

str
Any

sys

asyncio.set_event_loop_policy
asyncio.WindowsSelectorEventLoopPolicy()

'Verbinden met Blender WebSocket server op '
{server_uri}
'...'
websockets.connect
server_uri

print
'Verbonden. Script verzenden...'

'type'
'code'
'bpy_script'
script_code
websocket.send(json.dumps(message))
print
'Bericht verzonden, wachten op antwoord...'

websocket.recv()

json.loads
response
print
'\nAntwoord van Blender:'
print
'-' * 50
print
f"Status: {response_data.get('status')}"
print
f"Details: {response_data.get('details', '')}"

response_data.get('status') != 'ok'
'traceback' in response_data
print('\nError Traceback:')
print(response_data.get('traceback'))
print
'-' * 50

print
f'Fout: Kon geen verbinding maken met {server_uri}'
print
'Controleer of de Blender WebSocket server draait.'
print
'Start met: blender -b -P blender_agent/websocket_server.py'
print
f'Fout: {str(e)}'



asyncio

asyncio.WindowsSelectorEventLoopPolicy
server_uri
websockets




websocket.send
json.dumps(message)

websocket.recv
json




'-'

50

'Status: '
{response_data.get('status')}

'Details: '
{response_data.get('details', '')}
response_data.get('status')

'ok'
'traceback'

response_data
print
'\nError Traceback:'
print
response_data.get('traceback')

'-'

50

'Fout: Kon geen verbinding maken met '
{server_uri}



'Fout: '
{str(e)}

asyncio



websocket

json.dumps
message
websocket


response_data.get('status')
response_data.get('details', '')
response_data.get
'status'



response_data.get
'traceback'
server_uri
str(e)


json



response_data.get
'status'
response_data.get
'details'
''
response_data

response_data


str
e

response_data

response_data






