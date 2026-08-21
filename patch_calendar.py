import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """    const events = [
      { name: 'HUT RI', date: new Date(currentYear, 7, 17) }, // 17 Aug
      { name: 'Natal', date: new Date(currentYear, 11, 25) }, // 25 Dec
      { name: 'Tahun Baru', date: new Date(currentYear + 1, 0, 1) }, // 1 Jan
      // Approximate Ramadan and Idul Fitri for 2026/2027
      { name: 'Ramadhan', date: new Date(2026, 1, 18) },
      { name: 'Idul Fitri', date: new Date(2026, 2, 20) },
      { name: 'Ramadhan', date: new Date(2027, 1, 8) },
      { name: 'Idul Fitri', date: new Date(2027, 2, 10) },
    ];
    
    events.push(
      { name: 'HUT RI', date: new Date(currentYear + 1, 7, 17) },
      { name: 'Natal', date: new Date(currentYear + 1, 11, 25) }
    );"""

replacement = """    // Data Hari Libur Nasional 2026 & 2027 (Fixed + Perkiraan Hijriah)
    const events = [
      { name: 'Tahun Baru', date: new Date(2026, 0, 1) },
      { name: 'Isra Mikraj', date: new Date(2026, 0, 13) },
      { name: 'Tahun Baru Imlek', date: new Date(2026, 1, 17) },
      { name: 'Awal Ramadhan', date: new Date(2026, 1, 18) }, // Estimasi
      { name: 'Hari Raya Nyepi', date: new Date(2026, 2, 19) },
      { name: 'Idul Fitri', date: new Date(2026, 2, 20) }, // Estimasi
      { name: 'Jumat Agung', date: new Date(2026, 3, 3) },
      { name: 'Hari Buruh', date: new Date(2026, 4, 1) },
      { name: 'Kenaikan Yesus Kristus', date: new Date(2026, 4, 14) },
      { name: 'Idul Adha', date: new Date(2026, 4, 27) }, // Estimasi
      { name: 'Hari Lahir Pancasila', date: new Date(2026, 5, 1) },
      { name: 'Tahun Baru Islam', date: new Date(2026, 5, 17) }, // Estimasi
      { name: 'HUT Kemerdekaan RI', date: new Date(2026, 7, 17) },
      { name: 'Maulid Nabi Muhammad', date: new Date(2026, 7, 26) }, // Estimasi
      { name: 'Hari Raya Natal', date: new Date(2026, 11, 25) },
      
      // 2027
      { name: 'Tahun Baru', date: new Date(2027, 0, 1) },
      { name: 'Isra Mikraj', date: new Date(2027, 0, 3) },
      { name: 'Tahun Baru Imlek', date: new Date(2027, 1, 6) },
      { name: 'Awal Ramadhan', date: new Date(2027, 1, 8) }, // Estimasi
      { name: 'Hari Raya Nyepi', date: new Date(2027, 2, 9) },
      { name: 'Idul Fitri', date: new Date(2027, 2, 10) }, // Estimasi
      { name: 'Jumat Agung', date: new Date(2027, 2, 26) },
      { name: 'Hari Buruh', date: new Date(2027, 4, 1) },
      { name: 'Kenaikan Yesus Kristus', date: new Date(2027, 4, 6) },
      { name: 'Idul Adha', date: new Date(2027, 4, 17) }, // Estimasi
      { name: 'Hari Lahir Pancasila', date: new Date(2027, 5, 1) },
      { name: 'Tahun Baru Islam', date: new Date(2027, 5, 6) }, // Estimasi
      { name: 'HUT Kemerdekaan RI', date: new Date(2027, 7, 17) },
      { name: 'Maulid Nabi Muhammad', date: new Date(2027, 7, 15) }, // Estimasi
      { name: 'Hari Raya Natal', date: new Date(2027, 11, 25) },
    ];"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched complete calendar successfully")
else:
    print("Target not found")
