import os
import subprocess
import sys

CHECKPOINT_NAME = 'blender_websocket_v1_base'
def main():
    """
    Maakt een benoemde checkpoint van de huidige Blender WebSocket setup.
    """
    checkpoint_script = os.path.join(os.getcwd(), 'create_checkpoint.py')
    if not os.path.exists(checkpoint_script):
        print('Fout: create_checkpoint.py script niet gevonden.')
        return False
    required_files = ['blender_agent/websocket_server.py', 'test_client.py', 'blender_websocket_setup_samenvatting.md', 'blender_websocket_handleiding.md']
    missing_files = []
    for file in required_files:
        if not os.path.exists(os.path.join(os.getcwd(), file)):
            missing_files.append(file)
    if missing_files:
        print('Waarschuwing: De volgende benodigde bestanden ontbreken:')
        for file in missing_files:
            print(f'  - {file}')
        response = input('Wil je toch doorgaan met het maken van de checkpoint? (ja/nee): ')
        if response.lower() not in ['ja', 'j', 'yes', 'y']:
            print('Checkpoint maken geannuleerd.')
            return False
    print(f'Checkpoint maken: {CHECKPOINT_NAME}')
    try:
        subprocess.run([sys.executable, checkpoint_script, 'create', CHECKPOINT_NAME])
        print(f'\nCheckpoint {CHECKPOINT_NAME} is succesvol gemaakt.')
        print('\nJe kunt deze checkpoint later herstellen met:')
        print(f'python create_checkpoint.py restore {CHECKPOINT_NAME}')
        checkpoints_dir = os.path.join(os.getcwd(), 'checkpoints')
        checkpoint_path = os.path.join(checkpoints_dir, CHECKPOINT_NAME)
        if os.path.exists(checkpoint_path):
            print(f'\nCheckpoint locatie: {checkpoint_path}')
        return True
    except Exception as e:
        print(f'Fout bij het maken van checkpoint: {e}')
        return False
if __name__ == '__main__':
    main()
os
sys
subprocess
CHECKPOINT_NAME
'blender_websocket_v1_base'

'\n    Maakt een benoemde checkpoint van de huidige Blender WebSocket setup.\n    '
checkpoint_script = os.path.join(os.getcwd(), 'create_checkpoint.py')
if not os.path.exists(checkpoint_script):
    print('Fout: create_checkpoint.py script niet gevonden.')
    return False
required_files = ['blender_agent/websocket_server.py', 'test_client.py', 'blender_websocket_setup_samenvatting.md', 'blender_websocket_handleiding.md']
missing_files = []
for file in required_files:
    if not os.path.exists(os.path.join(os.getcwd(), file)):
        missing_files.append(file)
if missing_files:
    print('Waarschuwing: De volgende benodigde bestanden ontbreken:')
    for file in missing_files:
        print(f'  - {file}')
    response = input('Wil je toch doorgaan met het maken van de checkpoint? (ja/nee): ')
    if response.lower() not in ['ja', 'j', 'yes', 'y']:
        print('Checkpoint maken geannuleerd.')
        return False
print(f'Checkpoint maken: {CHECKPOINT_NAME}')
try:
    subprocess.run([sys.executable, checkpoint_script, 'create', CHECKPOINT_NAME])
    print(f'\nCheckpoint {CHECKPOINT_NAME} is succesvol gemaakt.')
    print('\nJe kunt deze checkpoint later herstellen met:')
    print(f'python create_checkpoint.py restore {CHECKPOINT_NAME}')
    checkpoints_dir = os.path.join(os.getcwd(), 'checkpoints')
    checkpoint_path = os.path.join(checkpoints_dir, CHECKPOINT_NAME)
    if os.path.exists(checkpoint_path):
        print(f'\nCheckpoint locatie: {checkpoint_path}')
    return True
except Exception as e:
    print(f'Fout bij het maken van checkpoint: {e}')
    return False
__name__ == '__main__'
main()

'\n    Maakt een benoemde checkpoint van de huidige Blender WebSocket setup.\n    '
checkpoint_script
os.path.join(os.getcwd(), 'create_checkpoint.py')
not os.path.exists(checkpoint_script)
print('Fout: create_checkpoint.py script niet gevonden.')
return False
required_files
['blender_agent/websocket_server.py', 'test_client.py', 'blender_websocket_setup_samenvatting.md', 'blender_websocket_handleiding.md']
missing_files
[]
file
required_files
if not os.path.exists(os.path.join(os.getcwd(), file)):
    missing_files.append(file)
missing_files
print('Waarschuwing: De volgende benodigde bestanden ontbreken:')
for file in missing_files:
    print(f'  - {file}')
response = input('Wil je toch doorgaan met het maken van de checkpoint? (ja/nee): ')
if response.lower() not in ['ja', 'j', 'yes', 'y']:
    print('Checkpoint maken geannuleerd.')
    return False
print(f'Checkpoint maken: {CHECKPOINT_NAME}')
subprocess.run([sys.executable, checkpoint_script, 'create', CHECKPOINT_NAME])
print(f'\nCheckpoint {CHECKPOINT_NAME} is succesvol gemaakt.')
print('\nJe kunt deze checkpoint later herstellen met:')
print(f'python create_checkpoint.py restore {CHECKPOINT_NAME}')
checkpoints_dir = os.path.join(os.getcwd(), 'checkpoints')
checkpoint_path = os.path.join(checkpoints_dir, CHECKPOINT_NAME)
if os.path.exists(checkpoint_path):
    print(f'\nCheckpoint locatie: {checkpoint_path}')
return True
except Exception as e:
    print(f'Fout bij het maken van checkpoint: {e}')
    return False
__name__

'__main__'
main()

os.path.join
os.getcwd()
'create_checkpoint.py'

os.path.exists(checkpoint_script)
print('Fout: create_checkpoint.py script niet gevonden.')
False

'blender_agent/websocket_server.py'
'test_client.py'
'blender_websocket_setup_samenvatting.md'
'blender_websocket_handleiding.md'





not os.path.exists(os.path.join(os.getcwd(), file))
missing_files.append(file)

print('Waarschuwing: De volgende benodigde bestanden ontbreken:')
file
missing_files
print(f'  - {file}')
response
input('Wil je toch doorgaan met het maken van de checkpoint? (ja/nee): ')
response.lower() not in ['ja', 'j', 'yes', 'y']
print('Checkpoint maken geannuleerd.')
return False
print
f'Checkpoint maken: {CHECKPOINT_NAME}'
subprocess.run([sys.executable, checkpoint_script, 'create', CHECKPOINT_NAME])
print(f'\nCheckpoint {CHECKPOINT_NAME} is succesvol gemaakt.')
print('\nJe kunt deze checkpoint later herstellen met:')
print(f'python create_checkpoint.py restore {CHECKPOINT_NAME}')
checkpoints_dir
os.path.join(os.getcwd(), 'checkpoints')
checkpoint_path
os.path.join(checkpoints_dir, CHECKPOINT_NAME)
os.path.exists(checkpoint_path)
print(f'\nCheckpoint locatie: {checkpoint_path}')
True
Exception
print(f'Fout bij het maken van checkpoint: {e}')
return False

main
os.path

os.getcwd
os.path.exists
checkpoint_script
print
'Fout: create_checkpoint.py script niet gevonden.'

os.path.exists(os.path.join(os.getcwd(), file))
missing_files.append(file)
print
'Waarschuwing: De volgende benodigde bestanden ontbreken:'


print(f'  - {file}')

input
'Wil je toch doorgaan met het maken van de checkpoint? (ja/nee): '
response.lower()

['ja', 'j', 'yes', 'y']
print('Checkpoint maken geannuleerd.')
False

'Checkpoint maken: '
{CHECKPOINT_NAME}
subprocess.run
[sys.executable, checkpoint_script, 'create', CHECKPOINT_NAME]
print
f'\nCheckpoint {CHECKPOINT_NAME} is succesvol gemaakt.'
print
'\nJe kunt deze checkpoint later herstellen met:'
print
f'python create_checkpoint.py restore {CHECKPOINT_NAME}'

os.path.join
os.getcwd()
'checkpoints'

os.path.join
checkpoints_dir
CHECKPOINT_NAME
os.path.exists
checkpoint_path
print(f'\nCheckpoint locatie: {checkpoint_path}')

print(f'Fout bij het maken van checkpoint: {e}')
False

os

os

os.path



os.path.exists
os.path.join(os.getcwd(), file)
missing_files.append
file

print
f'  - {file}'

response.lower
'ja'
'j'
'yes'
'y'

print
'Checkpoint maken geannuleerd.'
CHECKPOINT_NAME
subprocess

sys.executable
checkpoint_script
'create'
CHECKPOINT_NAME


'\nCheckpoint '
{CHECKPOINT_NAME}
' is succesvol gemaakt.'


'python create_checkpoint.py restore '
{CHECKPOINT_NAME}
os.path

os.getcwd
os.path



os.path


print
f'\nCheckpoint locatie: {checkpoint_path}'
print
f'Fout bij het maken van checkpoint: {e}'


os

os.path

os.path.join
os.getcwd()
file
missing_files



'  - '
{file}
response




sys



CHECKPOINT_NAME
CHECKPOINT_NAME
os

os

os

os


'\nCheckpoint locatie: '
{checkpoint_path}

'Fout bij het maken van checkpoint: '
{e}

os

os.path

os.getcwd


file








checkpoint_path
e

os

os





