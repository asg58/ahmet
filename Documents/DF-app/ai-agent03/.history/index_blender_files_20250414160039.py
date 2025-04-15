#!/usr/bin/env python
# Index Blender Files
# Script om bestaande .blend bestanden te indexeren in ChromaDB

import os
import sys
import argparse
from typing import Dict, List, Any
import json

from blender_config import PROJECT_ROOT
from blender_chroma_db import BlenderModelDB

def find_blend_files(directory: str = PROJECT_ROOT) -> List[str]:
    """
    Zoek alle .blend bestanden in een directory en subdirectories
    
    Args:
        directory (str): De directory om te doorzoeken
        
    Returns:
        List[str]: Lijst met paden naar .blend bestanden
    """
    blend_files = []
    for root, dirs, files in os.walk(directory):
        # Sla .git, node_modules, en __pycache__ mappen over
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'chroma_db']]
        
        for file in files:
            if file.endswith('.blend'):
                full_path = os.path.join(root, file)
                blend_files.append(full_path)
    
    return blend_files

def extract_metadata_from_filename(filepath: str) -> Dict[str, Any]:
    """
    Haal metadata uit de bestandsnaam
    
    Args:
        filepath (str): Pad naar het bestand
        
    Returns:
        Dict[str, Any]: Metadata uit de bestandsnaam
    """
    filename = os.path.basename(filepath)
    name, _ = os.path.splitext(filename)
    
    # Basismetadata
    metadata = {
        "filename": filename,
        "tags": []
    }
    
    # Extract eigenschappen uit bestandsnaam
    lower_name = name.lower()
    
    # Woordenlijst voor tags
    tag_keywords = {
        "car": ["auto", "car", "vehicle"],
        "cube": ["cube", "kubus"],
        "sphere": ["sphere", "bol"],
        "text": ["text", "tekst", "letter"],
        "ring": ["ring", "rings", "ringen"],
        "doosletter": ["doosletter", "doosletters"],
        "3d": ["3d"],
        "vertical": ["vertical", "verticaal"],
        "simple": ["simple", "eenvoudig"],
    }
    
    # Voeg tags toe op basis van bestandsnaam
    for tag, keywords in tag_keywords.items():
        if any(keyword in lower_name for keyword in keywords):
            metadata["tags"].append(tag)
    
    # Voeg andere metadata toe
    metadata["created"] = os.path.getctime(filepath)
    metadata["modified"] = os.path.getmtime(filepath)
    metadata["size"] = os.path.getsize(filepath)
    
    return metadata

def generate_description(filepath: str, metadata: Dict[str, Any]) -> str:
    """
    Genereer een beschrijving van het bestand
    
    Args:
        filepath (str): Pad naar het bestand
        metadata (Dict[str, Any]): Metadata voor het bestand
        
    Returns:
        str: Beschrijving van het bestand
    """
    filename = os.path.basename(filepath)
    name, _ = os.path.splitext(filename)
    
    # Basis beschrijving met bestandsnaam
    description = f"3D Blender model: {name}"
    
    # Voeg tags toe
    if metadata["tags"]:
        description += f". Tags: {', '.join(metadata['tags'])}"
    
    # Voeg bestandslocatie toe
    rel_path = os.path.relpath(filepath, PROJECT_ROOT)
    description += f". Bestandslocatie: {rel_path}"
    
    return description

def index_files(db: BlenderModelDB, files: List[str], force: bool = False) -> int:
    """
    Indexeer bestanden in de database
    
    Args:
        db (BlenderModelDB): Database object
        files (List[str]): Lijst met bestandspaden
        force (bool): Forceer herindexering van alle bestanden
        
    Returns:
        int: Aantal geïndexeerde bestanden
    """
    indexed_count = 0
    
    # Haal bestaande modellen op als we niet forceren
    existing_models = []
    if not force:
        existing_models = db.list_all_models()
        existing_paths = [model["metadata"]["file_path"] for model in existing_models if "file_path" in model["metadata"]]
        print(f"Er zijn {len(existing_models)} modellen in de database")
    
    # Indexeer elk bestand
    for filepath in files:
        # Sla over als het bestand al is geïndexeerd en we niet forceren
        if not force and filepath in existing_paths:
            print(f"Overgeslagen (bestaat al): {os.path.basename(filepath)}")
            continue
        
        # Haal metadata en beschrijving op
        metadata = extract_metadata_from_filename(filepath)
        description = generate_description(filepath, metadata)
        
        # Voeg toe aan de database
        try:
            db.add_model(
                model_path=filepath,
                description=description,
                metadata=metadata
            )
            indexed_count += 1
            print(f"Geïndexeerd: {os.path.basename(filepath)}")
        except Exception as e:
            print(f"Fout bij indexeren {filepath}: {e}")
    
    return indexed_count

def main():
    """Hoofdfunctie"""
    parser = argparse.ArgumentParser(description="Indexeer Blender .blend bestanden in ChromaDB")
    parser.add_argument("--dir", type=str, default=PROJECT_ROOT, 
                        help="Directory om te doorzoeken (standaard: project root)")
    parser.add_argument("--force", action="store_true", 
                        help="Forceer herindexering van alle bestanden")
    parser.add_argument("--collection", type=str, default="blender_models",
                        help="Naam van de ChromaDB collectie")
    
    args = parser.parse_args()
    
    # Maak database connectie
    db = BlenderModelDB(collection_name=args.collection)
    
    # Zoek .blend bestanden
    print(f"Zoeken naar .blend bestanden in {args.dir}...")
    blend_files = find_blend_files(args.dir)
    print(f"{len(blend_files)} .blend bestanden gevonden")
    
    # Indexeer bestanden
    print("Indexeren van bestanden...")
    indexed_count = index_files(db, blend_files, args.force)
    
    print(f"\nIndexering voltooid. {indexed_count} bestanden geïndexeerd.")
    
    # Toon alle geïndexeerde modellen
    all_models = db.list_all_models()
    print(f"\nTotaal aantal modellen in database: {len(all_models)}")
    
    # Toon voorbeeldzoekopdracht
    if len(all_models) > 0:
        print("\nVoorbeeld zoekopdracht:")
        search_term = "auto" if any("car" in model["metadata"].get("tags", []) for model in all_models) else "model"
        results = db.search_models(search_term, n_results=3)
        
        print(f"\nZoekresultaten voor '{search_term}':")
        for i, result in enumerate(results):
            print(f"Resultaat {i+1}:")
            print(f"  ID: {result['id']}")
            print(f"  Beschrijving: {result['description']}")
            print(f"  Bestandspad: {result['metadata']['file_path']}")
            print(f"  Tags: {result['metadata'].get('tags', [])}")
            print()

if __name__ == "__main__":
    main() 