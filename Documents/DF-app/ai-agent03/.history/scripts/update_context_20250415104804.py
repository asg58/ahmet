#!/usr/bin/env python
"""
Script to maintain and update the PROJECT_CONTEXT.md file.
This script helps keep track of project changes and ensures the context file stays up-to-date.
"""

import os
import sys
import re
import subprocess
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from collections import defaultdict

class ProjectContext:
    """Class to manage project context information"""
    
    def __init__(self, context_file: str = "PROJECT_CONTEXT.md"):
        self.context_file = Path(context_file)
        self.content = self._read_content()
        self.sections = self._parse_sections()
        self.project_root = self._get_project_root()
    
    def _get_project_root(self) -> Path:
        """Get the root directory of the project"""
        try:
            result = subprocess.run(
                ['git', 'rev-parse', '--show-toplevel'],
                capture_output=True,
                text=True,
                check=True
            )
            return Path(result.stdout.strip())
        except subprocess.CalledProcessError:
            return Path.cwd()
    
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
        """Get recent git changes with more detailed information"""
        try:
            # Get commit hash, author, date, and message
            result = subprocess.run(
                ['git', 'log', '--pretty= \
    format:%h|%an|%ad|%s', '-n', '5', '--date=short'],
                capture_output=True,
                text=True,
                check=True
            )
            changes = []
            for line in result.stdout.strip().split('\n'):
                if line:
                    hash_, author, date, message = line.split('|', 3)
                    changes.append(f"- {date} | {hash_} | {author}: {message}")
            return changes
        except subprocess.CalledProcessError:
            return []
    
    def get_file_structure(self) -> str:
        """Get current project file structure with size information"""
        structure = []
        total_size = 0
        file_counts = defaultdict(int)
        
        for root, dirs, files in os.walk('.'):
            # Skip hidden directories and virtual environments
            dirs[:] = [d for d in dirs if not d.startswith('.') and d != '__pycache__' and 'venv' not in d]
            
            level = root.count(os.sep)
            indent = ' ' * 4 * level
            dir_name = os.path.basename(root)
            structure.append(f"{indent}{dir_name}/")
            
            subindent = ' ' * 4 * (level + 1)
            for f in files:
                if not f.startswith('.') and not f.endswith('.pyc'):  # Skip hidden and compiled files
                    file_path = os.path.join(root, f)
                    try:
                        size = os.path.getsize(file_path)
                        total_size += size
                        file_counts[f.split('.')[-1]] += 1
                        size_str = self._format_size(size)
                        structure.append(f"{subindent}{f} ({size_str})")
                    except OSError:
                        structure.append(f"{subindent}{f}")
        
        return '\n'.join(structure)
    
    def get_dependencies(self) -> str:
        """Get project dependencies from requirements.txt"""
        deps = []
        req_file = Path('requirements.txt')
        if req_file.exists():
            with open(req_file, 'r', encoding='utf-8') as f:
                deps = [line.strip(
    ) for line in f if line.strip() and not line.startswith('#')]
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
            'classes': 0
        }
        
        for root, _, files in os.walk('.'):
            for file in files:
                if file.endswith('.py'):
                    stats['python_files'] += 1
                    file_path = os.path.join(root, file)
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        stats['total_lines'] += len(content.split('\n'))
                        stats['docstrings'] += len(
    re.findall(r'""".*?"""', content, re.DOTALL))
                        stats['functions'] += len(
    re.findall(r'def\s+\w+\s*\(', content))
                        stats['classes'] += len(re.findall(r'class\s+\w+', content))
        
        return (
            f"- Python Files: {stats['python_files']}\n"
            f"- Total Lines: {stats['total_lines']}\n"
            f"- Functions: {stats['functions']}\n"
            f"- Classes: {stats['classes']}\n"
            f"- Docstrings: {stats['docstrings']}"
        )
    
    def update_section(self, section_name: str, content: str) -> None:
        """Update a specific section in the context file"""
        self.sections[section_name] = content
    
    def save(self) -> None:
        """Save the updated context to file"""
        content = []
        for section, section_content in self.sections.items():
            content.append(f"## {section}")
            content.append(section_content)
            content.append("")
        
        with open(self.context_file, 'w', encoding='utf-8') as f:
            f.write('\n'.join(content))
        
        print(f"✅ Updated {self.context_file}")

def main():
    """Main function"""
    try:
        context = ProjectContext()
        
        # Update Recent Changes
        changes = context.get_git_changes()
        changes_section = f"Last updated: {datetime.now(
    ).strftime('%Y-%m-%d %H:%M:%S')}\n\n"
        changes_section += '\n'.join(f"- {change}" for change in changes)
        context.update_section("Recent Changes", changes_section)
        
        # Update Project Structure
        structure_section = "```\n" + context.get_file_structure() + "\n```"
        context.update_section("Project Structure", structure_section)
        
        # Update Dependencies
        deps_section = context.get_dependencies()
        context.update_section("Dependencies", deps_section)
        
        # Update TODO Items
        todos_section = context.get_todo_items()
        context.update_section("TODO Items", todos_section)
        
        # Update Code Statistics
        stats_section = context.get_code_stats()
        context.update_section("Code Statistics", stats_section)
        
        # Save updates
        context.save()
        return 0
    
    except Exception as e:
        print(f"Error updating context file: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 