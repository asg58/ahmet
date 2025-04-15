#!/usr/bin/env python
"""Script om Git hooks te installeren in het project."""

from pathlib import Path
import os
import shutil
import subprocess
import sys

def main():
    """Installeer de pre-commit hook in de Git hooks directory."""
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
            os.chmod(target_pre_commit, 493)  # 0o755 in octal
            print('✅ Pre-commit hook uitvoerbaar gemaakt')
            
    except Exception as e:
        print(f'Error bij installeren van pre-commit hook: {e}')
        sys.exit(1)
        
    print('\nGit hooks succesvol geïnstalleerd!')
    print('De pre-commit hook zal nu automatisch worden uitgevoerd bij elke commit.')
    print('Om een individuele commit te maken zonder validatie, gebruik: git commit --no-verify')

if __name__ == '__main__':
    main() 