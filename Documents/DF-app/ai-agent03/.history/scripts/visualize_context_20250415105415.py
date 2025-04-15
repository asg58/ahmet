#!/usr/bin/env python3
"""
Script to visualize the project context in a more readable format.
Generates HTML and JSON representations of the project context.
"""

from datetime import datetime
from pathlib import Path
from typing import Dict, Any
import json
import os
import sys

def read_context_file() -> Dict[str, str]:
    """Read and parse the PROJECT_CONTEXT.md file."""
    context_file = Path('PROJECT_CONTEXT.md')
    if not context_file.exists():
        print('Error: PROJECT_CONTEXT.md not found')
        sys.exit(1)
        
    with open(context_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    sections = {}
    current_section = None
    current_content = []
    
    for line in content.split('\n'):
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

def format_content(section: str, content: str) -> str:
    """Format section content for HTML."""
    if section == 'Code Statistics':
        return format_stats(content)
    elif section == 'TODO Items':
        return format_todos(content)
    elif section == 'Project Structure':
        return f'<pre>{content}</pre>'
    else:
        content = content.replace('```', '<pre>')
        content = content.replace('`', '<code>')
        content = content.replace('\n- ', '\n<li>')
        content = content.replace('\n1. ', '\n<li>')
        return f'<div>{content}</div>'

def format_stats(content: str) -> str:
    """Format statistics for HTML."""
    stats = []
    for line in content.split('\n'):
        if line.startswith('- '):
            stat = line[2:].split(': ')
            if len(stat) == 2:
                stats.append(f'''
                    <div class="stat-item">
                        <strong>{stat[0]}</strong><br>
                        {stat[1]}
                    </div>
                ''')
    return f'''<div class="stats">{''.join(stats)}</div>'''

def format_todos(content: str) -> str:
    """Format TODO items for HTML."""
    todos = []
    current_priority = None
    for line in content.split('\n'):
        if line.startswith('### '):
            current_priority = line[4:].lower()
        elif line.startswith('- '):
            todo_class = f'todo-item {current_priority}-priority' if current_priority else 'todo-item'
            todos.append(f'<div class="{todo_class}">{line[2:]}</div>')
    return ''.join(todos)

def generate_json(sections: Dict[str, str]) -> Dict[str, Any]:
    """Generate JSON representation of the context."""
    return {
        'generated_at': datetime.now().isoformat(),
        'sections': sections
    }

def generate_html(sections: Dict[str, str]) -> str:
    """Generate HTML representation of the context."""
    html = '''<!DOCTYPE html>
<html>
<head>
    <title>Project Context</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .section {
            background-color: white;
            border-radius: 5px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
        }
        h2 {
            color: #444;
            margin-top: 30px;
        }
        pre {
            background-color: #f8f8f8;
            padding: 10px;
            border-radius: 3px;
            overflow-x: auto;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
            margin: 20px 0;
        }
        .stat-item {
            background-color: #e9e9e9;
            padding: 10px;
            border-radius: 3px;
            text-align: center;
        }
        .todo-item {
            margin: 5px 0;
            padding: 5px;
            background-color: #fff3cd;
            border-radius: 3px;
        }
        .high-priority {
            background-color: #f8d7da;
        }
        .low-priority {
            background-color: #d1ecf1;
        }
    </style>
</head>
<body>
    <h1>Project Context</h1>
    <p>Generated on: {date}</p>
'''.format(date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    for section, content in sections.items():
        html += f'''
    <div class="section">
        <h2>{section}</h2>
        {format_content(section, content)}
    </div>
'''
    
    html += '''
</body>
</html>
'''
    return html

def main() -> int:
    """Main function to run the visualization."""
    try:
        output_dir = Path('context_output')
        output_dir.mkdir(exist_ok=True)
        
        sections = read_context_file()
        html_content = generate_html(sections)
        json_content = generate_json(sections)
        
        with open(output_dir / 'context.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        with open(output_dir / 'context.json', 'w', encoding='utf-8') as f:
            json.dump(json_content, f, indent=2)
            
        print(f'✅ Generated context visualization in {output_dir}/')
        print('Files created:')
        print(f'- {output_dir}/context.html')
        print(f'- {output_dir}/context.json')
        return 0
        
    except Exception as e:
        print(f'Error generating visualization: {e}')
        return 1

if __name__ == '__main__':
    sys.exit(main())