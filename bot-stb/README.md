# Panduan Menjalankan Bot WhatsApp Laundry di STB Armbian (WiFi Rumah)

Folder `bot-stb` ini berdiri sendiri dan **tidak mengganggu `e4-store` maupun `chuna-tunnel`**.
Sistem ini menggunakan **Kode Pairing 8 Digit** sehingga sangat praktis untuk **1 HP saja** (tanpa perlu scan QR pakai HP lain).

---

## 1. Perintah Update & Instalasi di Terminal STB Armbian

Masuk ke folder `bot-stb`:
```bash
cd ~/laundry-tante-tika/bot-stb
npm install
```

*(Atau jika baru pertama kali clone repo):*
```bash
git clone https://github.com/evor-rcx/laundry-tante-tika.git
cd laundry-tante-tika/bot-stb
npm install
```

---

## 2. Jalankan dengan PM2 di STB
```bash
pm2 start index.js --name "laundry-tante-tika"
pm2 save
```

*(Jika bot sudah pernah berjalan di PM2, cukup restart):*
```bash
pm2 restart laundry-tante-tika
```

---

## 3. Cek IP STB & Log
Ketik:
```bash
pm2 logs laundry-tante-tika
```
Di layar terminal akan tampil alamat IP STB Anda, misalnya:  
`🌐 Alamat IP Bot di Aplikasi HP: 192.168.1.15:3005`

---

## 4. Hubungkan WhatsApp via HP (Khusus 1 HP - Kode 8 Digit)
1. Buka aplikasi **Laundry Tante Tika** di HP.
2. Klik ikon **WiFi/Bot STB** di pojok kanan atas.
3. Masukkan IP STB (misal: `192.168.1.15:3005`).
4. Masukkan nomor WhatsApp Laundry Anda (contoh: `085169949219`) lalu klik **Minta Kode Pairing (8 Digit)**.
5. Kode 8 digit akan muncul di layar HP (contoh: `ABCD - EFGH`).
6. Buka WhatsApp di HP Anda ➔ **Perangkat Tertaut** ➔ **Tautkan Perangkat** ➔ pilih **Tautkan dengan nomor telepon saja** ➔ masukkan kode 8 digit tersebut.
7. Bot langsung terhubung dan siap mengirim nota otomatis via WiFi!
