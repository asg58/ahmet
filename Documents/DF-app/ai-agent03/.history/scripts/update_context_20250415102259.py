#!/usr/bin/env python
"""
Script to maintain and update the PROJECT_CONTEXT.md file.
This script helps keep track of project changes and ensures the context file stays up-to-date.
"""

import os
import sys
import subprocess
from datetime import datetime
from pathlib import Path

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