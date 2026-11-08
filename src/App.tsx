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
  ShoppingBag,
  MessageCircle,
  Wifi,
  Save,
  Truck,
  FileText,
  Wallet,
  Coins,
  CreditCard,
  Banknote
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
  balance?: number;
}

interface WaBotConfig {
  enabled: boolean;
  ip: string;
}

export interface PesananItemPayload {
  nama_layanan: string;
  qty: string;
  harga_satuan: number;
  subtotal: number;
}

export interface PesananPayload {
  no_nota: string;
  nama_pelanggan: string;
  nomor_wa: string;
  alamat: string;
  rincian: PesananItemPayload[];
  total: number;
  status_bayar: string;
  pengiriman: string;
  catatan_footer: string;
  phone?: string;
  message?: string;
  caption?: string;
}

const DEFAULT_BOT_URL = 'https://e4-store.my.id';

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
    { name: 'CUCI KARPET KECIL (UJICOBA)', price: 20000, unit: 'pcs' },
  ]},
];

// Sapaan waktu 5-kategori sesuai instruksi user:
// 05:00 - 10:59: pagi
// 11:00 - 14:59: siang
// 15:00 - 17:59: sore
// 18:00 - 18:59: petang
// 19:00 - 04:59: malam
export const getGreetingTimeWord = (date: Date = new Date()): 'pagi' | 'siang' | 'sore' | 'petang' | 'malam' => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'pagi';
  if (hour >= 11 && hour < 15) return 'siang';
  if (hour >= 15 && hour < 18) return 'sore';
  if (hour >= 18 && hour < 19) return 'petang';
  return 'malam';
};

export const getPaymentGreeting = (customerName: string, date: Date = new Date()): string => {
  const timeWord = getGreetingTimeWord(date);
  const cleanName = customerName?.trim() ? customerName.trim() : 'Customer';
  return `Selamat ${timeWord}, Kak ${cleanName}.`;
};

export const getPaymentConfirmationMessage = (
  customerName: string,
  totalAmount: number,
  date: Date = new Date()
): string => {
  const greeting = getPaymentGreeting(customerName, date);
  const dateStr = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const hourStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }).replace('.', ':');
  const jumlahStr = totalAmount.toLocaleString('id-ID');

  return `${greeting}
Kami dari Laundry Tante Tika mau mengonfirmasi bahwa pembayaran cucian Kak sebesar Rp ${jumlahStr} sudah kami terima pada tanggal ${dateStr} pukul ${hourStr}. Dengan ini status pembayaran LUNAS.

Terima kasih banyak atas kepercayaannya mencuci di Laundry Tante Tika! 🙏✨`;
};

export const getWAGreeting = (date: Date = new Date()): string => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 18) return 'Selamat sore';
  return 'Selamat malam';
};

export const getWACaption = (deliveryType: string = 'ANTAR JEMPUT', date: Date = new Date()): string => {
  const greeting = getWAGreeting(date);
  if (deliveryType === 'AMBIL SENDIRI') {
    return `${greeting}, Kak. Mohon izin menginfokan bahwa cucian laundry Kakak sudah selesai diproses dan siap untuk diambil. Terima kasih.`;
  }
  return `${greeting}, Kak. Mohon izin, apakah ada orang di rumah saat ini? Saya ingin mengantar laundry pesanan Kakak. Terima kasih.`;
};

export const formatReceiptDateOnly = (timeStr: string) => {
  if (!timeStr) return '';
  return timeStr.replace(/^[A-Za-z]+,\s*/, '').replace(/\s*pukul\s*/, ' ').trim();
};

import { LOGO_DATA } from './logoData';

const LOGO_URL = LOGO_DATA;

export default function App() {
  const [notaId, setNotaId] = useState(() => Math.floor(1000 + Math.random() * 9000));
  const [loadedArrivalDate, setLoadedArrivalDate] = useState<string | null>(null);
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

  const [showCustomerList, setShowCustomerList] = useState(false);

  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('tt_laundry_history');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
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

        const idbBotConfig = await get('tt_wa_bot_config');
        if (idbBotConfig) {
          let resolvedIp = (idbBotConfig.ip && idbBotConfig.ip.trim()) ? idbBotConfig.ip : DEFAULT_BOT_URL;
          if (resolvedIp.includes('run.app') || resolvedIp.includes('ais-pre')) {
            resolvedIp = DEFAULT_BOT_URL;
          }
          setWaBotConfig(prev => ({
            enabled: idbBotConfig.enabled !== undefined ? idbBotConfig.enabled : prev.enabled,
            ip: resolvedIp
          }));
        }
      } catch (err) {
        console.error("Failed to load from IDB", err);
      }
    };
    loadFromIDB();
  }, []);

  const [waBotConfig, setWaBotConfig] = useState<WaBotConfig>(() => {
    const saved = localStorage.getItem('tt_wa_bot_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let resolvedIp = (parsed.ip && parsed.ip.trim()) ? parsed.ip : DEFAULT_BOT_URL;
        if (resolvedIp.includes('run.app') || resolvedIp.includes('ais-pre')) {
          resolvedIp = DEFAULT_BOT_URL;
        }
        return {
          enabled: parsed.enabled !== undefined ? parsed.enabled : true,
          ip: resolvedIp
        };
      } catch (e) {
        // ignore
      }
    }
    return { enabled: true, ip: DEFAULT_BOT_URL };
  });

  const [showBotModal, setShowBotModal] = useState(false);
  const [botStatus, setBotStatus] = useState<{
    checked: boolean;
    connected: boolean;
    message: string;
    botNumber?: string | null;
    botName?: string | null;
    qrImage?: string | null;
    pairingCode?: string | null;
  }>({ checked: false, connected: false, message: 'Menghubungkan ke Server Bot...', qrImage: null, pairingCode: null });
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [testPhoneInput, setTestPhoneInput] = useState('');
  const [pairingPhoneInput, setPairingPhoneInput] = useState('085169949219');
  const [isRequestingCode, setIsRequestingCode] = useState(false);

  useEffect(() => {
    localStorage.setItem('tt_wa_bot_config', JSON.stringify(waBotConfig));
    set('tt_wa_bot_config', waBotConfig).catch(console.error);
  }, [waBotConfig]);

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

  const getCustomerBalance = (customerName?: string, customerPhone?: string): number => {
    if (!customerName && !customerPhone) return 0;
    const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
    const found = savedCustomers.find((c: any) => {
      const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
      const matchName = customerName && c.name && c.name.trim().toLowerCase() === customerName.trim().toLowerCase();
      const matchPhone = cleanPhone && cPhone && cleanPhone === cPhone;
      return matchName || matchPhone;
    });
    return (found && typeof found.balance === 'number') ? Math.max(0, found.balance) : 0;
  };

  const updateCustomerBalance = (customerName: string, customerPhone: string | undefined, newBalance: number) => {
    const safeBalance = Math.max(0, Math.round(newBalance));
    setSavedCustomers(prev => {
      const cleanPhone = (customerPhone || '').replace(/[^0-9]/g, '');
      let found = false;
      const next = prev.map(c => {
        const cPhone = (c.phone || '').replace(/[^0-9]/g, '');
        const matchName = customerName && c.name && c.name.trim().toLowerCase() === customerName.trim().toLowerCase();
        const matchPhone = cleanPhone && cPhone && cleanPhone === cPhone;
        if (matchName || matchPhone) {
          found = true;
          return { ...c, balance: safeBalance };
        }
        return c;
      });
      if (!found && customerName?.trim()) {
        next.unshift({
          name: customerName.trim(),
          phone: customerPhone || '',
          address: '',
          status: 'BELUM LUNAS',
          delivery: 'AMBIL SENDIRI',
          balance: safeBalance
        });
      }
      return next;
    });
  };

  const saveCustomer = (c: CustomerInfo) => {
    if (!c.name.trim()) return;
    setSavedCustomers((prev: any[]) => {
      const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
      const exists = prev.findIndex((x: any) => {
        const xPhone = (x.phone || '').replace(/[^0-9]/g, '');
        const matchName = x.name && x.name.trim().toLowerCase() === c.name.trim().toLowerCase();
        const matchPhone = cleanPhone && xPhone && cleanPhone === xPhone;
        return matchName || matchPhone;
      });
      if (exists >= 0) { 
        const updated = [...prev]; 
        const existingBal = updated[exists].balance ?? 0;
        updated[exists] = { ...updated[exists], ...c, balance: existingBal }; 
        return updated; 
      }
      return [{ ...c, balance: 0 }, ...prev].slice(0, 50);
    });
  };

  const saveToHistory = (options?: { tanggalAntar?: string; tanggalBayar?: string; status?: 'BELUM LUNAS' | 'LUNAS' }) => {
    saveCustomer(customer);
    const now = new Date();
    const timeStr = now.toLocaleString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace('.', ':');

    // Cari riwayat lama jika nota ini sudah pernah dicatat sebelumnya
    const existingRecord = history.find((r: any) => String(r.id) === String(notaId));
    
    // ATURAN PENTING USER: JANGAN UBAH TANGGAL DATANG SAAT DI-EDIT DARI "BUKA"
    // Tanggal datang adalah tanggal awal saat pertama kali nota masuk ke riwayat
    const tanggalDatang = existingRecord?.tanggalDatang || existingRecord?.time || loadedArrivalDate || timeStr;
    const tanggalAntar = options?.tanggalAntar !== undefined ? options.tanggalAntar : (existingRecord?.tanggalAntar || null);
    const tanggalBayar = options?.tanggalBayar !== undefined ? options.tanggalBayar : (existingRecord?.tanggalBayar || null);
    const finalStatus = options?.status || customer.status || 'BELUM LUNAS';

    const record = {
      id: notaId,
      customer: { ...customer, status: finalStatus },
      cart,
      total,
      time: tanggalDatang, // Simpan tanggal datang asli di field time agar aman & kompatibel
      tanggalDatang,       // Tanggal Datang (TIDAK BERUBAH SAAT DI-EDIT)
      tanggalAntar,        // Tanggal Pengantaran / Kirim WA
      tanggalBayar         // Tanggal Bayar Lunas
    };
    
    setHistory(prev => {
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

  const [paymentModal, setPaymentModal] = useState<{
    visible: boolean;
    record: any;
    recordIndex: number;
    paymentMethod: 'CASH' | 'TRANSFER';
    useBalance: boolean;
    inputAmount: string;
    excessAction: 'CHANGE' | 'SAVE_BALANCE';
  }>({
    visible: false,
    record: null,
    recordIndex: -1,
    paymentMethod: 'CASH',
    useBalance: true,
    inputAmount: '',
    excessAction: 'CHANGE'
  });
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentYear = now.getFullYear();

    const fixedHolidays = [
      { name: 'Tahun Baru Masehi', m: 0, d: 1 },
      { name: 'Hari Pers Nasional', m: 1, d: 9 },
      { name: 'Hari Peduli Sampah Nasional', m: 1, d: 21 },
      { name: 'Hari Musik Nasional', m: 2, d: 9 },
      { name: 'Hari Air Sedunia', m: 2, d: 22 },
      { name: 'Hari Kesehatan Dunia', m: 3, d: 7 },
      { name: 'Hari Kartini', m: 3, d: 21 },
      { name: 'Hari Bumi', m: 3, d: 22 },
      { name: 'Hari Buruh Internasional', m: 4, d: 1 },
      { name: 'Hari Pendidikan Nasional', m: 4, d: 2 },
      { name: 'Hari Kebangkitan Nasional', m: 4, d: 20 },
      { name: 'Hari Lahir Pancasila', m: 5, d: 1 },
      { name: 'Hari Lingkungan Hidup', m: 5, d: 5 },
      { name: 'Hari Bhayangkara', m: 6, d: 1 },
      { name: 'Hari Anak Nasional', m: 6, d: 23 },
      { name: 'Hari Pramuka', m: 7, d: 14 },
      { name: 'HUT Kemerdekaan RI', m: 7, d: 17 },
      { name: 'Hari Maritim Nasional', m: 7, d: 21 },
      { name: 'Hari Palang Merah Indonesia', m: 8, d: 17 },
      { name: 'Hari Tani Nasional', m: 8, d: 24 },
      { name: 'Hari Kesaktian Pancasila', m: 9, d: 1 },
      { name: 'Hari Batik Nasional', m: 9, d: 2 },
      { name: 'Hari TNI', m: 9, d: 5 },
      { name: 'Hari Santri Nasional', m: 9, d: 22 },
      { name: 'Hari Sumpah Pemuda', m: 9, d: 28 },
      { name: 'Hari Pahlawan', m: 10, d: 10 },
      { name: 'Hari Ayah Nasional', m: 10, d: 12 },
      { name: 'Hari Guru Nasional', m: 10, d: 25 },
      { name: 'Hari KORPRI', m: 10, d: 29 },
      { name: 'Hari Hak Asasi Manusia', m: 11, d: 10 },
      { name: 'Hari Ibu', m: 11, d: 22 },
      { name: 'Hari Raya Natal', m: 11, d: 25 },
    ];

    const movingHolidays = [
      { name: 'Isra Mikraj', date: new Date(2024, 1, 8) },
      { name: 'Tahun Baru Imlek', date: new Date(2024, 1, 10) },
      { name: 'Hari Suci Nyepi', date: new Date(2024, 2, 11) },
      { name: 'Wafat Yesus Kristus', date: new Date(2024, 2, 29) },
      { name: 'Hari Paskah', date: new Date(2024, 2, 31) },
      { name: 'Hari Raya Idul Fitri', date: new Date(2024, 3, 10) },
      { name: 'Hari Raya Idul Fitri', date: new Date(2024, 3, 11) },
      { name: 'Kenaikan Yesus Kristus', date: new Date(2024, 4, 9) },
      { name: 'Hari Raya Waisak', date: new Date(2024, 4, 23) },
      { name: 'Hari Raya Idul Adha', date: new Date(2024, 5, 17) },
      { name: 'Tahun Baru Islam', date: new Date(2024, 6, 7) },
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2024, 8, 16) },

      { name: 'Isra Mikraj', date: new Date(2025, 0, 27) },
      { name: 'Tahun Baru Imlek', date: new Date(2025, 0, 29) },
      { name: 'Hari Suci Nyepi', date: new Date(2025, 2, 29) },
      { name: 'Hari Raya Idul Fitri', date: new Date(2025, 2, 31) },
      { name: 'Hari Raya Idul Fitri', date: new Date(2025, 3, 1) },
      { name: 'Wafat Yesus Kristus', date: new Date(2025, 3, 18) },
      { name: 'Hari Paskah', date: new Date(2025, 3, 20) },
      { name: 'Hari Raya Waisak', date: new Date(2025, 4, 12) },
      { name: 'Kenaikan Yesus Kristus', date: new Date(2025, 4, 29) },
      { name: 'Hari Raya Idul Adha', date: new Date(2025, 5, 6) },
      { name: 'Tahun Baru Islam', date: new Date(2025, 5, 27) },
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2025, 8, 5) },

      { name: 'Isra Mikraj', date: new Date(2026, 0, 16) },
      { name: 'Tahun Baru Imlek', date: new Date(2026, 1, 17) },
      { name: 'Hari Suci Nyepi', date: new Date(2026, 2, 19) },
      { name: 'Hari Raya Idul Fitri', date: new Date(2026, 2, 21) },
      { name: 'Hari Raya Idul Fitri', date: new Date(2026, 2, 22) },
      { name: 'Wafat Yesus Kristus', date: new Date(2026, 3, 3) },
      { name: 'Hari Paskah', date: new Date(2026, 3, 5) },
      { name: 'Kenaikan Yesus Kristus', date: new Date(2026, 4, 14) },
      { name: 'Hari Raya Idul Adha', date: new Date(2026, 4, 27) },
      { name: 'Hari Raya Waisak', date: new Date(2026, 4, 31) },
      { name: 'Tahun Baru Islam', date: new Date(2026, 5, 16) },
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2026, 7, 25) },

      { name: 'Isra Mikraj', date: new Date(2027, 1, 5) },
      { name: 'Tahun Baru Imlek', date: new Date(2027, 1, 6) },
      { name: 'Hari Suci Nyepi', date: new Date(2027, 2, 8) },
      { name: 'Hari Raya Idul Fitri', date: new Date(2027, 2, 10) },
      { name: 'Wafat Yesus Kristus', date: new Date(2027, 2, 26) },
      { name: 'Kenaikan Yesus Kristus', date: new Date(2027, 4, 6) },
      { name: 'Hari Raya Idul Adha', date: new Date(2027, 4, 17) },
      { name: 'Hari Raya Waisak', date: new Date(2027, 4, 20) },
      { name: 'Tahun Baru Islam', date: new Date(2027, 5, 6) },
      { name: 'Maulid Nabi Muhammad SAW', date: new Date(2027, 7, 15) },
    ];

    const allEvents = [...movingHolidays];
    for (let y = currentYear - 1; y <= currentYear + 2; y++) {
      for (const h of fixedHolidays) {
        allEvents.push({ name: h.name, date: new Date(y, h.m, h.d) });
      }
    }

    let closest: { name: string; date: Date; daysLeft: number } | null = null;
    let minDiff = Infinity;

    for (const event of allEvents) {
      const diffTime = event.date.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays < minDiff) {
        minDiff = diffDays;
        closest = { ...event, daysLeft: diffDays };
      }
    }

    if (closest) {
      if (closest.daysLeft === 0) {
        return `Selamat Memperingati ${closest.name}! 🎉`;
      }
      return `${closest.name} (${closest.daysLeft} hari lagi)`;
    }
    
    return 'Pakaian Bersih, Hati Senang';
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
    setLoadedArrivalDate(null);
  };

  interface PrintReceiptData {
    notaId: number | string;
    customer: CustomerInfo;
    cart: Service[];
    total: number;
    timeStr: string;
    paymentDetails?: {
      metodeBayar?: 'CASH' | 'TRANSFER';
      saldoTerpakai?: number;
      uangDiterima?: number;
      kembalian?: number;
      excessAction?: 'CHANGE' | 'SAVE_BALANCE';
      saldoSimpananAkhir?: number;
      status?: string;
    };
  }

  const printThermalReceipt = async (
    data: PrintReceiptData,
    options?: { saveAndReset?: boolean; onSuccessMessage?: string }
  ): Promise<boolean> => {
    if (!data.cart || data.cart.length === 0) {
      showModal("Oops!", "Keranjang/layanan masih kosong.");
      return false;
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

      const OPTIONAL_PRINTER_SERVICES = [
        '000018f0-0000-1000-8000-00805f9b34fb',
        '0000e781-0000-1000-8000-00805f9b34fb',
        '49535343-fe7d-4ae5-8fa9-9fafd205e455',
        '0000ff00-0000-1000-8000-00805f9b34fb',
        '0000fff0-0000-1000-8000-00805f9b34fb',
        '0000ae30-0000-1000-8000-00805f9b34fb',
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
        '0000ff80-0000-1000-8000-00805f9b34fb',
        '0000feea-0000-1000-8000-00805f9b34fb',
        '0000af30-0000-1000-8000-00805f9b34fb',
        '0000ffe0-0000-1000-8000-00805f9b34fb',
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
      ];

      const device = await BleClient.requestDevice({
        optionalServices: OPTIONAL_PRINTER_SERVICES,
      });

      showModal("Mencetak...", `Menghubungkan ke printer ${device.name || 'Bluetooth'}...`);
      await BleClient.connect(device.deviceId, undefined, { timeout: 15000 });

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

      if (!targetService || !targetChar) {
        targetService = '000018f0-0000-1000-8000-00805f9b34fb';
        targetChar = '00002af1-0000-1000-8000-00805f9b34fb';
      }

      const printTime = (data.timeStr || currentTime).replace(' pukul ', ' ').substring(0, 32);
      
      let text = "\x1B\x40\x1B\x61\x01\x1B\x45\x01LAUNDRY TANTE TIKA\n\x1B\x45\x00";
      text += "Jl. Zamrud Depan Gg. Zamrud 2\nRT 42, Bontang Selatan\n";
      text += "WA: +62 851-6994-9219\n\n";
      text += "--------------------------------\n\x1B\x61\x00";
      
      const padR = (str: string, len: number) => (str || "-").substring(0, len).padEnd(len, ' ');
      const formatTwoCols = (left: string, right: string, maxLen: number = 32) => {
        const leftStr = left.substring(0, maxLen - right.length - 1);
        const spaces = Math.max(1, maxLen - leftStr.length - right.length);
        return leftStr + " ".repeat(spaces) + right;
      };
      
      text += padR("Nota : #LT-" + data.notaId, 32) + "\n";
      text += padR("Tgl  : " + printTime, 32) + "\n";
      text += padR("Nama : " + (data.customer.name || '-'), 32) + "\n";
      text += padR("Alm  : " + (data.customer.address || '-'), 32) + "\n";
      text += padR("WA   : " + (data.customer.phone || '-'), 32) + "\n";
      text += "--------------------------------\n";

      data.cart.forEach(i => {
        text += padR(i.name, 32) + "\n";
        let qtyText = i.qty + " " + (i.unit || '').toUpperCase();
        let priceText = "Rp " + i.price.toLocaleString('id-ID');
        let subtotalText = "Rp " + i.subtotal.toLocaleString('id-ID');
        
        let detailLine = qtyText + " x " + priceText;
        let spacesNeeded = 32 - detailLine.length - subtotalText.length - 3;
        if (spacesNeeded < 0) spacesNeeded = 0;
        
        text += detailLine + " = " + " ".repeat(spacesNeeded) + subtotalText + "\n";
      });

      text += "--------------------------------\n";
      text += formatTwoCols("TOTAL TAGIHAN", "Rp " + data.total.toLocaleString('id-ID')) + "\n";

      const pd = data.paymentDetails;
      if (pd) {
        if (pd.metodeBayar) {
          const metodeLabel = pd.metodeBayar === 'TRANSFER' ? 'TRANSFER (TF)' : 'CASH (TUNAI)';
          text += formatTwoCols("METODE BAYAR", metodeLabel) + "\n";
        }

        if (pd.saldoTerpakai && pd.saldoTerpakai > 0) {
          text += formatTwoCols("POTONG SALDO", "-Rp " + pd.saldoTerpakai.toLocaleString('id-ID')) + "\n";
          const sisaTagihan = Math.max(0, data.total - pd.saldoTerpakai);
          text += formatTwoCols("SISA TAGIHAN", "Rp " + sisaTagihan.toLocaleString('id-ID')) + "\n";
        }

        if (pd.uangDiterima && pd.uangDiterima > 0) {
          text += formatTwoCols("UANG DITERIMA", "Rp " + pd.uangDiterima.toLocaleString('id-ID')) + "\n";
        }

        if (pd.kembalian && pd.kembalian > 0) {
          if (pd.excessAction === 'SAVE_BALANCE') {
            text += formatTwoCols("UANG LEBIH", "Rp " + pd.kembalian.toLocaleString('id-ID')) + "\n";
            text += formatTwoCols("PERLAKUAN", "DISIMPAN KE SALDO") + "\n";
            if (pd.saldoSimpananAkhir !== undefined && pd.saldoSimpananAkhir > 0) {
              text += formatTwoCols("SISA SALDO PLG", "Rp " + pd.saldoSimpananAkhir.toLocaleString('id-ID')) + "\n";
            }
          } else {
            text += formatTwoCols("PENGANGSULAN", "Rp " + pd.kembalian.toLocaleString('id-ID') + " (TUNAI)") + "\n";
            if (pd.saldoSimpananAkhir !== undefined && pd.saldoSimpananAkhir > 0) {
              text += formatTwoCols("SISA SALDO PLG", "Rp " + pd.saldoSimpananAkhir.toLocaleString('id-ID')) + "\n";
            }
          }
        } else if (pd.saldoSimpananAkhir !== undefined && pd.saldoSimpananAkhir > 0) {
          text += formatTwoCols("SISA SALDO PLG", "Rp " + pd.saldoSimpananAkhir.toLocaleString('id-ID')) + "\n";
        }

        const finalStatus = pd.status || data.customer.status || 'LUNAS';
        text += formatTwoCols("STATUS BAYAR", finalStatus) + "\n";
      } else {
        text += formatTwoCols("STATUS BAYAR", data.customer.status || 'BELUM LUNAS') + "\n";
      }

      text += formatTwoCols("METODE PENGIRIMAN", data.customer.delivery || 'AMBIL SENDIRI') + "\n";
      text += "--------------------------------\n";

      if (pd && pd.saldoSimpananAkhir && pd.saldoSimpananAkhir > 0) {
        text += "\x1B\x61\x01* Saldo Rp " + pd.saldoSimpananAkhir.toLocaleString('id-ID') + " *\ntersimpan untuk cucian berikutnya\n--------------------------------\n\x1B\x61\x00";
      }

      text += "\x1B\x61\x01PAKAIAN BERSIH, HATI SENANG\n";
      if (upcomingEventText && upcomingEventText !== 'Pakaian Bersih Hati Senang') {
        const printEventText = upcomingEventText.replace(/[^\x00-\x7F]/g, "").trim();
        text += printEventText.toUpperCase() + "\n";
      }
      text += "\x0A\x0A\x0A\x0A";

      const encoder = new TextEncoder();
      const dataEncoded = encoder.encode(text);
      const chunkSize = 20;
      for (let i = 0; i < dataEncoded.length; i += chunkSize) {
        const chunk = dataEncoded.slice(i, i + chunkSize);
        const dataView = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        if (isWithoutResponse) {
          await BleClient.writeWithoutResponse(device.deviceId, targetService, targetChar, dataView);
        } else {
          await BleClient.write(device.deviceId, targetService, targetChar, dataView);
        }
        await new Promise(r => setTimeout(r, 25));
      }

      await new Promise(r => setTimeout(r, 300));
      try {
        await BleClient.disconnect(device.deviceId);
      } catch (dcErr) {
        console.warn("Disconnect note:", dcErr);
      }

      if (options?.saveAndReset) {
        saveToHistory();
        resetForm();
      }

      showModal("Berhasil Mencetak ✅", options?.onSuccessMessage || "Nota thermal telah dicetak. Transaksi telah disimpan di riwayat.");
      return true;
    } catch (error: any) {
      const msg = error?.message || String(error);
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('closed')) {
        return false;
      }
      showModal("Gagal Mencetak", `Pastikan Bluetooth & Lokasi (GPS) HP aktif serta Printer Bluetooth sudah menyala.\n\nDetail: ${msg}`);
      return false;
    }
  };

  const handlePrint = async () => {
    // Cari data pembayaran jika nota ini sebelumnya pernah dilunasi di riwayat
    const existingRecord = history.find((r: any) => String(r.id) === String(notaId));
    const pd = existingRecord?.tanggalBayar ? {
      metodeBayar: existingRecord.metodeBayar,
      saldoTerpakai: existingRecord.saldoTerpakai,
      uangDiterima: existingRecord.uangDiterima,
      kembalian: existingRecord.kembalian,
      excessAction: existingRecord.excessAction,
      saldoSimpananAkhir: existingRecord.saldoSimpananAkhir,
      status: existingRecord.customer?.status || 'LUNAS'
    } : undefined;

    await printThermalReceipt({
      notaId,
      customer,
      cart,
      total,
      timeStr: loadedArrivalDate || currentTime,
      paymentDetails: pd
    }, { saveAndReset: true, onSuccessMessage: "Nota telah dicetak. Transaksi telah disimpan di riwayat." });
  };

  const handlePrintRecord = async (record: any) => {
    const pd = record.tanggalBayar || record.metodeBayar ? {
      metodeBayar: record.metodeBayar,
      saldoTerpakai: record.saldoTerpakai,
      uangDiterima: record.uangDiterima,
      kembalian: record.kembalian,
      excessAction: record.excessAction,
      saldoSimpananAkhir: record.saldoSimpananAkhir,
      status: record.customer?.status || record.status_bayar || 'LUNAS'
    } : undefined;

    await printThermalReceipt({
      notaId: record.id,
      customer: record.customer,
      cart: record.cart || record.items || [],
      total: record.total,
      timeStr: record.tanggalDatang || record.time || currentTime,
      paymentDetails: pd
    }, { saveAndReset: false, onSuccessMessage: `Struk transaksi #LT-${record.id} berhasil dicetak ulang.` });
  };

  const getBotBaseUrl = (rawIp?: string) => {
    let url = (rawIp || '').trim();
    if (!url) {
      url = DEFAULT_BOT_URL;
    }
    url = url.replace(/\/+$/, '');
    if (!/^https?:\/\//i.test(url)) {
      if (url.includes('.run.app') || url.includes('cloudrun') || url.includes('.app') || url.includes('.id') || url.includes('.com') || url.includes('.net')) {
        url = 'https://' + url;
      } else {
        url = 'http://' + url;
      }
    }
    try {
      const parsed = new URL(url);
      const isRawIpOrLocalhost = /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname) || parsed.hostname === 'localhost';
      if (isRawIpOrLocalhost && !parsed.port) {
        parsed.port = '3005';
      }
      return parsed.origin;
    } catch {
      return url;
    }
  };

  const checkBotConnection = async (customIp?: string, silent = false) => {
    const baseUrl = getBotBaseUrl(customIp !== undefined ? customIp : waBotConfig.ip);
    if (!baseUrl) {
      if (!silent) {
        setBotStatus({
          checked: true,
          connected: false,
          message: 'Alamat bot tidak tersedia.',
          qrImage: null,
          pairingCode: null
        });
      }
      return false;
    }

    if (!silent) setIsCheckingBot(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      
      let res = await fetch(`${baseUrl}/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      }).catch(() => null);

      if (!res || !res.ok) {
        res = await fetch(`${baseUrl}/api/status`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: controller.signal
        }).catch(() => null);
      }

      clearTimeout(timer);
      const data = res ? await res.json().catch(() => ({})) : {};

      const isConnected = !!(data.connected === true || data.status === 'connected' || data.connected === 'true' || res?.ok);
      const botNum = data.botNumber || data.phone || data.number || '';
      const botName = data.name || data.pushname || '';

      if (res && res.ok && isConnected) {
        setBotStatus({
          checked: true,
          connected: true,
          botNumber: botNum,
          botName: botName,
          qrImage: null,
          pairingCode: null,
          message: `Bot Aktif & Siap (+${botNum || 'Terhubung'}${botName ? ` • ${botName}` : ''})`
        });
        return true;
      } else {
        setBotStatus(prev => ({
          checked: true,
          connected: false,
          botNumber: null,
          qrImage: data.qrImage || null,
          pairingCode: data.pairingCode || prev.pairingCode || null,
          message: data.message || (data.qrImage
            ? 'Server Bot Aktif! Silakan Scan QR di bawah atau gunakan Kode 8 Digit.'
            : 'Server Bot sedang standby/menyiapkan koneksi WhatsApp...')
        }));
        return false;
      }
    } catch {
      if (!silent) {
        setBotStatus({
          checked: true,
          connected: false,
          qrImage: null,
          pairingCode: null,
          message: 'Server Bot offline. Transaksi kasir otomatis beralih ke WhatsApp biasa (wa.me).'
        });
      }
      return false;
    } finally {
      if (!silent) setIsCheckingBot(false);
    }
  };

  useEffect(() => {
    if (waBotConfig.enabled) {
      checkBotConnection(waBotConfig.ip || DEFAULT_BOT_URL, true);
    }
  }, []);

  useEffect(() => {
    if (!showBotModal) return;
    checkBotConnection(waBotConfig.ip || DEFAULT_BOT_URL, true);
    const interval = setInterval(() => {
      checkBotConnection(waBotConfig.ip || DEFAULT_BOT_URL, true);
    }, 4000);
    return () => clearInterval(interval);
  }, [showBotModal, waBotConfig.ip]);

  const handleRequestPairingCode = async () => {
    const baseUrl = getBotBaseUrl(waBotConfig.ip);
    if (!baseUrl) {
      showModal('IP Kosong', 'Masukkan IP STB WiFi rumah terlebih dahulu.');
      return;
    }
    if (!pairingPhoneInput.trim()) {
      showModal('Nomor Kosong', 'Masukkan nomor WhatsApp yang akan dijadikan Bot Laundry.');
      return;
    }

    setIsRequestingCode(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${baseUrl}/pair-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: pairingPhoneInput.trim() }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.code) {
        setBotStatus(prev => ({
          ...prev,
          checked: true,
          pairingCode: data.code,
          message: `Kode 8 Digit siap! Masukkan di WhatsApp (+${data.phone})`
        }));
      } else {
        showModal('Gagal Minta Kode', data.error || 'Klik tombol Reset Sesi lalu coba lagi.');
      }
    } catch {
      showModal('Gagal Terhubung', 'Pastikan IP STB benar dan script bot-stb terbaru sudah dijalankan di STB.');
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleResetBotSession = async () => {
    const baseUrl = getBotBaseUrl(waBotConfig.ip);
    if (!baseUrl) return;

    setIsCheckingBot(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      await fetch(`${baseUrl}/logout`, {
        method: 'POST',
        signal: controller.signal
      });
      clearTimeout(timer);
      setBotStatus({
        checked: true,
        connected: false,
        botNumber: null,
        qrImage: null,
        pairingCode: null,
        message: 'Sesi direset. Menyiapkan QR Code baru dalam 3 detik...'
      });
      setTimeout(() => checkBotConnection(waBotConfig.ip), 2500);
    } catch {
      showModal('Gagal Reset', 'Tidak dapat menghubungi STB Armbian.');
    } finally {
      setIsCheckingBot(false);
    }
  };

  // Fungsi yang dijalankan saat tombol "Kirim ke WhatsApp" ditekan
  const kirimNotaKeServerBot = async (dataPesanan: any) => {
    const SERVER_BOT_URL = getBotBaseUrl(waBotConfig.ip) || DEFAULT_BOT_URL;
    const delivery = dataPesanan?.pengiriman || customer.delivery || 'ANTAR JEMPUT';
    const caption = getWACaption(delivery);

    const payload: PesananPayload = {
      no_nota: dataPesanan?.no_nota || `LT-${notaId}`,
      nama_pelanggan: dataPesanan?.nama_pelanggan || (customer.name.trim() ? customer.name.toUpperCase() : 'PELANGGAN'),
      nomor_wa: dataPesanan?.nomor_wa || customer.phone.replace(/[^0-9]/g, ''),
      alamat: dataPesanan?.alamat || (customer.address.trim() ? customer.address.toUpperCase() : 'ZAMRUD'),
      rincian: dataPesanan?.rincian || (
        cart.length > 0 
          ? cart.map(i => ({
              nama_layanan: i.name,
              qty: `${i.qty} ${i.unit.toUpperCase()}`,
              harga_satuan: i.price,
              subtotal: i.subtotal
            }))
          : [
              {
                nama_layanan: "SETRIKA (KILOAN)",
                qty: "4.45 KG",
                harga_satuan: 5000,
                subtotal: 22250
              }
            ]
      ),
      total: dataPesanan?.total !== undefined ? dataPesanan.total : (total || 22250),
      status_bayar: dataPesanan?.status_bayar || dataPesanan?.status || customer.status || "BELUM LUNAS",
      pengiriman: delivery,
      caption: dataPesanan?.caption || caption,
      catatan_footer: dataPesanan?.catatan_footer || upcomingEventText || "Hari Sumpah Pemuda (1 hari lagi)"
    };

    try {
      const response = await fetch(`${SERVER_BOT_URL}/api/laundry/kirim-nota`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const hasil = await response.json().catch(() => ({ success: response.ok }));
      if (hasil.success) {
        showModal("Nota Terkirim ✅", "✅ Nota berhasil dibuat di server & langsung terkirim ke WhatsApp pelanggan!");
        return true;
      } else {
        showModal("Peringatan ⚠️", "⚠️ Gagal: " + (hasil.message || "Gagal memproses nota"));
        return false;
      }
    } catch (err) {
      console.error("Gagal koneksi ke server bot:", err);
      showModal("Koneksi Gagal ❌", "❌ Tidak dapat terhubung ke Server Bot!");
      return false;
    }
  };

  useEffect(() => {
    (window as any).kirimNotaKeServerBot = kirimNotaKeServerBot;
  }, [waBotConfig.ip, customer, cart, total, notaId, upcomingEventText]);

  const sendViaBotOrFallback = async (
    cleanPhone: string, 
    textMessage: string,
    caption?: string,
    orderData?: Partial<PesananPayload>
  ): Promise<{ sentViaBot: boolean; usedFallback: boolean; serverMessage?: string }> => {
    const baseUrl = getBotBaseUrl(waBotConfig.ip) || DEFAULT_BOT_URL;
    const delivery = orderData?.pengiriman || customer.delivery || 'ANTAR JEMPUT';
    const finalCaption = caption || getWACaption(delivery);

    if (waBotConfig.enabled && baseUrl && cleanPhone) {
      setIsSendingWA(true);
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 20000);

        const structuredPayload: PesananPayload = {
          no_nota: orderData?.no_nota || `LT-${notaId}`,
          nama_pelanggan: orderData?.nama_pelanggan || (customer.name.trim() ? customer.name.toUpperCase() : '-'),
          nomor_wa: orderData?.nomor_wa || cleanPhone,
          alamat: orderData?.alamat || (customer.address.trim() ? customer.address.toUpperCase() : '-'),
          rincian: orderData?.rincian || cart.map(item => ({
            nama_layanan: item.name,
            qty: `${item.qty} ${item.unit.toUpperCase()}`,
            harga_satuan: item.price,
            subtotal: item.subtotal
          })),
          total: orderData?.total !== undefined ? orderData.total : total,
          status_bayar: orderData?.status_bayar || customer.status || 'BELUM LUNAS',
          pengiriman: delivery,
          caption: finalCaption,
          catatan_footer: orderData?.catatan_footer || upcomingEventText || 'Pakaian Bersih, Hati Senang',
          phone: cleanPhone,
          message: textMessage
        };

        const res = await fetch(`${baseUrl}/api/laundry/kirim-nota`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(structuredPayload),
          signal: controller.signal
        }).catch(() => null);

        clearTimeout(timer);

        if (res && res.ok) {
          const data = await res.json().catch(() => ({ success: true }));
          if (data.success !== false) {
            setIsSendingWA(false);
            return { 
              sentViaBot: true, 
              usedFallback: false, 
              serverMessage: data.message
            };
          }
        }
      } catch (err) {
        console.warn('Server Bot WhatsApp tidak terjangkau, otomatis beralih ke WhatsApp biasa (wa.me):', err);
      }
      setIsSendingWA(false);

      const fallbackText = `${finalCaption}\n\n${textMessage}`;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(fallbackText)}`, '_blank');
      return { sentViaBot: false, usedFallback: true };
    }

    const manualText = `${finalCaption}\n\n${textMessage}`;
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(manualText)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(manualText)}`, '_blank');
    }
    return { sentViaBot: false, usedFallback: false };
  };

  const handleTestBotMessage = async () => {
    const targetRaw = testPhoneInput.trim() || customer.phone.trim();
    let cleanPhone = targetRaw.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);

    if (!cleanPhone) {
      showModal('Nomor Kosong', 'Masukkan nomor WhatsApp tujuan tes terlebih dahulu.');
      return;
    }

    const baseUrl = getBotBaseUrl(waBotConfig.ip) || DEFAULT_BOT_URL;
    setIsCheckingBot(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      
      const testPayload = {
        phone: cleanPhone,
        message: `*TES BOT WHATSAPP LAUNDRY TANTE TIKA* ✅\n\nKoneksi antara Aplikasi Kasir dan Server Bot WhatsApp (${baseUrl}) telah terhubung & aktif!`,
        caption: getWACaption('ANTAR JEMPUT'),
        no_nota: `LT-${notaId}`,
        nama_pelanggan: 'TES KONEKSI BOT',
        nomor_wa: cleanPhone,
        alamat: 'ZAMRUD',
        rincian: [
          {
            nama_layanan: 'TES SISTEM BOT',
            qty: '1 PCS',
            harga_satuan: 0,
            subtotal: 0
          }
        ],
        total: 0,
        status_bayar: 'LUNAS',
        pengiriman: 'ANTAR JEMPUT',
        catatan_footer: 'Koneksi Berhasil'
      };

      const res = await fetch(`${baseUrl}/api/laundry/kirim-nota`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timer);
      const data = res ? await res.json().catch(() => ({})) : {};
      if (res && res.ok && data.success !== false) {
        setBotStatus(prev => ({
          ...prev,
          checked: true,
          connected: true,
          botNumber: data.botNumber || prev.botNumber,
          message: `Tes kirim berhasil ke +${cleanPhone}`
        }));
        showModal('Berhasil Terkirim!', `Pesan tes berhasil dikirim otomatis oleh Server Bot WhatsApp (${baseUrl}) ke nomor +${cleanPhone}.`);
      } else {
        showModal('Gagal Kirim Bot', data.error || data.message || 'Server Bot belum terhubung ke WhatsApp. Cek status bot.');
      }
    } catch {
      showModal('Gagal Terhubung', `Tidak dapat menghubungi server bot di ${baseUrl}. Transaksi kasir tetap aman menggunakan fallback WA.`);
    } finally {
      setIsCheckingBot(false);
    }
  };

  const handleSaveOnly = () => {
    if (cart.length === 0) {
      showModal("Oops!", "Keranjang masih kosong, pilih layanan terlebih dahulu.");
      return;
    }
    const currentId = notaId;
    saveToHistory();
    resetForm();
    showModal("Berhasil Disimpan ✅", `Transaksi #LT-${currentId} telah berhasil dicatat ke Riwayat Transaksi.`);
  };

  const handleWA = async () => {
    if (cart.length === 0) {
      showModal("Gagal", "Layanan harus diisi sebelum mengirim nota!");
      return;
    }

    let detailLayanan = "";
    cart.forEach(i => {
      detailLayanan += `▪️ *${i.name.toUpperCase()}*\n   ${i.qty} ${i.unit.toUpperCase()} x Rp ${i.price.toLocaleString()} = Rp ${i.subtotal.toLocaleString()}\n`;
    });

    const caption = getWACaption(customer.delivery);
    const orderDateDisplay = (loadedArrivalDate || currentTime).replace(' pukul ', ' ');

    const text = `*LAUNDRY TANTE TIKA*
Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan
WA: 0851-6994-9219

_Nota #LT-${notaId}_
🗓️ *Waktu Masuk:* ${orderDateDisplay}

👤 *Nama:* ${customer.name.toUpperCase() || '-'}
📍 *Alamat:* ${customer.address.toUpperCase() || '-'}

📦 *RINCIAN PESANAN:*
${detailLayanan}➖➖➖➖➖➖➖➖➖➖
💳 *TOTAL:* *Rp ${total.toLocaleString()}*
🏷️ *STATUS:* *${customer.status}*
🚚 *PENGIRIMAN:* ${customer.delivery}
➖➖➖➖➖➖➖➖➖➖

_"PAKAIAN BERSIH, HATI SENANG"_
*${upcomingEventText}*`;

    let cleanPhone = customer.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);

    const orderPayload: Partial<PesananPayload> = {
      no_nota: `LT-${notaId}`,
      nama_pelanggan: customer.name.trim() ? customer.name.toUpperCase() : '-',
      nomor_wa: cleanPhone,
      alamat: customer.address.trim() ? customer.address.toUpperCase() : '-',
      rincian: cart.map(i => ({
        nama_layanan: i.name,
        qty: `${i.qty} ${i.unit.toUpperCase()}`,
        harga_satuan: i.price,
        subtotal: i.subtotal
      })),
      total: total,
      status_bayar: customer.status || 'BELUM LUNAS',
      pengiriman: customer.delivery || 'ANTAR JEMPUT',
      caption: caption,
      catatan_footer: upcomingEventText || 'Hari Sumpah Pemuda (1 hari lagi)'
    };

    const result = await sendViaBotOrFallback(cleanPhone, text, caption, orderPayload);

    // Tanggal Kirim WA / Pengantaran dicatat saat kirim nota ke WhatsApp
    const now = new Date();
    const tanggalAntar = now.toLocaleString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).replace('.', ':');

    saveToHistory({ tanggalAntar });
    resetForm();

    if (result.sentViaBot) {
      showModal("Nota Terkirim Otomatis ✅", result.serverMessage || "Nota berhasil dibuat di server & langsung terkirim ke WhatsApp pelanggan!");
    } else if (result.usedFallback) {
      showModal("Dialihkan ke WA Biasa", "Server Bot sedang offline/tidak terjangkau, nota transaksi otomatis dialihkan membuka aplikasi WhatsApp biasa.");
    } else {
      showModal("Berhasil", "Nota telah diteruskan ke WhatsApp dan transaksi disimpan di riwayat.");
    }
  };

  const openPaymentModal = (record: any, idx: number) => {
    const existingBalance = getCustomerBalance(record.customer?.name, record.customer?.phone);
    const initialUseBalance = existingBalance > 0;
    const initialRemaining = initialUseBalance ? Math.max(0, record.total - existingBalance) : record.total;

    setPaymentModal({
      visible: true,
      record,
      recordIndex: idx,
      paymentMethod: record.metodeBayar || 'CASH',
      useBalance: initialUseBalance,
      inputAmount: initialRemaining === 0 ? '0' : String(initialRemaining),
      excessAction: 'CHANGE'
    });
  };

  const handleExecutePayment = async () => {
    const record = paymentModal.record;
    if (!record) return;
    const idx = paymentModal.recordIndex;
    const customerName = record.customer?.name?.trim() ? record.customer.name.trim() : 'Pelanggan';
    const now = new Date();
    const sapaanWord = getGreetingTimeWord(now);
    const dateStr = now.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const jamStr = now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    }).replace('.', ':');
    const tanggalBayarFull = `${dateStr} pukul ${jamStr}`;
    const totalFormatted = record.total.toLocaleString('id-ID');

    // Perhitungan Saldo, Uang Diterima & Pengangsulan
    const existingCustBal = getCustomerBalance(record.customer?.name, record.customer?.phone);
    const saldoDigunakan = (paymentModal.useBalance && existingCustBal > 0)
      ? Math.min(record.total, existingCustBal)
      : 0;
    const sisaTagihan = Math.max(0, record.total - saldoDigunakan);
    const nominalBayar = sisaTagihan === 0 ? 0 : (parseFloat(paymentModal.inputAmount) || 0);
    const selisihUang = nominalBayar - sisaTagihan;
    const kembalianTunai = (selisihUang > 0 && paymentModal.excessAction === 'CHANGE') ? selisihUang : 0;
    const saldoBaruSimpanan = (existingCustBal - saldoDigunakan) + 
      (selisihUang > 0 && paymentModal.excessAction === 'SAVE_BALANCE' ? selisihUang : 0);

    // Update Saldo Pelanggan
    updateCustomerBalance(customerName, record.customer?.phone, saldoBaruSimpanan);

    // Update status transaksi di riwayat menjadi LUNAS dan catat tanggal bayar serta rincian bayar (JANGAN HAPUS DATA)
    const updatedRecord = {
      ...record,
      customer: {
        ...record.customer,
        status: 'LUNAS' as const
      },
      status_bayar: 'LUNAS',
      tanggalBayar: tanggalBayarFull,
      metodeBayar: paymentModal.paymentMethod,
      uangDiterima: nominalBayar,
      kembalian: selisihUang > 0 ? selisihUang : 0,
      excessAction: paymentModal.excessAction,
      saldoTerpakai: saldoDigunakan,
      saldoSimpananAkhir: saldoBaruSimpanan
    };

    setHistory(prev => {
      const next = [...prev];
      const targetIndex = next.findIndex(r => String(r.id) === String(record.id));
      if (targetIndex >= 0) {
        next[targetIndex] = updatedRecord;
      } else {
        next[idx] = updatedRecord;
      }
      return next;
    });

    if (String(notaId) === String(record.id)) {
      setCustomer(prev => ({ ...prev, status: 'LUNAS' }));
    }

    // Format konfirmasi pembayaran LUNAS sesuai instruksi user
    let message = `Selamat ${sapaanWord}, Kak ${customerName}.
Kami dari Laundry Tante Tika mau mengonfirmasi bahwa pembayaran cucian Kak sebesar Rp ${totalFormatted} sudah kami terima pada tanggal ${dateStr} pukul ${jamStr}. Dengan ini status pembayaran LUNAS.

🧾 Rincian Pembayaran:
• No. Nota: #LT-${record.id}
• Total Tagihan: Rp ${totalFormatted}
• Metode Bayar: ${paymentModal.paymentMethod === 'TRANSFER' ? 'TRANSFER (TF)' : 'CASH (Tunai)'}`;

    if (saldoDigunakan > 0) {
      message += `\n• Saldo Terpakai: Rp ${saldoDigunakan.toLocaleString('id-ID')}`;
    }
    if (nominalBayar > 0) {
      message += `\n• Uang Diterima: Rp ${nominalBayar.toLocaleString('id-ID')}`;
    }
    if (kembalianTunai > 0) {
      message += `\n• Kembalian Tunai (Pengangsulan): Rp ${kembalianTunai.toLocaleString('id-ID')}`;
    }
    if (saldoBaruSimpanan > 0) {
      message += `\n• Sisa Saldo Simpanan Kakak: Rp ${saldoBaruSimpanan.toLocaleString('id-ID')} (Tersimpan untuk cucian berikutnya)`;
    }

    message += `\n\nTerima kasih banyak atas kepercayaannya mencuci di Laundry Tante Tika! 🙏✨`;

    // Tutup popup pembayaran
    setPaymentModal(prev => ({ ...prev, visible: false }));

    let cleanPhone = record.customer?.phone ? record.customer.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);

    const baseUrl = getBotBaseUrl(waBotConfig.ip) || DEFAULT_BOT_URL;
    const deliveryType = record.customer?.delivery || 'AMBIL SENDIRI';

    if (waBotConfig.enabled && baseUrl && cleanPhone) {
      setIsSendingWA(true);
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);

        let botSuccess = false;
        let serverMessage = '';

        // Coba kirim via endpoint /send terlebih dahulu
        try {
          const sendRes = await fetch(`${baseUrl}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: cleanPhone,
              message: message,
              caption: `Konfirmasi Pembayaran LUNAS #LT-${record.id}`
            }),
            signal: controller.signal
          });
          if (sendRes.ok) {
            const sendData = await sendRes.json().catch(() => ({ success: true }));
            if (sendData.success !== false) {
              botSuccess = true;
              serverMessage = sendData.message || 'Konfirmasi pembayaran berhasil dikirim via bot!';
            }
          }
        } catch {
          // Lanjut ke percobaan berikutnya
        }

        // Jika /send belum berhasil, coba via /api/laundry/kirim-nota
        if (!botSuccess) {
          const confirmOrderPayload: Partial<PesananPayload> = {
            no_nota: `LT-${record.id}`,
            nama_pelanggan: customerName,
            nomor_wa: cleanPhone,
            alamat: record.customer?.address || '-',
            rincian: (record.cart || record.items || []).map((item: any) => ({
              nama_layanan: item.name,
              qty: `${item.qty} ${(item.unit || '').toUpperCase()}`,
              harga_satuan: item.price,
              subtotal: item.subtotal || (item.price * item.qty)
            })),
            total: record.total,
            status_bayar: 'LUNAS',
            pengiriman: deliveryType,
            caption: message,
            phone: cleanPhone,
            message: message,
            catatan_footer: 'Pembayaran LUNAS'
          };

          const notaRes = await fetch(`${baseUrl}/api/laundry/kirim-nota`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(confirmOrderPayload),
            signal: controller.signal
          }).catch(() => null);

          if (notaRes && notaRes.ok) {
            const notaData = await notaRes.json().catch(() => ({ success: true }));
            if (notaData.success !== false) {
              botSuccess = true;
              serverMessage = notaData.message || 'Konfirmasi LUNAS terkirim via bot!';
            }
          }
        }

        clearTimeout(timer);
        setIsSendingWA(false);

        if (botSuccess) {
          showModal(
            "Pembayaran LUNAS Terkirim ✅",
            `Konfirmasi pembayaran LUNAS untuk Kak ${customerName} berhasil dikirim via Bot WhatsApp!\n\nMetode: ${paymentModal.paymentMethod === 'TRANSFER' ? 'Transfer' : 'Cash'}\n${kembalianTunai > 0 ? `Pengangsulan Tunai: Rp ${kembalianTunai.toLocaleString('id-ID')}\n` : ''}${saldoBaruSimpanan > 0 ? `Sisa Saldo Simpanan: Rp ${saldoBaruSimpanan.toLocaleString('id-ID')}` : ''}`
          );
          return;
        }
      } catch (err) {
        console.warn('Bot gagal mengirim, otomatis beralih ke WhatsApp:', err);
      }
      setIsSendingWA(false);

      // Fallback ke WhatsApp Biasa
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      showModal(
        "Pembayaran LUNAS ✅",
        `Status transaksi #LT-${record.id} telah diubah menjadi LUNAS (Tgl Bayar: ${tanggalBayarFull}). Pesan konfirmasi dibuka di WhatsApp biasa karena Server Bot sedang offline.`
      );
      return;
    }

    // Jika bot nonaktif atau fallback umum
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    }

    showModal(
      "Pembayaran LUNAS ✅",
      `Status transaksi #LT-${record.id} telah diubah menjadi LUNAS (Tgl Bayar: ${tanggalBayarFull}) dan pesan konfirmasi telah disiapkan di WhatsApp.`
    );
  };

  const handlePrintFromModal = async () => {
    if (!paymentModal.record) return;
    const rec = paymentModal.record;
    const existingCustBal = getCustomerBalance(rec.customer?.name, rec.customer?.phone);
    const canUseBal = existingCustBal > 0;
    const sldPakai = (paymentModal.useBalance && canUseBal) ? Math.min(rec.total, existingCustBal) : 0;
    const sisaTagihan = Math.max(0, rec.total - sldPakai);
    const nomBayar = sisaTagihan === 0 ? 0 : (parseFloat(paymentModal.inputAmount) || 0);
    const selisih = nomBayar - sisaTagihan;
    const kembalian = selisih > 0 ? selisih : 0;
    const saldoAkhir = (existingCustBal - sldPakai) + (selisih > 0 && paymentModal.excessAction === 'SAVE_BALANCE' ? selisih : 0);

    await printThermalReceipt({
      notaId: rec.id,
      customer: rec.customer,
      cart: rec.cart || rec.items || [],
      total: rec.total,
      timeStr: rec.tanggalDatang || rec.time || currentTime,
      paymentDetails: {
        metodeBayar: paymentModal.paymentMethod,
        saldoTerpakai: sldPakai,
        uangDiterima: nomBayar,
        kembalian: kembalian,
        excessAction: paymentModal.excessAction,
        saldoSimpananAkhir: saldoAkhir,
        status: 'LUNAS'
      }
    }, { saveAndReset: false, onSuccessMessage: `Struk pembayaran #LT-${rec.id} berhasil dicetak!` });
  };

  const handlePrintAndConfirmPayment = async () => {
    if (!paymentModal.record) return;
    const rec = paymentModal.record;
    const existingCustBal = getCustomerBalance(rec.customer?.name, rec.customer?.phone);
    const canUseBal = existingCustBal > 0;
    const sldPakai = (paymentModal.useBalance && canUseBal) ? Math.min(rec.total, existingCustBal) : 0;
    const sisaTagihan = Math.max(0, rec.total - sldPakai);
    const nomBayar = sisaTagihan === 0 ? 0 : (parseFloat(paymentModal.inputAmount) || 0);
    const selisih = nomBayar - sisaTagihan;
    const kembalian = selisih > 0 ? selisih : 0;
    const saldoAkhir = (existingCustBal - sldPakai) + (selisih > 0 && paymentModal.excessAction === 'SAVE_BALANCE' ? selisih : 0);

    const printed = await printThermalReceipt({
      notaId: rec.id,
      customer: rec.customer,
      cart: rec.cart || rec.items || [],
      total: rec.total,
      timeStr: rec.tanggalDatang || rec.time || currentTime,
      paymentDetails: {
        metodeBayar: paymentModal.paymentMethod,
        saldoTerpakai: sldPakai,
        uangDiterima: nomBayar,
        kembalian: kembalian,
        excessAction: paymentModal.excessAction,
        saldoSimpananAkhir: saldoAkhir,
        status: 'LUNAS'
      }
    }, { saveAndReset: false, onSuccessMessage: `Struk pembayaran #LT-${rec.id} berhasil dicetak!` });

    // Jalankan konfirmasi pelunasan dan pengiriman WhatsApp jika cetak tidak dibatalkan
    if (printed !== false) {
      await handleExecutePayment();
    }
  };

  return (
    <div className="min-h-screen pb-36 bg-slate-100/60 relative z-0 selection:bg-teal-500 selection:text-white">
      {/* Header Kasir Butik */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl shadow-xs border border-slate-200/80 p-1 overflow-hidden shrink-0">
              <img src={LOGO_URL} className="w-full h-full object-contain" alt="Logo Laundry Tante Tika" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">POS Kasir</span>
                <span className="text-slate-300">·</span>
                <span className={`text-[10px] font-semibold flex items-center gap-1 ${isOnline ? 'text-teal-700' : 'text-rose-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-teal-500' : 'bg-rose-500'}`} />
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <h1 className="text-sm font-extrabold tracking-tight text-slate-900 leading-none mt-0.5">Laundry Tante Tika</h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setShowBotModal(true);
                if (waBotConfig.ip.trim()) {
                  checkBotConnection(waBotConfig.ip);
                }
              }}
              className={`h-9 px-3 rounded-lg flex items-center gap-1.5 border btn-press text-[10px] font-bold uppercase tracking-wider transition-colors ${
                waBotConfig.enabled
                  ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Pengaturan Bot WA WiFi STB"
            >
              <Wifi size={14} strokeWidth={2.5} />
              <span>{waBotConfig.enabled ? 'Bot ON' : 'Bot WA'}</span>
            </button>
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
                    setLoadedArrivalDate(null);
                    setConfirmModal(prev => ({ ...prev, visible: false }));
                  }
                });
              }}
              className="w-9 h-9 bg-white text-slate-700 hover:text-teal-700 rounded-lg flex items-center justify-center border border-slate-200 btn-press shadow-xs"
              title="Transaksi Baru"
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-9 h-9 bg-white text-slate-400 hover:text-slate-700 rounded-lg flex items-center justify-center border border-slate-200 btn-press shadow-xs"
              title="Muat Ulang"
            >
              <RotateCcw size={15} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </header>

      {/* Segmented Control Tab */}
      <div className="max-w-md mx-auto px-4 mt-3">
        <div className="bg-slate-200/70 p-1 rounded-xl flex gap-1 border border-slate-200">
          <button 
            onClick={() => setActiveTab('current')}
            className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all btn-press ${
              activeTab === 'current' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {loadedArrivalDate ? `Edit Nota #LT-${notaId}` : 'Nota Baru'}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 btn-press ${
              activeTab === 'history' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Riwayat</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
              activeTab === 'history' ? 'bg-slate-100 text-slate-800' : 'bg-slate-300/70 text-slate-700'
            }`}>
              {history.length}
            </span>
          </button>
        </div>
      </div>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <AnimatePresence mode="wait">
          {activeTab === 'current' ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-4"
            >
              {/* Banner Mode Edit Nota (Tanggal Masuk Terkunci & Aman) */}
              {loadedArrivalDate && (
                <div className="bg-amber-50/90 border border-amber-200/80 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <Clock size={16} className="text-amber-700 shrink-0" />
                    <div className="text-[10px] text-amber-950 leading-tight">
                      <p className="font-extrabold uppercase tracking-wide">Edit Transaksi #LT-{notaId}</p>
                      <p className="text-[10px] text-amber-800 mt-0.5">
                        Tgl Masuk Terkunci: <strong className="font-mono">{loadedArrivalDate}</strong>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => resetForm()}
                    className="px-2.5 py-1.5 bg-white hover:bg-amber-100 active:bg-amber-200 text-amber-900 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-amber-200 shadow-xs btn-press shrink-0"
                    title="Batal edit dan buat nota transaksi baru"
                  >
                    Batal Edit
                  </button>
                </div>
              )}

              {/* Data Pelanggan */}
              <section className="card-pos p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <User size={15} className="text-teal-600" />
                    <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Data Pelanggan</h2>
                  </div>
                  <button 
                    onClick={() => setShowCustomerList(true)} 
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 btn-press transition-colors"
                  >
                    <span>Daftar Pelanggan ({savedCustomers.length})</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* Deteksi Saldo Simpanan Pelanggan Otomatis */}
                  {(() => {
                    const custBal = getCustomerBalance(customer.name, customer.phone);
                    if (custBal > 0) {
                      return (
                        <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-xl p-3 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Wallet size={15} />
                            </div>
                            <div className="text-[11px] leading-tight">
                              <p className="font-bold uppercase tracking-wide text-emerald-950">
                                Saldo Tersimpan: <span className="font-mono font-extrabold text-emerald-700">Rp {custBal.toLocaleString('id-ID')}</span>
                              </p>
                              <p className="text-[10px] text-emerald-800 mt-0.5">
                                Otomatis dapat digunakan untuk memotong tagihan saat pelunasan.
                              </p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 bg-white text-emerald-800 rounded text-[9px] font-bold uppercase tracking-wider border border-emerald-200 shrink-0">
                            Aktif
                          </span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="NAMA PELANGGAN" 
                      value={customer.name}
                      onChange={e => setCustomer({ ...customer, name: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs uppercase text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-teal-600 transition-colors"
                    />
                    <input 
                      type="tel" 
                      placeholder="NOMOR WHATSAPP (0812...)" 
                      value={customer.phone}
                      onChange={e => setCustomer({ ...customer, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-teal-600 transition-colors font-mono"
                    />
                    <input 
                      type="text" 
                      placeholder="ALAMAT PENGANTARAN" 
                      value={customer.address}
                      onChange={e => setCustomer({ ...customer, address: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs uppercase text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-teal-600 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Nota</label>
                    <select 
                      value={customer.status}
                      onChange={e => setCustomer({ ...customer, status: e.target.value as any })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 uppercase outline-none cursor-pointer focus:bg-white focus:border-teal-600"
                    >
                      <option value="BELUM LUNAS">🔴 Belum Lunas</option>
                      <option value="LUNAS">🟢 Lunas</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Metode Pengiriman</label>
                    <select 
                      value={customer.delivery}
                      onChange={e => setCustomer({ ...customer, delivery: e.target.value as any })}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 uppercase outline-none cursor-pointer focus:bg-white focus:border-teal-600"
                    >
                      <option value="AMBIL SENDIRI">🏠 Ambil Sendiri</option>
                      <option value="ANTAR JEMPUT">🛵 Antar Jemput</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* Input Layanan */}
              <section className="card-pos p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <CheckCircle2 size={15} className="text-teal-600" />
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Pilih Layanan Laundry</h2>
                </div>

                <div className="space-y-2.5">
                  <button 
                    onClick={() => setShowServiceModal(true)}
                    className="w-full px-4 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase text-xs outline-none flex justify-between items-center transition-all btn-press shadow-xs hover:bg-slate-800"
                  >
                    <span className="flex-1 text-left truncate pr-3">
                      {selectedServiceIndex === -1
                        ? '-- PILIH LAYANAN --'
                        : flatServices[selectedServiceIndex].name}
                    </span>
                    <ChevronDown size={16} className="text-slate-400 shrink-0" />
                  </button>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="number"
                        step="any" 
                        placeholder="Jumlah / Timbangan" 
                        value={inputQty}
                        onChange={e => setInputQty(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none font-bold text-xs text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:bg-white focus:border-teal-600 transition-colors font-mono"
                      />
                    </div>
                    <div className="px-4 flex items-center justify-center bg-slate-100 border border-slate-200 rounded-lg font-bold text-xs text-slate-600 uppercase min-w-[70px] font-mono">
                      {selectedServiceIndex !== -1 ? flatServices[selectedServiceIndex].unit : 'UNIT'}
                    </div>
                  </div>

                  <button 
                    onClick={addItem}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider btn-press shadow-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus size={15} strokeWidth={2.5} />
                    <span>Tambah ke Keranjang Nota</span>
                  </button>
                </div>
              </section>

              {/* Preview Nota (Artisanal Boutique POS Receipt) */}
              <motion.div 
                layout
                className="overflow-hidden mx-auto max-w-sm bg-white rounded-2xl border border-slate-300/80 shadow-md"
                id="notaBox"
              >
                {/* Header Nota */}
                <div className="p-6 text-center border-b border-dashed border-slate-200 bg-slate-50/50">
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pb-2 border-b border-slate-100 mb-3">
                    <span className="font-bold text-slate-900 tracking-wider">#LT-{notaId}</span>
                    <span>{loadedArrivalDate || currentTime}</span>
                  </div>
                  <img src={LOGO_URL} className="w-14 h-14 mx-auto mb-2 object-contain" alt="Logo" />
                  <h3 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">Laundry Tante Tika</h3>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider mt-1 space-y-0.5">
                    <p>Jl. Zamrud Depan Gg. Zamrud 2 RT 42</p>
                    <p>Bontang Selatan, Bontang</p>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Metadata Pelanggan Unboxed */}
                  <div className="flex justify-between items-start gap-3 pb-3 border-b border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pelanggan</span>
                      <p className="text-xs font-bold text-slate-900 uppercase tracking-tight">{customer.name || 'PELANGGAN UMUM'}</p>
                      {customer.address && (
                        <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin size={10} className="text-slate-400 shrink-0" />
                          <span className="truncate max-w-[200px]">{customer.address}</span>
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                      <span className={`text-[11px] font-bold uppercase ${
                        customer.status === 'LUNAS' ? 'text-teal-700' : 'text-rose-600'
                      }`}>
                        {customer.status}
                      </span>
                    </div>
                  </div>

                  {/* Daftar Item Layanan */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                      <span>Layanan</span>
                      <span>Subtotal</span>
                    </div>
                    <AnimatePresence initial={false}>
                      {cart.length === 0 ? (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[10px] text-center text-slate-400 italic py-3"
                        >
                          Belum ada item layanan
                        </motion.p>
                      ) : (
                        cart.map((item, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex justify-between items-start text-xs group pt-1"
                          >
                            <div className="pr-2 space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <button 
                                  onClick={() => removeItem(idx)}
                                  className="text-slate-300 hover:text-rose-600 transition-colors p-0.5"
                                  title="Hapus"
                                >
                                  <Trash2 size={11} />
                                </button>
                                <span className="font-bold text-slate-800 uppercase text-[11px]">{item.name}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono ml-4">
                                {item.qty} {item.unit} × Rp {item.price.toLocaleString('id-ID')}
                              </p>
                            </div>
                            <span className="font-bold text-slate-900 font-mono shrink-0 text-[11px]">
                              Rp {item.subtotal.toLocaleString('id-ID')}
                            </span>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Total Tagihan Panel */}
                  <div className="pt-2 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pb-1">
                      <span>Metode Pengambilan</span>
                      <span className="font-bold text-slate-800 uppercase">{customer.delivery}</span>
                    </div>

                    <div className="bg-slate-900 text-white rounded-xl p-3.5 flex justify-between items-center mt-2">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Tagihan</span>
                        <span className="text-xl font-extrabold font-mono tracking-tight text-white">
                          Rp {total.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div className="text-right">
                        <Clock size={12} className="ml-auto text-slate-400 mb-0.5" />
                        <span className="text-[9px] text-slate-400 font-mono block">
                          {formatReceiptDateOnly(loadedArrivalDate || currentTime)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Slogan & Footer */}
                  <div className="text-center pt-2 space-y-1">
                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Pakaian Bersih · Hati Senang</p>
                    <div className="bg-amber-50/70 border border-amber-200/60 py-1.5 px-3 rounded-md text-center">
                      <p className="text-[9px] font-bold text-amber-900 uppercase tracking-wide">{upcomingEventText}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  50 Transaksi Terakhir
                </span>
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
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider btn-press"
                >
                  Hapus Semua
                </button>
              </div>

              {history.length === 0 ? (
                <div className="card-pos p-10 text-center border-dashed">
                  <p className="text-slate-400 text-xs font-medium">Belum ada riwayat transaksi</p>
                </div>
              ) : (
                history.map((record, idx) => {
                  const items = record.cart || record.items || [];
                  const isLunas = record.customer?.status === 'LUNAS';
                  return (
                    <div 
                      key={`${record.id}-${idx}`} 
                      className="card-pos p-4 space-y-3 transition-colors hover:border-slate-300"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 font-mono tracking-tight">#LT-{record.id}</span>
                            <span className="text-slate-300">·</span>
                            <span className={`text-[10px] font-bold uppercase ${isLunas ? 'text-teal-700' : 'text-rose-600'}`}>
                              {record.customer?.status || 'BELUM LUNAS'}
                            </span>
                            {record.customer?.delivery && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-[10px] text-slate-500 font-medium">
                                  {record.customer.delivery}
                                </span>
                              </>
                            )}
                          </div>

                          <p className="text-xs font-extrabold text-slate-900 uppercase tracking-tight">
                            {record.customer?.name?.trim() ? record.customer.name.toUpperCase() : 'PELANGGAN'}
                          </p>

                          {record.customer?.phone && (
                            <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                              <Phone size={10} className="text-slate-400" />
                              <span>{record.customer.phone}</span>
                            </p>
                          )}
                          
                          {/* Pencatatan Tiga Tanggal (Masuk, Pengantaran, Bayar) */}
                          <div className="space-y-0.5 pt-1.5 border-t border-slate-100 text-[10px]">
                            <p className="text-slate-600 flex items-center gap-1.5">
                              <Clock size={11} className="text-teal-600 shrink-0" />
                              <span><strong className="text-slate-800 font-semibold">Tgl Masuk:</strong> <span className="font-mono">{record.tanggalDatang || record.time || '-'}</span></span>
                            </p>
                            {record.tanggalAntar && (
                              <p className="text-amber-800 flex items-center gap-1.5">
                                <Truck size={11} className="text-amber-600 shrink-0" />
                                <span><strong className="text-amber-900 font-semibold">Tgl Antar:</strong> <span className="font-mono">{record.tanggalAntar}</span></span>
                              </p>
                            )}
                            {record.tanggalBayar && (
                              <div className="space-y-0.5">
                                <p className="text-teal-800 flex items-center gap-1.5">
                                  <CheckCircle2 size={11} className="text-teal-600 shrink-0" />
                                  <span><strong className="text-teal-950 font-semibold">Tgl Bayar:</strong> <span className="font-mono">{record.tanggalBayar}</span></span>
                                </p>
                                {record.metodeBayar && (
                                  <p className="text-[9px] text-slate-500 ml-4 font-mono">
                                    Via {record.metodeBayar === 'TRANSFER' ? 'Transfer' : 'Cash'}
                                    {record.uangDiterima > 0 && ` · Bayar: Rp ${record.uangDiterima.toLocaleString('id-ID')}`}
                                    {record.kembalian > 0 && ` · Angsul: Rp ${record.kembalian.toLocaleString('id-ID')}`}
                                    {record.saldoTerpakai > 0 && ` · Saldo: Rp ${record.saldoTerpakai.toLocaleString('id-ID')}`}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Total Tagihan</span>
                          <span className="text-sm font-extrabold text-slate-900 font-mono">Rp {record.total.toLocaleString('id-ID')}</span>
                        </div>
                      </div>

                      {items.length > 0 && (
                        <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 text-[10px] space-y-1">
                          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            <span>Layanan ({items.length})</span>
                          </div>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto pr-1 font-mono">
                            {items.map((it: any, itIdx: number) => (
                              <div key={itIdx} className="flex justify-between items-center text-slate-600">
                                <span className="truncate pr-2 font-sans font-medium">• {it.name} ({it.qty} {it.unit})</span>
                                <span className="font-bold text-slate-800 shrink-0">Rp {(it.price * it.qty).toLocaleString('id-ID')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tombol Aksi Kasir */}
                      <div className="pt-1 flex gap-1.5 items-center">
                        <button 
                          onClick={() => openPaymentModal(record, idx)}
                          className={`flex-1 py-2 px-2.5 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs btn-press transition-colors ${
                            isLunas 
                              ? 'bg-slate-800 hover:bg-slate-900' 
                              : 'bg-teal-600 hover:bg-teal-700'
                          }`}
                          title="Input Pembayaran & Hitung Pengangsulan"
                        >
                          <CheckCircle2 size={13} className={isLunas ? 'text-slate-300' : 'text-teal-200'} />
                          <span>{isLunas ? 'Lunas (Kirim WA)' : 'Konfirmasi / Lunas'}</span>
                          <MessageCircle size={12} className={isLunas ? 'text-slate-300' : 'text-teal-200'} />
                        </button>

                        <button 
                          onClick={() => {
                            setNotaId(record.id); 
                            setCart(record.cart || record.items || []);
                            setCustomer(record.customer);
                            setLoadedArrivalDate(record.tanggalDatang || record.time || null);
                            setActiveTab('current');
                          }}
                          className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors btn-press flex items-center gap-1"
                          title="Buka & Edit Nota"
                        >
                          <FileText size={12} className="text-slate-500" />
                          <span>Buka</span>
                        </button>

                        <button 
                          onClick={() => handlePrintRecord(record)}
                          className="py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors btn-press flex items-center gap-1"
                          title="Cetak Ulang Struk Thermal Bluetooth"
                        >
                          <Printer size={12} className="text-slate-500" />
                          <span>Cetak</span>
                        </button>

                        <button 
                          onClick={() => { 
                            setConfirmModal({
                              title: 'Hapus Transaksi',
                              message: `Yakin ingin menghapus riwayat transaksi #LT-${record.id}?`,
                              visible: true,
                              onConfirm: () => {
                                setHistory(prev => prev.filter((_, i) => i !== idx));
                                setConfirmModal(prev => ({ ...prev, visible: false }));
                              }
                            });
                          }} 
                          className="py-2 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors btn-press"
                          title="Hapus"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Nav Bawah Ergonomis */}
      <footer className="fixed bottom-0 left-0 right-0 p-3 z-[100] glass-nav">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button 
            onClick={handlePrint}
            className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center btn-press border border-white/20 hover:bg-white/20 shrink-0"
            title="Cetak Nota Termal"
          >
            <Printer size={18} />
          </button>
          <button 
            onClick={handleSaveOnly}
            disabled={cart.length === 0}
            className="w-14 h-12 bg-slate-800 hover:bg-slate-700 text-white rounded-xl flex flex-col items-center justify-center btn-press border border-slate-700 shadow-xs disabled:opacity-40 shrink-0 transition-colors"
            title="Simpan Transaksi ke Riwayat"
          >
            <Save size={16} className="text-white" />
            <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">Simpan</span>
          </button>
          <button 
            onClick={handleWA}
            disabled={isSendingWA}
            className="flex-1 h-12 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider btn-press flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 transition-colors px-3"
          >
            <Send size={16} className="shrink-0" />
            <span className="truncate">
              {isSendingWA ? 'Mengirim...' : waBotConfig.enabled ? 'Kirim Nota WA (Bot)' : 'Kirim WhatsApp'}
            </span>
          </button>
        </div>
      </footer>

      {/* Modal Customer List */}
      {showCustomerList && (
        <div className="fixed inset-0 bg-slate-950/70 flex items-end sm:items-center justify-center z-[200] backdrop-blur-xs p-0 sm:p-4">
          <div className="card-modal w-full max-w-md p-5 max-h-[75vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <User size={16} className="text-teal-600" />
                <h3 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">Daftar Pelanggan</h3>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                  {savedCustomers.length}
                </span>
              </div>
              <button 
                onClick={() => setShowCustomerList(false)} 
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 transition-colors btn-press"
              >
                <X size={15} />
              </button>
            </div>
            {savedCustomers.length === 0 ? (
              <p className="text-center text-slate-400 text-xs py-8 font-medium">Belum ada data pelanggan tersimpan</p>
            ) : (
              <div className="overflow-y-auto space-y-2 pr-1">
                {savedCustomers.map((c: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => { 
                      setCustomer({ ...customer, name: c.name, phone: c.phone, address: c.address }); 
                      setShowCustomerList(false); 
                    }}
                    className="w-full text-left bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 rounded-xl p-3 flex justify-between items-center transition-colors cursor-pointer group"
                  >
                    <div className="pr-2 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 uppercase group-hover:text-teal-700 transition-colors">{c.name}</span>
                        {typeof c.balance === 'number' && c.balance > 0 && (
                          <span className="text-[9px] font-mono font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Wallet size={10} />
                            Saldo: Rp {c.balance.toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>
                      {c.phone && <p className="text-[10px] text-slate-500 font-mono mt-0.5">{c.phone}</p>}
                      {c.address && <p className="text-[10px] text-slate-500 truncate max-w-[220px]">{c.address}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-teal-700 font-bold text-[10px] uppercase px-2.5 py-1 rounded-md bg-teal-50 group-hover:bg-teal-100 transition-colors">
                        Pilih
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmModal({
                            title: 'Hapus Pelanggan',
                            message: `Hapus "${c.name.toUpperCase()}" dari daftar pelanggan tersimpan?`,
                            visible: true,
                            onConfirm: () => {
                              setSavedCustomers((prev: any[]) => prev.filter((_, idx) => idx !== i));
                              setConfirmModal(prev => ({ ...prev, visible: false }));
                            }
                          });
                        }}
                        className="w-7 h-7 rounded-md bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors btn-press"
                        title="Hapus pelanggan ini"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
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
            className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-[200] backdrop-blur-xs p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card-modal p-6 text-center max-w-xs w-full"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                {modal.title === 'Gagal' || modal.title === 'Error' ? (
                  <AlertCircle size={24} className="text-rose-600" />
                ) : (
                  <CheckCircle2 size={24} className="text-teal-600" />
                )}
              </div>
              <h3 className="font-extrabold text-base text-slate-900 mb-1">{modal.title}</h3>
              <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                {modal.message}
              </p>
              <button 
                onClick={() => setModal({ ...modal, visible: false })}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs uppercase tracking-wider btn-press"
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
            className="fixed inset-0 bg-slate-950/70 flex items-center justify-center z-[210] backdrop-blur-xs p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card-modal p-6 text-center max-w-xs w-full"
            >
              <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} className="text-rose-600" />
              </div>
              <h3 className="font-extrabold text-base text-slate-900 mb-1">{confirmModal.title}</h3>
              <p className="text-xs text-slate-500 mb-6 font-medium leading-relaxed">
                {confirmModal.message}
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setConfirmModal({ ...confirmModal, visible: false })}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs uppercase tracking-wider btn-press"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmModal.onConfirm}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs uppercase tracking-wider btn-press"
                >
                  Ya, Lanjutkan
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
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-0 z-[300] bg-slate-950/80 flex flex-col justify-end sm:justify-center sm:p-4 backdrop-blur-xs"
          >
            <div className="card-modal w-full max-w-md mx-auto max-h-[85vh] flex flex-col bg-white overflow-hidden">
              <div className="p-4 pb-3 flex justify-between items-center border-b border-slate-100 shrink-0">
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">Pilih Layanan Laundry</h2>
                  <p className="text-[11px] text-slate-500">Pilih jenis cuci, setrika, atau perlengkapan lainnya</p>
                </div>
                <button
                  onClick={() => setShowServiceModal(false)}
                  className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 btn-press"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {SERVICES_CATALOG.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-teal-700 tracking-wider uppercase">{group.group}</span>
                      <div className="flex-1 border-t border-slate-200"></div>
                    </div>

                    <div className="space-y-1.5">
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
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'border-teal-600 bg-teal-50/50 shadow-xs'
                                : 'border-slate-200/90 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-slate-900 uppercase">{displayName}</h4>
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="font-mono font-bold text-teal-700">Rp {item.price.toLocaleString('id-ID')}</span>
                                <span className="text-slate-400 font-mono">/ {item.unit}</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300'
                            }`}>
                              {isSelected && <CheckCircle2 size={14} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Modal Pengaturan Bot WA WiFi STB */}
        {showBotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-[260] backdrop-blur-sm p-0 sm:p-6"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 max-h-[88vh] overflow-y-auto space-y-5 shadow-2xl"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${waBotConfig.enabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    <Wifi size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Server Bot WhatsApp</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Kirim nota otomatis via Bot Server Cloud / STB</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBotModal(false)}
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Saklar ON/OFF Mode Bot */}
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                <div className="pr-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black uppercase text-slate-800">Saklar Mode Bot WiFi</p>
                    {waBotConfig.enabled && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-700">
                        Aktif
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {waBotConfig.enabled
                      ? 'AKTIF: Nota dikirim otomatis via Bot (Fallback ke WA biasa jika offline)'
                      : 'NONAKTIF: Selalu buka aplikasi WhatsApp manual (wa.me)'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !waBotConfig.enabled;
                    const targetIp = (waBotConfig.ip && waBotConfig.ip.trim()) ? waBotConfig.ip : DEFAULT_BOT_URL;
                    setWaBotConfig({ enabled: nextVal, ip: targetIp });
                    if (nextVal) {
                      checkBotConnection(targetIp, false);
                    }
                  }}
                  className={`w-14 h-8 rounded-full p-1 transition-all flex items-center shrink-0 ${
                    waBotConfig.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              {botStatus.connected ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/20">
                        <CheckCircle2 size={18} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-emerald-950">Bot WhatsApp Terhubung</p>
                        <p className="text-[11px] text-emerald-800 font-bold">
                          {botStatus.botNumber ? `+${botStatus.botNumber}` : 'Server Aktif'} {botStatus.botName ? `(${botStatus.botName})` : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleResetBotSession}
                      disabled={isCheckingBot}
                      className="px-2.5 py-1 bg-white text-rose-600 border border-rose-200 rounded-lg text-[9px] font-black uppercase tracking-wider"
                    >
                      Reset Sesi
                    </button>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-medium">
                    ✅ Aplikasi kasir langsung mengenali bot. Nota transaksi akan dikirim otomatis ke pelanggan.
                  </p>
                </div>
              ) : (
                botStatus.checked && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[10px] text-amber-800 font-semibold flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                    <span>{botStatus.message}</span>
                  </div>
                )
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Alamat Server Bot WhatsApp
                  </label>
                  {waBotConfig.ip !== DEFAULT_BOT_URL && (
                    <button
                      onClick={() => {
                        setWaBotConfig(prev => ({ ...prev, ip: DEFAULT_BOT_URL }));
                        checkBotConnection(DEFAULT_BOT_URL, false);
                      }}
                      className="text-[9px] font-bold text-blue-600 hover:text-blue-700 underline"
                    >
                      Gunakan Server Default
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={DEFAULT_BOT_URL}
                    value={waBotConfig.ip}
                    onChange={e => setWaBotConfig(prev => ({ ...prev, ip: e.target.value }))}
                    className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs text-slate-800 placeholder:text-slate-300"
                  />
                  <button
                    onClick={() => checkBotConnection(waBotConfig.ip)}
                    disabled={isCheckingBot}
                    className="px-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider btn-press disabled:opacity-50 shrink-0"
                  >
                    {isCheckingBot ? 'Cek...' : 'Cek Status'}
                  </button>
                </div>
                <p className="text-[9px] text-slate-400">
                  Default Server Bot (https://e4-store.my.id) sudah terpasang otomatis. Endpoint: /api/laundry/kirim-nota.
                </p>
              </div>

              {!botStatus.connected && (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">
                      Tautkan WA dengan Kode Pairing (8 Digit)
                    </p>
                    <button
                      onClick={handleResetBotSession}
                      disabled={isCheckingBot}
                      className="text-[10px] font-black text-rose-600 uppercase underline"
                    >
                      Reset Sesi
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                    Jika server membutuhkan penautan nomor baru, masukkan nomor WhatsApp bot lalu klik <b>Minta Kode Pairing</b>:
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="tel"
                      placeholder="085169949219"
                      value={pairingPhoneInput}
                      onChange={e => setPairingPhoneInput(e.target.value)}
                      className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-800"
                    />
                    <button
                      onClick={handleRequestPairingCode}
                      disabled={isRequestingCode}
                      className="px-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider btn-press disabled:opacity-50 shrink-0 shadow-sm shadow-blue-600/20"
                    >
                      {isRequestingCode ? 'Meminta...' : 'Minta Kode Pairing'}
                    </button>
                  </div>

                  {botStatus.pairingCode && (
                    <div className="p-4 bg-white rounded-2xl border-2 border-blue-500 text-center space-y-2.5 shadow-sm">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Kode Pairing 8 Digit Anda:
                      </p>
                      <p className="text-2xl font-black tracking-widest text-slate-900 font-mono select-all">
                        {botStatus.pairingCode}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard?.writeText(botStatus.pairingCode || '');
                          showModal('Kode Disalin', `Kode ${botStatus.pairingCode} berhasil disalin.\n\nBuka WhatsApp -> Perangkat Tertaut -> Tautkan Perangkat -> Tautkan dengan nomor telepon saja -> Tempel kode ini.`);
                        }}
                        className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider btn-press"
                      >
                        Salin Kode 8 Digit
                      </button>
                    </div>
                  )}
                </div>
              )}

              {botStatus.connected && (
                <div className="flex justify-end">
                  <button
                    onClick={handleResetBotSession}
                    disabled={isCheckingBot}
                    className="px-3 py-2 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider border border-rose-200 btn-press"
                  >
                    Putuskan / Ganti Nomor WA Bot
                  </button>
                </div>
              )}

              <div className="p-4 bg-slate-50 rounded-2xl space-y-2.5 border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tes Kirim Pesan via Bot</p>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="Nomor WA Tes (0812...)"
                    value={testPhoneInput}
                    onChange={e => setTestPhoneInput(e.target.value)}
                    className="flex-1 p-3 bg-white border border-slate-200 rounded-xl outline-none font-bold text-xs text-slate-800 placeholder:text-slate-300"
                  />
                  <button
                    onClick={handleTestBotMessage}
                    disabled={isCheckingBot}
                    className="px-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider btn-press disabled:opacity-50 shrink-0"
                  >
                    Tes Kirim
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowBotModal(false)}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest btn-press shadow-lg shadow-blue-600/20"
              >
                Simpan & Tutup
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* Modal Kasir: Input Pembayaran (CASH / TF), Hitung Pengangsulan & Simpan Saldo Pelanggan */}
        {paymentModal.visible && paymentModal.record && (() => {
          const rec = paymentModal.record;
          const customerName = rec.customer?.name?.trim() ? rec.customer.name.trim() : 'Pelanggan';
          const existingCustBal = getCustomerBalance(rec.customer?.name, rec.customer?.phone);
          const canUseBalance = existingCustBal > 0;
          const saldoDigunakan = (paymentModal.useBalance && canUseBalance)
            ? Math.min(rec.total, existingCustBal)
            : 0;
          const sisaTagihan = Math.max(0, rec.total - saldoDigunakan);
          const nominalBayar = sisaTagihan === 0 ? 0 : (parseFloat(paymentModal.inputAmount) || 0);
          const selisihUang = nominalBayar - sisaTagihan;
          const isCukup = sisaTagihan === 0 || selisihUang >= 0;
          const kembalianTunai = (isCukup && selisihUang > 0 && paymentModal.excessAction === 'CHANGE') ? selisihUang : 0;
          const saldoBaruSimpanan = (existingCustBal - saldoDigunakan) + 
            (isCukup && selisihUang > 0 && paymentModal.excessAction === 'SAVE_BALANCE' ? selisihUang : 0);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/70 flex items-end sm:items-center justify-center z-[280] backdrop-blur-xs p-0 sm:p-4"
            >
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 30, opacity: 0 }}
                className="card-modal w-full max-w-md p-5 max-h-[90vh] overflow-y-auto space-y-4"
              >
                {/* Header Modal */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
                      <Banknote size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-xs uppercase tracking-wide text-slate-900">Input Pembayaran</h3>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] font-mono font-bold text-teal-700">
                          #LT-{rec.id}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">Hitung pengangsulan & simpan saldo uang lebih</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setPaymentModal(prev => ({ ...prev, visible: false }))}
                    className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 transition-colors btn-press"
                  >
                    <X size={15} />
                  </button>
                </div>

                {/* Ringkasan Tagihan */}
                <div className="bg-slate-900 rounded-xl p-3.5 text-white flex justify-between items-center">
                  <div>
                    <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block">
                      Tagihan · <span className="text-white font-semibold">{customerName}</span>
                    </span>
                    <span className="text-2xl font-extrabold font-mono tracking-tight mt-0.5 block">
                      Rp {rec.total.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-mono">
                      {rec.customer?.delivery || 'AMBIL SENDIRI'}
                    </span>
                  </div>
                </div>

                {/* Pengecekan & Opsi Saldo Simpanan Pelanggan */}
                {canUseBalance && (
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet size={15} className="text-emerald-700" />
                        <span className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                          Saldo Simpanan Tersedia
                        </span>
                      </div>
                      <span className="text-xs font-bold text-emerald-800 font-mono">
                        Rp {existingCustBal.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="pt-0.5">
                      <label className="text-[11px] font-semibold text-emerald-900 flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={paymentModal.useBalance}
                          onChange={e => {
                            const checked = e.target.checked;
                            const newRem = checked ? Math.max(0, rec.total - existingCustBal) : rec.total;
                            setPaymentModal(prev => ({
                              ...prev,
                              useBalance: checked,
                              inputAmount: newRem === 0 ? '0' : String(newRem)
                            }));
                          }}
                          className="w-4 h-4 rounded text-teal-600 accent-teal-600 cursor-pointer"
                        />
                        <span>Gunakan saldo simpanan untuk potong tagihan</span>
                      </label>
                    </div>

                    {paymentModal.useBalance && (
                      <div className="bg-white/90 rounded-lg p-2.5 text-[10px] text-emerald-950 space-y-1 font-mono border border-emerald-200/70">
                        <div className="flex justify-between">
                          <span>Tagihan Awal:</span>
                          <span>Rp {rec.total.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700 font-semibold">
                          <span>- Terpotong Saldo:</span>
                          <span>Rp {saldoDigunakan.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between border-t border-emerald-200 pt-1 font-bold">
                          <span>Sisa Tagihan Bayar:</span>
                          <span className="text-slate-900">Rp {sisaTagihan.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Pilihan Metode Pembayaran: CASH vs TRANSFER */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Metode Pembayaran
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentModal(prev => ({ ...prev, paymentMethod: 'CASH' }))}
                      className={`py-2.5 px-3 rounded-lg border flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all btn-press ${
                        paymentModal.paymentMethod === 'CASH'
                          ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Coins size={15} />
                      <span>Cash (Tunai)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentModal(prev => ({ ...prev, paymentMethod: 'TRANSFER' }))}
                      className={`py-2.5 px-3 rounded-lg border flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider transition-all btn-press ${
                        paymentModal.paymentMethod === 'TRANSFER'
                          ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-xs'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard size={15} />
                      <span>Transfer (TF)</span>
                    </button>
                  </div>
                </div>

                {/* Input Jumlah Uang yang Diterima */}
                {sisaTagihan > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Uang yang Diterima
                      </label>
                      <span className="text-[10px] font-bold text-slate-600 font-mono">
                        Harus Bayar: Rp {sisaTagihan.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">
                        Rp
                      </span>
                      <input
                        type="number"
                        placeholder="0"
                        value={paymentModal.inputAmount}
                        onChange={e => setPaymentModal(prev => ({ ...prev, inputAmount: e.target.value }))}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-sm text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition-colors"
                      />
                    </div>

                    {/* Tombol Nominal Cepat */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPaymentModal(prev => ({ ...prev, inputAmount: String(sisaTagihan) }))}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-[10px] font-bold uppercase text-slate-700 transition-colors btn-press"
                      >
                        Uang Pas
                      </button>
                      {[10000, 20000, 50000, 100000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setPaymentModal(prev => ({ ...prev, inputAmount: String(val) }))}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md text-[10px] font-bold text-slate-700 transition-colors font-mono btn-press"
                        >
                          Rp {val.toLocaleString('id-ID')}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPaymentModal(prev => ({ ...prev, inputAmount: '' }))}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 rounded-md text-[10px] font-bold text-rose-600 transition-colors btn-press"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 font-medium flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                    <span>Tagihan Rp {rec.total.toLocaleString('id-ID')} lunas oleh Saldo Simpanan (Rp {saldoDigunakan.toLocaleString('id-ID')}).</span>
                  </div>
                )}

                {/* Perhitungan Pengangsulan / Kembalian & Saldo Simpanan */}
                {sisaTagihan > 0 && selisihUang > 0 && (
                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-amber-900 tracking-wider block">
                          Uang Lebih (Pengangsulan)
                        </span>
                        <span className="text-lg font-extrabold text-amber-950 font-mono">
                          Rp {selisihUang.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded text-[9px] font-bold uppercase tracking-wider">
                        Kelebihan
                      </span>
                    </div>

                    {/* Opsi Tindakan Uang Lebih */}
                    <div className="space-y-1.5 pt-1 border-t border-amber-200/70">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-950 block">
                        Perlakuan Uang Lebih:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setPaymentModal(prev => ({ ...prev, excessAction: 'CHANGE' }))}
                          className={`p-2.5 rounded-lg border text-left transition-all btn-press ${
                            paymentModal.excessAction === 'CHANGE'
                              ? 'border-teal-600 bg-white shadow-xs'
                              : 'border-amber-200/90 bg-amber-50/50 hover:bg-white'
                          }`}
                        >
                          <p className="text-[10px] font-bold text-slate-900 uppercase">
                            A. Kembalikan Tunai
                          </p>
                          <p className="text-[9px] text-slate-500 mt-0.5 font-mono">
                            Pengangsulan Rp {selisihUang.toLocaleString('id-ID')}
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setPaymentModal(prev => ({ ...prev, excessAction: 'SAVE_BALANCE' }))}
                          className={`p-2.5 rounded-lg border text-left transition-all btn-press ${
                            paymentModal.excessAction === 'SAVE_BALANCE'
                              ? 'border-teal-600 bg-white shadow-xs'
                              : 'border-amber-200/90 bg-amber-50/50 hover:bg-white'
                          }`}
                        >
                          <p className="text-[10px] font-bold text-teal-800 uppercase flex items-center gap-1">
                            <Wallet size={11} className="text-teal-600" />
                            B. Simpan Jadi Saldo
                          </p>
                          <p className="text-[9px] text-slate-500 mt-0.5">
                            Disimpan untuk nota cucian berikutnya
                          </p>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sisa Saldo Tersimpan Pelanggan */}
                {saldoBaruSimpanan > 0 && (
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200/80 flex justify-between items-center text-[10px]">
                    <span className="font-semibold text-slate-500">Sisa Saldo Tersimpan Pelanggan:</span>
                    <span className="font-bold text-emerald-800 font-mono">
                      Rp {saldoBaruSimpanan.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}

                {/* Peringatan jika uang masih kurang */}
                {sisaTagihan > 0 && selisihUang < 0 && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-700 font-bold flex items-center gap-2">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>Uang diterima masih kurang Rp {Math.abs(selisihUang).toLocaleString('id-ID')}</span>
                  </div>
                )}

                {/* Tombol Cetak & Konfirmasi */}
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!isCukup}
                      onClick={handlePrintFromModal}
                      className="flex-1 py-2.5 px-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors btn-press disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs"
                      title="Cetak Struk Thermal Bluetooth (Mencatat Pembayaran & Saldo)"
                    >
                      <Printer size={14} />
                      <span>Cetak Struk</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isCukup || isSendingWA}
                      onClick={handlePrintAndConfirmPayment}
                      className="flex-1 py-2.5 px-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors btn-press disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-xs"
                      title="Cetak Struk Sekaligus Konfirmasi Lunas & Kirim WhatsApp"
                    >
                      <Printer size={14} />
                      <span>Cetak & Konfirmasi</span>
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentModal(prev => ({ ...prev, visible: false }))}
                      className="w-20 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors btn-press shrink-0"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={!isCukup || isSendingWA}
                      onClick={handleExecutePayment}
                      className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider shadow-xs disabled:opacity-40 transition-colors btn-press flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={15} />
                      <span>{isSendingWA ? 'Memproses...' : 'Konfirmasi & Kirim WA'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}

      </AnimatePresence>
    </div>
  );
}
