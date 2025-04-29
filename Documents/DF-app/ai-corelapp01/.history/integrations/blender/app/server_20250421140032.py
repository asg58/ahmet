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
import uuid
from typing import Dict, Any, Union, List, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from loguru import logger
import websockets
import ujson
from PIL import Image
import numpy as np

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