#!/usr/bin/env python
"""
Validatiescript voor pre-commit hook.
Controleert of gewijzigde bestanden voldoen aan de richtlijnen in de Developer Guide.
"""

import os
import re
import sys
import subprocess

# Voeg de root directory toe aan path voor imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from context_helper import ContextHelper

def get_modified_files():
    """Haal lijst van gewijzigde bestanden op via git"""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
            stdout=subprocess.PIPE,
            text=True,
            check=True
        )
        return result.stdout.strip().split('\n')
    except subprocess.CalledProcessError:
        print("Fout bij ophalen van gewijzigde bestanden uit git")
        return []

def is_python_file(file_path):
    """Controleer of het bestand een Python bestand is"""
    return file_path.endswith('.py')

def read_file_content(file_path):
    """Lees de inhoud van een bestand"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Kan bestand niet lezen: {file_path} - {e}")
        return None

def check_naming_conventions(file_path, content):
    """Controleer of het bestand voldoet aan de benaming conventies"""
    # Extracteer bestandsnaam zonder pad
    filename = os.path.basename(file_path)
    
    # Regels voor bestandsnamen
    if 'test' in filename and not filename.startswith('test_'):
        return False, f"Bestanden met tests moeten beginnen met 'test_': {filename}"
    
    # Controleer className vs filename voor classes
    class_match = re.search(r'class\s+([A-Za-z0-9_]+)', content)
    if class_match:
        class_name = class_match.group(1)
        if 'Helper' in class_name and 'helper' not in filename:
            return False, f"Helper class {class_name} zou in een bestand met 'helper' in de naam moeten staan"
        if 'Server' in class_name and 'server' not in filename:
            return False, f"Server class {class_name} zou in een bestand met 'server' in de naam moeten staan"
    
    return True, ""

def check_module_structure(file_path, content, helper):
    """Controleer of het bestand voldoet aan de structuur van het juiste component"""
    
    # Bepaal component type op basis van bestandspad of inhoud
    component_type = None
    
    if 'server' in file_path.lower():
        component_type = "WebSocket Server"
    elif 'web_interface' in file_path.lower():
        component_type = "Web Interface"
    elif 'chroma_db' in file_path.lower():
        component_type = "Database Integratie"
    
    # Als we een component type hebben gedetecteerd, controleer dan de richtlijnen
    if component_type:
        component_info = helper.get_component_info(component_type)
        
        # Eenvoudige check: is de implementatie consistent met wat de guide beschrijft
        if component_type == "WebSocket Server":
            if 'websocket' not in content.lower() or 'bpy' not in content.lower():
                return False, f"WebSocket Server implementatie mist essentiële componenten (websocket/bpy)"
        elif component_type == "Web Interface":
            if 'flask' not in content.lower() or 'route' not in content.lower():
                return False, f"Web Interface implementatie mist essentiële Flask componenten"
        elif component_type == "Database Integratie":
            if 'chroma' not in content.lower():
                return False, f"Database implementatie mist ChromaDB integratie"
    
    return True, ""

def validate_file(file_path, helper):
    """Valideer een enkele bestand tegen de guide richtlijnen"""
    content = read_file_content(file_path)
    if content is None:
        return False, f"Kan bestand niet lezen: {file_path}"
    
    # Voer verschillende checks uit
    naming_ok, naming_msg = check_naming_conventions(file_path, content)
    if not naming_ok:
        return False, naming_msg
    
    structure_ok, structure_msg = check_module_structure(file_path, content, helper)
    if not structure_ok:
        return False, structure_msg
    
    return True, ""

def main():
    guide_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "DEVELOPER_GUIDE.md")
    
    if not os.path.exists(guide_path):
        print(f"FOUT: Developer Guide niet gevonden op: {guide_path}")
        return 1
    
    # Instantieer de helper
    helper = ContextHelper(guide_path)
    
    # Haal gewijzigde bestanden op
    modified_files = get_modified_files()
    
    if not modified_files or modified_files == ['']:
        print("Geen gewijzigde bestanden gevonden")
        return 0
    
    # Filter Python bestanden
    python_files = [f for f in modified_files if is_python_file(f)]
    
    if not python_files:
        print("Geen gewijzigde Python bestanden gevonden")
        return 0
    
    print(f"Valideren van {len(python_files)} Python bestand(en)...")
    
    # Valideer elk bestand
    all_valid = True
    for file_path in python_files:
        valid, message = validate_file(file_path, helper)
        if not valid:
            all_valid = False
            print(f"FOUT in {file_path}: {message}")
        else:
            print(f"OK: {file_path}")
    
    if all_valid:
        print("Alle bestanden voldoen aan de Developer Guide richtlijnen!")
        return 0
    else:
        print("Er zijn bestanden die niet voldoen aan de Developer Guide richtlijnen.")
        print("Zie bovenstaande meldingen voor details.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 