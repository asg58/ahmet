#!/usr/bin/env python
"""
Script to fix common syntax errors in Python files.
"""

import os
import sys
import re
from pathlib import Path
from typing import List, Dict, Any
import ast
import tokenize
from io import StringIO

class SyntaxFixer:
    """Fixes common syntax errors in Python files"""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.fixes_applied: Dict[str, int] = {
            'unterminated_strings': 0,
            'indentation': 0,
            'missing_colons': 0
        }
        self.failed_files: List[str] = []
        
        # Exclude virtual environment and external packages
        self.excluded_dirs = {
            '.venv',
            'venv',
            'env',
            'Lib',
            'lib',
            'site-packages',
            'dist',
            'build'
        }
    
    def get_python_files(self) -> List[Path]:
        """Get all Python files in the repository, excluding virtual env and external packages"""
        python_files = []
        for root, dirs, files in os.walk(self.repo_path):
            # Skip excluded directories
            if any(excluded in str(root) for excluded in self.excluded_dirs):
                continue
                
            for file in files:
                if file.endswith('.py'):
                    python_files.append(Path(root) / file)
        return python_files
    
    def fix_unterminated_strings(self, content: str) -> str:
        """Fix unterminated string literals with more robust handling"""
        try:
            # First try to parse the content to identify syntax errors
            ast.parse(content)
            return content  # No syntax errors found
        except SyntaxError as e:
            if "unterminated string literal" in str(e):
                lines = content.splitlines()
                fixed_lines = []
                
                for i, line in enumerate(lines):
                    # Check for unterminated strings
                    if line.count('"') % 2 != 0 or line.count("'") % 2 != 0:
                        # Try to fix by adding a closing quote
                        if line.count('"') % 2 != 0:
                            line += '"'
                        if line.count("'") % 2 != 0:
                            line += "'"
                        self.fixes_applied['unterminated_strings'] += 1
                    
                    fixed_lines.append(line)
                
                return '\n'.join(fixed_lines)
            return content
    
    def fix_indentation(self, content: str) -> str:
        """Fix indentation errors with more robust handling"""
        try:
            # First try to parse the content to identify syntax errors
            ast.parse(content)
            return content  # No syntax errors found
        except SyntaxError as e:
            if "unexpected indent" in str(e) or "expected an indented block" in str(e):
                lines = content.splitlines()
                fixed_lines = []
                indent_level = 0
                
                for i, line in enumerate(lines):
                    stripped = line.lstrip()
                    if not stripped:
                        fixed_lines.append(line)
                        continue
                    
                    # Calculate expected indentation
                    expected_indent = ' ' * (indent_level * 4)
                    
                    # Check if line is properly indented
                    if not line.startswith(expected_indent):
                        # Fix indentation
                        fixed_line = expected_indent + stripped
                        fixed_lines.append(fixed_line)
                        self.fixes_applied['indentation'] += 1
                    else:
                        fixed_lines.append(line)
                    
                    # Update indent level based on control structures
                    if stripped.endswith(':'):
                        indent_level += 1
                    elif stripped.startswith(('return', 'break', 'continue', 'pass')):
                        indent_level = max(0, indent_level - 1)
                
                return '\n'.join(fixed_lines)
            return content
    
    def fix_missing_colons(self, content: str) -> str:
        """Fix missing colons after control structures with more robust handling"""
        try:
            # First try to parse the content to identify syntax errors
            ast.parse(content)
            return content  # No syntax errors found
        except SyntaxError as e:
            if "invalid syntax" in str(e):
                lines = content.splitlines()
                fixed_lines = []
                
                control_structures = [
                    'if', 'elif', 'else', 'for', 'while', 'def', 'class',
                    'try', 'except', 'finally', 'with'
                ]
                
                for i, line in enumerate(lines):
                    stripped = line.lstrip()
                    if not stripped:
                        fixed_lines.append(line)
                        continue
                    
                    # Check for control structures without colons
                    for struct in control_structures:
                        if stripped.startswith(struct + ' ') and not stripped.endswith(':'):
                            # Add missing colon
                            fixed_line = line + ':'
                            fixed_lines.append(fixed_line)
                            self.fixes_applied['missing_colons'] += 1
                            break
                    else:
                        fixed_lines.append(line)
                
                return '\n'.join(fixed_lines)
            return content
    
    def fix_invalid_syntax(self, file_path: Path) -> bool:
        """Fix common syntax errors in a Python file with more robust error handling"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Apply fixes
            content = self.fix_unterminated_strings(content)
            content = self.fix_indentation(content)
            content = self.fix_missing_colons(content)
            
            # Verify the fixes
            try:
                ast.parse(content)
            except SyntaxError as e:
                print(f"Could not fix all syntax errors in {file_path}: {e}")
                self.failed_files.append(str(file_path))
                return False
            
            # Save fixed content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
        
        except Exception as e:
            print(f"Error fixing syntax in {file_path}: {e}")
            self.failed_files.append(str(file_path))
            return False
    
    def apply_fixes(self) -> None:
        """Apply syntax fixes to all Python files"""
        python_files = self.get_python_files()
        total_fixes = 0
        
        print(f"\nFound {len(python_files)} Python files to analyze")
        
        for file_path in python_files:
            print(f"\nAnalyzing {file_path}...")
            if self.fix_invalid_syntax(file_path):
                total_fixes += 1
                print(f"✅ Fixed syntax issues in {file_path}")
        
        print(f"\n✅ Applied {total_fixes} syntax fixes across {len(python_files)} files")
        
        # Print summary of fixes
        if self.fixes_applied:
            print("\nSummary of fixes applied:")
            for fix_type, count in self.fixes_applied.items():
                print(f"- {fix_type}: {count} instances")
        
        if self.failed_files:
            print("\n❌ Failed to fix the following files:")
            for file in self.failed_files:
                print(f"- {file}")

def main():
    """Main function"""
    try:
        fixer = SyntaxFixer()
        fixer.apply_fixes()
        return 0
    except Exception as e:
        print(f"Error applying syntax fixes: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 