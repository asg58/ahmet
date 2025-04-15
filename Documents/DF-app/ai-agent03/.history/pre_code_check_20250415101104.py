#!/usr/bin/env python
"""
Auto-validator voor code ontwikkeling volgens de Developer Guide.
Dit script wordt uitgevoerd voor elke code-schrijftaak om te zorgen dat 
nieuwe code consistent is met de architectuur en conventies in de guide.
"""

import os
import sys
import re
import argparse
import importlib.util
from typing import List, Dict, Tuple, Optional, Any

# Controleer of context_helper beschikbaar is, anders importeer direct hier
try:
    from context_helper import ContextHelper
except ImportError:
    # Pad naar context_helper.py
    current_dir = os.path.dirname(os.path.abspath(__file__))
    context_helper_path = os.path.join(current_dir, "context_helper.py")
    
    if os.path.exists(context_helper_path):
        # Dynamisch importeren
        spec = importlib.util.spec_from_file_location("context_helper", context_helper_path)
        if spec and spec.loader:
            context_helper = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(context_helper)
            ContextHelper = context_helper.ContextHelper
        else:
            raise ImportError("Kan context_helper module niet laden")
    else:
        raise ImportError("context_helper.py niet gevonden in huidig pad")

class CodeValidator:
    """Valideer en geef context voor code-ontwikkeling volgens de Developer Guide"""
    
    def __init__(self, guide_path: str = "DEVELOPER_GUIDE.md"):
        """Initialiseer de validator met de Developer Guide"""
        self.context_helper = ContextHelper(guide_path)
        self.guide_path = guide_path
        
        # Laad de belangrijk secties voor context
        self.components = {
            "server": self.context_helper.extract_section_by_name("WebSocket Server"),
            "web": self.context_helper.extract_section_by_name("Web Interface"),
            "database": self.context_helper.extract_section_by_name("Database Integratie")
        }
        
        # Laad workflows
        self.workflows = {
            "server_start": self.context_helper.extract_section_by_name("Server Starten"),
            "index": self.context_helper.extract_section_by_name("Modellen Indexeren"),
            "checkpoint": self.context_helper.extract_section_by_name("Checkpoint")
        }
        
        # Structurele conventies uit guide
        self.conventions = self._extract_conventions()
    
    def _extract_conventions(self) -> Dict[str, Any]:
        """Haal coding conventies uit de Developer Guide"""
        conventions = {
            "file_naming": {
                "server_files": ["websocket_server", "server"],
                "web_files": ["web_interface", "web"],
                "database_files": ["chroma_db", "database"],
                "test_files": ["test_"]
            },
            "class_naming": {
                "server_classes": ["Server", "WebSocket"],
                "helper_classes": ["Helper", "Util"],
                "database_classes": ["DB", "Database", "ChromaDB"]
            }
        }
        
        # Aanvullende conventies uit de guide halen (zou kunnen worden uitgebreid)
        return conventions
    
    def get_component_info(self, component_type: str) -> str:
        """Haal informatie over een component type uit de guide"""
        if component_type.lower() in self.components:
            return self.components[component_type.lower()]
        return ""
    
    def get_relevant_workflow(self, task_description: str) -> str:
        """Vind de meest relevante workflow voor een taak"""
        best_match = ""
        best_score = 0
        
        for name, workflow in self.workflows.items():
            # Simpele keyword matching (kan vervangen worden door semantic matching)
            score = sum(1 for keyword in name.split("_") if keyword.lower() in task_description.lower())
            if score > best_score:
                best_score = score
                best_match = workflow
        
        return best_match
    
    def suggest_file_structure(self, task_description: str) -> Dict[str, Any]:
        """Suggereer bestands- en functiestructuur op basis van de taak en guide"""
        suggestions = {
            "file_type": None,
            "suggested_imports": [],
            "structure_notes": [],
            "example_pattern": ""
        }
        
        # Bepaal welk type component dit is
        if any(kw in task_description.lower() for kw in ["server", "websocket", "blender verbinding"]):
            suggestions["file_type"] = "server"
            suggestions["suggested_imports"] = ["websockets", "asyncio", "json", "bpy"]
            suggestions["structure_notes"] = [
                "Gebruik asyncio voor WebSocket server",
                "Gebruik JSON voor berichten",
                "Zorg voor bpy import binnen Blender context"
            ]
            
        elif any(kw in task_description.lower() for kw in ["interface", "flask", "web", "dashboard"]):
            suggestions["file_type"] = "web"
            suggestions["suggested_imports"] = ["flask", "os", "json", "blender_chroma_db"]
            suggestions["structure_notes"] = [
                "Gebruik Flask routes met @app.route decorators",
                "Maak templates voor front-end",
                "Verbind met vector database voor modellen"
            ]
            
        elif any(kw in task_description.lower() for kw in ["database", "chroma", "vector", "opslag"]):
            suggestions["file_type"] = "database"
            suggestions["suggested_imports"] = ["chromadb", "os", "json", "metadata"]
            suggestions["structure_notes"] = [
                "Gebruik ChromaDB client voor vectoropslag",
                "Implementeer functies voor zoeken en indexeren",
                "Valideer en verwerk metadata correct"
            ]
            
        elif any(kw in task_description.lower() for kw in ["test", "client", "example"]):
            suggestions["file_type"] = "client"
            suggestions["suggested_imports"] = ["websockets", "asyncio", "json", "random"]
            suggestions["structure_notes"] = [
                "Gebruik blender_client_lib voor WebSocket communicatie",
                "Implementeer een main() functie met asyncio.run()",
                "Verwerk Blender script als multi-line string"
            ]
        
        return suggestions
    
    def validate_code_snippet(self, code: str, file_type: str) -> Tuple[bool, List[str]]:
        """Valideer een codefragment tegen de conventies uit de guide"""
        issues = []
        
        # Basisvalidatie van imports
        expected_imports = {
            "server": ["websockets", "asyncio", "json"],
            "web": ["flask"],
            "database": ["chromadb"],
            "client": ["websockets", "asyncio"]
        }
        
        if file_type in expected_imports:
            for imp in expected_imports[file_type]:
                import_pattern = rf"import\s+{imp}|from\s+{imp}\s+import"
                if not re.search(import_pattern, code, re.IGNORECASE):
                    issues.append(f"Missende import: {imp} wordt verwacht voor {file_type} code")
        
        # Controleer conventionele klasse/functie nomenclatuur
        if file_type == "server":
            if "class" in code and not re.search(r"class\s+\w*Server\w*", code, re.IGNORECASE):
                issues.append("Server klassen moeten 'Server' in de naam hebben volgens conventies")
        
        if file_type == "web" and "flask" in code:
            if "def" in code and not re.search(r"@app\.route", code):
                issues.append("Flask routes moeten @app.route decorators gebruiken")
        
        # Controleer of code structureel overeenkomt met guide
        if file_type == "client" and "async def main" not in code and "websockets" in code:
            issues.append("Client script zou een async main() functie moeten hebben")
        
        valid = len(issues) == 0
        return valid, issues
    
    def print_pre_coding_checklist(self, task_description: str):
        """Print een checklist voordat je begint met coderen"""
        print("=" * 80)
        print("PRE-CODING CHECKLIST & CONTEXT")
        print("=" * 80)
        
        # Bepaal welk type component dit is
        suggestions = self.suggest_file_structure(task_description)
        file_type = suggestions["file_type"] or "algemeen"
        
        print(f"\n[Taak Categorisatie: {file_type.upper()}]")
        print(f"Taak: {task_description}")
        
        # Toon relevante sectie uit Developer Guide
        component_info = self.get_component_info(file_type)
        if component_info:
            print(f"\n[Relevante Component Context]")
            # Toon beknopte versie (eerste 5 regels)
            component_lines = component_info.split('\n')
            for line in component_lines[:5]:
                print(f"> {line}")
            if len(component_lines) > 5:
                print(f"> ... ({len(component_lines) - 5} meer regels beschikbaar)")
        
        # Toon suggesties voor imports en structuur
        if suggestions["suggested_imports"]:
            print("\n[Aanbevolen Imports]")
            for imp in suggestions["suggested_imports"]:
                print(f"- {imp}")
        
        if suggestions["structure_notes"]:
            print("\n[Structurele Richtlijnen]")
            for note in suggestions["structure_notes"]:
                print(f"- {note}")
        
        # Toon workflow informatie indien relevant
        workflow = self.get_relevant_workflow(task_description)
        if workflow:
            print("\n[Relevante Workflow]")
            workflow_lines = workflow.split('\n')
            for line in workflow_lines[:3]:
                print(f"> {line}")
            if len(workflow_lines) > 3:
                print(f"> ... ({len(workflow_lines) - 3} meer regels beschikbaar)")
        
        print("\n[Validatie Checklist]")
        print("- [ ] Code volgt naamgevingsconventies")
        print("- [ ] Juiste imports zijn gebruikt")
        print("- [ ] Functionaliteit overeenkomstig met guide")
        print("- [ ] Passende foutafhandeling ingebouwd")
        print("- [ ] Documentatie toegevoegd")
        
        print("\n" + "=" * 80)
        print("Voer na het schrijven van code python pre_code_check.py --validate uit")
        print("=" * 80 + "\n")

def main():
    """Hoofdfunctie voor de pre-code validator"""
    parser = argparse.ArgumentParser(description="Developer Guide validator voor ontwikkeling")
    parser.add_argument("--task", help="Beschrijving van de te ontwikkelen functionaliteit")
    parser.add_argument("--validate", help="Valideer een bestand tegen de Developer Guide", metavar="FILE")
    parser.add_argument("--component", help="Toon informatie over een component", choices=["server", "web", "database", "client"])
    parser.add_argument("--workflow", help="Toon informatie over een workflow", choices=["start", "index", "checkpoint"])
    args = parser.parse_args()
    
    # Initialiseer de validator
    validator = CodeValidator()
    
    # Basis help als geen argumenten
    if len(sys.argv) == 1:
        parser.print_help()
        sys.exit(0)
    
    # Verwerk commando's
    if args.task:
        validator.print_pre_coding_checklist(args.task)
    elif args.validate:
        if not os.path.exists(args.validate):
            print(f"Fout: Bestand {args.validate} niet gevonden")
            sys.exit(1)
            
        with open(args.validate, 'r', encoding='utf-8') as f:
            code = f.read()
            
        # Bepaal het type bestand op basis van naam
        file_type = None
        filename = os.path.basename(args.validate).lower()
        
        if "server" in filename or "websocket" in filename:
            file_type = "server"
        elif "web" in filename or "flask" in filename or "interface" in filename:
            file_type = "web"
        elif "chroma" in filename or "database" in filename or "db" in filename:
            file_type = "database"
        elif "test" in filename or "client" in filename:
            file_type = "client"
        else:
            file_type = "algemeen"
            
        # Valideer de code
        valid, issues = validator.validate_code_snippet(code, file_type)
        
        if valid:
            print(f"✅ Bestand {args.validate} voldoet aan de richtlijnen voor {file_type}")
            sys.exit(0)
        else:
            print(f"❌ Bestand {args.validate} heeft {len(issues)} probleem(en):")
            for i, issue in enumerate(issues, 1):
                print(f"  {i}. {issue}")
            sys.exit(1)
    
    elif args.component:
        info = validator.get_component_info(args.component)
        if info:
            print(f"Informatie over component: {args.component}")
            print("=" * 40)
            print(info)
        else:
            print(f"Geen informatie gevonden voor component: {args.component}")
            
    elif args.workflow:
        workflow_map = {"start": "server_start", "index": "index", "checkpoint": "checkpoint"}
        if args.workflow in workflow_map:
            info = validator.workflows.get(workflow_map[args.workflow], "")
            if info:
                print(f"Workflow: {args.workflow}")
                print("=" * 40)
                print(info)
            else:
                print(f"Geen informatie gevonden voor workflow: {args.workflow}")
        else:
            print(f"Onbekende workflow: {args.workflow}")

if __name__ == "__main__":
    main() 