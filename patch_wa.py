import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """    let detailLayanan = "";
    cart.forEach(i => {
      detailLayanan += `LAYANAN     : ${i.name.toUpperCase()}\\nBERAT       : ${i.qty} ${i.unit.toUpperCase()}\\n----------------------------------------------------------------------\\n`;
    });

    const text = `*LAUNDRY TANTE TIKA*
Jl. Zamrud Depan Gg. Zamrud 2 RT 42
Bontang Selatan, Bontang
No. WA: +62 851-6994-9219
_Nota Digital #LT-${notaId}_
----------------------------------------------------------------------
WAKTU       : ${currentTime}
PELANGGAN   : ${customer.name.toUpperCase() || '-'}
ALAMAT      : ${customer.address.toUpperCase() || '-'}
WA          : ${customer.phone}
----------------------------------------------------------------------
${detailLayanan}STATUS      : *${customer.status}*
AMBIL/ANTAR : ${customer.delivery}
TOTAL BAYAR : Rp ${total.toLocaleString()}
----------------------------------------------------------------------
              "PAKAIAN BERSIH, HATI SENANG"
${upcomingEventText !== 'Pakaian Bersih Hati Senang' ? `              *${upcomingEventText}*` : ''}`;"""

replacement = """    let detailLayanan = "";
    cart.forEach(i => {
      detailLayanan += `▪️ *${i.name.toUpperCase()}*\\n   ${i.qty} ${i.unit.toUpperCase()} x Rp ${i.price.toLocaleString()} = Rp ${i.subtotal.toLocaleString()}\\n`;
    });

    const text = `*LAUNDRY TANTE TIKA*
Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan
WA: 0851-6994-9219

_Nota #LT-${notaId}_
🗓️ *Waktu:* ${currentTime.replace(' pukul ', ' ')}

👤 *Nama:* ${customer.name.toUpperCase() || '-'}
📍 *Alamat:* ${customer.address.toUpperCase() || '-'}

📦 *RINCIAN PESANAN:*
${detailLayanan}
➖➖➖➖➖➖➖➖➖➖
💳 *TOTAL:* *Rp ${total.toLocaleString()}*
🏷️ *STATUS:* *${customer.status}*
🚚 *PENGIRIMAN:* ${customer.delivery}
➖➖➖➖➖➖➖➖➖➖

_"PAKAIAN BERSIH, HATI SENANG"_
${upcomingEventText !== 'Pakaian Bersih Hati Senang' ? `*${upcomingEventText}*` : ''}`;"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched WhatsApp text successfully")
else:
    print("Target not found")
