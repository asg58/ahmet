#!/usr/bin/env python3

"""
Script to verify the structure and content of the development guide.
Checks for proper heading structure, section parseability, and code block formatting.
"""

import os
import re
import sys
from context_helper import ContextHelper

def verify_heading_structure(content: str) -> bool:
    """
    Verify that the guide has proper heading structure.
    - Must have at least one H1 heading
    - Heading levels must be properly nested
    """
    lines = content.split('\n')
    heading_levels = []
    has_h1 = False
    success = True

    for line in lines:
        if line.startswith('#'):
            level = len(line) - len(line.lstrip('#'))
            if level == 1:
                has_h1 = True
            if heading_levels and level > heading_levels[-1] + 1:
                print(f"Warning: Heading level jumps from {heading_levels[-1]} to {level}")
                success = False
            heading_levels.append(level)

    if not has_h1:
        print("Error: Guide must have at least one H1 heading")
        success = False

    return success

def verify_section_parseability(helper: ContextHelper) -> bool:
    """
    Verify that crucial sections and workflows can be found using regex.
    Issues warnings if any expected sections are missing.
    """
    success = True
    required_sections = [
        (r'# Development Guide', "Main title"),
        (r'## Setup', "Setup section"),
        (r'## Workflow', "Workflow section"),
        (r'## Testing', "Testing section")
    ]

    for pattern, section_name in required_sections:
        if not helper.find_section(pattern):
            print(f"Warning: Could not find {section_name}")
            success = False

    return success

def verify_code_blocks(content: str) -> bool:
    """
    Verify code block formatting:
    - Check for balanced backticks
    - Ensure language is specified for code blocks
    """
    success = True
    code_block_starts = re.finditer(r'```(\w*)', content)
    code_block_ends = re.finditer(r'```\s*$', content, re.MULTILINE)
    
    starts = list(code_block_starts)
    ends = list(code_block_ends)

    if len(starts) != len(ends):
        print("Error: Unmatched code block delimiters")
        success = False

    for start in starts:
        if not start.group(1):
            print(f"Warning: Code block at line {content.count('\n', 0, start.start())} has no language specified")
            success = False

    return success

def main() -> int:
    """
    Main function to verify the guide.
    Returns 0 on success, 1 on failure.
    """
    if len(sys.argv) != 2:
        print("Usage: verify_guide.py <path_to_guide>")
        return 1

    guide_path = sys.argv[1]
    if not os.path.exists(guide_path):
        print(f"Error: Guide file not found at {guide_path}")
        return 1

    try:
        with open(guide_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading guide file: {e}")
        return 1

    helper = ContextHelper(content)
    success = True

    print("Verifying guide structure...")
    success &= verify_heading_structure(content)
    
    print("\nVerifying section parseability...")
    success &= verify_section_parseability(helper)
    
    print("\nVerifying code blocks...")
    success &= verify_code_blocks(content)

    if success:
        print("\nGuide verification passed!")
        return 0
    else:
        print("\nGuide verification failed. Please fix the issues above.")
        return 1

if __name__ == '__main__':
    sys.exit(main()) 