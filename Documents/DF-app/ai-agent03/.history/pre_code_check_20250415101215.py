#!/usr/bin/env python
"""
Pre-code-check script voor het valideren van Python code tegen ontwikkelingsrichtlijnen.
Deze validatie wordt uitgevoerd tijdens de pre-commit hook.
"""

import os
import sys
import re
import subprocess
from typing import List, Dict, Tuple, Optional


class ValidationFailure:
    """Representeert een validatiefout in een bestand."""

    def __init__(self, file: str, line: Optional[int], message: str):
        self.file = file
        self.line = line
        self.message = message

    def __str__(self) -> str:
        if self.line:
            return f"{self.file}:{self.line}: {self.message}"
        return f"{self.file}: {self.message}"


def run_pylint(file_path: str) -> List[ValidationFailure]:
    """
    Voer pylint uit op het gegeven bestand en geef eventuele fouten terug.
    
    Args:
        file_path: Pad naar het te valideren bestand
        
    Returns:
        List van ValidationFailure objecten
    """
    failures = []
    
    try:
        # Controleer of pylint geïnstalleerd is
        result = subprocess.run(
            ["pylint", "--version"], 
            capture_output=True, 
            text=True, 
            check=False
        )
        
        if result.returncode != 0:
            failures.append(ValidationFailure(
                file_path, 
                None, 
                "Pylint is niet geïnstalleerd. Installeer het via: pip install pylint"
            ))
            return failures
        
        # Voer pylint uit met basis configuratie
        result = subprocess.run(
            [
                "pylint", 
                "--disable=C0111,C0103,C0303",  # Disable docstring, naming convention, trailing whitespace
                "--max-line-length=100",
                file_path
            ], 
            capture_output=True, 
            text=True, 
            check=False
        )
        
        if result.returncode != 0:
            # Verwerk pylint output om lijn-specifieke fouten te extraheren
            pattern = re.compile(r"([^:]+):(\d+):(\d+): ([A-Z]\d+): (.+)")
            
            for line in result.stdout.splitlines():
                match = pattern.match(line)
                if match:
                    file, line_num, _, code, msg = match.groups()
                    failures.append(ValidationFailure(
                        file_path,
                        int(line_num),
                        f"({code}) {msg}"
                    ))
    
    except Exception as e:
        failures.append(ValidationFailure(
            file_path, 
            None, 
            f"Fout bij uitvoeren pylint: {str(e)}"
        ))
    
    return failures


def check_code_style(file_path: str) -> List[ValidationFailure]:
    """
    Controleer codeerstijl volgens projectrichtlijnen.
    
    Args:
        file_path: Pad naar het te valideren bestand
        
    Returns:
        List van ValidationFailure objecten
    """
    failures = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # Controleer regellengte
    for i, line in enumerate(lines, 1):
        if len(line.rstrip('\n')) > 100:
            failures.append(ValidationFailure(
                file_path,
                i,
                "Regel is langer dan 100 tekens"
            ))
    
    # Controleer importvolgorde
    import_lines = []
    for i, line in enumerate(lines, 1):
        if line.strip().startswith('import ') or line.strip().startswith('from '):
            import_lines.append((i, line.strip()))
    
    # Controleer of imports correct gegroepeerd zijn
    # (standaard library, dan third-party, dan project-specifiek)
    # Dit is een vereenvoudigde versie, kan uitgebreid worden
    
    # Controleer docstrings
    if len(lines) > 1:
        # Controleer of er een module docstring is
        if not any(line.strip().startswith('"""') for line in lines[:10]):
            failures.append(ValidationFailure(
                file_path,
                1,
                "Geen module docstring gevonden in het begin van het bestand"
            ))
    
    # Controleer functies voor docstrings
    function_pattern = re.compile(r'^def\s+(\w+)\s*\(')
    class_pattern = re.compile(r'^class\s+(\w+)')
    
    for i, line in enumerate(lines, 1):
        func_match = function_pattern.match(line.strip())
        class_match = class_pattern.match(line.strip())
        
        if func_match or class_match:
            # Kijk of er een docstring is in de volgende regels
            has_docstring = False
            
            if i < len(lines) - 1:
                j = i
                while j < len(lines) and not lines[j].strip().startswith('"""'):
                    j += 1
                    if j < len(lines) and lines[j].strip() and not lines[j].strip().startswith('#'):
                        if not lines[j].strip().startswith('"""'):
                            break
                        has_docstring = True
                        break
            
            if not has_docstring:
                name = func_match.group(1) if func_match else class_match.group(1)
                entity_type = "functie" if func_match else "klasse"
                failures.append(ValidationFailure(
                    file_path,
                    i,
                    f"Geen docstring gevonden voor {entity_type} '{name}'"
                ))
    
    return failures


def validate_file(file_path: str) -> List[ValidationFailure]:
    """
    Valideer een Python bestand volgens alle checks.
    
    Args:
        file_path: Pad naar het te valideren bestand
        
    Returns:
        List van ValidationFailure objecten
    """
    failures = []
    
    # Controleer of het bestand bestaat
    if not os.path.exists(file_path):
        failures.append(ValidationFailure(
            file_path,
            None,
            "Bestand bestaat niet"
        ))
        return failures
    
    # Controleer de code stijl
    failures.extend(check_code_style(file_path))
    
    # Voer pylint uit
    failures.extend(run_pylint(file_path))
    
    return failures


def main() -> int:
    """
    Hoofdfunctie voor het script.
    
    Returns:
        Exit code (0 bij succes, 1 bij validatiefout)
    """
    if len(sys.argv) < 2:
        print("Gebruik: python pre_code_check.py <bestand1.py> [bestand2.py ...]")
        return 1
    
    files = sys.argv[1:]
    has_failures = False
    
    for file_path in files:
        if not file_path.endswith('.py'):
            continue
            
        print(f"\nValideren van {file_path}...")
        failures = validate_file(file_path)
        
        if failures:
            has_failures = True
            print(f"❌ {len(failures)} validatieproblemen gevonden:")
            for failure in failures:
                print(f"  - {failure}")
        else:
            print(f"✅ {file_path} voldoet aan de coderichtlijnen.")
    
    return 1 if has_failures else 0


if __name__ == "__main__":
    sys.exit(main()) 