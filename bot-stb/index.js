const express = require('express');
const cors = require('cors');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const os = require('os');
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
let latestQr = null;

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

function formatPhoneToJid(phone) {
  let clean = String(phone || '').replace(/[^0-9]/g, '');
  if (!clean) return null;
  if (clean.startsWith('0')) {
    clean = '62' + clean.substring(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  return `${clean}@s.whatsapp.net`;
}

async function startWhatsAppBot() {
  try {
    const authFolder = path.join(__dirname, 'auth_session_laundry');
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: state,
      browser: ['Laundry Tante Tika STB', 'Chrome', '1.0.0'],
      syncFullHistory: false
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        latestQr = qr;
        isConnected = false;
        console.log('\n======================================================');
        console.log('📱 SCAN QR CODE WA LAUNDRY TANTE TIKA DI BAWAH INI:');
        console.log('======================================================\n');
        qrcode.generate(qr, { small: true });
        console.log('\nBuka WhatsApp HP -> Perangkat Tertaut -> Tautkan Perangkat');
        console.log('======================================================\n');
      }

      if (connection === 'open') {
        isConnected = true;
        latestQr = null;
        const rawId = sock.user?.id || '';
        connectedNumber = rawId.split(':')[0].split('@')[0] || 'Terhubung';
        const ips = getLocalWifiIPs();
        console.log('\n======================================================');
        console.log('✅ BOT WHATSAPP LAUNDRY TANTE TIKA TERHUBUNG!');
        console.log(`📞 Nomor Bot WA : +${connectedNumber}`);
        ips.forEach((ip) => {
          console.log(`🌐 Masukkan IP ini di Aplikasi HP: ${ip}:${PORT}`);
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
          setTimeout(() => startWhatsAppBot(), 4000);
        } else {
          console.log('❌ Sesi WA telah logout. Hapus folder auth_session_laundry lalu restart PM2 untuk scan ulang.');
        }
      }
    });
  } catch (err) {
    console.error('Gagal memulai Bot WA, mencoba ulang dalam 5 detik:', err.message);
    setTimeout(() => startWhatsAppBot(), 5000);
  }
}

// Halaman utama jika dibuka dari browser HP
app.get('/', (req, res) => {
  const ips = getLocalWifiIPs();
  res.json({
    app: 'Bot WhatsApp Laundry Tante Tika (STB Armbian)',
    connected: isConnected,
    botNumber: connectedNumber,
    ips: ips.map((ip) => `http://${ip}:${PORT}`),
    qrPending: Boolean(latestQr)
  });
});

// Cek status koneksi dari aplikasi Laundry
app.get('/status', (req, res) => {
  const ips = getLocalWifiIPs();
  res.json({
    success: true,
    connected: isConnected,
    status: isConnected ? 'connected' : latestQr ? 'qr_ready' : 'connecting',
    botNumber: connectedNumber,
    ip: ips[0],
    port: PORT
  });
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
  console.log('🚀 SERVER BOT LAUNDRY TANTE TIKA AKTIF (WIFI RUMAH)');
  ips.forEach((ip) => {
    console.log(`👉 Alamat IP Bot STB: ${ip}:${PORT}`);
  });
  console.log('======================================================\n');
  startWhatsAppBot();
});
