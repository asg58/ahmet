from typing import Dict, Any, List, Optional, Union
import datetime
import json
import os
from blender_config import PROJECT_ROOT, OUTPUT_DIR
import chromadb
import numpy as np

CHROMA_DB_PATH = os.path.join(PROJECT_ROOT, 'chroma_db')
os.makedirs(CHROMA_DB_PATH, exist_ok=True)
class BlenderModelDB:
    """
    ChromaDB wrapper voor Blender modellen
    """

    def __init__(self, collection_name: str='blender_models'):
        """
        Initialiseer de ChromaDB client en collectie
        
        Args:
            collection_name (str): Naam van de ChromaDB collectie
        """
        self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        try:
            self.collection = self.client.get_collection(name=collection_name)
            print(f"Bestaande collectie '{collection_name}' geopend")
        except Exception:
            self.collection = self.client.create_collection(name=collection_name)
            print(f"Nieuwe collectie '{collection_name}' aangemaakt")

    def add_model(self, model_path: str, description: str, metadata: Dict[str, Any], embedding: Optional[List[float]]=None) -> str:
        """
        Voeg een 3D model toe aan de database
        
        Args:
            model_path (str): Pad naar het .blend bestand
            description (str): Beschrijving van het model
            metadata (
    Dict[str, Any]): Metadata voor het model (bijv. auteur, datum, etc.)
            embedding (Optional[List[float]]): Vector embedding voor het model
                                             (
    optioneel, wordt random gegenereerd als None)
        
        Returns:
            str: ID van het model in de database
        """
        model_id = f"model_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(model_path)}"
        if embedding is None:
            np.random.seed(sum((ord(c) for c in model_path + description)))
            embedding = np.random.rand(384).tolist()
        full_metadata = {**metadata, 'created_at': datetime.datetime.now().isoformat(), 'file_path': model_path, 'file_name': os.path.basename(model_path), 'file_size': os.path.getsize(model_path) if os.path.exists(model_path) else 0}
        self.collection.add(ids=[model_id], embeddings=[embedding], metadatas=[full_metadata], documents=[description])
        print(f'Model toegevoegd: {model_id}')
        return model_id

    def search_models(self, query: str, n_results: int=5, filter_metadata: Optional[Dict[str, Any]]=None) -> List[Dict[str, Any]]:
        """
        Zoek naar modellen op basis van een query tekst
        
        Args:
            query (str): Zoekterm
            n_results (int): Maximum aantal resultaten
            filter_metadata (Optional[Dict[str, Any]]): Filter op metadata velden
            
        Returns:
            List[Dict[str, Any]]: Lijst met gevonden modellen
        """
        np.random.seed(sum((ord(c) for c in query)))
        query_embedding = np.random.rand(384).tolist()
        results = self.collection.query(query_embeddings=[query_embedding], n_results=n_results, where=filter_metadata)
        formatted_results = []
        if results['ids']:
            for i, model_id in enumerate(results['ids'][0]):
                formatted_results.append({'id': model_id, 'score': results['distances'][0][i] if 'distances' in results else None, 'description': results['documents'][0][i] if 'documents' in results else None, 'metadata': results['metadatas'][0][i] if 'metadatas' in results else None})
        return formatted_results

    def list_all_models(self) -> List[Dict[str, Any]]:
        """
        Lijst alle opgeslagen modellen
        
        Returns:
            List[Dict[str, Any]]: Lijst met alle modellen
        """
        results = self.collection.get()
        formatted_results = []
        if results['ids']:
            for i, model_id in enumerate(results['ids']):
                formatted_results.append({'id': model_id, 'description': results['documents'][i] if 'documents' in results else None, 'metadata': results['metadatas'][i] if 'metadatas' in results else None})
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
            print(f'Model verwijderd: {model_id}')
            return True
        except Exception as e:
            print(f'Fout bij verwijderen model {model_id}: {e}')
            return False
if __name__ == '__main__':
    db = BlenderModelDB()
    blend_path = os.path.join(OUTPUT_DIR, 'test_model.blend')
    model_id = db.add_model(model_path=blend_path, description='Een eenvoudige rode kubus gecentreerd op de oorsprong', metadata={'author': 'Test Gebruiker', 'objects': ['cube'], 'colors': ['red'], 'tags': ['simple', 'geometric', 'test']})
    print(f'Toegevoegd model ID: {model_id}')
    results = db.search_models('kubus rood', n_results=3)
    print('\nZoekresultaten:')
    for i, result in enumerate(results):
        print(f'Resultaat {i + 1}:')
        print(f"  ID: {result['id']}")
        print(f"  Score: {result['score']}")
        print(f"  Beschrijving: {result['description']}")
        print(f"  Bestandspad: {result['metadata']['file_path']}")
        print(f"  Tags: {result['metadata'].get('tags', [])}")
        print()
os
json
datetime
chromadb
Dict
Any
List
Optional
Union
numpy as np
PROJECT_ROOT
OUTPUT_DIR
CHROMA_DB_PATH
os.path.join(PROJECT_ROOT, 'chroma_db')
os.makedirs(CHROMA_DB_PATH, exist_ok=True)
'\n    ChromaDB wrapper voor Blender modellen\n    '
def __init__(self, collection_name: str='blender_models'):
    """
        Initialiseer de ChromaDB client en collectie
        
        Args:
            collection_name (str): Naam van de ChromaDB collectie
        """
    self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
    try:
        self.collection = self.client.get_collection(name=collection_name)
        print(f"Bestaande collectie '{collection_name}' geopend")
    except Exception:
        self.collection = self.client.create_collection(name=collection_name)
        print(f"Nieuwe collectie '{collection_name}' aangemaakt")
def add_model(self, model_path: str, description: str, metadata: Dict[str, Any], embedding: Optional[List[float]]=None) -> str:
    """
        Voeg een 3D model toe aan de database
        
        Args:
            model_path (str): Pad naar het .blend bestand
            description (str): Beschrijving van het model
            metadata (
    Dict[str, Any]): Metadata voor het model (bijv. auteur, datum, etc.)
            embedding (Optional[List[float]]): Vector embedding voor het model
                                             (
    optioneel, wordt random gegenereerd als None)
        
        Returns:
            str: ID van het model in de database
        """
    model_id = f"model_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(model_path)}"
    if embedding is None:
        np.random.seed(sum((ord(c) for c in model_path + description)))
        embedding = np.random.rand(384).tolist()
    full_metadata = {**metadata, 'created_at': datetime.datetime.now().isoformat(), 'file_path': model_path, 'file_name': os.path.basename(model_path), 'file_size': os.path.getsize(model_path) if os.path.exists(model_path) else 0}
    self.collection.add(ids=[model_id], embeddings=[embedding], metadatas=[full_metadata], documents=[description])
    print(f'Model toegevoegd: {model_id}')
    return model_id
def search_models(self, query: str, n_results: int=5, filter_metadata: Optional[Dict[str, Any]]=None) -> List[Dict[str, Any]]:
    """
        Zoek naar modellen op basis van een query tekst
        
        Args:
            query (str): Zoekterm
            n_results (int): Maximum aantal resultaten
            filter_metadata (Optional[Dict[str, Any]]): Filter op metadata velden
            
        Returns:
            List[Dict[str, Any]]: Lijst met gevonden modellen
        """
    np.random.seed(sum((ord(c) for c in query)))
    query_embedding = np.random.rand(384).tolist()
    results = self.collection.query(query_embeddings=[query_embedding], n_results=n_results, where=filter_metadata)
    formatted_results = []
    if results['ids']:
        for i, model_id in enumerate(results['ids'][0]):
            formatted_results.append({'id': model_id, 'score': results['distances'][0][i] if 'distances' in results else None, 'description': results['documents'][0][i] if 'documents' in results else None, 'metadata': results['metadatas'][0][i] if 'metadatas' in results else None})
    return formatted_results
def list_all_models(self) -> List[Dict[str, Any]]:
    """
        Lijst alle opgeslagen modellen
        
        Returns:
            List[Dict[str, Any]]: Lijst met alle modellen
        """
    results = self.collection.get()
    formatted_results = []
    if results['ids']:
        for i, model_id in enumerate(results['ids']):
            formatted_results.append({'id': model_id, 'description': results['documents'][i] if 'documents' in results else None, 'metadata': results['metadatas'][i] if 'metadatas' in results else None})
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
        print(f'Model verwijderd: {model_id}')
        return True
    except Exception as e:
        print(f'Fout bij verwijderen model {model_id}: {e}')
        return False
__name__ == '__main__'
db = BlenderModelDB()
blend_path = os.path.join(OUTPUT_DIR, 'test_model.blend')
model_id = db.add_model(model_path=blend_path, description='Een eenvoudige rode kubus gecentreerd op de oorsprong', metadata={'author': 'Test Gebruiker', 'objects': ['cube'], 'colors': ['red'], 'tags': ['simple', 'geometric', 'test']})
print(f'Toegevoegd model ID: {model_id}')
results = db.search_models('kubus rood', n_results=3)
print('\nZoekresultaten:')
for i, result in enumerate(results):
    print(f'Resultaat {i + 1}:')
    print(f"  ID: {result['id']}")
    print(f"  Score: {result['score']}")
    print(f"  Beschrijving: {result['description']}")
    print(f"  Bestandspad: {result['metadata']['file_path']}")
    print(f"  Tags: {result['metadata'].get('tags', [])}")
    print()

os.path.join
PROJECT_ROOT
'chroma_db'
os.makedirs
CHROMA_DB_PATH
exist_ok=True
'\n    ChromaDB wrapper voor Blender modellen\n    '
self, collection_name: str='blender_models'
'\n        Initialiseer de ChromaDB client en collectie\n        \n        Args:\n            collection_name (str): Naam van de ChromaDB collectie\n        '
self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
try:
    self.collection = self.client.get_collection(name=collection_name)
    print(f"Bestaande collectie '{collection_name}' geopend")
except Exception:
    self.collection = self.client.create_collection(name=collection_name)
    print(f"Nieuwe collectie '{collection_name}' aangemaakt")
self, model_path: str, description: str, metadata: Dict[str, Any], embedding: Optional[List[float]]=None
'\n        Voeg een 3D model toe aan de database\n        \n        Args:\n            model_path (str): Pad naar het .blend bestand\n            description (str): Beschrijving van het model\n            metadata (\n    Dict[str, Any]): Metadata voor het model (bijv. auteur, datum, etc.)\n            embedding (Optional[List[float]]): Vector embedding voor het model\n                                             (\n    optioneel, wordt random gegenereerd als None)\n        \n        Returns:\n            str: ID van het model in de database\n        '
model_id = f"model_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(model_path)}"
if embedding is None:
    np.random.seed(sum((ord(c) for c in model_path + description)))
    embedding = np.random.rand(384).tolist()
full_metadata = {**metadata, 'created_at': datetime.datetime.now().isoformat(), 'file_path': model_path, 'file_name': os.path.basename(model_path), 'file_size': os.path.getsize(model_path) if os.path.exists(model_path) else 0}
self.collection.add(ids=[model_id], embeddings=[embedding], metadatas=[full_metadata], documents=[description])
print(f'Model toegevoegd: {model_id}')
return model_id
str
self, query: str, n_results: int=5, filter_metadata: Optional[Dict[str, Any]]=None
'\n        Zoek naar modellen op basis van een query tekst\n        \n        Args:\n            query (str): Zoekterm\n            n_results (int): Maximum aantal resultaten\n            filter_metadata (Optional[Dict[str, Any]]): Filter op metadata velden\n            \n        Returns:\n            List[Dict[str, Any]]: Lijst met gevonden modellen\n        '
np.random.seed(sum((ord(c) for c in query)))
query_embedding = np.random.rand(384).tolist()
results = self.collection.query(query_embeddings=[query_embedding], n_results=n_results, where=filter_metadata)
formatted_results = []
if results['ids']:
    for i, model_id in enumerate(results['ids'][0]):
        formatted_results.append({'id': model_id, 'score': results['distances'][0][i] if 'distances' in results else None, 'description': results['documents'][0][i] if 'documents' in results else None, 'metadata': results['metadatas'][0][i] if 'metadatas' in results else None})
return formatted_results
List[Dict[str, Any]]
self
'\n        Lijst alle opgeslagen modellen\n        \n        Returns:\n            List[Dict[str, Any]]: Lijst met alle modellen\n        '
results = self.collection.get()
formatted_results = []
if results['ids']:
    for i, model_id in enumerate(results['ids']):
        formatted_results.append({'id': model_id, 'description': results['documents'][i] if 'documents' in results else None, 'metadata': results['metadatas'][i] if 'metadatas' in results else None})
return formatted_results
List[Dict[str, Any]]
self, model_id: str
'\n        Verwijder een model uit de database\n        \n        Args:\n            model_id (str): ID van het model\n            \n        Returns:\n            bool: True als verwijderen gelukt is\n        '
try:
    self.collection.delete(ids=[model_id])
    print(f'Model verwijderd: {model_id}')
    return True
except Exception as e:
    print(f'Fout bij verwijderen model {model_id}: {e}')
    return False
bool
__name__

'__main__'
db
BlenderModelDB()
blend_path
os.path.join(OUTPUT_DIR, 'test_model.blend')
model_id
db.add_model(model_path=blend_path, description='Een eenvoudige rode kubus gecentreerd op de oorsprong', metadata={'author': 'Test Gebruiker', 'objects': ['cube'], 'colors': ['red'], 'tags': ['simple', 'geometric', 'test']})
print(f'Toegevoegd model ID: {model_id}')
results
db.search_models('kubus rood', n_results=3)
print('\nZoekresultaten:')
(i, result)
enumerate(results)
print(f'Resultaat {i + 1}:')
print(f"  ID: {result['id']}")
print(f"  Score: {result['score']}")
print(f"  Beschrijving: {result['description']}")
print(f"  Bestandspad: {result['metadata']['file_path']}")
print(f"  Tags: {result['metadata'].get('tags', [])}")
print()
os.path


os


True
self
collection_name: str
'blender_models'
'\n        Initialiseer de ChromaDB client en collectie\n        \n        Args:\n            collection_name (str): Naam van de ChromaDB collectie\n        '
self.client
chromadb.PersistentClient(path=CHROMA_DB_PATH)
self.collection = self.client.get_collection(name=collection_name)
print(f"Bestaande collectie '{collection_name}' geopend")
except Exception:
    self.collection = self.client.create_collection(name=collection_name)
    print(f"Nieuwe collectie '{collection_name}' aangemaakt")
self
model_path: str
description: str
metadata: Dict[str, Any]
embedding: Optional[List[float]]
None
'\n        Voeg een 3D model toe aan de database\n        \n        Args:\n            model_path (str): Pad naar het .blend bestand\n            description (str): Beschrijving van het model\n            metadata (\n    Dict[str, Any]): Metadata voor het model (bijv. auteur, datum, etc.)\n            embedding (Optional[List[float]]): Vector embedding voor het model\n                                             (\n    optioneel, wordt random gegenereerd als None)\n        \n        Returns:\n            str: ID van het model in de database\n        '
model_id
f"model_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{os.path.basename(model_path)}"
embedding is None
np.random.seed(sum((ord(c) for c in model_path + description)))
embedding = np.random.rand(384).tolist()
full_metadata
{**metadata, 'created_at': datetime.datetime.now().isoformat(), 'file_path': model_path, 'file_name': os.path.basename(model_path), 'file_size': os.path.getsize(model_path) if os.path.exists(model_path) else 0}
self.collection.add(ids=[model_id], embeddings=[embedding], metadatas=[full_metadata], documents=[description])
print(f'Model toegevoegd: {model_id}')
model_id

self
query: str
n_results: int
filter_metadata: Optional[Dict[str, Any]]
5
None
'\n        Zoek naar modellen op basis van een query tekst\n        \n        Args:\n            query (str): Zoekterm\n            n_results (int): Maximum aantal resultaten\n            filter_metadata (Optional[Dict[str, Any]]): Filter op metadata velden\n            \n        Returns:\n            List[Dict[str, Any]]: Lijst met gevonden modellen\n        '
np.random.seed(sum((ord(c) for c in query)))
query_embedding
np.random.rand(384).tolist()
results
self.collection.query(query_embeddings=[query_embedding], n_results=n_results, where=filter_metadata)
formatted_results
[]
results['ids']
for i, model_id in enumerate(results['ids'][0]):
    formatted_results.append({'id': model_id, 'score': results['distances'][0][i] if 'distances' in results else None, 'description': results['documents'][0][i] if 'documents' in results else None, 'metadata': results['metadatas'][0][i] if 'metadatas' in results else None})
formatted_results
List
Dict[str, Any]

self
'\n        Lijst alle opgeslagen modellen\n        \n        Returns:\n            List[Dict[str, Any]]: Lijst met alle modellen\n        '
results
self.collection.get()
formatted_results
[]
results['ids']
for i, model_id in enumerate(results['ids']):
    formatted_results.append({'id': model_id, 'description': results['documents'][i] if 'documents' in results else None, 'metadata': results['metadatas'][i] if 'metadatas' in results else None})
formatted_results
List
Dict[str, Any]

self
model_id: str
'\n        Verwijder een model uit de database\n        \n        Args:\n            model_id (str): ID van het model\n            \n        Returns:\n            bool: True als verwijderen gelukt is\n        '
self.collection.delete(ids=[model_id])
print(f'Model verwijderd: {model_id}')
return True
except Exception as e:
    print(f'Fout bij verwijderen model {model_id}: {e}')
    return False



BlenderModelDB

os.path.join
OUTPUT_DIR
'test_model.blend'

db.add_model
model_path=blend_path
description='Een eenvoudige rode kubus gecentreerd op de oorsprong'
metadata={'author': 'Test Gebruiker', 'objects': ['cube'], 'colors': ['red'], 'tags': ['simple', 'geometric', 'test']}
print
f'Toegevoegd model ID: {model_id}'

db.search_models
'kubus rood'
n_results=3
print
'\nZoekresultaten:'
i
result

enumerate
results
print(f'Resultaat {i + 1}:')
print(f"  ID: {result['id']}")
print(f"  Score: {result['score']}")
print(f"  Beschrijving: {result['description']}")
print(f"  Bestandspad: {result['metadata']['file_path']}")
print(f"  Tags: {result['metadata'].get('tags', [])}")
print()
os


str
self

chromadb.PersistentClient
path=CHROMA_DB_PATH
self.collection
self.client.get_collection(name=collection_name)
print(f"Bestaande collectie '{collection_name}' geopend")
Exception
self.collection = self.client.create_collection(name=collection_name)
print(f"Nieuwe collectie '{collection_name}' aangemaakt")
str
str
Dict[str, Any]
Optional[List[float]]

'model_'
{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}
'_'
{os.path.basename(model_path)}
embedding

None
np.random.seed(sum((ord(c) for c in model_path + description)))
embedding
np.random.rand(384).tolist()

'created_at'
'file_path'
'file_name'
'file_size'
metadata
datetime.datetime.now().isoformat()
model_path
os.path.basename(model_path)
os.path.getsize(model_path) if os.path.exists(model_path) else 0
self.collection.add
ids=[model_id]
embeddings=[embedding]
metadatas=[full_metadata]
documents=[description]
print
f'Model toegevoegd: {model_id}'

str
int
Optional[Dict[str, Any]]
np.random.seed
sum((ord(c) for c in query))

np.random.rand(384).tolist

self.collection.query
query_embeddings=[query_embedding]
n_results=n_results
where=filter_metadata


results
'ids'

(i, model_id)
enumerate(results['ids'][0])
formatted_results.append({'id': model_id, 'score': results['distances'][0][i] if 'distances' in results else None, 'description': results['documents'][0][i] if 'documents' in results else None, 'metadata': results['metadatas'][0][i] if 'metadatas' in results else None})


Dict
(str, Any)


self.collection.get


results
'ids'

(i, model_id)
enumerate(results['ids'])
formatted_results.append({'id': model_id, 'description': results['documents'][i] if 'documents' in results else None, 'metadata': results['metadatas'][i] if 'metadatas' in results else None})


Dict
(str, Any)

str
self.collection.delete(ids=[model_id])
print(f'Model verwijderd: {model_id}')
True
Exception
print(f'Fout bij verwijderen model {model_id}: {e}')
return False

os.path


db

blend_path
'Een eenvoudige rode kubus gecentreerd op de oorsprong'
{'author': 'Test Gebruiker', 'objects': ['cube'], 'colors': ['red'], 'tags': ['simple', 'geometric', 'test']}

'Toegevoegd model ID: '
{model_id}
db

3





print
f'Resultaat {i + 1}:'
print
f"  ID: {result['id']}"
print
f"  Score: {result['score']}"
print
f"  Beschrijving: {result['description']}"
print
f"  Bestandspad: {result['metadata']['file_path']}"
print
f"  Tags: {result['metadata'].get('tags', [])}"
print



chromadb

CHROMA_DB_PATH
self

self.client.get_collection
name=collection_name
print
f"Bestaande collectie '{collection_name}' geopend"

self.collection
self.client.create_collection(name=collection_name)
print(f"Nieuwe collectie '{collection_name}' aangemaakt")


Dict
(str, Any)

Optional
List[float]

datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
os.path.basename(model_path)

np.random.seed
sum((ord(c) for c in model_path + description))

np.random.rand(384).tolist

datetime.datetime.now().isoformat

os.path.basename
model_path
os.path.exists(model_path)
os.path.getsize(model_path)
0
self.collection

[model_id]
[embedding]
[full_metadata]
[description]

'Model toegevoegd: '
{model_id}


Optional
Dict[str, Any]

np.random

sum
(ord(c) for c in query)
np.random.rand(384)

self.collection

[query_embedding]
n_results
filter_metadata

i
model_id

enumerate
results['ids'][0]
formatted_results.append({'id': model_id, 'score': results['distances'][0][i] if 'distances' in results else None, 'description': results['documents'][0][i] if 'documents' in results else None, 'metadata': results['metadatas'][0][i] if 'metadatas' in results else None})

str
Any

self.collection


i
model_id

enumerate
results['ids']
formatted_results.append({'id': model_id, 'description': results['documents'][i] if 'documents' in results else None, 'metadata': results['metadatas'][i] if 'metadatas' in results else None})

str
Any


self.collection.delete
ids=[model_id]
print
f'Model verwijderd: {model_id}'

print(f'Fout bij verwijderen model {model_id}: {e}')
False
os



'author'
'objects'
'colors'
'tags'
'Test Gebruiker'
['cube']
['red']
['simple', 'geometric', 'test']
model_id


'Resultaat '
{i + 1}
':'

'  ID: '
{result['id']}

'  Score: '
{result['score']}

'  Beschrijving: '
{result['description']}

'  Bestandspad: '
{result['metadata']['file_path']}

'  Tags: '
{result['metadata'].get('tags', [])}




self.client

collection_name

"Bestaande collectie '"
{collection_name}
"' geopend"
self

self.client.create_collection
name=collection_name
print
f"Nieuwe collectie '{collection_name}' aangemaakt"

str
Any


List
float

datetime.datetime.now().strftime
'%Y%m%d_%H%M%S'
os.path.basename
model_path
np.random

sum
(ord(c) for c in model_path + description)
np.random.rand(384)

datetime.datetime.now()

os.path


os.path.exists
model_path
os.path.getsize
model_path
self

model_id

embedding

full_metadata

description

model_id

Dict
(str, Any)

np


ord(c)
 for c in query
np.random.rand
384
self

query_embedding






results['ids']
0

formatted_results.append
{'id': model_id, 'score': results['distances'][0][i] if 'distances' in results else None, 'description': results['documents'][0][i] if 'documents' in results else None, 'metadata': results['metadatas'][0][i] if 'metadatas' in results else None}


self




results
'ids'

formatted_results.append
{'id': model_id, 'description': results['documents'][i] if 'documents' in results else None, 'metadata': results['metadatas'][i] if 'metadatas' in results else None}


self.collection

[model_id]

'Model verwijderd: '
{model_id}
print
f'Fout bij verwijderen model {model_id}: {e}'

'cube'

'red'

'simple'
'geometric'
'test'


i + 1
result['id']
result['score']
result['description']
result['metadata']['file_path']
result['metadata'].get('tags', [])
self


collection_name

self.client

collection_name

"Nieuwe collectie '"
{collection_name}
"' aangemaakt"




datetime.datetime.now()

os.path


np


ord(c)
 for c in model_path + description
np.random.rand
384
datetime.datetime.now
os

os.path


os.path









str
Any


ord
c
c
query
np.random



results
'ids'

formatted_results

'id'
'score'
'description'
'metadata'
model_id
results['distances'][0][i] if 'distances' in results else None
results['documents'][0][i] if 'documents' in results else None
results['metadatas'][0][i] if 'metadatas' in results else None


formatted_results

'id'
'description'
'metadata'
model_id
results['documents'][i] if 'documents' in results else None
results['metadatas'][i] if 'metadatas' in results else None
self

model_id

model_id

'Fout bij verwijderen model '
{model_id}
': '
{e}
i

1
result
'id'

result
'score'

result
'description'

result['metadata']
'file_path'

result['metadata'].get
'tags'
[]


self


collection_name
datetime.datetime.now
os


ord
c
c
model_path + description
np.random

datetime.datetime


os

os







np




'distances' in results
results['distances'][0][i]
None
'documents' in results
results['documents'][0][i]
None
'metadatas' in results
results['metadatas'][0][i]
None


'documents' in results
results['documents'][i]
None
'metadatas' in results
results['metadatas'][i]
None



model_id
e




result
'metadata'

result['metadata']




datetime.datetime





model_path

description
np

datetime




'distances'

results
results['distances'][0]
i

'documents'

results
results['documents'][0]
i

'metadatas'

results
results['metadatas'][0]
i

'documents'

results
results['documents']
i

'metadatas'

results
results['metadatas']
i




result
'metadata'

datetime






results['distances']
0



results['documents']
0



results['metadatas']
0



results
'documents'



results
'metadatas'




results
'distances'

results
'documents'

results
'metadatas'





