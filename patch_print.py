import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

target = """      let text = "\\x1B\\x40\\x1B\\x61\\x01\\x1B\\x45\\x01LAUNDRY TANTE TIKA\\n\\x1B\\x45\\x00";
      text += "Jl. Zamrud Depan Gg. Zamrud 2\\nRT 42, Bontang Selatan\\n";
      text += "WA: +62 851-6994-9219\\n";
      text += "--------------------------------\\n\\x1B\\x61\\x00";
      text += "Nota : #LT-" + notaId + "\\n";
      text += "Tgl  : " + currentTime + "\\n";
      text += "Nama : " + (customer.name || "-") + "\\n";
      text += "Alm  : " + (customer.address || "-") + "\\n";
      text += "WA   : " + (customer.phone || "-") + "\\n";
      text += "--------------------------------\\n";

      cart.forEach(i => {
        text += i.name + "\\n";
        text += i.qty + " " + i.unit.toUpperCase() + " x Rp " + i.price.toLocaleString() + " = Rp " + i.subtotal.toLocaleString() + "\\n";
      });

      text += "--------------------------------\\n";
      text += "TOTAL: Rp " + total.toLocaleString() + "\\n";
      text += "STATUS: " + customer.status + "\\n";
      text += "METODE: " + customer.delivery + "\\n";
      text += "--------------------------------\\n";
      text += "\\x1B\\x61\\x01PAKAIAN BERSIH, HATI SENANG\\n";"""

# Format the current time appropriately for printing, to avoid too long wrapping text.
# The `currentTime` string usually looks like "16 Agustus 2026 pukul 00:00"
# which causes wrapping on 58mm POS printers (32 chars max).
# We'll handle this in the JS replacement directly.

replacement = """      // Format Waktu agar lebih singkat di kertas
      let printTime = currentTime.replace(' pukul ', ' ').substring(0, 32);
      
      let text = "\\x1B\\x40\\x1B\\x61\\x01\\x1B\\x45\\x01LAUNDRY TANTE TIKA\\n\\x1B\\x45\\x00";
      text += "Jl. Zamrud Depan Gg. Zamrud 2\\nRT 42, Bontang Selatan\\n";
      text += "WA: +62 851-6994-9219\\n\\n";
      
      // Pembatas putus-putus 32 karakter (standar 58mm printer)
      text += "--------------------------------\\n\\x1B\\x61\\x00";
      
      // Fungsi untuk memastikan teks rata kiri dengan padding
      const padR = (str, len) => (str || "-").substring(0, len).padEnd(len, ' ');
      
      text += padR("Nota : #LT-" + notaId, 32) + "\\n";
      text += padR("Tgl  : " + printTime, 32) + "\\n";
      text += padR("Nama : " + customer.name, 32) + "\\n";
      text += padR("Alm  : " + customer.address, 32) + "\\n";
      text += padR("WA   : " + customer.phone, 32) + "\\n";
      text += "--------------------------------\\n";

      cart.forEach(i => {
        // Nama layanan
        text += padR(i.name, 32) + "\\n";
        
        // Rincian (QTY x Harga = Subtotal)
        let qtyText = i.qty + " " + i.unit.toUpperCase();
        let priceText = "Rp " + i.price.toLocaleString();
        let subtotalText = "Rp " + i.subtotal.toLocaleString();
        
        let detailLine = qtyText + " x " + priceText;
        let spacesNeeded = 32 - detailLine.length - subtotalText.length - 3; // " = " = 3 chars
        if (spacesNeeded < 0) spacesNeeded = 0;
        
        text += detailLine + " = " + " ".repeat(spacesNeeded) + subtotalText + "\\n";
      });

      text += "--------------------------------\\n";
      text += "TOTAL: Rp " + total.toLocaleString() + "\\n";
      text += "STATUS: " + customer.status + "\\n";
      text += "METODE: " + customer.delivery + "\\n";
      text += "--------------------------------\\n";
      text += "\\x1B\\x61\\x01PAKAIAN BERSIH, HATI SENANG\\n";"""

if target in content:
    content = content.replace(target, replacement)
    with open('src/App.tsx', 'w') as f:
        f.write(content)
    print("Patched print layout successfully")
else:
    print("Target not found")
