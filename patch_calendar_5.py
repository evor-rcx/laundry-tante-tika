import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

pattern = r"const upcomingEventText = useMemo\(\(\) => \{.*?\}, \[\]\);"

replacement = """const upcomingEventText = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const holidays = [
      // 2024
      { name: 'Tahun Baru', date: new Date(2024, 0, 1) },
      { name: 'Isra Mikraj', date: new Date(2024, 1, 8) },
      { name: 'Tahun Baru Imlek', date: new Date(2024, 1, 10) },
      { name: 'Hari Suci Nyepi', date: new Date(2024, 2, 11) },
      { name: 'Wafat Yesus Kristus', date: new Date(2024, 2, 29) },
      { name: 'Hari Paskah', date: new Date(2024, 2, 31) },
      { name: 'Idul Fitri', date: new Date(2024, 3, 10) },
      { name: 'Idul Fitri', date: new Date(2024, 3, 11) },
      { name: 'Hari Buruh Internasional', date: new Date(2024, 4, 1) },
      { name: 'Kenaikan Yesus Kristus', date: new Date(2024, 4, 9) },
      { name: 'Hari Raya Waisak', date: new Date(2024, 4, 23) },
      { name: 'Hari Lahir Pancasila', date: new Date(2024, 5, 1) },
      { name: 'Idul Adha', date: new Date(2024, 5, 17) },
      { name: 'Tahun Baru Islam', date: new Date(2024, 6, 7) },
      { name: 'HUT Kemerdekaan RI', date: new Date(2024, 7, 17) },
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2024, 8, 16) },
      { name: 'Hari Raya Natal', date: new Date(2024, 11, 25) },
      // 2025
      { name: 'Tahun Baru', date: new Date(2025, 0, 1) },
      { name: 'Isra Mikraj', date: new Date(2025, 0, 27) },
      { name: 'Tahun Baru Imlek', date: new Date(2025, 0, 29) },
      { name: 'Hari Suci Nyepi', date: new Date(2025, 2, 29) },
      { name: 'Idul Fitri', date: new Date(2025, 2, 31) },
      { name: 'Idul Fitri', date: new Date(2025, 3, 1) },
      { name: 'Wafat Yesus Kristus', date: new Date(2025, 3, 18) },
      { name: 'Hari Paskah', date: new Date(2025, 3, 20) },
      { name: 'Hari Buruh Internasional', date: new Date(2025, 4, 1) },
      { name: 'Hari Raya Waisak', date: new Date(2025, 4, 12) },
      { name: 'Kenaikan Yesus Kristus', date: new Date(2025, 4, 29) },
      { name: 'Hari Lahir Pancasila', date: new Date(2025, 5, 1) },
      { name: 'Idul Adha', date: new Date(2025, 5, 6) },
      { name: 'Tahun Baru Islam', date: new Date(2025, 5, 27) },
      { name: 'HUT Kemerdekaan RI', date: new Date(2025, 7, 17) },
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2025, 8, 5) },
      { name: 'Hari Raya Natal', date: new Date(2025, 11, 25) },
      // 2026
      { name: 'Tahun Baru', date: new Date(2026, 0, 1) },
      { name: 'Isra Mikraj', date: new Date(2026, 0, 16) },
      { name: 'Tahun Baru Imlek', date: new Date(2026, 1, 17) },
      { name: 'Hari Suci Nyepi', date: new Date(2026, 2, 19) },
      { name: 'Idul Fitri', date: new Date(2026, 2, 21) },
      { name: 'Idul Fitri', date: new Date(2026, 2, 22) },
      { name: 'Wafat Yesus Kristus', date: new Date(2026, 3, 3) },
      { name: 'Hari Paskah', date: new Date(2026, 3, 5) },
      { name: 'Hari Buruh Internasional', date: new Date(2026, 4, 1) },
      { name: 'Kenaikan Yesus Kristus', date: new Date(2026, 4, 14) },
      { name: 'Idul Adha', date: new Date(2026, 4, 27) },
      { name: 'Hari Raya Waisak', date: new Date(2026, 4, 31) },
      { name: 'Hari Lahir Pancasila', date: new Date(2026, 5, 1) },
      { name: 'Tahun Baru Islam', date: new Date(2026, 5, 16) },
      { name: 'HUT Kemerdekaan RI', date: new Date(2026, 7, 17) },
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2026, 7, 25) },
      { name: 'Hari Raya Natal', date: new Date(2026, 11, 25) }
    ];

    let closest = null;
    let minDiff = Infinity;

    for (const event of holidays) {
      const diffTime = event.date.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < minDiff) {
        minDiff = diffDays;
        closest = { ...event, daysLeft: diffDays };
      }
    }

    if (closest) {
      if (closest.daysLeft === 0) {
        return `Selamat memperingati ${closest.name}! 🎉`;
      } else if (closest.daysLeft <= 60) {
        // Tampilkan format persis kyk di web biar sama
        return `${closest.name} (${closest.daysLeft} hari lagi)`;
      }
    }
    
    return 'Pakaian Bersih Hati Senang';
  }, []);"""

if re.search(pattern, content, flags=re.DOTALL):
    content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched full calendar format successfully")
else:
    print("Target not found")
