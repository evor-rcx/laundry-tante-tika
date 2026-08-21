import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """    let closest = null;
    let minDiff = Infinity;

    for (const event of events) {
      const diffTime = event.date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < minDiff) {
        minDiff = diffDays;
        closest = { ...event, daysLeft: diffDays };
      }
    }

    if (closest) {
      if (closest.daysLeft === 0) {
        return `Selamat memperingati ${closest.name}! 🎉`;
      } else if (closest.daysLeft <= 14) {
        return `${closest.daysLeft} Hari Menuju ${closest.name} 🗓️`;
      }
    }
    return 'Pakaian Bersih Hati Senang';"""

replacement = """    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Tambahan hari kedua Idul Fitri agar presisi
    const allEvents = [
      ...events,
      { name: 'Idul Fitri', date: new Date(2026, 2, 22) } // 22 Mar 2026 (Hari Kedua)
    ];

    const todayEvent = allEvents.find(event => event.date.getTime() === today.getTime());

    if (todayEvent) {
      return `Selamat memperingati ${todayEvent.name}! 🎉`;
    }
    return 'Pakaian Bersih Hati Senang';"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched strict calendar matching successfully")
else:
    print("Target not found")
