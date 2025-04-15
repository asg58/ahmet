#!/usr/bin/env python
"""
Script to maintain and update the PROJECT_CONTEXT.md file.
This script helps keep track of project changes and ensures the context file stays up-to-date.
"""

import os
import sys
import re
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

class ProjectContext:
    """Class to manage project context information"""
    
    def __init__(self, context_file: str = "PROJECT_CONTEXT.md"):
        self.context_file = Path(context_file)
        self.content = self._read_content()
        self.sections = self._parse_sections()
    
    def _read_content(self) -> str:
        """Read the current content of the context file"""
        if self.context_file.exists():
            with open(self.context_file, 'r', encoding='utf-8') as f:
                return f.read()
        return "# Project Context Documentation\n\n"
    
    def _parse_sections(self) -> Dict[str, str]:
        """Parse the content into sections"""
        sections = {}
        current_section = None
        current_content = []
        
        for line in self.content.split('\n'):
            if line.startswith('## '):
                if current_section:
                    sections[current_section] = '\n'.join(current_content)
                current_section = line[3:].strip()
                current_content = []
            else:
                current_content.append(line)
        
        if current_section:
            sections[current_section] = '\n'.join(current_content)
        
        return sections
    
    def get_git_changes(self) -> List[str]:
        """Get recent git changes"""
        try:
            result = subprocess.run(
                ['git', 'log', '--pretty=format:%h %s', '-n', '5'],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip().split('\n')
        except subprocess.CalledProcessError:
            return []
    
    def get_file_structure(self) -> str:
        """Get current project file structure"""
        structure = []
        for root, dirs, files in os.walk('.'):
            # Skip hidden directories and virtual environments
            dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__' and 'venv' not in d]
            
            level = root.count(os.sep)
            indent = ' ' * 4 * level
            structure.append(f"{indent}{os.path.basename(root)}/")
            
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if not f.startswith('.') and not f.endswith('.pyc'):  # Skip hidden and compiled files
                    structure.append(f"{subindent}{f}")
        
        return '\n'.join(structure)
    
    def get_dependencies(self) -> str:
        """Get project dependencies from requirements.txt"""
        deps = []
        req_file = Path('requirements.txt')
        if req_file.exists():
            with open(req_file, 'r', encoding='utf-8') as f:
                deps = [line.strip() for line in f if line.strip() and not line.startswith('#')]
        return '\n'.join(f"- {dep}" for dep in deps)
    
    def get_todo_items(self) -> str:
        """Extract TODO items from code"""
        todos = []
        for root, _, files in os.walk('.'):
            for file in files:
                if file.endswith('.py'):
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        for i, line in enumerate(f, 1):
                            if 'TODO' in line:
                                todos.append(f"- {file_path}:{i} - {line.strip()}")
        return '\n'.join(todos)
    
    def get_code_stats(self) -> str:
        """Get basic code statistics"""
        stats = {
            'python_files': 0,
            'total_lines': 0,
            'docstrings': 0,
            'functions': 0,
def get_git_changes():
    """Get recent git changes to include in context updates"""
    try:
        result = subprocess.run(
            ['git', 'log', '--pretty=format:%h %s', '-n', '5'],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip().split('\n')
    except subprocess.CalledProcessError:
        return []

def get_file_structure():
    """Get current project file structure"""
    structure = []
    for root, dirs, files in os.walk('.'):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        
        level = root.count(os.sep)
        indent = ' ' * 4 * level
        structure.append(f"{indent}{os.path.basename(root)}/")
        
        subindent = ' ' * 4 * (level + 1)
        for f in files:
            if not f.startswith('.'):  # Skip hidden files
                structure.append(f"{subindent}{f}")
    
    return '\n'.join(structure)

def update_context_file():
    """Update the PROJECT_CONTEXT.md file with current information"""
    context_file = Path('PROJECT_CONTEXT.md')
    
    # Read current content
    if context_file.exists():
        with open(context_file, 'r', encoding='utf-8') as f:
            content = f.read()
    else:
        content = "# Project Context Documentation\n\n"
    
    # Update Recent Changes section
    changes = get_git_changes()
    changes_section = "## Recent Changes\n"
    changes_section += f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    for change in changes:
        changes_section += f"- {change}\n"
    
    # Update Project Structure section
    structure_section = "## Project Structure\n```\n"
    structure_section += get_file_structure()
    structure_section += "\n```\n"
    
    # Update content
    if "## Recent Changes" in content:
        content = content.split("## Recent Changes")[0] + changes_section + "\n" + content.split("## Recent Changes")[1]
    else:
        content += "\n" + changes_section
    
    if "## Project Structure" in content:
        content = content.split("## Project Structure")[0] + structure_section + "\n" + content.split("## Project Structure")[1]
    else:
        content += "\n" + structure_section
    
    # Write updated content
    with open(context_file, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✅ Updated {context_file}")

def main():
    """Main function"""
    try:
        update_context_file()
        return 0
    except Exception as e:
        print(f"Error updating context file: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 