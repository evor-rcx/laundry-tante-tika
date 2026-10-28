const sharp = require('sharp');
const fs = require('fs');

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseMessageToReceipt(text) {
  const notaMatch = text.match(/Nota\s*#?LT-?([0-9A-Za-z]+)/i);
  const notaId = notaMatch ? notaMatch[1] : '1001';

  const waktuMatch = text.match(/Waktu:?\*?\s*([^\n\r]+)/i);
  const waktu = waktuMatch ? waktuMatch[1].replace(/[*_]/g, '').trim() : '';

  const namaMatch = text.match(/Nama:?\*?\s*([^\n\r]+)/i);
  const nama = namaMatch ? namaMatch[1].replace(/[*_]/g, '').trim() : '-';

  const alamatMatch = text.match(/Alamat:?\*?\s*([^\n\r]+)/i);
  const alamat = alamatMatch ? alamatMatch[1].replace(/[*_]/g, '').trim() : '-';

  const totalMatch = text.match(/TOTAL:?\*?\s*([^\n\r]+)/i);
  const total = totalMatch ? totalMatch[1].replace(/[*_]/g, '').trim() : 'Rp 0';

  const statusMatch = text.match(/STATUS:?\*?\s*([^\n\r]+)/i);
  const status = statusMatch ? statusMatch[1].replace(/[*_]/g, '').trim() : 'BELUM LUNAS';

  const pengirimanMatch = text.match(/PENGIRIMAN:?\*?\s*([^\n\r]+)/i);
  const pengiriman = pengirimanMatch ? pengirimanMatch[1].replace(/[*_]/g, '').trim() : 'AMBIL SENDIRI';

  // Rincian item
  const items = [];
  const rincianMatch = text.match(/RINCIAN PESANAN:[\s\S]*?(?=➖➖|TOTAL|$)/i);
  if (rincianMatch) {
    const rawRincian = rincianMatch[0];
    const lines = rawRincian.split('\n');
    let currentItem = null;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith('▪') || line.startsWith('-') || line.startsWith('*▪')) {
        if (currentItem) items.push(currentItem);
        currentItem = { name: line.replace(/[▪*\-]/g, '').trim(), detail: '' };
      } else if (currentItem && (line.includes('x') || line.includes('Rp') || line.includes('KG') || line.includes('PCS') || line.includes('BJ'))) {
        currentItem.detail = line.replace(/[*_]/g, '').trim();
      }
    }
    if (currentItem) items.push(currentItem);
  }

  // Slogan & event
  let eventText = 'Pakaian Bersih, Hati Senang';
  const eventMatch = text.match(/Selamat[^\n\r*]+/i);
  if (eventMatch) {
    eventText = eventMatch[0].trim();
  }

  return { notaId, waktu, nama, alamat, total, status, pengiriman, items, eventText };
}

function generateReceiptSvg(data) {
  const width = 850;
  const paddingX = 35;
  const cardWidth = width - paddingX * 2; // 780

  const items = data.items.length > 0 ? data.items : [{ name: 'Layanan Laundry', detail: data.total }];
  const itemsHeight = items.length * 60 + 75;
  const totalHeight = 780 + itemsHeight;
  const cardHeight = totalHeight - 50;

  const isLunas = data.status.toUpperCase().includes('LUNAS') && !data.status.toUpperCase().includes('BELUM');
  const statusColor = isLunas ? '#059669' : '#e11d48';

  let itemsSvg = '';
  let curItemY = 40;
  for (const item of items) {
    itemsSvg += `
      <text x="30" y="${curItemY}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="20" fill="#0f172a">▪ ${escapeXml(item.name.toUpperCase())}</text>
      <text x="45" y="${curItemY + 24}" font-family="monospace, Courier" font-weight="bold" font-size="18" fill="#1e293b">${escapeXml(item.detail)}</text>
    `;
    curItemY += 56;
  }

  const boxY = 460;
  const dash1Y = boxY + itemsHeight + 20;
  const totalBadgeY = dash1Y + 25;
  const statusY = totalBadgeY + 80;
  const pengirimanY = statusY + 34;
  const dash2Y = pengirimanY + 25;
  const footerY = dash2Y + 40;
  const eventY = footerY + 28;

  return `
<svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .brand { font-family: 'DejaVu Sans', Arial, sans-serif; font-weight: 900; }
      .text-serif { font-family: Georgia, serif; font-weight: 900; }
    </style>
  </defs>

  <!-- Background Putih -->
  <rect width="${width}" height="${totalHeight}" fill="#ffffff" />

  <!-- Bingkai Kartu Utama -->
  <rect x="${paddingX}" y="25" width="${cardWidth}" height="${cardHeight}" rx="32" ry="32" fill="#ffffff" stroke="#086788" stroke-width="5" />

  <!-- Corner Flourishes -->
  <path d="M ${paddingX + 15} ${25 + 45} A 30 30 0 0 1 ${paddingX + 45} ${25 + 15}" fill="none" stroke="#086788" stroke-width="3" />
  <circle cx="${paddingX + 32}" cy="${25 + 32}" r="5" fill="#086788" />

  <path d="M ${paddingX + cardWidth - 15} ${25 + 45} A 30 30 0 0 0 ${paddingX + cardWidth - 45} ${25 + 15}" fill="none" stroke="#086788" stroke-width="3" />
  <circle cx="${paddingX + cardWidth - 32}" cy="${25 + 32}" r="5" fill="#086788" />

  <path d="M ${paddingX + 15} ${25 + cardHeight - 45} A 30 30 0 0 0 ${paddingX + 45} ${25 + cardHeight - 15}" fill="none" stroke="#086788" stroke-width="3" />
  <circle cx="${paddingX + 32}" cy="${25 + cardHeight - 32}" r="5" fill="#086788" />

  <path d="M ${paddingX + cardWidth - 15} ${25 + cardHeight - 45} A 30 30 0 0 1 ${paddingX + cardWidth - 45} ${25 + cardHeight - 15}" fill="none" stroke="#086788" stroke-width="3" />
  <circle cx="${paddingX + cardWidth - 32}" cy="${25 + cardHeight - 32}" r="5" fill="#086788" />

  <!-- Logo Mesin Cuci -->
  <g transform="translate(${width / 2 - 22}, 60)">
    <rect x="0" y="8" width="44" height="42" rx="8" fill="#0b7285" />
    <circle cx="22" cy="6" r="8" fill="none" stroke="#086788" stroke-width="3" />
    <circle cx="22" cy="28" r="14" fill="#e0f7fa" stroke="#ffffff" stroke-width="2.5" />
    <circle cx="22" cy="28" r="8" fill="#0b7285" />
    <circle cx="-10" cy="14" r="4" fill="#38bdf8" />
    <circle cx="52" cy="12" r="4.5" fill="#38bdf8" />
  </g>

  <!-- Nama Brand & Alamat -->
  <text x="${width / 2}" y="140" text-anchor="middle" class="brand" font-size="34" fill="#073b61">LAUNDRY TANTE TIKA</text>
  <text x="${width / 2}" y="168" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="17" fill="#334155">Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan</text>
  <text x="${width / 2}" y="194" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="19" fill="#1e293b">WA: 0851-6994-9219</text>

  <!-- Divider Ganda -->
  <line x1="${paddingX + 60}" y1="214" x2="${width / 2 - 20}" y2="214" stroke="#086788" stroke-width="2" />
  <polygon points="${width / 2},209 ${width / 2 + 6},214 ${width / 2},219 ${width / 2 - 6},214" fill="#086788" />
  <line x1="${width / 2 + 20}" y1="214" x2="${paddingX + cardWidth - 60}" y2="214" stroke="#086788" stroke-width="2" />

  <!-- Nota & Waktu -->
  <text x="${width / 2}" y="260" text-anchor="middle" class="text-serif" font-style="italic" font-size="38" fill="#0f172a">Nota #LT-${escapeXml(data.notaId)}</text>
  <text x="${width / 2}" y="290" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="20" fill="#334155">🗓️ Waktu: ${escapeXml(data.waktu)}</text>

  <!-- Info Pelanggan -->
  <text x="${paddingX + 35}" y="340" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="23" fill="#0f172a">👤 Nama: ${escapeXml(data.nama)}</text>
  <text x="${paddingX + 35}" y="374" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="23" fill="#0f172a">📍 Alamat: ${escapeXml(data.alamat)}</text>

  <!-- Box Rincian Pesanan -->
  <g transform="translate(${paddingX + 25}, ${boxY})">
    <rect x="0" y="0" width="${cardWidth - 50}" height="${itemsHeight}" rx="20" ry="20" fill="#e6f4f8" />
    <text x="24" y="38" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="22" fill="#086788">📦 RINCIAN PESANAN:</text>
    <g transform="translate(0, 35)">
      ${itemsSvg}
    </g>
  </g>

  <!-- Dashed Line 1 -->
  <line x1="${paddingX + 25}" y1="${dash1Y}" x2="${paddingX + cardWidth - 25}" y2="${dash1Y}" stroke="#086788" stroke-width="3.5" stroke-dasharray="12,8" />

  <!-- Total Badge -->
  <g transform="translate(${paddingX + 35}, ${totalBadgeY})">
    <rect x="0" y="0" width="380" height="54" rx="16" ry="16" fill="#d1f4e7" />
    <text x="18" y="37" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="24" fill="#064e6f">💳 TOTAL: ${escapeXml(data.total)}</text>
  </g>

  <!-- Status & Pengiriman -->
  <text x="${paddingX + 35}" y="${statusY}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="23" fill="#0f172a">
    🏷 STATUS: <tspan fill="${statusColor}">${escapeXml(data.status)}</tspan>
  </text>
  <text x="${paddingX + 35}" y="${pengirimanY}" font-family="DejaVu Sans, Arial, sans-serif" font-weight="900" font-size="23" fill="#0f172a">🚚 PENGIRIMAN: ${escapeXml(data.pengiriman)}</text>

  <!-- Dashed Line 2 -->
  <line x1="${paddingX + 25}" y1="${dash2Y}" x2="${paddingX + cardWidth - 25}" y2="${dash2Y}" stroke="#086788" stroke-width="3.5" stroke-dasharray="12,8" />

  <!-- Slogan & Footer -->
  <text x="${width / 2}" y="${footerY}" text-anchor="middle" class="text-serif" font-style="italic" font-size="23" fill="#0f172a">“PAKAIAN BERSIH, HATI SENANG”</text>
  <text x="${width / 2}" y="${eventY}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-weight="bold" font-size="18" fill="#334155">${escapeXml(data.eventText)}</text>
</svg>
`;
}

const sampleMsg = `*LAUNDRY TANTE TIKA*
Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan
WA: 0851-6994-9219

_Nota #LT-4187_
🗓️ *Waktu:* 28 Oktober 2026 07:08

👤 *Nama:* RIO
📍 *Alamat:* ZAMRUT

📦 *RINCIAN PESANAN:*
▪️ *SETRIKA (KILOAN)*
   3 KG x Rp 5.000 = Rp 15.000
▪️ *CUCI + SETRIKA (KILOAN)*
   2 KG x Rp 7.000 = Rp 14.000
▪️ *CUCI KARPET KECIL (UJICOBA)*
   100 PCS x Rp 20.000 = Rp 2.000.000
➖➖➖➖➖➖➖➖➖➖
💳 *TOTAL:* *Rp 2.197.000*
🏷️ *STATUS:* *BELUM LUNAS*
🚚 *PENGIRIMAN:* ANTAR JEMPUT
➖➖➖➖➖➖➖➖➖➖

_"PAKAIAN BERSIH, HATI SENANG"_
*Selamat Memperingati Hari Sumpah Pemuda! 🎉*`;

const data = parseMessageToReceipt(sampleMsg);
const svg = generateReceiptSvg(data);

sharp(Buffer.from(svg))
  .jpeg({ quality: 95 })
  .toBuffer()
  .then(buf => {
    fs.writeFileSync('test_output.jpg', buf);
    console.log('BERHASIL GENERATE JPEG DARI PESAN TEKS! Ukuran:', buf.length, 'bytes');
  })
  .catch(err => console.error('ERROR:', err));
