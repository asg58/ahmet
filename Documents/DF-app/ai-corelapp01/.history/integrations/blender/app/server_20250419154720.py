#!/usr/bin/env python3
"""
Blender Bridge Server

Deze Flask-applicatie biedt een API voor communicatie met Blender.
Het maakt het mogelijk om Python code uit te voeren in Blender en resultaten terug te krijgen.
"""

import os
import sys
import json
import time
import base64
import tempfile
import subprocess
import threading
from typing import Dict, Any, Union, List, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from loguru import logger

# Laad omgevingsvariabelen
load_dotenv()

# Configuratie
DEBUG = os.getenv('DEBUG', 'false').lower() == 'true'
PORT = int(os.getenv('PORT', 4201))
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

# Blender instance beheer
blender_process = None
blender_lock = threading.Lock()

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

@app.route('/api/execute', methods=['POST'])
def execute_code():
    """API endpoint voor het uitvoeren van Python code in Blender"""
    data = request.json
    code = data.get('code')
    timeout = data.get('timeout', 30)
    
    if not code:
        return jsonify({
            "success": False,
            "error": "Code parameter is required"
        }), 400
    
    # Voer de code uit
    result = execute_python_in_blender(code, timeout)
    
    return jsonify(result)

@app.route('/api/object/create_cube', methods=['POST'])
def create_cube():
    """API endpoint voor het maken van een kubus in Blender"""
    data = request.json
    location = data.get('location', [0, 0, 0])
    size = data.get('size', 2.0)
    name = data.get('name', 'Cube')
    
    # Python code voor het maken van een kubus
    code = f"""
import bpy

# Verwijder bestaande objecten met dezelfde naam
if '{name}' in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects['{name}'])

# Maak een nieuwe kubus
bpy.ops.mesh.primitive_cube_add(size={size}, location=({location[0]}, {location[1]}, {location[2]}))
obj = bpy.context.active_object
obj.name = '{name}'

print(f"Kubus '{name}' gemaakt op locatie {location} met grootte {size}")
"""
    
    # Voer de code uit
    result = execute_python_in_blender(code)
    
    return jsonify(result)

@app.route('/api/object/create_sphere', methods=['POST'])
def create_sphere():
    """API endpoint voor het maken van een bol in Blender"""
    data = request.json
    location = data.get('location', [0, 0, 0])
    radius = data.get('radius', 1.0)
    name = data.get('name', 'Sphere')
    
    # Python code voor het maken van een bol
    code = f"""
import bpy

# Verwijder bestaande objecten met dezelfde naam
if '{name}' in bpy.data.objects:
    bpy.data.objects.remove(bpy.data.objects['{name}'])

# Maak een nieuwe bol
bpy.ops.mesh.primitive_uv_sphere_add(radius={radius}, location=({location[0]}, {location[1]}, {location[2]}))
obj = bpy.context.active_object
obj.name = '{name}'

print(f"Bol '{name}' gemaakt op locatie {location} met radius {radius}")
"""
    
    # Voer de code uit
    result = execute_python_in_blender(code)
    
    return jsonify(result)

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

@app.route('/api/render/scene', methods=['POST'])
def render_scene():
    """API endpoint voor het renderen van de scene in Blender"""
    data = request.json
    resolution_x = data.get('resolution_x', 1920)
    resolution_y = data.get('resolution_y', 1080)
    samples = data.get('samples', 64)
    output_path = data.get('output_path', None)
    
    # Python code voor het renderen van de scene
    code = f"""
import bpy
import base64
import os

# Configureer render settings
bpy.context.scene.render.resolution_x = {resolution_x}
bpy.context.scene.render.resolution_y = {resolution_y}
bpy.context.scene.render.image_settings.file_format = 'PNG'
bpy.context.scene.render.filepath = '/tmp/render.png'

# Configureer cycles render engine met samples
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.samples = {samples}

# Render de scene
bpy.ops.render.render(write_still=True)

print("Scene rendered to /tmp/render.png")

# Als een output path is opgegeven, sla daar op
if '{output_path}':
    try:
        import shutil
        os.makedirs(os.path.dirname('{output_path}'), exist_ok=True)
        shutil.copyfile('/tmp/render.png', '{output_path}')
        print(f"Render opgeslagen naar {output_path}")
    except Exception as e:
        print(f"Fout bij opslaan naar {output_path}: {e}")

# Geef base64 encoded image terug
try:
    with open('/tmp/render.png', 'rb') as f:
        encoded = base64.b64encode(f.read()).decode('utf-8')
        print(f"BASE64_IMAGE_DATA:{encoded}")
except Exception as e:
    print(f"Fout bij lezen van render: {e}")
"""
    
    # Voer de code uit
    result = execute_python_in_blender(code)
    
    # Probeer de base64 afbeelding te extraheren uit de output
    if result["success"]:
        output = result.get("output", "")
        base64_marker = "BASE64_IMAGE_DATA:"
        
        if base64_marker in output:
            base64_data = output.split(base64_marker)[1].strip()
            result["data"] = {
                **result.get("data", {}),
                "image_data": f"data:image/png;base64,{base64_data}",
                "resolution": {
                    "width": resolution_x,
                    "height": resolution_y
                }
            }
    
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

@app.route('/api/scene/get_objects', methods=['GET'])
def get_objects():
    """API endpoint voor het opvragen van alle objecten in de scene"""
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
    
    return jsonify(result)

if __name__ == '__main__':
    # Start Blender als de configuratie is ingesteld
    if BLENDER_PATH and not MOCK_MODE:
        start_blender()
    
    # Register shutdown hook
    def cleanup():
        stop_blender()
    
    # Start de server
    logger.info(f"Blender Bridge server gestart op http://{HOST}:{PORT}")
    logger.info(f"Debug modus: {DEBUG}")
    logger.info(f"Mock modus: {MOCK_MODE}")
    
    app.run(host=HOST, port=PORT, debug=DEBUG) 