#!/usr/bin/env python
# Blender WebSocket Configuratie
# Centrale configuratie voor alle scripts

import os
from typing import Dict, Any

# Server configuratie
SERVER_HOST = "localhost"
SERVER_PORT = 8765
SERVER_URI = f"ws://{SERVER_HOST}:{SERVER_PORT}"

# Blender executable pad
# Pas dit aan voor je specifieke Blender installatie
BLENDER_EXECUTABLE = "C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe"

# Paden en directories
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")

# Zorg ervoor dat de output directory bestaat
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Functie om een geformatteerd bestandspad te krijgen voor output
def get_output_filepath(filename: str) -> str:
    """
    Geeft een volledig bestandspad terug voor een uitvoerbestand
    
    Args:
        filename (str): De bestandsnaam
        
    Returns:
        str: Het volledige pad naar het bestand
    """
    return os.path.join(OUTPUT_DIR, filename)

# Functie om een bestandspad correct te formatteren voor Blender (dubbele backslashes in Windows)
def format_blender_path(path: str) -> str:
    """
    Formatteer een pad voor gebruik in Blender scripts
    
    Args:
        path (str): Het pad om te formatteren
        
    Returns:
        str: Geformatteerd pad veilig voor gebruik in Blender scripts
    """
    return path.replace('\\', '\\\\') 