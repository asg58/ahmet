def save_blend_file(filepath):
    # Sla de huidige scene op als .blend bestand
    # Args:
        #    filepath (str): Pad waar het bestand opgeslagen moet worden
    
        # Zorg ervoor dat het pad de juiste extensie heeft
        if not filepath.endswith('.blend'):
            filepath += '.blend'
        
            # Sla het bestand op
            bpy.ops.wm.save_as_mainfile(filepath=filepath)
            print(f"Scene opgeslagen als: {filepath}") 