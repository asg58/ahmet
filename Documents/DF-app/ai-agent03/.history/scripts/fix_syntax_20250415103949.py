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
    
    def __init__(self, repo_path: str):
        self.repo_path = Path(repo_path)
        self.fixes_applied: Dict[str, int] = {
            'unterminated_strings': 0,
            'indentation': 0,
            'missing_colons': 0
        }
        self.failed_files: List[str] = []
    
    def get_python_files(self) -> List[Path]:
        """Get all Python files in the repository"""
        python_files = []
        for root, _, files in os.walk(self.repo_path):
            for file in files:
                if file.endswith('.py'):
                    python_files.append(Path(root) / file)
        return python_files
    
    def fix_unterminated_strings(self, content: str) -> str:
        """Fix unterminated string literals"""
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
                self.fixes_applied.setdefault("unterminated_strings", []).append(i + 1)
            
            fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    def fix_indentation(self, content: str) -> str:
        """Fix indentation errors"""
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
                self.fixes_applied.setdefault("indentation", []).append(i + 1)
            else:
                fixed_lines.append(line)
            
            # Update indent level based on control structures
            if stripped.endswith(':'):
                indent_level += 1
            elif stripped.startswith(('return', 'break', 'continue', 'pass')):
                indent_level = max(0, indent_level - 1)
        
        return '\n'.join(fixed_lines)
    
    def fix_missing_colons(self, content: str) -> str:
        """Fix missing colons after control structures"""
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
                    self.fixes_applied.setdefault("missing_colons", []).append(i + 1)
                    break
            else:
                fixed_lines.append(line)
        
        return '\n'.join(fixed_lines)
    
    def fix_invalid_syntax(self, file_path: Path) -> bool:
        """Fix common syntax errors in a Python file"""
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
                return False
            
            # Save fixed content
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            return True
        
        except Exception as e:
            print(f"Error fixing syntax in {file_path}: {e}")
            return False
    
    def apply_fixes(self) -> None:
        """Apply syntax fixes to all Python files"""
        python_files = self.get_python_files()
        total_fixes = 0
        
        for file_path in python_files:
            print(f"\nAnalyzing {file_path}...")
            if self.fix_invalid_syntax(file_path):
                total_fixes += 1
                print(f"✅ Fixed syntax issues in {file_path}")
        
        print(f"\n✅ Applied {total_fixes} syntax fixes across {len(python_files)} files")
        
        # Print summary of fixes
        if self.fixes_applied:
            print("\nSummary of fixes applied:")
            for fix_type, lines in self.fixes_applied.items():
                print(f"- {fix_type}: {len(lines)} instances")

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