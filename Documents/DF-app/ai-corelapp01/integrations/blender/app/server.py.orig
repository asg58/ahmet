#!/usr/bin/env python3
"""
Blender Bridge Server

Deze Flask-applicatie biedt een API voor communicatie met Blender.
Het maakt het mogelijk om Python code uit te voeren in Blender en resultaten terug te krijgen.
Ook wordt een WebSocket server geleverd voor real-time communicatie.
"""

import os
import sys
import json
import time
import base64
import asyncio
import tempfile
import subprocess
import threading
import traceback
from typing import Dict, Any, Union, List, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from loguru import logger
import websockets
import ujson
from PIL import Image
import numpy as np
import uuid

# Laad omgevingsvariabelen
load_dotenv()

# Configuratie
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
PORT = int(os.getenv('PORT', 4201))
WEBSOCKET_PORT = int(os.getenv('WEBSOCKET_PORT', 4202))
HOST = os.getenv('HOST', '0.0.0.0')
BLENDER_PATH = os.getenv('BLENDER_PATH', '')
MOCK_MODE = os.getenv('MOCK_BLENDER', 'false').lower() == 'true'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()

# Initialiseer Flask app
app = Flask(__name__)
CORS(app)

# Configureer logger
logger.remove()
logger.add(sys.stderr, level=LOG_LEVEL)
logger.add("logs/blender_bridge_{time}.log", rotation="500 MB", level=LOG_LEVEL)

# WebSocket clients
websocket_clients = set()
websocket_lock = threading.Lock()

# Blender instance beheer
blender_process = None
blender_lock = threading.Lock()

# Status tracking
execution_status = {
    "last_command": None,
    "last_execution_time": None,
    "running": False,
    "success_count": 0,
    "error_count": 0
}

def start_blender() -> bool:
    """Start Blender als het nog niet draait"""
    global blender_process
    
    logger.info("Poging tot starten van Blender...")
    
    if MOCK_MODE:
        logger.info("Mock modus actief, Blender wordt niet gestart")
        return True
    
    if not BLENDER_PATH:
        logger.error("BLENDER_PATH is niet geconfigureerd in .env")
        return False
    
    if blender_process and blender_process.poll() is None:
        logger.info("Blender draait al")
        return True
    
    with blender_lock:
        try:
            # Start Blender in background modus
            # We gebruiken de Python-verbinding later in execute_code
            blender_process = subprocess.Popen(
                [BLENDER_PATH, "--background"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            logger.info(f"Blender gestart met PID {blender_process.pid}")
            return True
        except Exception as e:
            logger.error(f"Fout bij het starten van Blender: {e}")
            return False

def stop_blender() -> None:
    """Stop Blender als het draait"""
    global blender_process
    
    if MOCK_MODE:
        logger.info("Mock modus actief, geen Blender proces om te stoppen")
        return
    
    with blender_lock:
        if blender_process and blender_process.poll() is None:
            try:
                blender_process.terminate()
                logger.info("Blender beëindigd")
            except Exception as e:
                logger.error(f"Fout bij het stoppen van Blender: {e}")
                try:
                    blender_process.kill()
                    logger.info("Blender geforceerd beëindigd")
                except Exception as e:
                    logger.error(f"Kon Blender niet geforceerd beëindigen: {e}")
        else:
            logger.info("Geen actief Blender proces om te stoppen")

def is_blender_running() -> bool:
    """Controleer of Blender draait"""
    if MOCK_MODE:
        return True
    
    return blender_process is not None and blender_process.poll() is None

def execute_python_in_blender(code: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Voer Python code uit in Blender
    """
    if MOCK_MODE:
        logger.info(f"Python code uitvoeren in mock modus: {code[:100]}...")
        time.sleep(0.5)  # Simuleer verwerking
        return {
            "success": True,
            "output": "Code uitgevoerd in mock modus",
            "data": {
                "mock": True,
                "timestamp": time.time()
            }
        }
    
    if not is_blender_running():
        if not start_blender():
            return {
                "success": False,
                "error": "Kon geen verbinding maken met Blender"
            }
    
    # Schrijf code naar een tijdelijk bestand
    try:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as temp_file:
            temp_file_path = temp_file.name
            temp_file.write(code)
            
        logger.debug(f"Python code geschreven naar tijdelijk bestand: {temp_file_path}")
        
        # Voer de code uit in Blender
        result = subprocess.run(
            [BLENDER_PATH, "--background", "--python", temp_file_path],
            capture_output=True,
            text=True,
            timeout=timeout
        )
        
        # Verwijder het tijdelijke bestand
        os.unlink(temp_file_path)
        
        if result.returncode != 0:
            logger.error(f"Fout bij uitvoering van Python code: {result.stderr}")
            return {
                "success": False,
                "error": result.stderr,
                "output": result.stdout
            }
        
        return {
            "success": True,
            "output": result.stdout,
            "data": {
                "stderr": result.stderr,
                "returncode": result.returncode
            }
        }
    except subprocess.TimeoutExpired:
        logger.error(f"Timeout bij uitvoeren van Python code na {timeout} seconden")
        return {
            "success": False,
            "error": f"Timeout bij uitvoeren van code na {timeout} seconden"
        }
    except Exception as e:
        logger.error(f"Fout bij uitvoeren van Python code: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def get_blender_version() -> Union[str, None]:
    """Haal de Blender versie op"""
    if MOCK_MODE:
        return "Blender 3.6.0 (MOCK)"
    
    if not is_blender_running():
        if not start_blender():
            return None
    
    try:
        result = subprocess.run(
            [BLENDER_PATH, "--version"],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            version_text = result.stdout.strip()
            logger.debug(f"Blender versie: {version_text}")
            return version_text
        else:
            logger.error(f"Fout bij ophalen van Blender versie: {result.stderr}")
            return None
    except Exception as e:
        logger.error(f"Fout bij uitvoeren van Blender versie commando: {e}")
        return None

@app.route('/api/status', methods=['GET'])
def status():
    """API endpoint voor de status van de bridge"""
    return jsonify({
        "service": "running",
        "timestamp": time.time(),
        "blender": {
            "configured": bool(BLENDER_PATH),
            "running": is_blender_running(),
            "mock_mode": MOCK_MODE
        }
    })

@app.route('/api/status/blender', methods=['GET'])
def blender_status():
    """API endpoint voor de status van Blender"""
    running = is_blender_running()
    version = get_blender_version() if running else None
    
    return jsonify({
        "running": running,
        "version": version,
        "timestamp": time.time()
    })

def create_cube_internal(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Maak een kubus in Blender met de gegeven parameters
    """
    # Extract parameters
    location = data.get("location", [0, 0, 0])
    size = data.get("size", 2.0)
    name = data.get("name", f"Cube_{int(time.time())}")
    
    # Python code voor het maken van een kubus
    code = f"""
import bpy

# Verwijder de kubus als deze al bestaat
if "{name}" in bpy.data.objects:
    cube = bpy.data.objects["{name}"]
    bpy.data.objects.remove(cube)

# Maak nieuwe kubus
bpy.ops.mesh.primitive_cube_add(size={size}, location=({location[0]}, {location[1]}, {location[2]}))
cube = bpy.context.active_object
cube.name = "{name}"

# Print info voor validatie
print(f"OBJECT_CREATED:{{cube.name}}")
"""
    
    # Voer de code uit
    result = execute_python_in_blender(code)
    
    if result["success"]:
        # Extract object name for validation
        output = result.get("output", "")
        if "OBJECT_CREATED:" in output:
            object_name = output.split("OBJECT_CREATED:")[1].strip()
            result["data"] = {
                "name": object_name,
                "type": "CUBE",
                "location": location,
                "size": size
            }
    
    return result

def create_sphere_internal(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Maak een bol in Blender met de gegeven parameters
    """
    # Extract parameters
    location = data.get("location", [0, 0, 0])
    radius = data.get("radius", 1.0)
    segments = data.get("segments", 32)
    rings = data.get("rings", 16)
    name = data.get("name", f"Sphere_{int(time.time())}")
    
    # Python code voor het maken van een bol
    code = f"""
import bpy

# Verwijder de bol als deze al bestaat
if "{name}" in bpy.data.objects:
    sphere = bpy.data.objects["{name}"]
    bpy.data.objects.remove(sphere)

# Maak nieuwe bol
bpy.ops.mesh.primitive_uv_sphere_add(
    radius={radius}, 
    segments={segments}, 
    ring_count={rings}, 
    location=({location[0]}, {location[1]}, {location[2]})
)
sphere = bpy.context.active_object
sphere.name = "{name}"

# Print info voor validatie
print(f"OBJECT_CREATED:{{sphere.name}}")
"""
    
    # Voer de code uit
    result = execute_python_in_blender(code)
    
    if result["success"]:
        # Extract object name for validation
        output = result.get("output", "")
        if "OBJECT_CREATED:" in output:
            object_name = output.split("OBJECT_CREATED:")[1].strip()
            result["data"] = {
                "name": object_name,
                "type": "SPHERE",
                "location": location,
                "radius": radius,
                "segments": segments,
                "rings": rings
            }
    
    return result

def render_scene_internal(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Render de huidige scene in Blender met de gegeven parameters
    """
    # Extract parameters
    width = data.get("width", 800)
    height = data.get("height", 600)
    samples = data.get("samples", 32)
    engine = data.get("engine", "CYCLES")  # Of "BLENDER_EEVEE"
    format_type = data.get("format", "PNG")
    
    # Zorg dat de waarden binnen acceptabele ranges vallen
    width = max(50, min(width, 3840))  # Max 4K
    height = max(50, min(height, 2160))  # Max 4K
    samples = max(1, min(samples, 256))  # Redelijk bereik voor samples
    
    # Geldige engines controleren
    if engine not in ["CYCLES", "BLENDER_EEVEE"]:
        engine = "CYCLES"
    
    # Geldige formaten controleren
    if format_type not in ["PNG", "JPEG", "BMP"]:
        format_type = "PNG"
    
    # Maak een tijdelijk bestand voor de gerenderde output
    with tempfile.NamedTemporaryFile(suffix=f".{format_type.lower()}", delete=False) as temp_file:
        output_path = temp_file.name
    
    # Python code voor het renderen van de scene
    code = f"""
import bpy
import os

# Configureer render settings
scene = bpy.context.scene
scene.render.resolution_x = {width}
scene.render.resolution_y = {height}
scene.render.image_settings.file_format = '{format_type}'

# Stel render engine in
scene.render.engine = '{engine}'

# Stel samples in voor de render
if scene.render.engine == 'CYCLES':
    scene.cycles.samples = {samples}
elif scene.render.engine == 'BLENDER_EEVEE':
    scene.eevee.taa_render_samples = {samples}

# Pad voor de gerenderde output
output_path = "{output_path}"
scene.render.filepath = output_path

# Render de scene
bpy.ops.render.render(write_still=True)

# Bevestig dat het bestand bestaat
if os.path.exists(output_path):
    print(f"RENDER_COMPLETED:{{output_path}}")
else:
    print(f"RENDER_FAILED:File not found at {{output_path}}")
"""
    
    # Voer de code uit
    result = execute_python_in_blender(code, timeout=120)  # Langere timeout voor rendering
    
    # Verwerk het resultaat
    if result["success"]:
        output = result.get("output", "")
        
        # Check of de render is voltooid
        if "RENDER_COMPLETED:" in output:
            rendered_path = output.split("RENDER_COMPLETED:")[1].strip()
            
            try:
                # Lees de afbeelding en codeer naar base64
                with open(rendered_path, "rb") as image_file:
                    encoded_image = base64.b64encode(image_file.read()).decode('utf-8')
                
                # Voeg de afbeeldingsdata toe aan het resultaat
                result["data"] = {
                    "image": encoded_image,
                    "format": format_type.lower(),
                    "width": width,
                    "height": height,
                    "engine": engine,
                    "samples": samples
                }
                
                # Verwijder het tijdelijke bestand
                os.unlink(rendered_path)
            except Exception as e:
                logger.error(f"Fout bij het verwerken van het gerenderde bestand: {e}")
                result["success"] = False
                result["error"] = f"Fout bij het verwerken van het gerenderde bestand: {e}"
        
        elif "RENDER_FAILED:" in output:
            error_msg = output.split("RENDER_FAILED:")[1].strip()
            result["success"] = False
            result["error"] = f"Render mislukt: {error_msg}"
    
    return result

def get_objects_internal() -> Dict[str, Any]:
    """
    Haal alle objecten op uit de huidige Blender scene
    """
    # Python code voor het verkrijgen van objectinformatie
    code = """
import bpy
import json

objects_data = []

for obj in bpy.context.scene.objects:
    # Basisgegevens
    obj_data = {
        "name": obj.name,
        "type": obj.type,
        "location": [obj.location[0], obj.location[1], obj.location[2]],
        "rotation": [obj.rotation_euler[0], obj.rotation_euler[1], obj.rotation_euler[2]],
        "scale": [obj.scale[0], obj.scale[1], obj.scale[2]],
        "dimensions": [obj.dimensions[0], obj.dimensions[1], obj.dimensions[2]],
        "visible": obj.visible_get(),
        "select": obj.select_get(),
        "materials": []
    }
    
    # Voeg materiaalinformatie toe als het object materialen heeft
    if obj.material_slots:
        for slot in obj.material_slots:
            if slot.material:
                material = slot.material
                mat_data = {
                    "name": material.name
                }
                
                # Haal kleur op als het materiaal nodes gebruikt
                if material.use_nodes:
                    bsdf = material.node_tree.nodes.get('Principled BSDF')
                    if bsdf:
                        base_color = bsdf.inputs['Base Color'].default_value
                        mat_data["color"] = [base_color[0], base_color[1], base_color[2], base_color[3]]
                        mat_data["metallic"] = bsdf.inputs['Metallic'].default_value
                        mat_data["roughness"] = bsdf.inputs['Roughness'].default_value
                
                obj_data["materials"].append(mat_data)
    
    objects_data.append(obj_data)

# Print de data zodat we het kunnen extracten
print(f"JSON_OBJECTS_DATA:{json.dumps(objects_data)}")
"""
    
    # Voer de code uit
    result = execute_python_in_blender(code)
    
    # Extraheer de JSON data uit de output
    if result["success"]:
        output = result.get("output", "")
        json_marker = "JSON_OBJECTS_DATA:"
        
        if json_marker in output:
            json_str = output.split(json_marker)[1].strip()
            try:
                objects_data = json.loads(json_str)
                result["data"] = {
                    "objects": objects_data
                }
            except json.JSONDecodeError as e:
                logger.error(f"Fout bij decoderen van JSON: {e}")
                result["error"] = f"Fout bij decoderen van JSON: {e}"
                result["success"] = False
    
    return result

@app.route('/api/execute', methods=['POST'])
def execute_code():
    """API endpoint voor het uitvoeren van Python code in Blender"""
    try:
        data = request.json
        code = data.get('code')
        
        if not code:
            return jsonify({
                "success": False,
                "error": "Geen code opgegeven"
            })
        
        result = execute_python_in_blender(code)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Fout bij execute_code endpoint: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/object/create_cube', methods=['POST'])
def create_cube():
    """API endpoint voor het maken van een kubus in Blender"""
    try:
        data = request.json or {}
        result = create_cube_internal(data)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Fout bij create_cube endpoint: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/object/create_sphere', methods=['POST'])
def create_sphere():
    """API endpoint voor het maken van een bol in Blender"""
    try:
        data = request.json or {}
        result = create_sphere_internal(data)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Fout bij create_sphere endpoint: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/render/scene', methods=['POST'])
def render_scene():
    """API endpoint voor het renderen van de huidige scene"""
    try:
        data = request.json or {}
        result = render_scene_internal(data)
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Fout bij render_scene endpoint: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/scene/get_objects', methods=['GET'])
def get_objects():
    """API endpoint voor het opvragen van alle objecten in de scene"""
    try:
        result = get_objects_internal()
        return jsonify(result)
    
    except Exception as e:
        logger.error(f"Fout bij get_objects endpoint: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        })

@app.route('/api/material/apply', methods=['POST'])
def apply_material():
    """API endpoint voor het toepassen van een materiaal in Blender"""
    data = request.json
    object_name = data.get('object_name')
    material_name = data.get('material_name', 'NewMaterial')
    color = data.get('color', [0.8, 0.8, 0.8, 1.0])
    metallic = data.get('metallic', 0.0)
    roughness = data.get('roughness', 0.5)
    
    if not object_name:
        return jsonify({
            "success": False,
            "error": "object_name parameter is required"
        }), 400
    
    # Python code voor het toepassen van een materiaal
    code = f"""
import bpy

# Controleer of het object bestaat
if '{object_name}' not in bpy.data.objects:
    print(f"Object '{object_name}' niet gevonden")
    exit(1)

obj = bpy.data.objects['{object_name}']

# Maak een nieuw materiaal of gebruik een bestaand
if '{material_name}' in bpy.data.materials:
    mat = bpy.data.materials['{material_name}']
else:
    mat = bpy.data.materials.new(name='{material_name}')

# Configureer het materiaal
mat.use_nodes = True
nodes = mat.node_tree.nodes
bsdf = nodes.get('Principled BSDF')
if bsdf:
    bsdf.inputs['Base Color'].default_value = {color}
    bsdf.inputs['Metallic'].default_value = {metallic}
    bsdf.inputs['Roughness'].default_value = {roughness}

# Pas het materiaal toe op het object
if obj.data.materials:
    obj.data.materials[0] = mat
else:
    obj.data.materials.append(mat)

print(f"Materiaal '{material_name}' toegepast op object '{object_name}'")
"""
    
    # Voer de code uit
    result = execute_python_in_blender(code)
    
    return jsonify(result)

@app.route('/api/texture/add', methods=['POST'])
def add_texture():
    """API endpoint voor het toevoegen van een textuur aan een materiaal"""
    data = request.json
    object_name = data.get('object_name')
    material_name = data.get('material_name')
    texture_type = data.get('texture_type', 'image')
    texture_path = data.get('texture_path', '')
    
    if not object_name or not material_name:
        return jsonify({
            "success": False,
            "error": "object_name en material_name parameters zijn verplicht"
        }), 400
    
    if texture_type == 'image' and not texture_path:
        return jsonify({
            "success": False,
            "error": "texture_path parameter is verplicht voor image textures"
        }), 400
    
    # Python code voor het toevoegen van een textuur
    code = f"""
import bpy
import os

# Controleer of het object en materiaal bestaan
if '{object_name}' not in bpy.data.objects:
    print(f"Object '{object_name}' niet gevonden")
    exit(1)

obj = bpy.data.objects['{object_name}']

# Controleer of het materiaal bestaat of maak het aan
if '{material_name}' in bpy.data.materials:
    mat = bpy.data.materials['{material_name}']
else:
    mat = bpy.data.materials.new(name='{material_name}')
    # Voeg het materiaal toe aan het object als het nog geen materiaal heeft
    if not obj.data.materials:
        obj.data.materials.append(mat)

# Zorg ervoor dat het materiaal nodes gebruikt
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links

# Haal de bestaande BSDF node op
bsdf = nodes.get('Principled BSDF')
if not bsdf:
    print("Principled BSDF node niet gevonden in materiaal")
    exit(1)

# Maak een texture node aan op basis van het type
if '{texture_type}' == 'image':
    # Check if the texture file exists
    if not os.path.exists('{texture_path}'):
        print(f"Texture bestand niet gevonden: {texture_path}")
        exit(1)
        
    # Maak een image texture node
    tex_node = nodes.new('ShaderNodeTexImage')
    tex_node.location = (-300, 300)
    
    # Laad de afbeelding
    try:
        img = bpy.data.images.load('{texture_path}')
        tex_node.image = img
    except Exception as e:
        print(f"Fout bij laden van textuur: {e}")
        exit(1)
    
    # Verbind de textuur met de BSDF node
    links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
    
    print(f"Image textuur toegevoegd aan materiaal '{material_name}' op object '{object_name}'")
elif '{texture_type}' == 'procedural':
    # Maak een procedurele textuur (noise)
    noise_node = nodes.new('ShaderNodeTexNoise')
    noise_node.location = (-300, 300)
    
    # Configureer de noise texture
    noise_node.inputs['Scale'].default_value = 5.0
    
    # Verbind de noise met de BSDF node
    links.new(noise_node.outputs['Color'], bsdf.inputs['Base Color'])
    
    print(f"Procedurele textuur toegevoegd aan materiaal '{material_name}' op object '{object_name}'")
else:
    print(f"Onbekend textuur type: {texture_type}")
    exit(1)
"""
    
    # Voer de code uit
    result = execute_python_in_blender(code)
    
    return jsonify(result)

@app.route('/api/commands/available', methods=['GET'])
def available_commands():
    """API endpoint voor het opvragen van beschikbare commando's"""
    return jsonify({
        "success": True,
        "commands": [
            {
                "name": "create_cube",
                "endpoint": "/api/object/create_cube",
                "description": "Maak een kubus in de 3D scene",
                "parameters": {
                    "location": "[x, y, z] (default: [0, 0, 0])",
                    "size": "float (default: 2.0)",
                    "name": "string (default: 'Cube')"
                }
            },
            {
                "name": "create_sphere",
                "endpoint": "/api/object/create_sphere",
                "description": "Maak een bol in de 3D scene",
                "parameters": {
                    "location": "[x, y, z] (default: [0, 0, 0])",
                    "radius": "float (default: 1.0)",
                    "name": "string (default: 'Sphere')"
                }
            },
            {
                "name": "apply_material",
                "endpoint": "/api/material/apply",
                "description": "Pas een materiaal toe op een object",
                "parameters": {
                    "object_name": "string (required)",
                    "material_name": "string (default: 'NewMaterial')",
                    "color": "[r, g, b, a] (default: [0.8, 0.8, 0.8, 1.0])",
                    "metallic": "float (default: 0.0)",
                    "roughness": "float (default: 0.5)"
                }
            },
            {
                "name": "render_scene",
                "endpoint": "/api/render/scene",
                "description": "Render de huidige scene",
                "parameters": {
                    "resolution_x": "int (default: 1920)",
                    "resolution_y": "int (default: 1080)",
                    "samples": "int (default: 64)",
                    "output_path": "string (optional)"
                }
            }
        ]
    })

async def websocket_handler(websocket, path):
    """Verwerk WebSocket verbindingen"""
    client_id = str(uuid.uuid4())
    logger.info(f"Nieuwe WebSocket client verbonden: {client_id}")
    
    with websocket_lock:
        websocket_clients.add(websocket)
    
    try:
        # Stuur initiële status
        await websocket.send(ujson.dumps({
            "type": "status",
            "data": {
                "connected": True,
                "blender_running": is_blender_running(),
                "mode": "mock" if MOCK_MODE else "real",
                "version": get_blender_version() or "Onbekend"
            }
        }))
        
        # Luister naar berichten
        async for message in websocket:
            try:
                # Parse bericht
                data = ujson.loads(message)
                command = data.get("command")
                
                logger.info(f"WebSocket bericht ontvangen: {command}")
                
                # Update status
                execution_status["last_command"] = command
                execution_status["running"] = True
                
                # Stuur status update naar alle clients
                await broadcast_status("processing", {"command": command})
                
                if command == "ping":
                    await websocket.send(ujson.dumps({
                        "type": "pong",
                        "timestamp": time.time()
                    }))
                
                elif command == "execute":
                    code = data.get("code", "")
                    if not code:
                        raise ValueError("Geen code opgegeven")
                    
                    # Voer code uit in aparte thread
                    result = None
                    
                    def execute_code_thread():
                        nonlocal result
                        result = execute_python_in_blender(code)
                    
                    thread = threading.Thread(target=execute_code_thread)
                    thread.start()
                    thread.join(timeout=60)  # Wacht maximaal 60 seconden
                    
                    if thread.is_alive():
                        # Timeout
                        logger.warning("Timeout bij uitvoeren code via WebSocket")
                        result = {
                            "success": False,
                            "error": "Timeout bij uitvoeren van code na 60 seconden"
                        }
                    
                    # Resultaat sturen
                    if result["success"]:
                        execution_status["success_count"] += 1
                        await websocket.send(ujson.dumps({
                            "type": "result",
                            "success": True,
                            "data": result
                        }))
                    else:
                        execution_status["error_count"] += 1
                        await websocket.send(ujson.dumps({
                            "type": "result",
                            "success": False,
                            "error": result.get("error", "Onbekende fout"),
                            "data": result
                        }))
                
                elif command == "create_object":
                    object_type = data.get("object_type", "cube")
                    params = data.get("params", {})
                    
                    # Maak object aan via bestaande functies
                    if object_type == "cube":
                        result = create_cube_internal(params)
                    elif object_type == "sphere":
                        result = create_sphere_internal(params)
                    else:
                        result = {
                            "success": False,
                            "error": f"Onbekend object type: {object_type}"
                        }
                    
                    # Resultaat sturen
                    if result["success"]:
                        execution_status["success_count"] += 1
                        await websocket.send(ujson.dumps({
                            "type": "result",
                            "success": True,
                            "data": result
                        }))
                    else:
                        execution_status["error_count"] += 1
                        await websocket.send(ujson.dumps({
                            "type": "result",
                            "success": False,
                            "error": result.get("error", "Onbekende fout"),
                            "data": result
                        }))
                
                elif command == "get_objects":
                    # Gebruik bestaande functie
                    result = get_objects_internal()
                    
                    if result["success"]:
                        execution_status["success_count"] += 1
                        await websocket.send(ujson.dumps({
                            "type": "result",
                            "success": True,
                            "data": result
                        }))
                    else:
                        execution_status["error_count"] += 1
                        await websocket.send(ujson.dumps({
                            "type": "result",
                            "success": False,
                            "error": result.get("error", "Onbekende fout"),
                            "data": result
                        }))
                
                elif command == "render":
                    # Gebruik bestaande functie
                    params = data.get("params", {})
                    result = render_scene_internal(params)
                    
                    if result["success"]:
                        execution_status["success_count"] += 1
                        await websocket.send(ujson.dumps({
                            "type": "result",
                            "success": True,
                            "data": result
                        }))
                    else:
                        execution_status["error_count"] += 1
                        await websocket.send(ujson.dumps({
                            "type": "result",
                            "success": False,
                            "error": result.get("error", "Onbekende fout"),
                            "data": result
                        }))
                
                else:
                    await websocket.send(ujson.dumps({
                        "type": "error",
                        "error": f"Onbekend commando: {command}"
                    }))
                
                # Update status
                execution_status["running"] = False
                execution_status["last_execution_time"] = time.time()
                
                # Stuur status update naar alle clients
                await broadcast_status("idle", {"command": command, "completed": True})
                
            except Exception as e:
                logger.error(f"Fout bij verwerken WebSocket bericht: {e}")
                logger.error(traceback.format_exc())
                
                # Stuur foutmelding
                await websocket.send(ujson.dumps({
                    "type": "error",
                    "error": str(e)
                }))
                
                # Update status
                execution_status["running"] = False
                execution_status["error_count"] += 1
                
                # Stuur status update naar alle clients
                await broadcast_status("error", {"error": str(e)})
    
    except websockets.exceptions.ConnectionClosed:
        logger.info(f"WebSocket verbinding gesloten: {client_id}")
    except Exception as e:
        logger.error(f"Fout in websocket handler: {e}")
    finally:
        # Verwijder client uit lijst
        with websocket_lock:
            websocket_clients.discard(websocket)
        logger.info(f"WebSocket client verwijderd: {client_id}")

async def broadcast_status(status: str, data: Dict[str, Any] = None):
    """
    Stuur een status update naar alle verbonden WebSocket clients
    """
    if not data:
        data = {}
    
    message = ujson.dumps({
        "type": "status_update",
        "status": status,
        "timestamp": time.time(),
        "data": data
    })
    
    with websocket_lock:
        if not websocket_clients:
            return
        
        # Stuur naar alle clients
        websockets_to_remove = set()
        for client in websocket_clients:
            try:
                # We gebruiken create_task om te voorkomen dat één trage client de broadcast blokkeert
                asyncio.create_task(client.send(message))
            except:
                # Als er een fout is, markeer de client voor verwijdering
                websockets_to_remove.add(client)
        
        # Verwijder clients die een fout gaven
        for client in websockets_to_remove:
            websocket_clients.discard(client)

async def start_websocket_server():
    """
    Start de WebSocket server
    """
    logger.info(f"Starting WebSocket server on ws://{HOST}:{WEBSOCKET_PORT}")
    async with websockets.serve(websocket_handler, HOST, WEBSOCKET_PORT):
        await asyncio.Future()  # Run forever

if __name__ == '__main__':
    # Start Blender als de configuratie is ingesteld
    if BLENDER_PATH and not MOCK_MODE:
        start_blender()
    
    # Register shutdown hook
    def cleanup():
        stop_blender()
    
    # Start de WebSocket server in een aparte thread
    def start_ws_server():
        asyncio.run(start_websocket_server())
    
    ws_thread = threading.Thread(target=start_ws_server, daemon=True)
    ws_thread.start()
    
    # Start de Flask server
    logger.info(f"Blender Bridge REST server gestart op http://{HOST}:{PORT}")
    logger.info(f"Blender Bridge WebSocket server gestart op ws://{HOST}:{WEBSOCKET_PORT}")
    logger.info(f"Debug modus: {DEBUG}")
    logger.info(f"Mock modus: {MOCK_MODE}")
    
    app.run(host=HOST, port=PORT, debug=DEBUG) 