#!/usr/bin/env python
"""
Script voor het automatisch analyseren van de codebase en bijwerken van de Developer Guide.
Dit script extraheert de structuur, componenten en relaties uit de code en houdt de guide up-to-date.
"""

import os
import re
import ast
import sys
from pathlib import Path
from typing import Dict, List, Set
from collections import defaultdict
from context_helper import ContextHelper

class CodebaseAnalyzer:
    def __init__(self, root_dir: str = "."):
        self.root_dir = Path(root_dir)
        self.components = defaultdict(dict)
        self.dependencies = defaultdict(set)
        self.imports = defaultdict(set)
        self.classes = defaultdict(dict)
        self.functions = defaultdict(dict)
        
    def analyze_file(self, file_path: Path) -> None:
        """Analyseer een Python bestand en extraheer componenten en relaties."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
                
            # Bepaal component type op basis van bestandspad
            component_type = self._determine_component_type(file_path)
            
            # Analyseer imports
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for name in node.names:
                        self.imports[str(file_path)].add(name.name)
                elif isinstance(node, ast.ImportFrom):
                    module = node.module or ''
                    for name in node.names:
                        self.imports[str(file_path)].add(f"{module}.{name.name}")
                
                # Analyseer klassen
                if isinstance(node, ast.ClassDef):
                    class_info = {
                        'name': node.name,
                        'methods': [n.name for n in node.body if isinstance(n, ast.FunctionDef)],
                        'docstring': ast.get_docstring(node) or '',
                        'line_number': node.lineno
                    }
                    self.classes[str(file_path)][node.name] = class_info
                
                # Analyseer functies
                if isinstance(node, ast.FunctionDef):
                    func_info = {
                        'name': node.name,
                        'args': [arg.arg for arg in node.args.args],
                        'docstring': ast.get_docstring(node) or '',
                        'line_number': node.lineno
                    }
                    self.functions[str(file_path)][node.name] = func_info
            
            # Voeg bestand toe aan component
            self.components[component_type][str(file_path)] = {
                'classes': self.classes[str(file_path)],
                'functions': self.functions[str(file_path)],
                'imports': list(self.imports[str(file_path)])
            }
            
        except Exception as e:
            print(f"Fout bij analyseren van {file_path}: {e}")
    
    def _determine_component_type(self, file_path: Path) -> str:
        """Bepaal het component type op basis van het bestandspad."""
        path_str = str(file_path).lower()
        if 'websocket' in path_str:
            return "WebSocket Server"
        elif 'web_interface' in path_str:
            return "Web Interface"
        elif 'chroma_db' in path_str:
            return "Database Integratie"
        elif 'context' in path_str:
            return "Context Management"
        elif 'scripts' in path_str:
            return "Development Tools"
        else:
            return "Other Components"
    
    def analyze_codebase(self) -> None:
        """Analyseer de gehele codebase."""
        for root, _, files in os.walk(self.root_dir):
            for file in files:
                if file.endswith('.py'):
                    file_path = Path(root) / file
                    self.analyze_file(file_path)
    
    def generate_guide_update(self) -> str:
        """Genereer een update voor de Developer Guide."""
        guide_update = []
        
        # Componenten sectie
        guide_update.append("## Componenten Overzicht\n")
        for component, files in self.components.items():
            guide_update.append(f"### {component}\n")
            for file_path, info in files.items():
                guide_update.append(f"- **{Path(file_path).name}**")
                if info['classes']:
                    guide_update.append("  - Klassen:")
                    for class_name, class_info in info['classes'].items():
                        guide_update.append(f"    - {class_name}: {class_info['docstring']}")
                if info['functions']:
                    guide_update.append("  - Belangrijke functies:")
                    for func_name, func_info in info['functions'].items():
                        guide_update.append(f"    - {func_name}: {func_info['docstring']}")
                guide_update.append("")
        
        # Dependencies sectie
        guide_update.append("## Dependencies Overzicht\n")
        for component, files in self.components.items():
            guide_update.append(f"### {component} Dependencies\n")
            all_imports = set()
            for file_info in files.values():
                all_imports.update(file_info['imports'])
            guide_update.extend([f"- {imp}" for imp in sorted(all_imports)])
            guide_update.append("")
        
        return "\n".join(guide_update)

def main():
    """Hoofdfunctie voor het script."""
    analyzer = CodebaseAnalyzer()
    analyzer.analyze_codebase()
    
    # Update de guide
    guide_update = analyzer.generate_guide_update()
    
    # Gebruik ContextHelper om de guide bij te werken
    helper = ContextHelper()
    helper.update_section("Codebase Structuur", guide_update)
    helper.save()
    
    print("✅ Codebase analyse voltooid en guide bijgewerkt")

if __name__ == "__main__":
    sys.exit(main()) 