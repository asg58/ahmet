from typing import Dict, List, Any
import argparse
import json
import os
import sys
from blender_chroma_db import BlenderModelDB
from blender_config import PROJECT_ROOT

def find_blend_files(directory: str=PROJECT_ROOT) -> List[str]:
    """
    Zoek alle .blend bestanden in een directory en subdirectories
    
    Args:
        directory (str): De directory om te doorzoeken
        
    Returns:
        List[str]: Lijst met paden naar .blend bestanden
    """
    blend_files = []
    for root, dirs, files in os.walk(directory):
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
    metadata = {'filename': filename, 'tags_list': []}
    lower_name = name.lower()
    tag_keywords = {'car': ['auto', 'car', 'vehicle'], 'cube': ['cube', 'kubus'], 'sphere': ['sphere', 'bol'], 'text': ['text', 'tekst', 'letter'], 'ring': ['ring', 'rings', 'ringen'], 'doosletter': ['doosletter', 'doosletters'], '3d': ['3d'], 'vertical': ['vertical', 'verticaal'], 'simple': ['simple', 'eenvoudig']}
    for tag, keywords in tag_keywords.items():
        if any((keyword in lower_name for keyword in keywords)):
            metadata['tags_list'].append(tag)
    metadata['tags'] = ','.join(metadata['tags_list'])
    del metadata['tags_list']
    metadata['created'] = os.path.getctime(filepath)
    metadata['modified'] = os.path.getmtime(filepath)
    metadata['size'] = os.path.getsize(filepath)
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
    description = f'3D Blender model: {name}'
    if metadata['tags']:
        description += f". Tags: {metadata['tags']}"
    rel_path = os.path.relpath(filepath, PROJECT_ROOT)
    description += f'. Bestandslocatie: {rel_path}'
    return description
def index_files(db: BlenderModelDB, files: List[str], force: bool=False) -> int:
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
    existing_models = []
    if not force:
        existing_models = db.list_all_models()
        existing_paths = [model['metadata']['file_path'] for model in existing_models if 'file_path' in model['metadata']]
        print(f'Er zijn {len(existing_models)} modellen in de database')
    for filepath in files:
        if not force and filepath in existing_paths:
            print(f'Overgeslagen (bestaat al): {os.path.basename(filepath)}')
            continue
        metadata = extract_metadata_from_filename(filepath)
        description = generate_description(filepath, metadata)
        try:
            db.add_model(model_path=filepath, description=description, metadata=metadata)
            indexed_count += 1
            print(f'Geïndexeerd: {os.path.basename(filepath)}')
        except Exception as e:
            print(f'Fout bij indexeren {filepath}: {e}')
    return indexed_count
def main():
    """Hoofdfunctie"""
    parser = argparse.ArgumentParser(description='Indexeer Blender .blend bestanden in ChromaDB')
    parser.add_argument('--dir', type=str, default=PROJECT_ROOT, help='Directory om te doorzoeken (standaard: project root)')
    parser.add_argument('--force', action='store_true', help='Forceer herindexering van alle bestanden')
    parser.add_argument('--collection', type=str, default='blender_models', help='Naam van de ChromaDB collectie')
    args = parser.parse_args()
    db = BlenderModelDB(collection_name=args.collection)
    print(f'Zoeken naar .blend bestanden in {args.dir}...')
    blend_files = find_blend_files(args.dir)
    print(f'{len(blend_files)} .blend bestanden gevonden')
    print('Indexeren van bestanden...')
    indexed_count = index_files(db, blend_files, args.force)
    print(f'\nIndexering voltooid. {indexed_count} bestanden geïndexeerd.')
    all_models = db.list_all_models()
    print(f'\nTotaal aantal modellen in database: {len(all_models)}')
    if len(all_models) > 0:
        print('\nVoorbeeld zoekopdracht:')
        search_term = 'auto' if any(('car' in model['metadata'].get('tags', '') for model in all_models)) else 'model'
        results = db.search_models(search_term, n_results=3)
        print(f"\nZoekresultaten voor '{search_term}':")
        for i, result in enumerate(results):
            print(f'Resultaat {i + 1}:')
            print(f"  ID: {result['id']}")
            print(f"  Beschrijving: {result['description']}")
            print(f"  Bestandspad: {result['metadata']['file_path']}")
            print(f"  Tags: {result['metadata'].get('tags', '')}")
            print()
if __name__ == '__main__':
    main()
os
sys
argparse
Dict
List
Any
json
PROJECT_ROOT
BlenderModelDB
directory: str=PROJECT_ROOT
'\n    Zoek alle .blend bestanden in een directory en subdirectories\n    \n    Args:\n        directory (str): De directory om te doorzoeken\n        \n    Returns:\n        List[str]: Lijst met paden naar .blend bestanden\n    '
blend_files = []
for root, dirs, files in os.walk(directory):
    dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'chroma_db']]
    for file in files:
        if file.endswith('.blend'):
            full_path = os.path.join(root, file)
            blend_files.append(full_path)
return blend_files
List[str]
filepath: str
'\n    Haal metadata uit de bestandsnaam\n    \n    Args:\n        filepath (str): Pad naar het bestand\n        \n    Returns:\n        Dict[str, Any]: Metadata uit de bestandsnaam\n    '
filename = os.path.basename(filepath)
name, _ = os.path.splitext(filename)
metadata = {'filename': filename, 'tags_list': []}
lower_name = name.lower()
tag_keywords = {'car': ['auto', 'car', 'vehicle'], 'cube': ['cube', 'kubus'], 'sphere': ['sphere', 'bol'], 'text': ['text', 'tekst', 'letter'], 'ring': ['ring', 'rings', 'ringen'], 'doosletter': ['doosletter', 'doosletters'], '3d': ['3d'], 'vertical': ['vertical', 'verticaal'], 'simple': ['simple', 'eenvoudig']}
for tag, keywords in tag_keywords.items():
    if any((keyword in lower_name for keyword in keywords)):
        metadata['tags_list'].append(tag)
metadata['tags'] = ','.join(metadata['tags_list'])
del metadata['tags_list']
metadata['created'] = os.path.getctime(filepath)
metadata['modified'] = os.path.getmtime(filepath)
metadata['size'] = os.path.getsize(filepath)
return metadata
Dict[str, Any]
filepath: str, metadata: Dict[str, Any]
'\n    Genereer een beschrijving van het bestand\n    \n    Args:\n        filepath (str): Pad naar het bestand\n        metadata (Dict[str, Any]): Metadata voor het bestand\n        \n    Returns:\n        str: Beschrijving van het bestand\n    '
filename = os.path.basename(filepath)
name, _ = os.path.splitext(filename)
description = f'3D Blender model: {name}'
if metadata['tags']:
    description += f". Tags: {metadata['tags']}"
rel_path = os.path.relpath(filepath, PROJECT_ROOT)
description += f'. Bestandslocatie: {rel_path}'
return description
str
db: BlenderModelDB, files: List[str], force: bool=False
'\n    Indexeer bestanden in de database\n    \n    Args:\n        db (BlenderModelDB): Database object\n        files (List[str]): Lijst met bestandspaden\n        force (bool): Forceer herindexering van alle bestanden\n        \n    Returns:\n        int: Aantal geïndexeerde bestanden\n    '
indexed_count = 0
existing_models = []
if not force:
    existing_models = db.list_all_models()
    existing_paths = [model['metadata']['file_path'] for model in existing_models if 'file_path' in model['metadata']]
    print(f'Er zijn {len(existing_models)} modellen in de database')
for filepath in files:
    if not force and filepath in existing_paths:
        print(f'Overgeslagen (bestaat al): {os.path.basename(filepath)}')
        continue
    metadata = extract_metadata_from_filename(filepath)
    description = generate_description(filepath, metadata)
    try:
        db.add_model(model_path=filepath, description=description, metadata=metadata)
        indexed_count += 1
        print(f'Geïndexeerd: {os.path.basename(filepath)}')
    except Exception as e:
        print(f'Fout bij indexeren {filepath}: {e}')
return indexed_count
int

'Hoofdfunctie'
parser = argparse.ArgumentParser(description='Indexeer Blender .blend bestanden in ChromaDB')
parser.add_argument('--dir', type=str, default=PROJECT_ROOT, help='Directory om te doorzoeken (standaard: project root)')
parser.add_argument('--force', action='store_true', help='Forceer herindexering van alle bestanden')
parser.add_argument('--collection', type=str, default='blender_models', help='Naam van de ChromaDB collectie')
args = parser.parse_args()
db = BlenderModelDB(collection_name=args.collection)
print(f'Zoeken naar .blend bestanden in {args.dir}...')
blend_files = find_blend_files(args.dir)
print(f'{len(blend_files)} .blend bestanden gevonden')
print('Indexeren van bestanden...')
indexed_count = index_files(db, blend_files, args.force)
print(f'\nIndexering voltooid. {indexed_count} bestanden geïndexeerd.')
all_models = db.list_all_models()
print(f'\nTotaal aantal modellen in database: {len(all_models)}')
if len(all_models) > 0:
    print('\nVoorbeeld zoekopdracht:')
    search_term = 'auto' if any(('car' in model['metadata'].get('tags', '') for model in all_models)) else 'model'
    results = db.search_models(search_term, n_results=3)
    print(f"\nZoekresultaten voor '{search_term}':")
    for i, result in enumerate(results):
        print(f'Resultaat {i + 1}:')
        print(f"  ID: {result['id']}")
        print(f"  Beschrijving: {result['description']}")
        print(f"  Bestandspad: {result['metadata']['file_path']}")
        print(f"  Tags: {result['metadata'].get('tags', '')}")
        print()
__name__ == '__main__'
main()
directory: str
PROJECT_ROOT
'\n    Zoek alle .blend bestanden in een directory en subdirectories\n    \n    Args:\n        directory (str): De directory om te doorzoeken\n        \n    Returns:\n        List[str]: Lijst met paden naar .blend bestanden\n    '
blend_files
[]
(root, dirs, files)
os.walk(directory)
dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'chroma_db']]
for file in files:
    if file.endswith('.blend'):
        full_path = os.path.join(root, file)
        blend_files.append(full_path)
blend_files
List
str

filepath: str
'\n    Haal metadata uit de bestandsnaam\n    \n    Args:\n        filepath (str): Pad naar het bestand\n        \n    Returns:\n        Dict[str, Any]: Metadata uit de bestandsnaam\n    '
filename
os.path.basename(filepath)
(name, _)
os.path.splitext(filename)
metadata
{'filename': filename, 'tags_list': []}
lower_name
name.lower()
tag_keywords
{'car': ['auto', 'car', 'vehicle'], 'cube': ['cube', 'kubus'], 'sphere': ['sphere', 'bol'], 'text': ['text', 'tekst', 'letter'], 'ring': ['ring', 'rings', 'ringen'], 'doosletter': ['doosletter', 'doosletters'], '3d': ['3d'], 'vertical': ['vertical', 'verticaal'], 'simple': ['simple', 'eenvoudig']}
(tag, keywords)
tag_keywords.items()
if any((keyword in lower_name for keyword in keywords)):
    metadata['tags_list'].append(tag)
metadata['tags']
','.join(metadata['tags_list'])
metadata['tags_list']
metadata['created']
os.path.getctime(filepath)
metadata['modified']
os.path.getmtime(filepath)
metadata['size']
os.path.getsize(filepath)
metadata
Dict
(str, Any)

filepath: str
metadata: Dict[str, Any]
'\n    Genereer een beschrijving van het bestand\n    \n    Args:\n        filepath (str): Pad naar het bestand\n        metadata (Dict[str, Any]): Metadata voor het bestand\n        \n    Returns:\n        str: Beschrijving van het bestand\n    '
filename
os.path.basename(filepath)
(name, _)
os.path.splitext(filename)
description
f'3D Blender model: {name}'
metadata['tags']
description += f". Tags: {metadata['tags']}"
rel_path
os.path.relpath(filepath, PROJECT_ROOT)
description

f'. Bestandslocatie: {rel_path}'
description

db: BlenderModelDB
files: List[str]
force: bool
False
'\n    Indexeer bestanden in de database\n    \n    Args:\n        db (BlenderModelDB): Database object\n        files (List[str]): Lijst met bestandspaden\n        force (bool): Forceer herindexering van alle bestanden\n        \n    Returns:\n        int: Aantal geïndexeerde bestanden\n    '
indexed_count
0
existing_models
[]
not force
existing_models = db.list_all_models()
existing_paths = [model['metadata']['file_path'] for model in existing_models if 'file_path' in model['metadata']]
print(f'Er zijn {len(existing_models)} modellen in de database')
filepath
files
if not force and filepath in existing_paths:
    print(f'Overgeslagen (bestaat al): {os.path.basename(filepath)}')
    continue
metadata = extract_metadata_from_filename(filepath)
description = generate_description(filepath, metadata)
try:
    db.add_model(model_path=filepath, description=description, metadata=metadata)
    indexed_count += 1
    print(f'Geïndexeerd: {os.path.basename(filepath)}')
except Exception as e:
    print(f'Fout bij indexeren {filepath}: {e}')
indexed_count

'Hoofdfunctie'
parser
argparse.ArgumentParser(description='Indexeer Blender .blend bestanden in ChromaDB')
parser.add_argument('--dir', type=str, default=PROJECT_ROOT, help='Directory om te doorzoeken (standaard: project root)')
parser.add_argument('--force', action='store_true', help='Forceer herindexering van alle bestanden')
parser.add_argument('--collection', type=str, default='blender_models', help='Naam van de ChromaDB collectie')
args
parser.parse_args()
db
BlenderModelDB(collection_name=args.collection)
print(f'Zoeken naar .blend bestanden in {args.dir}...')
blend_files
find_blend_files(args.dir)
print(f'{len(blend_files)} .blend bestanden gevonden')
print('Indexeren van bestanden...')
indexed_count
index_files(db, blend_files, args.force)
print(f'\nIndexering voltooid. {indexed_count} bestanden geïndexeerd.')
all_models
db.list_all_models()
print(f'\nTotaal aantal modellen in database: {len(all_models)}')
len(all_models) > 0
print('\nVoorbeeld zoekopdracht:')
search_term = 'auto' if any(('car' in model['metadata'].get('tags', '') for model in all_models)) else 'model'
results = db.search_models(search_term, n_results=3)
print(f"\nZoekresultaten voor '{search_term}':")
for i, result in enumerate(results):
    print(f'Resultaat {i + 1}:')
    print(f"  ID: {result['id']}")
    print(f"  Beschrijving: {result['description']}")
    print(f"  Bestandspad: {result['metadata']['file_path']}")
    print(f"  Tags: {result['metadata'].get('tags', '')}")
    print()
__name__

'__main__'
main()
str



root
dirs
files

os.walk
directory
dirs[:]
[d for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'chroma_db']]
file
files
if file.endswith('.blend'):
    full_path = os.path.join(root, file)
    blend_files.append(full_path)



str

os.path.basename
filepath
name
_

os.path.splitext
filename

'filename'
'tags_list'
filename
[]

name.lower

'car'
'cube'
'sphere'
'text'
'ring'
'doosletter'
'3d'
'vertical'
'simple'
['auto', 'car', 'vehicle']
['cube', 'kubus']
['sphere', 'bol']
['text', 'tekst', 'letter']
['ring', 'rings', 'ringen']
['doosletter', 'doosletters']
['3d']
['vertical', 'verticaal']
['simple', 'eenvoudig']
tag
keywords

tag_keywords.items
any((keyword in lower_name for keyword in keywords))
metadata['tags_list'].append(tag)
metadata
'tags'

','.join
metadata['tags_list']
metadata
'tags_list'

metadata
'created'

os.path.getctime
filepath
metadata
'modified'

os.path.getmtime
filepath
metadata
'size'

os.path.getsize
filepath


str
Any

str
Dict[str, Any]

os.path.basename
filepath
name
_

os.path.splitext
filename

'3D Blender model: '
{name}
metadata
'tags'

description

f". Tags: {metadata['tags']}"

os.path.relpath
filepath
PROJECT_ROOT

'. Bestandslocatie: '
{rel_path}

BlenderModelDB
List[str]
bool




force
existing_models
db.list_all_models()
existing_paths
[model['metadata']['file_path'] for model in existing_models if 'file_path' in model['metadata']]
print(f'Er zijn {len(existing_models)} modellen in de database')


not force and filepath in existing_paths
print(f'Overgeslagen (bestaat al): {os.path.basename(filepath)}')
continue
metadata
extract_metadata_from_filename(filepath)
description
generate_description(filepath, metadata)
db.add_model(model_path=filepath, description=description, metadata=metadata)
indexed_count += 1
print(f'Geïndexeerd: {os.path.basename(filepath)}')
except Exception as e:
    print(f'Fout bij indexeren {filepath}: {e}')


argparse.ArgumentParser
description='Indexeer Blender .blend bestanden in ChromaDB'
parser.add_argument
'--dir'
type=str
default=PROJECT_ROOT
help='Directory om te doorzoeken (standaard: project root)'
parser.add_argument
'--force'
action='store_true'
help='Forceer herindexering van alle bestanden'
parser.add_argument
'--collection'
type=str
default='blender_models'
help='Naam van de ChromaDB collectie'

parser.parse_args

BlenderModelDB
collection_name=args.collection
print
f'Zoeken naar .blend bestanden in {args.dir}...'

find_blend_files
args.dir
print
f'{len(blend_files)} .blend bestanden gevonden'
print
'Indexeren van bestanden...'

index_files
db
blend_files
args.force
print
f'\nIndexering voltooid. {indexed_count} bestanden geïndexeerd.'

db.list_all_models
print
f'\nTotaal aantal modellen in database: {len(all_models)}'
len(all_models)

0
print('\nVoorbeeld zoekopdracht:')
search_term
'auto' if any(('car' in model['metadata'].get('tags', '') for model in all_models)) else 'model'
results
db.search_models(search_term, n_results=3)
print(f"\nZoekresultaten voor '{search_term}':")
(i, result)
enumerate(results)
print(f'Resultaat {i + 1}:')
print(f"  ID: {result['id']}")
print(f"  Beschrijving: {result['description']}")
print(f"  Bestandspad: {result['metadata']['file_path']}")
print(f"  Tags: {result['metadata'].get('tags', '')}")
print()

main




os


dirs
:

d
 for d in dirs if d not in ['.git', 'node_modules', '__pycache__', 'chroma_db']


file.endswith('.blend')
full_path = os.path.join(root, file)
blend_files.append(full_path)

os.path




os.path




name

'auto'
'car'
'vehicle'

'cube'
'kubus'

'sphere'
'bol'

'text'
'tekst'
'letter'

'ring'
'rings'
'ringen'

'doosletter'
'doosletters'

'3d'

'vertical'
'verticaal'

'simple'
'eenvoudig'



tag_keywords

any
(keyword in lower_name for keyword in keywords)
metadata['tags_list'].append(tag)

','

metadata
'tags_list'



os.path



os.path



os.path





Dict
(str, Any)

os.path




os.path


name


'. Tags: '
{metadata['tags']}
os.path



rel_path

List
str




db.list_all_models

model['metadata']['file_path']
 for model in existing_models if 'file_path' in model['metadata']
print
f'Er zijn {len(existing_models)} modellen in de database'

not force
filepath in existing_paths
print(f'Overgeslagen (bestaat al): {os.path.basename(filepath)}')

extract_metadata_from_filename
filepath

generate_description
filepath
metadata
db.add_model(model_path=filepath, description=description, metadata=metadata)
indexed_count

1
print(f'Geïndexeerd: {os.path.basename(filepath)}')
Exception
print(f'Fout bij indexeren {filepath}: {e}')
argparse

'Indexeer Blender .blend bestanden in ChromaDB'
parser

str
PROJECT_ROOT
'Directory om te doorzoeken (standaard: project root)'
parser

'store_true'
'Forceer herindexering van alle bestanden'
parser

str
'blender_models'
'Naam van de ChromaDB collectie'
parser


args.collection

'Zoeken naar .blend bestanden in '
{args.dir}
'...'

args


{len(blend_files)}
' .blend bestanden gevonden'




args


'\nIndexering voltooid. '
{indexed_count}
' bestanden geïndexeerd.'
db


'\nTotaal aantal modellen in database: '
{len(all_models)}
len
all_models
print
'\nVoorbeeld zoekopdracht:'

any(('car' in model['metadata'].get('tags', '') for model in all_models))
'auto'
'model'

db.search_models
search_term
n_results=3
print
f"\nZoekresultaten voor '{search_term}':"
i
result

enumerate
results
print(f'Resultaat {i + 1}:')
print(f"  ID: {result['id']}")
print(f"  Beschrijving: {result['description']}")
print(f"  Bestandspad: {result['metadata']['file_path']}")
print(f"  Tags: {result['metadata'].get('tags', '')}")
print()




d
dirs
d not in ['.git', 'node_modules', '__pycache__', 'chroma_db']
file.endswith
'.blend'
full_path
os.path.join(root, file)
blend_files.append(full_path)
os

os




keyword in lower_name
 for keyword in keywords
metadata['tags_list'].append
tag

os

os

os


str
Any

os

os


metadata['tags']
os




db

model['metadata']
'file_path'

model
existing_models
'file_path' in model['metadata']

'Er zijn '
{len(existing_models)}
' modellen in de database'

force
filepath

existing_paths
print
f'Overgeslagen (bestaat al): {os.path.basename(filepath)}'





db.add_model
model_path=filepath
description=description
metadata=metadata

print
f'Geïndexeerd: {os.path.basename(filepath)}'

print(f'Fout bij indexeren {filepath}: {e}')








args

args.dir

len(blend_files)

indexed_count

len(all_models)



any
('car' in model['metadata'].get('tags', '') for model in all_models)
db


3

"\nZoekresultaten voor '"
{search_term}
"':"




print
f'Resultaat {i + 1}:'
print
f"  ID: {result['id']}"
print
f"  Beschrijving: {result['description']}"
print
f"  Bestandspad: {result['metadata']['file_path']}"
print
f"  Tags: {result['metadata'].get('tags', '')}"
print


d

['.git', 'node_modules', '__pycache__', 'chroma_db']
file


os.path.join
root
file
blend_files.append
full_path


keyword

lower_name
keyword
keywords
metadata['tags_list']









metadata
'tags'



model
'metadata'



'file_path'

model['metadata']
len(existing_models)




'Overgeslagen (bestaat al): '
{os.path.basename(filepath)}
db

filepath
description
metadata

'Geïndexeerd: '
{os.path.basename(filepath)}
print
f'Fout bij indexeren {filepath}: {e}'

args

len
blend_files

len
all_models

'car' in model['metadata'].get('tags', '')
 for model in all_models

search_term

'Resultaat '
{i + 1}
':'

'  ID: '
{result['id']}

'  Beschrijving: '
{result['description']}

'  Bestandspad: '
{result['metadata']['file_path']}

'  Tags: '
{result['metadata'].get('tags', '')}


'.git'
'node_modules'
'__pycache__'
'chroma_db'


os.path



blend_files






metadata
'tags_list'



model
'metadata'

len
existing_models
os.path.basename(filepath)




os.path.basename(filepath)

'Fout bij indexeren '
{filepath}
': '
{e}





'car'

model['metadata'].get('tags', '')
model
all_models

i + 1
result['id']
result['description']
result['metadata']['file_path']
result['metadata'].get('tags', '')
os






os.path.basename
filepath
os.path.basename
filepath
filepath
e
model['metadata'].get
'tags'
''


i

1
result
'id'

result
'description'

result['metadata']
'file_path'

result['metadata'].get
'tags'
''

os.path


os.path




model['metadata']




result
'metadata'

result['metadata']

os

os

model
'metadata'


result
'metadata'




