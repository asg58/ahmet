import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(SCRIPT_DIR, 'blender_templates')
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
        print(f'Waarschuwing: Template bestand {filename} niet gevonden')
        return ''
def get_material_utilities():
    """
    Geeft alleen de materiaal utilities terug
    
    Returns:
        str: Materiaal utility functies als string
    """
    return _read_template_file('material_utils.py')
def get_scene_utilities():
    """
    Geeft alleen de scene setup utilities terug
    
    Returns:
        str: Scene setup utility functies als string
    """
    return _read_template_file('scene_setup.py')
def get_save_utilities():
    """
    Geeft alleen de save utilities terug
    
    Returns:
        str: Save utility functies als string
    """
    return _read_template_file('save_utils.py')
def get_all_utilities():
    """
    Combineert alle Blender utility functies in één string voor gebruik in client scripts
    
    Returns:
        str: Alle utility functies als één string
    """
    return get_material_utilities() + '\n\n' + get_scene_utilities() + '\n\n' + get_save_utilities()
if __name__ == '__main__':
    print('Blender Utilities geladen')
    functions_count = get_all_utilities().count('def ')
    print(f'Aantal functies beschikbaar: {functions_count}')
    missing_files = []
    for template_file in ['material_utils.py', 'scene_setup.py', 'save_utils.py']:
        if not os.path.exists(os.path.join(TEMPLATES_DIR, template_file)):
            missing_files.append(template_file)
    if missing_files:
        print(f"Waarschuwing: De volgende template bestanden ontbreken: {', '.join(missing_files)}")
        print(f'Template directory pad: {TEMPLATES_DIR}')
os
SCRIPT_DIR
os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR
os.path.join(SCRIPT_DIR, 'blender_templates')
filename
'\n    Leest de inhoud van een template bestand\n    \n    Args:\n        filename (str): Naam van het bestand in de templates directory\n        \n    Returns:\n        str: Inhoud van het bestand\n    '
file_path = os.path.join(TEMPLATES_DIR, filename)
try:
    with open(file_path, 'r') as file:
        return file.read()
except FileNotFoundError:
    print(f'Waarschuwing: Template bestand {filename} niet gevonden')
    return ''

'\n    Geeft alleen de materiaal utilities terug\n    \n    Returns:\n        str: Materiaal utility functies als string\n    '
return _read_template_file('material_utils.py')

'\n    Geeft alleen de scene setup utilities terug\n    \n    Returns:\n        str: Scene setup utility functies als string\n    '
return _read_template_file('scene_setup.py')

'\n    Geeft alleen de save utilities terug\n    \n    Returns:\n        str: Save utility functies als string\n    '
return _read_template_file('save_utils.py')

'\n    Combineert alle Blender utility functies in één string voor gebruik in client scripts\n    \n    Returns:\n        str: Alle utility functies als één string\n    '
return get_material_utilities() + '\n\n' + get_scene_utilities() + '\n\n' + get_save_utilities()
__name__ == '__main__'
print('Blender Utilities geladen')
functions_count = get_all_utilities().count('def ')
print(f'Aantal functies beschikbaar: {functions_count}')
missing_files = []
for template_file in ['material_utils.py', 'scene_setup.py', 'save_utils.py']:
    if not os.path.exists(os.path.join(TEMPLATES_DIR, template_file)):
        missing_files.append(template_file)
if missing_files:
    print(f"Waarschuwing: De volgende template bestanden ontbreken: {', '.join(missing_files)}")
    print(f'Template directory pad: {TEMPLATES_DIR}')

os.path.dirname
os.path.abspath(__file__)

os.path.join
SCRIPT_DIR
'blender_templates'
filename
'\n    Leest de inhoud van een template bestand\n    \n    Args:\n        filename (str): Naam van het bestand in de templates directory\n        \n    Returns:\n        str: Inhoud van het bestand\n    '
file_path
os.path.join(TEMPLATES_DIR, filename)
with open(file_path, 'r') as file:
    return file.read()
except FileNotFoundError:
    print(f'Waarschuwing: Template bestand {filename} niet gevonden')
    return ''
'\n    Geeft alleen de materiaal utilities terug\n    \n    Returns:\n        str: Materiaal utility functies als string\n    '
_read_template_file('material_utils.py')
'\n    Geeft alleen de scene setup utilities terug\n    \n    Returns:\n        str: Scene setup utility functies als string\n    '
_read_template_file('scene_setup.py')
'\n    Geeft alleen de save utilities terug\n    \n    Returns:\n        str: Save utility functies als string\n    '
_read_template_file('save_utils.py')
'\n    Combineert alle Blender utility functies in één string voor gebruik in client scripts\n    \n    Returns:\n        str: Alle utility functies als één string\n    '
get_material_utilities() + '\n\n' + get_scene_utilities() + '\n\n' + get_save_utilities()
__name__

'__main__'
print('Blender Utilities geladen')
functions_count
get_all_utilities().count('def ')
print(f'Aantal functies beschikbaar: {functions_count}')
missing_files
[]
template_file
['material_utils.py', 'scene_setup.py', 'save_utils.py']
if not os.path.exists(os.path.join(TEMPLATES_DIR, template_file)):
    missing_files.append(template_file)
missing_files
print(f"Waarschuwing: De volgende template bestanden ontbreken: {', '.join(missing_files)}")
print(f'Template directory pad: {TEMPLATES_DIR}')
os.path

os.path.abspath
__file__
os.path



os.path.join
TEMPLATES_DIR
filename
open(file_path, 'r') as file
return file.read()
FileNotFoundError
print(f'Waarschuwing: Template bestand {filename} niet gevonden')
return ''
_read_template_file
'material_utils.py'
_read_template_file
'scene_setup.py'
_read_template_file
'save_utils.py'
get_material_utilities() + '\n\n' + get_scene_utilities() + '\n\n'

get_save_utilities()

print
'Blender Utilities geladen'

get_all_utilities().count
'def '
print
f'Aantal functies beschikbaar: {functions_count}'



'material_utils.py'
'scene_setup.py'
'save_utils.py'

not os.path.exists(os.path.join(TEMPLATES_DIR, template_file))
missing_files.append(template_file)

print(f"Waarschuwing: De volgende template bestanden ontbreken: {', '.join(missing_files)}")
print(f'Template directory pad: {TEMPLATES_DIR}')
os

os.path


os

os.path



open(file_path, 'r')
file
file.read()

print(f'Waarschuwing: Template bestand {filename} niet gevonden')
''



get_material_utilities() + '\n\n' + get_scene_utilities()

'\n\n'
get_save_utilities

get_all_utilities()


'Aantal functies beschikbaar: '
{functions_count}

os.path.exists(os.path.join(TEMPLATES_DIR, template_file))
missing_files.append(template_file)
print
f"Waarschuwing: De volgende template bestanden ontbreken: {', '.join(missing_files)}"
print
f'Template directory pad: {TEMPLATES_DIR}'

os


os

open
file_path
'r'

file.read
print
f'Waarschuwing: Template bestand {filename} niet gevonden'
get_material_utilities() + '\n\n'

get_scene_utilities()

get_all_utilities
functions_count
os.path.exists
os.path.join(TEMPLATES_DIR, template_file)
missing_files.append
template_file

'Waarschuwing: De volgende template bestanden ontbreken: '
{', '.join(missing_files)}

'Template directory pad: '
{TEMPLATES_DIR}




file


'Waarschuwing: Template bestand '
{filename}
' niet gevonden'
get_material_utilities()

'\n\n'
get_scene_utilities


os.path

os.path.join
TEMPLATES_DIR
template_file
missing_files


', '.join(missing_files)
TEMPLATES_DIR

filename
get_material_utilities

os

os.path




', '.join
missing_files




os

', '


