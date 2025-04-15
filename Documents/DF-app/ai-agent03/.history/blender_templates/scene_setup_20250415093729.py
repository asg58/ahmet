def setup_clean_scene():
    # Verwijder alle bestaande objecten uit de scene
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
def setup_camera(location=(5, -5, 3), rotation_euler=(1.2, 0, 0.8)):
    # Stel een camera in met de opgegeven parameters
    # Args:
    #    location (tuple): X, Y, Z locatie van de camera
    #    rotation_euler (tuple): X, Y, Z rotatie in radialen
    # Returns:
    #    bpy.types.Object: Camera object
    
    bpy.ops.object.camera_add(location=location)
    cam = bpy.context.active_object
    cam.rotation_euler = rotation_euler
    bpy.context.scene.camera = cam
    return cam

def setup_lighting(type='SUN', location=(5, 5, 10), energy=2.0):
    # Voeg een lamp toe aan de scene
    # Args:
    #    type (str): Type lamp ('SUN', 'POINT', 'SPOT', 'AREA')
    #    location (tuple): X, Y, Z locatie van de lamp
    #    energy (float): Energie/sterkte van de lamp
    # Returns:
    #    bpy.types.Object: Lamp object
    
    bpy.ops.object.light_add(type=type, location=location)
    lamp = bpy.context.active_object
    lamp.data.energy = energy
    return lamp

def setup_render_settings(engine='CYCLES', samples=128, resolution_x=1920, resolution_y=1080):
    # Configureer render instellingen
    # Args:
    #    engine (str): Render engine ('CYCLES', 'EEVEE', 'BLENDER_WORKBENCH')
    #    samples (int): Aantal samples voor de renderer
    #    resolution_x (int): Horizontale resolutie
    #    resolution_y (int): Verticale resolutie
    
    bpy.context.scene.render.engine = engine
    
    if engine == 'CYCLES':
        bpy.context.scene.cycles.samples = samples
    
    bpy.context.scene.render.resolution_x = resolution_x
    bpy.context.scene.render.resolution_y = resolution_y 