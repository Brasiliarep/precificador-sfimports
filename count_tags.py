
import re

content = open(r'c:\app precificador\precificador-sfimports\components\ResultsTable.tsx', 'r', encoding='utf-8').read()

opens = len(re.findall(r'<div(?!\s*/>)', content))
closes = len(re.findall(r'</div\s*>', content))

print(f"Divs: {opens} opens, {closes} closes")

div_stack = 0
for i, line in enumerate(content.split('\n')):
    for m in re.finditer(r'<div(?!\s*/>)', line):
        div_stack += 1
    for m in re.finditer(r'</div\s*>', line):
        div_stack -= 1
        if div_stack < 0:
            print(f"Extra close at line {i+1}")
            div_stack = 0

print(f"Final stack depth: {div_stack}")
