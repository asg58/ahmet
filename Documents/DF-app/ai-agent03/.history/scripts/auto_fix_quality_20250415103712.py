#!/usr/bin/env python
"""
Script to automatically fix common code quality issues based on analysis results.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, List, Any
import re
import ast
from collections import defaultdict

class QualityFixer:
    """Automatically fixes common code quality issues"""
    
    def __init__(self, repo_path: str = "."):
        self.repo_path = Path(repo_path)
        self.quality_dir = self.repo_path / "context_output" / "quality"
        self.fixes_applied = defaultdict(list)
    
    def load_quality_metrics(self) -> Dict[str, Any]:
        """Load quality metrics from analysis results"""
        try:
            with open(self.quality_dir / "metrics.json", 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading quality metrics: {e}")
            return {}
    
    def fix_missing_docstrings(self, file_path: str) -> bool:
        """Add missing docstrings to functions and classes"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            modified = False
            
            # Track line numbers to adjust for added docstrings
            line_offset = 0
            
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.ClassDef)):
                    if not ast.get_docstring(node):
                        # Get the node's line number
                        line_num = node.lineno + line_offset
                        
                        # Create docstring
                        if isinstance(node, ast.FunctionDef):
                            docstring = f'    """{node.name} function."""\n'
                        else:
                            docstring = f'    """{node.name} class."""\n'
                        
                        # Add docstring after the def/class line
                        lines = content.splitlines()
                        indent = ' ' * (node.col_offset + 4)
                        lines.insert(line_num, indent + docstring.strip())
                        content = '\n'.join(lines)
                        line_offset += 1
                        modified = True
                        self.fixes_applied[file_path].append(f"Added docstring to {node.name}")
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
            return False
            
        except Exception as e:
            print(f"Error fixing docstrings in {file_path}: {e}")
            return False
    
    def fix_line_length(self, file_path: str) -> bool:
        """Fix lines that are too long by breaking them into multiple lines"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            modified = False
            max_length = 88  # Black's default line length
            
            for i, line in enumerate(lines):
                if len(line.rstrip()) > max_length and not line.strip().startswith('#'):
                    # Skip if it's a string or comment
                    if any(line.strip().startswith(c) for c in ['"', "'", '#']):
                        continue
                    
                    # Try to break the line at a logical point
                    if '(' in line and ')' in line:
                        # Function call or definition
                        parts = line.split('(', 1)
                        if len(parts) == 2:
                            new_line = parts[0] + '(\n    ' + parts[1].rstrip()
                            lines[i] = new_line + '\n'
                            modified = True
                            self.fixes_applied[file_path].append(f"Fixed long line at line {i+1}")
                    elif '=' in line:
                        # Assignment
                        parts = line.split('=', 1)
                        if len(parts) == 2:
                            new_line = parts[0] + '= \\\n    ' + parts[1].rstrip()
                            lines[i] = new_line + '\n'
                            modified = True
                            self.fixes_applied[file_path].append(f"Fixed long line at line {i+1}")
            
            if modified:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
                return True
            return False
            
        except Exception as e:
            print(f"Error fixing line length in {file_path}: {e}")
            return False
    
    def fix_import_order(self, file_path: str) -> bool:
        """Fix import order according to PEP 8"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            imports = []
            other_code = []
            
            # Separate imports from other code
            for node in ast.walk(tree):
                if isinstance(node, (ast.Import, ast.ImportFrom)):
                    imports.append(ast.unparse(node))
                elif not isinstance(node, (ast.Import, ast.ImportFrom, ast.Module)):
                    other_code.append(ast.unparse(node))
            
            if not imports:
                return False
            
            # Sort imports
            stdlib_imports = []
            third_party_imports = []
            local_imports = []
            
            for imp in imports:
                if imp.startswith('import '):
                    module = imp.split()[1].split('.')[0]
                else:
                    module = imp.split()[1].split('.')[0]
                
                if module in sys.stdlib_module_names:
                    stdlib_imports.append(imp)
                elif '.' in imp:
                    local_imports.append(imp)
                else:
                    third_party_imports.append(imp)
            
            # Sort each group alphabetically
            stdlib_imports.sort()
            third_party_imports.sort()
            local_imports.sort()
            
            # Combine imports
            sorted_imports = stdlib_imports + third_party_imports + local_imports
            
            # Reconstruct file content
            new_content = '\n'.join(sorted_imports) + '\n\n' + '\n'.join(other_code)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                self.fixes_applied[file_path].append("Fixed import order")
                return True
            return False
            
        except Exception as e:
            print(f"Error fixing import order in {file_path}: {e}")
            return False
    
    def apply_fixes(self) -> None:
        """Apply all available fixes to the codebase"""
        metrics = self.load_quality_metrics()
        if not metrics:
            print("No quality metrics found")
            return
        
        total_fixes = 0
        for file_path, file_metrics in metrics.items():
            print(f"\nAnalyzing {file_path}...")
            
            # Apply fixes based on metrics
            if file_metrics.get('functions', 0) + file_metrics.get('classes', 0) > file_metrics.get('docstrings', 0):
                if self.fix_missing_docstrings(file_path):
                    total_fixes += 1
            
            if self.fix_line_length(file_path):
                total_fixes += 1
            
            if self.fix_import_order(file_path):
                total_fixes += 1
        
        # Save fix report
        self.save_fix_report()
        
        print(f"\n✅ Applied {total_fixes} fixes across {len(metrics)} files")
    
    def save_fix_report(self) -> None:
        """Save report of applied fixes"""
        try:
            report = {
                'timestamp': str(datetime.now()),
                'fixes_applied': dict(self.fixes_applied)
            }
            
            with open(self.quality_dir / "fixes_report.json", 'w') as f:
                json.dump(report, f, indent=2)
            
            print(f"✅ Fix report saved to {self.quality_dir}/fixes_report.json")
        except Exception as e:
            print(f"Error saving fix report: {e}")

def main():
    """Main function"""
    try:
        fixer = QualityFixer()
        fixer.apply_fixes()
        return 0
    except Exception as e:
        print(f"Error applying fixes: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 