#!/usr/bin/env python
"""
Pre-code-check script voor het valideren van Python code tegen ontwikkelingsrichtlijnen.
Deze validatie wordt uitgevoerd tijdens de pre-commit hook.
"""

from typing import List, Optional
import os
import re
import subprocess
import sys

class ValidationFailure:
    """
    Representeert een validatiefout in een bestand.
    Bevat informatie over het bestand, regelnummer en foutmelding.
    """

    def __init__(self, file: str, line: Optional[int], message: str):
        """
        Initialiseer een ValidationFailure object.
        
        Args:
            file: Pad naar het bestand
            line: Optioneel regelnummer waar de fout is gevonden
            message: Foutmelding
        """
        self.file = file
        self.line = line
        self.message = message

    def __str__(self) -> str:
        """
        String representatie van de validatiefout.
        
        Returns:
            String in format bestandsnaam:regel: bericht of bestandsnaam: bericht
        """
        if self.line:
            return f'{self.file}:{self.line}: {self.message}'
        return f'{self.file}: {self.message}'

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
        result = subprocess.run(['pylint', '--version'], capture_output=True, text=True, check=False)
        if result.returncode != 0:
            failures.append(ValidationFailure(file_path, None, 'Pylint is niet geïnstalleerd. Installeer het via: pip install pylint'))
            return failures
            
        result = subprocess.run(
            ['pylint', '--disable=C0111,C0103,C0303,R0903,W0611,C0301,C0304,W0718', 
             '--max-line-length=100', file_path],
            capture_output=True, text=True, check=False
        )
        
        if result.returncode != 0:
            pattern = re.compile(r'([^:]+):(\d+):(\d+): ([A-Z]\d+): (.+)')
            for line in result.stdout.splitlines():
                match = pattern.match(line)
                if match:
                    _, line_num, _, code, msg = match.groups()
                    failures.append(ValidationFailure(file_path, int(line_num), f'({code}) {msg}'))
                    
    except (subprocess.SubprocessError, FileNotFoundError) as e:
        failures.append(ValidationFailure(file_path, None, f'Fout bij uitvoeren pylint: {str(e)}'))
    except OSError as e:
        failures.append(ValidationFailure(file_path, None, f'OS fout bij uitvoeren pylint: {str(e)}'))
        
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
        
    # Check line length
    for i, line in enumerate(lines, 1):
        if len(line.rstrip('\n')) > 100:
            failures.append(ValidationFailure(file_path, i, 'Regel is langer dan 100 tekens'))
            
    # Check imports
    import_lines = []
    for i, line in enumerate(lines, 1):
        if line.strip().startswith('import ') or line.strip().startswith('from '):
            import_lines.append((i, line.strip()))
            
    # Check module docstring
    if len(lines) > 1:
        if not any(line.strip().startswith('"""') for line in lines[:10]):
            failures.append(ValidationFailure(file_path, 1, 'Geen module docstring gevonden in het begin van het bestand'))
            
    # Check function and class docstrings
    function_pattern = re.compile(r'^def\s+(\w+)\s*\(')
    class_pattern = re.compile(r'^class\s+(\w+)')
    
    for i, line in enumerate(lines, 1):
        func_match = function_pattern.match(line.strip())
        class_match = class_pattern.match(line.strip())
        
        if not (func_match or class_match):
            continue
            
        has_docstring = False
        name = func_match.group(1) if func_match else class_match.group(1)
        entity_type = 'functie' if func_match else 'klasse'
        
        for j in range(i, min(i + 5, len(lines))):
            if '"""' in lines[j]:
                has_docstring = True
                break
                
        if not has_docstring:
            failures.append(ValidationFailure(file_path, i, f"Geen docstring gevonden voor {entity_type} '{name}'"))
            
    # Check newline at end of file
    if lines and not lines[-1].endswith('\n'):
        failures.append(ValidationFailure(file_path, len(lines), 'Bestand moet eindigen met een newline'))
        
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
    
    if not os.path.exists(file_path):
        failures.append(ValidationFailure(file_path, None, 'Bestand bestaat niet'))
        return failures
        
    failures.extend(check_code_style(file_path))
    failures.extend(run_pylint(file_path))
    
    return failures

def main() -> int:
    """
    Hoofdfunctie voor het script.
    
    Verwerkt command line argumenten en voert validatie uit op opgegeven bestanden.
    
    Returns:
        Exit code (0 bij succes, 1 bij validatiefout)
    """
    if len(sys.argv) < 2:
        print('Gebruik: python pre_code_check.py <bestand1.py> [bestand2.py ...]')
        return 1
        
    files = sys.argv[1:]
    has_failures = False
    
    for file_path in files:
        if not file_path.endswith('.py'):
            continue
            
        print(f'\nValideren van {file_path}...')
        failures = validate_file(file_path)
        
        if failures:
            has_failures = True
            print(f'❌ {len(failures)} validatieproblemen gevonden:')
            for failure in failures:
                print(f'  - {failure}')
        else:
            print(f'✅ {file_path} voldoet aan de coderichtlijnen.')
            
    return 1 if has_failures else 0

if __name__ == '__main__':
    sys.exit(main()) 