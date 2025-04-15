import datetime
import json
import os
import shutil
import sys

def create_checkpoint(checkpoint_name=None):
    """
    Maakt een checkpoint van de huidige projectstatus.
    Kopieert alle Python bestanden en .blend bestanden naar een checkpoint directory.
    """
    if not checkpoint_name:
        now = datetime.datetime.now()
        checkpoint_name = now.strftime('checkpoint_%Y%m%d_%H%M%S')
    checkpoints_dir = os.path.join(os.getcwd(), 'checkpoints')
    if not os.path.exists(checkpoints_dir):
        os.makedirs(checkpoints_dir)
        print(f'Checkpoints map aangemaakt: {checkpoints_dir}')
    checkpoint_dir = os.path.join(checkpoints_dir, checkpoint_name)
    if not os.path.exists(checkpoint_dir):
        os.makedirs(checkpoint_dir)
    extensions_to_copy = ['.py', '.blend', '.md']
    files_to_copy = []
    for root, dirs, files in os.walk(os.getcwd()):
        if 'checkpoints' in root:
            continue
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in extensions_to_copy:
                source_path = os.path.join(root, file)
                rel_path = os.path.relpath(source_path, os.getcwd())
                files_to_copy.append(rel_path)
    for file_path in files_to_copy:
        source_path = os.path.join(os.getcwd(), file_path)
        dest_path = os.path.join(checkpoint_dir, file_path)
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        shutil.copy2(source_path, dest_path)
        print(f'Gekopieerd: {file_path}')
    checkpoint_info = {'name': checkpoint_name, 'created_at': datetime.datetime.now().isoformat(), 'files_count': len(files_to_copy), 'files': files_to_copy}
    with open(os.path.join(checkpoint_dir, 'checkpoint_info.json'), 'w') as f:
        json.dump(checkpoint_info, f, indent=4)
    print(f'\nCheckpoint succesvol gemaakt: {checkpoint_name}')
    print(f'Aantal bestanden: {len(files_to_copy)}')
    print(f'Locatie: {checkpoint_dir}')
    return (checkpoint_dir, checkpoint_info)
def restore_checkpoint(checkpoint_name):
    """
    Herstelt bestanden vanuit een checkpoint.
    """
    checkpoints_dir = os.path.join(os.getcwd(), 'checkpoints')
    checkpoint_dir = os.path.join(checkpoints_dir, checkpoint_name)
    if not os.path.exists(checkpoint_dir):
        checkpoint_dir = os.path.join(os.getcwd(), checkpoint_name)
    if not os.path.exists(checkpoint_dir):
        print(f"Fout: Checkpoint '{checkpoint_name}' bestaat niet.")
        return False
    info_file = os.path.join(checkpoint_dir, 'checkpoint_info.json')
    if not os.path.exists(info_file):
        print(f"Fout: Checkpoint info bestand ontbreekt in '{checkpoint_name}'.")
        return False
    with open(info_file, 'r') as f:
        info = json.load(f)
    print(f"Je staat op het punt om {info['files_count']} bestanden te herstellen van checkpoint: {checkpoint_name}")
    response = input('Weet je zeker dat je door wilt gaan? (ja/nee): ')
    if response.lower() not in ['ja', 'j', 'yes', 'y']:
        print('Herstel geannuleerd.')
        return False
    backup_checkpoint = 'backup_before_restore_' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
    create_checkpoint(backup_checkpoint)
    for file_path in info['files']:
        source_path = os.path.join(checkpoint_dir, file_path)
        dest_path = os.path.join(os.getcwd(), file_path)
        if os.path.exists(source_path):
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(source_path, dest_path)
            print(f'Hersteld: {file_path}')
    print(f"\nCheckpoint '{checkpoint_name}' succesvol hersteld.")
    print(f'Er is een backup gemaakt van de staat voor herstel: checkpoints/{backup_checkpoint}')
    return True
def list_checkpoints():
    """
    Toont een lijst van beschikbare checkpoints.
    """
    checkpoints = []
    checkpoints_dir = os.path.join(os.getcwd(), 'checkpoints')
    if os.path.exists(checkpoints_dir):
        for item in os.listdir(checkpoints_dir):
            item_path = os.path.join(checkpoints_dir, item)
            if os.path.isdir(item_path):
                info_file = os.path.join(item_path, 'checkpoint_info.json')
                if os.path.exists(info_file):
                    with open(info_file, 'r') as f:
                        info = json.load(f)
                    checkpoints.append((item, info['created_at'], info['files_count'], True))
    for item in os.listdir(os.getcwd()):
        if os.path.isdir(item) and item.startswith('checkpoint_') and (item != 'checkpoints'):
            info_file = os.path.join(os.getcwd(), item, 'checkpoint_info.json')
            if os.path.exists(info_file):
                with open(info_file, 'r') as f:
                    info = json.load(f)
                checkpoints.append((item, info['created_at'], info['files_count'], False))
    if not checkpoints:
        print('Geen checkpoints gevonden.')
        return
    print('\nBeschikbare checkpoints:')
    print('-' * 100)
    print(f"{'Naam':<30} {'Aangemaakt op':<25} {'Aantal bestanden':<15} {'Locatie':<20}")
    print('-' * 100)
    for name, created_at, files_count, in_subdir in sorted(checkpoints, key=lambda x: x[1], reverse=True):
        try:
            created_dt = datetime.datetime.fromisoformat(created_at)
            created_formatted = created_dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            created_formatted = created_at
        location = 'checkpoints/' if in_subdir else 'root/'
        print(f'{name:<30} {created_formatted:<25} {files_count:<15} {location:<20}')
def main():
    """main function."""
    if len(sys.argv) < 2:
        create_checkpoint()
        return
    command = sys.argv[1].lower()
    if command == 'list':
        list_checkpoints()
    elif command == 'restore':
        if len(sys.argv) < 3:
            print('Gebruik: python create_checkpoint.py restore CHECKPOINT_NAAM')
            return
        restore_checkpoint(sys.argv[2])
    elif command == 'create':
        if len(sys.argv) < 3:
            create_checkpoint()
        else:
            create_checkpoint(sys.argv[2])
    else:
        print('Onbekend commando. Gebruik: create, list, of restore.')
if __name__ == '__main__':
    main()
os
shutil
datetime
json
sys
checkpoint_name=None
'\n    Maakt een checkpoint van de huidige projectstatus.\n    Kopieert alle Python bestanden en .blend bestanden naar een checkpoint directory.\n    '
if not checkpoint_name:
    now = datetime.datetime.now()
    checkpoint_name = now.strftime('checkpoint_%Y%m%d_%H%M%S')
checkpoints_dir = os.path.join(os.getcwd(), 'checkpoints')
if not os.path.exists(checkpoints_dir):
    os.makedirs(checkpoints_dir)
    print(f'Checkpoints map aangemaakt: {checkpoints_dir}')
checkpoint_dir = os.path.join(checkpoints_dir, checkpoint_name)
if not os.path.exists(checkpoint_dir):
    os.makedirs(checkpoint_dir)
extensions_to_copy = ['.py', '.blend', '.md']
files_to_copy = []
for root, dirs, files in os.walk(os.getcwd()):
    if 'checkpoints' in root:
        continue
    for file in files:
        ext = os.path.splitext(file)[1].lower()
        if ext in extensions_to_copy:
            source_path = os.path.join(root, file)
            rel_path = os.path.relpath(source_path, os.getcwd())
            files_to_copy.append(rel_path)
for file_path in files_to_copy:
    source_path = os.path.join(os.getcwd(), file_path)
    dest_path = os.path.join(checkpoint_dir, file_path)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    shutil.copy2(source_path, dest_path)
    print(f'Gekopieerd: {file_path}')
checkpoint_info = {'name': checkpoint_name, 'created_at': datetime.datetime.now().isoformat(), 'files_count': len(files_to_copy), 'files': files_to_copy}
with open(os.path.join(checkpoint_dir, 'checkpoint_info.json'), 'w') as f:
    json.dump(checkpoint_info, f, indent=4)
print(f'\nCheckpoint succesvol gemaakt: {checkpoint_name}')
print(f'Aantal bestanden: {len(files_to_copy)}')
print(f'Locatie: {checkpoint_dir}')
return (checkpoint_dir, checkpoint_info)
checkpoint_name
'\n    Herstelt bestanden vanuit een checkpoint.\n    '
checkpoints_dir = os.path.join(os.getcwd(), 'checkpoints')
checkpoint_dir = os.path.join(checkpoints_dir, checkpoint_name)
if not os.path.exists(checkpoint_dir):
    checkpoint_dir = os.path.join(os.getcwd(), checkpoint_name)
if not os.path.exists(checkpoint_dir):
    print(f"Fout: Checkpoint '{checkpoint_name}' bestaat niet.")
    return False
info_file = os.path.join(checkpoint_dir, 'checkpoint_info.json')
if not os.path.exists(info_file):
    print(f"Fout: Checkpoint info bestand ontbreekt in '{checkpoint_name}'.")
    return False
with open(info_file, 'r') as f:
    info = json.load(f)
print(f"Je staat op het punt om {info['files_count']} bestanden te herstellen van checkpoint: {checkpoint_name}")
response = input('Weet je zeker dat je door wilt gaan? (ja/nee): ')
if response.lower() not in ['ja', 'j', 'yes', 'y']:
    print('Herstel geannuleerd.')
    return False
backup_checkpoint = 'backup_before_restore_' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
create_checkpoint(backup_checkpoint)
for file_path in info['files']:
    source_path = os.path.join(checkpoint_dir, file_path)
    dest_path = os.path.join(os.getcwd(), file_path)
    if os.path.exists(source_path):
        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
        shutil.copy2(source_path, dest_path)
        print(f'Hersteld: {file_path}')
print(f"\nCheckpoint '{checkpoint_name}' succesvol hersteld.")
print(f'Er is een backup gemaakt van de staat voor herstel: checkpoints/{backup_checkpoint}')
return True

'\n    Toont een lijst van beschikbare checkpoints.\n    '
checkpoints = []
checkpoints_dir = os.path.join(os.getcwd(), 'checkpoints')
if os.path.exists(checkpoints_dir):
    for item in os.listdir(checkpoints_dir):
        item_path = os.path.join(checkpoints_dir, item)
        if os.path.isdir(item_path):
            info_file = os.path.join(item_path, 'checkpoint_info.json')
            if os.path.exists(info_file):
                with open(info_file, 'r') as f:
                    info = json.load(f)
                checkpoints.append((item, info['created_at'], info['files_count'], True))
for item in os.listdir(os.getcwd()):
    if os.path.isdir(item) and item.startswith('checkpoint_') and (item != 'checkpoints'):
        info_file = os.path.join(os.getcwd(), item, 'checkpoint_info.json')
        if os.path.exists(info_file):
            with open(info_file, 'r') as f:
                info = json.load(f)
            checkpoints.append((item, info['created_at'], info['files_count'], False))
if not checkpoints:
    print('Geen checkpoints gevonden.')
    return
print('\nBeschikbare checkpoints:')
print('-' * 100)
print(f"{'Naam':<30} {'Aangemaakt op':<25} {'Aantal bestanden':<15} {'Locatie':<20}")
print('-' * 100)
for name, created_at, files_count, in_subdir in sorted(checkpoints, key=lambda x: x[1], reverse=True):
    try:
        created_dt = datetime.datetime.fromisoformat(created_at)
        created_formatted = created_dt.strftime('%Y-%m-%d %H:%M:%S')
    except:
        created_formatted = created_at
    location = 'checkpoints/' if in_subdir else 'root/'
    print(f'{name:<30} {created_formatted:<25} {files_count:<15} {location:<20}')

'main function.'
if len(sys.argv) < 2:
    create_checkpoint()
    return
command = sys.argv[1].lower()
if command == 'list':
    list_checkpoints()
elif command == 'restore':
    if len(sys.argv) < 3:
        print('Gebruik: python create_checkpoint.py restore CHECKPOINT_NAAM')
        return
    restore_checkpoint(sys.argv[2])
elif command == 'create':
    if len(sys.argv) < 3:
        create_checkpoint()
    else:
        create_checkpoint(sys.argv[2])
else:
    print('Onbekend commando. Gebruik: create, list, of restore.')
__name__ == '__main__'
main()
checkpoint_name
None
'\n    Maakt een checkpoint van de huidige projectstatus.\n    Kopieert alle Python bestanden en .blend bestanden naar een checkpoint directory.\n    '
not checkpoint_name
now = datetime.datetime.now()
checkpoint_name = now.strftime('checkpoint_%Y%m%d_%H%M%S')
checkpoints_dir
os.path.join(os.getcwd(), 'checkpoints')
not os.path.exists(checkpoints_dir)
os.makedirs(checkpoints_dir)
print(f'Checkpoints map aangemaakt: {checkpoints_dir}')
checkpoint_dir
os.path.join(checkpoints_dir, checkpoint_name)
not os.path.exists(checkpoint_dir)
os.makedirs(checkpoint_dir)
extensions_to_copy
['.py', '.blend', '.md']
files_to_copy
[]
(root, dirs, files)
os.walk(os.getcwd())
if 'checkpoints' in root:
    continue
for file in files:
    ext = os.path.splitext(file)[1].lower()
    if ext in extensions_to_copy:
        source_path = os.path.join(root, file)
        rel_path = os.path.relpath(source_path, os.getcwd())
        files_to_copy.append(rel_path)
file_path
files_to_copy
source_path = os.path.join(os.getcwd(), file_path)
dest_path = os.path.join(checkpoint_dir, file_path)
os.makedirs(os.path.dirname(dest_path), exist_ok=True)
shutil.copy2(source_path, dest_path)
print(f'Gekopieerd: {file_path}')
checkpoint_info
{'name': checkpoint_name, 'created_at': datetime.datetime.now().isoformat(), 'files_count': len(files_to_copy), 'files': files_to_copy}
open(os.path.join(checkpoint_dir, 'checkpoint_info.json'), 'w') as f
json.dump(checkpoint_info, f, indent=4)
print(f'\nCheckpoint succesvol gemaakt: {checkpoint_name}')
print(f'Aantal bestanden: {len(files_to_copy)}')
print(f'Locatie: {checkpoint_dir}')
(checkpoint_dir, checkpoint_info)
checkpoint_name
'\n    Herstelt bestanden vanuit een checkpoint.\n    '
checkpoints_dir
os.path.join(os.getcwd(), 'checkpoints')
checkpoint_dir
os.path.join(checkpoints_dir, checkpoint_name)
not os.path.exists(checkpoint_dir)
checkpoint_dir = os.path.join(os.getcwd(), checkpoint_name)
not os.path.exists(checkpoint_dir)
print(f"Fout: Checkpoint '{checkpoint_name}' bestaat niet.")
return False
info_file
os.path.join(checkpoint_dir, 'checkpoint_info.json')
not os.path.exists(info_file)
print(f"Fout: Checkpoint info bestand ontbreekt in '{checkpoint_name}'.")
return False
open(info_file, 'r') as f
info = json.load(f)
print(f"Je staat op het punt om {info['files_count']} bestanden te herstellen van checkpoint: {checkpoint_name}")
response
input('Weet je zeker dat je door wilt gaan? (ja/nee): ')
response.lower() not in ['ja', 'j', 'yes', 'y']
print('Herstel geannuleerd.')
return False
backup_checkpoint
'backup_before_restore_' + datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
create_checkpoint(backup_checkpoint)
file_path
info['files']
source_path = os.path.join(checkpoint_dir, file_path)
dest_path = os.path.join(os.getcwd(), file_path)
if os.path.exists(source_path):
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    shutil.copy2(source_path, dest_path)
    print(f'Hersteld: {file_path}')
print(f"\nCheckpoint '{checkpoint_name}' succesvol hersteld.")
print(f'Er is een backup gemaakt van de staat voor herstel: checkpoints/{backup_checkpoint}')
True
'\n    Toont een lijst van beschikbare checkpoints.\n    '
checkpoints
[]
checkpoints_dir
os.path.join(os.getcwd(), 'checkpoints')
os.path.exists(checkpoints_dir)
for item in os.listdir(checkpoints_dir):
    item_path = os.path.join(checkpoints_dir, item)
    if os.path.isdir(item_path):
        info_file = os.path.join(item_path, 'checkpoint_info.json')
        if os.path.exists(info_file):
            with open(info_file, 'r') as f:
                info = json.load(f)
            checkpoints.append((item, info['created_at'], info['files_count'], True))
item
os.listdir(os.getcwd())
if os.path.isdir(item) and item.startswith('checkpoint_') and (item != 'checkpoints'):
    info_file = os.path.join(os.getcwd(), item, 'checkpoint_info.json')
    if os.path.exists(info_file):
        with open(info_file, 'r') as f:
            info = json.load(f)
        checkpoints.append((item, info['created_at'], info['files_count'], False))
not checkpoints
print('Geen checkpoints gevonden.')
return
print('\nBeschikbare checkpoints:')
print('-' * 100)
print(f"{'Naam':<30} {'Aangemaakt op':<25} {'Aantal bestanden':<15} {'Locatie':<20}")
print('-' * 100)
(name, created_at, files_count, in_subdir)
sorted(checkpoints, key=lambda x: x[1], reverse=True)
try:
    created_dt = datetime.datetime.fromisoformat(created_at)
    created_formatted = created_dt.strftime('%Y-%m-%d %H:%M:%S')
except:
    created_formatted = created_at
location = 'checkpoints/' if in_subdir else 'root/'
print(f'{name:<30} {created_formatted:<25} {files_count:<15} {location:<20}')
'main function.'
len(sys.argv) < 2
create_checkpoint()
return
command
sys.argv[1].lower()
command == 'list'
list_checkpoints()
if command == 'restore':
    if len(sys.argv) < 3:
        print('Gebruik: python create_checkpoint.py restore CHECKPOINT_NAAM')
        return
    restore_checkpoint(sys.argv[2])
elif command == 'create':
    if len(sys.argv) < 3:
        create_checkpoint()
    else:
        create_checkpoint(sys.argv[2])
else:
    print('Onbekend commando. Gebruik: create, list, of restore.')
__name__

'__main__'
main()

checkpoint_name
now
datetime.datetime.now()
checkpoint_name
now.strftime('checkpoint_%Y%m%d_%H%M%S')

os.path.join
os.getcwd()
'checkpoints'

os.path.exists(checkpoints_dir)
os.makedirs(checkpoints_dir)
print(f'Checkpoints map aangemaakt: {checkpoints_dir}')

os.path.join
checkpoints_dir
checkpoint_name

os.path.exists(checkpoint_dir)
os.makedirs(checkpoint_dir)

'.py'
'.blend'
'.md'



root
dirs
files

os.walk
os.getcwd()
'checkpoints' in root
continue
file
files
ext = os.path.splitext(file)[1].lower()
if ext in extensions_to_copy:
    source_path = os.path.join(root, file)
    rel_path = os.path.relpath(source_path, os.getcwd())
    files_to_copy.append(rel_path)


source_path
os.path.join(os.getcwd(), file_path)
dest_path
os.path.join(checkpoint_dir, file_path)
os.makedirs(os.path.dirname(dest_path), exist_ok=True)
shutil.copy2(source_path, dest_path)
print(f'Gekopieerd: {file_path}')

'name'
'created_at'
'files_count'
'files'
checkpoint_name
datetime.datetime.now().isoformat()
len(files_to_copy)
files_to_copy
open(os.path.join(checkpoint_dir, 'checkpoint_info.json'), 'w')
f
json.dump(checkpoint_info, f, indent=4)
print
f'\nCheckpoint succesvol gemaakt: {checkpoint_name}'
print
f'Aantal bestanden: {len(files_to_copy)}'
print
f'Locatie: {checkpoint_dir}'
checkpoint_dir
checkpoint_info


os.path.join
os.getcwd()
'checkpoints'

os.path.join
checkpoints_dir
checkpoint_name

os.path.exists(checkpoint_dir)
checkpoint_dir
os.path.join(os.getcwd(), checkpoint_name)

os.path.exists(checkpoint_dir)
print(f"Fout: Checkpoint '{checkpoint_name}' bestaat niet.")
False

os.path.join
checkpoint_dir
'checkpoint_info.json'

os.path.exists(info_file)
print(f"Fout: Checkpoint info bestand ontbreekt in '{checkpoint_name}'.")
False
open(info_file, 'r')
f
info
json.load(f)
print
f"Je staat op het punt om {info['files_count']} bestanden te herstellen van checkpoint: {checkpoint_name}"

input
'Weet je zeker dat je door wilt gaan? (ja/nee): '
response.lower()

['ja', 'j', 'yes', 'y']
print('Herstel geannuleerd.')
False

'backup_before_restore_'

datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
create_checkpoint
backup_checkpoint

info
'files'

source_path
os.path.join(checkpoint_dir, file_path)
dest_path
os.path.join(os.getcwd(), file_path)
os.path.exists(source_path)
os.makedirs(os.path.dirname(dest_path), exist_ok=True)
shutil.copy2(source_path, dest_path)
print(f'Hersteld: {file_path}')
print
f"\nCheckpoint '{checkpoint_name}' succesvol hersteld."
print
f'Er is een backup gemaakt van de staat voor herstel: checkpoints/{backup_checkpoint}'



os.path.join
os.getcwd()
'checkpoints'
os.path.exists
checkpoints_dir
item
os.listdir(checkpoints_dir)
item_path = os.path.join(checkpoints_dir, item)
if os.path.isdir(item_path):
    info_file = os.path.join(item_path, 'checkpoint_info.json')
    if os.path.exists(info_file):
        with open(info_file, 'r') as f:
            info = json.load(f)
        checkpoints.append((item, info['created_at'], info['files_count'], True))

os.listdir
os.getcwd()
os.path.isdir(item) and item.startswith('checkpoint_') and (item != 'checkpoints')
info_file = os.path.join(os.getcwd(), item, 'checkpoint_info.json')
if os.path.exists(info_file):
    with open(info_file, 'r') as f:
        info = json.load(f)
    checkpoints.append((item, info['created_at'], info['files_count'], False))

checkpoints
print('Geen checkpoints gevonden.')
print
'\nBeschikbare checkpoints:'
print
'-' * 100
print
f"{'Naam':<30} {'Aangemaakt op':<25} {'Aantal bestanden':<15} {'Locatie':<20}"
print
'-' * 100
name
created_at
files_count
in_subdir

sorted
checkpoints
key=lambda x: x[1]
reverse=True
created_dt = datetime.datetime.fromisoformat(created_at)
created_formatted = created_dt.strftime('%Y-%m-%d %H:%M:%S')
except:
    created_formatted = created_at
location
'checkpoints/' if in_subdir else 'root/'
print(f'{name:<30} {created_formatted:<25} {files_count:<15} {location:<20}')
len(sys.argv)

2
create_checkpoint()

sys.argv[1].lower
command

'list'
list_checkpoints()
command == 'restore'
if len(sys.argv) < 3:
    print('Gebruik: python create_checkpoint.py restore CHECKPOINT_NAAM')
    return
restore_checkpoint(sys.argv[2])
if command == 'create':
    if len(sys.argv) < 3:
        create_checkpoint()
    else:
        create_checkpoint(sys.argv[2])
else:
    print('Onbekend commando. Gebruik: create, list, of restore.')

main


datetime.datetime.now

now.strftime
'checkpoint_%Y%m%d_%H%M%S'
os.path

os.getcwd
os.path.exists
checkpoints_dir
os.makedirs
checkpoints_dir
print
f'Checkpoints map aangemaakt: {checkpoints_dir}'
os.path



os.path.exists
checkpoint_dir
os.makedirs
checkpoint_dir



os

os.getcwd
'checkpoints'

root


ext
os.path.splitext(file)[1].lower()
ext in extensions_to_copy
source_path = os.path.join(root, file)
rel_path = os.path.relpath(source_path, os.getcwd())
files_to_copy.append(rel_path)

os.path.join
os.getcwd()
file_path

os.path.join
checkpoint_dir
file_path
os.makedirs
os.path.dirname(dest_path)
exist_ok=True
shutil.copy2
source_path
dest_path
print
f'Gekopieerd: {file_path}'

datetime.datetime.now().isoformat
len
files_to_copy

open
os.path.join(checkpoint_dir, 'checkpoint_info.json')
'w'

json.dump
checkpoint_info
f
indent=4

'\nCheckpoint succesvol gemaakt: '
{checkpoint_name}

'Aantal bestanden: '
{len(files_to_copy)}

'Locatie: '
{checkpoint_dir}


os.path

os.getcwd
os.path



os.path.exists
checkpoint_dir

os.path.join
os.getcwd()
checkpoint_name
os.path.exists
checkpoint_dir
print
f"Fout: Checkpoint '{checkpoint_name}' bestaat niet."
os.path


os.path.exists
info_file
print
f"Fout: Checkpoint info bestand ontbreekt in '{checkpoint_name}'."
open
info_file
'r'


json.load
f

'Je staat op het punt om '
{info['files_count']}
' bestanden te herstellen van checkpoint: '
{checkpoint_name}

response.lower
'ja'
'j'
'yes'
'y'

print
'Herstel geannuleerd.'
datetime.datetime.now().strftime
'%Y%m%d_%H%M%S'




os.path.join
checkpoint_dir
file_path

os.path.join
os.getcwd()
file_path
os.path.exists
source_path
os.makedirs(os.path.dirname(dest_path), exist_ok=True)
shutil.copy2(source_path, dest_path)
print(f'Hersteld: {file_path}')

"\nCheckpoint '"
{checkpoint_name}
"' succesvol hersteld."

'Er is een backup gemaakt van de staat voor herstel: checkpoints/'
{backup_checkpoint}
os.path

os.getcwd
os.path



os.listdir
checkpoints_dir
item_path
os.path.join(checkpoints_dir, item)
os.path.isdir(item_path)
info_file = os.path.join(item_path, 'checkpoint_info.json')
if os.path.exists(info_file):
    with open(info_file, 'r') as f:
        info = json.load(f)
    checkpoints.append((item, info['created_at'], info['files_count'], True))
os

os.getcwd

os.path.isdir(item)
item.startswith('checkpoint_')
item != 'checkpoints'
info_file
os.path.join(os.getcwd(), item, 'checkpoint_info.json')
os.path.exists(info_file)
with open(info_file, 'r') as f:
    info = json.load(f)
checkpoints.append((item, info['created_at'], info['files_count'], False))

print
'Geen checkpoints gevonden.'


'-'

100

{'Naam':<30}
' '
{'Aangemaakt op':<25}
' '
{'Aantal bestanden':<15}
' '
{'Locatie':<20}

'-'

100






lambda x: x[1]
True
created_dt
datetime.datetime.fromisoformat(created_at)
created_formatted
created_dt.strftime('%Y-%m-%d %H:%M:%S')
created_formatted = created_at

in_subdir
'checkpoints/'
'root/'
print
f'{name:<30} {created_formatted:<25} {files_count:<15} {location:<20}'
len
sys.argv
create_checkpoint
sys.argv[1]


list_checkpoints
command

'restore'
len(sys.argv) < 3
print('Gebruik: python create_checkpoint.py restore CHECKPOINT_NAAM')
return
restore_checkpoint(sys.argv[2])
command == 'create'
if len(sys.argv) < 3:
    create_checkpoint()
else:
    create_checkpoint(sys.argv[2])
print('Onbekend commando. Gebruik: create, list, of restore.')

datetime.datetime

now

os

os

os.path


os



'Checkpoints map aangemaakt: '
{checkpoints_dir}
os

os.path


os



os



os.path.splitext(file)[1].lower
ext

extensions_to_copy
source_path
os.path.join(root, file)
rel_path
os.path.relpath(source_path, os.getcwd())
files_to_copy.append(rel_path)
os.path

os.getcwd

os.path



os

os.path.dirname
dest_path
True
shutil




'Gekopieerd: '
{file_path}
datetime.datetime.now()




os.path.join
checkpoint_dir
'checkpoint_info.json'
json



4
checkpoint_name
len(files_to_copy)
checkpoint_dir
os

os

os

os.path


os.path

os.getcwd

os.path



"Fout: Checkpoint '"
{checkpoint_name}
"' bestaat niet."
os

os.path



"Fout: Checkpoint info bestand ontbreekt in '"
{checkpoint_name}
"'."


json


info['files_count']
checkpoint_name
response


datetime.datetime.now()

os.path



os.path

os.getcwd

os.path


os.makedirs
os.path.dirname(dest_path)
exist_ok=True
shutil.copy2
source_path
dest_path
print
f'Hersteld: {file_path}'
checkpoint_name
backup_checkpoint
os

os

os

os



os.path.join
checkpoints_dir
item
os.path.isdir
item_path
info_file
os.path.join(item_path, 'checkpoint_info.json')
os.path.exists(info_file)
with open(info_file, 'r') as f:
    info = json.load(f)
checkpoints.append((item, info['created_at'], info['files_count'], True))

os

os.path.isdir
item
item.startswith
'checkpoint_'
item

'checkpoints'

os.path.join
os.getcwd()
item
'checkpoint_info.json'
os.path.exists
info_file
open(info_file, 'r') as f
info = json.load(f)
checkpoints.append((item, info['created_at'], info['files_count'], False))

'Naam'
f'<30'
'Aangemaakt op'
f'<25'
'Aantal bestanden'
f'<15'
'Locatie'
f'<20'
x
x[1]

datetime.datetime.fromisoformat
created_at

created_dt.strftime
'%Y-%m-%d %H:%M:%S'
created_formatted
created_at


{name:<30}
' '
{created_formatted:<25}
' '
{files_count:<15}
' '
{location:<20}

sys


sys.argv
1



len(sys.argv)

3
print('Gebruik: python create_checkpoint.py restore CHECKPOINT_NAAM')
restore_checkpoint
sys.argv[2]
command

'create'
len(sys.argv) < 3
create_checkpoint()
create_checkpoint(sys.argv[2])
print('Onbekend commando. Gebruik: create, list, of restore.')
datetime




os


checkpoints_dir

os



os.path.splitext(file)[1]




os.path.join
root
file

os.path.relpath
source_path
os.getcwd()
files_to_copy.append
rel_path
os

os

os


os.path



file_path
datetime.datetime.now
os.path




len
files_to_copy




os

os

os

os

checkpoint_name

os

checkpoint_name

info
'files_count'



datetime.datetime.now
os

os

os

os

os

os.path.dirname
dest_path
True
shutil




'Hersteld: '
{file_path}






os.path



os.path



os.path.join
item_path
'checkpoint_info.json'
os.path.exists
info_file
open(info_file, 'r') as f
info = json.load(f)
checkpoints.append((item, info['created_at'], info['files_count'], True))

os.path


item


os.path

os.getcwd

os.path


open(info_file, 'r')
f
info
json.load(f)
checkpoints.append
(item, info['created_at'], info['files_count'], False)
'<30'
'<25'
'<15'
'<20'
x
x
1

datetime.datetime


created_dt



name
f'<30'
created_formatted
f'<25'
files_count
f'<15'
location
f'<20'

sys

len
sys.argv
print
'Gebruik: python create_checkpoint.py restore CHECKPOINT_NAAM'

sys.argv
2


len(sys.argv)

3
create_checkpoint()
create_checkpoint(sys.argv[2])
print
'Onbekend commando. Gebruik: create, list, of restore.'




os.path.splitext(file)
1

os.path



os.path


os.getcwd
files_to_copy





os


datetime.datetime

os











datetime.datetime






os.path



file_path
os

os

os.path


os.path


open(info_file, 'r')
f
info
json.load(f)
checkpoints.append
(item, info['created_at'], info['files_count'], True)
os


os

os

os

open
info_file
'r'


json.load
f
checkpoints

item
info['created_at']
info['files_count']
False


datetime



'<30'

'<25'

'<15'

'<20'


sys


sys

len
sys.argv
create_checkpoint
create_checkpoint
sys.argv[2]

os.path.splitext
file
os

os

os



datetime


datetime

os




os

os

open
info_file
'r'


json.load
f
checkpoints

item
info['created_at']
info['files_count']
True







json




info
'created_at'

info
'files_count'





sys



sys.argv
2

os.path












json




info
'created_at'

info
'files_count'





sys

os





