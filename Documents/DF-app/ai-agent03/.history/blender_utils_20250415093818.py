#!/usr/bin/env python
# Blender Utilities
# Veelgebruikte Blender functies voor scripts

import os

# Pad naar templates directory bepalen
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(SCRIPT_DIR, "blender_templates")

# Functies om template bestanden te lezen
def _read_template_file(filename):
    """
    Leest de inhoud van een template bestand
    
    Args:
        filename (str): Naam van het bestand in de templates directory
        
    Returns:
        str: Inhoud van het bestand
    """
    file_path = os.path.join(TEMPLATES_DIR, filename)
    try:
        with open(file_path, 'r') as file:
            return file.read()
    except FileNotFoundError:
        print(f"Waarschuwing: Template bestand {filename} niet gevonden")
        return ""

# Helpers voor het verkrijgen van templates als strings
def get_material_utilities():
    """
    Geeft alleen de materiaal utilities terug
    
    Returns:
        str: Materiaal utility functies als string
    """
    return _read_template_file("material_utils.py")

def get_scene_utilities():
    """
    Geeft alleen de scene setup utilities terug
    
    Returns:
        str: Scene setup utility functies als string
    """
    return _read_template_file("scene_setup.py")

def get_save_utilities():
    """
    Geeft alleen de save utilities terug
    
    Returns:
        str: Save utility functies als string
    """
    return _read_template_file("save_utils.py")

def get_all_utilities():
    """
    Combineert alle Blender utility functies in één string voor gebruik in client scripts
    
    Returns:
        str: Alle utility functies als één string
    """
    return (get_material_utilities() + "\n\n" + 
            get_scene_utilities() + "\n\n" + 
            get_save_utilities())

# Voorbeeld van gebruik (voor wanneer dit script direct wordt uitgevoerd)
if __name__ == "__main__":
    print("Blender Utilities geladen")
    functions_count = get_all_utilities().count('def ')
    print(f"Aantal functies beschikbaar: {functions_count}")
    
    # Check of alle bestanden geladen zijn
    missing_files = []
    for template_file in ["material_utils.py", "scene_setup.py", "save_utils.py"]:
        if not os.path.exists(os.path.join(TEMPLATES_DIR, template_file)):
            missing_files.append(template_file)
            
    if missing_files:
        print(f"Waarschuwing: De volgende template bestanden ontbreken: {', '.join(missing_files)}")
        print(f"Template directory pad: {TEMPLATES_DIR}") 