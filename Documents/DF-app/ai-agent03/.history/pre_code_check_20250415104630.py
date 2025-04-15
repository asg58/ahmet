from typing import List, Optional
import os
import re
import subprocess
import sys

'\nPre-code-check script voor het valideren van Python code tegen ontwikkelingsrichtlijnen.\nDeze validatie wordt uitgevoerd tijdens de pre-commit hook.\n'
class ValidationFailure:
    """
    Representeert een validatiefout in een bestand.
    Bevat informatie over het bestand, regelnummer en foutmelding.
    """

    def __init__(self, file: str, line: Optional[int], message: str):
        """
        Initialiseer een ValidationFailure object.
        
        Args:
            file: Pad naar het bestand
            line: Optioneel regelnummer waar de fout is gevonden
            message: Foutmelding
        """
        self.file = file
        self.line = line
        self.message = message

    def __str__(self) -> str:
        """
        String representatie van de validatiefout.
        
        Returns:
            String in format bestandsnaam:regel: bericht of bestandsnaam: bericht
        """
        if self.line:
            return f'{self.file}:{self.line}: {self.message}'
        return f'{self.file}: {self.message}'
def run_pylint(file_path: str) -> List[ValidationFailure]:
    """
    Voer pylint uit op het gegeven bestand en geef eventuele fouten terug.
    
    Args:
        file_path: Pad naar het te valideren bestand
        
    Returns:
        List van ValidationFailure objecten
    """
    failures = []
    try:
        result = subprocess.run(['pylint', '--version'], capture_output=True, text=True, check=False)
        if result.returncode != 0:
            failures.append(ValidationFailure(file_path, None, 'Pylint is niet geïnstalleerd. Installeer het via: pip install pylint'))
            return failures
        result = subprocess.run(['pylint', '--disable=C0111,C0103,C0303,R0903,W0611,C0301,C0304,W0718', '--max-line-length=100', file_path], capture_output=True, text=True, check=False)
        if result.returncode != 0:
            pattern = re.compile('([^:]+):(\\d+):(\\d+): ([A-Z]\\d+): (.+)')
            for line in result.stdout.splitlines():
                match = pattern.match(line)
                if match:
                    _, line_num, _, code, msg = match.groups()
                    failures.append(ValidationFailure(file_path, int(line_num), f'({code}) {msg}'))
    except (subprocess.SubprocessError, FileNotFoundError) as e:
        failures.append(ValidationFailure(file_path, None, f'Fout bij uitvoeren pylint: {str(e)}'))
    except OSError as e:
        failures.append(ValidationFailure(file_path, None, f'OS fout bij uitvoeren pylint: {str(e)}'))
    return failures
def check_code_style(file_path: str) -> List[ValidationFailure]:
    """
    Controleer codeerstijl volgens projectrichtlijnen.
    
    Args:
        file_path: Pad naar het te valideren bestand
        
    Returns:
        List van ValidationFailure objecten
    """
    failures = []
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    for i, line in enumerate(lines, 1):
        if len(line.rstrip('\n')) > 100:
            failures.append(ValidationFailure(file_path, i, 'Regel is langer dan 100 tekens'))
    import_lines = []
    for i, line in enumerate(lines, 1):
        if line.strip().startswith('import ') or line.strip().startswith('from '):
            import_lines.append((i, line.strip()))
    if len(lines) > 1:
        if not any((line.strip().startswith('"""') for line in lines[:10])):
            failures.append(ValidationFailure(file_path, 1, 'Geen module docstring gevonden in het begin van het bestand'))
    function_pattern = re.compile('^def\\s+(\\w+)\\s*\\(')
    class_pattern = re.compile('^class\\s+(\\w+)')
    for i, line in enumerate(lines, 1):
        func_match = function_pattern.match(line.strip())
        class_match = class_pattern.match(line.strip())
        if not (func_match or class_match):
            continue
        has_docstring = False
        name = func_match.group(1) if func_match else class_match.group(1)
        entity_type = 'functie' if func_match else 'klasse'
        for j in range(i, min(i + 5, len(lines))):
            if '"""' in lines[j]:
                has_docstring = True
                break
        if not has_docstring:
            failures.append(ValidationFailure(file_path, i, f"Geen docstring gevonden voor {entity_type} '{name}'"))
    if lines and (not lines[-1].endswith('\n')):
        failures.append(ValidationFailure(file_path, len(lines), 'Bestand moet eindigen met een newline'))
    return failures
def validate_file(file_path: str) -> List[ValidationFailure]:
    """
    Valideer een Python bestand volgens alle checks.
    
    Args:
        file_path: Pad naar het te valideren bestand
        
    Returns:
        List van ValidationFailure objecten
    """
    failures = []
    if not os.path.exists(file_path):
        failures.append(ValidationFailure(file_path, None, 'Bestand bestaat niet'))
        return failures
    failures.extend(check_code_style(file_path))
    failures.extend(run_pylint(file_path))
    return failures
def main() -> int:
    """
    Hoofdfunctie voor het script.
    
    Verwerkt command line argumenten en voert validatie uit op opgegeven bestanden.
    
    Returns:
        Exit code (0 bij succes, 1 bij validatiefout)
    """
    if len(sys.argv) < 2:
        print('Gebruik: python pre_code_check.py <bestand1.py> [bestand2.py ...]')
        return 1
    files = sys.argv[1:]
    has_failures = False
    for file_path in files:
        if not file_path.endswith('.py'):
            continue
        print(f'\nValideren van {file_path}...')
        failures = validate_file(file_path)
        if failures:
            has_failures = True
            print(f'❌ {len(failures)} validatieproblemen gevonden:')
            for failure in failures:
                print(f'  - {failure}')
        else:
            print(f'✅ {file_path} voldoet aan de coderichtlijnen.')
    return 1 if has_failures else 0
if __name__ == '__main__':
    sys.exit(main())
'\nPre-code-check script voor het valideren van Python code tegen ontwikkelingsrichtlijnen.\nDeze validatie wordt uitgevoerd tijdens de pre-commit hook.\n'
os
sys
re
subprocess
List
Optional
'\n    Representeert een validatiefout in een bestand.\n    Bevat informatie over het bestand, regelnummer en foutmelding.\n    '
def __init__(self, file: str, line: Optional[int], message: str):
    """
        Initialiseer een ValidationFailure object.
        
        Args:
            file: Pad naar het bestand
            line: Optioneel regelnummer waar de fout is gevonden
            message: Foutmelding
        """
    self.file = file
    self.line = line
    self.message = message
def __str__(self) -> str:
    """
        String representatie van de validatiefout.
        
        Returns:
            String in format bestandsnaam:regel: bericht of bestandsnaam: bericht
        """
    if self.line:
        return f'{self.file}:{self.line}: {self.message}'
    return f'{self.file}: {self.message}'
file_path: str
'\n    Voer pylint uit op het gegeven bestand en geef eventuele fouten terug.\n    \n    Args:\n        file_path: Pad naar het te valideren bestand\n        \n    Returns:\n        List van ValidationFailure objecten\n    '
failures = []
try:
    result = subprocess.run(['pylint', '--version'], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        failures.append(ValidationFailure(file_path, None, 'Pylint is niet geïnstalleerd. Installeer het via: pip install pylint'))
        return failures
    result = subprocess.run(['pylint', '--disable=C0111,C0103,C0303,R0903,W0611,C0301,C0304,W0718', '--max-line-length=100', file_path], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        pattern = re.compile('([^:]+):(\\d+):(\\d+): ([A-Z]\\d+): (.+)')
        for line in result.stdout.splitlines():
            match = pattern.match(line)
            if match:
                _, line_num, _, code, msg = match.groups()
                failures.append(ValidationFailure(file_path, int(line_num), f'({code}) {msg}'))
except (subprocess.SubprocessError, FileNotFoundError) as e:
    failures.append(ValidationFailure(file_path, None, f'Fout bij uitvoeren pylint: {str(e)}'))
except OSError as e:
    failures.append(ValidationFailure(file_path, None, f'OS fout bij uitvoeren pylint: {str(e)}'))
return failures
List[ValidationFailure]
file_path: str
'\n    Controleer codeerstijl volgens projectrichtlijnen.\n    \n    Args:\n        file_path: Pad naar het te valideren bestand\n        \n    Returns:\n        List van ValidationFailure objecten\n    '
failures = []
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
for i, line in enumerate(lines, 1):
    if len(line.rstrip('\n')) > 100:
        failures.append(ValidationFailure(file_path, i, 'Regel is langer dan 100 tekens'))
import_lines = []
for i, line in enumerate(lines, 1):
    if line.strip().startswith('import ') or line.strip().startswith('from '):
        import_lines.append((i, line.strip()))
if len(lines) > 1:
    if not any((line.strip().startswith('"""') for line in lines[:10])):
        failures.append(ValidationFailure(file_path, 1, 'Geen module docstring gevonden in het begin van het bestand'))
function_pattern = re.compile('^def\\s+(\\w+)\\s*\\(')
class_pattern = re.compile('^class\\s+(\\w+)')
for i, line in enumerate(lines, 1):
    func_match = function_pattern.match(line.strip())
    class_match = class_pattern.match(line.strip())
    if not (func_match or class_match):
        continue
    has_docstring = False
    name = func_match.group(1) if func_match else class_match.group(1)
    entity_type = 'functie' if func_match else 'klasse'
    for j in range(i, min(i + 5, len(lines))):
        if '"""' in lines[j]:
            has_docstring = True
            break
    if not has_docstring:
        failures.append(ValidationFailure(file_path, i, f"Geen docstring gevonden voor {entity_type} '{name}'"))
if lines and (not lines[-1].endswith('\n')):
    failures.append(ValidationFailure(file_path, len(lines), 'Bestand moet eindigen met een newline'))
return failures
List[ValidationFailure]
file_path: str
'\n    Valideer een Python bestand volgens alle checks.\n    \n    Args:\n        file_path: Pad naar het te valideren bestand\n        \n    Returns:\n        List van ValidationFailure objecten\n    '
failures = []
if not os.path.exists(file_path):
    failures.append(ValidationFailure(file_path, None, 'Bestand bestaat niet'))
    return failures
failures.extend(check_code_style(file_path))
failures.extend(run_pylint(file_path))
return failures
List[ValidationFailure]

'\n    Hoofdfunctie voor het script.\n    \n    Verwerkt command line argumenten en voert validatie uit op opgegeven bestanden.\n    \n    Returns:\n        Exit code (0 bij succes, 1 bij validatiefout)\n    '
if len(sys.argv) < 2:
    print('Gebruik: python pre_code_check.py <bestand1.py> [bestand2.py ...]')
    return 1
files = sys.argv[1:]
has_failures = False
for file_path in files:
    if not file_path.endswith('.py'):
        continue
    print(f'\nValideren van {file_path}...')
    failures = validate_file(file_path)
    if failures:
        has_failures = True
        print(f'❌ {len(failures)} validatieproblemen gevonden:')
        for failure in failures:
            print(f'  - {failure}')
    else:
        print(f'✅ {file_path} voldoet aan de coderichtlijnen.')
return 1 if has_failures else 0
int
__name__ == '__main__'
sys.exit(main())
'\n    Representeert een validatiefout in een bestand.\n    Bevat informatie over het bestand, regelnummer en foutmelding.\n    '
self, file: str, line: Optional[int], message: str
'\n        Initialiseer een ValidationFailure object.\n        \n        Args:\n            file: Pad naar het bestand\n            line: Optioneel regelnummer waar de fout is gevonden\n            message: Foutmelding\n        '
self.file = file
self.line = line
self.message = message
self
'\n        String representatie van de validatiefout.\n        \n        Returns:\n            String in format bestandsnaam:regel: bericht of bestandsnaam: bericht\n        '
if self.line:
    return f'{self.file}:{self.line}: {self.message}'
return f'{self.file}: {self.message}'
str
file_path: str
'\n    Voer pylint uit op het gegeven bestand en geef eventuele fouten terug.\n    \n    Args:\n        file_path: Pad naar het te valideren bestand\n        \n    Returns:\n        List van ValidationFailure objecten\n    '
failures
[]
result = subprocess.run(['pylint', '--version'], capture_output=True, text=True, check=False)
if result.returncode != 0:
    failures.append(ValidationFailure(file_path, None, 'Pylint is niet geïnstalleerd. Installeer het via: pip install pylint'))
    return failures
result = subprocess.run(['pylint', '--disable=C0111,C0103,C0303,R0903,W0611,C0301,C0304,W0718', '--max-line-length=100', file_path], capture_output=True, text=True, check=False)
if result.returncode != 0:
    pattern = re.compile('([^:]+):(\\d+):(\\d+): ([A-Z]\\d+): (.+)')
    for line in result.stdout.splitlines():
        match = pattern.match(line)
        if match:
            _, line_num, _, code, msg = match.groups()
            failures.append(ValidationFailure(file_path, int(line_num), f'({code}) {msg}'))
except (subprocess.SubprocessError, FileNotFoundError) as e:
    failures.append(ValidationFailure(file_path, None, f'Fout bij uitvoeren pylint: {str(e)}'))
except OSError as e:
    failures.append(ValidationFailure(file_path, None, f'OS fout bij uitvoeren pylint: {str(e)}'))
failures
List
ValidationFailure

file_path: str
'\n    Controleer codeerstijl volgens projectrichtlijnen.\n    \n    Args:\n        file_path: Pad naar het te valideren bestand\n        \n    Returns:\n        List van ValidationFailure objecten\n    '
failures
[]
open(file_path, 'r', encoding='utf-8') as f
lines = f.readlines()
(i, line)
enumerate(lines, 1)
if len(line.rstrip('\n')) > 100:
    failures.append(ValidationFailure(file_path, i, 'Regel is langer dan 100 tekens'))
import_lines
[]
(i, line)
enumerate(lines, 1)
if line.strip().startswith('import ') or line.strip().startswith('from '):
    import_lines.append((i, line.strip()))
len(lines) > 1
if not any((line.strip().startswith('"""') for line in lines[:10])):
    failures.append(ValidationFailure(file_path, 1, 'Geen module docstring gevonden in het begin van het bestand'))
function_pattern
re.compile('^def\\s+(\\w+)\\s*\\(')
class_pattern
re.compile('^class\\s+(\\w+)')
(i, line)
enumerate(lines, 1)
func_match = function_pattern.match(line.strip())
class_match = class_pattern.match(line.strip())
if not (func_match or class_match):
    continue
has_docstring = False
name = func_match.group(1) if func_match else class_match.group(1)
entity_type = 'functie' if func_match else 'klasse'
for j in range(i, min(i + 5, len(lines))):
    if '"""' in lines[j]:
        has_docstring = True
        break
if not has_docstring:
    failures.append(ValidationFailure(file_path, i, f"Geen docstring gevonden voor {entity_type} '{name}'"))
lines and (not lines[-1].endswith('\n'))
failures.append(ValidationFailure(file_path, len(lines), 'Bestand moet eindigen met een newline'))
failures
List
ValidationFailure

file_path: str
'\n    Valideer een Python bestand volgens alle checks.\n    \n    Args:\n        file_path: Pad naar het te valideren bestand\n        \n    Returns:\n        List van ValidationFailure objecten\n    '
failures
[]
not os.path.exists(file_path)
failures.append(ValidationFailure(file_path, None, 'Bestand bestaat niet'))
return failures
failures.extend(check_code_style(file_path))
failures.extend(run_pylint(file_path))
failures
List
ValidationFailure

'\n    Hoofdfunctie voor het script.\n    \n    Verwerkt command line argumenten en voert validatie uit op opgegeven bestanden.\n    \n    Returns:\n        Exit code (0 bij succes, 1 bij validatiefout)\n    '
len(sys.argv) < 2
print('Gebruik: python pre_code_check.py <bestand1.py> [bestand2.py ...]')
return 1
files
sys.argv[1:]
has_failures
False
file_path
files
if not file_path.endswith('.py'):
    continue
print(f'\nValideren van {file_path}...')
failures = validate_file(file_path)
if failures:
    has_failures = True
    print(f'❌ {len(failures)} validatieproblemen gevonden:')
    for failure in failures:
        print(f'  - {failure}')
else:
    print(f'✅ {file_path} voldoet aan de coderichtlijnen.')
1 if has_failures else 0

__name__

'__main__'
sys.exit(main())
self
file: str
line: Optional[int]
message: str
'\n        Initialiseer een ValidationFailure object.\n        \n        Args:\n            file: Pad naar het bestand\n            line: Optioneel regelnummer waar de fout is gevonden\n            message: Foutmelding\n        '
self.file
file
self.line
line
self.message
message
self
'\n        String representatie van de validatiefout.\n        \n        Returns:\n            String in format bestandsnaam:regel: bericht of bestandsnaam: bericht\n        '
self.line
return f'{self.file}:{self.line}: {self.message}'
f'{self.file}: {self.message}'

str


result
subprocess.run(['pylint', '--version'], capture_output=True, text=True, check=False)
result.returncode != 0
failures.append(ValidationFailure(file_path, None, 'Pylint is niet geïnstalleerd. Installeer het via: pip install pylint'))
return failures
result
subprocess.run(['pylint', '--disable=C0111,C0103,C0303,R0903,W0611,C0301,C0304,W0718', '--max-line-length=100', file_path], capture_output=True, text=True, check=False)
result.returncode != 0
pattern = re.compile('([^:]+):(\\d+):(\\d+): ([A-Z]\\d+): (.+)')
for line in result.stdout.splitlines():
    match = pattern.match(line)
    if match:
        _, line_num, _, code, msg = match.groups()
        failures.append(ValidationFailure(file_path, int(line_num), f'({code}) {msg}'))
(subprocess.SubprocessError, FileNotFoundError)
failures.append(ValidationFailure(file_path, None, f'Fout bij uitvoeren pylint: {str(e)}'))
OSError
failures.append(ValidationFailure(file_path, None, f'OS fout bij uitvoeren pylint: {str(e)}'))



str


open(file_path, 'r', encoding='utf-8')
f
lines
f.readlines()
i
line

enumerate
lines
1
len(line.rstrip('\n')) > 100
failures.append(ValidationFailure(file_path, i, 'Regel is langer dan 100 tekens'))


i
line

enumerate
lines
1
line.strip().startswith('import ') or line.strip().startswith('from ')
import_lines.append((i, line.strip()))
len(lines)

1
not any((line.strip().startswith('"""') for line in lines[:10]))
failures.append(ValidationFailure(file_path, 1, 'Geen module docstring gevonden in het begin van het bestand'))

re.compile
'^def\\s+(\\w+)\\s*\\('

re.compile
'^class\\s+(\\w+)'
i
line

enumerate
lines
1
func_match
function_pattern.match(line.strip())
class_match
class_pattern.match(line.strip())
not (func_match or class_match)
continue
has_docstring
False
name
func_match.group(1) if func_match else class_match.group(1)
entity_type
'functie' if func_match else 'klasse'
j
range(i, min(i + 5, len(lines)))
if '"""' in lines[j]:
    has_docstring = True
    break
not has_docstring
failures.append(ValidationFailure(file_path, i, f"Geen docstring gevonden voor {entity_type} '{name}'"))

lines
not lines[-1].endswith('\n')
failures.append(ValidationFailure(file_path, len(lines), 'Bestand moet eindigen met een newline'))



str



os.path.exists(file_path)
failures.append(ValidationFailure(file_path, None, 'Bestand bestaat niet'))
failures
failures.extend
check_code_style(file_path)
failures.extend
run_pylint(file_path)



len(sys.argv)

2
print('Gebruik: python pre_code_check.py <bestand1.py> [bestand2.py ...]')
1

sys.argv
1:




not file_path.endswith('.py')
continue
print(f'\nValideren van {file_path}...')
failures
validate_file(file_path)
failures
has_failures = True
print(f'❌ {len(failures)} validatieproblemen gevonden:')
for failure in failures:
    print(f'  - {failure}')
print(f'✅ {file_path} voldoet aan de coderichtlijnen.')
has_failures
1
0

sys.exit
main()
str
Optional[int]
str
self


self


self


self

f'{self.file}:{self.line}: {self.message}'
{self.file}
': '
{self.message}


subprocess.run
['pylint', '--version']
capture_output=True
text=True
check=False
result.returncode

0
failures.append(ValidationFailure(file_path, None, 'Pylint is niet geïnstalleerd. Installeer het via: pip install pylint'))
failures

subprocess.run
['pylint', '--disable=C0111,C0103,C0303,R0903,W0611,C0301,C0304,W0718', '--max-line-length=100', file_path]
capture_output=True
text=True
check=False
result.returncode

0
pattern
re.compile('([^:]+):(\\d+):(\\d+): ([A-Z]\\d+): (.+)')
line
result.stdout.splitlines()
match = pattern.match(line)
if match:
    _, line_num, _, code, msg = match.groups()
    failures.append(ValidationFailure(file_path, int(line_num), f'({code}) {msg}'))
subprocess.SubprocessError
FileNotFoundError

failures.append(ValidationFailure(file_path, None, f'Fout bij uitvoeren pylint: {str(e)}'))

failures.append(ValidationFailure(file_path, None, f'OS fout bij uitvoeren pylint: {str(e)}'))

open
file_path
'r'
encoding='utf-8'


f.readlines




len(line.rstrip('\n'))

100
failures.append(ValidationFailure(file_path, i, 'Regel is langer dan 100 tekens'))





line.strip().startswith('import ')
line.strip().startswith('from ')
import_lines.append((i, line.strip()))
len
lines

any((line.strip().startswith('"""') for line in lines[:10]))
failures.append(ValidationFailure(file_path, 1, 'Geen module docstring gevonden in het begin van het bestand'))
re

re






function_pattern.match
line.strip()

class_pattern.match
line.strip()

func_match or class_match


func_match
func_match.group(1)
class_match.group(1)

func_match
'functie'
'klasse'

range
i
min(i + 5, len(lines))
'"""' in lines[j]
has_docstring = True
break

has_docstring
failures.append(ValidationFailure(file_path, i, f"Geen docstring gevonden voor {entity_type} '{name}'"))


lines[-1].endswith('\n')
failures.append
ValidationFailure(file_path, len(lines), 'Bestand moet eindigen met een newline')

os.path.exists
file_path
failures.append
ValidationFailure(file_path, None, 'Bestand bestaat niet')

failures

check_code_style
file_path
failures

run_pylint
file_path
len
sys.argv
print
'Gebruik: python pre_code_check.py <bestand1.py> [bestand2.py ...]'
sys

1

file_path.endswith('.py')
print
f'\nValideren van {file_path}...'

validate_file
file_path

has_failures
True
print(f'❌ {len(failures)} validatieproblemen gevonden:')
failure
failures
print(f'  - {failure}')
print(f'✅ {file_path} voldoet aan de coderichtlijnen.')

sys

main

Optional
int






{self.file}
':'
{self.line}
': '
{self.message}
self.file
self.message
subprocess

'pylint'
'--version'

True
True
False
result

failures.append
ValidationFailure(file_path, None, 'Pylint is niet geïnstalleerd. Installeer het via: pip install pylint')

subprocess

'pylint'
'--disable=C0111,C0103,C0303,R0903,W0611,C0301,C0304,W0718'
'--max-line-length=100'
file_path

True
True
False
result


re.compile
'([^:]+):(\\d+):(\\d+): ([A-Z]\\d+): (.+)'

result.stdout.splitlines
match
pattern.match(line)
match
_, line_num, _, code, msg = match.groups()
failures.append(ValidationFailure(file_path, int(line_num), f'({code}) {msg}'))
subprocess


failures.append
ValidationFailure(file_path, None, f'Fout bij uitvoeren pylint: {str(e)}')
failures.append
ValidationFailure(file_path, None, f'OS fout bij uitvoeren pylint: {str(e)}')


'utf-8'
f

len
line.rstrip('\n')
failures.append
ValidationFailure(file_path, i, 'Regel is langer dan 100 tekens')
line.strip().startswith
'import '
line.strip().startswith
'from '
import_lines.append
(i, line.strip())


any
(line.strip().startswith('"""') for line in lines[:10])
failures.append
ValidationFailure(file_path, 1, 'Geen module docstring gevonden in het begin van het bestand')


function_pattern

line.strip
class_pattern

line.strip

func_match
class_match

func_match.group
1
class_match.group
1



min
i + 5
len(lines)
'"""'

lines[j]
has_docstring
True

failures.append
ValidationFailure(file_path, i, f"Geen docstring gevonden voor {entity_type} '{name}'")
lines[-1].endswith
'\n'
failures

ValidationFailure
file_path
len(lines)
'Bestand moet eindigen met een newline'
os.path


failures

ValidationFailure
file_path
None
'Bestand bestaat niet'







sys



file_path.endswith
'.py'

'\nValideren van '
{file_path}
'...'



print
f'❌ {len(failures)} validatieproblemen gevonden:'


print(f'  - {failure}')
print
f'✅ {file_path} voldoet aan de coderichtlijnen.'




self.file
self.line
self.message
self

self



failures

ValidationFailure
file_path
None
'Pylint is niet geïnstalleerd. Installeer het via: pip install pylint'



re

result.stdout


pattern.match
line

(_, line_num, _, code, msg)
match.groups()
failures.append(ValidationFailure(file_path, int(line_num), f'({code}) {msg}'))

failures

ValidationFailure
file_path
None
f'Fout bij uitvoeren pylint: {str(e)}'
failures

ValidationFailure
file_path
None
f'OS fout bij uitvoeren pylint: {str(e)}'


line.rstrip
'\n'
failures

ValidationFailure
file_path
i
'Regel is langer dan 100 tekens'
line.strip()

line.strip()

import_lines

i
line.strip()


line.strip().startswith('"""')
 for line in lines[:10]
failures

ValidationFailure
file_path
1
'Geen module docstring gevonden in het begin van het bestand'

line


line



func_match

class_match


i

5
len
lines
lines
j


failures

ValidationFailure
file_path
i
f"Geen docstring gevonden voor {entity_type} '{name}'"
lines[-1]




len
lines
os





file_path

file_path

'❌ '
{len(failures)}
' validatieproblemen gevonden:'
print
f'  - {failure}'

'✅ '
{file_path}
' voldoet aan de coderichtlijnen.'
self

self

self







result

pattern


_
line_num
_
code
msg

match.groups
failures.append
ValidationFailure(file_path, int(line_num), f'({code}) {msg}')



'Fout bij uitvoeren pylint: '
{str(e)}



'OS fout bij uitvoeren pylint: '
{str(e)}
line





line.strip
line.strip


line.strip
line.strip().startswith
'"""'
line
lines[:10]
















'Geen docstring gevonden voor '
{entity_type}
" '"
{name}
"'"
lines
-1






len(failures)

'  - '
{failure}
file_path










match

failures

ValidationFailure
file_path
int(line_num)
f'({code}) {msg}'
str(e)
str(e)

line

line

line

line.strip()


lines
:10

entity_type
name


1
len
failures
failure





int
line_num
'('
{code}
') '
{msg}
str
e
str
e



line.strip

10







code
msg




line



