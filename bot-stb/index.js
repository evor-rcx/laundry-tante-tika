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
  const cardWidth = width - paddingX * 2;

  const items = data.items.length > 0 ? data.items : [{ name: 'Layanan Laundry', detail: data.total }];
  const itemsHeight = items.length * 65 + 80;
  const totalHeight = 880 + itemsHeight;
  const cardHeight = totalHeight - 60;

  const isLunas = data.status.toUpperCase().includes('LUNAS') && !data.status.toUpperCase().includes('BELUM');
  const statusColor = isLunas ? '#059669' : '#e11d48';
  
  const fontStack = "'Noto Color Emoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'DejaVu Sans', Arial, sans-serif";

  // Ambil Banner Atas dari file lokal jika ada
  let bannerBase64 = '';
  try {
    const bannerPath = path.join(__dirname, 'Bener atas.jpg');
    if (fs.existsSync(bannerPath)) {
      const buf = fs.readFileSync(bannerPath);
      bannerBase64 = `data:image/jpeg;base64,${buf.toString('base64')}`;
    }
  } catch (e) {
    console.log('ℹ️ Tidak bisa memuat Bener atas.jpg, menggunakan fallback desain.');
  }

  let itemsSvg = '';
  let curItemY = 45;
  for (const item of items) {
    itemsSvg += `
      <text x="30" y="${curItemY}" font-family="${fontStack}" font-weight="900" font-size="22" fill="#0f172a">▪ ${escapeXml(item.name.toUpperCase())}</text>
      <text x="50" y="${curItemY + 28}" font-family="${fontStack}" font-weight="500" font-size="19" fill="#475569">${escapeXml(item.detail)}</text>
    `;
    curItemY += 65;
  }

  const boxY = 490;
  const dash1Y = boxY + itemsHeight + 30;
  const totalBadgeY = dash1Y + 30;
  const statusY = totalBadgeY + 95;
  const pengirimanY = statusY + 38;
  const dash2Y = pengirimanY + 35;
  const footerY = dash2Y + 50;
  const eventY = footerY + 32;

  const headerContent = bannerBase64 
    ? `<image x="${paddingX + 25}" y="60" width="${cardWidth - 50}" href="${bannerBase64}" preserveAspectRatio="xMidYMid meet" />`
    : `
    <g transform="translate(${width / 2}, 95)">
      <path d="M -22,-15 L 22,-15 L 22,20 C 22,25 18,28 12,28 L -12,28 C -18,28 -22,25 -22,20 Z" fill="#086788" />
      <path d="M -15,-15 C -15,-28 15,-28 15,-15" fill="none" stroke="#086788" stroke-width="4" stroke-linecap="round" />
      <circle cx="0" cy="8" r="10" fill="#ffffff" />
      <circle cx="0" cy="8" r="6" fill="#086788" />
      <circle cx="-35" cy="-10" r="4" fill="#38bdf8" />
      <circle cx="35" cy="-15" r="5" fill="#38bdf8" />
    </g>
    <text x="${width / 2}" y="165" text-anchor="middle" font-family="${fontStack}" font-weight="900" font-size="42" fill="#073b61">LAUNDRY TANTE TIKA</text>
    <text x="${width / 2}" y="195" text-anchor="middle" font-family="${fontStack}" font-weight="bold" font-size="18" fill="#475569">Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan</text>
    <text x="${width / 2}" y="222" text-anchor="middle" font-family="${fontStack}" font-weight="900" font-size="21" fill="#086788">WA: 0851-6994-9219</text>
    `;

  return `
<svg width="${width}" height="${totalHeight}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${totalHeight}" fill="#ffffff" />
  <rect x="${paddingX}" y="30" width="${cardWidth}" height="${cardHeight}" rx="45" ry="45" fill="#ffffff" stroke="#086788" stroke-width="5" />
  <path d="M ${paddingX + 20} ${30 + 50} A 30 30 0 0 1 ${paddingX + 50} ${30 + 20}" fill="none" stroke="#086788" stroke-width="3" />
  <circle cx="${paddingX + 35}" cy="${30 + 35}" r="5" fill="#086788" />
  <path d="M ${paddingX + cardWidth - 20} ${30 + 50} A 30 30 0 0 0 ${paddingX + cardWidth - 50} ${30 + 20}" fill="none" stroke="#086788" stroke-width="3" />
  <circle cx="${paddingX + cardWidth - 35}" cy="${30 + 35}" r="5" fill="#086788" />
  <path d="M ${paddingX + 20} ${30 + cardHeight - 50} A 30 30 0 0 0 ${paddingX + 50} ${30 + cardHeight - 20}" fill="none" stroke="#086788" stroke-width="3" />
  <circle cx="${paddingX + 35}" cy="${30 + cardHeight - 35}" r="5" fill="#086788" />
  <path d="M ${paddingX + cardWidth - 20} ${30 + cardHeight - 50} A 30 30 0 0 1 ${paddingX + cardWidth - 50} ${30 + cardHeight - 20}" fill="none" stroke="#086788" stroke-width="3" />
  <circle cx="${paddingX + cardWidth - 35}" cy="${30 + cardHeight - 35}" r="5" fill="#086788" />
  
  ${headerContent}

  <g transform="translate(${width / 2}, 250)">
    <line x1="-320" y1="0" x2="-15" y2="0" stroke="#086788" stroke-width="2" />
    <path d="M -8,0 L 0,-6 L 8,0 L 0,6 Z" fill="#086788" />
    <line x1="15" y1="0" x2="320" y2="0" stroke="#086788" stroke-width="2" />
  </g>
  <text x="${width / 2}" y="315" text-anchor="middle" font-family="'Times New Roman', serif" font-weight="900" font-style="italic" font-size="52" fill="#0f172a">Nota #LT-${escapeXml(data.notaId)}</text>
  <text x="${width / 2}" y="365" text-anchor="middle" font-family="${fontStack}" font-weight="bold" font-size="22" fill="#334155">🗓️ Waktu: ${escapeXml(data.waktu)}</text>
  <g transform="translate(${paddingX + 45}, 420)">
    <text x="0" y="0" font-family="${fontStack}" font-weight="900" font-size="26" fill="#0f172a">👤 Nama: ${escapeXml(data.nama)}</text>
    <text x="0" y="42" font-family="${fontStack}" font-weight="900" font-size="26" fill="#0f172a">📍 Alamat: ${escapeXml(data.alamat)}</text>
  </g>
  <g transform="translate(${paddingX + 30}, ${boxY})">
    <rect x="0" y="0" width="${cardWidth - 60}" height="${itemsHeight}" rx="25" ry="25" fill="#e0f2f1" opacity="0.6" />
    <text x="25" y="42" font-family="${fontStack}" font-weight="900" font-size="24" fill="#086788">📦 RINCIAN PESANAN:</text>
    <g transform="translate(0, 45)">${itemsSvg}</g>
  </g>
  <line x1="${paddingX + 40}" y1="${dash1Y}" x2="${paddingX + cardWidth - 40}" y2="${dash1Y}" stroke="#086788" stroke-width="4" stroke-dasharray="15,10" stroke-linecap="round" />
  <g transform="translate(${paddingX + 45}, ${totalBadgeY})">
    <rect x="0" y="0" width="420" height="65" rx="20" fill="#ccfbf1" />
    <text x="25" y="44" font-family="${fontStack}" font-weight="900" font-size="28" fill="#064e6f">💳 TOTAL: ${escapeXml(data.total)}</text>
  </g>
  <g transform="translate(${paddingX + 45}, ${statusY})">
    <text x="0" y="0" font-family="${fontStack}" font-weight="900" font-size="26" fill="#0f172a">🏷️ STATUS: <tspan fill="${statusColor}" font-weight="900">${escapeXml(data.status)}</tspan></text>
    <text x="0" y="42" font-family="${fontStack}" font-weight="900" font-size="26" fill="#0f172a">🚚 PENGIRIMAN: ${escapeXml(data.pengiriman)}</text>
  </g>
  <line x1="${paddingX + 40}" y1="${dash2Y}" x2="${paddingX + cardWidth - 40}" y2="${dash2Y}" stroke="#086788" stroke-width="4" stroke-dasharray="15,10" stroke-linecap="round" />
  <g transform="translate(${width / 2}, ${footerY})">
    <text x="0" y="0" text-anchor="middle" font-family="${fontStack}" font-style="italic" font-weight="900" font-size="28" fill="#0f172a">“PAKAIAN BERSIH, HATI SENANG”</text>
    <text x="0" y="40" text-anchor="middle" font-family="${fontStack}" font-weight="bold" font-size="22" fill="#334155">${escapeXml(data.eventText)}</text>
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
    botNumber: connectedNumber || '',
    name: 'Laundry Tante Tika Bot',
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
