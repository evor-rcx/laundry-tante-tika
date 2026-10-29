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
  Save
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

      let printTime = currentTime.replace(' pukul ', ' ').substring(0, 32);
      
      let text = "\x1B\x40\x1B\x61\x01\x1B\x45\x01LAUNDRY TANTE TIKA\n\x1B\x45\x00";
      text += "Jl. Zamrud Depan Gg. Zamrud 2\nRT 42, Bontang Selatan\n";
      text += "WA: +62 851-6994-9219\n\n";
      text += "--------------------------------\n\x1B\x61\x00";
      
      const padR = (str: string, len: number) => (str || "-").substring(0, len).padEnd(len, ' ');
      
      text += padR("Nota : #LT-" + notaId, 32) + "\n";
      text += padR("Tgl  : " + printTime, 32) + "\n";
      text += padR("Nama : " + customer.name, 32) + "\n";
      text += padR("Alm  : " + customer.address, 32) + "\n";
      text += padR("WA   : " + customer.phone, 32) + "\n";
      text += "--------------------------------\n";

      cart.forEach(i => {
        text += padR(i.name, 32) + "\n";
        let qtyText = i.qty + " " + i.unit.toUpperCase();
        let priceText = "Rp " + i.price.toLocaleString();
        let subtotalText = "Rp " + i.subtotal.toLocaleString();
        
        let detailLine = qtyText + " x " + priceText;
        let spacesNeeded = 32 - detailLine.length - subtotalText.length - 3;
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
      const chunkSize = 20;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
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

    const text = `*LAUNDRY TANTE TIKA*
Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan
WA: 0851-6994-9219

_Nota #LT-${notaId}_
🗓️ *Waktu:* ${currentTime.replace(' pukul ', ' ')}

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

    saveToHistory();
    resetForm();

    if (result.sentViaBot) {
      showModal("Nota Terkirim Otomatis ✅", result.serverMessage || "Nota berhasil dibuat di server & langsung terkirim ke WhatsApp pelanggan!");
    } else if (result.usedFallback) {
      showModal("Dialihkan ke WA Biasa", "Server Bot sedang offline/tidak terjangkau, nota transaksi otomatis dialihkan membuka aplikasi WhatsApp biasa.");
    } else {
      showModal("Berhasil", "Nota telah diteruskan ke WhatsApp dan transaksi disimpan di riwayat.");
    }
  };

  const handleConfirmPayment = async (record: any, idx: number) => {
    const customerName = record.customer?.name?.trim() ? record.customer.name.trim() : 'Pelanggan';
    const items = record.cart || record.items || [];
    
    let detailLayanan = "";
    if (items.length > 0) {
      detailLayanan = items.map((item: any) => {
        return `${item.name}\n${item.qty} ${item.unit.toUpperCase()} x Rp ${item.price.toLocaleString()} = Rp ${(item.price * item.qty).toLocaleString()}`;
      }).join("\n");
    } else {
      detailLayanan = `Tagihan: Rp ${record.total.toLocaleString()}`;
    }

    const message = `Halo kak ${customerName} 👋
Nota #LT-${record.id} sudah LUNAS ✅

LAUNDRY TANTE TIKA
Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan
WA: 0851-6994-9219

📦 Layanan & Harga:
${detailLayanan}
💳 Total: Rp ${record.total.toLocaleString()}

Pakaian sudah bersih, rapi, dan wangi. Terima kasih! 🙏🧺✨

"Pakaian bersih, hati senang"
${upcomingEventText}`;

    let cleanPhone = record.customer?.phone ? record.customer.phone.replace(/[^0-9]/g, '') : '';
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);

    const deliveryType = record.customer?.delivery || 'AMBIL SENDIRI';
    const confirmCaption = getWACaption(deliveryType);

    const confirmOrderPayload: Partial<PesananPayload> = {
      no_nota: `LT-${record.id}`,
      nama_pelanggan: customerName,
      nomor_wa: cleanPhone,
      alamat: record.customer?.address || '-',
      rincian: items.map((item: any) => ({
        nama_layanan: item.name,
        qty: `${item.qty} ${(item.unit || '').toUpperCase()}`,
        harga_satuan: item.price,
        subtotal: item.subtotal || (item.price * item.qty)
      })),
      total: record.total,
      status_bayar: 'LUNAS',
      pengiriman: deliveryType,
      caption: confirmCaption,
      catatan_footer: upcomingEventText || 'Pakaian Bersih, Hati Senang'
    };

    const result = await sendViaBotOrFallback(cleanPhone, message, confirmCaption, confirmOrderPayload);

    setHistory(prev => prev.filter((_, i) => i !== idx));

    if (result.sentViaBot) {
      showModal(
        "Lunas & Terkirim Otomatis ✅",
        `Konfirmasi LUNAS untuk kak ${customerName} telah dikirim otomatis lewat Server Bot WhatsApp, dan riwayat (#LT-${record.id}) telah dihapus.`
      );
    } else if (result.usedFallback) {
      showModal(
        "Pembayaran Dikonfirmasi",
        `Server Bot sedang offline, konfirmasi LUNAS untuk kak ${customerName} otomatis dibuka di WhatsApp biasa & riwayat (#LT-${record.id}) dihapus.`
      );
    } else {
      showModal(
        "Pembayaran Dikonfirmasi", 
        `Konfirmasi pembayaran LUNAS untuk kak ${customerName} telah dibuka di WhatsApp, dan data transaksi (#LT-${record.id}) telah otomatis dihapus dari riwayat.`
      );
    }
  };

  return (
    <div className="min-h-screen pb-40 bg-slate-50 relative z-0">
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
              setShowBotModal(true);
              if (waBotConfig.ip.trim()) {
                checkBotConnection(waBotConfig.ip);
              }
            }}
            className={`h-10 px-3 rounded-full flex items-center gap-1.5 shadow-sm border btn-press text-[10px] font-black uppercase tracking-wider transition-all ${
              waBotConfig.enabled
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/20'
                : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
            }`}
            title="Pengaturan Bot WA WiFi STB"
          >
            <Wifi size={15} strokeWidth={2.5} />
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
                className="nota-container overflow-hidden mx-auto max-w-sm bg-white rounded-3xl border border-slate-200 shadow-sm"
                id="notaBox"
              >
                <div className="p-8 text-center relative bg-[#fdfbf7]">
                  <div className="absolute top-4 right-6 font-black text-[10px] text-orange-800 bg-orange-100 px-3 py-1 rounded-full">
                    #LT-{notaId}
                  </div>
                  <img src={LOGO_URL} className="w-16 h-16 mx-auto mb-3 object-contain" alt="Logo" />
                  <h2 className="text-lg font-black text-slate-800 uppercase leading-none">Laundry Tante Tika</h2>
                  <div className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-2 space-y-0.5">
                    <p>Jl. Zamrud Depan Gg. Zamrud 2 RT 42</p>
                    <p>Bontang Selatan, Bontang</p>
                  </div>
                </div>

                <div className="px-6 pb-8 space-y-5 bg-white">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Pelanggan</p>
                      <p className="text-xs font-black text-slate-800 uppercase">{customer.name || '-'}</p>
                      <div className="flex items-center gap-1">
                         <MapPin size={8} className="text-slate-400" />
                         <p className="text-[8px] font-bold text-slate-400 uppercase italic">{customer.address || '-'}</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${
                      customer.status === 'LUNAS' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                    }`}>
                      {customer.status}
                    </div>
                  </div>

                  <div className="border-t border-dashed border-slate-200 pt-5 space-y-3">
                    <AnimatePresence initial={false}>
                      {cart.length === 0 ? (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[9px] text-center text-slate-300 italic py-2"
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
                            <div className="space-y-0.5 pr-2">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => removeItem(idx)}
                                  className="text-red-400 hover:text-red-600 transition-colors p-0.5"
                                  title="Hapus"
                                >
                                  <Trash2 size={10} />
                                </button>
                                <p className="text-[10px] font-black text-slate-700 uppercase">{item.name}</p>
                              </div>
                              <p className="text-[8px] font-bold text-slate-400 ml-5 font-mono">
                                {item.qty} {item.unit.toUpperCase()} x Rp {item.price.toLocaleString()}
                              </p>
                            </div>
                            <span className="text-[10px] font-black text-slate-800 shrink-0 font-mono">
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

                  <div className="bg-slate-900 rounded-[1.75rem] p-5 text-white flex justify-between items-center shadow-xl shadow-slate-200">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Tagihan</p>
                      <p className="text-lg font-black font-mono">Rp {total.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <Clock size={10} className="ml-auto text-slate-400 mb-1" />
                      <p className="text-[7px] font-bold text-slate-400 uppercase leading-relaxed font-mono">
                        {currentTime}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 pt-1">
                    <p className="text-center text-[8px] font-black text-slate-300 tracking-[0.2em] uppercase">Pakaian Bersih Hati Senang</p>
                    <div className="bg-orange-50/80 border border-orange-200/70 py-2 px-3 rounded-xl text-center shadow-xs">
                      <p className="text-[8px] font-black text-orange-600 uppercase tracking-widest">{upcomingEventText}</p>
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
                history.map((record, idx) => {
                  const items = record.cart || record.items || [];
                  const isLunas = record.customer?.status === 'LUNAS';
                  return (
                    <div 
                      key={`${record.id}-${idx}`} 
                      className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm space-y-3.5 transition-all hover:border-slate-200"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-slate-800 tracking-wide">#LT-{record.id}</span>
                            <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-full ${isLunas ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60' : 'bg-rose-50 text-rose-600 border border-rose-200/60'}`}>
                              {record.customer?.status || 'BELUM LUNAS'}
                            </span>
                            {record.customer?.delivery && (
                              <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                {record.customer.delivery}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            {record.customer?.name?.trim() ? record.customer.name.toUpperCase() : 'PELANGGAN'}
                          </p>
                          {record.customer?.phone && (
                            <p className="text-[9px] font-medium text-slate-400 flex items-center gap-1.5">
                              <Phone size={10} className="text-slate-400" />
                              <span>{record.customer.phone}</span>
                            </p>
                          )}
                          <p className="text-[8px] font-medium text-slate-400 flex items-center gap-1">
                            <Clock size={10} className="text-slate-300" />
                            <span>{record.time}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Total Tagihan</span>
                          <p className="text-sm font-black text-slate-900 font-mono">Rp {record.total.toLocaleString()}</p>
                        </div>
                      </div>

                      {items.length > 0 && (
                        <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-100 text-[10px] space-y-1.5">
                          <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-wider">
                            <span>Layanan Terdaftar ({items.length})</span>
                          </div>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {items.map((it: any, itIdx: number) => (
                              <div key={itIdx} className="flex justify-between items-center text-slate-600 font-medium">
                                <span className="truncate pr-2">• {it.name} ({it.qty} {it.unit})</span>
                                <span className="font-bold text-slate-800 shrink-0 font-mono">Rp {(it.price * it.qty).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-1 flex gap-2 items-center">
                        <button 
                          onClick={() => handleConfirmPayment(record, idx)}
                          className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-[0.98] transition-all"
                          title="Konfirmasi Lunas, Kirim ke WhatsApp & Hapus Riwayat Otomatis"
                        >
                          <CheckCircle2 size={14} className="text-emerald-200" />
                          <span>Konfirmasi / Lunas</span>
                          <MessageCircle size={13} className="text-emerald-200" />
                        </button>

                        <button 
                          onClick={() => {
                            setNotaId(record.id); 
                            setCart(record.cart || record.items || []);
                            setCustomer(record.customer);
                            setActiveTab('current');
                          }}
                          className="py-3 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
                          title="Buka Nota"
                        >
                          Buka
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
                          className="py-3 px-3 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
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

      {/* Nav Bawah */}
      <footer className="fixed bottom-0 left-0 right-0 p-5 z-[100] glass-nav">
        <div className="max-w-md mx-auto flex items-center gap-2 sm:gap-2.5">
          <button 
            onClick={handlePrint}
            className="w-14 h-16 bg-white/10 text-white rounded-full flex items-center justify-center btn-press border border-white/20 hover:bg-white/20 shrink-0"
            title="Cetak Nota Termal"
          >
            <Printer size={22} />
          </button>
          <button 
            onClick={handleSaveOnly}
            disabled={cart.length === 0}
            className="w-16 h-16 bg-blue-600 hover:bg-blue-500 text-white rounded-full flex flex-col items-center justify-center btn-press border border-blue-400/40 shadow-lg shadow-blue-600/25 disabled:opacity-40 shrink-0 transition-all active:scale-95"
            title="Simpan Transaksi ke Riwayat"
          >
            <Save size={20} className="text-white" />
            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Simpan</span>
          </button>
          <button 
            onClick={handleWA}
            disabled={isSendingWA}
            className="flex-1 h-16 bg-green-500 hover:bg-green-600 text-white rounded-full font-black text-xs uppercase tracking-wider btn-press flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 disabled:opacity-60 transition-all active:scale-95 px-4"
          >
            <Send size={18} className="shrink-0" />
            <span className="truncate">
              {isSendingWA ? 'Mengirim...' : waBotConfig.enabled ? 'Kirim WA (Bot WiFi)' : 'Kirim WhatsApp'}
            </span>
          </button>
        </div>
      </footer>

      {/* Modal Customer List */}
      {showCustomerList && (
        <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-[200] backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] p-6 max-h-[70vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-widest text-slate-800">Daftar Pelanggan</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                  {savedCustomers.length}
                </span>
              </div>
              <button onClick={() => setShowCustomerList(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
            {savedCustomers.length === 0 ? (
              <p className="text-center text-slate-300 text-xs py-8">Belum ada pelanggan tersimpan</p>
            ) : (
              <div className="overflow-y-auto space-y-2">
                {savedCustomers.map((c: any, i: number) => (
                  <div
                    key={i}
                    onClick={() => { 
                      setCustomer({ ...customer, name: c.name, phone: c.phone, address: c.address }); 
                      setShowCustomerList(false); 
                    }}
                    className="w-full text-left bg-slate-50 hover:bg-slate-100 active:bg-slate-200/80 rounded-2xl px-4 py-3 flex justify-between items-center transition-colors cursor-pointer group"
                  >
                    <div className="pr-2 flex-1">
                      <p className="text-xs font-black text-slate-800 uppercase group-hover:text-blue-600 transition-colors">{c.name}</p>
                      {c.phone && <p className="text-[10px] text-slate-400">{c.phone}</p>}
                      {c.address && <p className="text-[10px] text-slate-400">{c.address}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-blue-600 font-black text-[10px] uppercase px-2.5 py-1.5 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
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
                        className="w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-500 flex items-center justify-center transition-colors"
                        title="Hapus pelanggan ini"
                      >
                        <Trash2 size={13} />
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

      </AnimatePresence>
    </div>
  );
}
