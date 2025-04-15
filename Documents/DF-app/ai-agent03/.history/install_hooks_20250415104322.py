from pathlib import Path
import os
import shutil
import subprocess
import sys

def main():
    """Installeer de pre-commit hook in de Git hooks directory"""
    try:
        git_dir = subprocess.check_output(['git', 'rev-parse', '--git-dir'], universal_newlines=True).strip()
    except subprocess.CalledProcessError:
        print('Error: Dit commando moet worden uitgevoerd binnen een git repository')
        sys.exit(1)
        
    hooks_dir = os.path.join(os.path.abspath(git_dir), 'hooks')
    if not os.path.exists(hooks_dir):
        print(f'Creating hooks directory: {hooks_dir}')
        os.makedirs(hooks_dir)
        
    current_dir = os.path.dirname(os.path.abspath(__file__))
    source_pre_commit = os.path.join(current_dir, 'pre_commit_hook.py')
    
    if not os.path.exists(source_pre_commit):
        print(f'Error: pre_commit_hook.py niet gevonden in {current_dir}')
        sys.exit(1)
        
    target_pre_commit = os.path.join(hooks_dir, 'pre-commit')
    
    try:
        shutil.copy2(source_pre_commit, target_pre_commit)
        print(f'✅ Pre-commit hook gekopieerd naar {target_pre_commit}')
        
        if os.name != 'nt':
            os.chmod(target_pre_commit, 493)
            print('✅ Pre-commit hook uitvoerbaar gemaakt')
            
    except Exception as e:
        print(f'Error bij installeren van pre-commit hook: {e}')
        sys.exit(1)
        
    print('\nGit hooks succesvol geïnstalleerd!')
    print('De pre-commit hook zal nu automatisch worden uitgevoerd bij elke commit.')
    print('Om een individuele commit te maken zonder validatie, gebruik: git commit --no-verify')

if __name__ == '__main__':
    main()

'Installeer de pre-commit hook in de Git hooks directory'
try:
    git_dir = subprocess.check_output(['git', 'rev-parse', '--git-dir'], universal_newlines=True).strip()
except subprocess.CalledProcessError:
    print('Error: Dit commando moet worden uitgevoerd binnen een git repository')
    sys.exit(1)
hooks_dir = os.path.join(os.path.abspath(git_dir), 'hooks')
if not os.path.exists(hooks_dir):
    print(f'Creating hooks directory: {hooks_dir}')
    os.makedirs(hooks_dir)
current_dir = os.path.dirname(os.path.abspath(__file__))
source_pre_commit = os.path.join(current_dir, 'pre_commit_hook.py')
if not os.path.exists(source_pre_commit):
    print(f'Error: pre_commit_hook.py niet gevonden in {current_dir}')
    sys.exit(1)
target_pre_commit = os.path.join(hooks_dir, 'pre-commit')
try:
    shutil.copy2(source_pre_commit, target_pre_commit)
    print(f'✅ Pre-commit hook gekopieerd naar {target_pre_commit}')
    if os.name != 'nt':
        os.chmod(target_pre_commit, 493)
        print('✅ Pre-commit hook uitvoerbaar gemaakt')
except Exception as e:
    print(f'Error bij installeren van pre-commit hook: {e}')
    sys.exit(1)
print('\nGit hooks succesvol geïnstalleerd!')
print('De pre-commit hook zal nu automatisch worden uitgevoerd bij elke commit.')
print('Om een individuele commit te maken zonder validatie, gebruik: git commit --no-verify')
__name__ == '__main__'
main()
'Installeer de pre-commit hook in de Git hooks directory'
git_dir = subprocess.check_output(['git', 'rev-parse', '--git-dir'], universal_newlines=True).strip()
except subprocess.CalledProcessError:
    print('Error: Dit commando moet worden uitgevoerd binnen een git repository')
    sys.exit(1)
hooks_dir
os.path.join(os.path.abspath(git_dir), 'hooks')
not os.path.exists(hooks_dir)
print(f'Creating hooks directory: {hooks_dir}')
os.makedirs(hooks_dir)
current_dir
os.path.dirname(os.path.abspath(__file__))
source_pre_commit
os.path.join(current_dir, 'pre_commit_hook.py')
not os.path.exists(source_pre_commit)
print(f'Error: pre_commit_hook.py niet gevonden in {current_dir}')
sys.exit(1)
target_pre_commit
os.path.join(hooks_dir, 'pre-commit')
shutil.copy2(source_pre_commit, target_pre_commit)
print(f'✅ Pre-commit hook gekopieerd naar {target_pre_commit}')
if os.name != 'nt':
    os.chmod(target_pre_commit, 493)
    print('✅ Pre-commit hook uitvoerbaar gemaakt')
except Exception as e:
    print(f'Error bij installeren van pre-commit hook: {e}')
    sys.exit(1)
print('\nGit hooks succesvol geïnstalleerd!')
print('De pre-commit hook zal nu automatisch worden uitgevoerd bij elke commit.')
print('Om een individuele commit te maken zonder validatie, gebruik: git commit --no-verify')
__name__

'__main__'
main()
git_dir
subprocess.check_output(['git', 'rev-parse', '--git-dir'], universal_newlines=True).strip()
subprocess.CalledProcessError
print('Error: Dit commando moet worden uitgevoerd binnen een git repository')
sys.exit(1)

os.path.join
os.path.abspath(git_dir)
'hooks'

os.path.exists(hooks_dir)
print(f'Creating hooks directory: {hooks_dir}')
os.makedirs(hooks_dir)

os.path.dirname
os.path.abspath(__file__)

os.path.join
current_dir
'pre_commit_hook.py'

os.path.exists(source_pre_commit)
print(f'Error: pre_commit_hook.py niet gevonden in {current_dir}')
sys.exit(1)

os.path.join
hooks_dir
'pre-commit'
shutil.copy2(source_pre_commit, target_pre_commit)
print(f'✅ Pre-commit hook gekopieerd naar {target_pre_commit}')
os.name != 'nt'
os.chmod(target_pre_commit, 493)
print('✅ Pre-commit hook uitvoerbaar gemaakt')
Exception
print(f'Error bij installeren van pre-commit hook: {e}')
sys.exit(1)
print
'\nGit hooks succesvol geïnstalleerd!'
print
'De pre-commit hook zal nu automatisch worden uitgevoerd bij elke commit.'
print
'Om een individuele commit te maken zonder validatie, gebruik: git commit --no-verify'

main

subprocess.check_output(['git', 'rev-parse', '--git-dir'], universal_newlines=True).strip
subprocess

print('Error: Dit commando moet worden uitgevoerd binnen een git repository')
sys.exit(1)
os.path

os.path.abspath
git_dir
os.path.exists
hooks_dir
print
f'Creating hooks directory: {hooks_dir}'
os.makedirs
hooks_dir
os.path

os.path.abspath
__file__
os.path


os.path.exists
source_pre_commit
print
f'Error: pre_commit_hook.py niet gevonden in {current_dir}'
sys.exit
1
os.path


shutil.copy2
source_pre_commit
target_pre_commit
print
f'✅ Pre-commit hook gekopieerd naar {target_pre_commit}'
os.name

'nt'
os.chmod(target_pre_commit, 493)
print('✅ Pre-commit hook uitvoerbaar gemaakt')

print(f'Error bij installeren van pre-commit hook: {e}')
sys.exit(1)




subprocess.check_output(['git', 'rev-parse', '--git-dir'], universal_newlines=True)


print
'Error: Dit commando moet worden uitgevoerd binnen een git repository'
sys.exit
1
os

os.path


os.path



'Creating hooks directory: '
{hooks_dir}
os


os

os.path


os

os.path



'Error: pre_commit_hook.py niet gevonden in '
{current_dir}
sys

os

shutil




'✅ Pre-commit hook gekopieerd naar '
{target_pre_commit}
os

os.chmod
target_pre_commit
493
print
'✅ Pre-commit hook uitvoerbaar gemaakt'
print
f'Error bij installeren van pre-commit hook: {e}'
sys.exit
1
subprocess.check_output
['git', 'rev-parse', '--git-dir']
universal_newlines=True

sys


os

os

hooks_dir


os


os

current_dir



target_pre_commit

os




'Error bij installeren van pre-commit hook: '
{e}
sys

subprocess

'git'
'rev-parse'
'--git-dir'

True









e


