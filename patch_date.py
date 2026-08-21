import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """    if (closest) {
      if (closest.daysLeft === 0) {
        return `Selamat memperingati ${closest.name}! 🎉`;
      } else if (closest.daysLeft <= 45) {
        return `${closest.daysLeft} Hari Menuju ${closest.name} 🗓️`;
      }
    }
    return 'Pakaian Bersih Hati Senang';"""

replacement = """    if (closest) {
      if (closest.daysLeft === 0) {
        return `Selamat memperingati ${closest.name}! 🎉`;
      } else if (closest.daysLeft <= 14) {
        return `${closest.daysLeft} Hari Menuju ${closest.name} 🗓️`;
      }
    }
    return 'Pakaian Bersih Hati Senang';"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched date logic successfully")
else:
    print("Target not found")
