import os
import re

class ContextHelper:
    """
    Hulpklasse voor het automatisch lezen van de Developer Guide
    om context te krijgen voor code wijzigingen
    """
    
    def __init__(self, guide_path="DEVELOPER_GUIDE.md"):
        """__init__ function."""
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
        # Verbeterde regex: zoekt naar component naam in koppen op elk niveau (H1-H6)
        pattern = r'(?:^|\n)(#{1,6})\s+.*?' + re.escape(component_name) + r'.*?$(.*?)(?=\n#{1,6}\s+|\Z)'
        match = re.search(pattern, self.guide_content, re.MULTILINE | re.DOTALL)
        
        if not match:
            # Probeer een bredere match: zoek naar component in tekstblokken
            pattern = r'(?:^|\n).*?' + re.escape(component_name) + r'.*?\n(-.*?)(?=\n#{1,6}\s+|\Z)'
            match = re.search(pattern, self.guide_content, re.MULTILINE | re.DOTALL)
        
        return match.group(1).strip() if match else ""
    
    def get_workflow(self, workflow_name):
        """Haal informatie op over een specifieke workflow"""
        # Verbeterde regex voor workflows
        pattern = r'(?:^|\n)(#{1,6})\s+.*?' + re.escape(workflow_name) + r'.*?$(.*?)(?=\n#{1,6}\s+|\Z)'
        match = re.search(pattern, self.guide_content, re.MULTILINE | re.DOTALL)
        
        if not match:
            # Probeer een bredere match: zoek naar workflow in tekstblokken en codeblokken
            pattern = r'(?:\n|^).*?' + re.escape(workflow_name) + r'.*?```.*?```.*?$'
            match = re.search(pattern, self.guide_content, re.MULTILINE | re.DOTALL)
            if match:
                return match.group(0).strip()
        
        return match.group(2).strip() if match and len(match.groups()) > 1 else ""
    
    def validate_against_guide(self, code_path, code_content):
        """
        Valideer code tegen de Developer Guide om te waarborgen
        dat het voldoet aan de architectuur en conventies
        """
        # Implementatie: check patterns, naming conventions, etc.
        pass
        
    def extract_section_by_name(self, section_name):
        """
        Zoek een sectie op basis van naam (geen exacte match nodig)
        """
        lines = self.guide_content.split('\n')
        section_start = None
        section_end = None
        
        for i, line in enumerate(lines):
            # Zoek een heading die de zoekterm bevat (case insensitive)
            if re.match(r'^#{1,6}\s+', line) and section_name.lower() in line.lower():
                section_start = i
                current_level = len(re.match(r'^(#+)', line).group(1))
                
                # Zoek het einde van de sectie (volgende heading van gelijk of hoger niveau)
                for j in range(i + 1, len(lines)):
                    next_heading = re.match(r'^(#+)\s+', lines[j])
                    if next_heading and len(next_heading.group(1)) <= current_level:
                        section_end = j
                        break
                
                if section_end is None:  # Als geen einde gevonden, neem tot einde van file
                    section_end = len(lines)
                    
                # Sectie gevonden, extraheren en returnen
                return '\n'.join(lines[section_start:section_end])
        
        return ""  # Geen sectie gevonden 