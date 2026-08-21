const holidays = [
      // 2024
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2024, 8, 16) },
      // 2025
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2025, 8, 5) },
      // 2026
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2026, 7, 25) },
];

for(let y=2024; y<=2026; y++) {
    for(let m=0; m<12; m++) {
        for(let d=1; d<=31; d++) {
            const today = new Date(y, m, d);
            for (const event of holidays) {
                const diffTime = event.date.getTime() - today.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 37) {
                    console.log(`Found: today=${today.toISOString().split('T')[0]}, event=${event.date.toISOString().split('T')[0]} (${event.name})`);
                }
            }
        }
    }
}
