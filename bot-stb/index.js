const express = require('express');
const cors = require('cors');
const pino = require('pino');
const os = require('os');
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const PORT = process.env.PORT || 3005;
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

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
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'open') {
        isConnected = true;
        latestPairingCode = null;
        const rawId = sock.user?.id || '';
        connectedNumber = rawId.split(':')[0].split('@')[0] || 'Terhubung';
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

// Cek status koneksi dari Aplikasi HP
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

// Minta Kode Pairing 8 Digit langsung dari Aplikasi HP (Khusus 1 HP tanpa Scan QR)
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
      // Jika sesi lama menggantung, otomatis bersihkan dan buat sesi baru lalu minta kode lagi
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

// Reset Sesi / Ganti Nomor WA langsung dari Aplikasi HP
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

// Endpoint kirim pesan WA otomatis dari aplikasi Laundry
async function handleSendWA(req, res) {
  try {
    const { phone, message } = req.body || {};

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Nomor WA (phone) dan isi pesan (message) wajib diisi.'
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

    await sock.sendMessage(jid, { text: String(message) });

    console.log(`[TERKIRIM] Nota dikirim ke ${jid}`);
    return res.json({
      success: true,
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

app.post('/send', handleSendWA);
app.post('/api/wa-laundry', handleSendWA);

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
