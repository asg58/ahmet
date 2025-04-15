#!/usr/bin/env python
# Script om een benoemde checkpoint te maken van de Blender WebSocket setup
# Run with: python checkpoint_blender_websocket_v1.py

import os
import sys
import subprocess

# Voeg de naam van de checkpoint toe
CHECKPOINT_NAME = "blender_websocket_v1_base"

def main():
    """
    Maakt een benoemde checkpoint van de huidige Blender WebSocket setup.
    """
    # Bepaal de locatie van het create_checkpoint.py script
    checkpoint_script = os.path.join(os.getcwd(), "create_checkpoint.py")
    
    if not os.path.exists(checkpoint_script):
        print("Fout: create_checkpoint.py script niet gevonden.")
        return False
    
    # Controleer of de nodige files aanwezig zijn voordat we een checkpoint maken
    required_files = [
        "blender_agent/websocket_server.py",
        "test_client.py",
        "blender_websocket_setup_samenvatting.md",
        "blender_websocket_handleiding.md"
    ]
    
    missing_files = []
    for file in required_files:
        if not os.path.exists(os.path.join(os.getcwd(), file)):
            missing_files.append(file)
    
    if missing_files:
        print("Waarschuwing: De volgende benodigde bestanden ontbreken:")
        for file in missing_files:
            print(f"  - {file}")
        
        response = input("Wil je toch doorgaan met het maken van de checkpoint? (ja/nee): ")
        if response.lower() not in ['ja', 'j', 'yes', 'y']:
            print("Checkpoint maken geannuleerd.")
            return False
    
    # Maak de checkpoint
    print(f"Checkpoint maken: {CHECKPOINT_NAME}")
    
    try:
        # Voer het create_checkpoint.py script uit met de benoemde checkpoint
        subprocess.run([sys.executable, checkpoint_script, "create", CHECKPOINT_NAME])
        
        print(f"\nCheckpoint {CHECKPOINT_NAME} is succesvol gemaakt.")
        print("\nJe kunt deze checkpoint later herstellen met:")
        print(f"python create_checkpoint.py restore {CHECKPOINT_NAME}")
        
        # Toon de locatie van de checkpoint
        checkpoints_dir = os.path.join(os.getcwd(), "checkpoints")
        checkpoint_path = os.path.join(checkpoints_dir, CHECKPOINT_NAME)
        if os.path.exists(checkpoint_path):
            print(f"\nCheckpoint locatie: {checkpoint_path}")
        
        return True
    except Exception as e:
        print(f"Fout bij het maken van checkpoint: {e}")
        return False

if __name__ == "__main__":
    main() 