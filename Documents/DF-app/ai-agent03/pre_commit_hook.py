#!/usr/bin/env python
"""
Pre-commit hook script that validates Python files that are staged for commit.
This script runs pre_code_check.py on each staged Python file before allowing the commit to proceed.
Also updates the PROJECT_CONTEXT.md file with recent changes.
"""

from pathlib import Path
from typing import List, Optional
import os
import subprocess
import sys
import time

def get_staged_python_files() -> List[str]:
    """
    Get all Python files that are staged for commit.
    
    Returns:
        List of file paths to staged Python files
    """
    try:
        result = subprocess.run(['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'], 
                              capture_output=True, text=True, check=True)
        staged_files = result.stdout.strip().split('\n')
        python_files = [f for f in staged_files if f.endswith('.py') and os.path.exists(f)]
        return python_files
    except subprocess.CalledProcessError as e:
        print(f'Error getting staged files: {e}')
        sys.exit(1)

def update_context() -> bool:
    """
    Update the PROJECT_CONTEXT.md file with recent changes.
    
    Returns:
        True if update was successful, False otherwise
    """
    try:
        script_dir = Path(__file__).resolve().parent
        update_script = os.path.join(script_dir, 'scripts', 'update_context.py')
        if not os.path.exists(update_script):
            print('⚠️ Context update script not found')
            return False
        result = subprocess.run([sys.executable, update_script], 
                              capture_output=True, text=True, check=False)
        if result.returncode == 0:
            print('✅ Updated project context file')
            return True
        else:
            print('⚠️ Failed to update project context file')
            print(f'Error output: {result.stderr}')
            return False
    except Exception as e:
        print(f'⚠️ Error updating context: {e}')
        return False

def run_code_check(files: List[str]) -> bool:
    """
    Run pre_code_check.py on the given Python files.
    
    Args:
        files: List of Python file paths to check
        
    Returns:
        True if all files pass validation, False otherwise
    """
    if not files:
        return True
        
    script_dir = Path(__file__).resolve().parent
    repo_root = subprocess.run(['git', 'rev-parse', '--show-toplevel'], 
                             capture_output=True, text=True, check=True).stdout.strip()
    code_check_locations = [
        os.path.join(repo_root, 'pre_code_check.py'),
        os.path.join(script_dir, 'pre_code_check.py'),
        os.path.join(repo_root, 'scripts', 'pre_code_check.py')
    ]
    
    code_check_script = None
    for location in code_check_locations:
        if os.path.exists(location):
            code_check_script = location
            break
            
    if not code_check_script:
        print('Error: Could not find pre_code_check.py')
        print('Make sure pre_code_check.py is in the repository root or in the same directory')
        print('as this hook.')
        return False
        
    print(f'Running code validation on {len(files)} staged Python files...')
    try:
        cmd = [sys.executable, code_check_script] + files
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        if result.returncode != 0:
            print('Validation errors found:')
            print(result.stdout)
            return False
        return True
    except Exception as e:
        print(f'Error running code check: {e}')
        return False

def check_context_file() -> bool:
    """
    Check if the context file exists and is up-to-date.
    
    Returns:
        True if context file is valid, False otherwise
    """
    context_file = Path('PROJECT_CONTEXT.md')
    if not context_file.exists():
        print('⚠️ PROJECT_CONTEXT.md not found')
        return False
        
    try:
        last_modified = context_file.stat().st_mtime
        if time.time() - last_modified > 86400:  # 24 hours in seconds
            print("⚠️ PROJECT_CONTEXT.md hasn't been updated in the last 24 hours")
            return update_context()
        return True
    except Exception as e:
        print(f'⚠️ Error checking context file: {e}')
        return False

def main() -> int:
    """
    Main function for the pre-commit hook.
    
    Returns:
        Exit code (0 for success, 1 for failure)
    """
    if not check_context_file():
        print('⚠️ Context file check failed, attempting to update...')
        if not update_context():
            print('❌ Failed to update context file')
            return 1
            
    python_files = get_staged_python_files()
    if not python_files:
        print('No Python files staged for commit. Skipping validation.')
        return 0
        
    if run_code_check(python_files):
        print('✅ All checks passed!')
        return 0
        
    print('\n❌ Code validation failed!')
    print('\nPlease fix the issues above before committing.')
    print('To bypass validation, use: git commit --no-verify')
    return 1

if __name__ == '__main__':
    sys.exit(main())


