import { useState, useEffect, useMemo, useRef } from 'react';
import { get, set } from 'idb-keyval';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
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
  Share2,
  MessageCircle,
  FileText,
  Calendar,
  Eye,
  Wifi,
  Download,
  Image as ImageIcon,
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
  if (hour >= 4 && hour < 11) return 'Selamat pagi';
  if (hour >= 11 && hour < 15) return 'Selamat siang';
  if (hour >= 15 && hour < 18) return 'Selamat sore';
  if (hour >= 18 && hour < 19) return 'Selamat petang';
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

interface ReceiptCardProps {
  notaId: string;
  customer: CustomerInfo;
  cart: Service[];
  total: number;
  time: string;
  eventText: string;
}

const ReceiptCard = ({ notaId, customer, cart, total, time, eventText }: ReceiptCardProps) => {
  const formattedTime = formatReceiptDateOnly(time);
  const isLunas = customer.status === 'LUNAS';

  return (
    <div 
      className="relative bg-white rounded-[26px] border-[3.5px] border-[#086788] p-6 text-slate-800 shadow-md select-none overflow-hidden"
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#086788',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* 4 Corner Ornaments */}
      <div className="absolute top-2 left-2 w-9 h-9 pointer-events-none">
        <svg viewBox="0 0 36 36" className="w-full h-full text-[#086788]" fill="none">
          <path d="M 3 33 C 3 16.4 16.4 3 33 3" stroke="#086788" strokeWidth="2.5" />
          <circle cx="10" cy="10" r="3.5" fill="#086788" />
        </svg>
      </div>
      <div className="absolute top-2 right-2 w-9 h-9 pointer-events-none">
        <svg viewBox="0 0 36 36" className="w-full h-full text-[#086788]" fill="none">
          <path d="M 33 33 C 33 16.4 19.6 3 3 3" stroke="#086788" strokeWidth="2.5" />
          <circle cx="26" cy="10" r="3.5" fill="#086788" />
        </svg>
      </div>
      <div className="absolute bottom-2 left-2 w-9 h-9 pointer-events-none">
        <svg viewBox="0 0 36 36" className="w-full h-full text-[#086788]" fill="none">
          <path d="M 3 3 C 3 19.6 16.4 33 33 33" stroke="#086788" strokeWidth="2.5" />
          <circle cx="10" cy="26" r="3.5" fill="#086788" />
        </svg>
      </div>
      <div className="absolute bottom-2 right-2 w-9 h-9 pointer-events-none">
        <svg viewBox="0 0 36 36" className="w-full h-full text-[#086788]" fill="none">
          <path d="M 33 3 C 33 19.6 19.6 33 3 33" stroke="#086788" strokeWidth="2.5" />
          <circle cx="26" cy="26" r="3.5" fill="#086788" />
        </svg>
      </div>

      {/* Header Logo & Brand */}
      <div className="text-center pt-1 pb-2">
        <div className="flex items-center justify-center gap-3">
          <div className="w-14 h-14 shrink-0">
            <svg viewBox="0 0 64 64" className="w-full h-full" fill="none">
              <circle cx="12" cy="16" r="3.5" fill="#38bdf8" />
              <circle cx="19" cy="10" r="2.5" fill="#38bdf8" />
              <circle cx="50" cy="14" r="3" fill="#38bdf8" />
              <path d="M32 6 C30 6 28 8 28 10 C28 12 30 13 32 14 L18 22 L46 22 Z" stroke="#086788" strokeWidth="2.5" strokeLinejoin="round" fill="none" />
              <rect x="14" y="21" width="36" height="38" rx="7" fill="#0b7285" />
              <circle cx="22" cy="26" r="2" fill="#ffffff" />
              <line x1="27" y1="26" x2="43" y2="26" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="32" cy="41" r="11" fill="#e0f7fa" stroke="#ffffff" strokeWidth="2.5" />
              <circle cx="32" cy="41" r="7" fill="#0b7285" opacity="0.6" />
            </svg>
          </div>
          <h1 className="text-[25px] font-black tracking-tight text-[#073b61] leading-none uppercase">
            LAUNDRY TANTE TIKA
          </h1>
        </div>
        
        <p className="text-[12px] font-bold text-slate-800 mt-1.5 leading-snug">
          Jl. Zamrud Depan Gg. Zamrud 2 RT 42, Bontang Selatan
        </p>
        <p className="text-[13px] font-bold text-slate-800">
          WA: 0851-6994-9219
        </p>

        {/* Divider with double lines */}
        <div className="w-full flex items-center justify-center my-2 gap-2 px-2">
          <div className="h-[2px] bg-[#086788] flex-1 opacity-70"></div>
          <div className="w-1.5 h-1.5 rotate-45 bg-[#086788]"></div>
          <div className="h-[2px] bg-[#086788] flex-1 opacity-70"></div>
        </div>
      </div>

      {/* Nota ID & Waktu */}
      <div className="text-center my-1.5">
        <h2 className="text-[28px] font-black italic tracking-wide text-slate-900 font-serif">
          Nota #LT-{notaId}
        </h2>
        <div className="flex items-center justify-center gap-1.5 text-[15px] font-bold text-slate-800 mt-0.5">
          <span>🗓️</span>
          <span>Waktu: {formattedTime}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="my-3 space-y-1 px-1">
        <div className="flex items-center gap-2 text-[17px] font-black text-slate-900">
          <span className="text-xl">👤</span>
          <span>Nama: {customer.name.trim() ? customer.name.toUpperCase() : '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-[17px] font-black text-slate-900">
          <span className="text-xl">📍</span>
          <span>Alamat: {customer.address.trim() ? customer.address.toUpperCase() : '-'}</span>
        </div>
      </div>

      {/* Rincian Pesanan Box */}
      <div 
        className="rounded-2xl p-4 my-3"
        style={{ backgroundColor: '#e6f4f8' }}
      >
        <div className="text-[17px] font-black text-[#086788] mb-2 flex items-center gap-1.5 tracking-wide">
          <span>📦</span>
          <span>RINCIAN PESANAN:</span>
        </div>

        <div className="space-y-2.5">
          {cart.length === 0 ? (
            <p className="text-sm italic text-slate-500">- Belum ada rincian pesanan -</p>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="text-[16px] font-black text-slate-900 uppercase">
                  ▪ {item.name}
                </div>
                <div className="text-[15px] font-bold text-slate-800 pl-4 font-mono">
                  {item.qty} {item.unit.toUpperCase()} x Rp {item.price.toLocaleString('id-ID')} = Rp {item.subtotal.toLocaleString('id-ID')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dashed Divider */}
      <div className="border-b-[4px] border-dashed border-[#086788] my-3.5 w-full opacity-80"></div>

      {/* Total & Status & Pengiriman */}
      <div className="px-1 space-y-2.5">
        <div 
          className="px-4 py-2 rounded-xl inline-block font-black text-[22px] tracking-tight shadow-xs"
          style={{ backgroundColor: '#d1f4e7', color: '#064e6f' }}
        >
          💳 TOTAL: Rp {total.toLocaleString('id-ID')}
        </div>

        <div className="text-[18px] font-black flex items-center gap-1.5">
          <span>🏷</span>
          <span>STATUS: </span>
          <span className={isLunas ? 'text-emerald-600' : 'text-rose-500'}>
            {customer.status}
          </span>
        </div>

        <div className="text-[18px] font-black text-slate-900 flex items-center gap-1.5">
          <span>🚚</span>
          <span>PENGIRIMAN: {customer.delivery}</span>
        </div>
      </div>

      {/* Dashed Divider */}
      <div className="border-b-[4px] border-dashed border-[#086788] my-3.5 w-full opacity-80"></div>

      {/* Footer Quote & Event */}
      <div className="text-center pt-0.5 pb-2">
        <p className="text-[18px] font-black italic tracking-wide text-slate-900 font-serif">
          “PAKAIAN BERSIH, HATI SENANG”
        </p>
        {eventText && (
          <p className="text-[14px] font-bold text-slate-800 mt-1">
            {eventText}
          </p>
        )}
      </div>
    </div>
  );
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

        const idbBotConfig = await get('tt_wa_bot_config');
        if (idbBotConfig) setWaBotConfig(idbBotConfig);
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
        return JSON.parse(saved);
      } catch (e) {
        // ignore parse error
      }
    }
    return { enabled: false, ip: '' };
  });
  const [showBotModal, setShowBotModal] = useState(false);
  const [botStatus, setBotStatus] = useState<{
    checked: boolean;
    connected: boolean;
    message: string;
    botNumber?: string | null;
    qrImage?: string | null;
    pairingCode?: string | null;
  }>({ checked: false, connected: false, message: 'Belum dicek', qrImage: null, pairingCode: null });
  const [isCheckingBot, setIsCheckingBot] = useState(false);
  const [isSendingWA, setIsSendingWA] = useState(false);
  const [testPhoneInput, setTestPhoneInput] = useState('');
  const [pairingPhoneInput, setPairingPhoneInput] = useState('085169949219');
  const [botAuthTab, setBotAuthTab] = useState<'qr' | 'code'>('qr');
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const receiptCardRef = useRef<HTMLDivElement>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentYear = now.getFullYear();

    // Daftar Hari Besar & Peringatan Nasional Resmi Indonesia (Tanggal Tetap)
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

    // Daftar Hari Libur & Hari Besar Keagamaan Nasional (Moving Holidays)
    const movingHolidays = [
      // 2024
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

      // 2025
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

      // 2026
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

      // 2027
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
    // Masukkan tanggal-tanggal peringatan nasional tetap untuk tahun berjalan dan sekitarnya
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

  const getBotBaseUrl = (rawIp: string) => {
    let url = rawIp.trim().replace(/\/+$/, '');
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) {
      url = 'http://' + url;
    }
    try {
      const parsed = new URL(url);
      if (!parsed.port) {
        parsed.port = '3005';
      }
      return parsed.origin;
    } catch {
      if (!/:\d+$/.test(url)) {
        url += ':3005';
      }
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
          message: 'Masukkan alamat IP STB terlebih dahulu (contoh: 192.168.1.15:3005).',
          qrImage: null,
          pairingCode: null
        });
      }
      return false;
    }

    if (!silent) setIsCheckingBot(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${baseUrl}/status`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await res.json();
      if (res.ok && data.connected) {
        setBotStatus({
          checked: true,
          connected: true,
          botNumber: data.botNumber,
          qrImage: null,
          pairingCode: null,
          message: `Terhubung ke Bot STB (+${data.botNumber || 'Aktif'})`
        });
        return true;
      } else {
        setBotStatus(prev => ({
          checked: true,
          connected: false,
          botNumber: null,
          qrImage: data.qrImage || null,
          pairingCode: data.pairingCode || prev.pairingCode || null,
          message: data.qrImage
            ? 'Server STB Aktif! Silakan Scan QR di bawah atau gunakan Kode 8 Digit.'
            : 'Server STB Aktif, sedang menyiapkan QR Code WhatsApp...'
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
          message: 'Tidak dapat menghubungi STB. Pastikan HP satu WiFi dengan STB & pm2 laundry-tante-tika sudah jalan.'
        });
      }
      return false;
    } finally {
      if (!silent) setIsCheckingBot(false);
    }
  };

  useEffect(() => {
    if (!showBotModal || !waBotConfig.ip.trim()) return;
    const interval = setInterval(() => {
      checkBotConnection(waBotConfig.ip, true);
    }, 3500);
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

  const generateReceiptImage = async (): Promise<string | null> => {
    if (!receiptCardRef.current) return null;
    try {
      const canvas = await html2canvas(receiptCardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      });
      return canvas.toDataURL('image/jpeg', 0.88);
    } catch (err) {
      console.warn('Gagal render gambar nota:', err);
      return null;
    }
  };

  const handlePreviewImageCard = async () => {
    if (cart.length === 0) {
      showModal("Layanan Kosong", "Pilih minimal 1 layanan sebelum melihat pratinjau nota gambar.");
      return;
    }
    setIsGeneratingImage(true);
    try {
      const img = await generateReceiptImage();
      if (img) {
        setPreviewImage(img);
        setShowImagePreview(true);
      } else {
        showModal("Gagal Pratinjau", "Tidak dapat merender tampilan gambar nota.");
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const sendViaBotOrFallback = async (
    cleanPhone: string, 
    textMessage: string,
    imageBase64?: string | null,
    caption?: string
  ): Promise<{ sentViaBot: boolean; usedFallback: boolean; sentAsImage: boolean }> => {
    const baseUrl = getBotBaseUrl(waBotConfig.ip);

    // Jika Mode Bot ON, IP STB terisi, dan Nomor WA pelanggan ada -> Coba kirim lewat Bot WiFi STB
    if (waBotConfig.enabled && baseUrl && cleanPhone) {
      setIsSendingWA(true);
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(`${baseUrl}/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            phone: cleanPhone, 
            message: textMessage,
            image: imageBase64 || undefined,
            caption: caption || undefined
          }),
          signal: controller.signal
        });
        clearTimeout(timer);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          setIsSendingWA(false);
          return { sentViaBot: true, usedFallback: false, sentAsImage: !!data.hasImage };
        }
      } catch (err) {
        console.warn('Bot STB tidak terjangkau, otomatis beralih ke WA biasa:', err);
      }
      setIsSendingWA(false);

      // Fallback otomatis ke aplikasi WhatsApp biasa jika Bot STB sedang mati / di luar WiFi
      const fallbackText = caption ? `${caption}\n\n${textMessage}` : textMessage;
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(fallbackText)}`, '_blank');
      return { sentViaBot: false, usedFallback: true, sentAsImage: false };
    }

    // Mode manual (Bot OFF atau nomor tidak diisi)
    const manualText = caption ? `${caption}\n\n${textMessage}` : textMessage;
    if (cleanPhone) {
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(manualText)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(manualText)}`, '_blank');
    }
    return { sentViaBot: false, usedFallback: false, sentAsImage: false };
  };

  const handleTestBotMessage = async () => {
    const targetRaw = testPhoneInput.trim() || customer.phone.trim();
    let cleanPhone = targetRaw.replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);

    if (!cleanPhone) {
      showModal('Nomor Kosong', 'Masukkan nomor WhatsApp tujuan tes terlebih dahulu.');
      return;
    }

    const baseUrl = getBotBaseUrl(waBotConfig.ip);
    if (!baseUrl) {
      showModal('IP Kosong', 'Masukkan IP STB WiFi rumah terlebih dahulu (contoh: 192.168.1.15:3005).');
      return;
    }

    setIsCheckingBot(true);
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${baseUrl}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          message: `*TES BOT WIFI LAUNDRY TANTE TIKA* ✅\n\nKoneksi antara Aplikasi HP dan Bot STB Armbian (${baseUrl}) telah berhasil terhubung melalui WiFi rumah!`
        }),
        signal: controller.signal
      });
      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setBotStatus({
          checked: true,
          connected: true,
          botNumber: data.botNumber,
          message: `Tes kirim berhasil ke +${cleanPhone}`
        });
        showModal('Berhasil Terkirim!', `Pesan tes telah dikirim otomatis oleh Bot STB ke nomor +${cleanPhone} tanpa membuka aplikasi WA.`);
      } else {
        showModal('Gagal Kirim Bot', data.error || 'Pastikan QR WA sudah di-scan di terminal STB Armbian.');
      }
    } catch {
      showModal('Gagal Terhubung', 'Tidak bisa menghubungi IP STB. Pastikan HP terhubung ke WiFi rumah dan bot-stb aktif di PM2.');
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

    let imageBase64: string | null = null;
    if (waBotConfig.enabled) {
      setIsSendingWA(true);
      imageBase64 = await generateReceiptImage();
    }

    const result = await sendViaBotOrFallback(cleanPhone, text, imageBase64, caption);

    saveToHistory();
    resetForm();

    if (result.sentViaBot) {
      if (result.sentAsImage) {
        showModal("Terkirim via Bot STB ✅", `Nota Gambar (persis seperti contoh) beserta pesan antar otomatis ("${getWAGreeting()}, Kak...") telah berhasil dikirim ke WhatsApp pelanggan!`);
      } else {
        showModal("Terkirim via Bot WiFi ✅", "Nota telah dikirim otomatis oleh Bot STB Armbian ke WhatsApp pelanggan dan transaksi disimpan di riwayat.");
      }
    } else if (result.usedFallback) {
      showModal("Dialihkan ke WA Biasa", "Bot STB sedang tidak terjangkau di WiFi rumah, nota dan pesan antar otomatis dialihkan membuka aplikasi WhatsApp biasa.");
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

    const result = await sendViaBotOrFallback(cleanPhone, message);

    // Otomatis hapus riwayat transaksi tadi
    setHistory(prev => prev.filter((_, i) => i !== idx));

    if (result.sentViaBot) {
      showModal(
        "Lunas & Terkirim Otomatis ✅",
        `Konfirmasi LUNAS untuk kak ${customerName} telah dikirim otomatis lewat Bot WiFi STB, dan riwayat (#LT-${record.id}) telah dihapus.`
      );
    } else if (result.usedFallback) {
      showModal(
        "Pembayaran Dikonfirmasi",
        `Bot STB sedang offline, konfirmasi LUNAS untuk kak ${customerName} otomatis dibuka di WhatsApp biasa & riwayat (#LT-${record.id}) dihapus.`
      );
    } else {
      showModal(
        "Pembayaran Dikonfirmasi", 
        `Konfirmasi pembayaran LUNAS untuk kak ${customerName} telah dibuka di WhatsApp, dan data transaksi (#LT-${record.id}) telah otomatis dihapus dari riwayat.`
      );
    }
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
          className="nota-container overflow-hidden mx-auto max-w-sm bg-white"
          id="notaBox"
        >
          <div className="p-10 text-center relative bg-[#fdfbf7]">
            <div className="absolute top-6 right-8 font-black text-[10px] text-orange-800 bg-orange-100 px-3 py-1 rounded-full">
              #LT-{notaId}
            </div>
            <img src={LOGO_URL} crossOrigin="anonymous" className="w-20 h-20 mx-auto mb-4 object-contain" alt="Logo" />
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
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${
                customer.status === 'LUNAS' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
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
                            className="no-print-img text-red-400 hover:text-red-600 transition-colors p-0.5"
                            title="Hapus"
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
              <p className="text-center text-[8px] font-black text-slate-300 tracking-[0.3em] uppercase">Pakaian Bersih Hati Senang</p>
              <div className="bg-orange-50/80 border border-orange-200/70 py-2.5 px-3 rounded-xl text-center shadow-xs">
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
                          <p className="text-sm font-black text-slate-900">Rp {record.total.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Rincian Layanan yang Terdaftar */}
                      {items.length > 0 && (
                        <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-100 text-[10px] space-y-1.5">
                          <div className="flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-wider">
                            <span>Layanan Terdaftar ({items.length})</span>
                          </div>
                          <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                            {items.map((it: any, itIdx: number) => (
                              <div key={itIdx} className="flex justify-between items-center text-slate-600 font-medium">
                                <span className="truncate pr-2">• {it.name} ({it.qty} {it.unit})</span>
                                <span className="font-bold text-slate-800 shrink-0">Rp {(it.price * it.qty).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tombol Aksi: Konfirmasi / Lunas */}
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

      {/* Hidden Offscreen Receipt Card for html2canvas */}
      <div 
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: '-9999px',
          width: '450px',
          pointerEvents: 'none',
          zIndex: -999,
          opacity: 0.99
        }}
      >
        <div ref={receiptCardRef} style={{ width: '450px' }}>
          <ReceiptCard
            notaId={notaId}
            customer={customer}
            cart={cart}
            total={total}
            time={currentTime}
            eventText={upcomingEventText}
          />
        </div>
      </div>

      {/* Modal Pratinjau Nota Gambar */}
      {showImagePreview && previewImage && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-[250] p-4 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-5 max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="text-cyan-600" />
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-800">
                  Pratinjau Nota Gambar
                </h3>
              </div>
              <button 
                onClick={() => setShowImagePreview(false)}
                className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-500 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Preview image scrollable */}
            <div className="overflow-y-auto py-3 space-y-3">
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 flex justify-center">
                <img 
                  src={previewImage} 
                  alt="Nota Laundry Tante Tika" 
                  className="w-full h-auto object-contain"
                />
              </div>

              {/* Caption preview info box */}
              <div className="bg-cyan-50 border border-cyan-100 rounded-2xl p-3 text-[11px] space-y-1">
                <div className="flex items-center justify-between text-[9px] font-black uppercase text-cyan-700 tracking-wider">
                  <span>Caption Otomatis Bot ({getWAGreeting()})</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-200/70 text-cyan-900 font-bold">WIB</span>
                </div>
                <p className="text-slate-700 font-medium italic">
                  "{getWACaption(customer.delivery)}"
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex gap-2">
              <a
                href={previewImage}
                download={`Nota-LT-${notaId}.jpg`}
                className="flex-1 py-3 px-3 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
              >
                <Download size={14} />
                <span>Simpan</span>
              </a>
              <button
                onClick={() => {
                  setShowImagePreview(false);
                  handleWA();
                }}
                className="flex-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 transition-all active:scale-[0.98]"
              >
                <Send size={14} />
                <span>Kirim via Bot STB</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                    <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">Bot WA WiFi (STB Armbian)</h3>
                    <p className="text-[10px] text-slate-400 font-medium">Koneksi langsung via WiFi Rumah tanpa tunnel</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowBotModal(false)}
                  className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Saklar ON/OFF */}
              <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                <div>
                  <p className="text-xs font-black uppercase text-slate-800">Saklar Mode Bot WiFi</p>
                  <p className="text-[10px] text-slate-400">
                    {waBotConfig.enabled
                      ? 'AKTIF: Kirim otomatis via STB (Fallback ke WA biasa jika offline)'
                      : 'NONAKTIF: Selalu buka aplikasi WhatsApp manual'}
                  </p>
                </div>
                <button
                  onClick={() => setWaBotConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-14 h-8 rounded-full p-1 transition-all flex items-center ${
                    waBotConfig.enabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'
                  }`}
                >
                  <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
                </button>
              </div>

              {/* Input IP STB */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Alamat IP STB Armbian (Port 3005)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Contoh: 192.168.1.15:3005"
                    value={waBotConfig.ip}
                    onChange={e => setWaBotConfig(prev => ({ ...prev, ip: e.target.value }))}
                    className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs text-slate-800 placeholder:text-slate-300"
                  />
                  <button
                    onClick={() => checkBotConnection(waBotConfig.ip)}
                    disabled={isCheckingBot}
                    className="px-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-wider btn-press disabled:opacity-50 shrink-0"
                  >
                    {isCheckingBot ? 'Cek...' : 'Cek Koneksi'}
                  </button>
                </div>
                {botStatus.checked && (
                  <div className={`p-3 rounded-xl text-[11px] font-bold flex items-center gap-2 ${
                    botStatus.connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}>
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${botStatus.connected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span>{botStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Panel Tautkan WhatsApp Khusus Pairing Code 8 Digit (1 HP) */}
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
                    Khusus <b>1 HP (Tanpa Scan Kamera)</b>. Isi IP STB di atas, masukkan nomor WA Laundry Anda di bawah, lalu klik <b>Minta Kode Pairing</b>:
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
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Buka WhatsApp ➔ <b>Perangkat Tertaut</b> ➔ <b>Tautkan Perangkat</b> ➔ pilih <b>"Tautkan dengan nomor telepon saja"</b> di bagian bawah layar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tombol Ganti Nomor WA jika sudah terhubung */}
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

              {/* Tes Kirim WA */}
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
