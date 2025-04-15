#!/usr/bin/env python
# Blender Utilities
# Veelgebruikte Blender functies voor scripts

# Dit zijn Python string templates die gebruikt worden in client scripts
# Ze worden in Blender uitgevoerd, niet lokaal

# Materiaal utility functies - gewone string zonder docstrings erin
MATERIAL_UTILS = (
    "def create_material(name, color, metallic=0.0, roughness=0.5, specular=0.5, alpha=1.0):\n"
    "    # Maak een Blender materiaal met opgegeven eigenschappen\n"
    "    # Args:\n"
    "    #    name (str): Naam van het materiaal\n"
    "    #    color (tuple): RGBA kleurwaarden (0-1)\n"
    "    #    metallic (float): Metallische waarde (0-1)\n"
    "    #    roughness (float): Ruwheid waarde (0-1)\n"
    "    #    specular (float): Speculaire waarde (0-1)\n"
    "    #    alpha (float): Alpha/transparantie waarde (0-1)\n"
    "    # Returns:\n"
    "    #    bpy.types.Material: Het aangemaakte materiaal\n"
    "    \n"
    "    # Maak een nieuw materiaal of gebruik bestaand\n"
    "    mat = bpy.data.materials.get(name)\n"
    "    if mat is None:\n"
    "        mat = bpy.data.materials.new(name=name)\n"
    "    \n"
    "    # Configureer materiaal met nodes\n"
    "    mat.use_nodes = True\n"
    "    \n"
    "    # Haal de principled BSDF node op\n"
    "    principled = mat.node_tree.nodes.get('Principled BSDF')\n"
    "    if principled:\n"
    "        # Stel eigenschappen in - compatibel met Blender 4.4\n"
    "        principled.inputs['Base Color'].default_value = color\n"
    "        principled.inputs['Metallic'].default_value = metallic\n"
    "        \n"
    "        # Afhankelijk van Blender versie, gebruik de juiste naam\n"
    "        if 'Specular IOR Level' in principled.inputs:\n"
    "            principled.inputs['Specular IOR Level'].default_value = specular\n"
    "        elif 'Specular' in principled.inputs:\n"
    "            principled.inputs['Specular'].default_value = specular\n"
    "            \n"
    "        principled.inputs['Roughness'].default_value = roughness\n"
    "        \n"
    "        # Transparantie instellen indien nodig\n"
    "        if alpha < 1.0:\n"
    "            principled.inputs['Alpha'].default_value = alpha\n"
    "            mat.blend_method = 'BLEND'\n"
    "    \n"
    "    return mat\n"
    "\n"
    "def create_emission_material(name, color, strength=1.0):\n"
    "    # Maak een Blender emissie materiaal\n"
    "    # Args:\n"
    "    #    name (str): Naam van het materiaal\n"
    "    #    color (tuple): RGB kleurwaarden (0-1)\n"
    "    #    strength (float): Emissie sterkte\n"
    "    # Returns:\n"
    "    #    bpy.types.Material: Het aangemaakte emissie materiaal\n"
    "    \n"
    "    # Basis materiaal maken\n"
    "    mat = create_material(name, color)\n"
    "    \n"
    "    # Voeg emissie toe\n"
    "    principled = mat.node_tree.nodes.get('Principled BSDF')\n"
    "    if principled:\n"
    "        if 'Emission Strength' in principled.inputs:\n"
    "            principled.inputs['Emission Strength'].default_value = strength\n"
    "            principled.inputs['Emission Color'].default_value = color\n"
    "        # In oudere Blender versies kan je een emissie shader toevoegen\n"
    "    \n"
    "    return mat\n"
)

# Setup functies voor schone slate en basisinstellingen
SCENE_SETUP = (
    "def setup_clean_scene():\n"
    "    # Verwijder alle bestaande objecten uit de scene\n"
    "    bpy.ops.object.select_all(action='SELECT')\n"
    "    bpy.ops.object.delete()\n"
    "    \n"
    "def setup_camera(location=(5, -5, 3), rotation_euler=(1.2, 0, 0.8)):\n"
    "    # Stel een camera in met de opgegeven parameters\n"
    "    # Args:\n"
    "    #    location (tuple): X, Y, Z locatie van de camera\n"
    "    #    rotation_euler (tuple): X, Y, Z rotatie in radialen\n"
    "    # Returns:\n"
    "    #    bpy.types.Object: Camera object\n"
    "    \n"
    "    bpy.ops.object.camera_add(location=location)\n"
    "    cam = bpy.context.active_object\n"
    "    cam.rotation_euler = rotation_euler\n"
    "    bpy.context.scene.camera = cam\n"
    "    return cam\n"
    "\n"
    "def setup_lighting(type='SUN', location=(5, 5, 10), energy=2.0):\n"
    "    # Voeg een lamp toe aan de scene\n"
    "    # Args:\n"
    "    #    type (str): Type lamp ('SUN', 'POINT', 'SPOT', 'AREA')\n"
    "    #    location (tuple): X, Y, Z locatie van de lamp\n"
    "    #    energy (float): Energie/sterkte van de lamp\n"
    "    # Returns:\n"
    "    #    bpy.types.Object: Lamp object\n"
    "    \n"
    "    bpy.ops.object.light_add(type=type, location=location)\n"
    "    lamp = bpy.context.active_object\n"
    "    lamp.data.energy = energy\n"
    "    return lamp\n"
    "\n"
    "def setup_render_settings(engine='CYCLES', samples=128, resolution_x=1920, resolution_y=1080):\n"
    "    # Configureer render instellingen\n"
    "    # Args:\n"
    "    #    engine (str): Render engine ('CYCLES', 'EEVEE', 'BLENDER_WORKBENCH')\n"
    "    #    samples (int): Aantal samples voor de renderer\n"
    "    #    resolution_x (int): Horizontale resolutie\n"
    "    #    resolution_y (int): Verticale resolutie\n"
    "    \n"
    "    bpy.context.scene.render.engine = engine\n"
    "    \n"
    "    if engine == 'CYCLES':\n"
    "        bpy.context.scene.cycles.samples = samples\n"
    "    \n"
    "    bpy.context.scene.render.resolution_x = resolution_x\n"
    "    bpy.context.scene.render.resolution_y = resolution_y\n"
)

# Helper voor het opslaan van scenes
SAVE_UTILS = (
    "def save_blend_file(filepath):\n"
    "    # Sla de huidige scene op als .blend bestand\n"
    "    # Args:\n"
    "    #    filepath (str): Pad waar het bestand opgeslagen moet worden\n"
    "    \n"
    "    # Zorg ervoor dat het pad de juiste extensie heeft\n"
    "    if not filepath.endswith('.blend'):\n"
    "        filepath += '.blend'\n"
    "        \n"
    "    # Sla het bestand op\n"
    "    bpy.ops.wm.save_as_mainfile(filepath=filepath)\n"
    "    print(f\"Scene opgeslagen als: {filepath}\")\n"
)

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