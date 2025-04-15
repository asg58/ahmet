#!/usr/bin/env python
# Blender Utilities
# Veelgebruikte Blender functies voor scripts

# Dit zijn Python string templates die gebruikt worden in client scripts
# Ze worden in Blender uitgevoerd, niet lokaal

# Materiaal utility functies
MATERIAL_UTILS = r"""
def create_material(name, color, metallic=0.0, roughness=0.5, specular=0.5, alpha=1.0):
    # Maak een Blender materiaal met opgegeven eigenschappen
    #
    # Args:
    #     name (str): Naam van het materiaal
    #     color (tuple): RGBA kleurwaarden (0-1)
    #     metallic (float): Metallische waarde (0-1)
    #     roughness (float): Ruwheid waarde (0-1)
    #     specular (float): Speculaire waarde (0-1)
    #     alpha (float): Alpha/transparantie waarde (0-1)
    #     
    # Returns:
    #     bpy.types.Material: Het aangemaakte materiaal
    
    # Maak een nieuw materiaal of gebruik bestaand
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name=name)
    
    # Configureer materiaal met nodes
    mat.use_nodes = True
    
    # Haal de principled BSDF node op
    principled = mat.node_tree.nodes.get('Principled BSDF')
    if principled:
        # Stel eigenschappen in - compatibel met Blender 4.4
        principled.inputs['Base Color'].default_value = color
        principled.inputs['Metallic'].default_value = metallic
        
        # Afhankelijk van Blender versie, gebruik de juiste naam
        if 'Specular IOR Level' in principled.inputs:
            principled.inputs['Specular IOR Level'].default_value = specular
        elif 'Specular' in principled.inputs:
            principled.inputs['Specular'].default_value = specular
            
        principled.inputs['Roughness'].default_value = roughness
        
        # Transparantie instellen indien nodig
        if alpha < 1.0:
            principled.inputs['Alpha'].default_value = alpha
            mat.blend_method = 'BLEND'
    
    return mat

def create_emission_material(name, color, strength=1.0):
    # Maak een Blender emissie materiaal
    #
    # Args:
    #     name (str): Naam van het materiaal
    #     color (tuple): RGB kleurwaarden (0-1)
    #     strength (float): Emissie sterkte
    #     
    # Returns:
    #     bpy.types.Material: Het aangemaakte emissie materiaal
    
    # Basis materiaal maken
    mat = create_material(name, color)
    
    # Voeg emissie toe
    principled = mat.node_tree.nodes.get('Principled BSDF')
    if principled:
        if 'Emission Strength' in principled.inputs:
            principled.inputs['Emission Strength'].default_value = strength
            principled.inputs['Emission Color'].default_value = color
        # In oudere Blender versies kan je een emissie shader toevoegen
    
    return mat
"""

# Setup functies voor schone slate en basisinstellingen
SCENE_SETUP = r"""
def setup_clean_scene():
    # Verwijder alle bestaande objecten uit de scene
    
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
def setup_camera(location=(5, -5, 3), rotation_euler=(1.2, 0, 0.8)):
    # Stel een camera in met de opgegeven parameters
    #
    # Args:
    #     location (tuple): X, Y, Z locatie van de camera
    #     rotation_euler (tuple): X, Y, Z rotatie in radialen
    #     
    # Returns:
    #     bpy.types.Object: Camera object
    
    bpy.ops.object.camera_add(location=location)
    cam = bpy.context.active_object
    cam.rotation_euler = rotation_euler
    bpy.context.scene.camera = cam
    return cam

def setup_lighting(type='SUN', location=(5, 5, 10), energy=2.0):
    # Voeg een lamp toe aan de scene
    #
    # Args:
    #     type (str): Type lamp ('SUN', 'POINT', 'SPOT', 'AREA')
    #     location (tuple): X, Y, Z locatie van de lamp
    #     energy (float): Energie/sterkte van de lamp
    #     
    # Returns:
    #     bpy.types.Object: Lamp object
    
    bpy.ops.object.light_add(type=type, location=location)
    lamp = bpy.context.active_object
    lamp.data.energy = energy
    return lamp

def setup_render_settings(engine='CYCLES', samples=128, resolution_x=1920, resolution_y=1080):
    # Configureer render instellingen
    #
    # Args:
    #     engine (str): Render engine ('CYCLES', 'EEVEE', 'BLENDER_WORKBENCH')
    #     samples (int): Aantal samples voor de renderer
    #     resolution_x (int): Horizontale resolutie
    #     resolution_y (int): Verticale resolutie
    
    bpy.context.scene.render.engine = engine
    
    if engine == 'CYCLES':
        bpy.context.scene.cycles.samples = samples
    
    bpy.context.scene.render.resolution_x = resolution_x
    bpy.context.scene.render.resolution_y = resolution_y
"""

# Helper voor het opslaan van scenes
SAVE_UTILS = r"""
def save_blend_file(filepath):
    # Sla de huidige scene op als .blend bestand
    #
    # Args:
    #     filepath (str): Pad waar het bestand opgeslagen moet worden
    
    # Zorg ervoor dat het pad de juiste extensie heeft
    if not filepath.endswith('.blend'):
        filepath += '.blend'
        
    # Sla het bestand op
    bpy.ops.wm.save_as_mainfile(filepath=filepath)
    print(f"Scene opgeslagen als: {filepath}")
"""

# Helpers voor het verkrijgen van alle templates als één string
def get_all_utilities():
    """
    Combineert alle Blender utility functies in één string voor gebruik in client scripts
    
    Returns:
        str: Alle utility functies als één string
    """
    return MATERIAL_UTILS + "\n" + SCENE_SETUP + "\n" + SAVE_UTILS

def get_material_utilities():
    """
    Geeft alleen de materiaal utilities terug
    
    Returns:
        str: Materiaal utility functies als string
    """
    return MATERIAL_UTILS

def get_scene_utilities():
    """
    Geeft alleen de scene setup utilities terug
    
    Returns:
        str: Scene setup utility functies als string
    """
    return SCENE_SETUP

def get_save_utilities():
    """
    Geeft alleen de save utilities terug
    
    Returns:
        str: Save utility functies als string
    """
    return SAVE_UTILS

# Voorbeeld van gebruik (voor wanneer dit script direct wordt uitgevoerd)
if __name__ == "__main__":
    print("Blender Utilities geladen")
    print(f"Aantal functies beschikbaar: {get_all_utilities().count('def ')}") 