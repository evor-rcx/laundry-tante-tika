const express = require('express');
const cors = require('cors');
const pino = require('pino');
const os = require('os');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

let sharp = null;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('ℹ️ Catatan: sharp belum terpasang. Jalankan "npm install sharp" agar STB bisa otomatis mengubah teks APK menjadi Gambar Nota.');
}

const PORT = process.env.PORT || 3005;
const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

let sock = null;
let isConnected = false;
let connectedNumber = null;
let latestPairingCode = null;
let isStarting = false;

const authFolder = path.join(__dirname, 'auth_session_laundry');

function getLocalWifiIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips.length > 0 ? ips : ['127.0.0.1'];
}

function normalizePhoneDigits(phone) {
  let clean = String(phone || '').replace(/[^0-9]/g, '');
  if (!clean) return '';
  if (clean.startsWith('0')) {
    clean = '62' + clean.substring(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  return clean;
}

function formatPhoneToJid(phone) {
  const clean = normalizePhoneDigits(phone);
  return clean ? `${clean}@s.whatsapp.net` : null;
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseMessageToReceipt(text) {
  // Regex lebh fleksibel untuk menangkap data meski ada emoji atau spasi berlebih
  const notaMatch = text.match(/Nota\s*#?LT-?([0-9A-Za-z]+)/i);
  const notaId = notaMatch ? notaMatch[1] : '1001';

  const waktuMatch = text.match(/(?:🗓️|Waktu):?\*?\s*([^\n\r]+)/i);
  const waktu = waktuMatch ? waktuMatch[1].replace(/[*_]/g, '').trim() : '';

  const namaMatch = text.match(/(?:👤|Nama):?\*?\s*([^\n\r]+)/i);
  const nama = namaMatch ? namaMatch[1].replace(/[*_]/g, '').trim() : '-';

  const alamatMatch = text.match(/(?:📍|Alamat):?\*?\s*([^\n\r]+)/i);
  const alamat = alamatMatch ? alamatMatch[1].replace(/[*_]/g, '').trim() : '-';

  const totalMatch = text.match(/(?:💳|TOTAL):?\*?\s*([^\n\r]+)/i);
  const total = totalMatch ? totalMatch[1].replace(/[*_]/g, '').trim() : 'Rp 0';

  const statusMatch = text.match(/(?:🏷️|STATUS):?\*?\s*([^\n\r]+)/i);
  const status = statusMatch ? statusMatch[1].replace(/[*_]/g, '').trim() : 'BELUM LUNAS';

  const pengirimanMatch = text.match(/(?:🚚|PENGIRIMAN):?\*?\s*([^\n\r]+)/i);
  const pengiriman = pengirimanMatch ? pengirimanMatch[1].replace(/[*_]/g, '').trim() : 'AMBIL SENDIRI';

  // Rincian item
  const items = [];
  // Cari blok rincian pesanan
  const rincianMatch = text.match(/(?:📦|RINCIAN PESANAN):[\s\S]*?(?=➖➖|TOTAL|💳|$)/i);
  if (rincianMatch) {
    const rawRincian = rincianMatch[0];
    const lines = rawRincian.split('\n');
    let currentItem = null;
    for (const rawLine of lines) {
      const line = rawLine.trim();
      // Deteksi baris item (biasanya dimulai dengan bullet atau emoji)
      if (line.match(/^[▪\-*•]/) || (line.length > 5 && !line.includes('x') && !line.includes('Rp') && !line.includes('PESANAN'))) {
         // Jika baris baru tapi bukan detail harga/jumlah, anggap sebagai Nama Item Baru
         if (line.includes('PESANAN')) continue;
         if (currentItem) items.push(currentItem);
         currentItem = { name: line.replace(/^[▪\-*•\s]+/, '').trim(), detail: '' };
      } else if (currentItem && (line.includes('x') || line.includes('Rp') || line.includes('KG') || line.includes('PCS') || line.includes('BJ'))) {
        currentItem.detail = line.replace(/[*_]/g, '').trim();
      }
    }
    if (currentItem) items.push(currentItem);
  }

  // Slogan & event (biasanya di baris terakhir)
  let eventText = 'Pakaian Bersih, Hati Senang';
  const lines = text.split('\n');
  const lastLine = lines[lines.length - 1].trim();
  if (lastLine && (lastLine.includes('Selamat') || lastLine.includes('Hari') || lastLine.includes('!'))) {
    eventText = lastLine.replace(/[*_]/g, '').trim();
  } else {
    // Cari keyword "Selamat" di mana saja jika baris terakhir bukan event
    const eventMatch = text.match(/Selamat[^\n\r*]+/i);
    if (eventMatch) eventText = eventMatch[0].trim();
  }

  return { notaId, waktu, nama, alamat, total, status, pengiriman, items, eventText };
}

// TIPS UNTUK USER: Jika emoji di gambar kotak-kotak (broken), jalankan ini di terminal STB:
// sudo apt update && sudo apt install fonts-noto-color-emoji -y


function generateReceiptSvg(data) {
  const width = 850;
  const paddingX = 40;
  const cardWidth = width - paddingX * 2; // 770

  const items = data.items.length > 0 ? data.items : [{ name: 'Layanan Laundry', detail: data.total }];
  const itemsHeight = items.length * 65 + 80;
  const totalHeight = 850 + itemsHeight;
  const cardHeight = totalHeight - 60;

  const isLunas = data.status.toUpperCase().includes('LUNAS') && !data.status.toUpperCase().includes('BELUM');
  const statusColor = isLunas ? '#059669' : '#e11d48';
  
  // Font stack that includes emoji support
  const fontStack = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'DejaVu Sans', Arial, sans-serif";

  let itemsSvg = '';
  let curItemY = 45;
  for (const item of items) {
    itemsSvg += `
      <text x="30" y="${curItemY}" font-family="${fontStack}" font-weight="900" font-size="22" fill="#0f172a">▪ ${escapeXml(item.name.toUpperCase())}</text>
      <text x="50" y="${curItemY + 28}" font-family="${fontStack}" font-weight="500" font-size="19" fill="#475569">${escapeXml(item.detail)}</text>
    `;
    curItemY += 65;
  }

  const boxY = 480;
  const dash1Y = boxY + itemsHeight + 30;
  const totalBadgeY = dash1Y + 30;
  const statusY = totalBadgeY + 95;
  const pengirimanY = statusY + 38;
  const dash2Y = pengirimanY + 35;
  const footerY = dash2Y + 50;
  const eventY = footerY + 32;

  return `
<svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${totalHeight}" fill="#f8fafc" />

  <!-- Main Card -->
  <rect x="${paddingX}" y="30" width="${cardWidth}" height="${cardHeight}" rx="40" ry="40" fill="#ffffff" stroke="#0ea5e9" stroke-width="6" />

  <!-- Corner Flourishes -->
  <path d="M ${paddingX + 20} ${30 + 50} A 30 30 0 0 1 ${paddingX + 50} ${30 + 20}" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round" />
  <circle cx="${paddingX + 35}" cy="${30 + 35}" r="6" fill="#0ea5e9" />

  <path d="M ${paddingX + cardWidth - 20} ${30 + 50} A 30 30 0 0 0 ${paddingX + cardWidth - 50} ${30 + 20}" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round" />
  <circle cx="${paddingX + cardWidth - 35}" cy="${30 + 35}" r="6" fill="#0ea5e9" />

  <path d="M ${paddingX + 20} ${30 + cardHeight - 50} A 30 30 0 0 0 ${paddingX + 50} ${30 + cardHeight - 20}" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round" />
  <circle cx="${paddingX + 35}" cy="${30 + cardHeight - 35}" r="6" fill="#0ea5e9" />

  <path d="M ${paddingX + cardWidth - 20} ${30 + cardHeight - 50} A 30 30 0 0 1 ${paddingX + cardWidth - 50} ${30 + cardHeight - 20}" fill="none" stroke="#0ea5e9" stroke-width="4" stroke-linecap="round" />
  <circle cx="${paddingX + cardWidth - 35}" cy="${30 + cardHeight - 35}" r="6" fill="#0ea5e9" />

  <!-- Improved Header / Logo -->
  <g transform="translate(${width / 2}, 100)">
    <!-- Laundry Basket Icon -->
    <path d="M -30,-20 L 30,-20 L 25,20 L -25,20 Z" fill="#0ea5e9" />
    <rect x="-35" y="-25" width="70" height="8" rx="4" fill="#0369a1" />
    <path d="M -15,-10 L -15,10 M 0,-10 L 0,10 M 15,-10 L 15,10" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />
    <!-- Bubbles -->
    <circle cx="-45" cy="-15" r="5" fill="#bae6fd" />
    <circle cx="48" cy="-22" r="7" fill="#bae6fd" />
    <circle cx="40" cy="5" r="4" fill="#bae6fd" />
  </g>

  <!-- Brand Name -->
  <text x="${width / 2}" y="175" text-anchor="middle" font-family="${fontStack}" font-weight="900" font-size="42" fill="#0c4a6e">LAUNDRY TANTE TIKA</text>
  <text x="${width / 2}" y="210" text-anchor="middle" font-family="${fontStack}" font-weight="600" font-size="19" fill="#475569">Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan</text>
  <text x="${width / 2}" y="238" text-anchor="middle" font-family="${fontStack}" font-weight="800" font-size="22" fill="#0ea5e9">WA: 0851-6994-9219</text>

  <!-- Decorative Divider -->
  <g transform="translate(${width / 2}, 270)">
    <line x1="-300" y1="0" x2="-20" y2="0" stroke="#cbd5e1" stroke-width="2" />
    <circle cx="0" cy="0" r="6" fill="#0ea5e9" />
    <line x1="20" y1="0" x2="300" y2="0" stroke="#cbd5e1" stroke-width="2" />
  </g>

  <!-- Receipt ID & Time -->
  <g transform="translate(${width / 2}, 335)">
    <rect x="-180" y="-40" width="360" height="65" rx="15" fill="#f1f5f9" />
    <text x="0" y="5" text-anchor="middle" font-family="${fontStack}" font-weight="900" font-size="36" fill="#1e293b">Nota #LT-${escapeXml(data.notaId)}</text>
  </g>
  <text x="${width / 2}" y="385" text-anchor="middle" font-family="${fontStack}" font-weight="bold" font-size="22" fill="#64748b">🗓️ Waktu: ${escapeXml(data.waktu)}</text>

  <!-- Customer Info -->
  <g transform="translate(${paddingX + 45}, 435)">
    <text x="0" y="0" font-family="${fontStack}" font-weight="900" font-size="25" fill="#0f172a">👤 Nama: <tspan font-weight="bold" fill="#334155">${escapeXml(data.nama)}</tspan></text>
    <text x="0" y="38" font-family="${fontStack}" font-weight="900" font-size="25" fill="#0f172a">📍 Alamat: <tspan font-weight="bold" fill="#334155">${escapeXml(data.alamat)}</tspan></text>
  </g>

  <!-- Items Container -->
  <g transform="translate(${paddingX + 30}, ${boxY})">
    <rect x="0" y="0" width="${cardWidth - 60}" height="${itemsHeight}" rx="25" ry="25" fill="#f0f9ff" stroke="#bae6fd" stroke-width="2" />
    <text x="25" y="42" font-family="${fontStack}" font-weight="900" font-size="24" fill="#0369a1">📦 RINCIAN PESANAN:</text>
    <g transform="translate(0, 45)">
      ${itemsSvg}
    </g>
  </g>

  <!-- Dashed Line 1 -->
  <line x1="${paddingX + 40}" y1="${dash1Y}" x2="${paddingX + cardWidth - 40}" y2="${dash1Y}" stroke="#0ea5e9" stroke-width="4" stroke-dasharray="15,10" stroke-linecap="round" opacity="0.6" />

  <!-- Total Section -->
  <g transform="translate(${paddingX + 45}, ${totalBadgeY})">
    <rect x="0" y="0" width="420" height="65" rx="20" fill="#ccfbf1" />
    <text x="25" y="44" font-family="${fontStack}" font-weight="900" font-size="28" fill="#0f766e">💳 TOTAL: ${escapeXml(data.total)}</text>
  </g>

  <!-- Status & Delivery -->
  <g transform="translate(${paddingX + 45}, ${statusY})">
    <text x="0" y="0" font-family="${fontStack}" font-weight="900" font-size="26" fill="#0f172a">
      🏷️ STATUS: <tspan fill="${statusColor}" font-weight="900">${escapeXml(data.status)}</tspan>
    </text>
    <text x="0" y="42" font-family="${fontStack}" font-weight="900" font-size="26" fill="#0f172a">🚚 PENGIRIMAN: <tspan fill="#334155">${escapeXml(data.pengiriman)}</tspan></text>
  </g>

  <!-- Dashed Line 2 -->
  <line x1="${paddingX + 40}" y1="${dash2Y}" x2="${paddingX + cardWidth - 40}" y2="${dash2Y}" stroke="#0ea5e9" stroke-width="4" stroke-dasharray="15,10" stroke-linecap="round" opacity="0.6" />

  <!-- Footer -->
  <g transform="translate(${width / 2}, ${footerY})">
    <text x="0" y="0" text-anchor="middle" font-family="${fontStack}" font-style="italic" font-weight="900" font-size="26" fill="#0c4a6e">“PAKAIAN BERSIH, HATI SENANG”</text>
    <text x="0" y="38" text-anchor="middle" font-family="${fontStack}" font-weight="bold" font-size="22" fill="#64748b">${escapeXml(data.eventText)}</text>
  </g>
</svg>
`;
}

async function startWhatsAppBot() {
  if (isStarting) return;
  isStarting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: state,
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      syncFullHistory: false,
      markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        isConnected = true;
        latestPairingCode = null;
        const rawId = sock.user?.id || '';
        connectedNumber = rawId.split(':')[0].split('@')[0] || 'Terhubung';
        try {
          await sock.sendPresenceUpdate('unavailable');
        } catch (e) {}
        const ips = getLocalWifiIPs();
        console.log('\n======================================================');
        console.log('✅ BOT WHATSAPP LAUNDRY TANTE TIKA TERHUBUNG!');
        console.log(`📞 Nomor Bot WA : +${connectedNumber}`);
        ips.forEach((ip) => {
          console.log(`🌐 Alamat IP Bot di Aplikasi HP: ${ip}:${PORT}`);
        });
        console.log('======================================================\n');
      }

      if (connection === 'close') {
        isConnected = false;
        connectedNumber = null;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`⚠️ Koneksi WA terputus (kode: ${statusCode}). Reconnect: ${shouldReconnect}`);
        if (shouldReconnect) {
          setTimeout(() => startWhatsAppBot(), 3000);
        } else {
          try {
            fs.rmSync(authFolder, { recursive: true, force: true });
          } catch (e) {}
          setTimeout(() => startWhatsAppBot(), 1500);
        }
      }
    });
  } catch (err) {
    console.error('Gagal memulai Bot WA, mencoba ulang dalam 5 detik:', err.message);
    setTimeout(() => startWhatsAppBot(), 5000);
  } finally {
    isStarting = false;
  }
}

app.get('/status', (req, res) => {
  const ips = getLocalWifiIPs();
  res.json({
    success: true,
    connected: isConnected,
    status: isConnected ? 'connected' : 'pairing_ready',
    botNumber: connectedNumber,
    pairingCode: latestPairingCode,
    ip: ips[0],
    port: PORT
  });
});

app.get('/test-receipt', async (req, res) => {
  if (!sharp) return res.send('Sharp is not installed on STB.');
  
  const sampleText = `
LAUNDRY TANTE TIKA
Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan
WA: 0851-6994-9219
Nota #LT-4187
🗓️ Waktu: 28 Oktober 2026 09:14
👤 Nama: RIO
📍 Alamat: ZAMRUT
📦 RINCIAN PESANAN:
▪️ SETRIKA (KILOAN)
3 KG x Rp 5.000 = Rp 15.000
▪️ CUCI + SETRIKA (KILOAN)
2 KG x Rp 7.000 = Rp 14.000
➖➖➖➖➖➖➖➖➖➖
💳 TOTAL: Rp 29.000
🏷️ STATUS: BELUM LUNAS
🚚 PENGIRIMAN: ANTAR JEMPUT
➖➖➖➖➖➖➖➖➖➖
"PAKAIAN BERSIH, HATI SENANG"
Selamat Memperingati Hari Sumpah Pemuda! 🎉
  `;
  
  try {
    const receiptData = parseMessageToReceipt(sampleText);
    const svgContent = generateReceiptSvg(receiptData);
    const buffer = await sharp(Buffer.from(svgContent)).jpeg({ quality: 95 }).toBuffer();
    res.set('Content-Type', 'image/jpeg');
    res.send(buffer);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/pair-code', async (req, res) => {
  try {
    const { phone } = req.body || {};
    const cleanNumber = normalizePhoneDigits(phone);

    if (!cleanNumber || cleanNumber.length < 9) {
      return res.status(400).json({
        success: false,
        error: 'Masukkan nomor WhatsApp yang valid (contoh: 085169949219).'
      });
    }

    if (isConnected) {
      return res.json({
        success: true,
        alreadyConnected: true,
        botNumber: connectedNumber
      });
    }

    let code = null;
    try {
      if (!sock) {
        await startWhatsAppBot();
        await new Promise((r) => setTimeout(r, 2000));
      }
      code = await sock.requestPairingCode(cleanNumber);
    } catch (firstErr) {
      if (sock) {
        try { sock.end(); } catch (e) {}
        sock = null;
      }
      try {
        fs.rmSync(authFolder, { recursive: true, force: true });
      } catch (e) {}
      await startWhatsAppBot();
      await new Promise((r) => setTimeout(r, 2500));
      code = await sock.requestPairingCode(cleanNumber);
    }

    const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
    latestPairingCode = formattedCode;

    console.log(`🔢 KODE PAIRING UNTUK +${cleanNumber}: ${formattedCode}`);
    return res.json({
      success: true,
      code: formattedCode,
      phone: cleanNumber
    });
  } catch (err) {
    console.error('[GAGAL REQUEST PAIRING CODE]:', err);
    return res.status(500).json({
      success: false,
      error: 'Gagal meminta kode pairing. Klik tombol "Reset Sesi" lalu coba lagi.'
    });
  }
});

app.post('/logout', async (req, res) => {
  try {
    console.log('🔄 Mereset sesi WhatsApp atas permintaan dari Aplikasi HP...');
    if (sock) {
      try { await sock.logout(); } catch (e) {}
      try { sock.end(); } catch (e) {}
      sock = null;
    }
    isConnected = false;
    connectedNumber = null;
    latestPairingCode = null;

    try {
      fs.rmSync(authFolder, { recursive: true, force: true });
    } catch (e) {}

    setTimeout(() => startWhatsAppBot(), 1000);

    return res.json({
      success: true,
      message: 'Sesi berhasil direset. Silakan klik Minta Kode Pairing.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal mereset sesi.'
    });
  }
});

function pickImageFromRequest(req) {
  const body = req.body || {};

  const file = req.file
            || (req.files && (req.files.image?.[0] || req.files.foto?.[0] ||
                              req.files.nota?.[0]  || req.files.img?.[0]  ||
                              req.files.file?.[0]));
  if (file && file.buffer && file.buffer.length > 100) {
    return {
      source: 'file',
      buffer: file.buffer,
      mimetype: file.mimetype || 'image/jpeg',
      raw: null
    };
  }

  const candidates = [
    body.image, body.imageBase64, body.foto,
    body.nota,  body.img,         body.file
  ];
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string' || raw.length < 100) continue;

    const m = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (m) {
      return {
        source: 'base64',
        buffer: Buffer.from(m[2], 'base64'),
        mimetype: m[1],
        raw
      };
    }
    if (/^https?:\/\//i.test(raw)) {
      return { source: 'url', buffer: null, mimetype: null, raw };
    }
    try {
      const buf = Buffer.from(raw.replace(/^data:.*?;base64,/, ''), 'base64');
      if (buf.length > 100) {
        return { source: 'base64-raw', buffer: buf, mimetype: 'image/jpeg', raw };
      }
    } catch (e) {}
  }
  return null;
}

async function handleSendWA(req, res) {
  try {
    const body = req.body || {};
    const phone = body.phone || body.nomor || body.to;
    const message = body.message || body.text || body.pesan;
    const caption = body.caption || message || '';
    let img = pickImageFromRequest(req);

    // Jika HP (APK) tidak mengirimkan gambar, STB otomatis menghasilkan Gambar Nota dari isi teks!
    if (!img && sharp && message && (message.includes('LAUNDRY') || message.includes('Nota'))) {
      try {
        console.log('🎨 [AUTO-GENERATE NOTA] Menghasilkan nota gambar dari pesan APK...');
        const receiptData = parseMessageToReceipt(message);
        const svgContent = generateReceiptSvg(receiptData);
        const genBuffer = await sharp(Buffer.from(svgContent)).jpeg({ quality: 95 }).toBuffer();
        img = {
          source: 'auto-stb-sharp',
          buffer: genBuffer,
          mimetype: 'image/jpeg'
        };
        console.log(`✅ [AUTO-GENERATE BERHASIL] Gambar nota siap dikirim (${genBuffer.length} bytes)!`);
      } catch (genErr) {
        console.error('Gagal auto-generate nota gambar:', genErr.message);
      }
    }

    console.log('───────────── /send REQUEST ─────────────');
    console.log('[CT]  ', req.headers['content-type']);
    console.log('[BODY]', Object.keys(body));
    if (req.file) console.log('[FILE]', req.file.fieldname, req.file.size, req.file.mimetype);
    if (req.files) console.log('[FILES]', Object.keys(req.files));
    console.log('[phone]', phone, '| [message?]', !!message, '| [image?]', !!img,
                img ? `(${img.source}, ${img.buffer ? img.buffer.length : 'url'} bytes)` : '');
    console.log('─────────────────────────────────────────');

    if (!phone || (!message && !img)) {
      return res.status(400).json({
        success: false,
        error: 'Nomor WA (phone) dan isi pesan/gambar wajib diisi.'
      });
    }

    if (!sock || !isConnected) {
      return res.status(503).json({
        success: false,
        error: 'Bot WhatsApp di STB belum terhubung / sedang offline.'
      });
    }

    const jid = formatPhoneToJid(phone);
    if (!jid) {
      return res.status(400).json({
        success: false,
        error: 'Format nomor WhatsApp tidak valid.'
      });
    }

    if (img) {
      if (img.source === 'url') {
        console.log(`📸 [KIRIM GAMBAR URL] → ${jid}`);
        await sock.sendMessage(jid, { image: { url: img.raw }, caption });
      } else {
        console.log(`📸 [KIRIM NOTA GAMBAR] ${img.mimetype} • ${img.buffer.length} bytes → ${jid}`);
        await sock.sendMessage(jid, {
          image: img.buffer,
          mimetype: img.mimetype,
          caption
        });
      }
      console.log(`✅ [TERKIRIM FOTO NOTA] → ${jid}`);
    } else {
      console.log(`💬 [KIRIM TEKS] → ${jid}`);
      await sock.sendMessage(jid, { text: String(message) });
      console.log(`✅ [TERKIRIM TEKS NOTA] → ${jid}`);
    }

    try { await sock.sendPresenceUpdate('unavailable'); } catch (e) {}

    return res.json({
      success: true,
      hasImage: !!img,
      mode: img ? img.source : 'text',
      bytes: img && img.buffer ? img.buffer.length : 0,
      to: jid.replace('@s.whatsapp.net', ''),
      botNumber: connectedNumber
    });
  } catch (err) {
    console.error('[GAGAL KIRIM WA]:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal mengirim pesan melalui Bot STB.'
    });
  }
}

const multipartAny = upload.any();

app.post('/send', multipartAny, handleSendWA);
app.post('/send-image', multipartAny, handleSendWA);
app.post('/api/wa-laundry', multipartAny, handleSendWA);

app.listen(PORT, '0.0.0.0', () => {
  const ips = getLocalWifiIPs();
  console.log('\n======================================================');
  console.log('🚀 SERVER BOT LAUNDRY TANTE TIKA AKTIF (MODE PAIRING 1 HP)');
  ips.forEach((ip) => {
    console.log(`👉 Masukkan IP ini di Aplikasi HP: ${ip}:${PORT}`);
  });
  console.log('======================================================\n');
  startWhatsAppBot();
});
