import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """const SERVICES_CATALOG = [
  { group: 'KILOAN', items: [
    { name: 'SETRIKA', price: 5000, unit: 'kg' },
    { name: 'CUCI + SETRIKA', price: 7000, unit: 'kg' },
    { name: 'CUCI + LIPAT', price: 5000, unit: 'kg' },
  ]},
  { group: 'SEPRAI/SELIMUT/GORDEN', items: [
    { name: 'CUCI+LIPAT (KECIL)', price: 8000, unit: 'bj' },
    { name: 'SETRIKA (KECIL)', price: 8000, unit: 'bj' },
    { name: 'CUCI+SETRIKA (KECIL)', price: 10000, unit: 'bj' },
    { name: 'CUCI+LIPAT (BESAR)', price: 10000, unit: 'bj' },
    { name: 'SETRIKA (BESAR)', price: 10000, unit: 'bj' },
    { name: 'CUCI+SETRIKA (BESAR)', price: 12000, unit: 'bj' },
  ]},
  { group: 'BED COVER', items: [
    { name: 'BC CUCI LIPAT', price: 20000, unit: 'bj' },
    { name: 'BC CUCI SETRIKA', price: 25000, unit: 'bj' },
  ]},
  { group: 'LAINNYA', items: [
    { name: 'SEPATU', price: 15000, unit: 'psg' },
    { name: 'HELM', price: 20000, unit: 'pcs' },
  ]},
];"""

replacement = """const SERVICES_CATALOG = [
  { group: 'KILOAN', items: [
    { name: 'SETRIKA (KILOAN)', price: 5000, unit: 'kg' },
    { name: 'CUCI + SETRIKA (KILOAN)', price: 7000, unit: 'kg' },
    { name: 'CUCI + LIPAT (KILOAN)', price: 5000, unit: 'kg' },
  ]},
  { group: 'SEPRAI/SELIMUT/GORDEN', items: [
    { name: 'SEPRAI/SELIMUT/GORDEN - CUCI+LIPAT (KECIL)', price: 8000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - SETRIKA (KECIL)', price: 8000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - CUCI+SETRIKA (KECIL)', price: 10000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - CUCI+LIPAT (BESAR)', price: 10000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - SETRIKA (BESAR)', price: 10000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - CUCI+SETRIKA (BESAR)', price: 12000, unit: 'bj' },
  ]},
  { group: 'BED COVER', items: [
    { name: 'BED COVER - CUCI LIPAT', price: 20000, unit: 'bj' },
    { name: 'BED COVER - CUCI SETRIKA', price: 25000, unit: 'bj' },
  ]},
  { group: 'LAINNYA', items: [
    { name: 'SEPATU', price: 15000, unit: 'psg' },
    { name: 'HELM', price: 20000, unit: 'pcs' },
  ]},
];"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")
