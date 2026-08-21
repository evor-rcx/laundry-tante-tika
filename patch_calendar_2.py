import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """    // Data Hari Libur Nasional 2026 & 2027 (Fixed + Perkiraan Hijriah)
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

replacement = """    // Data Hari Libur Nasional Resmi SKB 3 Menteri 2026
    const events = [
      { name: 'Tahun Baru', date: new Date(2026, 0, 1) }, // 1 Jan
      { name: 'Isra Mikraj', date: new Date(2026, 0, 16) }, // 16 Jan
      { name: 'Tahun Baru Imlek', date: new Date(2026, 1, 17) }, // 17 Feb
      { name: 'Hari Suci Nyepi', date: new Date(2026, 2, 19) }, // 19 Mar
      { name: 'Idul Fitri', date: new Date(2026, 2, 21) }, // 21-22 Mar
      { name: 'Jumat Agung', date: new Date(2026, 3, 3) }, // 3 Apr
      { name: 'Paskah', date: new Date(2026, 3, 5) }, // 5 Apr
      { name: 'Hari Buruh', date: new Date(2026, 4, 1) }, // 1 Mei
      { name: 'Kenaikan Yesus Kristus', date: new Date(2026, 4, 14) }, // 14 Mei
      { name: 'Idul Adha', date: new Date(2026, 4, 27) }, // 27 Mei
      { name: 'Hari Raya Waisak', date: new Date(2026, 4, 31) }, // 31 Mei
      { name: 'Hari Lahir Pancasila', date: new Date(2026, 5, 1) }, // 1 Jun
      { name: 'Tahun Baru Islam', date: new Date(2026, 5, 16) }, // 16 Jun
      { name: 'HUT Kemerdekaan RI', date: new Date(2026, 7, 17) }, // 17 Ags
      { name: 'Maulid Nabi Muhammad', date: new Date(2026, 7, 25) }, // 25 Ags
      { name: 'Hari Raya Natal', date: new Date(2026, 11, 25) }, // 25 Des

      // Perkiraan 2027 (untuk jaga-jaga akhir tahun)
      { name: 'Tahun Baru', date: new Date(2027, 0, 1) },
      { name: 'Isra Mikraj', date: new Date(2027, 1, 5) },
      { name: 'Tahun Baru Imlek', date: new Date(2027, 1, 6) },
      { name: 'Idul Fitri', date: new Date(2027, 2, 10) }, 
    ];"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched official SKB 3 calendar successfully")
else:
    print("Target not found")
