import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  Search,
  Download,
  Upload,
  DollarSign,
  Calendar,
  Tag,
  CreditCard,
  AlertCircle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Filter,
  RefreshCw,
  Check,
  X,
  UserPlus,
  Sparkles,
  FileSpreadsheet,
  Smartphone,
  Moon,
  Sun,
  HandCoins,
  Receipt,
  Lock,
  LogOut,
  User,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc
} from 'firebase/firestore';

// ============================================================================
// CONFIGURACIÓN DE FIREBASE (SOPORTA ENTORNO ACTUAL + TU SERVIDOR PROPIO VERCEL)
// ============================================================================
const getEnvVar = (key) => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return import.meta.env[key];
    }
  } catch (e) {
    // ignore
  }
  return '';
};

const envFirebaseConfig = getEnvVar('VITE_FIREBASE_API_KEY')
  ? {
      apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
      authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
      storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('VITE_FIREBASE_APP_ID')
    }
  : null;

const firebaseConfig =
  typeof __firebase_config !== 'undefined' && __firebase_config
    ? JSON.parse(__firebase_config)
    : envFirebaseConfig;

const rawAppId =
  typeof __app_id !== 'undefined' && __app_id
    ? String(__app_id)
    : getEnvVar('VITE_APP_ID') || 'finanzas-ar-app';
const appId = rawAppId.trim();
const appIdSanitized = rawAppId.replace(/[^a-zA-Z0-9_-]/g, '_');

let app = null;
let auth = null;
let db = null;
let authInitPromise = null;

try {
  if (firebaseConfig && firebaseConfig.apiKey) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.error('Error inicializando Firebase:', e);
}

const normalizeUsername = (u) =>
  String(u || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]/g, '');

const simpleHash = (str) => {
  const s = String(str || '');
  let h1 = 0xdeadbeef ^ s.length;
  let h2 = 0x41c6ce57 ^ s.length;
  for (let i = 0, ch; i < s.length; i++) {
    ch = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

const getRelayTopicsForUser = (username, password = '') => {
  const u = normalizeUsername(username);
  if (!u) return [];
  const passClean = String(password || '').trim();
  const topics = [];
  if (passClean) {
    topics.push(`finanzas_ar_rt_v4_${u}_${simpleHash(u + ':' + passClean)}`);
    topics.push(`finanzas_ar_sync_v3_${u}_${simpleHash(u + ':' + passClean)}`);
  }
  topics.push(`finanzas_ar_vault_v4_${u}_${simpleHash('vault_ar_2025_' + u)}`);
  topics.push(`finanzas_ar_vault_v3_${u}_${simpleHash('vault_ar_2025_' + u)}`);
  return Array.from(new Set(topics));
};

const DEVICE_SYNC_ID = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const dividirEnFragmentosSync = (payloadObj) => {
  const rawStr = JSON.stringify(payloadObj);
  const MAX_CHUNK = 2800;
  if (rawStr.length <= MAX_CHUNK) {
    return [rawStr];
  }
  const syncBatchId = `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  const totalParts = Math.ceil(rawStr.length / MAX_CHUNK);
  const parts = [];
  for (let i = 0; i < totalParts; i++) {
    parts.push(
      JSON.stringify({
        _chunked: true,
        batchId: syncBatchId,
        part: i,
        total: totalParts,
        ownerUser: payloadObj.ownerUser,
        updatedAt: payloadObj.updatedAt,
        data: rawStr.slice(i * MAX_CHUNK, (i + 1) * MAX_CHUNK)
      })
    );
  }
  return parts;
};

// ============================================================================
// CONSTANTES Y CATEGORÍAS
// ============================================================================
const CATEGORIAS_EGRESO = [
  { id: 'Supermercado', nombre: 'Supermercado', icono: '🛒', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { id: 'Comida y Delivery', nombre: 'Comida y Delivery', icono: '🍔', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'Salidas y Amigos', nombre: 'Salidas y Amigos', icono: '🍻', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
  { id: 'Transporte y SUBE', nombre: 'Transporte / Auto', icono: '🚌', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { id: 'Gimnasio y Salud', nombre: 'Gimnasio / Suplementos', icono: '💪', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'Servicios y Alquiler', nombre: 'Servicios / Fijos', icono: '🏠', color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30' },
  { id: 'Suscripciones', nombre: 'Suscripciones (iCloud/Spotify)', icono: '🔄', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { id: 'Compras y Ropa', nombre: 'Compras / Ropa', icono: '🛍️', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { id: 'Pago de Deuda', nombre: 'Pago de Deuda / Tarjeta', icono: '🤝', color: 'bg-rose-500/20 text-rose-400 border-rose-500/30' },
  { id: 'Ahorro / Cambio USD', nombre: 'Compra USD / Ahorro', icono: '💵', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  { id: 'Otros Gastos', nombre: 'Otros Gastos', icono: '📦', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' }
];

const CATEGORIAS_INGRESO = [
  { id: 'Sueldo', nombre: 'Sueldo / Trabajo', icono: '💼', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 'Freelance / Extra', nombre: 'Extra / Changas', icono: '⚡', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { id: 'Cobro de Deuda', nombre: 'Cobro de Deuda', icono: '🤝', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { id: 'Ventas', nombre: 'Ventas', icono: '🏷️', color: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  { id: 'Rendimientos', nombre: 'Rendimientos / MP', icono: '📈', color: 'bg-lime-500/20 text-lime-400 border-lime-500/30' },
  { id: 'Ahorro USD', nombre: 'Ingreso / Compra USD', icono: '💵', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  { id: 'Regalo / Otros', nombre: 'Regalo / Otros', icono: '🎁', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' }
];

const METODOS_PAGO = [
  'MercadoPago / Transferencia',
  'Efectivo',
  'Tarjeta de Débito',
  'Tarjeta de Crédito',
  'Dólares Efectivo / Billete',
  'Cuenta en Dólares / Banco'
];

const TARJETAS_SUGERIDAS = [
  'Credicoop Cabal',
  'Visa',
  'Mastercard',
  'American Express',
  'Naranja X',
  'Visa Galicia',
  'Mastercard Galicia',
  'Visa Santander',
  'Visa BBVA',
  'MercadoPago / QR'
];

const SUSCRIPCIONES_SUGERIDAS = [
  { nombre: 'iCloud+', moneda: 'USD', monto: 2.99, tipoDolar: 'tarjeta' },
  { nombre: 'Spotify', moneda: 'USD', monto: 3.99, tipoDolar: 'tarjeta' },
  { nombre: 'Netflix', moneda: 'USD', monto: 7.99, tipoDolar: 'tarjeta' },
  { nombre: 'YouTube Premium', moneda: 'USD', monto: 3.99, tipoDolar: 'tarjeta' },
  { nombre: 'ChatGPT Plus', moneda: 'USD', monto: 20, tipoDolar: 'tarjeta' },
  { nombre: 'Disney+', moneda: 'ARS', monto: 10999, tipoDolar: 'oficial' },
  { nombre: 'Amazon Prime', moneda: 'USD', monto: 4.99, tipoDolar: 'tarjeta' },
  { nombre: 'PlayStation Plus', moneda: 'USD', monto: 7.99, tipoDolar: 'tarjeta' }
];

const formatARS = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(num);
};

const formatUSD = (amount) => {
  const num = Number(amount) || 0;
  return (
    'US$ ' +
    new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: num % 1 !== 0 ? 2 : 0,
      maximumFractionDigits: 2
    }).format(num)
  );
};

const formatMoney = (amount, moneda = 'ARS') => {
  return moneda === 'USD' ? formatUSD(amount) : formatARS(amount);
};

const getTodayString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60 * 1000);
  return local.toISOString().split('T')[0];
};

const getCurrentMonthKey = () => getTodayString().slice(0, 7);

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [monedaCajaActiva, setMonedaCajaActiva] = useState('ARS');

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('finanzas_ar_active_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return null;
  });
  const [authMode, setAuthMode] = useState('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [accountsMap, setAccountsMap] = useState({});
  const [lastSyncTime, setLastSyncTime] = useState('');
  const [syncingVault, setSyncingVault] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [copiasEncontradas, setCopiasEncontradas] = useState([]);
  const [mostrarSelectorCopias, setMostrarSelectorCopias] = useState(false);

  const [user, setUser] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [misDeudas, setMisDeudas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState('conectando');
  const [toast, setToast] = useState(null);

  const vaultLoadedRef = useRef(false);
  const movimientosRef = useRef([]);
  const deudasRef = useRef([]);
  const misDeudasRef = useRef([]);

  useEffect(() => {
    movimientosRef.current = movimientos;
  }, [movimientos]);
  useEffect(() => {
    deudasRef.current = deudas;
  }, [deudas]);
  useEffect(() => {
    misDeudasRef.current = misDeudas;
  }, [misDeudas]);

  const [tarjetaEditandoVencimiento, setTarjetaEditandoVencimiento] = useState(null);

  const [cotizacionDolar, setCotizacionDolar] = useState({
    oficial: 1100,
    tarjeta: 1430,
    actualizado: null,
    cargando: false,
    modoManual: false
  });

  const [filtroMes, setFiltroMes] = useState('ACTUAL');
  const [filtroTipoMov, setFiltroTipoMov] = useState('TODOS');
  const [filtroMonedaMov, setFiltroMonedaMov] = useState('TODAS');
  const [busquedaMov, setBusquedaMov] = useState('');

  const [filtroEstadoDeuda, setFiltroEstadoDeuda] = useState('PENDIENTES');
  const [busquedaDeudor, setBusquedaDeudor] = useState('');
  const [personaSeleccionada, setPersonaSeleccionada] = useState('TODAS');

  const [subTabMiDeuda, setSubTabMiDeuda] = useState('tarjeta');
  const [acreedorSeleccionado, setAcreedorSeleccionado] = useState('TODOS');

  const [modalMovimiento, setModalMovimiento] = useState(false);
  const [editandoMovId, setEditandoMovId] = useState(null);
  const [mantenerAbiertoMov, setMantenerAbiertoMov] = useState(false);
  const [formMov, setFormMov] = useState({
    tipo: 'egreso',
    moneda: 'ARS',
    monto: '',
    categoria: 'Supermercado',
    descripcion: '',
    fecha: getTodayString(),
    metodo: 'MercadoPago / Transferencia'
  });

  const [modalDeuda, setModalDeuda] = useState(false);
  const [editandoDeudaId, setEditandoDeudaId] = useState(null);
  const [mantenerAbiertoDeuda, setMantenerAbiertoDeuda] = useState(false);
  const [formDeuda, setFormDeuda] = useState({
    persona: '',
    concepto: '',
    montoTotal: '',
    montoPagado: '0',
    fecha: getTodayString(),
    notas: ''
  });

  const [modalCobrar, setModalCobrar] = useState(null);
  const [montoACobrar, setMontoACobrar] = useState('');
  const [sumarAlBalance, setSumarAlBalance] = useState(true);
  const [metodoCobro, setMetodoCobro] = useState('MercadoPago / Transferencia');

  const [modalMiDeuda, setModalMiDeuda] = useState(false);
  const [editandoMiDeudaId, setEditandoMiDeudaId] = useState(null);
  const [mantenerAbiertoMiDeuda, setMantenerAbiertoMiDeuda] = useState(true);
  const [formMiDeuda, setFormMiDeuda] = useState({
    subtipo: 'tarjeta',
    esSuscripcion: false,
    acreedor: '',
    concepto: '',
    moneda: 'ARS',
    tipoDolar: 'oficial',
    cuotasTotales: '1',
    cuotasPagadas: '0',
    montoCuota: '',
    montoTotal: '',
    montoPagado: '0',
    fecha: getTodayString(),
    vencimiento: '',
    notas: ''
  });

  const [modalPagarMiDeuda, setModalPagarMiDeuda] = useState(null);
  const [montoAPagarMiDeuda, setMontoAPagarMiDeuda] = useState('');
  const [descontarDelBalance, setDescontarDelBalance] = useState(true);
  const [metodoPagoMiDeuda, setMetodoPagoMiDeuda] = useState('MercadoPago / Transferencia');

  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (mensaje, tipo = 'ok') => {
    setToast({ mensaje, tipo });
    setTimeout(() => {
      setToast((prev) => (prev?.mensaje === mensaje ? null : prev));
    }, 3200);
  };

  // ==========================================================================
  // COTIZACIÓN DEL DÓLAR EN TIEMPO REAL
  // ==========================================================================
  const obtenerCotizacionDolar = async (silencioso = false) => {
    if (!silencioso) {
      setCotizacionDolar((prev) => ({ ...prev, cargando: true }));
    }
    try {
      const [resOficial, resTarjeta] = await Promise.all([
        fetch('https://dolarapi.com/v1/dolares/oficial'),
        fetch('https://dolarapi.com/v1/dolares/tarjeta')
      ]);

      if (!resOficial.ok || !resTarjeta.ok) {
        throw new Error('No se pudo obtener la cotización');
      }

      const dataOficial = await resOficial.json();
      const dataTarjeta = await resTarjeta.json();

      const valorOficial = Number(dataOficial?.venta) || 1100;
      const valorTarjeta = Number(dataTarjeta?.venta) || Math.round(valorOficial * 1.3);

      setCotizacionDolar({
        oficial: valorOficial,
        tarjeta: valorTarjeta,
        actualizado: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        cargando: false,
        modoManual: false
      });
      if (!silencioso) {
        showToast(`Dólar actualizado: Oficial ${formatARS(valorOficial)} / Tarjeta ${formatARS(valorTarjeta)}`);
      }
    } catch (err) {
      setCotizacionDolar((prev) => ({
        ...prev,
        cargando: false,
        actualizado: prev.actualizado || 'Estimado'
      }));
      if (!silencioso) {
        showToast('No se pudo conectar con la API del dólar', 'error');
      }
    }
  };

  useEffect(() => {
    obtenerCotizacionDolar(true);
    const interval = setInterval(() => {
      obtenerCotizacionDolar(true);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const obtenerMontosDeudaEnARS = (deuda) => {
    const esUSD = deuda.moneda === 'USD';
    const tipoCambio =
      deuda.tipoDolar === 'tarjeta' ? cotizacionDolar.tarjeta : cotizacionDolar.oficial;
    const factor = esUSD ? tipoCambio : 1;

    const mesActualKey = getCurrentMonthKey();

    if (deuda.esSuscripcion) {
      const montoBaseOrig = Number(deuda.montoCuota || deuda.montoTotal || 0);
      const pagadaEsteMes = deuda.ultimoMesPagado === mesActualKey;
      const montoARS = Math.round(montoBaseOrig * factor);
      return {
        esUSD,
        esSuscripcion: true,
        pagadaEsteMes,
        tipoCambio,
        montoTotalOrig: montoBaseOrig,
        montoPagadoOrig: pagadaEsteMes ? montoBaseOrig : 0,
        restanteOrig: pagadaEsteMes ? 0 : montoBaseOrig,
        montoCuotaOrig: montoBaseOrig,
        montoTotalARS: montoARS,
        montoPagadoARS: pagadaEsteMes ? montoARS : 0,
        restanteARS: pagadaEsteMes ? 0 : montoARS,
        montoCuotaARS: montoARS
      };
    }

    const montoTotalOrig = Number(deuda.montoTotal) || 0;
    const montoPagadoOrig = Number(deuda.montoPagado) || 0;
    const restanteOrig = Math.max(0, montoTotalOrig - montoPagadoOrig);
    const montoCuotaOrig =
      Number(deuda.montoCuota) ||
      (Number(deuda.cuotasTotales) > 0 ? montoTotalOrig / Number(deuda.cuotasTotales) : montoTotalOrig);

    return {
      esUSD,
      esSuscripcion: false,
      pagadaEsteMes: false,
      tipoCambio,
      montoTotalOrig,
      montoPagadoOrig,
      restanteOrig,
      montoCuotaOrig,
      montoTotalARS: Math.round(montoTotalOrig * factor),
      montoPagadoARS: Math.round(montoPagadoOrig * factor),
      restanteARS: Math.round(restanteOrig * factor),
      montoCuotaARS: Math.round(montoCuotaOrig * factor)
    };
  };

  // ==========================================================================
  // CONEXIÓN CON FIREBASE Y SINCRONIZACIÓN DE BÓVEDA
  // ==========================================================================
  const asegurarConexionNube = async () => {
    if (!auth || !db) return null;
    if (auth.currentUser) {
      setUser(auth.currentUser);
      setSyncStatus('conectado');
      return auth.currentUser;
    }
    if (authInitPromise) {
      return authInitPromise;
    }
    authInitPromise = (async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try {
            const cred = await signInWithCustomToken(auth, __initial_auth_token);
            setUser(cred.user);
            setSyncStatus('conectado');
            return cred.user;
          } catch (tokenErr) {
            const cred = await signInAnonymously(auth);
            setUser(cred.user);
            setSyncStatus('conectado');
            return cred.user;
          }
        } else {
          const cred = await signInAnonymously(auth);
          setUser(cred.user);
          setSyncStatus('conectado');
          return cred.user;
        }
      } catch (err) {
        console.error('Error conectando con Firebase Auth:', err);
        setSyncStatus('local');
        return null;
      } finally {
        authInitPromise = null;
      }
    })();
    return authInitPromise;
  };

  useEffect(() => {
    if (!auth) {
      setSyncStatus('local');
      setLoading(false);
      return;
    }
    asegurarConexionNube();
    const unsubscribe = onAuthStateChanged(auth, (currentUserAuth) => {
      if (currentUserAuth) {
        setUser(currentUserAuth);
        setSyncStatus('conectado');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const cuentasRef = collection(db, 'artifacts', appId, 'public', 'data', 'usuarios_cuentas');
    const unsubCuentas = onSnapshot(
      cuentasRef,
      (snapshot) => {
        const map = {};
        snapshot.docs.forEach((d) => {
          map[d.id] = d.data();
        });
        setAccountsMap(map);
      },
      () => {
        // Silencioso si no hay permisos públicos
      }
    );
    return () => unsubCuentas();
  }, [user]);

  const getDeletedIdsKey = (username) => `finanzas_ar_deleted_ids_${normalizeUsername(username)}`;

  const getDeletedIdsSet = (username) => {
    try {
      const raw = localStorage.getItem(getDeletedIdsKey(username));
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  };

  const guardarDeletedIdsSet = (username, setObj) => {
    if (!username) return;
    try {
      localStorage.setItem(getDeletedIdsKey(username), JSON.stringify(Array.from(setObj)));
    } catch (e) {
      // ignore
    }
  };

  const registrarIdEliminado = (username, id) => {
    if (!username || !id) return;
    try {
      const set = getDeletedIdsSet(username);
      set.add(id);
      guardarDeletedIdsSet(username, set);
    } catch (e) {
      // ignore
    }
  };

  const mergeListsById = (listA = [], listB = [], deletedSet = new Set()) => {
    const map = new Map();
    [...(Array.isArray(listA) ? listA : []), ...(Array.isArray(listB) ? listB : [])].forEach((item) => {
      if (!item || !item.id) return;
      if (deletedSet.has(item.id)) return;
      const prev = map.get(item.id);
      if (!prev) {
        map.set(item.id, item);
      } else {
        const prevTime = Number(prev.updatedAt || prev.creadoEn || 0);
        const nextTime = Number(item.updatedAt || item.creadoEn || 0);
        if (nextTime >= prevTime) {
          map.set(item.id, item);
        }
      }
    });
    return Array.from(map.values());
  };

  const leerCacheLocalCuenta = (username) => {
    const cleanUser = normalizeUsername(username);
    if (!cleanUser) return null;
    let bestData = null;

    try {
      const raw = localStorage.getItem(`finanzas_ar_vault_cache_${cleanUser}`);
      if (raw) bestData = JSON.parse(raw);
    } catch (e) {
      // ignore
    }

    try {
      if (typeof window !== 'undefined' && window.name && window.name.startsWith('FINANZAS_VAULT:')) {
        const map = JSON.parse(window.name.slice('FINANZAS_VAULT:'.length));
        const wnData = map?.[cleanUser];
        if (wnData) {
          const countBest =
            (bestData?.movimientos?.length || 0) +
            (bestData?.deudas?.length || 0) +
            (bestData?.misDeudas?.length || 0);
          const countWn =
            (wnData?.movimientos?.length || 0) +
            (wnData?.deudas?.length || 0) +
            (wnData?.misDeudas?.length || 0);
          if (countWn > countBest || Number(wnData.updatedAt || 0) > Number(bestData?.updatedAt || 0)) {
            bestData = wnData;
          }
        }
      }
    } catch (e) {
      // ignore
    }

    return bestData;
  };

  const guardarCacheLocalCuenta = (username, payload) => {
    const cleanUser = normalizeUsername(username);
    if (!cleanUser) return;
    try {
      localStorage.setItem(`finanzas_ar_vault_cache_${cleanUser}`, JSON.stringify(payload));
    } catch (e) {
      // ignore
    }
    try {
      if (typeof window !== 'undefined') {
        let map = {};
        if (window.name && window.name.startsWith('FINANZAS_VAULT:')) {
          try {
            map = JSON.parse(window.name.slice('FINANZAS_VAULT:'.length)) || {};
          } catch (e) {
            map = {};
          }
        }
        map[cleanUser] = payload;
        window.name = 'FINANZAS_VAULT:' + JSON.stringify(map);
      }
    } catch (e) {
      // ignore
    }
  };

  const publicarEnRelayHTTPS = async (username, password, payloadObj) => {
    const topics = getRelayTopicsForUser(username, password);
    if (!topics.length) return false;
    const mensajes = dividirEnFragmentosSync(payloadObj);
    let ok = false;

    await Promise.all(
      topics.slice(0, 2).map(async (topic) => {
        try {
          for (const msgBody of mensajes) {
            const res = await fetch(`https://ntfy.sh/${topic}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'text/plain;charset=UTF-8'
              },
              body: msgBody
            });
            if (res.ok) ok = true;
          }
        } catch (e) {
          // ignore
        }
      })
    );
    return ok;
  };

  const descargarDeRelayHTTPS = async (username, password) => {
    const topics = getRelayTopicsForUser(username, password);
    if (!topics.length) return null;
    const deletedSet = getDeletedIdsSet(username);

    let mergedMovs = [];
    let mergedDeudas = [];
    let mergedMisDeudas = [];
    let maxUpdatedAt = 0;
    let foundAny = false;
    const chunkBuffers = {};

    const parsearYAcumularSnapshot = (parsed) => {
      if (!parsed || parsed.app !== 'finanzas-ar-sync') return;
      if (Array.isArray(parsed.deletedIds)) {
        parsed.deletedIds.forEach((id) => deletedSet.add(id));
      }
      const m = Array.isArray(parsed.movimientos) ? parsed.movimientos : [];
      const d = Array.isArray(parsed.deudas) ? parsed.deudas : [];
      const md = Array.isArray(parsed.misDeudas) ? parsed.misDeudas : [];
      if (m.length + d.length + md.length > 0 || (parsed.deletedIds && parsed.deletedIds.length > 0)) {
        mergedMovs = mergeListsById(mergedMovs, m, deletedSet);
        mergedDeudas = mergeListsById(mergedDeudas, d, deletedSet);
        mergedMisDeudas = mergeListsById(mergedMisDeudas, md, deletedSet);
        if (Number(parsed.updatedAt || 0) > maxUpdatedAt) {
          maxUpdatedAt = Number(parsed.updatedAt || 0);
        }
        foundAny = true;
      }
    };

    for (const topic of topics) {
      try {
        const res = await fetch(`https://ntfy.sh/${topic}/json?poll=1&since=all`, {
          cache: 'no-store'
        });
        if (!res.ok) continue;
        const text = await res.text();
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        for (let i = 0; i < lines.length; i++) {
          try {
            const ev = JSON.parse(lines[i]);
            if (ev.event !== 'message') continue;

            if (ev.attachment && ev.attachment.url) {
              try {
                const attRes = await fetch(ev.attachment.url, { cache: 'no-store' });
                if (attRes.ok) {
                  const attJson = await attRes.json();
                  parsearYAcumularSnapshot(attJson);
                  continue;
                }
              } catch (attErr) {
                // fallback
              }
            }

            if (ev.message && ev.message.startsWith('{')) {
              const parsed = JSON.parse(ev.message);
              if (parsed._chunked && parsed.batchId) {
                if (!chunkBuffers[parsed.batchId]) {
                  chunkBuffers[parsed.batchId] = {
                    total: parsed.total,
                    parts: {}
                  };
                }
                chunkBuffers[parsed.batchId].parts[parsed.part] = parsed.data;
                const keysCount = Object.keys(chunkBuffers[parsed.batchId].parts).length;
                if (keysCount === chunkBuffers[parsed.batchId].total) {
                  let fullJsonStr = '';
                  for (let p = 0; p < chunkBuffers[parsed.batchId].total; p++) {
                    fullJsonStr += chunkBuffers[parsed.batchId].parts[p] || '';
                  }
                  const fullParsed = JSON.parse(fullJsonStr);
                  parsearYAcumularSnapshot(fullParsed);
                }
              } else {
                parsearYAcumularSnapshot(parsed);
              }
            }
          } catch (parseErr) {
            // ignore
          }
        }
      } catch (e) {
        // ignore
      }
    }

    guardarDeletedIdsSet(username, deletedSet);
    if (!foundAny) return null;
    return {
      app: 'finanzas-ar-sync',
      ownerUser: normalizeUsername(username),
      movimientos: mergedMovs,
      deudas: mergedDeudas,
      misDeudas: mergedMisDeudas,
      deletedIds: Array.from(deletedSet),
      updatedAt: maxUpdatedAt || Date.now()
    };
  };

  // Guardar bóveda completa de la cuenta activa en tiempo real
  const respaldarEnBovedaCuenta = async (
    nextMovs,
    nextDeudas,
    nextMisDeudas,
    silencioso = true,
    overrideUserObj = null,
    forzarAunqueVacio = false
  ) => {
    const activeObj = overrideUserObj || currentUser;
    const activeUsername = normalizeUsername(activeObj?.username);
    if (!activeUsername) return false;

    const cleanMovs = Array.isArray(nextMovs) ? nextMovs : [];
    const cleanDeudas = Array.isArray(nextDeudas) ? nextDeudas : [];
    const cleanMisDeudas = Array.isArray(nextMisDeudas) ? nextMisDeudas : [];
    const deletedIdsArr = Array.from(getDeletedIdsSet(activeUsername));
    const totalAGuardar = cleanMovs.length + cleanDeudas.length + cleanMisDeudas.length;

    if (totalAGuardar === 0 && deletedIdsArr.length === 0 && silencioso && !forzarAunqueVacio) {
      return false;
    }

    const nowTs = Date.now();
    const horaStr = new Date(nowTs).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const payload = {
      app: 'finanzas-ar-sync',
      deviceId: DEVICE_SYNC_ID,
      ownerUser: activeUsername,
      movimientos: cleanMovs,
      deudas: cleanDeudas,
      misDeudas: cleanMisDeudas,
      deletedIds: deletedIdsArr,
      updatedAt: nowTs,
      updatedHora: horaStr
    };

    guardarCacheLocalCuenta(activeUsername, payload);

    try {
      if (!silencioso) setSyncingVault(true);

      let firestoreOk = false;
      const activeAuthUser = await asegurarConexionNube();
      if (db && activeAuthUser) {
        const docPayload = {
          deviceId: DEVICE_SYNC_ID,
          ownerUser: activeUsername,
          movimientosJson: JSON.stringify(cleanMovs),
          deudasJson: JSON.stringify(cleanDeudas),
          misDeudasJson: JSON.stringify(cleanMisDeudas),
          deletedIdsJson: JSON.stringify(deletedIdsArr),
          updatedAt: nowTs,
          updatedHora: horaStr
        };
        // Si estás en tu servidor propio (VITE_FIREBASE_API_KEY), guardamos directo en colección raíz 'boveda_cuentas'
        if (envFirebaseConfig) {
          try {
            await setDoc(doc(db, 'boveda_cuentas', activeUsername), docPayload);
            firestoreOk = true;
          } catch (e) {
            // fallback
          }
        }
        try {
          const bovedaRef = doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'boveda_cuentas',
            activeUsername
          );
          await setDoc(bovedaRef, docPayload);
          firestoreOk = true;
        } catch (pubErr) {
          try {
            const userPrivateRef = doc(
              db,
              'artifacts',
              appId,
              'users',
              activeAuthUser.uid,
              'boveda_cuentas',
              activeUsername
            );
            await setDoc(userPrivateRef, docPayload);
            firestoreOk = true;
          } catch (privErr) {
            // Relay HTTPS + Cache local siguen activos
          }
        }
      }

      const relayOk = await publicarEnRelayHTTPS(
        activeUsername,
        activeObj?.passwordHash || '',
        payload
      );

      setLastSyncTime(horaStr);
      if (relayOk || firestoreOk) {
        setSyncStatus('conectado');
      }
      if (!silencioso) {
        showToast(`Sincronizado en base de datos (@${activeUsername} • ${horaStr})`);
      }
      return true;
    } catch (err) {
      if (!silencioso) {
        showToast('Guardado en memoria local del dispositivo', 'ok');
      }
      return false;
    } finally {
      if (!silencioso) setSyncingVault(false);
    }
  };

  useEffect(() => {
    const activeUsername = normalizeUsername(currentUser?.username);
    if (!activeUsername) {
      setMovimientos([]);
      setDeudas([]);
      setMisDeudas([]);
      setLoading(false);
      vaultLoadedRef.current = false;
      return;
    }

    let cancelled = false;
    setLoading(true);

    const aplicarDatosRecibidos = (movs, deuds, misDeuds, incomingDeletedIds = [], horaLabel = '') => {
      if (cancelled) return;
      const deletedSet = getDeletedIdsSet(activeUsername);
      if (Array.isArray(incomingDeletedIds) && incomingDeletedIds.length > 0) {
        incomingDeletedIds.forEach((id) => deletedSet.add(id));
        guardarDeletedIdsSet(activeUsername, deletedSet);
      }

      const hayDatosLocales =
        movimientosRef.current.length > 0 ||
        misDeudasRef.current.length > 0 ||
        deudasRef.current.length > 0;
      const vieneVacioDeNube =
        (!movs || movs.length === 0) &&
        (!misDeuds || misDeuds.length === 0) &&
        (!deuds || deuds.length === 0);

      if (vieneVacioDeNube && hayDatosLocales) {
        respaldarEnBovedaCuenta(
          movimientosRef.current,
          deudasRef.current,
          misDeudasRef.current,
          true,
          currentUser,
          true
        );
        setLoading(false);
        return;
      }

      const nextM = mergeListsById(movimientosRef.current, movs, deletedSet).sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );
      const nextD = mergeListsById(deudasRef.current, deuds, deletedSet).sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );
      const nextMD = mergeListsById(misDeudasRef.current, misDeuds, deletedSet).sort(
        (a, b) => new Date(b.fecha) - new Date(a.fecha)
      );

      movimientosRef.current = nextM;
      deudasRef.current = nextD;
      misDeudasRef.current = nextMD;

      setMovimientos(nextM);
      setDeudas(nextD);
      setMisDeudas(nextMD);
      vaultLoadedRef.current = true;
      setLoading(false);
      if (horaLabel) setLastSyncTime(horaLabel);

      guardarCacheLocalCuenta(activeUsername, {
        app: 'finanzas-ar-sync',
        ownerUser: activeUsername,
        movimientos: nextM,
        deudas: nextD,
        misDeudas: nextMD,
        deletedIds: Array.from(deletedSet),
        updatedAt: Date.now()
      });
    };

    const cached = leerCacheLocalCuenta(activeUsername);
    if (cached) {
      aplicarDatosRecibidos(
        cached.movimientos || [],
        cached.deudas || [],
        cached.misDeudas || [],
        cached.deletedIds || [],
        cached.updatedHora || 'Cache'
      );
    }

    const sincronizarDesdeNube = async () => {
      try {
        const relayData = await descargarDeRelayHTTPS(
          activeUsername,
          currentUser?.passwordHash || ''
        );

        let fsMovs = [];
        let fsDeudas = [];
        let fsMisDeudas = [];
        let fsDeleted = [];

        const activeAuthUser = await asegurarConexionNube();
        if (db && activeAuthUser) {
          const docRefsToTry = [];
          if (envFirebaseConfig) {
            docRefsToTry.push(doc(db, 'boveda_cuentas', activeUsername));
          }
          const candidateAppIds = Array.from(new Set([appId, appIdSanitized, 'finanzas-ar-app']));
          for (const candidateId of candidateAppIds) {
            docRefsToTry.push(
              doc(db, 'artifacts', candidateId, 'public', 'data', 'boveda_cuentas', activeUsername),
              doc(db, 'artifacts', candidateId, 'public', 'data', 'cuentas_datos', activeUsername),
              doc(db, 'artifacts', candidateId, 'users', activeAuthUser.uid, 'boveda_cuentas', activeUsername)
            );
          }
          for (const refDoc of docRefsToTry) {
            try {
              const snap = await getDoc(refDoc);
              if (snap.exists()) {
                const data = snap.data();
                const delArr = data.deletedIdsJson ? JSON.parse(data.deletedIdsJson) : [];
                fsDeleted = [...fsDeleted, ...delArr];
                const m = data.movimientosJson
                  ? JSON.parse(data.movimientosJson)
                  : Array.isArray(data.movimientos)
                  ? data.movimientos
                  : [];
                const d = data.deudasJson
                  ? JSON.parse(data.deudasJson)
                  : Array.isArray(data.deudas)
                  ? data.deudas
                  : [];
                const md = data.misDeudasJson
                  ? JSON.parse(data.misDeudasJson)
                  : Array.isArray(data.misDeudas)
                  ? data.misDeudas
                  : [];
                fsMovs = mergeListsById(fsMovs, m, new Set());
                fsDeudas = mergeListsById(fsDeudas, d, new Set());
                fsMisDeudas = mergeListsById(fsMisDeudas, md, new Set());
              }
            } catch (e) {
              // ignore
            }
          }
        }

        const allDeleted = [
          ...(relayData?.deletedIds || []),
          ...fsDeleted,
          ...Array.from(getDeletedIdsSet(activeUsername))
        ];
        const deletedSet = new Set(allDeleted);
        const combinedMovs = mergeListsById(relayData?.movimientos || [], fsMovs, deletedSet);
        const combinedDeudas = mergeListsById(relayData?.deudas || [], fsDeudas, deletedSet);
        const combinedMisDeudas = mergeListsById(relayData?.misDeudas || [], fsMisDeudas, deletedSet);

        if (!cancelled) {
          aplicarDatosRecibidos(
            combinedMovs,
            combinedDeudas,
            combinedMisDeudas,
            allDeleted,
            new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          );
          setSyncStatus('conectado');
        }
      } catch (e) {
        if (!cancelled) setLoading(false);
      }
    };

    sincronizarDesdeNube();
    const pollInterval = setInterval(sincronizarDesdeNube, 4000);

    const topics = getRelayTopicsForUser(activeUsername, currentUser?.passwordHash || '');
    const eventSources = [];
    const sseChunkBuffers = {};

    topics.slice(0, 2).forEach((topic) => {
      try {
        const es = new EventSource(`https://ntfy.sh/${topic}/sse`);
        es.onmessage = (event) => {
          try {
            const parsedEvent = JSON.parse(event.data);
            const rawMsg = parsedEvent.message || event.data;
            if (!rawMsg || !String(rawMsg).startsWith('{')) return;
            const obj = JSON.parse(rawMsg);

            if (obj._chunked && obj.batchId) {
              if (!sseChunkBuffers[obj.batchId]) {
                sseChunkBuffers[obj.batchId] = { total: obj.total, parts: {} };
              }
              sseChunkBuffers[obj.batchId].parts[obj.part] = obj.data;
              if (
                Object.keys(sseChunkBuffers[obj.batchId].parts).length ===
                sseChunkBuffers[obj.batchId].total
              ) {
                let fullStr = '';
                for (let i = 0; i < sseChunkBuffers[obj.batchId].total; i++) {
                  fullStr += sseChunkBuffers[obj.batchId].parts[i] || '';
                }
                const fullPayload = JSON.parse(fullStr);
                if (fullPayload.deviceId !== DEVICE_SYNC_ID && fullPayload.app === 'finanzas-ar-sync') {
                  aplicarDatosRecibidos(
                    fullPayload.movimientos || [],
                    fullPayload.deudas || [],
                    fullPayload.misDeudas || [],
                    fullPayload.deletedIds || [],
                    fullPayload.updatedHora || 'En vivo'
                  );
                }
              }
            } else if (obj.app === 'finanzas-ar-sync' && obj.deviceId !== DEVICE_SYNC_ID) {
              aplicarDatosRecibidos(
                obj.movimientos || [],
                obj.deudas || [],
                obj.misDeudas || [],
                obj.deletedIds || [],
                obj.updatedHora || 'En vivo'
              );
            }
          } catch (err) {
            // ignore
          }
        };
        eventSources.push(es);
      } catch (e) {
        // ignore
      }
    });

    let unsubFirestore = null;
    if (user && db) {
      try {
        const bovedaRef = envFirebaseConfig
          ? doc(db, 'boveda_cuentas', activeUsername)
          : doc(db, 'artifacts', appId, 'public', 'data', 'boveda_cuentas', activeUsername);
        unsubFirestore = onSnapshot(
          bovedaRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data();
              if (data.deviceId === DEVICE_SYNC_ID) return;
              try {
                const m = data.movimientosJson ? JSON.parse(data.movimientosJson) : [];
                const d = data.deudasJson ? JSON.parse(data.deudasJson) : [];
                const md = data.misDeudasJson ? JSON.parse(data.misDeudasJson) : [];
                const delIds = data.deletedIdsJson ? JSON.parse(data.deletedIdsJson) : [];
                aplicarDatosRecibidos(m, d, md, delIds, data.updatedHora || 'En vivo');
              } catch (err) {
                // ignore
              }
            }
          },
          () => {
            // ignore
          }
        );
      } catch (e) {
        // ignore
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sincronizarDesdeNube();
      }
    };
    window.addEventListener('focus', sincronizarDesdeNube);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      eventSources.forEach((es) => {
        try {
          es.close();
        } catch (e) {
          // ignore
        }
      });
      if (unsubFirestore) unsubFirestore();
      window.removeEventListener('focus', sincronizarDesdeNube);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, currentUser]);

  // ==========================================================================
  // AUTENTICACIÓN DE USUARIO Y CONTRASEÑA
  // ==========================================================================
  const getLocalAccounts = () => {
    try {
      const raw = localStorage.getItem('finanzas_ar_local_accounts');
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  };

  const saveLocalAccount = (username, data) => {
    try {
      const current = getLocalAccounts();
      current[username] = data;
      localStorage.setItem('finanzas_ar_local_accounts', JSON.stringify(current));
    } catch (e) {
      // ignore
    }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    const cleanUsername = normalizeUsername(authUsername);
    const cleanPass = String(authPassword || '').trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      setAuthError('El usuario debe tener al menos 3 caracteres (letras o números).');
      return;
    }
    if (!cleanPass || cleanPass.length < 4) {
      setAuthError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }

    setAuthLoading(true);
    try {
      const localAccounts = getLocalAccounts();
      const existingAccount = accountsMap[cleanUsername] || localAccounts[cleanUsername];

      if (authMode === 'register') {
        if (cleanPass !== String(authConfirmPassword || '').trim()) {
          setAuthError('Las contraseñas no coinciden.');
          setAuthLoading(false);
          return;
        }
        if (existingAccount) {
          setAuthError('Ese nombre de usuario ya está registrado. Iniciá sesión.');
          setAuthLoading(false);
          return;
        }

        const newAccount = {
          username: cleanUsername,
          displayName: authUsername.trim(),
          passwordHash: cleanPass,
          creadoEn: Date.now()
        };

        saveLocalAccount(cleanUsername, newAccount);

        const activeUser = await asegurarConexionNube();
        if (db && activeUser) {
          try {
            const userDocRef = envFirebaseConfig
              ? doc(db, 'usuarios_cuentas', cleanUsername)
              : doc(db, 'artifacts', appId, 'public', 'data', 'usuarios_cuentas', cleanUsername);
            await setDoc(userDocRef, newAccount);
          } catch (cloudErr) {
            // guardada localmente
          }
        }

        const sessionObj = {
          username: cleanUsername,
          displayName: newAccount.displayName,
          passwordHash: cleanPass
        };
        setCurrentUser(sessionObj);
        try {
          localStorage.setItem('finanzas_ar_active_session', JSON.stringify(sessionObj));
        } catch (err) {
          // ignore
        }
        showToast(`¡Bienvenido, ${newAccount.displayName}! Cuenta creada.`);
      } else {
        if (!existingAccount) {
          const relaySnap = await descargarDeRelayHTTPS(cleanUsername, cleanPass);
          if (relaySnap) {
            const recoveredAccount = {
              username: cleanUsername,
              displayName: authUsername.trim(),
              passwordHash: cleanPass,
              creadoEn: Date.now()
            };
            saveLocalAccount(cleanUsername, recoveredAccount);
            const sessionObj = {
              username: cleanUsername,
              displayName: recoveredAccount.displayName,
              passwordHash: cleanPass
            };
            setCurrentUser(sessionObj);
            try {
              localStorage.setItem('finanzas_ar_active_session', JSON.stringify(sessionObj));
            } catch (err) {
              // ignore
            }
            showToast(`¡Sesión sincronizada desde la nube, @${cleanUsername}!`);
            setAuthLoading(false);
            return;
          }

          const autoAccount = {
            username: cleanUsername,
            displayName: authUsername.trim(),
            passwordHash: cleanPass,
            creadoEn: Date.now()
          };
          saveLocalAccount(cleanUsername, autoAccount);
          const sessionObj = {
            username: cleanUsername,
            displayName: autoAccount.displayName,
            passwordHash: cleanPass
          };
          setCurrentUser(sessionObj);
          try {
            localStorage.setItem('finanzas_ar_active_session', JSON.stringify(sessionObj));
          } catch (err) {
            // ignore
          }
          showToast(`¡Hola, ${autoAccount.displayName}!`);
          setAuthLoading(false);
          return;
        }

        if (existingAccount.passwordHash !== cleanPass) {
          setAuthError('Contraseña incorrecta. Verificala e intentá de nuevo.');
          setAuthLoading(false);
          return;
        }

        saveLocalAccount(cleanUsername, existingAccount);
        const sessionObj = {
          username: cleanUsername,
          displayName: existingAccount.displayName || cleanUsername,
          passwordHash: cleanPass
        };
        setCurrentUser(sessionObj);
        try {
          localStorage.setItem('finanzas_ar_active_session', JSON.stringify(sessionObj));
        } catch (err) {
          // ignore
        }
        showToast(`¡Hola de nuevo, ${existingAccount.displayName || cleanUsername}!`);
      }
    } catch (err) {
      setAuthError('Ocurrió un error al validar tu cuenta. Intentá nuevamente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const cerrarSesionUsuario = () => {
    setCurrentUser(null);
    setAuthPassword('');
    setAuthConfirmPassword('');
    try {
      localStorage.removeItem('finanzas_ar_active_session');
    } catch (e) {
      // ignore
    }
    showToast('Sesión cerrada correctamente');
  };

  const forzarSincronizacionCompleta = async () => {
    if (!currentUser?.username) return;
    setSyncingVault(true);
    try {
      const nubeSnap = await descargarDeRelayHTTPS(
        currentUser.username,
        currentUser.passwordHash || ''
      );
      const deletedSet = getDeletedIdsSet(currentUser.username);
      const mergedM = mergeListsById(movimientos, nubeSnap?.movimientos || [], deletedSet);
      const mergedD = mergeListsById(deudas, nubeSnap?.deudas || [], deletedSet);
      const mergedMD = mergeListsById(misDeudas, nubeSnap?.misDeudas || [], deletedSet);

      setMovimientos(mergedM);
      setDeudas(mergedD);
      setMisDeudas(mergedMD);

      await respaldarEnBovedaCuenta(mergedM, mergedD, mergedMD, false);
    } finally {
      setSyncingVault(false);
    }
  };

  const recuperarDatosHistoricosCuenta = async () => {
    const activeUsername = normalizeUsername(currentUser?.username);
    if (!activeUsername) return;
    setSyncingVault(true);
    try {
      try {
        localStorage.removeItem(getDeletedIdsKey(activeUsername));
      } catch (e) {
        // ignore
      }
      const emptyDeleted = new Set();

      let recMovs = [...movimientosRef.current];
      let recDeudas = [...deudasRef.current];
      let recMisDeudas = [...misDeudasRef.current];
      const snapshotsEncontrados = [];

      const registrarSnapshotCandidato = (origen, m = [], d = [], md = [], ts = 0) => {
        const total = (m?.length || 0) + (d?.length || 0) + (md?.length || 0);
        if (total === 0) return;
        const fechaObj = ts ? new Date(Number(ts)) : new Date();
        const horaTexto = fechaObj.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        snapshotsEncontrados.push({
          id: `${origen}_${ts}_${total}_${Math.random().toString(36).slice(2, 6)}`,
          origen,
          horaTexto,
          timestamp: Number(ts) || Date.now(),
          movimientos: m,
          deudas: d,
          misDeudas: md,
          total
        });
      };

      const relaySnap = await descargarDeRelayHTTPS(
        activeUsername,
        currentUser?.passwordHash || ''
      );
      if (relaySnap) {
        registrarSnapshotCandidato(
          'Nube HTTPS',
          relaySnap.movimientos,
          relaySnap.deudas,
          relaySnap.misDeudas,
          relaySnap.updatedAt
        );
        recMovs = mergeListsById(recMovs, relaySnap.movimientos || [], emptyDeleted);
        recDeudas = mergeListsById(recDeudas, relaySnap.deudas || [], emptyDeleted);
        recMisDeudas = mergeListsById(recMisDeudas, relaySnap.misDeudas || [], emptyDeleted);
      }

      const activeAuthUser = await asegurarConexionNube();
      if (db && activeAuthUser) {
        const candidateAppIds = Array.from(new Set([appId, appIdSanitized, 'finanzas-ar-app']));
        for (const candidateId of candidateAppIds) {
          for (const vaultColName of ['boveda_cuentas', 'cuentas_datos']) {
            try {
              const snapVault = await getDocs(
                collection(db, 'artifacts', candidateId, 'public', 'data', vaultColName)
              );
              snapVault.docs.forEach((d) => {
                const data = d.data();
                if (!data.ownerUser || normalizeUsername(data.ownerUser) === activeUsername || d.id === activeUsername) {
                  const m = data.movimientosJson
                    ? JSON.parse(data.movimientosJson)
                    : Array.isArray(data.movimientos)
                    ? data.movimientos
                    : [];
                  const de = data.deudasJson
                    ? JSON.parse(data.deudasJson)
                    : Array.isArray(data.deudas)
                    ? data.deudas
                    : [];
                  const md = data.misDeudasJson
                    ? JSON.parse(data.misDeudasJson)
                    : Array.isArray(data.misDeudas)
                    ? data.misDeudas
                    : [];
                  registrarSnapshotCandidato(`Nube (${vaultColName})`, m, de, md, data.updatedAt);
                  recMovs = mergeListsById(recMovs, m, emptyDeleted);
                  recDeudas = mergeListsById(recDeudas, de, emptyDeleted);
                  recMisDeudas = mergeListsById(recMisDeudas, md, emptyDeleted);
                }
              });
            } catch (e) {
              // ignore
            }
          }
        }
      }

      snapshotsEncontrados.sort((a, b) => b.total - a.total || b.timestamp - a.timestamp);
      setCopiasEncontradas(snapshotsEncontrados);

      setMovimientos(recMovs);
      setDeudas(recDeudas);
      setMisDeudas(recMisDeudas);

      const totalRecuperado = recMovs.length + recDeudas.length + recMisDeudas.length;
      if (totalRecuperado > 0) {
        await respaldarEnBovedaCuenta(recMovs, recDeudas, recMisDeudas, true);
        showToast(
          `Recuperados: ${recMovs.length} movs, ${recMisDeudas.length} deudas/tarjetas y ${recDeudas.length} cobros`
        );
      } else {
        showToast('Escaneo finalizado: no se hallaron copias adicionales en la nube', 'error');
      }
    } catch (err) {
      showToast('Error al escanear copias históricas', 'error');
    } finally {
      setSyncingVault(false);
    }
  };

  const generarCodigoSincronizacion = () => {
    const payload = {
      app: 'finanzas-ar-sync',
      ownerUser: normalizeUsername(currentUser?.username),
      movimientos,
      deudas,
      misDeudas,
      ts: Date.now()
    };
    return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  };

  const copiarCodigoSincronizacion = () => {
    try {
      const code = generarCodigoSincronizacion();
      const tempInput = document.createElement('textarea');
      tempInput.value = code;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand('copy');
      document.body.removeChild(tempInput);
      showToast('Código de sincronización copiado. Pegalo en tu celular o PC.');
    } catch (e) {
      showToast('No se pudo copiar automáticamente', 'error');
    }
  };

  const aplicarCodigoSincronizacion = async () => {
    const raw = String(syncCodeInput || '').trim();
    if (!raw) {
      showToast('Pegá primero el código de sincronización', 'error');
      return;
    }
    try {
      const jsonStr = decodeURIComponent(escape(atob(raw)));
      const data = JSON.parse(jsonStr);
      if (!data || (!Array.isArray(data.movimientos) && !Array.isArray(data.misDeudas))) {
        showToast('El código ingresado no es válido', 'error');
        return;
      }
      const activeUsername = normalizeUsername(currentUser?.username);
      const nextMovs = (data.movimientos || []).map((m) => ({ ...m, ownerUser: activeUsername }));
      const nextDeudas = (data.deudas || []).map((d) => ({ ...d, ownerUser: activeUsername }));
      const nextMisDeudas = (data.misDeudas || []).map((md) => ({ ...md, ownerUser: activeUsername }));

      setMovimientos(nextMovs);
      setDeudas(nextDeudas);
      setMisDeudas(nextMisDeudas);
      setSyncCodeInput('');
      await respaldarEnBovedaCuenta(nextMovs, nextDeudas, nextMisDeudas, false);
      showToast('¡Cuenta sincronizada con éxito!');
    } catch (e) {
      showToast('Código inválido o incompleto', 'error');
    }
  };

  // ==========================================================================
  // OPERACIONES CRUD (PC <-> CELULAR)
  // ==========================================================================
  const guardarMovimientoRecord = async (item) => {
    const activeUsername = normalizeUsername(currentUser?.username);
    const itemConUsuario = { ...item, ownerUser: activeUsername, updatedAt: Date.now() };

    const nextMovs = [
      itemConUsuario,
      ...movimientosRef.current.filter((m) => m.id !== itemConUsuario.id)
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    movimientosRef.current = nextMovs;
    setMovimientos(nextMovs);
    await respaldarEnBovedaCuenta(nextMovs, deudasRef.current, misDeudasRef.current, true);
  };

  const eliminarMovimientoRecord = async (id) => {
    const activeUsername = normalizeUsername(currentUser?.username);
    registrarIdEliminado(activeUsername, id);
    const nextMovs = movimientosRef.current.filter((m) => m.id !== id);
    movimientosRef.current = nextMovs;
    setMovimientos(nextMovs);
    await respaldarEnBovedaCuenta(nextMovs, deudasRef.current, misDeudasRef.current, true, null, true);
  };

  const guardarDeudaRecord = async (item) => {
    const activeUsername = normalizeUsername(currentUser?.username);
    const itemConUsuario = { ...item, ownerUser: activeUsername, updatedAt: Date.now() };

    const nextDeudas = [
      itemConUsuario,
      ...deudasRef.current.filter((d) => d.id !== itemConUsuario.id)
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    deudasRef.current = nextDeudas;
    setDeudas(nextDeudas);
    await respaldarEnBovedaCuenta(movimientosRef.current, nextDeudas, misDeudasRef.current, true);
  };

  const eliminarDeudaRecord = async (id) => {
    const activeUsername = normalizeUsername(currentUser?.username);
    registrarIdEliminado(activeUsername, id);
    const nextDeudas = deudasRef.current.filter((d) => d.id !== id);
    deudasRef.current = nextDeudas;
    setDeudas(nextDeudas);
    await respaldarEnBovedaCuenta(movimientosRef.current, nextDeudas, misDeudasRef.current, true, null, true);
  };

  const guardarMiDeudaRecord = async (item) => {
    const activeUsername = normalizeUsername(currentUser?.username);
    const itemConUsuario = { ...item, ownerUser: activeUsername, updatedAt: Date.now() };

    const nextMisDeudas = [
      itemConUsuario,
      ...misDeudasRef.current.filter((d) => d.id !== itemConUsuario.id)
    ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    misDeudasRef.current = nextMisDeudas;
    setMisDeudas(nextMisDeudas);
    await respaldarEnBovedaCuenta(movimientosRef.current, deudasRef.current, nextMisDeudas, true);
  };

  const eliminarMiDeudaRecord = async (id) => {
    const activeUsername = normalizeUsername(currentUser?.username);
    registrarIdEliminado(activeUsername, id);
    const nextMisDeudas = misDeudasRef.current.filter((d) => d.id !== id);
    misDeudasRef.current = nextMisDeudas;
    setMisDeudas(nextMisDeudas);
    await respaldarEnBovedaCuenta(movimientosRef.current, deudasRef.current, nextMisDeudas, true, null, true);
  };

  // ==========================================================================
  // MANEJADORES DE MOVIMIENTOS (INGRESOS / EGRESOS EN ARS Y USD)
  // ==========================================================================
  const abrirNuevoMovimiento = (tipo = 'egreso', monedaPorDefecto = null) => {
    const monedaElegida = monedaPorDefecto || monedaCajaActiva || 'ARS';
    setEditandoMovId(null);
    setFormMov({
      tipo,
      moneda: monedaElegida,
      monto: '',
      categoria:
        tipo === 'egreso'
          ? 'Supermercado'
          : monedaElegida === 'USD'
          ? 'Ahorro USD'
          : 'Sueldo',
      descripcion: '',
      fecha: getTodayString(),
      metodo:
        monedaElegida === 'USD'
          ? 'Dólares Efectivo / Billete'
          : 'MercadoPago / Transferencia'
    });
    setModalMovimiento(true);
  };

  const abrirEditarMovimiento = (mov) => {
    setEditandoMovId(mov.id);
    setFormMov({
      tipo: mov.tipo,
      moneda: mov.moneda || 'ARS',
      monto: String(mov.monto),
      categoria: mov.categoria,
      descripcion: mov.descripcion,
      fecha: mov.fecha,
      metodo: mov.metodo || 'MercadoPago / Transferencia'
    });
    setModalMovimiento(true);
  };

  const handleSubmitMovimiento = async (e) => {
    e.preventDefault();
    const montoNum = parseFloat(formMov.monto);
    if (!montoNum || montoNum <= 0) {
      showToast('Ingresá un monto válido mayor a 0', 'error');
      return;
    }

    const nuevoMov = {
      id: editandoMovId || `mov_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      tipo: formMov.tipo,
      moneda: formMov.moneda || 'ARS',
      monto: montoNum,
      categoria: formMov.categoria,
      descripcion: formMov.descripcion.trim() || formMov.categoria,
      fecha: formMov.fecha || getTodayString(),
      metodo: formMov.metodo,
      creadoEn: Date.now()
    };

    await guardarMovimientoRecord(nuevoMov);
    showToast(editandoMovId ? 'Movimiento actualizado' : 'Movimiento guardado');

    if (!editandoMovId && mantenerAbiertoMov) {
      setFormMov((prev) => ({
        ...prev,
        monto: '',
        descripcion: ''
      }));
    } else {
      setModalMovimiento(false);
    }
  };

  // ==========================================================================
  // MANEJADORES DE "PLATA QUE ME DEBEN"
  // ==========================================================================
  const abrirNuevaDeuda = (personaPredefinida = '') => {
    setEditandoDeudaId(null);
    setFormDeuda({
      persona: personaPredefinida,
      concepto: '',
      montoTotal: '',
      montoPagado: '0',
      fecha: getTodayString(),
      notas: ''
    });
    setModalDeuda(true);
  };

  const abrirEditarDeuda = (deuda) => {
    setEditandoDeudaId(deuda.id);
    setFormDeuda({
      persona: deuda.persona,
      concepto: deuda.concepto,
      montoTotal: String(deuda.montoTotal),
      montoPagado: String(deuda.montoPagado || 0),
      fecha: deuda.fecha,
      notas: deuda.notas || ''
    });
    setModalDeuda(true);
  };

  const handleSubmitDeuda = async (e) => {
    e.preventDefault();
    const total = parseFloat(formDeuda.montoTotal);
    const pagado = parseFloat(formDeuda.montoPagado) || 0;

    if (!formDeuda.persona.trim()) {
      showToast('Escribí el nombre de la persona que te debe', 'error');
      return;
    }
    if (!formDeuda.concepto.trim()) {
      showToast('Detallá el gasto o motivo de la deuda', 'error');
      return;
    }
    if (!total || total <= 0) {
      showToast('Ingresá un monto total válido', 'error');
      return;
    }

    const estado = pagado >= total ? 'pagado' : 'pendiente';

    const nuevaDeuda = {
      id: editandoDeudaId || `deu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      persona: formDeuda.persona.trim(),
      concepto: formDeuda.concepto.trim(),
      montoTotal: total,
      montoPagado: Math.min(pagado, total),
      fecha: formDeuda.fecha || getTodayString(),
      estado,
      notas: formDeuda.notas.trim(),
      creadoEn: Date.now()
    };

    await guardarDeudaRecord(nuevaDeuda);
    showToast(editandoDeudaId ? 'Registro de deuda actualizado' : 'Deuda anotada correctamente');

    if (!editandoDeudaId && mantenerAbiertoDeuda) {
      setFormDeuda((prev) => ({
        ...prev,
        concepto: '',
        montoTotal: '',
        montoPagado: '0',
        notas: ''
      }));
    } else {
      setModalDeuda(false);
    }
  };

  const abrirModalCobrar = (deuda) => {
    const restante = Math.max(0, (Number(deuda.montoTotal) || 0) - (Number(deuda.montoPagado) || 0));
    setModalCobrar(deuda);
    setMontoACobrar(String(restante));
    setSumarAlBalance(true);
    setMetodoCobro('MercadoPago / Transferencia');
  };

  const confirmarCobroDeuda = async (e) => {
    e.preventDefault();
    if (!modalCobrar) return;

    const cobro = parseFloat(montoACobrar);
    const restanteActual =
      (Number(modalCobrar.montoTotal) || 0) - (Number(modalCobrar.montoPagado) || 0);

    if (!cobro || cobro <= 0 || cobro > restanteActual) {
      showToast('Ingresá un monto válido a cobrar', 'error');
      return;
    }

    const nuevoPagado = (Number(modalCobrar.montoPagado) || 0) + cobro;
    const nuevoEstado = nuevoPagado >= modalCobrar.montoTotal ? 'pagado' : 'pendiente';

    const deudaActualizada = {
      ...modalCobrar,
      montoPagado: nuevoPagado,
      estado: nuevoEstado
    };

    await guardarDeudaRecord(deudaActualizada);

    if (sumarAlBalance) {
      const ingresoAutomatico = {
        id: `mov_cobro_${Date.now()}`,
        tipo: 'ingreso',
        moneda: 'ARS',
        monto: cobro,
        categoria: 'Cobro de Deuda',
        descripcion: `Cobro a ${modalCobrar.persona}: ${modalCobrar.concepto}`,
        fecha: getTodayString(),
        metodo: metodoCobro,
        creadoEn: Date.now()
      };
      await guardarMovimientoRecord(ingresoAutomatico);
    }

    showToast(
      nuevoEstado === 'pagado'
        ? `¡${modalCobrar.persona} saldó esta deuda!`
        : `Pago parcial de ${formatARS(cobro)} registrado`
    );
    setModalCobrar(null);
  };

  // ==========================================================================
  // MANEJADORES DE "PLATA QUE DEBO" (INFORMAL, TARJETAS Y SUSCRIPCIONES FIJAS)
  // ==========================================================================
  const obtenerVencimientoTarjetaEsteMes = (nombreTarjeta) => {
    const keyBusqueda = (nombreTarjeta || '').trim().toLowerCase();
    if (!keyBusqueda) return '';
    const mesActualKey = getCurrentMonthKey();

    const coincidencia = misDeudas.find((d) => {
      const esTarj = (d.subtipo || 'informal') === 'tarjeta';
      if (!esTarj) return false;
      const mismoNombre = (d.acreedor || '').trim().toLowerCase() === keyBusqueda;
      if (!mismoNombre || !d.vencimiento) return false;
      const mesAsignado = d.vencimientoMes || d.vencimiento.slice(0, 7);
      return mesAsignado === mesActualKey;
    });

    return coincidencia ? coincidencia.vencimiento : '';
  };

  const actualizarVencimientoTarjetaEnLote = async (nombreTarjeta, nuevaFecha) => {
    const keyBusqueda = (nombreTarjeta || '').trim().toLowerCase();
    if (!keyBusqueda) return;
    const mesActualKey = getCurrentMonthKey();

    const itemsDeEsaTarjeta = misDeudas.filter(
      (d) =>
        (d.subtipo || 'informal') === 'tarjeta' &&
        (d.acreedor || '').trim().toLowerCase() === keyBusqueda
    );

    await Promise.all(
      itemsDeEsaTarjeta.map((item) =>
        guardarMiDeudaRecord({
          ...item,
          vencimiento: nuevaFecha || '',
          vencimientoMes: nuevaFecha ? mesActualKey : ''
        })
      )
    );

    setTarjetaEditandoVencimiento(null);
    showToast(
      nuevaFecha
        ? `Vencimiento de ${nombreTarjeta} (${nuevaFecha}) aplicado a todos los consumos de este mes`
        : `Vencimiento de ${nombreTarjeta} limpiado`
    );
  };

  const abrirNuevaMiDeuda = (
    acreedorPredefinido = '',
    subtipoInicial = null,
    comoSuscripcion = false
  ) => {
    const tipoElegido = subtipoInicial || subTabMiDeuda || 'informal';
    const vencimientoHeredado =
      tipoElegido === 'tarjeta' && acreedorPredefinido
        ? obtenerVencimientoTarjetaEsteMes(acreedorPredefinido)
        : '';

    setEditandoMiDeudaId(null);
    setFormMiDeuda({
      subtipo: tipoElegido,
      esSuscripcion: Boolean(comoSuscripcion),
      acreedor: acreedorPredefinido,
      concepto: '',
      moneda: comoSuscripcion ? 'USD' : 'ARS',
      tipoDolar: comoSuscripcion ? 'tarjeta' : 'oficial',
      cuotasTotales: '1',
      cuotasPagadas: '0',
      montoCuota: '',
      montoTotal: '',
      montoPagado: '0',
      fecha: getTodayString(),
      vencimiento: vencimientoHeredado,
      notas: ''
    });
    setModalMiDeuda(true);
  };

  const abrirEditarMiDeuda = (deuda) => {
    const mesActualKey = getCurrentMonthKey();
    const esTarjeta = (deuda.subtipo || 'informal') === 'tarjeta';
    const mesVencimientoGuardado =
      deuda.vencimientoMes || (deuda.vencimiento ? deuda.vencimiento.slice(0, 7) : '');

    const vencimientoVigente =
      esTarjeta && deuda.vencimiento && mesVencimientoGuardado !== mesActualKey
        ? obtenerVencimientoTarjetaEsteMes(deuda.acreedor)
        : deuda.vencimiento || obtenerVencimientoTarjetaEsteMes(deuda.acreedor) || '';

    setEditandoMiDeudaId(deuda.id);
    setFormMiDeuda({
      subtipo: deuda.subtipo || 'informal',
      esSuscripcion: Boolean(deuda.esSuscripcion),
      acreedor: deuda.acreedor,
      concepto: deuda.concepto,
      moneda: deuda.moneda || 'ARS',
      tipoDolar: deuda.tipoDolar || 'oficial',
      cuotasTotales: String(deuda.cuotasTotales || 1),
      cuotasPagadas: String(deuda.cuotasPagadas || 0),
      montoCuota: String(deuda.montoCuota || deuda.montoTotal || ''),
      montoTotal: String(deuda.montoTotal),
      montoPagado: String(deuda.montoPagado || 0),
      fecha: deuda.fecha,
      vencimiento: vencimientoVigente,
      notas: deuda.notas || ''
    });
    setModalMiDeuda(true);
  };

  const handleSubmitMiDeuda = async (e) => {
    e.preventDefault();
    const esTarjeta = formMiDeuda.subtipo === 'tarjeta';
    const esSuscripcion = esTarjeta && Boolean(formMiDeuda.esSuscripcion);

    if (!formMiDeuda.acreedor.trim()) {
      showToast(
        esTarjeta
          ? 'Escribí o seleccioná qué tarjeta de crédito es'
          : 'Escribí el nombre de la persona a quien le debés',
        'error'
      );
      return;
    }
    if (!formMiDeuda.concepto.trim()) {
      showToast(
        esSuscripcion
          ? 'Escribí el nombre de la suscripción (ej: iCloud, Spotify)'
          : esTarjeta
          ? 'Detallá el artículo o compra realizada con la tarjeta'
          : 'Detallá el motivo o gasto de lo que debés',
        'error'
      );
      return;
    }

    let total = 0;
    let pagado = 0;
    let cuotasTotalesNum = 1;
    let cuotasPagadasNum = 0;
    let montoCuotaNum = 0;

    if (esSuscripcion) {
      montoCuotaNum = parseFloat(formMiDeuda.montoCuota) || parseFloat(formMiDeuda.montoTotal) || 0;
      if (!montoCuotaNum || montoCuotaNum <= 0) {
        showToast('Ingresá el valor mensual de la suscripción', 'error');
        return;
      }
      total = montoCuotaNum;
      pagado = 0;
    } else if (esTarjeta) {
      cuotasTotalesNum = Math.max(1, parseInt(formMiDeuda.cuotasTotales, 10) || 1);
      cuotasPagadasNum = Math.min(
        cuotasTotalesNum,
        Math.max(0, parseInt(formMiDeuda.cuotasPagadas, 10) || 0)
      );
      montoCuotaNum = parseFloat(formMiDeuda.montoCuota) || 0;
      const montoTotalInput = parseFloat(formMiDeuda.montoTotal) || 0;

      if (montoCuotaNum > 0) {
        total = Number((montoCuotaNum * cuotasTotalesNum).toFixed(2));
      } else if (montoTotalInput > 0) {
        total = montoTotalInput;
        montoCuotaNum = Number((montoTotalInput / cuotasTotalesNum).toFixed(2));
      }

      if (!total || total <= 0) {
        showToast('Ingresá el valor de la cuota o el monto total', 'error');
        return;
      }

      pagado = Number(Math.min(total, montoCuotaNum * cuotasPagadasNum).toFixed(2));
    } else {
      total = parseFloat(formMiDeuda.montoTotal);
      pagado = parseFloat(formMiDeuda.montoPagado) || 0;
      if (!total || total <= 0) {
        showToast('Ingresá un monto total válido', 'error');
        return;
      }
      montoCuotaNum = total;
    }

    const estado = !esSuscripcion && pagado >= total ? 'pagado' : 'pendiente';
    const mesActualKey = getCurrentMonthKey();

    const vencimientoFinal = esTarjeta
      ? formMiDeuda.vencimiento || obtenerVencimientoTarjetaEsteMes(formMiDeuda.acreedor) || ''
      : formMiDeuda.vencimiento || '';

    const prevItem = editandoMiDeudaId
      ? misDeudas.find((x) => x.id === editandoMiDeudaId)
      : null;

    const nuevaMiDeuda = {
      id: editandoMiDeudaId || `mideu_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      subtipo: formMiDeuda.subtipo || 'informal',
      esSuscripcion,
      ultimoMesPagado: esSuscripcion ? prevItem?.ultimoMesPagado || '' : '',
      acreedor: formMiDeuda.acreedor.trim(),
      concepto: formMiDeuda.concepto.trim(),
      moneda: esTarjeta ? formMiDeuda.moneda || 'ARS' : 'ARS',
      tipoDolar: esTarjeta ? formMiDeuda.tipoDolar || 'oficial' : 'oficial',
      cuotasTotales: cuotasTotalesNum,
      cuotasPagadas: cuotasPagadasNum,
      montoCuota: montoCuotaNum,
      montoTotal: total,
      montoPagado: Math.min(pagado, total),
      fecha: formMiDeuda.fecha || getTodayString(),
      vencimiento: vencimientoFinal,
      vencimientoMes: esTarjeta && vencimientoFinal ? mesActualKey : '',
      estado,
      notas: formMiDeuda.notas.trim(),
      creadoEn: Date.now()
    };

    await guardarMiDeudaRecord(nuevaMiDeuda);

    if (esTarjeta && vencimientoFinal) {
      const keyTarjeta = nuevaMiDeuda.acreedor.toLowerCase();
      const otrosConsumosMismaTarjeta = misDeudas.filter(
        (d) =>
          d.id !== nuevaMiDeuda.id &&
          (d.subtipo || 'informal') === 'tarjeta' &&
          (d.acreedor || '').trim().toLowerCase() === keyTarjeta &&
          (d.vencimiento !== vencimientoFinal || d.vencimientoMes !== mesActualKey)
      );

      if (otrosConsumosMismaTarjeta.length > 0) {
        await Promise.all(
          otrosConsumosMismaTarjeta.map((item) =>
            guardarMiDeudaRecord({
              ...item,
              vencimiento: vencimientoFinal,
              vencimientoMes: mesActualKey
            })
          )
        );
      }
    }

    showToast(
      editandoMiDeudaId
        ? 'Registro actualizado'
        : esSuscripcion
        ? 'Suscripción mensual fija guardada en la tarjeta'
        : esTarjeta
        ? 'Consumo de tarjeta anotado'
        : 'Deuda informal anotada'
    );

    if (!editandoMiDeudaId && mantenerAbiertoMiDeuda) {
      setFormMiDeuda((prev) => ({
        ...prev,
        concepto: '',
        montoCuota: '',
        montoTotal: '',
        montoPagado: '0',
        notas: ''
      }));
    } else {
      setModalMiDeuda(false);
    }
  };

  const cambiarTipoDolarDeudaRapido = async (deuda, nuevoTipoDolar) => {
    const actualizada = {
      ...deuda,
      tipoDolar: nuevoTipoDolar
    };
    await guardarMiDeudaRecord(actualizada);
    showToast(
      `Cambiado a Dólar ${nuevoTipoDolar === 'tarjeta' ? 'Tarjeta' : 'Oficial'} (${formatARS(
        nuevoTipoDolar === 'tarjeta' ? cotizacionDolar.tarjeta : cotizacionDolar.oficial
      )})`
    );
  };

  const abrirModalPagarMiDeuda = (deuda) => {
    const info = obtenerMontosDeudaEnARS(deuda);
    const esTarjeta = deuda.subtipo === 'tarjeta';
    const sugeridoOrig = deuda.esSuscripcion
      ? info.montoCuotaOrig
      : esTarjeta && info.montoCuotaOrig > 0 && info.montoCuotaOrig <= info.restanteOrig
      ? info.montoCuotaOrig
      : info.restanteOrig;

    setModalPagarMiDeuda(deuda);
    setMontoAPagarMiDeuda(String(Number(sugeridoOrig.toFixed(2))));
    setDescontarDelBalance(true);
    setMetodoPagoMiDeuda('MercadoPago / Transferencia');
  };

  const confirmarPagoMiDeuda = async (e) => {
    e.preventDefault();
    if (!modalPagarMiDeuda) return;

    const pagoOrig = parseFloat(montoAPagarMiDeuda);
    const info = obtenerMontosDeudaEnARS(modalPagarMiDeuda);
    const mesActualKey = getCurrentMonthKey();

    if (modalPagarMiDeuda.esSuscripcion) {
      if (!pagoOrig || pagoOrig <= 0) {
        showToast('Ingresá un monto válido', 'error');
        return;
      }
      const pagoEnARS = info.esUSD ? Math.round(pagoOrig * info.tipoCambio) : Math.round(pagoOrig);
      const suscripcionActualizada = {
        ...modalPagarMiDeuda,
        ultimoMesPagado: mesActualKey
      };
      await guardarMiDeudaRecord(suscripcionActualizada);

      if (descontarDelBalance) {
        const detalleMoneda = info.esUSD
          ? ` (${formatUSD(pagoOrig)} a Dólar ${
              modalPagarMiDeuda.tipoDolar === 'tarjeta' ? 'Tarjeta' : 'Oficial'
            } ${formatARS(info.tipoCambio)})`
          : '';
        const egresoAutomatico = {
          id: `mov_pagomideuda_${Date.now()}`,
          tipo: 'egreso',
          moneda: 'ARS',
          monto: pagoEnARS,
          categoria: 'Suscripciones',
          descripcion: `Suscripción ${modalPagarMiDeuda.concepto} (${modalPagarMiDeuda.acreedor})${detalleMoneda}`,
          fecha: getTodayString(),
          metodo: metodoPagoMiDeuda,
          creadoEn: Date.now()
        };
        await guardarMovimientoRecord(egresoAutomatico);
      }

      showToast(
        `¡Suscripción ${modalPagarMiDeuda.concepto} pagada este mes! Se renovará sola el mes que viene.`
      );
      setModalPagarMiDeuda(null);
      return;
    }

    if (!pagoOrig || pagoOrig <= 0 || pagoOrig > info.restanteOrig + 0.05) {
      showToast('Ingresá un monto válido a pagar', 'error');
      return;
    }

    const pagoEnARS = info.esUSD ? Math.round(pagoOrig * info.tipoCambio) : Math.round(pagoOrig);

    const nuevoPagadoOrig = Number(
      Math.min(info.montoTotalOrig, info.montoPagadoOrig + pagoOrig).toFixed(2)
    );
    const nuevoEstado =
      nuevoPagadoOrig >= info.montoTotalOrig - 0.01 ? 'pagado' : 'pendiente';

    const esTarjeta = modalPagarMiDeuda.subtipo === 'tarjeta';
    const cuotasTot = Number(modalPagarMiDeuda.cuotasTotales) || 1;
    const valorCuotaOrig = info.montoCuotaOrig || info.montoTotalOrig / cuotasTot;
    const nuevasCuotasPagadas = esTarjeta
      ? Math.min(cuotasTot, Math.round(nuevoPagadoOrig / valorCuotaOrig))
      : 1;

    const miDeudaActualizada = {
      ...modalPagarMiDeuda,
      montoPagado: nuevoPagadoOrig,
      cuotasPagadas: nuevasCuotasPagadas,
      estado: nuevoEstado
    };

    await guardarMiDeudaRecord(miDeudaActualizada);

    if (descontarDelBalance) {
      const detalleMoneda = info.esUSD
        ? ` (${formatUSD(pagoOrig)} a Dólar ${
            modalPagarMiDeuda.tipoDolar === 'tarjeta' ? 'Tarjeta' : 'Oficial'
          } ${formatARS(info.tipoCambio)})`
        : '';

      const egresoAutomatico = {
        id: `mov_pagomideuda_${Date.now()}`,
        tipo: 'egreso',
        moneda: 'ARS',
        monto: pagoEnARS,
        categoria: 'Pago de Deuda',
        descripcion: esTarjeta
          ? `Pago TC ${modalPagarMiDeuda.acreedor}: ${modalPagarMiDeuda.concepto} (Cuota ${nuevasCuotasPagadas}/${cuotasTot})${detalleMoneda}`
          : `Pago a ${modalPagarMiDeuda.acreedor}: ${modalPagarMiDeuda.concepto}`,
        fecha: getTodayString(),
        metodo: metodoPagoMiDeuda,
        creadoEn: Date.now()
      };
      await guardarMovimientoRecord(egresoAutomatico);
    }

    showToast(
      nuevoEstado === 'pagado'
        ? `¡Saldaste por completo ${modalPagarMiDeuda.concepto}!`
        : `Pago de ${formatARS(pagoEnARS)} registrado`
    );
    setModalPagarMiDeuda(null);
  };

  const reactivarSuscripcionEsteMes = async (deuda) => {
    await guardarMiDeudaRecord({
      ...deuda,
      ultimoMesPagado: ''
    });
    showToast(`${deuda.concepto} marcada nuevamente como pendiente de este mes`);
  };

  const ejecutarEliminacion = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.tipo === 'movimiento') {
      await eliminarMovimientoRecord(confirmDelete.id);
      showToast('Movimiento eliminado');
    } else if (confirmDelete.tipo === 'deuda') {
      await eliminarDeudaRecord(confirmDelete.id);
      showToast('Registro eliminado');
    } else if (confirmDelete.tipo === 'mideuda') {
      await eliminarMiDeudaRecord(confirmDelete.id);
      showToast('Deuda propia eliminada');
    }
    setConfirmDelete(null);
  };

  // ==========================================================================
  // CÁLCULOS Y MÉTRICAS
  // ==========================================================================
  const mesActualPrefijo = getCurrentMonthKey();

  const movimientosFiltradosPorPeriodo = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtroMes === 'TODOS') return true;
      const targetMes = filtroMes === 'ACTUAL' ? mesActualPrefijo : filtroMes;
      return m.fecha && m.fecha.startsWith(targetMes);
    });
  }, [movimientos, filtroMes, mesActualPrefijo]);

  const metricas = useMemo(() => {
    const movsARS = movimientos.filter((m) => (m.moneda || 'ARS') === 'ARS');
    const ingresosTotalesHistoricos = movsARS
      .filter((m) => m.tipo === 'ingreso')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const egresosTotalesHistoricos = movsARS
      .filter((m) => m.tipo === 'egreso')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const balanceDisponible = ingresosTotalesHistoricos - egresosTotalesHistoricos;

    const movsUSD = movimientos.filter((m) => m.moneda === 'USD');
    const ingresosUSDHistoricos = movsUSD
      .filter((m) => m.tipo === 'ingreso')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const egresosUSDHistoricos = movsUSD
      .filter((m) => m.tipo === 'egreso')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const balanceDisponibleUSD = Number((ingresosUSDHistoricos - egresosUSDHistoricos).toFixed(2));

    const movsPeriodoARS = movimientosFiltradosPorPeriodo.filter(
      (m) => (m.moneda || 'ARS') === 'ARS'
    );
    const ingresosPeriodo = movsPeriodoARS
      .filter((m) => m.tipo === 'ingreso')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const egresosPeriodo = movsPeriodoARS
      .filter((m) => m.tipo === 'egreso')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

    const movsPeriodoUSD = movimientosFiltradosPorPeriodo.filter((m) => m.moneda === 'USD');
    const ingresosPeriodoUSD = movsPeriodoUSD
      .filter((m) => m.tipo === 'ingreso')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);
    const egresosPeriodoUSD = movsPeriodoUSD
      .filter((m) => m.tipo === 'egreso')
      .reduce((acc, m) => acc + (Number(m.monto) || 0), 0);

    const deudasPendientes = deudas.filter((d) => d.estado !== 'pagado');
    const totalPorCobrar = deudasPendientes.reduce(
      (acc, d) => acc + Math.max(0, (Number(d.montoTotal) || 0) - (Number(d.montoPagado) || 0)),
      0
    );

    const personasDeudorasSet = new Set(
      deudasPendientes.map((d) => d.persona.trim().toLowerCase())
    );

    const misDeudasPendientes = misDeudas.filter((d) => {
      if (d.esSuscripcion) {
        return d.ultimoMesPagado !== mesActualPrefijo;
      }
      return d.estado !== 'pagado';
    });

    const totalQueDeboInformal = misDeudasPendientes
      .filter((d) => (d.subtipo || 'informal') === 'informal')
      .reduce((acc, d) => acc + obtenerMontosDeudaEnARS(d).restanteARS, 0);

    const totalQueDeboTarjetas = misDeudasPendientes
      .filter((d) => d.subtipo === 'tarjeta')
      .reduce((acc, d) => acc + obtenerMontosDeudaEnARS(d).restanteARS, 0);

    const totalCuotaMensualTarjetas = misDeudasPendientes
      .filter((d) => d.subtipo === 'tarjeta')
      .reduce((acc, d) => {
        const info = obtenerMontosDeudaEnARS(d);
        return acc + Math.min(info.restanteARS, info.montoCuotaARS);
      }, 0);

    const cantidadSuscripcionesFijas = misDeudas.filter(
      (d) => d.subtipo === 'tarjeta' && d.esSuscripcion
    ).length;

    const totalQueDebo = totalQueDeboInformal + totalQueDeboTarjetas;

    const acreedoresSet = new Set(
      misDeudasPendientes.map((d) => d.acreedor.trim().toLowerCase())
    );

    const porCategoria = {};
    movsPeriodoARS
      .filter((m) => m.tipo === 'egreso')
      .forEach((m) => {
        porCategoria[m.categoria] = (porCategoria[m.categoria] || 0) + (Number(m.monto) || 0);
      });

    const rankingCategorias = Object.entries(porCategoria)
      .map(([categoria, monto]) => ({
        categoria,
        monto,
        porcentaje: egresosPeriodo > 0 ? Math.round((monto / egresosPeriodo) * 100) : 0
      }))
      .sort((a, b) => b.monto - a.monto);

    return {
      balanceDisponible,
      balanceDisponibleUSD,
      ingresosPeriodo,
      egresosPeriodo,
      ingresosPeriodoUSD,
      egresosPeriodoUSD,
      balancePeriodo: ingresosPeriodo - egresosPeriodo,
      totalPorCobrar,
      cantidadDeudores: personasDeudorasSet.size,
      totalQueDebo,
      totalQueDeboInformal,
      totalQueDeboTarjetas,
      totalCuotaMensualTarjetas,
      cantidadSuscripcionesFijas,
      cantidadAcreedores: acreedoresSet.size,
      patrimonioNeto: balanceDisponible + totalPorCobrar - totalQueDebo,
      rankingCategorias
    };
  }, [movimientos, movimientosFiltradosPorPeriodo, deudas, misDeudas, cotizacionDolar, mesActualPrefijo]);

  const resumenPorPersona = useMemo(() => {
    const mapa = {};
    deudas.forEach((d) => {
      const key = d.persona.trim().toLowerCase();
      const nombreMostrar = d.persona.trim();
      const restante = Math.max(0, (Number(d.montoTotal) || 0) - (Number(d.montoPagado) || 0));

      if (!mapa[key]) {
        mapa[key] = {
          key,
          nombreMostrar,
          totalRestante: 0,
          totalHistorico: 0,
          itemsPendientes: 0,
          items: []
        };
      }
      mapa[key].totalRestante += d.estado === 'pagado' ? 0 : restante;
      mapa[key].totalHistorico += Number(d.montoTotal) || 0;
      if (d.estado !== 'pagado') mapa[key].itemsPendientes += 1;
      mapa[key].items.push(d);
    });

    return Object.values(mapa).sort((a, b) => b.totalRestante - a.totalRestante);
  }, [deudas]);

  const movimientosListaVisible = useMemo(() => {
    return movimientosFiltradosPorPeriodo.filter((m) => {
      const monedaItem = m.moneda || 'ARS';
      if (filtroMonedaMov !== 'TODAS' && monedaItem !== filtroMonedaMov) return false;
      if (filtroTipoMov !== 'TODOS' && m.tipo !== filtroTipoMov) return false;
      if (busquedaMov.trim()) {
        const q = busquedaMov.toLowerCase();
        const matchDesc = (m.descripcion || '').toLowerCase().includes(q);
        const matchCat = (m.categoria || '').toLowerCase().includes(q);
        const matchMet = (m.metodo || '').toLowerCase().includes(q);
        return matchDesc || matchCat || matchMet;
      }
      return true;
    });
  }, [movimientosFiltradosPorPeriodo, filtroMonedaMov, filtroTipoMov, busquedaMov]);

  const deudasListaVisible = useMemo(() => {
    return deudas.filter((d) => {
      if (filtroEstadoDeuda === 'PENDIENTES' && d.estado === 'pagado') return false;
      if (filtroEstadoDeuda === 'PAGADAS' && d.estado !== 'pagado') return false;
      if (
        personaSeleccionada !== 'TODAS' &&
        d.persona.trim().toLowerCase() !== personaSeleccionada
      ) {
        return false;
      }
      if (busquedaDeudor.trim()) {
        const q = busquedaDeudor.toLowerCase();
        return (
          d.persona.toLowerCase().includes(q) ||
          d.concepto.toLowerCase().includes(q) ||
          (d.notas || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [deudas, filtroEstadoDeuda, personaSeleccionada, busquedaDeudor]);

  const resumenPorAcreedor = useMemo(() => {
    const mapa = {};
    const mesActualKey = getCurrentMonthKey();

    misDeudas
      .filter((d) => (d.subtipo || 'informal') === subTabMiDeuda)
      .forEach((d) => {
        const key = d.acreedor.trim().toLowerCase();
        const nombreMostrar = d.acreedor.trim();
        const info = obtenerMontosDeudaEnARS(d);

        const mesGuardado =
          d.vencimientoMes || (d.vencimiento ? d.vencimiento.slice(0, 7) : '');
        const vencimientoValidoEsteMes =
          d.subtipo === 'tarjeta'
            ? mesGuardado === mesActualKey
              ? d.vencimiento
              : ''
            : d.vencimiento || '';

        if (!mapa[key]) {
          mapa[key] = {
            key,
            nombreMostrar,
            subtipo: d.subtipo || 'informal',
            totalRestante: 0,
            totalCuotaMensual: 0,
            totalHistorico: 0,
            itemsPendientes: 0,
            suscripcionesCount: 0,
            vencimientoMes: '',
            items: []
          };
        }
        if (vencimientoValidoEsteMes && !mapa[key].vencimientoMes) {
          mapa[key].vencimientoMes = vencimientoValidoEsteMes;
        }

        const estaSaldado = d.esSuscripcion ? info.pagadaEsteMes : d.estado === 'pagado';
        mapa[key].totalRestante += estaSaldado ? 0 : info.restanteARS;
        mapa[key].totalCuotaMensual += estaSaldado
          ? 0
          : Math.min(info.restanteARS, info.montoCuotaARS);
        mapa[key].totalHistorico += info.montoTotalARS;
        if (!estaSaldado) mapa[key].itemsPendientes += 1;
        if (d.esSuscripcion) mapa[key].suscripcionesCount += 1;
        mapa[key].items.push(d);
      });

    return Object.values(mapa).sort((a, b) => b.totalRestante - a.totalRestante);
  }, [misDeudas, subTabMiDeuda, cotizacionDolar]);

  // ==========================================================================
  // EXPORTAR / IMPORTAR RESPALDO (JSON Y EXCEL CSV)
  // ==========================================================================
  const exportarBackupJSON = () => {
    const data = {
      version: '3.2',
      exportadoEn: new Date().toISOString(),
      ownerUser: currentUser?.username || 'usuario',
      movimientos,
      deudas,
      misDeudas
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mis_finanzas_${currentUser?.username || 'backup'}_${getTodayString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Copia de seguridad descargada (.JSON)');
  };

  const exportarExcelCSV = () => {
    const encabezados = ['Seccion', 'Fecha', 'Tipo', 'Persona_O_Categoria', 'Detalle', 'Moneda', 'Monto_Total', 'Monto_Pagado', 'Pendiente'];
    const filas = [];

    movimientos.forEach((m) => {
      filas.push([
        'MOVIMIENTO',
        m.fecha,
        m.tipo.toUpperCase(),
        `"${(m.categoria || '').replace(/"/g, '""')}"`,
        `"${(m.descripcion || '').replace(/"/g, '""')}"`,
        m.moneda || 'ARS',
        m.monto,
        m.monto,
        0
      ]);
    });

    deudas.forEach((d) => {
      const pendiente = Math.max(0, (Number(d.montoTotal) || 0) - (Number(d.montoPagado) || 0));
      filas.push([
        'ME_DEBEN',
        d.fecha,
        d.estado.toUpperCase(),
        `"${(d.persona || '').replace(/"/g, '""')}"`,
        `"${(d.concepto || '').replace(/"/g, '""')}"`,
        'ARS',
        d.montoTotal,
        d.montoPagado || 0,
        pendiente
      ]);
    });

    misDeudas.forEach((d) => {
      const info = obtenerMontosDeudaEnARS(d);
      filas.push([
        d.esSuscripcion
          ? 'SUSCRIPCION_FIJA_TARJETA'
          : d.subtipo === 'tarjeta'
          ? 'TARJETA_CREDITO'
          : 'PLATA_QUE_DEBO',
        d.fecha,
        d.esSuscripcion
          ? info.pagadaEsteMes
            ? 'PAGADA_ESTE_MES'
            : 'PENDIENTE_MES'
          : d.estado.toUpperCase(),
        `"${(d.acreedor || '').replace(/"/g, '""')}"`,
        `"${(d.concepto || '').replace(/"/g, '""')}${
          d.esSuscripcion
            ? ' (Suscripción Mensual)'
            : d.subtipo === 'tarjeta'
            ? ` (${d.cuotasPagadas || 0}/${d.cuotasTotales || 1} cuotas)`
            : ''
        }"`,
        d.moneda || 'ARS',
        info.montoTotalARS,
        info.montoPagadoARS,
        info.restanteARS
      ]);
    });

    const contenidoCSV =
      '\uFEFF' + [encabezados.join(';'), ...filas.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planilla_finanzas_${getTodayString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Planilla compatible con Excel descargada (.CSV)');
  };

  const importarBackupJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(String(event.target?.result || '{}'));
        if (!Array.isArray(parsed.movimientos) && !Array.isArray(parsed.deudas) && !Array.isArray(parsed.misDeudas)) {
          showToast('El archivo no tiene el formato correcto', 'error');
          return;
        }
        const activeUsername = normalizeUsername(currentUser?.username);
        const movsConOwner = (parsed.movimientos || []).map((m) => ({
          ...m,
          ownerUser: activeUsername
        }));
        const deudasConOwner = (parsed.deudas || []).map((d) => ({
          ...d,
          ownerUser: activeUsername
        }));
        const misDeudasConOwner = (parsed.misDeudas || []).map((md) => ({
          ...md,
          ownerUser: activeUsername
        }));

        setMovimientos(movsConOwner);
        setDeudas(deudasConOwner);
        setMisDeudas(misDeudasConOwner);
        await respaldarEnBovedaCuenta(movsConOwner, deudasConOwner, misDeudasConOwner, false);
        showToast('Datos importados y guardados en tu base de datos');
      } catch (err) {
        showToast('No se pudo leer el archivo JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  const getCategoriaInfo = (nombreCat, tipo) => {
    const lista = tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_EGRESO;
    return (
      lista.find((c) => c.id === nombreCat) || {
        id: nombreCat,
        nombre: nombreCat,
        icono: tipo === 'ingreso' ? '💰' : '💸',
        color: 'bg-slate-500/20 text-slate-300 border-slate-500/30'
      }
    );
  };

  // ==========================================================================
  // PANTALLA DE LOGIN / REGISTRO SI NO HAY SESIÓN ACTIVA
  // ==========================================================================
  if (!currentUser) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-200 ${
          darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
        }`}
      >
        {toast && (
          <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md bg-emerald-950/90 border-emerald-500/40 text-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-sm font-semibold">{toast.mensaje}</span>
          </div>
        )}

        <div
          className={`w-full max-w-md rounded-3xl border p-6 sm:p-8 shadow-2xl relative overflow-hidden ${
            darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Wallet className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h1 className="font-extrabold text-xl tracking-tight leading-none">Finanzas Al Día</h1>
                <span className="text-xs text-slate-400 font-medium">
                  Base de datos en la nube
                </span>
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2.5 rounded-xl border transition ${
                darkMode
                  ? 'border-slate-800 bg-slate-800/60 text-amber-400'
                  : 'border-slate-200 bg-slate-100 text-slate-600'
              }`}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div
            className={`grid grid-cols-2 p-1 rounded-2xl border mb-6 ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                authMode === 'login'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setAuthError('');
              }}
              className={`py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                authMode === 'register'
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Nombre de Usuario
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="Ej: tomas"
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium outline-none transition ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  placeholder="••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className={`w-full pl-10 pr-11 py-3 rounded-2xl border text-sm font-medium outline-none transition ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authMode === 'register' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Repetir Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="••••••"
                    value={authConfirmPassword}
                    onChange={(e) => setAuthConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium outline-none transition ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-600'
                    }`}
                  />
                </div>
              </div>
            )}

            {authError && (
              <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              {authLoading
                ? 'Verificando...'
                : authMode === 'login'
                ? 'Entrar a Mis Finanzas'
                : 'Registrar y Entrar'}
            </button>
          </form>

          <div
            className={`mt-5 pt-4 border-t text-center space-y-2 ${
              darkMode ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {envFirebaseConfig
                ? 'Base de Datos Dedicada Conectada'
                : 'Sincronización Multi-Dispositivo Activa'}
            </div>
            <p className="text-[11px] text-slate-400">
              Tus datos se guardan automáticamente en la nube y se sincronizan entre tu PC y celular.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDERIZADO PRINCIPAL DE LA APLICACIÓN
  // ==========================================================================
  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-200 ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      } pb-24 md:pb-10`}
    >
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${
            toast.tipo === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
              : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
          }`}
        >
          {toast.tipo === 'error' ? (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          )}
          <span className="text-sm font-semibold">{toast.mensaje}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto md:flex md:gap-6 md:p-6">
        {/* SIDEBAR PARA PC */}
        <aside
          className={`hidden md:flex md:flex-col md:w-64 md:shrink-0 rounded-3xl p-5 border sticky top-6 h-[calc(100vh-3rem)] justify-between ${
            darkMode
              ? 'bg-slate-900/80 border-slate-800/80 backdrop-blur-xl'
              : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Wallet className="w-6 h-6 text-slate-950" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight leading-none">
                  Finanzas Al Día
                </h1>
                <span className="text-xs text-slate-400 font-medium">
                  Control personal & deudas
                </span>
              </div>
            </div>

            <nav className="space-y-1.5">
              {[
                { id: 'dashboard', label: 'Resumen General', icon: PieChart },
                { id: 'movimientos', label: 'Ingresos y Gastos', icon: Wallet },
                {
                  id: 'deudores',
                  label: 'Plata que me deben',
                  icon: Users,
                  badge: metricas.cantidadDeudores
                },
                {
                  id: 'misdeudas',
                  label: 'Plata que debo',
                  icon: HandCoins,
                  badge: metricas.cantidadAcreedores,
                  badgeColor: 'bg-purple-500 text-white'
                },
                { id: 'respaldo', label: 'Respaldo y Nube', icon: FileSpreadsheet }
              ].map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${
                      active
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                        : darkMode
                        ? 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge > 0 && (
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                          active
                            ? 'bg-slate-950 text-emerald-400'
                            : item.badgeColor || 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-800/60 space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 px-2">
                Carga Rápida
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => abrirNuevoMovimiento('egreso', 'ARS')}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-semibold text-xs transition"
                >
                  <TrendingDown className="w-3.5 h-3.5" /> Gasto $
                </button>
                <button
                  onClick={() => abrirNuevoMovimiento('egreso', 'USD')}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-teal-300 border border-teal-500/30 font-semibold text-xs transition"
                >
                  <TrendingDown className="w-3.5 h-3.5" /> Gasto US$
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => abrirNuevoMovimiento('ingreso', 'ARS')}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Ingreso $
                </button>
                <button
                  onClick={() => abrirNuevoMovimiento('ingreso', 'USD')}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-2xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/30 font-semibold text-xs transition"
                >
                  <TrendingUp className="w-3.5 h-3.5" /> Ingreso US$
                </button>
              </div>
              <button
                onClick={() => abrirNuevaDeuda('')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-semibold text-xs transition"
              >
                <UserPlus className="w-4 h-4" /> Anotar Plata que me Deben
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => abrirNuevaMiDeuda('', 'tarjeta', false)}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 font-semibold text-xs transition"
                >
                  <CreditCard className="w-3.5 h-3.5" /> + Cuota TC
                </button>
                <button
                  onClick={() => abrirNuevaMiDeuda('', 'tarjeta', true)}
                  className="flex items-center justify-center gap-1.5 px-2.5 py-2.5 rounded-2xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 font-semibold text-xs transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> + Suscripción
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2.5 pt-4 border-t border-slate-800/60">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    syncStatus === 'conectado'
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                  }`}
                />
                <span className="truncate font-semibold">
                  @{currentUser?.username} {lastSyncTime ? `• ${lastSyncTime}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={forzarSincronizacionCompleta}
                  disabled={syncingVault}
                  title="Sincronizar cuenta con la nube ahora"
                  className={`p-1.5 rounded-xl border transition ${
                    darkMode
                      ? 'border-slate-800 bg-slate-800/60 text-emerald-400 hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-100 text-emerald-600'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncingVault ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`p-2 rounded-xl border transition ${
                    darkMode
                      ? 'border-slate-800 bg-slate-800/60 text-amber-400 hover:bg-slate-800'
                      : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title="Cambiar tema claro/oscuro"
                >
                  {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              onClick={cerrarSesionUsuario}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition ${
                darkMode
                  ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-rose-400 hover:border-rose-500/30'
                  : 'border-slate-200 bg-slate-50 text-slate-600 hover:text-rose-600'
              }`}
            >
              <LogOut className="w-3.5 h-3.5" /> Cerrar sesión
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 min-w-0 space-y-5 p-4 md:p-0">
          <header
            className={`md:hidden flex items-center justify-between p-4 rounded-3xl border ${
              darkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-slate-950" />
              </div>
              <div>
                <h1 className="font-extrabold text-base leading-tight">Finanzas Al Día</h1>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      syncStatus === 'conectado' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  <span>
                    @{currentUser?.username} {lastSyncTime ? `• ${lastSyncTime}` : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={forzarSincronizacionCompleta}
                disabled={syncingVault}
                title="Sincronizar ahora"
                className={`p-2.5 rounded-2xl border ${
                  darkMode
                    ? 'border-slate-800 bg-slate-800/70 text-emerald-400'
                    : 'border-slate-200 bg-slate-100 text-emerald-600'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${syncingVault ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2.5 rounded-2xl border ${
                  darkMode
                    ? 'border-slate-800 bg-slate-800/70 text-amber-400'
                    : 'border-slate-200 bg-slate-100 text-slate-700'
                }`}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <button
                onClick={cerrarSesionUsuario}
                title="Cerrar sesión"
                className={`p-2.5 rounded-2xl border ${
                  darkMode
                    ? 'border-slate-800 bg-slate-800/70 text-rose-400'
                    : 'border-slate-200 bg-slate-100 text-rose-600'
                }`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* BARRA DE ESTADO DE BASE DE DATOS Y RESPALDO */}
          <div
            className={`rounded-2xl px-4 py-2.5 border flex flex-wrap items-center justify-between gap-2 ${
              darkMode
                ? 'bg-slate-900/90 border-emerald-500/30'
                : 'bg-emerald-50/90 border-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold text-slate-300">
                Cuenta <strong className="text-emerald-400">@{currentUser?.username}</strong> •{' '}
                {movimientos.length} movs, {misDeudas.length} consumos/tarjetas, {deudas.length} por cobrar
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={exportarBackupJSON}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" /> Guardar Copia (.JSON)
              </button>
              <button
                type="button"
                onClick={recuperarDatosHistoricosCuenta}
                disabled={syncingVault}
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingVault ? 'animate-spin' : ''}`} />
                {syncingVault ? 'Sincronizando...' : 'Sincronizar Nube'}
              </button>
            </div>
          </div>

          {/* TARJETAS PRINCIPALES DE SALDO */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div
              className={`rounded-3xl p-5 border relative overflow-hidden ${
                darkMode
                  ? 'bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-900 border-emerald-500/30'
                  : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="inline-flex rounded-xl p-0.5 bg-slate-950/60 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setMonedaCajaActiva('ARS')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                      monedaCajaActiva === 'ARS'
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ARS $
                  </button>
                  <button
                    type="button"
                    onClick={() => setMonedaCajaActiva('USD')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                      monedaCajaActiva === 'USD'
                        ? 'bg-teal-400 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    USD US$
                  </button>
                </div>
                <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </span>
              </div>

              <div className="space-y-1">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/90 block">
                    Disponible en Pesos
                  </span>
                  <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    {formatARS(metricas.balanceDisponible)}
                  </div>
                </div>
                <div className="pt-1.5 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                    Disponible en Dólares
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-teal-400">
                    {formatUSD(metricas.balanceDisponibleUSD)}
                  </span>
                </div>
              </div>
            </div>

            <div
              onClick={() => {
                setActiveTab('movimientos');
                setFiltroMonedaMov('USD');
              }}
              className={`cursor-pointer rounded-3xl p-5 border transition-transform active:scale-[0.99] ${
                darkMode
                  ? 'bg-gradient-to-br from-teal-950/60 via-slate-900 to-slate-900 border-teal-500/30 hover:border-teal-500/60'
                  : 'bg-gradient-to-br from-teal-50 to-white border-teal-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                  Caja en Dólares (USD)
                </span>
                <span className="p-2 rounded-xl bg-teal-500/15 text-teal-400">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-teal-400">
                {formatUSD(metricas.balanceDisponibleUSD)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">
                  +{formatUSD(metricas.ingresosPeriodoUSD)}
                </span>
                <span className="text-rose-400 font-semibold">
                  -{formatUSD(metricas.egresosPeriodoUSD)}
                </span>
              </div>
            </div>

            <div
              onClick={() => setActiveTab('deudores')}
              className={`cursor-pointer rounded-3xl p-5 border transition-transform active:scale-[0.99] ${
                darkMode
                  ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border-amber-500/30 hover:border-amber-500/60'
                  : 'bg-gradient-to-br from-amber-50 to-white border-amber-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Plata que me deben
                </span>
                <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-amber-400">
                {formatARS(metricas.totalPorCobrar)}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>
                  {metricas.cantidadDeudores}{' '}
                  {metricas.cantidadDeudores === 1 ? 'persona pendiente' : 'personas pendientes'}
                </span>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </div>
            </div>

            <div
              onClick={() => setActiveTab('misdeudas')}
              className={`cursor-pointer rounded-3xl p-5 border transition-transform active:scale-[0.99] ${
                darkMode
                  ? 'bg-gradient-to-br from-purple-950/60 via-slate-900 to-slate-900 border-purple-500/30 hover:border-purple-500/60'
                  : 'bg-gradient-to-br from-purple-50 to-white border-purple-200 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Plata que debo
                </span>
                <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                  <HandCoins className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-purple-400">
                {formatARS(metricas.totalQueDebo)}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate">
                  Inf: {formatARS(metricas.totalQueDeboInformal)} • TC:{' '}
                  {formatARS(metricas.totalQueDeboTarjetas)}
                </span>
                <ChevronRight className="w-4 h-4 text-purple-400 shrink-0" />
              </div>
            </div>
          </section>

          {/* ACCIONES RÁPIDAS EN MÓVIL */}
          <section className="grid grid-cols-2 sm:grid-cols-5 gap-2 md:hidden">
            <button
              onClick={() => abrirNuevoMovimiento('egreso', 'ARS')}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-500/25 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" /> Gasto $
            </button>
            <button
              onClick={() => abrirNuevoMovimiento('ingreso', 'ARS')}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" /> Ingreso $
            </button>
            <button
              onClick={() => abrirNuevoMovimiento('ingreso', 'USD')}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-teal-500 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/25 active:scale-95 transition"
            >
              <DollarSign className="w-4 h-4" /> Mov. US$
            </button>
            <button
              onClick={() => abrirNuevaDeuda('')}
              className="flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/25 active:scale-95 transition"
            >
              <UserPlus className="w-4 h-4" /> Me deben
            </button>
            <button
              onClick={() => abrirNuevaMiDeuda('', 'tarjeta', false)}
              className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-500/25 active:scale-95 transition"
            >
              <CreditCard className="w-4 h-4" /> Tarjeta / Suscripción
            </button>
          </section>

          {/* VISTA 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5">
              <div
                className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-3xl border ${
                  darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-bold">Período analizado:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFiltroMes('ACTUAL')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      filtroMes === 'ACTUAL'
                        ? 'bg-emerald-500 text-slate-950'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Mes Actual ({mesActualPrefijo})
                  </button>
                  <button
                    onClick={() => setFiltroMes('TODOS')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                      filtroMes === 'TODOS'
                        ? 'bg-emerald-500 text-slate-950'
                        : darkMode
                        ? 'bg-slate-800 text-slate-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Todo el Historial
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div
                  className={`lg:col-span-7 rounded-3xl p-5 border flex flex-col justify-between ${
                    darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="font-extrabold text-base sm:text-lg">
                          Últimos Movimientos
                        </h2>
                        <p className="text-xs text-slate-400">
                          Tus ingresos y egresos más recientes en Pesos y Dólares
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('movimientos')}
                        className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        Ver todos <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    {movimientosFiltradosPorPeriodo.length === 0 ? (
                      <div className="py-12 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                          <Wallet className="w-6 h-6" />
                        </div>
                        <p className="text-sm text-slate-400">
                          No hay movimientos anotados en este período.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {movimientosFiltradosPorPeriodo.slice(0, 6).map((mov) => {
                          const cat = getCategoriaInfo(mov.categoria, mov.tipo);
                          const esUSD = mov.moneda === 'USD';
                          return (
                            <div
                              key={mov.id}
                              onClick={() => abrirEditarMovimiento(mov)}
                              className={`cursor-pointer flex items-center justify-between p-3.5 rounded-2xl border transition ${
                                darkMode
                                  ? 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                                  : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-10 h-10 rounded-2xl border flex items-center justify-center text-lg shrink-0 ${cat.color}`}
                                >
                                  {cat.icono}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-sm truncate">
                                      {mov.descripcion}
                                    </p>
                                    {esUSD && (
                                      <span className="px-1.5 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-extrabold shrink-0">
                                        USD
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span>{mov.categoria}</span>
                                    <span>•</span>
                                    <span>{mov.fecha}</span>
                                  </div>
                                </div>
                              </div>
                              <div
                                className={`font-extrabold text-sm sm:text-base shrink-0 ml-2 ${
                                  mov.tipo === 'ingreso'
                                    ? esUSD
                                      ? 'text-teal-400'
                                      : 'text-emerald-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {mov.tipo === 'ingreso' ? '+' : '-'}
                                {formatMoney(mov.monto, mov.moneda)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-5">
                  <div
                    className={`rounded-3xl p-5 border ${
                      darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-extrabold text-base flex items-center gap-2">
                          <Users className="w-4 h-4 text-amber-400" />
                          Plata que me deben
                        </h3>
                        <p className="text-xs text-slate-400">Resumen por persona</p>
                      </div>
                      <button
                        onClick={() => abrirNuevaDeuda('')}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 text-xs font-bold transition"
                      >
                        + Anotar
                      </button>
                    </div>

                    {resumenPorPersona.filter((p) => p.totalRestante > 0).length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        Nadie te debe plata en este momento. 🎉
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {resumenPorPersona
                          .filter((p) => p.totalRestante > 0)
                          .slice(0, 4)
                          .map((grupo) => (
                            <div
                              key={grupo.key}
                              onClick={() => {
                                setPersonaSeleccionada(grupo.key);
                                setActiveTab('deudores');
                              }}
                              className={`cursor-pointer flex items-center justify-between p-3 rounded-2xl border transition ${
                                darkMode
                                  ? 'bg-slate-950/60 border-slate-800 hover:border-amber-500/40'
                                  : 'bg-amber-50/50 border-amber-200/70 hover:bg-amber-50'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 font-extrabold text-sm flex items-center justify-center shrink-0">
                                  {grupo.nombreMostrar.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-sm truncate">
                                    {grupo.nombreMostrar}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {grupo.itemsPendientes}{' '}
                                    {grupo.itemsPendientes === 1
                                      ? 'gasto pendiente'
                                      : 'gastos pendientes'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-sm text-amber-400">
                                  {formatARS(grupo.totalRestante)}
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div
                    className={`rounded-3xl p-5 border ${
                      darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <h3 className="font-extrabold text-base mb-1">¿En qué se fue la plata?</h3>
                    <p className="text-xs text-slate-400 mb-4">
                      Distribución de gastos del período seleccionado
                    </p>

                    {metricas.rankingCategorias.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">
                        Sin gastos registrados en este período.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {metricas.rankingCategorias.slice(0, 5).map((item) => {
                          const cat = getCategoriaInfo(item.categoria, 'egreso');
                          return (
                            <div key={item.categoria} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold flex items-center gap-1.5">
                                  <span>{cat.icono}</span> {item.categoria}
                                </span>
                                <span className="font-bold">
                                  {formatARS(item.monto)}{' '}
                                  <span className="text-slate-400">({item.porcentaje}%)</span>
                                </span>
                              </div>
                              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-rose-500 to-amber-400"
                                  style={{ width: `${Math.max(4, item.porcentaje)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: INGRESOS Y GASTOS */}
          {activeTab === 'movimientos' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div
                  onClick={() =>
                    setFiltroMonedaMov(filtroMonedaMov === 'ARS' ? 'TODAS' : 'ARS')
                  }
                  className={`cursor-pointer rounded-3xl p-4 sm:p-5 border transition-all ${
                    filtroMonedaMov === 'ARS'
                      ? 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/25'
                      : darkMode
                      ? 'bg-slate-900/70 border-slate-800 hover:border-emerald-500/40'
                      : 'bg-white border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                        Apartado en Pesos (ARS $)
                      </span>
                      <h3 className="text-2xl font-extrabold mt-0.5">
                        {formatARS(metricas.balanceDisponible)}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Ingresos mes: +{formatARS(metricas.ingresosPeriodo)} • Gastos mes: -
                        {formatARS(metricas.egresosPeriodo)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirNuevoMovimiento('ingreso', 'ARS');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ingreso $
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirNuevoMovimiento('egreso', 'ARS');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Gasto $
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  onClick={() =>
                    setFiltroMonedaMov(filtroMonedaMov === 'USD' ? 'TODAS' : 'USD')
                  }
                  className={`cursor-pointer rounded-3xl p-4 sm:p-5 border transition-all ${
                    filtroMonedaMov === 'USD'
                      ? 'bg-teal-500/15 border-teal-400 ring-2 ring-teal-400/25'
                      : darkMode
                      ? 'bg-slate-900/70 border-slate-800 hover:border-teal-500/40'
                      : 'bg-white border-slate-200 hover:border-teal-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-teal-400">
                        Apartado en Dólares (USD US$)
                      </span>
                      <h3 className="text-2xl font-extrabold text-teal-400 mt-0.5">
                        {formatUSD(metricas.balanceDisponibleUSD)}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Ingresos mes: +{formatUSD(metricas.ingresosPeriodoUSD)} • Gastos mes: -
                        {formatUSD(metricas.egresosPeriodoUSD)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirNuevoMovimiento('ingreso', 'USD');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-teal-400 text-slate-950 font-extrabold text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Ingreso US$
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          abrirNuevoMovimiento('egreso', 'USD');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-500/90 text-white font-extrabold text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Gasto US$
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-3xl p-5 border space-y-4 ${
                  darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={busquedaMov}
                      onChange={(e) => setBusquedaMov(e.target.value)}
                      placeholder="Buscar por detalle, categoría o método de pago..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-emerald-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-emerald-500'
                      }`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { id: 'TODAS', label: 'ARS + USD' },
                      { id: 'ARS', label: 'Solo Pesos ($)' },
                      { id: 'USD', label: 'Solo Dólares (US$)' }
                    ].map((mon) => (
                      <button
                        key={mon.id}
                        onClick={() => setFiltroMonedaMov(mon.id)}
                        className={`px-3 py-2 rounded-2xl text-xs font-bold transition ${
                          filtroMonedaMov === mon.id
                            ? mon.id === 'USD'
                              ? 'bg-teal-400 text-slate-950'
                              : 'bg-emerald-500 text-slate-950'
                            : darkMode
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {mon.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'TODOS', label: 'Todos' },
                      { id: 'ingreso', label: 'Ingresos' },
                      { id: 'egreso', label: 'Gastos' }
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setFiltroTipoMov(t.id)}
                        className={`px-3 py-2 rounded-2xl text-xs font-bold transition ${
                          filtroTipoMov === t.id
                            ? 'bg-indigo-500 text-white'
                            : darkMode
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {movimientosListaVisible.length === 0 ? (
                  <div className="py-12 text-center text-sm text-slate-400">
                    No se encontraron movimientos con esos filtros.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {movimientosListaVisible.map((mov) => {
                      const cat = getCategoriaInfo(mov.categoria, mov.tipo);
                      const esUSD = mov.moneda === 'USD';
                      return (
                        <div
                          key={mov.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border transition ${
                            darkMode
                              ? 'bg-slate-950/60 border-slate-800/90 hover:border-slate-700'
                              : 'bg-slate-50 border-slate-200/80'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-2xl border flex items-center justify-center text-xl shrink-0 ${cat.color}`}
                            >
                              {cat.icono}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-sm sm:text-base truncate">
                                  {mov.descripcion}
                                </p>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                    esUSD
                                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                                      : 'bg-slate-800 text-slate-300'
                                  }`}
                                >
                                  {esUSD ? 'USD US$' : 'ARS $'}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                                <span className="font-medium text-slate-300">{mov.categoria}</span>
                                <span>•</span>
                                <span>{mov.fecha}</span>
                                {mov.metodo && (
                                  <>
                                    <span>•</span>
                                    <span>{mov.metodo}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                            <span
                              className={`font-extrabold text-base sm:text-lg ${
                                mov.tipo === 'ingreso'
                                  ? esUSD
                                    ? 'text-teal-400'
                                    : 'text-emerald-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {mov.tipo === 'ingreso' ? '+' : '-'}
                              {formatMoney(mov.monto, mov.moneda)}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => abrirEditarMovimiento(mov)}
                                className={`p-2 rounded-xl border transition ${
                                  darkMode
                                    ? 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300'
                                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                                }`}
                                title="Editar"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmDelete({
                                    tipo: 'movimiento',
                                    id: mov.id,
                                    titulo: `${mov.descripcion} (${
                                      esUSD ? formatUSD(mov.monto) : formatARS(mov.monto)
                                    })`
                                  })
                                }
                                className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA 3: PLATA QUE ME DEBEN */}
          {activeTab === 'deudores' && (
            <div className="space-y-5">
              <div
                className={`rounded-3xl p-5 sm:p-6 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  darkMode
                    ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30'
                    : 'bg-gradient-to-r from-amber-100 to-orange-50 border-amber-300'
                }`}
              >
                <div className="space-y-1">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                    Control de Plata que te Deben
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-extrabold">
                    Total pendiente: {formatARS(metricas.totalPorCobrar)}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400">
                    Anotá a quién le prestaste o qué gasto compartieron para no perder nunca la cuenta.
                  </p>
                </div>
                <button
                  onClick={() => abrirNuevaDeuda('')}
                  className="px-5 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 shrink-0"
                >
                  <UserPlus className="w-5 h-5" /> + Anotar Nueva Deuda
                </button>
              </div>

              <div
                className={`rounded-3xl p-5 border space-y-5 ${
                  darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={busquedaDeudor}
                      onChange={(e) => setBusquedaDeudor(e.target.value)}
                      placeholder="Buscar por nombre de la persona o detalle del gasto..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-2xl border text-sm outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-slate-100 focus:border-amber-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-amber-500'
                      }`}
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'PENDIENTES', label: 'Pendientes' },
                      { id: 'PAGADAS', label: 'Saldadas' },
                      { id: 'TODAS', label: 'Todas' }
                    ].map((est) => (
                      <button
                        key={est.id}
                        onClick={() => setFiltroEstadoDeuda(est.id)}
                        className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold transition ${
                          filtroEstadoDeuda === est.id
                            ? 'bg-amber-500 text-slate-950'
                            : darkMode
                            ? 'bg-slate-800 text-slate-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {est.label}
                      </button>
                    ))}
                  </div>
                </div>

                {deudasListaVisible.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <Users className="w-10 h-10 text-amber-400 mx-auto opacity-70" />
                    <p className="text-sm font-bold">No hay registros en esta vista</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {deudasListaVisible.map((item) => {
                      const restante = Math.max(
                        0,
                        (Number(item.montoTotal) || 0) - (Number(item.montoPagado) || 0)
                      );
                      const pagado = item.estado === 'pagado';
                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            darkMode
                              ? 'bg-slate-950/70 border-slate-800'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-amber-400">{item.persona}</span>
                              <span>•</span>
                              <span className="font-bold text-sm">{item.concepto}</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Fecha: {item.fecha} {item.notas ? `• ${item.notas}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-right">
                              <span className="font-extrabold text-amber-400 block">
                                {pagado ? 'Saldado' : `Debe ${formatARS(restante)}`}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Total: {formatARS(item.montoTotal)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {!pagado && (
                                <button
                                  onClick={() => abrirModalCobrar(item)}
                                  className="px-3 py-2 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" /> Cobrar
                                </button>
                              )}
                              <button
                                onClick={() => abrirEditarDeuda(item)}
                                className="p-2 rounded-xl border border-slate-700 text-slate-300"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() =>
                                  setConfirmDelete({
                                    tipo: 'deuda',
                                    id: item.id,
                                    titulo: `Deuda de ${item.persona}: ${item.concepto}`
                                  })
                                }
                                className="p-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA 4: PLATA QUE DEBO */}
          {activeTab === 'misdeudas' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  onClick={() => {
                    setSubTabMiDeuda('tarjeta');
                    setAcreedorSeleccionado('TODOS');
                  }}
                  className={`text-left p-5 rounded-3xl border transition-all flex items-center justify-between ${
                    subTabMiDeuda === 'tarjeta'
                      ? 'bg-gradient-to-r from-indigo-600/30 via-blue-600/15 to-transparent border-indigo-500 shadow-lg shadow-indigo-500/10'
                      : darkMode
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-75'
                      : 'bg-white border-slate-200 hover:bg-slate-50 opacity-80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                        <CreditCard className="w-5 h-5" />
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">
                        Tarjetas de Crédito & Suscripciones
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold pt-1">
                      {formatARS(metricas.totalQueDeboTarjetas)}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Cuota de este mes:{' '}
                      <strong className="text-indigo-400">
                        {formatARS(metricas.totalCuotaMensualTarjetas)}
                      </strong>
                      {metricas.cantidadSuscripcionesFijas > 0 && (
                        <>
                          {' '}
                          • {metricas.cantidadSuscripcionesFijas} suscripción(es) fija(s)
                        </>
                      )}
                    </p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      subTabMiDeuda === 'tarjeta'
                        ? 'border-indigo-400 bg-indigo-400'
                        : 'border-slate-600'
                    }`}
                  />
                </button>

                <button
                  onClick={() => {
                    setSubTabMiDeuda('informal');
                    setAcreedorSeleccionado('TODOS');
                  }}
                  className={`text-left p-5 rounded-3xl border transition-all flex items-center justify-between ${
                    subTabMiDeuda === 'informal'
                      ? 'bg-gradient-to-r from-purple-600/25 via-fuchsia-600/15 to-transparent border-purple-500 shadow-lg shadow-purple-500/10'
                      : darkMode
                      ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-75'
                      : 'bg-white border-slate-200 hover:bg-slate-50 opacity-80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                        <HandCoins className="w-5 h-5" />
                      </span>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                        Deudas Informales
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-extrabold pt-1">
                      {formatARS(metricas.totalQueDeboInformal)}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Amigos, familiares o préstamos personales
                    </p>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      subTabMiDeuda === 'informal'
                        ? 'border-purple-400 bg-purple-400'
                        : 'border-slate-600'
                    }`}
                  />
                </button>
              </div>

              {subTabMiDeuda === 'tarjeta' && (
                <div
                  className={`rounded-3xl p-4 sm:p-5 border transition-all ${
                    darkMode
                      ? 'bg-gradient-to-r from-emerald-950/50 via-slate-900 to-indigo-950/40 border-emerald-500/30'
                      : 'bg-gradient-to-r from-emerald-50 via-white to-indigo-50 border-emerald-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 font-extrabold">
                        US$
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                            Cotización del Dólar en Vivo
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold">
                            {cotizacionDolar.cargando
                              ? 'Actualizando...'
                              : `Actualizado ${cotizacionDolar.actualizado || 'hoy'}`}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Los consumos y suscripciones en USD (como iCloud o Spotify) se calculan automáticamente al dólar elegido.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2 ${
                          darkMode
                            ? 'bg-slate-950/80 border-slate-800'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <span className="text-xs text-slate-400 font-semibold">
                          Dólar Oficial:
                        </span>
                        <span className="text-sm font-extrabold text-emerald-400">
                          {formatARS(cotizacionDolar.oficial)}
                        </span>
                      </div>

                      <div
                        className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2 ${
                          darkMode
                            ? 'bg-slate-950/80 border-slate-800'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <span className="text-xs text-slate-400 font-semibold">
                          Dólar Tarjeta:
                        </span>
                        <span className="text-sm font-extrabold text-amber-400">
                          {formatARS(cotizacionDolar.tarjeta)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => obtenerCotizacionDolar(false)}
                        className={`p-2.5 rounded-2xl border transition ${
                          darkMode
                            ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                        title="Actualizar cotización ahora"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${cotizacionDolar.cargando ? 'animate-spin text-emerald-400' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`rounded-3xl p-5 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  subTabMiDeuda === 'tarjeta'
                    ? darkMode
                      ? 'bg-slate-900/90 border-indigo-500/30'
                      : 'bg-indigo-50/60 border-indigo-200'
                    : darkMode
                    ? 'bg-slate-900/90 border-purple-500/30'
                    : 'bg-purple-50/60 border-purple-200'
                }`}
              >
                <div>
                  <h4 className="font-extrabold text-base sm:text-lg">
                    {subTabMiDeuda === 'tarjeta'
                      ? 'Control de Tarjetas de Crédito y Suscripciones Fijas'
                      : 'Control de Plata que Debo Informalmente'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {subTabMiDeuda === 'tarjeta'
                      ? 'Detallá compras en cuotas o suscripciones mensuales fijas (como iCloud, Spotify, Netflix) para que queden permanentes todos los meses.'
                      : 'Anotá lo que le debés a un amigo, familiar o conocido para tener consciencia y saldarlo apenas puedas.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {subTabMiDeuda === 'tarjeta' && (
                    <button
                      onClick={() => abrirNuevaMiDeuda('', 'tarjeta', true)}
                      className="px-4 py-3.5 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition"
                    >
                      <RefreshCw className="w-4 h-4" /> + Suscripción Fija (iCloud, etc.)
                    </button>
                  )}
                  <button
                    onClick={() => abrirNuevaMiDeuda('', subTabMiDeuda, false)}
                    className={`px-5 py-3.5 rounded-2xl text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shrink-0 transition ${
                      subTabMiDeuda === 'tarjeta'
                        ? 'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20'
                        : 'bg-purple-500 hover:bg-purple-400 shadow-purple-500/20'
                    }`}
                  >
                    {subTabMiDeuda === 'tarjeta' ? (
                      <>
                        <CreditCard className="w-5 h-5" /> + Consumo / Cuotas
                      </>
                    ) : (
                      <>
                        <HandCoins className="w-5 h-5" /> + Anotar Deuda Informal
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div
                className={`rounded-3xl p-5 border space-y-5 ${
                  darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                {resumenPorAcreedor.length === 0 ? (
                  <div className="py-12 text-center space-y-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto ${
                        subTabMiDeuda === 'tarjeta'
                          ? 'bg-indigo-500/15 text-indigo-400'
                          : 'bg-purple-500/15 text-purple-400'
                      }`}
                    >
                      {subTabMiDeuda === 'tarjeta' ? (
                        <CreditCard className="w-6 h-6" />
                      ) : (
                        <HandCoins className="w-6 h-6" />
                      )}
                    </div>
                    <p className="text-sm font-bold">
                      {subTabMiDeuda === 'tarjeta'
                        ? 'No hay consumos ni suscripciones cargadas en tarjetas'
                        : 'No hay deudas informales registradas'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {resumenPorAcreedor
                      .filter(
                        (g) =>
                          acreedorSeleccionado === 'TODOS' || g.key === acreedorSeleccionado
                      )
                      .map((grupo) => {
                        const esTarjeta = grupo.subtipo === 'tarjeta';
                        return (
                          <div
                            key={grupo.key}
                            className={`rounded-3xl p-5 border flex flex-col justify-between gap-4 ${
                              darkMode
                                ? 'bg-slate-950/70 border-slate-800'
                                : 'bg-slate-50/70 border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between border-b pb-3.5 border-slate-800/60">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-11 h-11 rounded-2xl font-extrabold text-lg flex items-center justify-center border ${
                                    esTarjeta
                                      ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                                      : 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                                  }`}
                                >
                                  {esTarjeta ? (
                                    <CreditCard className="w-5 h-5" />
                                  ) : (
                                    grupo.nombreMostrar.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-extrabold text-base">
                                    {grupo.nombreMostrar}
                                  </h4>
                                  <p className="text-xs text-slate-400">
                                    {grupo.itemsPendientes}{' '}
                                    {esTarjeta
                                      ? 'consumo(s) pendiente(s) este mes'
                                      : 'compromiso(s) pendiente(s)'}
                                    {esTarjeta && grupo.suscripcionesCount > 0 && (
                                      <span className="text-cyan-400 font-semibold">
                                        {' '}
                                        • {grupo.suscripcionesCount} suscripción fija
                                      </span>
                                    )}
                                  </p>

                                  {esTarjeta && (
                                    <div className="mt-1.5">
                                      {tarjetaEditandoVencimiento?.nombreMostrar ===
                                      grupo.nombreMostrar ? (
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                          <input
                                            type="date"
                                            value={tarjetaEditandoVencimiento.fecha}
                                            onChange={(e) =>
                                              setTarjetaEditandoVencimiento((prev) => ({
                                                ...prev,
                                                fecha: e.target.value
                                              }))
                                            }
                                            className={`px-2 py-1 rounded-lg border text-xs font-bold ${
                                              darkMode
                                                ? 'bg-slate-900 border-indigo-500 text-white'
                                                : 'bg-white border-indigo-400 text-slate-900'
                                            }`}
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              actualizarVencimientoTarjetaEnLote(
                                                grupo.nombreMostrar,
                                                tarjetaEditandoVencimiento.fecha
                                              )
                                            }
                                            className="px-2 py-1 rounded-lg bg-emerald-500 text-slate-950 text-[11px] font-extrabold"
                                          >
                                            Guardar mes
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setTarjetaEditandoVencimiento(null)}
                                            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold"
                                          >
                                            Cancelar
                                          </button>
                                        </div>
                                      ) : grupo.vencimientoMes ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setTarjetaEditandoVencimiento({
                                              nombreMostrar: grupo.nombreMostrar,
                                              fecha: grupo.vencimientoMes
                                            })
                                          }
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[11px] font-extrabold transition"
                                        >
                                          <Calendar className="w-3 h-3" /> Vence este mes:{' '}
                                          {grupo.vencimientoMes} (Editar)
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setTarjetaEditandoVencimiento({
                                              nombreMostrar: grupo.nombreMostrar,
                                              fecha: getTodayString()
                                            })
                                          }
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 text-[11px] font-bold transition"
                                        >
                                          <Calendar className="w-3 h-3" /> + Anotar vencimiento de este mes
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-[11px] uppercase font-bold text-slate-400 block">
                                  Total restante
                                </span>
                                <span
                                  className={`text-xl font-extrabold ${
                                    esTarjeta ? 'text-indigo-400' : 'text-purple-400'
                                  }`}
                                >
                                  {formatARS(grupo.totalRestante)}
                                </span>
                                {esTarjeta && grupo.totalCuotaMensual > 0 && (
                                  <span className="block text-[11px] text-emerald-400 font-bold">
                                    A pagar este mes: {formatARS(grupo.totalCuotaMensual)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              {grupo.items.map((item) => {
                                const info = obtenerMontosDeudaEnARS(item);
                                const pagado = item.esSuscripcion
                                  ? info.pagadaEsteMes
                                  : item.estado === 'pagado';
                                const cuotasTot = Number(item.cuotasTotales) || 1;
                                const cuotasPag = Number(item.cuotasPagadas) || 0;
                                const progresoPorcentaje =
                                  !item.esSuscripcion && esTarjeta && cuotasTot > 0
                                    ? Math.min(100, Math.round((cuotasPag / cuotasTot) * 100))
                                    : 0;

                                return (
                                  <div
                                    key={item.id}
                                    className={`p-3.5 rounded-2xl border transition ${
                                      pagado
                                        ? 'opacity-60 border-slate-800/40 bg-slate-900/20'
                                        : item.esSuscripcion
                                        ? darkMode
                                          ? 'bg-cyan-950/20 border-cyan-500/30'
                                          : 'bg-cyan-50/40 border-cyan-200'
                                        : darkMode
                                        ? 'bg-slate-900/90 border-slate-800'
                                        : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-bold text-sm">{item.concepto}</p>
                                          {item.esSuscripcion ? (
                                            <span className="px-2 py-0.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-extrabold flex items-center gap-1">
                                              <RefreshCw className="w-3 h-3" /> Suscripción Fija Mensual
                                            </span>
                                          ) : (
                                            esTarjeta && (
                                              <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-[11px] font-extrabold">
                                                Cuota {cuotasPag}/{cuotasTot}
                                              </span>
                                            )
                                          )}
                                          {info.esUSD ? (
                                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-extrabold">
                                              USD ({formatUSD(info.montoTotalOrig)})
                                            </span>
                                          ) : (
                                            esTarjeta && (
                                              <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold">
                                                ARS $
                                              </span>
                                            )
                                          )}
                                        </div>

                                        {esTarjeta && info.esUSD && !pagado && (
                                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            <span className="text-[11px] text-slate-400">
                                              Pagar con:
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                cambiarTipoDolarDeudaRapido(item, 'oficial')
                                              }
                                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                                                item.tipoDolar !== 'tarjeta'
                                                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                                  : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-slate-200'
                                              }`}
                                            >
                                              Dólar Oficial ({formatARS(cotizacionDolar.oficial)})
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() =>
                                                cambiarTipoDolarDeudaRapido(item, 'tarjeta')
                                              }
                                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition ${
                                                item.tipoDolar === 'tarjeta'
                                                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                                                  : 'bg-slate-900/70 text-slate-400 border-slate-700 hover:text-slate-200'
                                              }`}
                                            >
                                              Dólar Tarjeta ({formatARS(cotizacionDolar.tarjeta)})
                                            </button>
                                          </div>
                                        )}

                                        {esTarjeta && (
                                          <p className="text-xs text-indigo-400 font-semibold">
                                            {item.esSuscripcion ? 'Cargo mensual fijo: ' : 'Valor por cuota: '}
                                            {info.esUSD
                                              ? `${formatUSD(info.montoCuotaOrig)} → ${formatARS(
                                                  info.montoCuotaARS
                                                )}`
                                              : formatARS(info.montoCuotaARS)}
                                          </p>
                                        )}
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span
                                          className={`font-extrabold text-sm block ${
                                            pagado
                                              ? 'text-emerald-400 line-through'
                                              : item.esSuscripcion
                                              ? 'text-cyan-400'
                                              : esTarjeta
                                              ? 'text-indigo-400'
                                              : 'text-purple-400'
                                          }`}
                                        >
                                          {pagado
                                            ? item.esSuscripcion
                                              ? 'Pagada este mes'
                                              : 'Saldado'
                                            : `${
                                                item.esSuscripcion ? 'Este mes' : 'Faltan'
                                              } ${formatARS(info.restanteARS)}`}
                                        </span>
                                        {info.esUSD && !pagado && (
                                          <span className="text-[11px] text-emerald-400 font-bold block">
                                            ({formatUSD(info.restanteOrig)})
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {!item.esSuscripcion && esTarjeta && cuotasTot > 1 && (
                                      <div className="mt-2.5">
                                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                          <div
                                            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all"
                                            style={{ width: `${progresoPorcentaje}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-slate-800/50">
                                      {!pagado ? (
                                        <button
                                          onClick={() => abrirModalPagarMiDeuda(item)}
                                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 transition"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                          {item.esSuscripcion
                                            ? 'Pagar mes'
                                            : esTarjeta
                                            ? 'Pagar cuota'
                                            : 'Pagar / Saldar'}
                                        </button>
                                      ) : (
                                        item.esSuscripcion && (
                                          <button
                                            onClick={() => reactivarSuscripcionEsteMes(item)}
                                            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px]"
                                          >
                                            Marcar pendiente
                                          </button>
                                        )
                                      )}
                                      <button
                                        onClick={() => abrirEditarMiDeuda(item)}
                                        className={`p-1.5 rounded-xl border ${
                                          darkMode
                                            ? 'border-slate-800 text-slate-300 hover:bg-slate-800'
                                            : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                        title="Editar"
                                      >
                                        <Edit3 className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          setConfirmDelete({
                                            tipo: 'mideuda',
                                            id: item.id,
                                            titulo: `${item.acreedor}: ${item.concepto}`
                                          })
                                        }
                                        className="p-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  abrirNuevaMiDeuda(grupo.nombreMostrar, grupo.subtipo, false)
                                }
                                className={`w-full py-2.5 rounded-2xl border border-dashed text-xs font-bold transition ${
                                  esTarjeta
                                    ? 'border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10'
                                    : 'border-purple-500/40 text-purple-400 hover:bg-purple-500/10'
                                }`}
                              >
                                + Agregar {esTarjeta ? 'consumo / cuotas' : 'compromiso'} en{' '}
                                {grupo.nombreMostrar}
                              </button>
                              {esTarjeta && (
                                <button
                                  onClick={() =>
                                    abrirNuevaMiDeuda(grupo.nombreMostrar, 'tarjeta', true)
                                  }
                                  className="w-full py-2.5 rounded-2xl border border-dashed border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 text-xs font-bold transition"
                                >
                                  + Suscripción fija en {grupo.nombreMostrar}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA 5: RESPALDO, EXCEL Y NUBE */}
          {activeTab === 'respaldo' && (
            <div className="space-y-5">
              <div
                className={`rounded-3xl p-6 border ${
                  darkMode
                    ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40'
                    : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                      Sincronización Directa PC ↔ Celular
                    </span>
                    <h3 className="font-extrabold text-lg">
                      Pasar todos los datos de @{currentUser?.username} al instante
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={copiarCodigoSincronizacion}
                    className="px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shrink-0 shadow-lg shadow-emerald-500/20"
                  >
                    1. Copiar Código de Mi Cuenta
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={syncCodeInput}
                    onChange={(e) => setSyncCodeInput(e.target.value)}
                    placeholder="Pegá acá el código copiado desde tu otro dispositivo..."
                    className={`flex-1 px-4 py-3 rounded-2xl border text-xs font-mono outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-slate-200 focus:border-emerald-500'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={aplicarCodigoSincronizacion}
                    className="px-5 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-xs sm:text-sm shrink-0"
                  >
                    2. Cargar Código Pegado
                  </button>
                </div>
              </div>

              <div
                className={`rounded-3xl p-6 border space-y-6 ${
                  darkMode ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                }`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={exportarExcelCSV}
                    className="flex flex-col items-start justify-between p-5 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center mb-4">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-emerald-400">
                        Planilla para Excel (.CSV)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Descargá todos tus movimientos, tarjetas y deudas para abrir en Excel o Google Sheets.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={exportarBackupJSON}
                    className="flex flex-col items-start justify-between p-5 rounded-3xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-left transition group"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-cyan-400 text-slate-950 flex items-center justify-center mb-4">
                      <Download className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-cyan-400">
                        Exportar Respaldo (.JSON)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Guardá una copia completa de tu cuenta en tu computadora, celular o Google Drive.
                      </p>
                    </div>
                  </button>

                  <label className="cursor-pointer flex flex-col items-start justify-between p-5 rounded-3xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-left transition group">
                    <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center mb-4">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-base text-amber-400">
                        Restaurar Respaldo (.JSON)
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Cargá un archivo de respaldo previamente descargado.
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importarBackupJSON}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* BARRA DE NAVEGACIÓN INFERIOR PARA CELULAR */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t px-1 py-2 backdrop-blur-xl ${
          darkMode ? 'bg-slate-950/90 border-slate-800' : 'bg-white/95 border-slate-200'
        }`}
      >
        <div className="grid grid-cols-5 gap-0.5 max-w-md mx-auto">
          {[
            { id: 'dashboard', label: 'Inicio', icon: PieChart },
            { id: 'movimientos', label: 'Movimientos', icon: Wallet },
            {
              id: 'deudores',
              label: 'Me deben',
              icon: Users,
              badge: metricas.cantidadDeudores
            },
            {
              id: 'misdeudas',
              label: 'Debo',
              icon: HandCoins,
              badge: metricas.cantidadAcreedores
            },
            { id: 'respaldo', label: 'Respaldo', icon: FileSpreadsheet }
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1.5 rounded-2xl transition ${
                  active ? 'text-emerald-400 font-extrabold' : 'text-slate-400 font-medium'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5">{item.label}</span>
                {item.badge > 0 && (
                  <span className="absolute top-0.5 right-2.5 w-4 h-4 rounded-full bg-amber-500 text-slate-950 text-[10px] font-extrabold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODAL 1: MOVIMIENTO */}
      {modalMovimiento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl max-h-[92vh] overflow-y-auto ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg">
                {editandoMovId ? 'Editar Movimiento' : 'Anotar Movimiento'}
              </h3>
              <button
                onClick={() => setModalMovimiento(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMovimiento} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setFormMov((prev) => ({
                      ...prev,
                      tipo: 'egreso',
                      categoria: 'Supermercado'
                    }))
                  }
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    formMov.tipo === 'egreso'
                      ? 'bg-rose-500 text-white shadow'
                      : 'text-slate-400'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" /> Gasto / Egreso
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormMov((prev) => ({
                      ...prev,
                      tipo: 'ingreso',
                      categoria: prev.moneda === 'USD' ? 'Ahorro USD' : 'Sueldo'
                    }))
                  }
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    formMov.tipo === 'ingreso'
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'text-slate-400'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" /> Ingreso de Plata
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Moneda del movimiento
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                  <button
                    type="button"
                    onClick={() =>
                      setFormMov((prev) => ({
                        ...prev,
                        moneda: 'ARS',
                        metodo:
                          prev.metodo === 'Dólares Efectivo / Billete'
                            ? 'MercadoPago / Transferencia'
                            : prev.metodo
                      }))
                    }
                    className={`py-2 rounded-xl font-extrabold text-xs transition ${
                      formMov.moneda !== 'USD'
                        ? 'bg-emerald-500 text-slate-950 shadow'
                        : 'text-slate-400'
                    }`}
                  >
                    🇦🇷 Pesos (ARS $)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormMov((prev) => ({
                        ...prev,
                        moneda: 'USD',
                        metodo: 'Dólares Efectivo / Billete'
                      }))
                    }
                    className={`py-2 rounded-xl font-extrabold text-xs transition ${
                      formMov.moneda === 'USD'
                        ? 'bg-teal-400 text-slate-950 shadow'
                        : 'text-slate-400'
                    }`}
                  >
                    💵 Dólares (USD US$)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Monto ({formMov.moneda === 'USD' ? 'USD US$' : 'ARS $'})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder={formMov.moneda === 'USD' ? 'Ej: 100' : 'Ej: 15000'}
                  value={formMov.monto}
                  onChange={(e) => setFormMov({ ...formMov, monto: e.target.value })}
                  className={`w-full px-4 py-3 rounded-2xl border text-lg font-extrabold outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Categoría
                </label>
                <select
                  value={formMov.categoria}
                  onChange={(e) => setFormMov({ ...formMov, categoria: e.target.value })}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-semibold outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {(formMov.tipo === 'egreso' ? CATEGORIAS_EGRESO : CATEGORIAS_INGRESO).map(
                    (cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icono} {cat.nombre}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Detalle / Descripción
                </label>
                <input
                  type="text"
                  placeholder="Ej: Compra carnicería, Sueldo, Ahorro..."
                  value={formMov.descripcion}
                  onChange={(e) => setFormMov({ ...formMov, descripcion: e.target.value })}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-emerald-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formMov.fecha}
                    onChange={(e) => setFormMov({ ...formMov, fecha: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs font-semibold outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Medio
                  </label>
                  <select
                    value={formMov.metodo}
                    onChange={(e) => setFormMov({ ...formMov, metodo: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-2xl border text-xs font-semibold outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    {METODOS_PAGO.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!editandoMovId && (
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={mantenerAbiertoMov}
                    onChange={(e) => setMantenerAbiertoMov(e.target.checked)}
                    className="rounded accent-emerald-500"
                  />
                  <span>Modo carga rápida (mantener ventana abierta para cargar otro)</span>
                </label>
              )}

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition"
              >
                {editandoMovId ? 'Guardar Cambios' : 'Guardar Movimiento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DEUDA A COBRAR */}
      {modalDeuda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg text-amber-400">
                {editandoDeudaId ? 'Editar Deuda a Cobrar' : 'Anotar Plata que me Deben'}
              </h3>
              <button
                onClick={() => setModalDeuda(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDeuda} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  ¿Quién te debe? (Nombre)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lucas, Mamá, Franco..."
                  value={formDeuda.persona}
                  onChange={(e) => setFormDeuda({ ...formDeuda, persona: e.target.value })}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Detalle del gasto
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Mitad del asado, Entrada recital, Préstamo..."
                  value={formDeuda.concepto}
                  onChange={(e) => setFormDeuda({ ...formDeuda, concepto: e.target.value })}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-500'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Monto Total ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ej: 25000"
                    value={formDeuda.montoTotal}
                    onChange={(e) => setFormDeuda({ ...formDeuda, montoTotal: e.target.value })}
                    className={`w-full px-4 py-3 rounded-2xl border text-base font-extrabold outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Ya me pagó ($)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={formDeuda.montoPagado}
                    onChange={(e) => setFormDeuda({ ...formDeuda, montoPagado: e.target.value })}
                    className={`w-full px-4 py-3 rounded-2xl border text-base font-bold outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-800 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 transition"
              >
                {editandoDeudaId ? 'Guardar Cambios' : 'Guardar Deuda a Cobrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: COBRAR DEUDA */}
      {modalCobrar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg text-emerald-400">
                Registrar Cobro de {modalCobrar.persona}
              </h3>
              <button
                onClick={() => setModalCobrar(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmarCobroDeuda} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Monto que te transfiere / entrega hoy ($)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={montoACobrar}
                  onChange={(e) => setMontoACobrar(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-lg font-extrabold outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={sumarAlBalance}
                  onChange={(e) => setSumarAlBalance(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span>Sumar este dinero automáticamente a mi Disponible en Pesos</span>
              </label>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition"
              >
                Confirmar Cobro
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PLATA QUE DEBO */}
      {modalMiDeuda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-lg rounded-3xl border p-6 shadow-2xl max-h-[92vh] overflow-y-auto ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg">
                {editandoMiDeudaId
                  ? 'Editar Registro'
                  : formMiDeuda.subtipo === 'tarjeta'
                  ? formMiDeuda.esSuscripcion
                    ? 'Anotar Suscripción Mensual Fija'
                    : 'Anotar Consumo en Tarjeta'
                  : 'Anotar Deuda Informal'}
              </h3>
              <button
                onClick={() => setModalMiDeuda(false)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMiDeuda} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                <button
                  type="button"
                  onClick={() =>
                    setFormMiDeuda((prev) => ({ ...prev, subtipo: 'tarjeta' }))
                  }
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    formMiDeuda.subtipo === 'tarjeta'
                      ? 'bg-indigo-500 text-white shadow'
                      : 'text-slate-400'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Tarjeta de Crédito
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormMiDeuda((prev) => ({
                      ...prev,
                      subtipo: 'informal',
                      esSuscripcion: false
                    }))
                  }
                  className={`py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                    formMiDeuda.subtipo === 'informal'
                      ? 'bg-purple-500 text-white shadow'
                      : 'text-slate-400'
                  }`}
                >
                  <HandCoins className="w-4 h-4" /> Deuda Informal
                </button>
              </div>

              {formMiDeuda.subtipo === 'tarjeta' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Tipo de cargo en la tarjeta
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        setFormMiDeuda((prev) => ({ ...prev, esSuscripcion: false }))
                      }
                      className={`py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
                        !formMiDeuda.esSuscripcion
                          ? 'bg-indigo-500 text-white shadow'
                          : 'text-slate-400'
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" /> Compra / Cuotas
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFormMiDeuda((prev) => ({
                          ...prev,
                          esSuscripcion: true,
                          cuotasTotales: '1',
                          cuotasPagadas: '0'
                        }))
                      }
                      className={`py-2 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition ${
                        formMiDeuda.esSuscripcion
                          ? 'bg-cyan-500 text-slate-950 shadow'
                          : 'text-slate-400'
                      }`}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Suscripción Fija (iCloud...)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {formMiDeuda.subtipo === 'tarjeta'
                    ? 'Tarjeta de Crédito'
                    : '¿A quién le debés?'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formMiDeuda.subtipo === 'tarjeta'
                      ? 'Ej: Credicoop Cabal, Visa Galicia...'
                      : 'Ej: Amigo, Hermano...'
                  }
                  value={formMiDeuda.acreedor}
                  onChange={(e) => {
                    const nuevoAcreedor = e.target.value;
                    const vencHeredado =
                      formMiDeuda.subtipo === 'tarjeta'
                        ? obtenerVencimientoTarjetaEsteMes(nuevoAcreedor)
                        : '';
                    setFormMiDeuda((prev) => ({
                      ...prev,
                      acreedor: nuevoAcreedor,
                      vencimiento: vencHeredado || prev.vencimiento
                    }));
                  }}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                {formMiDeuda.subtipo === 'tarjeta' && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {TARJETAS_SUGERIDAS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          const vencHeredado = obtenerVencimientoTarjetaEsteMes(t);
                          setFormMiDeuda((prev) => ({
                            ...prev,
                            acreedor: t,
                            vencimiento: vencHeredado || prev.vencimiento
                          }));
                        }}
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500/25 border border-indigo-500/30"
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {formMiDeuda.subtipo === 'tarjeta' && formMiDeuda.esSuscripcion && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1.5">
                    Elegir servicio rápido (o escribí el tuyo abajo)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SUSCRIPCIONES_SUGERIDAS.map((s) => (
                      <button
                        key={s.nombre}
                        type="button"
                        onClick={() =>
                          setFormMiDeuda((prev) => ({
                            ...prev,
                            concepto: s.nombre,
                            moneda: s.moneda,
                            tipoDolar: s.tipoDolar,
                            montoCuota: String(s.monto),
                            montoTotal: String(s.monto)
                          }))
                        }
                        className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25 border border-cyan-500/30"
                      >
                        {s.nombre} ({s.moneda === 'USD' ? `US$ ${s.monto}` : `$ ${s.monto}`})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  {formMiDeuda.esSuscripcion
                    ? 'Nombre del Servicio / Suscripción'
                    : formMiDeuda.subtipo === 'tarjeta'
                    ? 'Artículo o Consumo'
                    : 'Detalle de la deuda'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    formMiDeuda.esSuscripcion
                      ? 'Ej: iCloud+ 200GB, Spotify Duo, Netflix...'
                      : formMiDeuda.subtipo === 'tarjeta'
                      ? 'Ej: Zapatillas, Supermercado, Vuelo...'
                      : 'Ej: Préstamo personal...'
                  }
                  value={formMiDeuda.concepto}
                  onChange={(e) =>
                    setFormMiDeuda({ ...formMiDeuda, concepto: e.target.value })
                  }
                  className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {formMiDeuda.subtipo === 'tarjeta' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Moneda del consumo
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-950 border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setFormMiDeuda({ ...formMiDeuda, moneda: 'ARS' })}
                        className={`py-2 rounded-xl font-extrabold text-xs transition ${
                          formMiDeuda.moneda !== 'USD'
                            ? 'bg-indigo-500 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        🇦🇷 Pesos (ARS $)
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormMiDeuda({ ...formMiDeuda, moneda: 'USD' })}
                        className={`py-2 rounded-xl font-extrabold text-xs transition ${
                          formMiDeuda.moneda === 'USD'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'text-slate-400'
                        }`}
                      >
                        💵 Dólares (USD US$)
                      </button>
                    </div>
                  </div>

                  {formMiDeuda.moneda === 'USD' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5">
                        ¿Con qué dólar lo pagás?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormMiDeuda({ ...formMiDeuda, tipoDolar: 'oficial' })
                          }
                          className={`p-2.5 rounded-2xl border text-xs font-bold transition ${
                            formMiDeuda.tipoDolar !== 'tarjeta'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          Dólar Oficial ({formatARS(cotizacionDolar.oficial)})
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormMiDeuda({ ...formMiDeuda, tipoDolar: 'tarjeta' })
                          }
                          className={`p-2.5 rounded-2xl border text-xs font-bold transition ${
                            formMiDeuda.tipoDolar === 'tarjeta'
                              ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                              : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          Dólar Tarjeta ({formatARS(cotizacionDolar.tarjeta)})
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formMiDeuda.subtipo === 'tarjeta' ? (
                formMiDeuda.esSuscripcion ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-cyan-400 mb-1.5">
                      Valor Mensual de la Suscripción ({formMiDeuda.moneda === 'USD' ? 'US$' : '$'})
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder={formMiDeuda.moneda === 'USD' ? 'Ej: 2.99' : 'Ej: 8500'}
                      value={formMiDeuda.montoCuota}
                      onChange={(e) =>
                        setFormMiDeuda({
                          ...formMiDeuda,
                          montoCuota: e.target.value,
                          montoTotal: e.target.value
                        })
                      }
                      className={`w-full px-4 py-3 rounded-2xl border text-lg font-extrabold outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Cantidad de Cuotas
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formMiDeuda.cuotasTotales}
                          onChange={(e) =>
                            setFormMiDeuda({ ...formMiDeuda, cuotasTotales: e.target.value })
                          }
                          className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-bold outline-none ${
                            darkMode
                              ? 'bg-slate-950 border-slate-800 text-white'
                              : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                        <div className="flex gap-1 mt-1.5">
                          {['1', '3', '6', '12', '18'].map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() =>
                                setFormMiDeuda({ ...formMiDeuda, cuotasTotales: q })
                              }
                              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300"
                            >
                              {q}x
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Cuotas ya pagadas
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={formMiDeuda.cuotasPagadas}
                          onChange={(e) =>
                            setFormMiDeuda({ ...formMiDeuda, cuotasPagadas: e.target.value })
                          }
                          className={`w-full px-4 py-2.5 rounded-2xl border text-sm font-bold outline-none ${
                            darkMode
                              ? 'bg-slate-950 border-slate-800 text-white'
                              : 'bg-slate-50 border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Valor de CADA Cuota ({formMiDeuda.moneda === 'USD' ? 'US$' : '$'})
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Ej: 62064"
                        value={formMiDeuda.montoCuota}
                        onChange={(e) =>
                          setFormMiDeuda({ ...formMiDeuda, montoCuota: e.target.value })
                        }
                        className={`w-full px-4 py-3 rounded-2xl border text-lg font-extrabold outline-none ${
                          darkMode
                            ? 'bg-slate-950 border-slate-800 text-white'
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Monto Total ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formMiDeuda.montoTotal}
                      onChange={(e) =>
                        setFormMiDeuda({ ...formMiDeuda, montoTotal: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-2xl border text-base font-extrabold outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Ya pagué ($)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formMiDeuda.montoPagado}
                      onChange={(e) =>
                        setFormMiDeuda({ ...formMiDeuda, montoPagado: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-2xl border text-base font-bold outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-800 text-white'
                          : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Fecha de Vencimiento de este mes (se comparte en toda la tarjeta)
                </label>
                <input
                  type="date"
                  value={formMiDeuda.vencimiento}
                  onChange={(e) =>
                    setFormMiDeuda({ ...formMiDeuda, vencimiento: e.target.value })
                  }
                  className={`w-full px-4 py-2.5 rounded-2xl border text-xs font-bold outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {!editandoMiDeudaId && (
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={mantenerAbiertoMiDeuda}
                    onChange={(e) => setMantenerAbiertoMiDeuda(e.target.checked)}
                    className="rounded accent-indigo-500"
                  />
                  <span>Modo carga rápida (mantener ventana y tarjeta para seguir cargando)</span>
                </label>
              )}

              <button
                type="submit"
                className={`w-full py-3.5 rounded-2xl font-extrabold text-sm shadow-lg transition ${
                  formMiDeuda.esSuscripcion
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                    : formMiDeuda.subtipo === 'tarjeta'
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white'
                    : 'bg-purple-500 hover:bg-purple-400 text-white'
                }`}
              >
                {editandoMiDeudaId
                  ? 'Guardar Cambios'
                  : formMiDeuda.esSuscripcion
                  ? 'Guardar Suscripción Fija'
                  : 'Guardar Consumo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: PAGAR / SALDAR MI DEUDA */}
      {modalPagarMiDeuda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-md rounded-3xl border p-6 shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-extrabold text-lg text-emerald-400">
                Pagar {modalPagarMiDeuda.concepto} ({modalPagarMiDeuda.acreedor})
              </h3>
              <button
                onClick={() => setModalPagarMiDeuda(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmarPagoMiDeuda} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Monto a abonar ({modalPagarMiDeuda.moneda === 'USD' ? 'USD US$' : 'ARS $'})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={montoAPagarMiDeuda}
                  onChange={(e) => setMontoAPagarMiDeuda(e.target.value)}
                  className={`w-full px-4 py-3 rounded-2xl border text-lg font-extrabold outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-800 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <label className="flex items-center gap-2.5 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={descontarDelBalance}
                  onChange={(e) => setDescontarDelBalance(e.target.checked)}
                  className="rounded accent-emerald-500 w-4 h-4"
                />
                <span>Descontar este pago automáticamente de mi Disponible en Pesos</span>
              </label>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/20 transition"
              >
                Confirmar Pago
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: CONFIRMACIÓN DE ELIMINACIÓN */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-sm rounded-3xl border p-6 shadow-2xl space-y-4 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-extrabold text-base">¿Eliminar este registro?</h3>
            </div>
            <p className="text-xs text-slate-400">
              Vas a eliminar <strong className="text-slate-200">{confirmDelete.titulo}</strong>.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarEliminacion}
                className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-extrabold text-xs"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
