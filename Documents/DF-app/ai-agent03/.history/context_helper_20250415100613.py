import os
import re

class ContextHelper:
    """
    Hulpklasse voor het automatisch lezen van de Developer Guide
    om context te krijgen voor code wijzigingen
    """
    
    def __init__(self, guide_path="DEVELOPER_GUIDE.md"):
        self.guide_path = guide_path
        self.guide_content = self._read_guide()
        
    def _read_guide(self):
        """Laad de inhoud van de guide"""
        if os.path.exists(self.guide_path):
            with open(self.guide_path, 'r', encoding='utf-8') as f:
                return f.read()
        return ""
    
    def get_component_info(self, component_name):
        """Zoek informatie over een specifieke component"""
        pattern = rf"### \d+\.\s+.*{component_name}.*?$(.*?)(?=^###|\Z)"
        match = re.search(pattern, self.guide_content, re.MULTILINE | re.DOTALL)
        return match.group(1).strip() if match else ""
    
    def get_workflow(self, workflow_name):
        """Haal informatie op over een specifieke workflow"""
        pattern = rf"### \d+\.\s+.*{workflow_name}.*?$(.*?)(?=^###|\Z)"
        match = re.search(pattern, self.guide_content, re.MULTILINE | re.DOTALL)
        return match.group(1).strip() if match else ""
    
    def validate_against_guide(self, code_path, code_content):
        """
        Valideer code tegen de Developer Guide om te waarborgen
        dat het voldoet aan de architectuur en conventies
        """
        # Implementatie: check patterns, naming conventions, etc.
        pass 