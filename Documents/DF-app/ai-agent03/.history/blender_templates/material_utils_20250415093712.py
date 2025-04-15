def create_material(name, color, metallic=0.0, roughness=0.5, specular=0.5, alpha=1.0):
    # Maak een Blender materiaal met opgegeven eigenschappen
    # Args:
    #    name (str): Naam van het materiaal
    #    color (tuple): RGBA kleurwaarden (0-1)
    #    metallic (float): Metallische waarde (0-1)
    #    roughness (float): Ruwheid waarde (0-1)
    #    specular (float): Speculaire waarde (0-1)
    #    alpha (float): Alpha/transparantie waarde (0-1)
    # Returns:
    #    bpy.types.Material: Het aangemaakte materiaal
    
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
    # Args:
    #    name (str): Naam van het materiaal
    #    color (tuple): RGB kleurwaarden (0-1)
    #    strength (float): Emissie sterkte
    # Returns:
    #    bpy.types.Material: Het aangemaakte emissie materiaal
    
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