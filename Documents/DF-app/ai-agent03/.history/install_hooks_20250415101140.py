#!/usr/bin/env python
"""
Script om Git hooks te installeren in het project
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

def main():
    """Installeer de pre-commit hook in de Git hooks directory"""
    # Vind de root van het git repository
    try:
        git_dir = subprocess.check_output(
            ['git', 'rev-parse', '--git-dir'],
            universal_newlines=True
        ).strip()
    except subprocess.CalledProcessError:
        print("Error: Dit commando moet worden uitgevoerd binnen een git repository")
        sys.exit(1)
    
    # Pad naar de hooks directory
    hooks_dir = os.path.join(os.path.abspath(git_dir), 'hooks')
    
    # Controleer of hooks directory bestaat
    if not os.path.exists(hooks_dir):
        print(f"Creating hooks directory: {hooks_dir}")
        os.makedirs(hooks_dir)
    
    # Pad naar pre-commit hook script in ons project
    source_pre_commit = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pre_commit_hook.py')
    
    if not os.path.exists(source_pre_commit):
        print(f"Error: pre_commit_hook.py niet gevonden in {os.path.dirname(os.path.abspath(__file__))}")
        sys.exit(1)
    
    # Doel voor pre-commit hook in Git hooks directory
    target_pre_commit = os.path.join(hooks_dir, 'pre-commit')
    
    # Kopieer de hook naar de hooks directory
    try:
        shutil.copy2(source_pre_commit, target_pre_commit)
        print(f"✅ Pre-commit hook gekopieerd naar {target_pre_commit}")
        
        # Maak hook uitvoerbaar (alleen nodig op Unix-achtige systemen)
        if os.name != 'nt':  # Skip voor Windows
            os.chmod(target_pre_commit, 0o755)
            print("✅ Pre-commit hook uitvoerbaar gemaakt")
    except Exception as e:
        print(f"Error bij installeren van pre-commit hook: {e}")
        sys.exit(1)
    
    print("\nGit hooks succesvol geïnstalleerd!")
    print("De pre-commit hook zal nu automatisch worden uitgevoerd bij elke commit.")
    print("Om een individuele commit te maken zonder validatie, gebruik: git commit --no-verify")

if __name__ == "__main__":
    main() 