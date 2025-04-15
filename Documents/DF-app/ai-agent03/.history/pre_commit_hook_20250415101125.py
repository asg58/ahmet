#!/usr/bin/env python
"""
Pre-commit hook voor Git dat automatisch alle gewijzigde bestanden valideert
tegen de Developer Guide conventies.
"""

import os
import sys
import subprocess
import re
from typing import List, Tuple

def get_staged_files() -> List[str]:
    """Haal lijst van staged files op uit git"""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
            stdout=subprocess.PIPE,
            text=True,
            check=True
        )
        return [f for f in result.stdout.strip().split('\n') if f]
    except subprocess.CalledProcessError as e:
        print(f"Error bij ophalen van git staged files: {e}")
        return []

def is_python_file(file_path: str) -> bool:
    """Controleer of het bestand een Python bestand is"""
    return file_path.endswith('.py')

def validate_files_with_pre_code_check(files: List[str]) -> Tuple[bool, List[str]]:
    """Valideer bestanden met pre_code_check.py script"""
    all_valid = True
    failures = []
    
    for file_path in files:
        if is_python_file(file_path):
            print(f"Valideren van {file_path}...")
            try:
                result = subprocess.run(
                    ['python', 'pre_code_check.py', '--validate', file_path],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                if result.returncode != 0:
                    all_valid = False
                    # Extract issues from output
                    issues = re.findall(r'\d+\.\s+(.+?)$', result.stdout, re.MULTILINE)
                    failures.append(f"Validatiefout in {file_path}: {', '.join(issues)}")
                    print(result.stdout)
                else:
                    print(f"✅ {file_path} is valide.")
            except Exception as e:
                all_valid = False
                failures.append(f"Fout bij validatie van {file_path}: {str(e)}")
    
    return all_valid, failures

def main():
    """Hoofdfunctie voor de pre-commit hook"""
    staged_files = get_staged_files()
    
    if not staged_files:
        print("Geen bestanden klaar voor commit.")
        sys.exit(0)
    
    python_files = [f for f in staged_files if is_python_file(f)]
    
    if not python_files:
        print("Geen Python bestanden gewijzigd.")
        sys.exit(0)
    
    print(f"Valideren van {len(python_files)} Python bestand(en) tegen Developer Guide...")
    valid, failures = validate_files_with_pre_code_check(python_files)
    
    if not valid:
        print("\n❌ Pre-commit check gefaald!\n")
        print("De volgende problemen zijn gevonden:")
        for failure in failures:
            print(f"  - {failure}")
        print("\nJe kunt deze controle overslaan met git commit --no-verify, maar dit wordt afgeraden.")
        print("Fix de problemen of voeg uitleg toe waarom de conventies niet gevolgd worden.")
        sys.exit(1)
    else:
        print("\n✅ Alle bestanden voldoen aan de Developer Guide!")
        sys.exit(0)

if __name__ == "__main__":
    main() 