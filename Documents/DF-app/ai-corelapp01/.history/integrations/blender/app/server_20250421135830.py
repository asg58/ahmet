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

app = Flask(__name__)
CORS(app)

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