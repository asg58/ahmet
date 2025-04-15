#!/usr/bin/env python
"""
Pre-commit hook script that validates Python files that are staged for commit.
This script runs pre_code_check.py on each staged Python file before allowing the commit to proceed.
"""

import os
import sys
import subprocess
from pathlib import Path

def get_staged_python_files():
    """
    Get all Python files that are staged for commit.
    
    Returns:
        List of file paths to staged Python files
    """
    try:
        # Get list of staged files
        result = subprocess.run(
            ["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"],
            capture_output=True,
            text=True,
            check=True
        )
        
        # Filter for Python files
        staged_files = result.stdout.strip().split('\n')
        python_files = [f for f in staged_files if f.endswith('.py') and os.path.exists(f)]
        
        return python_files
    
    except subprocess.CalledProcessError as e:
        print(f"Error getting staged files: {e}")
        sys.exit(1)

def run_code_check(files):
    """
    Run pre_code_check.py on the given Python files.
    
    Args:
        files: List of Python file paths to check
        
    Returns:
        True if all files pass validation, False otherwise
    """
    if not files:
        return True
    
    # Find the pre_code_check.py script
    script_dir = Path(__file__).resolve().parent
    repo_root = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=True
    ).stdout.strip()
    
    # Check possible locations for pre_code_check.py
    code_check_locations = [
        os.path.join(repo_root, "pre_code_check.py"),
        os.path.join(script_dir, "pre_code_check.py"),
        os.path.join(repo_root, "scripts", "pre_code_check.py")
    ]
    
    code_check_script = None
    for location in code_check_locations:
        if os.path.exists(location):
            code_check_script = location
            break
    
    if not code_check_script:
        print("Error: Could not find pre_code_check.py")
        print("Make sure pre_code_check.py is in the repository root or in the same directory as this hook.")
        return False
    
    # Run the pre_code_check.py script on each file
    print(f"Running code validation on {len(files)} staged Python files...")
    
    try:
        cmd = [sys.executable, code_check_script] + files
        result = subprocess.run(cmd, capture_output=False, check=False)
        
        return result.returncode == 0
    
    except Exception as e:
        print(f"Error running code check: {e}")
        return False

def main():
    """
    Main function for the pre-commit hook.
    
    Returns:
        Exit code (0 for success, 1 for failure)
    """
    # Get staged Python files
    python_files = get_staged_python_files()
    
    if not python_files:
        print("No Python files staged for commit. Skipping validation.")
        return 0
    
    # Run code check on staged files
    if run_code_check(python_files):
        print("✅ All checks passed!")
        return 0
    
    print("\n❌ Code validation failed!")
    print("\nFix the issues or use git commit --no-verify to bypass this check.")
    return 1

if __name__ == "__main__":
    sys.exit(main()) 