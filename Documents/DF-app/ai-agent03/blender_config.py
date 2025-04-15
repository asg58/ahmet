from typing import Dict, Any
import os

SERVER_HOST = 'localhost'
SERVER_PORT = 8765
SERVER_URI = f'ws://{SERVER_HOST}:{SERVER_PORT}'
BLENDER_EXECUTABLE = 'C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe'
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)
def get_output_filepath(filename: str) -> str:
    """
    Geeft een volledig bestandspad terug voor een uitvoerbestand
    
    Args:
        filename (str): De bestandsnaam
        
    Returns:
        str: Het volledige pad naar het bestand
    """
    return os.path.join(OUTPUT_DIR, filename)
def format_blender_path(path: str) -> str:
    """
    Formatteer een pad voor gebruik in Blender scripts
    
    Args:
        path (str): Het pad om te formatteren
        
    Returns:
        str: Geformatteerd pad veilig voor gebruik in Blender scripts
    """
    return path.replace('\\', '\\\\')
os
Dict
Any
SERVER_HOST
'localhost'
SERVER_PORT
8765
SERVER_URI
f'ws://{SERVER_HOST}:{SERVER_PORT}'
BLENDER_EXECUTABLE
'C:\\Program Files\\Blender Foundation\\Blender 4.4\\blender.exe'
PROJECT_ROOT
os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR
os.path.join(PROJECT_ROOT, 'output')
os.makedirs(OUTPUT_DIR, exist_ok=True)
filename: str
'\n    Geeft een volledig bestandspad terug voor een uitvoerbestand\n    \n    Args:\n        filename (str): De bestandsnaam\n        \n    Returns:\n        str: Het volledige pad naar het bestand\n    '
return os.path.join(OUTPUT_DIR, filename)
str
path: str
'\n    Formatteer een pad voor gebruik in Blender scripts\n    \n    Args:\n        path (str): Het pad om te formatteren\n        \n    Returns:\n        str: Geformatteerd pad veilig voor gebruik in Blender scripts\n    '
return path.replace('\\', '\\\\')
str



'ws://'
{SERVER_HOST}
':'
{SERVER_PORT}


os.path.dirname
os.path.abspath(__file__)

os.path.join
PROJECT_ROOT
'output'
os.makedirs
OUTPUT_DIR
exist_ok=True
filename: str
'\n    Geeft een volledig bestandspad terug voor een uitvoerbestand\n    \n    Args:\n        filename (str): De bestandsnaam\n        \n    Returns:\n        str: Het volledige pad naar het bestand\n    '
os.path.join(OUTPUT_DIR, filename)

path: str
'\n    Formatteer een pad voor gebruik in Blender scripts\n    \n    Args:\n        path (str): Het pad om te formatteren\n        \n    Returns:\n        str: Geformatteerd pad veilig voor gebruik in Blender scripts\n    '
path.replace('\\', '\\\\')

SERVER_HOST
SERVER_PORT
os.path

os.path.abspath
__file__
os.path


os


True
str
os.path.join
OUTPUT_DIR
filename
str
path.replace
'\\'
'\\\\'


os

os.path


os



os.path




path


os


os



