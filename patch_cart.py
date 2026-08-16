import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """    setCart(prev => {
      const existingIdx = prev.findIndex(item => item.name === serviceDef.name && item.price === serviceDef.price);
      if (existingIdx >= 0) {
        const newCart = [...prev];
        const existing = newCart[existingIdx];
        const newQty = existing.qty + qty;
        newCart[existingIdx] = {
          ...existing,
          qty: newQty,
          subtotal: existing.price * newQty
        };
        return newCart;
      }
      return [...prev, newItem];
    });"""

replacement = """    setCart(prev => [...prev, newItem]);"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")
