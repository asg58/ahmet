#!/usr/bin/env python
# Blender ChromaDB Integration
# Vector database voor het indexeren en zoeken van 3D modellen

import os
import json
import datetime
import chromadb
from typing import Dict, Any, List, Optional, Union
import numpy as np

# Import project configuratie
from blender_config import PROJECT_ROOT, OUTPUT_DIR

# Pad voor de ChromaDB collectie
CHROMA_DB_PATH = os.path.join(PROJECT_ROOT, "chroma_db")

# Zorg ervoor dat de chroma_db directory bestaat
os.makedirs(CHROMA_DB_PATH, exist_ok=True)

class BlenderModelDB:
    """
    ChromaDB wrapper voor Blender modellen
    """
    
    def __init__(self, collection_name: str = "blender_models"):
        """
        Initialiseer de ChromaDB client en collectie
        
        Args:
            collection_name (str): Naam van de ChromaDB collectie
        """
        self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        
        # Maak of krijg collectie
        try:
            self.collection = self.client.get_collection(name=collection_name)
            print(f"Bestaande collectie '{collection_name}' geopend")
        except Exception:
            self.collection = self.client.create_collection(name=collection_name)
            print(f"Nieuwe collectie '{collection_name}' aangemaakt")
    
    def add_model(self, 
                 model_path: str, 
                 description: str, 
                 metadata: Dict[str, Any],
                 embedding: Optional[List[float]] = None) -> str:
        """
        Voeg een 3D model toe aan de database
        
        Args:
            model_path (str): Pad naar het .blend bestand
            description (str): Beschrijving van het model
            metadata (Dict[str, Any]): Metadata voor het model (bijv. auteur, datum, etc.)
            embedding (Optional[List[float]]): Vector embedding voor het model
                                             (optioneel, wordt random gegenereerd als None)
        
        Returns:
            str: ID van het model in de database
        """
        # Genereer een unieke ID
        model_id = f"model_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(model_path)}"
        
        # Als geen embedding gegeven, maak een willekeurige embedding
        # In een echte implementatie zou je hier een model gebruiken om een semantische embedding te maken
        if embedding is None:
            # Maak een consistent willekeurige embedding van 384 dimensies (standaard CLIP/BERT grootte)
            np.random.seed(sum(ord(c) for c in model_path + description))
            embedding = np.random.rand(384).tolist()
        
        # Voeg creatie timestamp toe aan metadata
        full_metadata = {
            **metadata,
            "created_at": datetime.datetime.now().isoformat(),
            "file_path": model_path,
            "file_name": os.path.basename(model_path),
            "file_size": os.path.getsize(model_path) if os.path.exists(model_path) else 0
        }
        
        # Toevoegen aan de collectie
        self.collection.add(
            ids=[model_id],
            embeddings=[embedding],
            metadatas=[full_metadata],
            documents=[description]
        )
        
        print(f"Model toegevoegd: {model_id}")
        return model_id
    
    def search_models(self, 
                     query: str, 
                     n_results: int = 5, 
                     filter_metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Zoek naar modellen op basis van een query tekst
        
        Args:
            query (str): Zoekterm
            n_results (int): Maximum aantal resultaten
            filter_metadata (Optional[Dict[str, Any]]): Filter op metadata velden
            
        Returns:
            List[Dict[str, Any]]: Lijst met gevonden modellen
        """
        # In een echte implementatie zou je hier een model gebruiken om een semantische embedding te maken
        # voor de query. Nu maken we een willekeurige embedding gebaseerd op de query tekst.
        np.random.seed(sum(ord(c) for c in query))
        query_embedding = np.random.rand(384).tolist()
        
        # Zoek in de collectie
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
            where=filter_metadata
        )
        
        # Format resultaten
        formatted_results = []
        if results["ids"]:
            for i, model_id in enumerate(results["ids"][0]):
                formatted_results.append({
                    "id": model_id,
                    "score": results["distances"][0][i] if "distances" in results else None,
                    "description": results["documents"][0][i] if "documents" in results else None,
                    "metadata": results["metadatas"][0][i] if "metadatas" in results else None
                })
        
        return formatted_results
    
    def list_all_models(self) -> List[Dict[str, Any]]:
        """
        Lijst alle opgeslagen modellen
        
        Returns:
            List[Dict[str, Any]]: Lijst met alle modellen
        """
        # Haal alle data op
        results = self.collection.get()
        
        # Format resultaten
        formatted_results = []
        if results["ids"]:
            for i, model_id in enumerate(results["ids"]):
                formatted_results.append({
                    "id": model_id,
                    "description": results["documents"][i] if "documents" in results else None,
                    "metadata": results["metadatas"][i] if "metadatas" in results else None
                })
        
        return formatted_results
    
    def delete_model(self, model_id: str) -> bool:
        """
        Verwijder een model uit de database
        
        Args:
            model_id (str): ID van het model
            
        Returns:
            bool: True als verwijderen gelukt is
        """
        try:
            self.collection.delete(ids=[model_id])
            print(f"Model verwijderd: {model_id}")
            return True
        except Exception as e:
            print(f"Fout bij verwijderen model {model_id}: {e}")
            return False


# Voorbeeld gebruik
if __name__ == "__main__":
    # Maak een instance van de database
    db = BlenderModelDB()
    
    # Voorbeeld: voeg een model toe
    blend_path = os.path.join(OUTPUT_DIR, "test_model.blend")
    model_id = db.add_model(
        model_path=blend_path,
        description="Een eenvoudige rode kubus gecentreerd op de oorsprong",
        metadata={
            "author": "Test Gebruiker",
            "objects": ["cube"],
            "colors": ["red"],
            "tags": ["simple", "geometric", "test"]
        }
    )
    
    print(f"Toegevoegd model ID: {model_id}")
    
    # Voorbeeld: zoek naar modellen
    results = db.search_models("kubus rood", n_results=3)
    
    print("\nZoekresultaten:")
    for i, result in enumerate(results):
        print(f"Resultaat {i+1}:")
        print(f"  ID: {result['id']}")
        print(f"  Score: {result['score']}")
        print(f"  Beschrijving: {result['description']}")
        print(f"  Bestandspad: {result['metadata']['file_path']}")
        print(f"  Tags: {result['metadata'].get('tags', [])}")
        print() 