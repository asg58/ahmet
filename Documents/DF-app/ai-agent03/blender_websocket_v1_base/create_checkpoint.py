#!/usr/bin/env python
# Script om een checkpoint te maken van de huidige projectstatus
# Run with: python create_checkpoint.py

import os
import shutil
import datetime
import json
import sys

def create_checkpoint(checkpoint_name=None):
    """
    Maakt een checkpoint van de huidige projectstatus.
    Kopieert alle Python bestanden en .blend bestanden naar een checkpoint directory.
    """
    # Bepaal de checkpoint naam (standaard: huidige datum/tijd)
    if not checkpoint_name:
        now = datetime.datetime.now()
        checkpoint_name = now.strftime("checkpoint_%Y%m%d_%H%M%S")
    
    # Maak de checkpoint directory
    checkpoint_dir = os.path.join(os.getcwd(), checkpoint_name)
    if not os.path.exists(checkpoint_dir):
        os.makedirs(checkpoint_dir)
    
    # Lijst met extensies om te kopiëren
    extensions_to_copy = ['.py', '.blend', '.md']
    
    # Lijst met bestanden om te kopiëren
    files_to_copy = []
    for root, dirs, files in os.walk(os.getcwd()):
        # Sla de checkpoint directory zelf over
        if checkpoint_name in root:
            continue
            
        for file in files:
            # Check of dit een bestand is dat we willen kopiëren
            ext = os.path.splitext(file)[1].lower()
            if ext in extensions_to_copy:
                source_path = os.path.join(root, file)
                # Bepaal het relatieve pad vanaf de huidige directory
                rel_path = os.path.relpath(source_path, os.getcwd())
                files_to_copy.append(rel_path)
    
    # Kopieer de bestanden
    for file_path in files_to_copy:
        source_path = os.path.join(os.getcwd(), file_path)
        # Behoud de directorystructuur in de checkpoint
        dest_path = os.path.join(checkpoint_dir, file_path)
        
        # Maak de benodigde subdirectories
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        
        # Kopieer het bestand
        shutil.copy2(source_path, dest_path)
        print(f"Gekopieerd: {file_path}")
    
    # Sla een JSON bestand op met informatie over de checkpoint
    checkpoint_info = {
        "name": checkpoint_name,
        "created_at": datetime.datetime.now().isoformat(),
        "files_count": len(files_to_copy),
        "files": files_to_copy
    }
    
    with open(os.path.join(checkpoint_dir, "checkpoint_info.json"), "w") as f:
        json.dump(checkpoint_info, f, indent=4)
    
    print(f"\nCheckpoint succesvol gemaakt: {checkpoint_name}")
    print(f"Aantal bestanden: {len(files_to_copy)}")
    print(f"Locatie: {checkpoint_dir}")
    
    return checkpoint_dir, checkpoint_info

def restore_checkpoint(checkpoint_name):
    """
    Herstelt bestanden vanuit een checkpoint.
    """
    checkpoint_dir = os.path.join(os.getcwd(), checkpoint_name)
    
    if not os.path.exists(checkpoint_dir):
        print(f"Fout: Checkpoint '{checkpoint_name}' bestaat niet.")
        return False
    
    info_file = os.path.join(checkpoint_dir, "checkpoint_info.json")
    if not os.path.exists(info_file):
        print(f"Fout: Checkpoint info bestand ontbreekt in '{checkpoint_name}'.")
        return False
    
    # Laad de checkpoint informatie
    with open(info_file, "r") as f:
        info = json.load(f)
    
    # Vraag om bevestiging
    print(f"Je staat op het punt om {info['files_count']} bestanden te herstellen van checkpoint: {checkpoint_name}")
    response = input("Weet je zeker dat je door wilt gaan? (ja/nee): ")
    
    if response.lower() not in ['ja', 'j', 'yes', 'y']:
        print("Herstel geannuleerd.")
        return False
    
    # Maak een backup van de huidige staat voordat we bestanden gaan herstellen
    backup_checkpoint = "backup_before_restore_" + datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    create_checkpoint(backup_checkpoint)
    
    # Herstel de bestanden vanuit de checkpoint
    for file_path in info['files']:
        source_path = os.path.join(checkpoint_dir, file_path)
        dest_path = os.path.join(os.getcwd(), file_path)
        
        if os.path.exists(source_path):
            # Maak de benodigde subdirectories
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            
            # Kopieer het bestand
            shutil.copy2(source_path, dest_path)
            print(f"Hersteld: {file_path}")
    
    print(f"\nCheckpoint '{checkpoint_name}' succesvol hersteld.")
    print(f"Er is een backup gemaakt van de staat voor herstel: {backup_checkpoint}")
    
    return True

def list_checkpoints():
    """
    Toont een lijst van beschikbare checkpoints.
    """
    checkpoints = []
    
    for item in os.listdir(os.getcwd()):
        if os.path.isdir(item) and item.startswith("checkpoint_"):
            info_file = os.path.join(os.getcwd(), item, "checkpoint_info.json")
            if os.path.exists(info_file):
                with open(info_file, "r") as f:
                    info = json.load(f)
                checkpoints.append((item, info['created_at'], info['files_count']))
    
    if not checkpoints:
        print("Geen checkpoints gevonden.")
        return
    
    print("\nBeschikbare checkpoints:")
    print("-" * 80)
    print(f"{'Naam':<30} {'Aangemaakt op':<25} {'Aantal bestanden':<15}")
    print("-" * 80)
    
    for name, created_at, files_count in sorted(checkpoints, key=lambda x: x[1], reverse=True):
        try:
            created_dt = datetime.datetime.fromisoformat(created_at)
            created_formatted = created_dt.strftime("%Y-%m-%d %H:%M:%S")
        except:
            created_formatted = created_at
            
        print(f"{name:<30} {created_formatted:<25} {files_count:<15}")

def main():
    if len(sys.argv) < 2:
        # Geen commando opgegeven, maak een nieuwe checkpoint
        create_checkpoint()
        return
    
    command = sys.argv[1].lower()
    
    if command == "list":
        list_checkpoints()
    elif command == "restore":
        if len(sys.argv) < 3:
            print("Gebruik: python create_checkpoint.py restore CHECKPOINT_NAAM")
            return
        restore_checkpoint(sys.argv[2])
    elif command == "create":
        if len(sys.argv) < 3:
            create_checkpoint()
        else:
            create_checkpoint(sys.argv[2])
    else:
        print("Onbekend commando. Gebruik: create, list, of restore.")

if __name__ == "__main__":
    main() 