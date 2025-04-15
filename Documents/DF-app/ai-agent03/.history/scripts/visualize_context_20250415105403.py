from datetime import datetime
from pathlib import Path
from typing import Dict, Any
import json
import os
import sys

'\nScript to visualize the project context in a more readable format.\nGenerates HTML and JSON representations of the project context.\n'
def read_context_file() -> Dict[str, str]:
    """Read and parse the PROJECT_CONTEXT.md file"""
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
def generate_html(sections: Dict[str, str]) -> str:
    """Generate HTML representation of the context"""
    html = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Project Context</title>\n    <style>\n        body {\n            font-family: Arial, sans-serif;\n            line-height: 1.6;\n            max-width: 1200px;\n            margin: 0 auto;\n            padding: 20px;\n            background-color: #f5f5f5;\n        }\n        .section {\n            background-color: white;\n            border-radius: 5px;\n            padding: 20px;\n            margin-bottom: 20px;\n            box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n        }\n        h1 {\n            color: #333;\n            border-bottom: 2px solid #333;\n            padding-bottom: 10px;\n        }\n        h2 {\n            color: #444;\n            margin-top: 30px;\n        }\n        pre {\n            background-color: #f8f8f8;\n            padding: 10px;\n            border-radius: 3px;\n            overflow-x: auto;\n        }\n        .stats {\n            display: grid;\n            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n            gap: 10px;\n            margin: 20px 0;\n        }\n        .stat-item {\n            background-color: #e9e9e9;\n            padding: 10px;\n            border-radius: 3px;\n            text-align: center;\n        }\n        .todo-item {\n            margin: 5px 0;\n            padding: 5px;\n            background-color: #fff3cd;\n            border-radius: 3px;\n        }\n        .high-priority {\n            background-color: #f8d7da;\n        }\n        .low-priority {\n            background-color: #d1ecf1;\n        }\n    </style>\n</head>\n<body>\n    <h1>Project Context</h1>\n    <p>Generated on: {date}</p>\n'
    html = html.format(date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    for section, content in sections.items():
        html += f'\n    <div class="section">\n        <h2>{section}</h2>\n        {format_content(section, content)}\n    </div>\n'
    html += '\n</body>\n</html>\n'
    return html
def format_content(section: str, content: str) -> str:
    """Format section content for HTML"""
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
    """Format statistics for HTML"""
    stats = []
    for line in content.split('\n'):
        if line.startswith('- '):
            stat = line[2:].split(': ')
            if len(stat) == 2:
                stats.append(f'\n                    <div class="stat-item">\n                        <strong>{stat[0]}</strong><br>\n                        {stat[1]}\n                    </div>\n                ')
    return f"""<div class="stats">{''.join(stats)}</div>"""
def format_todos(content: str) -> str:
    """Format TODO items for HTML"""
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
    """Generate JSON representation of the context"""
    return {'generated_at': datetime.now().isoformat(), 'sections': sections}
def main():
    """Main function"""
    try:
        output_dir = Path('context_output')
        output_dir.mkdir(exist_ok=True)
        sections = read_context_file()
        html_content = generate_html(sections)
        with open(output_dir / 'context.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        json_content = generate_json(sections)
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
'\nScript to visualize the project context in a more readable format.\nGenerates HTML and JSON representations of the project context.\n'
os
sys
json
Path
datetime
Dict
Any

'Read and parse the PROJECT_CONTEXT.md file'
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
Dict[str, str]
sections: Dict[str, str]
'Generate HTML representation of the context'
html = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Project Context</title>\n    <style>\n        body {\n            font-family: Arial, sans-serif;\n            line-height: 1.6;\n            max-width: 1200px;\n            margin: 0 auto;\n            padding: 20px;\n            background-color: #f5f5f5;\n        }\n        .section {\n            background-color: white;\n            border-radius: 5px;\n            padding: 20px;\n            margin-bottom: 20px;\n            box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n        }\n        h1 {\n            color: #333;\n            border-bottom: 2px solid #333;\n            padding-bottom: 10px;\n        }\n        h2 {\n            color: #444;\n            margin-top: 30px;\n        }\n        pre {\n            background-color: #f8f8f8;\n            padding: 10px;\n            border-radius: 3px;\n            overflow-x: auto;\n        }\n        .stats {\n            display: grid;\n            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n            gap: 10px;\n            margin: 20px 0;\n        }\n        .stat-item {\n            background-color: #e9e9e9;\n            padding: 10px;\n            border-radius: 3px;\n            text-align: center;\n        }\n        .todo-item {\n            margin: 5px 0;\n            padding: 5px;\n            background-color: #fff3cd;\n            border-radius: 3px;\n        }\n        .high-priority {\n            background-color: #f8d7da;\n        }\n        .low-priority {\n            background-color: #d1ecf1;\n        }\n    </style>\n</head>\n<body>\n    <h1>Project Context</h1>\n    <p>Generated on: {date}</p>\n'
html = html.format(date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
for section, content in sections.items():
    html += f'\n    <div class="section">\n        <h2>{section}</h2>\n        {format_content(section, content)}\n    </div>\n'
html += '\n</body>\n</html>\n'
return html
str
section: str, content: str
'Format section content for HTML'
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
str
content: str
'Format statistics for HTML'
stats = []
for line in content.split('\n'):
    if line.startswith('- '):
        stat = line[2:].split(': ')
        if len(stat) == 2:
            stats.append(f'\n                    <div class="stat-item">\n                        <strong>{stat[0]}</strong><br>\n                        {stat[1]}\n                    </div>\n                ')
return f"""<div class="stats">{''.join(stats)}</div>"""
str
content: str
'Format TODO items for HTML'
todos = []
current_priority = None
for line in content.split('\n'):
    if line.startswith('### '):
        current_priority = line[4:].lower()
    elif line.startswith('- '):
        todo_class = f'todo-item {current_priority}-priority' if current_priority else 'todo-item'
        todos.append(f'<div class="{todo_class}">{line[2:]}</div>')
return ''.join(todos)
str
sections: Dict[str, str]
'Generate JSON representation of the context'
return {'generated_at': datetime.now().isoformat(), 'sections': sections}
Dict[str, Any]

'Main function'
try:
    output_dir = Path('context_output')
    output_dir.mkdir(exist_ok=True)
    sections = read_context_file()
    html_content = generate_html(sections)
    with open(output_dir / 'context.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    json_content = generate_json(sections)
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
__name__ == '__main__'
sys.exit(main())
'Read and parse the PROJECT_CONTEXT.md file'
context_file
Path('PROJECT_CONTEXT.md')
not context_file.exists()
print('Error: PROJECT_CONTEXT.md not found')
sys.exit(1)
open(context_file, 'r', encoding='utf-8') as f
content = f.read()
sections
{}
current_section
None
current_content
[]
line
content.split('\n')
if line.startswith('## '):
    if current_section:
        sections[current_section] = '\n'.join(current_content)
    current_section = line[3:].strip()
    current_content = []
else:
    current_content.append(line)
current_section
sections[current_section] = '\n'.join(current_content)
sections
Dict
(str, str)

sections: Dict[str, str]
'Generate HTML representation of the context'
html
'<!DOCTYPE html>\n<html>\n<head>\n    <title>Project Context</title>\n    <style>\n        body {\n            font-family: Arial, sans-serif;\n            line-height: 1.6;\n            max-width: 1200px;\n            margin: 0 auto;\n            padding: 20px;\n            background-color: #f5f5f5;\n        }\n        .section {\n            background-color: white;\n            border-radius: 5px;\n            padding: 20px;\n            margin-bottom: 20px;\n            box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n        }\n        h1 {\n            color: #333;\n            border-bottom: 2px solid #333;\n            padding-bottom: 10px;\n        }\n        h2 {\n            color: #444;\n            margin-top: 30px;\n        }\n        pre {\n            background-color: #f8f8f8;\n            padding: 10px;\n            border-radius: 3px;\n            overflow-x: auto;\n        }\n        .stats {\n            display: grid;\n            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n            gap: 10px;\n            margin: 20px 0;\n        }\n        .stat-item {\n            background-color: #e9e9e9;\n            padding: 10px;\n            border-radius: 3px;\n            text-align: center;\n        }\n        .todo-item {\n            margin: 5px 0;\n            padding: 5px;\n            background-color: #fff3cd;\n            border-radius: 3px;\n        }\n        .high-priority {\n            background-color: #f8d7da;\n        }\n        .low-priority {\n            background-color: #d1ecf1;\n        }\n    </style>\n</head>\n<body>\n    <h1>Project Context</h1>\n    <p>Generated on: {date}</p>\n'
html
html.format(date=datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
(section, content)
sections.items()
html += f'\n    <div class="section">\n        <h2>{section}</h2>\n        {format_content(section, content)}\n    </div>\n'
html

'\n</body>\n</html>\n'
html

section: str
content: str
'Format section content for HTML'
section == 'Code Statistics'
return format_stats(content)
if section == 'TODO Items':
    return format_todos(content)
elif section == 'Project Structure':
    return f'<pre>{content}</pre>'
else:
    content = content.replace('```', '<pre>')
    content = content.replace('`', '<code>')
    content = content.replace('\n- ', '\n<li>')
    content = content.replace('\n1. ', '\n<li>')
    return f'<div>{content}</div>'

content: str
'Format statistics for HTML'
stats
[]
line
content.split('\n')
if line.startswith('- '):
    stat = line[2:].split(': ')
    if len(stat) == 2:
        stats.append(f'\n                    <div class="stat-item">\n                        <strong>{stat[0]}</strong><br>\n                        {stat[1]}\n                    </div>\n                ')
f"""<div class="stats">{''.join(stats)}</div>"""

content: str
'Format TODO items for HTML'
todos
[]
current_priority
None
line
content.split('\n')
if line.startswith('### '):
    current_priority = line[4:].lower()
elif line.startswith('- '):
    todo_class = f'todo-item {current_priority}-priority' if current_priority else 'todo-item'
    todos.append(f'<div class="{todo_class}">{line[2:]}</div>')
''.join(todos)

sections: Dict[str, str]
'Generate JSON representation of the context'
{'generated_at': datetime.now().isoformat(), 'sections': sections}
Dict
(str, Any)

'Main function'
output_dir = Path('context_output')
output_dir.mkdir(exist_ok=True)
sections = read_context_file()
html_content = generate_html(sections)
with open(output_dir / 'context.html', 'w', encoding='utf-8') as f:
    f.write(html_content)
json_content = generate_json(sections)
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
__name__

'__main__'
sys.exit(main())

Path
'PROJECT_CONTEXT.md'

context_file.exists()
print('Error: PROJECT_CONTEXT.md not found')
sys.exit(1)
open(context_file, 'r', encoding='utf-8')
f
content
f.read()





content.split
'\n'
line.startswith('## ')
if current_section:
    sections[current_section] = '\n'.join(current_content)
current_section = line[3:].strip()
current_content = []
current_content.append(line)

sections[current_section]
'\n'.join(current_content)


str
str

Dict[str, str]


html.format
date=datetime.now().strftime('%Y-%m-%d %H:%M:%S')
section
content

sections.items
html

f'\n    <div class="section">\n        <h2>{section}</h2>\n        {format_content(section, content)}\n    </div>\n'


str
str
section

'Code Statistics'
format_stats(content)
section == 'TODO Items'
return format_todos(content)
if section == 'Project Structure':
    return f'<pre>{content}</pre>'
else:
    content = content.replace('```', '<pre>')
    content = content.replace('`', '<code>')
    content = content.replace('\n- ', '\n<li>')
    content = content.replace('\n1. ', '\n<li>')
    return f'<div>{content}</div>'
str



content.split
'\n'
line.startswith('- ')
stat = line[2:].split(': ')
if len(stat) == 2:
    stats.append(f'\n                    <div class="stat-item">\n                        <strong>{stat[0]}</strong><br>\n                        {stat[1]}\n                    </div>\n                ')
'<div class="stats">'
{''.join(stats)}
'</div>'
str




content.split
'\n'
line.startswith('### ')
current_priority = line[4:].lower()
if line.startswith('- '):
    todo_class = f'todo-item {current_priority}-priority' if current_priority else 'todo-item'
    todos.append(f'<div class="{todo_class}">{line[2:]}</div>')
''.join
todos
Dict[str, str]
'generated_at'
'sections'
datetime.now().isoformat()
sections

str
Any

output_dir
Path('context_output')
output_dir.mkdir(exist_ok=True)
sections
read_context_file()
html_content
generate_html(sections)
open(output_dir / 'context.html', 'w', encoding='utf-8') as f
f.write(html_content)
json_content
generate_json(sections)
open(output_dir / 'context.json', 'w', encoding='utf-8') as f
json.dump(json_content, f, indent=2)
print(f'✅ Generated context visualization in {output_dir}/')
print('Files created:')
print(f'- {output_dir}/context.html')
print(f'- {output_dir}/context.json')
0
Exception
print(f'Error generating visualization: {e}')
return 1

sys.exit
main()

context_file.exists
print
'Error: PROJECT_CONTEXT.md not found'
sys.exit
1
open
context_file
'r'
encoding='utf-8'


f.read
content

line.startswith
'## '
current_section
sections[current_section] = '\n'.join(current_content)
current_section
line[3:].strip()
current_content
[]
current_content.append(line)
sections
current_section

'\n'.join
current_content


Dict
(str, str)

html

datetime.now().strftime('%Y-%m-%d %H:%M:%S')


sections


'\n    <div class="section">\n        <h2>'
{section}
'</h2>\n        '
{format_content(section, content)}
'\n    </div>\n'



format_stats
content
section

'TODO Items'
format_todos(content)
section == 'Project Structure'
return f'<pre>{content}</pre>'
content = content.replace('```', '<pre>')
content = content.replace('`', '<code>')
content = content.replace('\n- ', '\n<li>')
content = content.replace('\n1. ', '\n<li>')
return f'<div>{content}</div>'

content

line.startswith
'- '
stat
line[2:].split(': ')
len(stat) == 2
stats.append(f'\n                    <div class="stat-item">\n                        <strong>{stat[0]}</strong><br>\n                        {stat[1]}\n                    </div>\n                ')
''.join(stats)

content

line.startswith
'### '
current_priority
line[4:].lower()
line.startswith('- ')
todo_class = f'todo-item {current_priority}-priority' if current_priority else 'todo-item'
todos.append(f'<div class="{todo_class}">{line[2:]}</div>')
''


Dict
(str, str)

datetime.now().isoformat




Path
'context_output'
output_dir.mkdir
exist_ok=True

read_context_file

generate_html
sections
open(output_dir / 'context.html', 'w', encoding='utf-8')
f
f.write(html_content)

generate_json
sections
open(output_dir / 'context.json', 'w', encoding='utf-8')
f
json.dump(json_content, f, indent=2)
print
f'✅ Generated context visualization in {output_dir}/'
print
'Files created:'
print
f'- {output_dir}/context.html'
print
f'- {output_dir}/context.json'

print(f'Error generating visualization: {e}')
1
sys

main
context_file


sys



'utf-8'
f


line


sections[current_section]
'\n'.join(current_content)

line[3:].strip


current_content.append
line


'\n'



str
str


datetime.now().strftime
'%Y-%m-%d %H:%M:%S'

section
format_content(section, content)



format_todos
content
section

'Project Structure'
f'<pre>{content}</pre>'
content
content.replace('```', '<pre>')
content
content.replace('`', '<code>')
content
content.replace('\n- ', '\n<li>')
content
content.replace('\n1. ', '\n<li>')
f'<div>{content}</div>'

line


line[2:].split
': '
len(stat)

2
stats.append(f'\n                    <div class="stat-item">\n                        <strong>{stat[0]}</strong><br>\n                        {stat[1]}\n                    </div>\n                ')
''.join
stats

line


line[4:].lower
line.startswith
'- '
todo_class
f'todo-item {current_priority}-priority' if current_priority else 'todo-item'
todos.append(f'<div class="{todo_class}">{line[2:]}</div>')

str
str

datetime.now()


output_dir

True



open
output_dir / 'context.html'
'w'
encoding='utf-8'

f.write
html_content


open
output_dir / 'context.json'
'w'
encoding='utf-8'

json.dump
json_content
f
indent=2

'✅ Generated context visualization in '
{output_dir}
'/'


'- '
{output_dir}
'/context.html'

'- '
{output_dir}
'/context.json'
print
f'Error generating visualization: {e}'






sections
current_section

'\n'.join
current_content
line[3:]

current_content




datetime.now()


format_content
section
content



'<pre>'
{content}
'</pre>'

content.replace
'```'
'<pre>'

content.replace
'`'
'<code>'

content.replace
'\n- '
'\n<li>'

content.replace
'\n1. '
'\n<li>'
'<div>'
{content}
'</div>'

line[2:]

len
stat
stats.append
f'\n                    <div class="stat-item">\n                        <strong>{stat[0]}</strong><br>\n                        {stat[1]}\n                    </div>\n                '
''



line[4:]

line


current_priority
f'todo-item {current_priority}-priority'
'todo-item'
todos.append
f'<div class="{todo_class}">{line[2:]}</div>'


datetime.now


output_dir

'context.html'
'utf-8'
f



output_dir

'context.json'
'utf-8'
json



2
output_dir
output_dir
output_dir

'Error generating visualization: '
{e}


'\n'


line
3:


datetime.now



content
content

content

content

content

content
line
2:



stats

'\n                    <div class="stat-item">\n                        <strong>'
{stat[0]}
'</strong><br>\n                        '
{stat[1]}
'\n                    </div>\n                '
line
4:



'todo-item '
{current_priority}
'-priority'
todos

'<div class="'
{todo_class}
'">'
{line[2:]}
'</div>'
datetime








e

3
datetime








2

stat[0]
stat[1]

4
current_priority

todo_class
line[2:]



stat
0

stat
1



line
2:




2