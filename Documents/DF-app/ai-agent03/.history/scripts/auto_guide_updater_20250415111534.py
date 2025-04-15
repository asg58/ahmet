#!/usr/bin/env python
"""
Script voor het automatisch bijwerken van de Developer Guide bij wijzigingen in de codebase.
Dit script wordt aangeroepen door de pre-commit hook en bij belangrijke wijzigingen.
"""

import os
import sys
import subprocess
from pathlib import Path
from codebase_analyzer import CodebaseAnalyzer
from context_helper import ContextHelper

def get_changed_files() -> list:
    """Haal gewijzigde bestanden op uit git."""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip().split('\n')
    except subprocess.CalledProcessError:
        print("Fout bij ophalen van gewijzigde bestanden")
        return []

def analyze_changes(changed_files: list) -> dict:
    """Analyseer de wijzigingen en bepaal welke secties van de guide moeten worden bijgewerkt."""
    analyzer = CodebaseAnalyzer()
    changes = {
        'components': set(),
        'dependencies': set(),
        'structure': False
    }
    
    for file_path in changed_files:
        if file_path.endswith('.py'):
            # Bepaal component type
            component_type = analyzer._determine_component_type(Path(file_path))
            changes['components'].add(component_type)
            
            # Check voor dependency wijzigingen
            if 'requirements.txt' in file_path or any(imp in file_path for imp in ['import', 'from']):
                changes['dependencies'].add(component_type)
            
            # Check voor structuur wijzigingen
            if any(term in file_path.lower() for term in ['class', 'def', 'structure']):
                changes['structure'] = True
    
    return changes

def update_guide_sections(changes: dict) -> None:
    """Update de relevante secties van de guide op basis van de wijzigingen."""
    helper = ContextHelper()
    
    # Update componenten sectie
    if changes['components']:
        analyzer = CodebaseAnalyzer()
        analyzer.analyze_codebase()
        component_update = analyzer.generate_guide_update()
        helper.update_section("Componenten Overzicht", component_update)
    
    # Update dependencies sectie
    if changes['dependencies']:
        analyzer = CodebaseAnalyzer()
        analyzer.analyze_codebase()
        deps_update = analyzer.generate_guide_update()
        helper.update_section("Dependencies Overzicht", deps_update)
    
    # Update structuur sectie
    if changes['structure']:
        analyzer = CodebaseAnalyzer()
        analyzer.analyze_codebase()
        structure_update = analyzer.generate_guide_update()
        helper.update_section("Codebase Structuur", structure_update)
    
    helper.save()

def main():
    """Hoofdfunctie voor het script."""
    # Haal gewijzigde bestanden op
    changed_files = get_changed_files()
    if not changed_files:
        print("Geen wijzigingen gevonden")
        return 0
    
    # Analyseer wijzigingen
    changes = analyze_changes(changed_files)
    
    # Update guide
    update_guide_sections(changes)
    
    print("✅ Developer Guide bijgewerkt met recente wijzigingen")
    return 0

if __name__ == "__main__":
    sys.exit(main()) 