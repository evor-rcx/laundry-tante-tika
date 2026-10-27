# Panduan Menjalankan Bot WhatsApp Laundry di STB Armbian (WiFi Rumah)

Folder `bot-stb` ini berdiri sendiri dan **tidak mengganggu `e4-store` maupun `chuna-tunnel`**.

## 1. Perintah Instalasi di Terminal STB Armbian

Jika belum pernah di-*clone*:
```bash
git clone https://github.com/evor-rcx/laundry-tante-tika.git
cd laundry-tante-tika/bot-stb
npm install
```

Jika sudah pernah di-*clone* dan ingin update:
```bash
cd laundry-tante-tika
git pull
cd bot-stb
npm install
```

## 2. Jalankan dengan PM2
```bash
pm2 start index.js --name "laundry-tante-tika"
pm2 save
```

## 3. Scan QR Code Nomor WA Laundry
Ketik perintah ini untuk melihat QR Code dan alamat IP STB Anda:
```bash
pm2 logs laundry-tante-tika
```
1. Buka WhatsApp di HP Laundry ➔ **Perangkat Tertaut** ➔ **Tautkan Perangkat** ➔ Scan QR di layar terminal.
2. Setelah terhubung, di terminal akan muncul tulisan seperti:
   `🌐 Masukkan IP ini di Aplikasi HP: 192.168.1.XX:3005`
3. Tekan `Ctrl + C` untuk keluar dari tampilan log (bot tetap aktif di PM2).

## 4. Masukkan IP di Aplikasi Laundry HP
1. Buka aplikasi **Laundry Tante Tika** di HP (pastikan HP terhubung ke WiFi rumah yang sama dengan STB).
2. Ketuk tombol **ikon WiFi/Bot** di pojok kanan atas aplikasi.
3. Aktifkan saklar **Gunakan Bot WA WiFi (ON)** dan ketik alamat IP STB (contoh: `192.168.1.15:3005`).
4. Ketuk **Cek Koneksi Bot** atau **Simpan Pengaturan**.
