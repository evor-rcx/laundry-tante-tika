import { useState, useEffect, useMemo } from 'react';
import { get, set } from 'idb-keyval';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, 
  Send, 
  RotateCcw, 
  Plus, 
  X, 
  Trash2, 
  MapPin, 
  Phone, 
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ShoppingBag
} from 'lucide-react';

// Types
interface Service {
  name: string;
  price: number;
  unit: string;
  qty: number;
  subtotal: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  status: 'BELUM LUNAS' | 'LUNAS';
  delivery: 'AMBIL SENDIRI' | 'ANTAR JEMPUT';
}

const SERVICES_CATALOG = [
  { group: 'KILOAN', items: [
    { name: 'SETRIKA (KILOAN)', price: 5000, unit: 'kg' },
    { name: 'CUCI + SETRIKA (KILOAN)', price: 7000, unit: 'kg' },
    { name: 'CUCI + LIPAT (KILOAN)', price: 5000, unit: 'kg' },
  ]},
  { group: 'SEPRAI/SELIMUT/GORDEN', items: [
    { name: 'SEPRAI/SELIMUT/GORDEN - CUCI+LIPAT (KECIL)', price: 8000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - SETRIKA (KECIL)', price: 8000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - CUCI+SETRIKA (KECIL)', price: 10000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - CUCI+LIPAT (BESAR)', price: 10000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - SETRIKA (BESAR)', price: 10000, unit: 'bj' },
    { name: 'SEPRAI/SELIMUT/GORDEN - CUCI+SETRIKA (BESAR)', price: 12000, unit: 'bj' },
  ]},
  { group: 'BED COVER', items: [
    { name: 'BED COVER - CUCI LIPAT (KECIL)', price: 15000, unit: 'bj' },
    { name: 'BED COVER - CUCI LIPAT (BESAR)', price: 20000, unit: 'bj' },
    { name: 'BED COVER - CUCI SETRIKA (KECIL)', price: 20000, unit: 'bj' },
    { name: 'BED COVER - CUCI SETRIKA (BESAR)', price: 25000, unit: 'bj' },
    { name: 'BED COVER - SETRIKA (KECIL)', price: 15000, unit: 'bj' },
    { name: 'BED COVER - SETRIKA (BESAR)', price: 20000, unit: 'bj' },
  ]},
  { group: 'LAINNYA', items: [
    { name: 'SEPATU', price: 15000, unit: 'psg' },
    { name: 'HELM', price: 20000, unit: 'pcs' },
  ]},
];

const LOGO_URL = "https://i.ibb.co.com/cSRjzF2b/Picsart-26-05-14-16-43-45-055.jpg";

export default function App() {
  const [notaId, setNotaId] = useState(() => Math.floor(1000 + Math.random() * 9000));
  const [customer, setCustomer] = useState<CustomerInfo>(() => {
    const saved = localStorage.getItem('tt_laundry_customer');
    return saved ? JSON.parse(saved) : {
      name: '',
      phone: '',
      address: '',
      status: 'BELUM LUNAS',
      delivery: 'AMBIL SENDIRI'
    };
  });
  const [cart, setCart] = useState<Service[]>(() => {
    const saved = localStorage.getItem('tt_laundry_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [savedCustomers, setSavedCustomers] = useState<any[]>(() => {
    const saved = localStorage.getItem("tt_saved_customers");
    return saved ? JSON.parse(saved) : [];
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showCustomerList, setShowCustomerList] = useState(false);

  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('tt_laundry_history');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Deduplicate by ID
      const uniqueMap = new Map();
      parsed.forEach((item: any) => {
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      });
      return Array.from(uniqueMap.values());
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    // Load from IndexedDB on startup
    const loadFromIDB = async () => {
      try {
        const idbHistory = await get('tt_laundry_history');
        if (idbHistory) setHistory(idbHistory);

        const idbCustomers = await get('tt_saved_customers');
        if (idbCustomers) setSavedCustomers(idbCustomers);

        const idbCart = await get('tt_laundry_cart');
        if (idbCart) setCart(idbCart);

        const idbCustomer = await get('tt_laundry_customer');
        if (idbCustomer) setCustomer(idbCustomer);
      } catch (err) {
        console.error("Failed to load from IDB", err);
      }
    };
    loadFromIDB();
  }, []);

  useEffect(() => {
    localStorage.setItem('tt_saved_customers', JSON.stringify(savedCustomers));
    set('tt_saved_customers', savedCustomers).catch(console.error);
  }, [savedCustomers]);

  useEffect(() => {
    localStorage.setItem('tt_laundry_customer', JSON.stringify(customer));
    set('tt_laundry_customer', customer).catch(console.error);
  }, [customer]);

  useEffect(() => {
    localStorage.setItem('tt_laundry_cart', JSON.stringify(cart));
    set('tt_laundry_cart', cart).catch(console.error);
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('tt_laundry_history', JSON.stringify(history));
    set('tt_laundry_history', history).catch(console.error);
  }, [history]);

  const saveCustomer = (c: CustomerInfo) => {
    if (!c.name.trim()) return;
    setSavedCustomers((prev: any[]) => {
      const exists = prev.findIndex((x: any) => x.name.toLowerCase() === c.name.toLowerCase());
      if (exists >= 0) { const updated = [...prev]; updated[exists] = c; return updated; }
      return [c, ...prev].slice(0, 30);
    });
  };

  const saveToHistory = () => {
    saveCustomer(customer);
    const now = new Date();
    const timeStr = now.toLocaleString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace('.', ':');

    const record = {
      id: notaId,
      customer,
      cart,
      total,
      time: timeStr
    };
    
    setHistory(prev => {
      // Use String conversion to guarantee we don't fail on type mismatch
      const filtered = prev.filter((r: any) => String(r.id) !== String(notaId));
      return [record, ...filtered].slice(0, 50);
    });
  };
  const [selectedServiceIndex, setSelectedServiceIndex] = useState(-1);
  const [inputQty, setInputQty] = useState<string>('');
  const [modal, setModal] = useState<{ title: string; message: string; visible: boolean }>({
    title: '',
    message: '',
    visible: false
  });
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; visible: boolean; onConfirm: () => void }>({
    title: '',
    message: '',
    visible: false,
    onConfirm: () => {}
  });
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [isOnline, setIsOnline] = useState(true);
  const [showServiceModal, setShowServiceModal] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const flatServices = useMemo(() => {
    return SERVICES_CATALOG.flatMap(group => group.items);
  }, []);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.subtotal, 0), [cart]);

  const currentTime = new Date().toLocaleString('id-ID', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).replace('.', ':');

  const upcomingEventText = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const events = [
      { name: 'HUT RI', date: new Date(currentYear, 7, 17) }, // 17 Aug
      { name: 'Natal', date: new Date(currentYear, 11, 25) }, // 25 Dec
      { name: 'Tahun Baru', date: new Date(currentYear + 1, 0, 1) }, // 1 Jan
      // Approximate Ramadan and Idul Fitri for 2026/2027
      { name: 'Ramadhan', date: new Date(2026, 1, 18) },
      { name: 'Idul Fitri', date: new Date(2026, 2, 20) },
      { name: 'Ramadhan', date: new Date(2027, 1, 8) },
      { name: 'Idul Fitri', date: new Date(2027, 2, 10) },
    ];
    
    events.push(
      { name: 'HUT RI', date: new Date(currentYear + 1, 7, 17) },
      { name: 'Natal', date: new Date(currentYear + 1, 11, 25) }
    );

    let closest = null;
    let minDiff = Infinity;

    for (const event of events) {
      const diffTime = event.date.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < minDiff) {
        minDiff = diffDays;
        closest = { ...event, daysLeft: diffDays };
      }
    }

    if (closest) {
      if (closest.daysLeft === 0) {
        return `Selamat memperingati ${closest.name}! 🎉`;
      } else if (closest.daysLeft <= 45) {
        return `${closest.daysLeft} Hari Menuju ${closest.name} 🗓️`;
      }
    }
    return 'Pakaian Bersih Hati Senang';
  }, []);

  const showModal = (title: string, message: string) => {
    setModal({ title, message, visible: true });
  };

  const addItem = () => {
    if (selectedServiceIndex === -1) {
      showModal("Gagal", "Silakan pilih layanan terlebih dahulu!");
      return;
    }
    const qty = parseFloat(inputQty);
    if (!qty || qty <= 0) {
      showModal("Gagal", "Jumlah harus lebih dari 0!");
      return;
    }

    const serviceDef = flatServices[selectedServiceIndex];
    const newItem: Service = {
      name: serviceDef.name,
      price: serviceDef.price,
      unit: serviceDef.unit,
      qty: qty,
      subtotal: serviceDef.price * qty
    };

    setCart(prev => [...prev, newItem]);
    setInputQty('');
    setSelectedServiceIndex(-1);
  };

  const removeItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setCart([]);
    setCustomer({
      name: '',
      phone: '',
      address: '',
      status: 'BELUM LUNAS',
      delivery: 'AMBIL SENDIRI'
    });
    setNotaId(Math.floor(1000 + Math.random() * 9000));
  };

  const handlePrint = async () => {
    if (cart.length === 0) {
      showModal("Oops!", "Keranjang masih kosong.");
      return;
    }
    try {
      const { BleClient } = await import('@capacitor-community/bluetooth-le');
      await BleClient.initialize({ androidNeverForLocation: true });

      try {
        const enabled = await BleClient.isEnabled();
        if (!enabled) {
          await BleClient.requestEnable();
        }
      } catch (e) {
        console.log("Bluetooth enabled check:", e);
      }

      // Daftar UUID layanan printer thermal yang umum di pasaran
      const OPTIONAL_PRINTER_SERVICES = [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS thermal printer
        '0000e781-0000-1000-8000-00805f9b34fb', // MPT-II, PT-210, Panda, POS-58
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent UART
        '0000ff00-0000-1000-8000-00805f9b34fb', // General BLE Serial POS
        '0000fff0-0000-1000-8000-00805f9b34fb', // General BLE Serial POS
        '0000ae30-0000-1000-8000-00805f9b34fb', // Zebra / Generic
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '0000ff80-0000-1000-8000-00805f9b34fb',
        '0000feea-0000-1000-8000-00805f9b34fb',
        '0000af30-0000-1000-8000-00805f9b34fb',
        '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / CC2541 BLE module
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service (NUS)
      ];

      // Request device TANPA filter services agar SEMUA perangkat Bluetooth/Printer thermal terdeteksi
      const device = await BleClient.requestDevice({
        optionalServices: OPTIONAL_PRINTER_SERVICES,
      });

      showModal("Mencetak...", `Menghubungkan ke printer ${device.name || 'Bluetooth'}...`);
      await BleClient.connect(device.deviceId, undefined, { timeout: 15000 });

      // Deteksi service & characteristic write secara dinamis dari printer
      let targetService = '';
      let targetChar = '';
      let isWithoutResponse = false;

      const KNOWN_WRITE_CHARS = [
        '00002af1-0000-1000-8000-00805f9b34fb',
        '0000bef7-0000-1000-8000-00805f9b34fb',
        '0000bef8-0000-1000-8000-00805f9b34fb',
        '49535343-8841-43f4-a8d4-ecbe34729bb3',
        '0000ff02-0000-1000-8000-00805f9b34fb',
        '0000fff2-0000-1000-8000-00805f9b34fb',
        '0000fff1-0000-1000-8000-00805f9b34fb',
        '0000ae01-0000-1000-8000-00805f9b34fb',
        '0000ffe1-0000-1000-8000-00805f9b34fb',
        '6e400002-b5a3-f393-e0a9-e50e24dcca9e'
      ];

      try {
        const discovered = await BleClient.getServices(device.deviceId);
        // Prioritas 1: Cari characteristic printer yang sudah dikenal
        for (const s of discovered) {
          for (const c of s.characteristics) {
            if (KNOWN_WRITE_CHARS.includes(c.uuid.toLowerCase())) {
              targetService = s.uuid;
              targetChar = c.uuid;
              isWithoutResponse = !c.properties.write && c.properties.writeWithoutResponse;
              break;
            }
          }
          if (targetService) break;
        }

        // Prioritas 2: Jika belum ketemu, cari characteristic apapun yang memiliki write / writeWithoutResponse
        if (!targetService) {
          for (const s of discovered) {
            const sUuid = s.uuid.toLowerCase();
            if (sUuid.includes('1800') || sUuid.includes('1801') || sUuid.includes('180a')) continue;
            for (const c of s.characteristics) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                targetService = s.uuid;
                targetChar = c.uuid;
                isWithoutResponse = !c.properties.write && c.properties.writeWithoutResponse;
                break;
              }
            }
            if (targetService) break;
          }
        }
      } catch (err) {
        console.warn("Gagal deteksi services otomatis, menggunakan default:", err);
      }

      // Default fallback jika tidak ditemukan
      if (!targetService || !targetChar) {
        targetService = '000018f0-0000-1000-8000-00805f9b34fb';
        targetChar = '00002af1-0000-1000-8000-00805f9b34fb';
      }

      // Format Waktu agar lebih singkat di kertas
      let printTime = currentTime.replace(' pukul ', ' ').substring(0, 32);
      
      let text = "\x1B\x40\x1B\x61\x01\x1B\x45\x01LAUNDRY TANTE TIKA\n\x1B\x45\x00";
      text += "Jl. Zamrud Depan Gg. Zamrud 2\nRT 42, Bontang Selatan\n";
      text += "WA: +62 851-6994-9219\n\n";
      
      // Pembatas putus-putus 32 karakter (standar 58mm printer)
      text += "--------------------------------\n\x1B\x61\x00";
      
      // Fungsi untuk memastikan teks rata kiri dengan padding
      const padR = (str, len) => (str || "-").substring(0, len).padEnd(len, ' ');
      
      text += padR("Nota : #LT-" + notaId, 32) + "\n";
      text += padR("Tgl  : " + printTime, 32) + "\n";
      text += padR("Nama : " + customer.name, 32) + "\n";
      text += padR("Alm  : " + customer.address, 32) + "\n";
      text += padR("WA   : " + customer.phone, 32) + "\n";
      text += "--------------------------------\n";

      cart.forEach(i => {
        // Nama layanan
        text += padR(i.name, 32) + "\n";
        
        // Rincian (QTY x Harga = Subtotal)
        let qtyText = i.qty + " " + i.unit.toUpperCase();
        let priceText = "Rp " + i.price.toLocaleString();
        let subtotalText = "Rp " + i.subtotal.toLocaleString();
        
        let detailLine = qtyText + " x " + priceText;
        let spacesNeeded = 32 - detailLine.length - subtotalText.length - 3; // " = " = 3 chars
        if (spacesNeeded < 0) spacesNeeded = 0;
        
        text += detailLine + " = " + " ".repeat(spacesNeeded) + subtotalText + "\n";
      });

      text += "--------------------------------\n";
      text += "TOTAL: Rp " + total.toLocaleString() + "\n";
      text += "STATUS: " + customer.status + "\n";
      text += "METODE: " + customer.delivery + "\n";
      text += "--------------------------------\n";
      text += "\x1B\x61\x01PAKAIAN BERSIH, HATI SENANG\n";
      if (upcomingEventText && upcomingEventText !== 'Pakaian Bersih Hati Senang') {
        const printEventText = upcomingEventText.replace(/[^\x00-\x7F]/g, "").trim();
        text += printEventText.toUpperCase() + "\n";
      }
      text += "\x0A\x0A\x0A\x0A";

      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const chunkSize = 20; // 20 bytes aman untuk semua jenis Bluetooth LE buffer
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const dataView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        if (isWithoutResponse) {
          await BleClient.writeWithoutResponse(device.deviceId, targetService, targetChar, dataView);
        } else {
          await BleClient.write(device.deviceId, targetService, targetChar, dataView);
        }
        await new Promise(r => setTimeout(r, 25)); // Jeda agar printer buffer tidak overload
      }

      await new Promise(r => setTimeout(r, 300));
      try {
        await BleClient.disconnect(device.deviceId);
      } catch (dcErr) {
        console.warn("Disconnect note:", dcErr);
      }

      saveToHistory();
      resetForm();
      showModal("Berhasil", "Nota telah dicetak. Transaksi telah disimpan di riwayat.");
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('closed')) {
        return;
      }
      showModal("Gagal Mencetak", `Pastikan Bluetooth & Lokasi (GPS) HP aktif serta Printer Bluetooth sudah menyala.\n\nDetail: ${msg}`);
    }
  };

  const handleWA = () => {
    if (!customer.phone || cart.length === 0) {
      showModal("Gagal", "Nomor WA dan layanan harus diisi!");
      return;
    }

    let detailLayanan = "";
    cart.forEach(i => {
      detailLayanan += `▪️ *${i.name.toUpperCase()}*\n   ${i.qty} ${i.unit.toUpperCase()} x Rp ${i.price.toLocaleString()} = Rp ${i.subtotal.toLocaleString()}\n`;
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
${upcomingEventText !== 'Pakaian Bersih Hati Senang' ? `*${upcomingEventText}*` : ''}`;

    let cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    saveToHistory();
    resetForm();
    showModal("Berhasil", "Nota telah diteruskan ke WhatsApp dan transaksi disimpan di riwayat.");
  };

  return (
    <div className="min-h-screen pb-40">
      <header className="p-6 max-w-md mx-auto flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 p-1 overflow-hidden">
            <img src={LOGO_URL} className="w-full h-full object-contain" alt="Logo" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Owner Panel</h1>
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`} />
            </div>
            <p className="text-sm font-bold text-slate-800 leading-none">Laundry Tante Tika</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setConfirmModal({
                title: 'Transaksi Baru',
                message: 'Buat transaksi baru? Semua data input saat ini akan dibersihkan.',
                visible: true,
                onConfirm: () => {
                  setCart([]);
                  setCustomer({
                    name: '',
                    phone: '',
                    address: '',
                    status: 'BELUM LUNAS',
                    delivery: 'AMBIL SENDIRI'
                  });
                  setNotaId(Math.floor(1000 + Math.random() * 9000));
                  setConfirmModal(prev => ({ ...prev, visible: false }));
                }
              });
            }}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 btn-press text-blue-500 hover:bg-blue-50"
            title="Transaksi Baru"
          >
            <Plus size={18} strokeWidth={2.5} />
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 btn-press text-slate-400 hover:text-blue-600"
          >
            <RotateCcw size={18} strokeWidth={2.5} />
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 mb-4">
        <div className="bg-slate-100 p-1 rounded-2xl flex">
          <button 
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'current' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            Nota Baru
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
          >
            Riwayat ({history.length})
          </button>
        </div>
      </div>

      <main className="max-w-md mx-auto p-4 space-y-6">
        <AnimatePresence mode="wait">
          {activeTab === 'current' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Data Pelanggan */}
        <section className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Pelanggan</h3>
          </div>
          <div className="space-y-3">
            <button onClick={() => setShowCustomerList(true)} className="w-full py-3 bg-slate-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-center gap-2">
              <User size={12} /> Pilih Pelanggan ({savedCustomers.length})
            </button>
            <input 
              type="text" 
              placeholder="NAMA PELANGGAN" 
              value={customer.name}
              onChange={e => setCustomer({ ...customer, name: e.target.value })}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-xs uppercase placeholder:text-slate-300"
            />
            <input 
              type="tel" 
              placeholder="NOMOR WHATSAPP (CONTOH: 0812...)" 
              value={customer.phone}
              onChange={e => setCustomer({ ...customer, phone: e.target.value })}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-xs placeholder:text-slate-300"
            />
            <input 
              type="text" 
              placeholder="ALAMAT" 
              value={customer.address}
              onChange={e => setCustomer({ ...customer, address: e.target.value })}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-xs uppercase placeholder:text-slate-300"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <select 
              value={customer.status}
              onChange={e => setCustomer({ ...customer, status: e.target.value as any })}
              className="p-4 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase outline-none cursor-pointer"
            >
              <option value="BELUM LUNAS">🔴 BELUM LUNAS</option>
              <option value="LUNAS">🟢 LUNAS</option>
            </select>
            <select 
              value={customer.delivery}
              onChange={e => setCustomer({ ...customer, delivery: e.target.value as any })}
              className="p-4 bg-slate-50 border-none rounded-2xl text-[10px] font-black uppercase outline-none cursor-pointer"
            >
              <option value="AMBIL SENDIRI">🏠 AMBIL SENDIRI</option>
              <option value="ANTAR JEMPUT">🛵 ANTAR JEMPUT</option>
            </select>
          </div>
        </section>

        {/* Input Layanan */}
        <section className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={14} className="text-slate-400" />
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Layanan</h3>
          </div>
          <button 
            onClick={() => setShowServiceModal(true)}
            className="w-full p-4 bg-slate-900 text-white border-none rounded-2xl font-bold uppercase text-[11px] outline-none flex justify-between items-center transition-all btn-press"
          >
            <span className="flex-1 text-left truncate pr-4">
              {selectedServiceIndex === -1
                ? '-- PILIH LAYANAN --'
                : flatServices[selectedServiceIndex].name}
            </span>
            <ChevronDown size={16} className="text-slate-400 shrink-0" />
          </button>
          <div className="flex gap-3">
            <input 
              type="number"
              step="any" 
              placeholder="JUMLAH" 
              value={inputQty}
              onChange={e => setInputQty(e.target.value)}
              className="flex-1 p-4 bg-slate-50 border-none rounded-2xl outline-none font-bold text-xs text-center placeholder:text-slate-300"
            />
            <div className="px-6 flex items-center justify-center bg-slate-100 rounded-2xl font-black text-[10px] text-slate-400 uppercase min-w-[80px]">
              {selectedServiceIndex !== -1 ? flatServices[selectedServiceIndex].unit : 'UNIT'}
            </div>
          </div>
          <button 
            onClick={addItem}
            className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest btn-press shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
          >
            <Plus size={14} /> TAMBAH LAYANAN KE NOTA
          </button>
        </section>

        {/* Preview Nota */}
        <motion.div 
          layout
          className="nota-container overflow-hidden mx-auto max-w-sm"
          id="notaBox"
        >
          <div className="p-10 text-center relative bg-[#fdfbf7]">
            <div className="absolute top-6 right-8 font-black text-[10px] text-orange-800 bg-orange-100 px-3 py-1 rounded-full">
              #LT-{notaId}
            </div>
            <img src={LOGO_URL} className="w-20 h-20 mx-auto mb-4 object-contain" alt="Logo" />
            <h2 className="text-xl font-black text-slate-800 uppercase leading-none">Laundry Tante Tika</h2>
            <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-2 space-y-0.5">
              <p>Jl. Zamrud Depan Gg. Zamrud 2 RT 42</p>
              <p>Bontang Selatan, Bontang</p>
            </div>
          </div>

          <div className="px-8 pb-10 space-y-6 bg-white">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Pelanggan</p>
                <p className="text-sm font-black text-slate-800 uppercase">{customer.name || '-'}</p>
                <div className="flex items-center gap-1">
                   <MapPin size={8} className="text-slate-400" />
                   <p className="text-[8px] font-bold text-slate-400 uppercase italic">{customer.address || '-'}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                customer.status === 'LUNAS' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
              }`}>
                {customer.status}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-200 pt-6 space-y-4">
              <AnimatePresence initial={false}>
                {cart.length === 0 ? (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[8px] text-center text-slate-300 italic py-2"
                  >
                    Belum ada layanan yang ditambahkan
                  </motion.p>
                ) : (
                  cart.map((item, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex justify-between items-center group"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => removeItem(idx)}
                            className="text-red-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={10} />
                          </button>
                          <p className="text-[10px] font-black text-slate-700 uppercase">{item.name}</p>
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 ml-5">
                          {item.qty} {item.unit.toUpperCase()} x Rp {item.price.toLocaleString()}
                        </p>
                      </div>
                      <span className="text-[10px] font-black text-slate-800">
                        Rp {item.subtotal.toLocaleString()}
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-between items-center px-1">
              <p className="text-[8px] font-black text-slate-300 uppercase">Metode Pengambilan</p>
              <p className="text-[9px] font-bold text-blue-600 uppercase font-mono">{customer.delivery}</p>
            </div>

            <div className="bg-slate-900 rounded-[2rem] p-6 text-white flex justify-between items-center shadow-xl shadow-slate-200">
              <div>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total Tagihan</p>
                <p className="text-xl font-black">Rp {total.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <Clock size={10} className="ml-auto text-slate-500 mb-1" />
                <p className="text-[7px] font-bold text-slate-500 uppercase leading-relaxed font-mono">
                  {currentTime}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 pt-2">
              <p className="text-center text-[8px] font-black text-slate-200 tracking-[0.3em] uppercase">Pakaian Bersih Hati Senang</p>
              <div className="bg-orange-50/50 py-2 rounded-xl text-center">
                <p className="text-[7.5px] font-black text-orange-500 uppercase tracking-widest">{upcomingEventText}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    ) : (
      <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">50 Transaksi Terakhir</h3>
                <button 
                  onClick={() => {
                    setConfirmModal({
                      title: 'Hapus Riwayat',
                      message: 'Yakin ingin menghapus semua riwayat transaksi?',
                      visible: true,
                      onConfirm: () => {
                        setHistory([]);
                        setConfirmModal(prev => ({ ...prev, visible: false }));
                      }
                    });
                  }}
                  className="text-[10px] font-bold text-red-500 uppercase"
                >
                  Hapus Semua
                </button>
              </div>
              {history.length === 0 ? (
                <div className="bg-white rounded-[2.5rem] p-12 text-center border border-slate-100 border-dashed">
                  <p className="text-slate-300 text-xs font-medium">Belum ada riwayat transaksi</p>
                </div>
              ) : (
                history.map((record, idx) => (
                  <div key={`${record.id}-${idx}`} className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-800">#LT-{record.id}</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${record.customer.status === 'LUNAS' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'}`}>
                          {record.customer.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 uppercase">{record.customer.name || 'Hamba Allah'}</p>
                      <p className="text-[8px] font-medium text-slate-400">{record.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">Rp {record.total.toLocaleString()}</p>
                      <button 
                        onClick={() => {
                          setNotaId(record.id); 
                          setCart(record.cart || record.items || []);
                          setCustomer(record.customer);
                          setActiveTab('current');
                        }}
                        className="text-[9px] font-black text-blue-600 uppercase mt-1"
                      >
                        Buka Nota</button><button onClick={() => { 
                          setConfirmModal({
                            title: 'Hapus Transaksi',
                            message: 'Yakin ingin menghapus riwayat transaksi ini?',
                            visible: true,
                            onConfirm: () => {
                              setHistory(prev => prev.filter((_, i) => i !== idx));
                              setConfirmModal(prev => ({ ...prev, visible: false }));
                            }
                          });
                        }} className="text-[9px] font-black text-red-500 uppercase mt-1 ml-2">Hapus
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Nav Bawah */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 z-[100] glass-nav">
        <div className="max-w-md mx-auto flex gap-3">
          <button 
            onClick={handlePrint}
            className="w-16 h-16 bg-white/10 text-white rounded-full flex items-center justify-center btn-press border border-white/20 hover:bg-white/20"
            title="Cetak Nota"
          >
            <Printer size={24} />
          </button>
          <button 
            onClick={handleWA}
            className="flex-1 h-16 bg-green-500 text-white rounded-full font-black text-xs uppercase tracking-widest btn-press flex items-center justify-center gap-3 shadow-lg shadow-green-500/20"
          >
            <Send size={18} /> Kirim WhatsApp
          </button>
        </div>
      </footer>

      {/* Modal Customer List */}
      {showCustomerList && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-[200] backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] p-6 max-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-sm uppercase tracking-widest">Daftar Pelanggan</h3>
              <button onClick={() => setShowCustomerList(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            {savedCustomers.length === 0 ? (
              <p className="text-center text-slate-300 text-xs py-8">Belum ada pelanggan tersimpan</p>
            ) : (
              <div className="overflow-y-auto space-y-2">
                {savedCustomers.map((c: any, i: number) => (
                  <button
                    key={i}
                    onClick={() => { setCustomer({ ...customer, name: c.name, phone: c.phone, address: c.address }); setShowCustomerList(false); }}
                    className="w-full text-left bg-slate-50 rounded-2xl px-4 py-3 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-black text-slate-800 uppercase">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.phone}</p>
                      <p className="text-[10px] text-slate-400">{c.address}</p>
                    </div>
                    <div className="text-blue-500 text-[10px] font-black uppercase">Pilih</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Status */}
      <AnimatePresence>
        {modal.visible && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[3rem] text-center max-w-xs w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                {modal.title === 'Gagal' || modal.title === 'Error' ? (
                  <AlertCircle size={32} className="text-red-500" />
                ) : (
                  <CheckCircle2 size={32} className="text-blue-500" />
                )}
              </div>
              <h3 className="font-black text-lg mb-2">{modal.title}</h3>
              <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">
                {modal.message}
              </p>
              <button 
                onClick={() => setModal({ ...modal, visible: false })}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest btn-press"
              >
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Modal Konfirmasi */}
        {confirmModal.visible && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[210] backdrop-blur-sm p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white p-8 rounded-[3rem] text-center max-w-xs w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h3 className="font-black text-lg mb-2">{confirmModal.title}</h3>
              <p className="text-xs text-slate-400 mb-8 font-medium leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, visible: false })}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest btn-press"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest btn-press shadow-lg shadow-red-500/20"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Service Picker Modal */}
        {showServiceModal && (
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[300] bg-slate-900 flex flex-col"
          >
            <div className="p-6 pb-4 flex justify-between items-center border-b border-slate-800 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Pilih Layanan</h2>
                <p className="text-xs text-slate-400">Silakan pilih layanan laundry Anda</p>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 btn-press"
              >
                <ShoppingBag size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {SERVICES_CATALOG.map((group, gIdx) => (
                <div key={gIdx} className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 border-t border-slate-800"></div>
                    <span className="text-[10px] font-black text-slate-500 tracking-widest uppercase">{group.group}</span>
                    <div className="flex-1 border-t border-slate-800"></div>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((item, iIdx) => {
                      const flatIndex = flatServices.indexOf(item);
                      const isSelected = selectedServiceIndex === flatIndex;
                      const displayName = item.name
                        .replace(' (KILOAN)', '')
                        .replace('SEPRAI/SELIMUT/GORDEN - ', '')
                        .replace('BED COVER - ', '');

                      return (
                        <div
                          key={iIdx}
                          onClick={() => {
                            setSelectedServiceIndex(flatIndex);
                            setShowServiceModal(false);
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'border-blue-500 bg-blue-500/10'
                              : 'border-slate-800 bg-slate-800/50 hover:bg-slate-800'
                          }`}
                        >
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-white">{displayName}</h4>
                            <div className="inline-block px-3 py-1 bg-slate-900 rounded-full border border-slate-700">
                              <span className="text-xs font-bold text-blue-400">Rp {item.price.toLocaleString()}</span>
                              <span className="text-xs font-medium text-slate-400"> / {item.unit}</span>
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            isSelected ? 'border-blue-500' : 'border-slate-600'
                          }`}>
                            {isSelected && <div className="w-3 h-3 rounded-full bg-blue-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
