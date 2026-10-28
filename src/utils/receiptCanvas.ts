export interface ReceiptData {
  notaId: string | number;
  customer: {
    name: string;
    phone?: string;
    address: string;
    status: 'BELUM LUNAS' | 'LUNAS' | string;
    delivery: 'AMBIL SENDIRI' | 'ANTAR JEMPUT' | string;
  };
  cart: Array<{
    name: string;
    price: number;
    unit: string;
    qty: number;
    subtotal: number;
  }>;
  total: number;
  time: string;
  eventText?: string;
}

function formatReceiptTime(timeStr: string): string {
  if (!timeStr) return '';
  return timeStr.replace(/^[A-Za-z]+,\s*/, '').replace(/\s*pukul\s*/, ' ').trim();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function generateReceiptCardImage(data: ReceiptData): string {
  const width = 850;
  const paddingX = 35;
  const cardWidth = width - paddingX * 2; // 780px

  const customer = data?.customer || { name: '-', phone: '', address: '-', status: 'BELUM LUNAS', delivery: 'AMBIL SENDIRI' };
  const cartList = Array.isArray(data?.cart) ? data.cart : [];
  const totalNum = Number(data?.total || 0);
  const notaIdStr = String(data?.notaId || '1001');
  const timeStr = String(data?.time || '');
  const eventTextStr = String(data?.eventText || '');

  // Hitung tinggi dinamis berdasarkan jumlah item rincian pesanan
  const cartCount = Math.max(1, cartList.length);
  const itemsHeight = cartCount * 56 + 70; // Header rincian + items
  const baseHeight = 780; // Header, info pelanggan, total, footer
  const totalHeight = baseHeight + itemsHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  // 1. Background Luar Putih Bersih
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  // 2. Bingkai Kartu Nota Utama (Warna Biru Khas Laundry Tante Tika)
  const cardX = paddingX;
  const cardY = 25;
  const cardH = totalHeight - 50;

  drawRoundedRect(ctx, cardX, cardY, cardWidth, cardH, 32);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#086788';
  ctx.lineWidth = 5;
  ctx.stroke();

  // 3. Ornamen 4 Sudut (Corner Flourish Klasik)
  const drawCorner = (cx: number, cy: number, startAngle: number, endAngle: number, dotX: number, dotY: number) => {
    ctx.save();
    ctx.strokeStyle = '#086788';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 32, startAngle, endAngle);
    ctx.stroke();

    ctx.fillStyle = '#086788';
    ctx.beginPath();
    ctx.arc(dotX, dotY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Top-Left
  drawCorner(cardX + 42, cardY + 42, Math.PI, 1.5 * Math.PI, cardX + 32, cardY + 32);
  // Top-Right
  drawCorner(cardX + cardWidth - 42, cardY + 42, 1.5 * Math.PI, 2 * Math.PI, cardX + cardWidth - 32, cardY + 32);
  // Bottom-Left
  drawCorner(cardX + 42, cardY + cardH - 42, 0.5 * Math.PI, Math.PI, cardX + 32, cardY + cardH - 32);
  // Bottom-Right
  drawCorner(cardX + cardWidth - 42, cardY + cardH - 42, 0, 0.5 * Math.PI, cardX + cardWidth - 32, cardY + cardH - 32);

  // 4. Header: Logo Mesin Cuci Vektor
  const centerX = width / 2;
  let curY = 60;

  // Ikon Mesin Cuci
  const iconW = 44;
  const iconH = 50;
  const iconX = centerX - iconW / 2;
  const iconY = curY;

  // Body Mesin
  drawRoundedRect(ctx, iconX, iconY + 8, iconW, iconH - 8, 8);
  ctx.fillStyle = '#0b7285';
  ctx.fill();

  // Gantungan atas mesin
  ctx.strokeStyle = '#086788';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(centerX, iconY + 6, 8, Math.PI, 0);
  ctx.stroke();

  // Kaca Pintu Bundar Mesin Cuci
  ctx.fillStyle = '#e0f7fa';
  ctx.beginPath();
  ctx.arc(centerX, iconY + 32, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Pusaran air dalam mesin
  ctx.fillStyle = '#0b7285';
  ctx.beginPath();
  ctx.arc(centerX, iconY + 32, 8, 0, Math.PI * 2);
  ctx.fill();

  // Gelembung sabun kecil
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(iconX - 8, iconY + 16, 4, 0, Math.PI * 2);
  ctx.arc(iconX + iconW + 10, iconY + 14, 4.5, 0, Math.PI * 2);
  ctx.arc(iconX - 16, iconY + 28, 3, 0, Math.PI * 2);
  ctx.fill();

  // 5. Nama Brand "LAUNDRY TANTE TIKA"
  curY += 75;
  ctx.textAlign = 'center';
  ctx.font = '900 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#073b61';
  ctx.fillText('LAUNDRY TANTE TIKA', centerX, curY);

  // Alamat & WA
  curY += 26;
  ctx.font = '700 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText('Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan', centerX, curY);

  curY += 24;
  ctx.font = '800 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#1e293b';
  ctx.fillText('WA: 0851-6994-9219', centerX, curY);

  // Garis Pemisah Ganda dengan Belah Ketupat di Tengah
  curY += 20;
  const divLeft = cardX + 50;
  const divRight = cardX + cardWidth - 50;
  const divW = (divRight - divLeft - 30) / 2;

  ctx.strokeStyle = '#086788';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(divLeft, curY);
  ctx.lineTo(divLeft + divW, curY);
  ctx.moveTo(divRight - divW, curY);
  ctx.lineTo(divRight, curY);
  ctx.stroke();

  // Belah ketupat tengah
  ctx.fillStyle = '#086788';
  ctx.beginPath();
  ctx.moveTo(centerX, curY - 5);
  ctx.lineTo(centerX + 6, curY);
  ctx.lineTo(centerX, curY + 5);
  ctx.lineTo(centerX - 6, curY);
  ctx.closePath();
  ctx.fill();

  // 6. Nomor Nota & Waktu
  curY += 42;
  ctx.font = 'italic 900 38px Georgia, serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`Nota #LT-${notaIdStr}`, centerX, curY);

  curY += 28;
  ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#334155';
  const displayTime = formatReceiptTime(timeStr);
  ctx.fillText(`🗓️ Waktu: ${displayTime}`, centerX, curY);

  // 7. Info Pelanggan (Nama & Alamat)
  curY += 45;
  const leftX = cardX + 35;
  ctx.textAlign = 'left';

  const custName = customer.name?.trim() ? customer.name.trim().toUpperCase() : '-';
  const custAddr = customer.address?.trim() ? customer.address.trim().toUpperCase() : '-';

  ctx.font = '900 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`👤 Nama: ${custName}`, leftX, curY);

  curY += 32;
  ctx.fillText(`📍 Alamat: ${custAddr}`, leftX, curY);

  // 8. Box Rincian Pesanan (Warna Biru Muda Lembut #e6f4f8)
  curY += 26;
  const boxX = cardX + 25;
  const boxW = cardWidth - 50;
  const boxH = itemsHeight;
  const boxY = curY;

  drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 20);
  ctx.fillStyle = '#e6f4f8';
  ctx.fill();

  // Judul Rincian Pesanan
  let boxCurY = boxY + 38;
  ctx.font = '900 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#086788';
  ctx.fillText('📦 RINCIAN PESANAN:', boxX + 24, boxCurY);

  // Daftar Item
  boxCurY += 30;
  if (cartList.length === 0) {
    ctx.font = 'italic 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('- Belum ada rincian pesanan -', boxX + 28, boxCurY);
  } else {
    cartList.forEach((item) => {
      // Baris 1: Nama Layanan
      ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText(`▪ ${(item.name || '').toUpperCase()}`, boxX + 24, boxCurY);

      // Baris 2: Qty x Harga = Subtotal
      boxCurY += 24;
      ctx.font = '700 18px "Courier New", Courier, monospace';
      ctx.fillStyle = '#1e293b';
      const qtyNum = Number(item.qty || 0);
      const priceNum = Number(item.price || 0);
      const subtotalNum = Number(item.subtotal || qtyNum * priceNum);
      const detailStr = `   ${qtyNum} ${(item.unit || '').toUpperCase()} x Rp ${priceNum.toLocaleString('id-ID')} = Rp ${subtotalNum.toLocaleString('id-ID')}`;
      ctx.fillText(detailStr, boxX + 24, boxCurY);

      boxCurY += 32;
    });
  }

  curY = boxY + boxH + 20;

  // 9. Garis Putus-putus Pemisah (Dashed Line)
  ctx.save();
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = '#086788';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 25, curY);
  ctx.lineTo(cardX + cardWidth - 25, curY);
  ctx.stroke();
  ctx.restore();

  // 10. Total, Status, & Pengiriman
  curY += 28;

  // Badge Hijau Total Pembayaran
  const badgeW = 380;
  const badgeH = 52;
  drawRoundedRect(ctx, leftX, curY, badgeW, badgeH, 16);
  ctx.fillStyle = '#d1f4e7';
  ctx.fill();

  ctx.font = '900 25px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#064e6f';
  ctx.fillText(`💳 TOTAL: Rp ${totalNum.toLocaleString('id-ID')}`, leftX + 18, curY + 36);

  curY += badgeH + 28;

  // Status Pembayaran
  const isLunas = String(customer.status || '').toUpperCase() === 'LUNAS';
  ctx.font = '900 23px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('🏷 STATUS: ', leftX, curY);

  const statusLabel = isLunas ? 'LUNAS' : 'BELUM LUNAS';
  const statusColor = isLunas ? '#059669' : '#e11d48';
  ctx.fillStyle = statusColor;
  ctx.fillText(statusLabel, leftX + 135, curY);

  curY += 34;

  // Pengiriman
  ctx.fillStyle = '#0f172a';
  ctx.fillText(`🚚 PENGIRIMAN: ${customer.delivery || 'AMBIL SENDIRI'}`, leftX, curY);

  curY += 26;

  // Garis Putus-putus Pemisah Bawah
  ctx.save();
  ctx.setLineDash([12, 8]);
  ctx.strokeStyle = '#086788';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cardX + 25, curY);
  ctx.lineTo(cardX + cardWidth - 25, curY);
  ctx.stroke();
  ctx.restore();

  // 11. Footer Slogan & Hari Besar Peringatan
  curY += 38;
  ctx.textAlign = 'center';
  ctx.font = 'italic 900 23px Georgia, serif';
  ctx.fillStyle = '#0f172a';
  ctx.fillText('“PAKAIAN BERSIH, HATI SENANG”', centerX, curY);

  if (eventTextStr) {
    curY += 28;
    ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(eventTextStr, centerX, curY);
  }

  // Export kualitas tinggi JPEG
  return canvas.toDataURL('image/jpeg', 0.95);
}
