#!/usr/bin/env python
"""
Verificatie script voor de Developer Guide.
Controleert of de formatting consistent is en de guide parseerbaar is 
door de ContextHelper.
"""

import os
import re
import sys

# Voeg de root directory toe aan path voor imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from context_helper import ContextHelper

def verify_heading_structure(content):
    """Controleer of de koppen correct gestructureerd zijn"""
    heading_pattern = r'^(#{1,6})\s+(.+?)$'
    headings = re.findall(heading_pattern, content, re.MULTILINE)
    
    # H1 moet uniek zijn en aan het begin van het document staan
    h1_count = sum(1 for h, _ in headings if h == '#')
    if h1_count != 1:
        print(f"FOUT: Er moet exact één H1 (#) kop zijn, gevonden: {h1_count}")
        return False

    # Valideer hiërarchie: H3 mag alleen onder H2 staan, etc.
    current_level = 0
    for h, title in headings:
        level = len(h)
        if level > current_level + 1:
            print(f"FOUT: Kop '{title}' springt van niveau {current_level} naar {level}")
            return False
        current_level = level
        
    return True

def verify_section_parseability(helper):
    """Controleer of belangrijke secties vindbaar zijn via regex"""
    # Controleer of we componentinformatie kunnen vinden
    crucial_components = [
        "WebSocket Server", 
        "Web Interface", 
        "Database Integratie"
    ]
    
    for component in crucial_components:
        info = helper.get_component_info(component)
        if not info:
            print(f"FOUT: Kan component informatie voor '{component}' niet vinden")
            return False
    
    # Controleer workflows
    crucial_workflows = [
        "Server Starten", 
        "Modellen Indexeren", 
        "Checkpoint"
    ]
    
    for workflow in crucial_workflows:
        info = helper.get_workflow(workflow)
        if not info:
            print(f"FOUT: Kan workflow informatie voor '{workflow}' niet vinden")
            return False
    
    return True

def verify_code_blocks(content):
    """Controleer of codeblokken correct geformatteerd zijn"""
    # Controleer of elke opening ``` een bijbehorende closing heeft
    open_count = content.count("```")
    if open_count % 2 != 0:
        print(f"FOUT: Ongebalanceerde codeblokken, aantal backticks: {open_count}")
        return False
    
    # Controleer of de meeste codeblokken een taal specificatie hebben
    code_blocks = re.findall(r'```(.+?)\n', content)
    if len(code_blocks) < open_count / 2 / 2:  # Minimaal de helft moet taal specificatie hebben
        print("WAARSCHUWING: Veel codeblokken missen een taal specificatie")
    
    return True

def main():
    guide_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "DEVELOPER_GUIDE.md")
    
    if not os.path.exists(guide_path):
        print(f"FOUT: Developer Guide niet gevonden op: {guide_path}")
        return 1
    
    with open(guide_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"Developer Guide gevonden: {guide_path}")
    print(f"Bestandsgrootte: {len(content)} bytes")
    
    # Instantieer de helper
    helper = ContextHelper(guide_path)
    
    # Voer alle verificaties uit
    heading_ok = verify_heading_structure(content)
    parseability_ok = verify_section_parseability(helper)
    code_blocks_ok = verify_code_blocks(content)
    
    # Overzicht rapporteren
    print("\n=== Verificatie Resultaten ===")
    print(f"Koppenstructuur: {'OK' if heading_ok else 'FOUT'}")
    print(f"Parseerbaarheid: {'OK' if parseability_ok else 'FOUT'}")
    print(f"Codeblokken: {'OK' if code_blocks_ok else 'FOUT'}")
    
    if heading_ok and parseability_ok and code_blocks_ok:
        print("\nDeveloper Guide is correct geformatteerd en parseerbaar!")
        return 0
    else:
        print("\nDeveloper Guide heeft problemen die aandacht vereisen.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 