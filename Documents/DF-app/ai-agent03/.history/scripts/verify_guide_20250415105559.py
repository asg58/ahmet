import os
import re
import sys
from context_helper import ContextHelper

'\nVerificatie script voor de Developer Guide.\nControleert of de formatting consistent is en de guide parseerbaar is \ndoor de ContextHelper.\n'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
def verify_heading_structure(content):
    """Controleer of de koppen correct gestructureerd zijn"""
    heading_pattern = '^(#{1,6})\\s+(.+?)$'
    headings = re.findall(heading_pattern, content, re.MULTILINE)
    h1_count = sum((1 for h, _ in headings if h == '#'))
    if h1_count < 1:
        print(f'FOUT: Er moet minstens één H1 (#) kop zijn, gevonden: {h1_count}')
        return False
    elif h1_count > 1:
        print(f'WAARSCHUWING: Meerdere H1 koppen gevonden: {h1_count}')
    current_level = 0
    for h, title in headings:
        level = len(h)
        if level > current_level + 2 and current_level > 0:
            print(f"FOUT: Kop '{title}' springt van niveau {current_level} naar {level}")
            return False
        current_level = level
    return True
def verify_section_parseability(helper):
    """Controleer of belangrijke secties vindbaar zijn via regex"""
    crucial_components = ['WebSocket Server', 'Web Interface', 'Database Integratie']
    missing_components = []
    for component in crucial_components:
        info = helper.get_component_info(component)
        if not info:
            missing_components.append(component)
    if missing_components:
        print(f"WAARSCHUWING: Kan component informatie niet vinden voor: {', '.join(missing_components)}")
        print('Dit is acceptabel als het om een oudere guide-versie gaat.')
    crucial_workflows = ['Server Starten', 'Modellen Indexeren', 'Checkpoint']
    missing_workflows = []
    for workflow in crucial_workflows:
        info = helper.get_workflow(workflow)
        if not info:
            missing_workflows.append(workflow)
    if missing_workflows:
        print(f"WAARSCHUWING: Kan workflow informatie niet vinden voor: {', '.join(missing_workflows)}")
        print('Dit is acceptabel als het om een oudere guide-versie gaat.')
    if len(missing_components) == len(crucial_components) and len(missing_workflows) == len(crucial_workflows):
        print('FOUT: Kan geen enkele component of workflow vinden. Controleer regex patterns.')
        return False
    return True
def verify_code_blocks(content):
    """Controleer of codeblokken correct geformatteerd zijn"""
    open_count = content.count('```')
    if open_count % 2 != 0:
        print(f'FOUT: Ongebalanceerde codeblokken, aantal backticks: {open_count}')
        return False
    code_blocks = re.findall('```(.+?)\\n', content)
    if len(code_blocks) < open_count / 2 / 2:
        print('WAARSCHUWING: Veel codeblokken missen een taal specificatie')
    return True
def main():
    """main function."""
    guide_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'DEVELOPER_GUIDE.md')
    if not os.path.exists(guide_path):
        print(f'FOUT: Developer Guide niet gevonden op: {guide_path}')
        return 1
    with open(guide_path, 'r', encoding='utf-8') as f:
        content = f.read()
    print(f'Developer Guide gevonden: {guide_path}')
    print(f'Bestandsgrootte: {len(content)} bytes')
    helper = ContextHelper(guide_path)
    heading_ok = verify_heading_structure(content)
    parseability_ok = verify_section_parseability(helper)
    code_blocks_ok = verify_code_blocks(content)
    print('\n=== Verificatie Resultaten ===')
    print(f"Koppenstructuur: {('OK' if heading_ok else 'FOUT')}")
    print(f"Parseerbaarheid: {('OK' if parseability_ok else 'FOUT')}")
    print(f"Codeblokken: {('OK' if code_blocks_ok else 'FOUT')}")
    if heading_ok and parseability_ok and code_blocks_ok:
        print('\nDeveloper Guide is correct geformatteerd en parseerbaar!')
        return 0
    else:
        print('\nDeveloper Guide heeft problemen die aandacht vereisen.')
        return 1
if __name__ == '__main__':
    sys.exit(main())
'\nVerificatie script voor de Developer Guide.\nControleert of de formatting consistent is en de guide parseerbaar is \ndoor de ContextHelper.\n'
os
re
sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
ContextHelper
content
'Controleer of de koppen correct gestructureerd zijn'
heading_pattern = '^(#{1,6})\\s+(.+?)$'
headings = re.findall(heading_pattern, content, re.MULTILINE)
h1_count = sum((1 for h, _ in headings if h == '#'))
if h1_count < 1:
    print(f'FOUT: Er moet minstens één H1 (#) kop zijn, gevonden: {h1_count}')
    return False
elif h1_count > 1:
    print(f'WAARSCHUWING: Meerdere H1 koppen gevonden: {h1_count}')
current_level = 0
for h, title in headings:
    level = len(h)
    if level > current_level + 2 and current_level > 0:
        print(f"FOUT: Kop '{title}' springt van niveau {current_level} naar {level}")
        return False
    current_level = level
return True
helper
'Controleer of belangrijke secties vindbaar zijn via regex'
crucial_components = ['WebSocket Server', 'Web Interface', 'Database Integratie']
missing_components = []
for component in crucial_components:
    info = helper.get_component_info(component)
    if not info:
        missing_components.append(component)
if missing_components:
    print(f"WAARSCHUWING: Kan component informatie niet vinden voor: {', '.join(missing_components)}")
    print('Dit is acceptabel als het om een oudere guide-versie gaat.')
crucial_workflows = ['Server Starten', 'Modellen Indexeren', 'Checkpoint']
missing_workflows = []
for workflow in crucial_workflows:
    info = helper.get_workflow(workflow)
    if not info:
        missing_workflows.append(workflow)
if missing_workflows:
    print(f"WAARSCHUWING: Kan workflow informatie niet vinden voor: {', '.join(missing_workflows)}")
    print('Dit is acceptabel als het om een oudere guide-versie gaat.')
if len(missing_components) == len(crucial_components) and len(missing_workflows) == len(crucial_workflows):
    print('FOUT: Kan geen enkele component of workflow vinden. Controleer regex patterns.')
    return False
return True
content
'Controleer of codeblokken correct geformatteerd zijn'
open_count = content.count('```')
if open_count % 2 != 0:
    print(f'FOUT: Ongebalanceerde codeblokken, aantal backticks: {open_count}')
    return False
code_blocks = re.findall('```(.+?)\\n', content)
if len(code_blocks) < open_count / 2 / 2:
    print('WAARSCHUWING: Veel codeblokken missen een taal specificatie')
return True

'main function.'
guide_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'DEVELOPER_GUIDE.md')
if not os.path.exists(guide_path):
    print(f'FOUT: Developer Guide niet gevonden op: {guide_path}')
    return 1
with open(guide_path, 'r', encoding='utf-8') as f:
    content = f.read()
print(f'Developer Guide gevonden: {guide_path}')
print(f'Bestandsgrootte: {len(content)} bytes')
helper = ContextHelper(guide_path)
heading_ok = verify_heading_structure(content)
parseability_ok = verify_section_parseability(helper)
code_blocks_ok = verify_code_blocks(content)
print('\n=== Verificatie Resultaten ===')
print(f"Koppenstructuur: {('OK' if heading_ok else 'FOUT')}")
print(f"Parseerbaarheid: {('OK' if parseability_ok else 'FOUT')}")
print(f"Codeblokken: {('OK' if code_blocks_ok else 'FOUT')}")
if heading_ok and parseability_ok and code_blocks_ok:
    print('\nDeveloper Guide is correct geformatteerd en parseerbaar!')
    return 0
else:
    print('\nDeveloper Guide heeft problemen die aandacht vereisen.')
    return 1
__name__ == '__main__'
sys.exit(main())
sys.path.insert
0
os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
content
'Controleer of de koppen correct gestructureerd zijn'
heading_pattern
'^(#{1,6})\\s+(.+?)$'
headings
re.findall(heading_pattern, content, re.MULTILINE)
h1_count
sum((1 for h, _ in headings if h == '#'))
h1_count < 1
print(f'FOUT: Er moet minstens één H1 (#) kop zijn, gevonden: {h1_count}')
return False
if h1_count > 1:
    print(f'WAARSCHUWING: Meerdere H1 koppen gevonden: {h1_count}')
current_level
0
(h, title)
headings
level = len(h)
if level > current_level + 2 and current_level > 0:
    print(f"FOUT: Kop '{title}' springt van niveau {current_level} naar {level}")
    return False
current_level = level
True
helper
'Controleer of belangrijke secties vindbaar zijn via regex'
crucial_components
['WebSocket Server', 'Web Interface', 'Database Integratie']
missing_components
[]
component
crucial_components
info = helper.get_component_info(component)
if not info:
    missing_components.append(component)
missing_components
print(f"WAARSCHUWING: Kan component informatie niet vinden voor: {', '.join(missing_components)}")
print('Dit is acceptabel als het om een oudere guide-versie gaat.')
crucial_workflows
['Server Starten', 'Modellen Indexeren', 'Checkpoint']
missing_workflows
[]
workflow
crucial_workflows
info = helper.get_workflow(workflow)
if not info:
    missing_workflows.append(workflow)
missing_workflows
print(f"WAARSCHUWING: Kan workflow informatie niet vinden voor: {', '.join(missing_workflows)}")
print('Dit is acceptabel als het om een oudere guide-versie gaat.')
len(missing_components) == len(crucial_components) and len(missing_workflows) == len(crucial_workflows)
print('FOUT: Kan geen enkele component of workflow vinden. Controleer regex patterns.')
return False
True
content
'Controleer of codeblokken correct geformatteerd zijn'
open_count
content.count('```')
open_count % 2 != 0
print(f'FOUT: Ongebalanceerde codeblokken, aantal backticks: {open_count}')
return False
code_blocks
re.findall('```(.+?)\\n', content)
len(code_blocks) < open_count / 2 / 2
print('WAARSCHUWING: Veel codeblokken missen een taal specificatie')
True
'main function.'
guide_path
os.path.join(os.path.dirname(os.path.dirname(__file__)), 'DEVELOPER_GUIDE.md')
not os.path.exists(guide_path)
print(f'FOUT: Developer Guide niet gevonden op: {guide_path}')
return 1
open(guide_path, 'r', encoding='utf-8') as f
content = f.read()
print(f'Developer Guide gevonden: {guide_path}')
print(f'Bestandsgrootte: {len(content)} bytes')
helper
ContextHelper(guide_path)
heading_ok
verify_heading_structure(content)
parseability_ok
verify_section_parseability(helper)
code_blocks_ok
verify_code_blocks(content)
print('\n=== Verificatie Resultaten ===')
print(f"Koppenstructuur: {('OK' if heading_ok else 'FOUT')}")
print(f"Parseerbaarheid: {('OK' if parseability_ok else 'FOUT')}")
print(f"Codeblokken: {('OK' if code_blocks_ok else 'FOUT')}")
heading_ok and parseability_ok and code_blocks_ok
print('\nDeveloper Guide is correct geformatteerd en parseerbaar!')
return 0
print('\nDeveloper Guide heeft problemen die aandacht vereisen.')
return 1
__name__

'__main__'
sys.exit(main())
sys.path

os.path.abspath
os.path.join(os.path.dirname(__file__), '..')


re.findall
heading_pattern
content
re.MULTILINE

sum
(1 for h, _ in headings if h == '#')
h1_count

1
print(f'FOUT: Er moet minstens één H1 (#) kop zijn, gevonden: {h1_count}')
False
h1_count > 1
print(f'WAARSCHUWING: Meerdere H1 koppen gevonden: {h1_count}')

h
title


level
len(h)
level > current_level + 2 and current_level > 0
print(f"FOUT: Kop '{title}' springt van niveau {current_level} naar {level}")
return False
current_level
level

'WebSocket Server'
'Web Interface'
'Database Integratie'





info
helper.get_component_info(component)
not info
missing_components.append(component)

print(f"WAARSCHUWING: Kan component informatie niet vinden voor: {', '.join(missing_components)}")
print('Dit is acceptabel als het om een oudere guide-versie gaat.')

'Server Starten'
'Modellen Indexeren'
'Checkpoint'





info
helper.get_workflow(workflow)
not info
missing_workflows.append(workflow)

print(f"WAARSCHUWING: Kan workflow informatie niet vinden voor: {', '.join(missing_workflows)}")
print('Dit is acceptabel als het om een oudere guide-versie gaat.')

len(missing_components) == len(crucial_components)
len(missing_workflows) == len(crucial_workflows)
print('FOUT: Kan geen enkele component of workflow vinden. Controleer regex patterns.')
False

content.count
'```'
open_count % 2

0
print(f'FOUT: Ongebalanceerde codeblokken, aantal backticks: {open_count}')
False

re.findall
'```(.+?)\\n'
content
len(code_blocks)

open_count / 2 / 2
print('WAARSCHUWING: Veel codeblokken missen een taal specificatie')

os.path.join
os.path.dirname(os.path.dirname(__file__))
'DEVELOPER_GUIDE.md'

os.path.exists(guide_path)
print(f'FOUT: Developer Guide niet gevonden op: {guide_path}')
1
open(guide_path, 'r', encoding='utf-8')
f
content
f.read()
print
f'Developer Guide gevonden: {guide_path}'
print
f'Bestandsgrootte: {len(content)} bytes'

ContextHelper
guide_path

verify_heading_structure
content

verify_section_parseability
helper

verify_code_blocks
content
print
'\n=== Verificatie Resultaten ==='
print
f"Koppenstructuur: {('OK' if heading_ok else 'FOUT')}"
print
f"Parseerbaarheid: {('OK' if parseability_ok else 'FOUT')}"
print
f"Codeblokken: {('OK' if code_blocks_ok else 'FOUT')}"

heading_ok
parseability_ok
code_blocks_ok
print('\nDeveloper Guide is correct geformatteerd en parseerbaar!')
0
print('\nDeveloper Guide heeft problemen die aandacht vereisen.')
1

sys.exit
main()
sys

os.path

os.path.join
os.path.dirname(__file__)
'..'
re



re


1
 for h, _ in headings if h == '#'

print
f'FOUT: Er moet minstens één H1 (#) kop zijn, gevonden: {h1_count}'
h1_count

1
print(f'WAARSCHUWING: Meerdere H1 koppen gevonden: {h1_count}')



len
h

level > current_level + 2
current_level > 0
print(f"FOUT: Kop '{title}' springt van niveau {current_level} naar {level}")
False



helper.get_component_info
component

info
missing_components.append(component)
print
f"WAARSCHUWING: Kan component informatie niet vinden voor: {', '.join(missing_components)}"
print
'Dit is acceptabel als het om een oudere guide-versie gaat.'

helper.get_workflow
workflow

info
missing_workflows.append(workflow)
print
f"WAARSCHUWING: Kan workflow informatie niet vinden voor: {', '.join(missing_workflows)}"
print
'Dit is acceptabel als het om een oudere guide-versie gaat.'
len(missing_components)

len(crucial_components)
len(missing_workflows)

len(crucial_workflows)
print
'FOUT: Kan geen enkele component of workflow vinden. Controleer regex patterns.'
content

open_count

2
print
f'FOUT: Ongebalanceerde codeblokken, aantal backticks: {open_count}'
re


len
code_blocks
open_count / 2

2
print
'WAARSCHUWING: Veel codeblokken missen een taal specificatie'
os.path

os.path.dirname
os.path.dirname(__file__)
os.path.exists
guide_path
print
f'FOUT: Developer Guide niet gevonden op: {guide_path}'
open
guide_path
'r'
encoding='utf-8'


f.read

'Developer Guide gevonden: '
{guide_path}

'Bestandsgrootte: '
{len(content)}
' bytes'










'Koppenstructuur: '
{('OK' if heading_ok else 'FOUT')}

'Parseerbaarheid: '
{('OK' if parseability_ok else 'FOUT')}

'Codeblokken: '
{('OK' if code_blocks_ok else 'FOUT')}



print
'\nDeveloper Guide is correct geformatteerd en parseerbaar!'
print
'\nDeveloper Guide heeft problemen die aandacht vereisen.'
sys

main

os

os.path

os.path.dirname
__file__


(h, _)
headings
h == '#'

'FOUT: Er moet minstens één H1 (#) kop zijn, gevonden: '
{h1_count}

print
f'WAARSCHUWING: Meerdere H1 koppen gevonden: {h1_count}'


level

current_level + 2
current_level

0
print
f"FOUT: Kop '{title}' springt van niveau {current_level} naar {level}"
helper



missing_components.append
component

'WAARSCHUWING: Kan component informatie niet vinden voor: '
{', '.join(missing_components)}

helper



missing_workflows.append
workflow

'WAARSCHUWING: Kan workflow informatie niet vinden voor: '
{', '.join(missing_workflows)}

len
missing_components
len
crucial_components
len
missing_workflows
len
crucial_workflows




'FOUT: Ongebalanceerde codeblokken, aantal backticks: '
{open_count}



open_count

2

os

os.path

os.path.dirname
__file__
os.path



'FOUT: Developer Guide niet gevonden op: '
{guide_path}


'utf-8'
f

guide_path
len(content)
'OK' if heading_ok else 'FOUT'
'OK' if parseability_ok else 'FOUT'
'OK' if code_blocks_ok else 'FOUT'





os

os.path


h
_


h

'#'
h1_count

'WAARSCHUWING: Meerdere H1 koppen gevonden: '
{h1_count}

current_level

2


"FOUT: Kop '"
{title}
"' springt van niveau "
{current_level}
' naar '
{level}

missing_components


', '.join(missing_components)

missing_workflows


', '.join(missing_workflows)








open_count


os

os.path


os

guide_path


len
content
heading_ok
'OK'
'FOUT'
parseability_ok
'OK'
'FOUT'
code_blocks_ok
'OK'
'FOUT'

os





h1_count

title
current_level
level

', '.join
missing_components

', '.join
missing_workflows


os













', '


', '


