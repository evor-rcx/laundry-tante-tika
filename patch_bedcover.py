import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """  { group: 'BED COVER', items: [
    { name: 'BED COVER - CUCI LIPAT', price: 20000, unit: 'bj' },
    { name: 'BED COVER - CUCI SETRIKA', price: 25000, unit: 'bj' },
  ]},"""

replacement = """  { group: 'BED COVER', items: [
    { name: 'BED COVER - CUCI LIPAT (KECIL)', price: 15000, unit: 'bj' },
    { name: 'BED COVER - CUCI LIPAT (BESAR)', price: 20000, unit: 'bj' },
    { name: 'BED COVER - CUCI SETRIKA (KECIL)', price: 20000, unit: 'bj' },
    { name: 'BED COVER - CUCI SETRIKA (BESAR)', price: 25000, unit: 'bj' },
  ]},"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")
