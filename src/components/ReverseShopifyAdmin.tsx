import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  Check,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  FileCheck2,
  Globe,
  ImagePlus,
  Lock,
  Mail,
  MessageCircle,
  Package,
  Plus,
  Printer,
  RefreshCw,
  Send,
  Settings,
  ShoppingCart,
  Smartphone,
  Star,
  Tag,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';
import { ColorOption, JacketProduct } from '../data/catalog';
import { ExporterPublicInfo } from './AtelierSection';

interface OrderShippingAddress {
  name: string;
  street: string;
  line2?: string;
  zip: string;
  city: string;
  country: string;
  phone?: string;
}

export interface ExporterSettings extends ExporterPublicInfo {
  defaultWeightKg: number;
  dispatchMode: 'casablanca_direct' | 'schoeneck_hub';
}

const DEFAULT_EXPORTER_SETTINGS: ExporterSettings = {
  companyName: 'MRKSHI Atelier',
  legalFormNote: 'SARL en cours de constitution',
  street: 'Quartier Maarif, Casablanca',
  cityZip: '20100 Casablanca',
  country: 'Morocco',
  iceNumber: 'En cours d’attribution',
  email: 'service@mrkshi.com',
  phoneMorocco: '+212 753 310 471',
  phoneSupportDe: '',
  returnNameDe: 'MRKSHI Retouren-Programm',
  returnStreetDe: 'Alte Dorfstraße 3a',
  returnCityZipDe: '61137 Schöneck',
  defaultHsCode: '42031000',
  defaultIncoterms: 'DDP',
  defaultWeightKg: 1.35,
  dispatchMode: 'casablanca_direct',
};

interface OrderItemRecord {
  productId: string;
  name: string;
  colorName: string;
  sizeLabel: string;
  customMeasure: string;
  giftWrap: boolean;
  unitAmountCents: number;
  quantity: number;
}

interface OrderRecord {
  id: string;
  sessionId: string;
  mode: 'stripe' | 'preview';
  status: 'pending_payment' | 'paid' | 'cancelled';
  customerName?: string;
  customerEmail: string;
  whatsappNumber: string;
  measurementsSummary: string;
  giftNote: string;
  totalCents: number;
  currency: string;
  items: OrderItemRecord[];
  n8nSent: boolean;
  telegramSent: boolean;
  shippingSummary?: string;
  shippingAddress?: OrderShippingAddress;
  fulfillmentStatus?: 'unfulfilled' | 'in_production' | 'shipped';
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  createdAt: string;
  paidAt?: string;
}

interface NewsletterSubscriber {
  id: string;
  email: string;
  preferredColor: string;
  voucherCode: string;
  consentAccepted: boolean;
  createdAt: string;
}

interface AdminIntegrationsStatus {
  stripeConfigured: boolean;
  stripeMode?: 'live' | 'test' | 'unset';
  stripeWebhookConfigured: boolean;
  n8nConfigured: boolean;
  telegramConfigured: boolean;
  capiConfigured: boolean;
  pixelId?: string;
  domain: string;
}

interface AdminStateResponse {
  products: JacketProduct[];
  orders: OrderRecord[];
  newsletter: NewsletterSubscriber[];
  oneEuroTestProductId: string | null;
  exporterSettings?: ExporterSettings;
  integrations: AdminIntegrationsStatus;
}

interface AnalyticsResponse {
  generatedAt: string;
  rangeDays: number | 'all';
  kpis: {
    uniqueVisitors: number;
    pageViews: number;
    viewContent: number;
    addToCart: number;
    initiateCheckout: number;
    paidOrders: number;
    revenueEur: number;
    aovEur: number;
    atcRatePct: number;
    checkoutRatePct: number;
    conversionRatePct: number;
  };
  funnel: Array<{ step: string; count: number; pct: number }>;
  devices: { mobile: number; desktop: number };
  sources: Array<{ source: string; visitors: number }>;
  topProducts: Array<{
    id: string;
    name: string;
    stockTotal: number;
    priceEur: number;
    active: boolean;
    views: number;
    carts: number;
    checkouts: number;
    purchases: number;
    revenueEur: number;
  }>;
  daily: Array<{
    day: string;
    visitors: number;
    pageViews: number;
    carts: number;
    checkouts: number;
    orders: number;
    revenueEur: number;
  }>;
  recentEvents: Array<{
    ts: number;
    type: string;
    source: string;
    device: string;
    productName?: string;
    colorName?: string;
    valueEur?: number;
  }>;
}

interface ProductDraft {
  name: string;
  subtitle: string;
  leatherType: JacketProduct['leatherType'];
  priceEur: number;
  compareAtEur: number;
  stockTotal: number;
  active: boolean;
  tagline: string;
  description: string;
  gallery: string[];
  colors: ColorOption[];
}

interface ReverseShopifyAdminProps {
  open: boolean;
  onClose: () => void;
  onCatalogUpdated: (nextProducts: JacketProduct[]) => void;
  onExporterUpdated?: (nextExporter: ExporterPublicInfo) => void;
  onOpenPixelSettings: (activeAdminToken?: string | null) => void;
}

/** Compress user-selected image file in browser to crisp WebP (~80-150 KB) before upload */
async function fileToCompressedWebpDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ungültige Bilddatei.'));
      img.onload = () => {
        const maxDim = 1080;
        const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
        const w = Math.max(1, Math.round(img.naturalWidth * scale));
        const h = Math.max(1, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const out = canvas.toDataURL('image/webp', 0.85);
        resolve(out.startsWith('data:image/webp') ? out : canvas.toDataURL('image/jpeg', 0.86));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const ReverseShopifyAdmin: React.FC<ReverseShopifyAdminProps> = ({
  open,
  onClose,
  onCatalogUpdated,
  onExporterUpdated,
  onOpenPixelSettings,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'checking' | 'bootstrap' | 'login'>('checking');
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [tab, setTab] = useState<
    'analytics' | 'orders' | 'logistics' | 'products' | 'newsletter' | 'integrations'
  >('analytics');
  const [adminState, setAdminState] = useState<AdminStateResponse | null>(null);
  const [exporterDraft, setExporterDraft] = useState<ExporterSettings>(DEFAULT_EXPORTER_SETTINGS);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderEditDraft, setOrderEditDraft] = useState<{
    status: OrderRecord['status'];
    fulfillmentStatus: NonNullable<OrderRecord['fulfillmentStatus']>;
    carrier: string;
    trackingNumber: string;
    customerName: string;
    customerEmail: string;
    whatsappNumber: string;
    street: string;
    line2: string;
    zip: string;
    city: string;
    country: string;
  } | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState<number>(7);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Smart Product Studio state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [newImageUrlInput, setNewImageUrlInput] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  // Create new product state
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    leatherType: 'Lamm-Nappa' as JacketProduct['leatherType'],
    priceEur: 177,
    compareAtEur: 354,
    stockTotal: 50,
    colorName: 'Bleu Petrol',
    colorHex: '#1B1C1E',
    imageUrl: '',
    tagline: '',
    description: '',
  });

  const fetchAuthStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/auth-status');
      const data = (await res.json()) as { initialized: boolean };
      setAuthMode(data.initialized ? 'login' : 'bootstrap');
    } catch {
      setAuthMode('login');
    }
  }, []);

  const loadAdminState = useCallback(async (activeToken: string) => {
    const res = await fetch('/api/admin/state', {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    if (res.status === 401) {
      setToken(null);
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as AdminStateResponse;
    setAdminState(data);
    if (data.exporterSettings) {
      setExporterDraft({ ...DEFAULT_EXPORTER_SETTINGS, ...data.exporterSettings });
    }
  }, []);

  const loadAnalytics = useCallback(async (activeToken: string, days: number) => {
    const res = await fetch(`/api/admin/analytics?days=${days}`, {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    if (!res.ok) return;
    const data = (await res.json()) as AnalyticsResponse;
    setAnalytics(data);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!token) {
      fetchAuthStatus();
    } else {
      loadAdminState(token);
      loadAnalytics(token, analyticsDays);
    }
  }, [open, token, analyticsDays, fetchAuthStatus, loadAdminState, loadAnalytics]);

  if (!open) return null;

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    if (!token) return null;
    setUploadingImage(true);
    try {
      const dataUrl = await fileToCompressedWebpDataUrl(file);
      const res = await fetch('/api/admin/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dataUrl }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setToastMsg(data.error ?? 'Bild-Upload fehlgeschlagen.');
        return null;
      }
      return data.url;
    } catch (err) {
      setToastMsg(err instanceof Error ? err.message : 'Bild-Upload fehlgeschlagen.');
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const openEditor = (prod: JacketProduct) => {
    if (editingId === prod.id) {
      setEditingId(null);
      setDraft(null);
      return;
    }
    const mergedGallery = Array.from(
      new Set([...prod.gallery, ...prod.colors.map((c) => c.image)].filter(Boolean))
    );
    setEditingId(prod.id);
    setNewImageUrlInput('');
    setDraft({
      name: prod.name,
      subtitle: prod.subtitle,
      leatherType: prod.leatherType,
      priceEur: prod.priceEur,
      compareAtEur: prod.compareAtEur,
      stockTotal: prod.stockTotal,
      active: prod.active,
      tagline: prod.tagline,
      description: prod.description,
      gallery: mergedGallery,
      colors: prod.colors.map((c) => ({ ...c })),
    });
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const endpoint =
        authMode === 'bootstrap' ? '/api/admin/bootstrap' : '/api/admin/login';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcodeInput }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        setAuthError(data.error ?? 'Anmeldung fehlgeschlagen.');
        return;
      }
      setToken(data.token);
      setPasscodeInput('');
      await Promise.all([loadAdminState(data.token), loadAnalytics(data.token, analyticsDays)]);
    } catch {
      setAuthError('Verbindungsfehler zum Server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateProduct = async (
    productId: string,
    patch: Partial<ProductDraft>
  ): Promise<boolean> => {
    if (!token) return false;
    setBusyAction(`prod-${productId}`);
    setToastMsg(null);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(patch),
      });
      const data = (await res.json()) as { products?: JacketProduct[]; error?: string };
      if (!res.ok || !data.products) {
        setToastMsg(data.error ?? 'Produkt-Update fehlgeschlagen.');
        return false;
      }
      setAdminState((prev) => (prev ? { ...prev, products: data.products! } : prev));
      onCatalogUpdated(data.products);
      setToastMsg('Produkt gespeichert & live aktualisiert.');
      return true;
    } finally {
      setBusyAction(null);
    }
  };

  const handleMoveProductOrder = async (index: number, dir: -1 | 1) => {
    if (!token || !adminState) return;
    const list = [...adminState.products];
    const target = index + dir;
    if (target < 0 || target >= list.length) return;
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    setBusyAction('reorder-products');
    try {
      const res = await fetch('/api/admin/products/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderedIds: list.map((p) => p.id) }),
      });
      const data = (await res.json()) as { products?: JacketProduct[] };
      if (data.products) {
        setAdminState((prev) => (prev ? { ...prev, products: data.products! } : prev));
        onCatalogUpdated(data.products);
        setToastMsg('Produkt-Reihenfolge im Shop aktualisiert.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusyAction('create-product');
    setToastMsg(null);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newProduct),
      });
      const data = (await res.json()) as { products?: JacketProduct[]; error?: string };
      if (!res.ok || !data.products) {
        setToastMsg(data.error ?? 'Produkt konnte nicht angelegt werden.');
        return;
      }
      setAdminState((prev) => (prev ? { ...prev, products: data.products! } : prev));
      onCatalogUpdated(data.products);
      setShowNewProduct(false);
      setNewProduct((p) => ({
        ...p,
        name: '',
        imageUrl: '',
        tagline: '',
        description: '',
      }));
      setToastMsg('Neues Produkt ist sofort online.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!token) return;
    if (!window.confirm('Produkt wirklich dauerhaft löschen?')) return;
    setBusyAction(`del-${productId}`);
    try {
      const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { products?: JacketProduct[]; error?: string };
      if (data.products) {
        setAdminState((prev) => (prev ? { ...prev, products: data.products! } : prev));
        onCatalogUpdated(data.products);
        if (editingId === productId) {
          setEditingId(null);
          setDraft(null);
        }
        setToastMsg('Produkt gelöscht.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleToggleOneEuroTest = async (productId: string | null) => {
    if (!token) return;
    setBusyAction('one-euro-test');
    try {
      const res = await fetch('/api/admin/one-euro-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });
      const data = (await res.json()) as {
        oneEuroTestProductId?: string | null;
        products?: JacketProduct[];
        message?: string;
      };
      if (res.ok) {
        setAdminState((prev) =>
          prev ? { ...prev, oneEuroTestProductId: data.oneEuroTestProductId ?? null } : prev
        );
        if (data.products) onCatalogUpdated(data.products);
        setToastMsg(data.message ?? '1-€-Testmodus aktualisiert.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportCsv = async () => {
    if (!token) return;
    setBusyAction('export-csv');
    try {
      const res = await fetch('/api/admin/export-csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = new Blob([await res.text()], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mrkshi-produkte.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportAnalyticsJson = () => {
    if (!analytics) return;
    const blob = new Blob([JSON.stringify(analytics, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mrkshi-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportNewsletterCsv = async () => {
    if (!token) return;
    setBusyAction('export-newsletter');
    try {
      const res = await fetch('/api/admin/export-newsletter-csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const blob = new Blob([await res.text()], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mrkshi-treue-newsletter.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusyAction(null);
    }
  };

  const handleNotifyOrder = async (orderId: string) => {
    if (!token) return;
    setBusyAction(`notify-${orderId}`);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/notify`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { order?: OrderRecord; message?: string };
      if (data.order) {
        setAdminState((prev) =>
          prev
            ? { ...prev, orders: prev.orders.map((o) => (o.id === orderId ? data.order! : o)) }
            : prev
        );
      }
      setToastMsg(data.message ?? 'Benachrichtigung ausgeführt.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleTestIntegrations = async () => {
    if (!token) return;
    setBusyAction('test-notify');
    try {
      const res = await fetch('/api/admin/test-notifications', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as { message?: string };
      setToastMsg(data.message ?? 'Test gesendet.');
    } finally {
      setBusyAction(null);
    }
  };

  const resolveConsignee = (order: OrderRecord) => {
    const addr = order.shippingAddress;
    const summaryParts = (order.shippingSummary ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const name =
      addr?.name ||
      order.customerName ||
      summaryParts[0] ||
      (order.customerEmail ? order.customerEmail.split('@')[0] : '') ||
      'Bitte Empfängername eintragen';

    const street = addr?.street || summaryParts[1] || '';
    const line2 = addr?.line2 || '';
    const zip = addr?.zip || '';
    const city = addr?.city || summaryParts[2] || '';
    const country = addr?.country || summaryParts[3] || 'Germany';
    const zipCity = [zip, city].filter(Boolean).join(' ');
    const phone =
      addr?.phone ||
      (order.whatsappNumber && order.whatsappNumber !== 'via Stripe Checkout'
        ? order.whatsappNumber
        : '');
    const email = order.customerEmail || '';

    return {
      name,
      street,
      line2,
      zip,
      city,
      zipCity,
      country,
      zipCityCountry: [zipCity, country].filter(Boolean).join(', '),
      phone,
      email,
      hasFullAddress: Boolean(street && (zip || city)),
    };
  };

  const handleSaveExporterSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setBusyAction('save-exporter');
    setToastMsg(null);
    try {
      const res = await fetch('/api/admin/exporter-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(exporterDraft),
      });
      const data = (await res.json()) as {
        exporterSettings?: ExporterSettings;
        message?: string;
        error?: string;
      };
      if (!res.ok || !data.exporterSettings) {
        setToastMsg(data.error ?? 'Speichern fehlgeschlagen.');
        return;
      }
      setExporterDraft(data.exporterSettings);
      setAdminState((prev) =>
        prev ? { ...prev, exporterSettings: data.exporterSettings } : prev
      );
      onExporterUpdated?.(data.exporterSettings);
      setToastMsg(data.message ?? 'Exporteur- & Zoll-Einstellungen gespeichert.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSyncStripeOrders = async () => {
    if (!token) return;
    setBusyAction('sync-stripe');
    setToastMsg(null);
    try {
      const res = await fetch('/api/admin/orders/sync-stripe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as {
        orders?: OrderRecord[];
        message?: string;
        error?: string;
      };
      if (res.ok && data.orders) {
        setAdminState((prev) => (prev ? { ...prev, orders: data.orders! } : prev));
        setToastMsg(data.message ?? 'Stripe-Bestellungen synchronisiert.');
      } else {
        setToastMsg(data.error ?? 'Stripe-Synchronisierung fehlgeschlagen.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const openOrderEditor = (order: OrderRecord) => {
    if (editingOrderId === order.id) {
      setEditingOrderId(null);
      setOrderEditDraft(null);
      return;
    }
    const c = resolveConsignee(order);
    setEditingOrderId(order.id);
    setOrderEditDraft({
      status: order.status,
      fulfillmentStatus: order.fulfillmentStatus ?? 'unfulfilled',
      carrier: order.carrier || 'DHL Express',
      trackingNumber: order.trackingNumber || '',
      customerName: c.name === 'Bitte Empfängername eintragen' ? '' : c.name,
      customerEmail: c.email,
      whatsappNumber: c.phone,
      street: c.street,
      line2: c.line2,
      zip: c.zip,
      city: c.city,
      country: c.country || 'Germany',
    });
  };

  const handleSaveOrderEdit = async (orderId: string) => {
    if (!token || !orderEditDraft) return;
    setBusyAction(`edit-ord-${orderId}`);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: orderEditDraft.status,
          fulfillmentStatus: orderEditDraft.fulfillmentStatus,
          carrier: orderEditDraft.carrier,
          trackingNumber: orderEditDraft.trackingNumber,
          customerName: orderEditDraft.customerName,
          customerEmail: orderEditDraft.customerEmail,
          whatsappNumber: orderEditDraft.whatsappNumber,
          shippingAddress: {
            name: orderEditDraft.customerName,
            street: orderEditDraft.street,
            line2: orderEditDraft.line2,
            zip: orderEditDraft.zip,
            city: orderEditDraft.city,
            country: orderEditDraft.country,
            phone: orderEditDraft.whatsappNumber,
          },
        }),
      });
      const data = (await res.json()) as {
        orders?: OrderRecord[];
        message?: string;
        error?: string;
      };
      if (res.ok && data.orders) {
        setAdminState((prev) => (prev ? { ...prev, orders: data.orders! } : prev));
        setEditingOrderId(null);
        setOrderEditDraft(null);
        setToastMsg(data.message ?? 'Bestelldaten gespeichert.');
      } else {
        setToastMsg(data.error ?? 'Speichern fehlgeschlagen.');
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleQuickFulfillment = async (
    orderId: string,
    fulfillmentStatus: 'unfulfilled' | 'in_production' | 'shipped'
  ) => {
    if (!token) return;
    setBusyAction(`fulfill-${orderId}`);
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ fulfillmentStatus }),
      });
      const data = (await res.json()) as { orders?: OrderRecord[] };
      if (res.ok && data.orders) {
        setAdminState((prev) => (prev ? { ...prev, orders: data.orders! } : prev));
        setToastMsg(`Versandstatus für ${orderId} aktualisiert.`);
      }
    } finally {
      setBusyAction(null);
    }
  };

  const handleCopyRecipient = async (order: OrderRecord) => {
    const c = resolveConsignee(order);
    const block = [
      c.name,
      c.street,
      c.line2,
      [c.zip, c.city].filter(Boolean).join(' '),
      c.country,
      c.phone ? `Tel: ${c.phone}` : '',
      c.email ? `E-Mail: ${c.email}` : '',
      `Ref: ${order.id}`,
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(block);
      setToastMsg(`Empfängerdaten (${order.id}) für MyDHL+ / DHL.de in die Zwischenablage kopiert.`);
    } catch {
      setToastMsg('Kopieren nicht möglich – bitte manuell markieren.');
    }
  };

  const getCustomsMaterialLabel = (productId: string) => {
    const prod = adminState?.products.find((p) => p.id === productId);
    if (prod?.leatherType === 'Wildleder' || prod?.leatherType === 'Rind-Wildleder') {
      return '100% Suede Genuine Leather Jacket';
    }
    if (prod?.leatherType === 'Vollrind-Nappa') {
      return '100% Cowhide Genuine Leather Jacket';
    }
    return '100% Lambskin Leather Jacket';
  };

  const handlePrintInvoice = (order: OrderRecord) => {
    const esc = (s: string) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const eur = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €';

    const exp = adminState?.exporterSettings ?? exporterDraft ?? DEFAULT_EXPORTER_SETTINGS;
    const sellerTitle = exp.legalFormNote
      ? `${exp.companyName} (${exp.legalFormNote})`
      : exp.companyName;
    const deReturnFull = `${exp.returnNameDe}, ${exp.returnStreetDe}, ${exp.returnCityZipDe}`;
    const hsCode = exp.defaultHsCode || '42031000';
    const incotermsLabel =
      exp.defaultIncoterms === 'DAP'
        ? 'DAP (Delivered at Place)'
        : 'DDP (Delivered Duty Paid)';

    const consignee = resolveConsignee(order);
    const gross = order.totalCents;
    const net = Math.round(gross / 1.19);
    const vat = gross - net;
    const itemsSum = order.items.reduce((s, i) => s + i.unitAmountCents * i.quantity, 0);
    const discount = Math.max(0, itemsSum - gross);
    const ratio = itemsSum > 0 ? gross / itemsSum : 1;
    const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
    const totalWeightStr = (totalQty * (exp.defaultWeightKg || 1.35)).toFixed(2).replace('.', ',');
    const date = new Date(order.paidAt ?? order.createdAt).toLocaleDateString('de-DE');

    const rows = order.items
      .map((i, idx) => {
        const lineGross = Math.round(i.unitAmountCents * i.quantity * ratio);
        const lineNet = Math.round(lineGross / 1.19);
        const matDesc = getCustomsMaterialLabel(i.productId);
        return `<tr>
          <td>${idx + 1}</td>
          <td>
            <strong>${esc(i.name)} – ${esc(matDesc)}</strong><br/>
            <span class="sub">Farbe: ${esc(i.colorName)} · Größe: ${esc(i.sizeLabel)}${
          i.customMeasure ? ' · Maßanfertigung: ' + esc(i.customMeasure) : ''
        } · <strong>Origin: Morocco</strong></span>
          </td>
          <td class="c mono">${esc(hsCode)}</td>
          <td class="r">${i.quantity}</td>
          <td class="r">${eur(lineNet)}</td>
          <td class="r"><strong>${eur(lineGross)}</strong></td>
        </tr>`;
      })
      .join('');

    const unpaidWarning =
      order.status !== 'paid' || !consignee.hasFullAddress
        ? `<div class="noprint" style="margin-bottom:14px;padding:12px 14px;background:#FEF2F2;border:2px solid #DC2626;color:#991B1B;font-size:12.5px;border-radius:8px">
            <strong>⚠️ Wichtig vor dem Zolldruck:</strong>
            ${
              order.status !== 'paid'
                ? 'Zahlungsstatus steht noch auf „Offen“. Klicke im Dashboard auf „Stripe-Daten synchronisieren“ oder bearbeite die Bestellung auf „Bezahlt“. '
                : ''
            }
            ${
              !consignee.hasFullAddress
                ? 'Empfänger-Straße/PLZ fehlt noch — bitte über „Adresse & Tracking bearbeiten“ ergänzen!'
                : ''
            }
          </div>`
        : '';

    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"/>
      <title>Rechnung &amp; Commercial Invoice ${esc(order.id)}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:32px 38px;font-size:12.5px;line-height:1.45}
        .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:14px;gap:24px}
        .brand{font-size:28px;font-weight:900;letter-spacing:.06em;line-height:1}
        .sub{color:#444;font-size:11.5px}
        .mono{font-family:Consolas,Monaco,monospace}
        h1{font-size:18px;margin:20px 0 12px;text-transform:uppercase;letter-spacing:.02em}
        .meta-grid{display:flex;justify-content:space-between;gap:24px;margin-top:8px;padding:12px 14px;background:#F8F8F8;border:1px solid #DDD}
        table{width:100%;border-collapse:collapse;margin-top:18px}
        th{background:#000;color:#fff;text-align:left;padding:8px 9px;font-size:11.5px;text-transform:uppercase;letter-spacing:.03em}
        td{padding:9px;border-bottom:1px solid #DDD;vertical-align:top}
        .r{text-align:right} .c{text-align:center}
        .totals{width:380px;margin-left:auto;margin-top:12px;border-collapse:collapse}
        .totals td{border:none;padding:4px 8px}
        .customs-net td{background:#F3F4F6;font-weight:700;border-top:1px solid #000;border-bottom:1px solid #000;padding:6px 8px}
        .grand td{font-size:15px;font-weight:900;border-top:2px solid #000;padding-top:8px}
        .origin-box{margin-top:20px;padding:12px 14px;border:1.5px solid #000;background:#FAFAFA;font-size:11.5px}
        .sig-row{margin-top:16px;display:flex;justify-content:space-between;align-items:flex-end;gap:20px;font-size:11.5px}
        .foot{margin-top:22px;border-top:1px solid #CCC;padding-top:10px;font-size:10.8px;color:#444;line-height:1.5}
        @media print{body{padding:12mm 14mm} .noprint{display:none}}
      </style></head><body>
      <div class="noprint" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;gap:12px">
        <span style="font-size:12px;color:#444"><strong>Tipp für Marokko-Zoll:</strong> 1× für Kunden (PDF/Paket) + <strong>3× unterschrieben außen ans Paket</strong> in Klarsichttasche („Customs Documents Enclosed“).</span>
        <button onclick="window.print()" style="padding:9px 18px;background:#000;color:#fff;border:0;font-weight:700;cursor:pointer;border-radius:6px;white-space:nowrap">Drucken / als PDF speichern</button>
      </div>
      ${unpaidWarning}

      <div class="top">
        <div>
          <div class="brand">MRKSHI</div>
          <div class="sub" style="margin-top:4px;font-weight:700;color:#111">Lederatelier · Casablanca &amp; Marrakesch, Marokko</div>
        </div>
        <div class="r" style="font-size:11.8px;max-width:340px">
          <strong>Verkäufer / Exporter:</strong><br/>
          <strong>${esc(sellerTitle)}</strong><br/>
          ${esc(exp.street)}<br/>
          ${esc(exp.cityZip)}, ${esc(exp.country)}<br/>
          ICE: <span class="mono">${esc(exp.iceNumber)}</span> | E-Mail: ${esc(exp.email)}
          ${exp.phoneMorocco ? `<br/>Tel (MA): ${esc(exp.phoneMorocco)}` : ''}
        </div>
      </div>

      <h1>Rechnung &amp; Handelsrechnung (Invoice / Commercial Invoice)</h1>

      <div class="meta-grid">
        <div style="flex:1">
          <strong>Rechnungs- &amp; Lieferadresse (Consignee):</strong><br/>
          <strong>${esc(consignee.name)}</strong><br/>
          ${consignee.street ? `${esc(consignee.street)}<br/>` : ''}
          ${consignee.line2 ? `${esc(consignee.line2)}<br/>` : ''}
          ${consignee.zipCityCountry ? `${esc(consignee.zipCityCountry)}<br/>` : ''}
          ${consignee.phone ? `Tel: ${esc(consignee.phone)}` : ''}
          ${consignee.phone && consignee.email ? ' · ' : ''}
          ${consignee.email ? `E-Mail: ${esc(consignee.email)}` : ''}
        </div>
        <div class="r" style="min-width:255px">
          <strong>Rechnungsnummer:</strong> <span class="mono">${esc(order.id)}</span><br/>
          <strong>Rechnungsdatum:</strong> ${date}<br/>
          <strong>Zahlungsstatus:</strong> ${
            order.status === 'paid'
              ? '<strong>Bezahlt (Stripe)</strong> (Payment Status: <strong>Paid</strong>)'
              : 'Offen (Payment Status: Pending)'
          }<br/>
          <strong>Incoterms:</strong> <strong>${esc(incotermsLabel)}</strong><br/>
          <strong>Country of Origin:</strong> Morocco (MA) · <strong>Weight:</strong> ${totalWeightStr} kg
          ${order.trackingNumber ? `<br/><strong>Tracking (${esc(order.carrier || 'DHL')}):</strong> <span class="mono">${esc(order.trackingNumber)}</span>` : ''}
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width:32px">#</th>
            <th>Artikel / Description of Goods</th>
            <th class="c" style="width:92px">HS Code</th>
            <th class="r" style="width:58px">Menge</th>
            <th class="r" style="width:95px">Netto</th>
            <th class="r" style="width:95px">Brutto</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <table class="totals">
        ${
          discount > 0
            ? `<tr><td>Zwischensumme (Brutto)</td><td class="r">${eur(itemsSum)}</td></tr>
               <tr><td>Gutschein-Rabatt</td><td class="r">-${eur(discount)}</td></tr>`
            : ''
        }
        <tr class="customs-net">
          <td>Zollwert / Netto-Warenwert (Customs Value Net):</td>
          <td class="r">${eur(net)}</td>
        </tr>
        <tr>
          <td>Versand (${esc(exp.defaultIncoterms)} Kurier inkl. Zollabwicklung):</td>
          <td class="r">0,00 €</td>
        </tr>
        <tr>
          <td>zzgl. 19 % deutsche MwSt. (VAT):</td>
          <td class="r">${eur(vat)}</td>
        </tr>
        <tr class="grand">
          <td>Gesamtbetrag (Total Gross Paid):</td>
          <td class="r">${eur(gross)}</td>
        </tr>
      </table>

      ${
        order.giftNote
          ? `<p class="sub" style="margin-top:10px"><strong>Bestellhinweis:</strong> ${esc(order.giftNote)}</p>`
          : ''
      }

      <div class="origin-box">
        <strong>Customs Origin Declaration (Präferenzursprungserklärung EU–Marokko):</strong><br/>
        "The exporter of the products covered by this document declares that, except where otherwise clearly indicated, these products are of <strong>Morocco preferential origin</strong>."
        <div class="sig-row">
          <div><strong>Place &amp; Date:</strong> Casablanca, ${date}</div>
          <div><strong>Signature / Stamp:</strong> ___________________________________</div>
        </div>
      </div>

      <div class="foot">
        Vielen Dank für deinen Einkauf bei MRKSHI. <strong>Widerrufsrecht:</strong> 14 Tage ab Erhalt der Ware bei Standardgrößen (kein Widerrufsrecht bei individuellen Maßanfertigungen gem. § 312g Abs. 2 Nr. 1 BGB). <strong>14-Tage-Retouren-Programm (Rücksendeadresse):</strong> ${esc(deReturnFull)}.
      </div>
      <script>setTimeout(function(){window.print()},400)</script>
      </body></html>`;

    const w = window.open('', '_blank', 'width=940,height=1120');
    if (!w) {
      setToastMsg('Pop-up blockiert – bitte Pop-ups für mrkshi.com erlauben.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const handlePrintShippingLabel = (order: OrderRecord) => {
    const esc = (s: string) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const eur = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' EUR';
    const exp = adminState?.exporterSettings ?? exporterDraft ?? DEFAULT_EXPORTER_SETTINGS;
    const consignee = resolveConsignee(order);
    const net = Math.round(order.totalCents / 1.19);
    const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
    const weightStr = (totalQty * (exp.defaultWeightKg || 1.35)).toFixed(2);
    const date = new Date().toLocaleDateString('de-DE');

    const senderLines =
      exp.dispatchMode === 'schoeneck_hub'
        ? `${esc(exp.returnNameDe)} · ${esc(exp.returnStreetDe)} · ${esc(exp.returnCityZipDe)} · Germany`
        : `${esc(exp.companyName)} · ${esc(exp.street)} · ${esc(exp.cityZip)} · ${esc(exp.country)}`;

    const itemsChecklist = order.items
      .map(
        (i) =>
          `<li>☐ <strong>${i.quantity}× ${esc(i.name)}</strong> — Farbe: <strong>${esc(
            i.colorName
          )}</strong> · Größe: <strong>${esc(i.sizeLabel)}</strong>${
            i.customMeasure ? `<br/>&nbsp;&nbsp;&nbsp;&nbsp;📏 Sondermaß: <strong>${esc(i.customMeasure)}</strong>` : ''
          }${i.giftWrap ? ' · 🎁 Geschenkbox' : ''}</li>`
      )
      .join('');

    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"/>
      <title>Paket-Zettel &amp; Aufkleber ${esc(order.id)}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;padding:24px;font-size:13px}
        .label-card{border:3px solid #000;padding:18px;max-width:620px;margin:0 auto 22px}
        .cut{border-top:2px dashed #666;margin:20px auto;max-width:620px;text-align:center;font-size:11px;color:#555;padding-top:4px}
        .pack-card{border:1.5px solid #000;padding:16px;max-width:620px;margin:0 auto;font-size:12.5px}
        .badge{display:inline-block;background:#000;color:#fff;font-weight:900;padding:4px 10px;font-size:13px;letter-spacing:.05em}
        @media print{body{padding:8mm} .noprint{display:none}}
      </style></head><body>
      <div class="noprint" style="max-width:620px;margin:0 auto 16px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:12px">Oben: <strong>Außen aufs Paket kleben</strong> · Unten: <strong>Atelier-Packzettel (ins Paket)</strong></span>
        <button onclick="window.print()" style="padding:9px 16px;background:#000;color:#fff;border:0;font-weight:700;cursor:pointer;border-radius:6px">Zettel jetzt drucken</button>
      </div>

      <div class="label-card">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #000;padding-bottom:10px">
          <div>
            <span class="badge">MRKSHI PARCEL</span>
            <span style="margin-left:8px;font-family:monospace;font-weight:900;font-size:16px">${esc(order.id)}</span>
          </div>
          <div style="text-align:right;font-size:11px;font-weight:700">
            INCOTERMS: ${esc(exp.defaultIncoterms)}<br/>ORIGIN: MOROCCO (MA)
          </div>
        </div>

        <div style="font-size:11px;color:#333;padding:8px 0;border-bottom:1px solid #CCC">
          <strong>FROM / ABSENDER:</strong> ${senderLines}
        </div>

        <div style="padding:14px 0;border-bottom:2px solid #000">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#444">SHIP TO / EMPFÄNGER (CONSIGNEE):</div>
          <div style="font-size:21px;font-weight:900;margin-top:4px">${esc(consignee.name)}</div>
          <div style="font-size:17px;font-weight:700;margin-top:2px">${esc(consignee.street || '— Straße fehlt —')}</div>
          ${consignee.line2 ? `<div style="font-size:15px">${esc(consignee.line2)}</div>` : ''}
          <div style="font-size:19px;font-weight:900;margin-top:4px">${esc(consignee.zipCity)}</div>
          <div style="font-size:16px;font-weight:900;text-transform:uppercase;letter-spacing:.05em">${esc(consignee.country)}</div>
          <div style="margin-top:8px;font-size:13px;font-weight:700">
            📞 Tel (Kurier): ${esc(consignee.phone || '—')} &nbsp;|&nbsp; ✉️ ${esc(consignee.email || '—')}
          </div>
        </div>

        <div style="padding-top:10px;font-size:11.5px;display:flex;justify-content:space-between;gap:12px">
          <div>
            <strong>CN23 / CUSTOMS SUMMARY:</strong><br/>
            Description: Men's 100% Genuine Leather Jacket<br/>
            HS Code: <strong>${esc(exp.defaultHsCode)}</strong> · Origin: <strong>Morocco</strong>
          </div>
          <div style="text-align:right">
            Customs Net Value: <strong>${eur(net)}</strong><br/>
            Qty: <strong>${totalQty} pcs</strong> · Weight: <strong>${weightStr} kg</strong><br/>
            Payment: <strong>${order.status === 'paid' ? 'PAID' : 'PENDING'}</strong>
          </div>
        </div>
      </div>

      <div class="cut">✂️ HIER SCHNEIDEN — OBEREN TEIL AUSSEN AUFS PAKET (+ 3× RECHNUNG IN KLARSICHTTASCHE) · UNTEREN TEIL INS PAKET LEGEN ✂️</div>

      <div class="pack-card">
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid #000;padding-bottom:8px">
          <strong style="font-size:16px">MRKSHI ATELIER — LIEFERSCHEIN &amp; QUALITÄTSCHECK</strong>
          <span style="font-family:monospace;font-weight:700">${esc(order.id)} · ${date}</span>
        </div>
        <ul style="list-style:none;padding:0;margin:12px 0;line-height:1.7">${itemsChecklist}</ul>
        ${
          order.measurementsSummary
            ? `<div style="padding:8px 10px;background:#F4F4F4;border-left:3px solid #000;margin-bottom:10px"><strong>Maßchecker-Angaben:</strong> ${esc(order.measurementsSummary)}</div>`
            : ''
        }
        <div style="font-size:11.5px;border-top:1px solid #DDD;padding-top:8px;color:#333">
          <strong>Pack-Checkliste vor Versand:</strong> ☐ Leder &amp; Reißverschlüsse geprüft &nbsp; ☐ Größe/Maße kontrolliert &nbsp; ☐ 3× unterschriebene Handelsrechnung außen angebracht<br/><br/>
          <strong>Für den Kunden — Kontakt &amp; Retouren-Programm:</strong> Fragen zur Passform? Schreib unserem Atelier jederzeit an <strong>${esc(exp.email)}</strong>${exp.phoneMorocco ? ` oder per WhatsApp an <strong>${esc(exp.phoneMorocco)}</strong>` : ''}. <strong>14-Tage-Retouren-Programm (Rücksendeadresse bei Standardgrößen):</strong> ${esc(exp.returnNameDe)}, ${esc(exp.returnStreetDe)}, ${esc(exp.returnCityZipDe)}.
        </div>
      </div>
      <script>setTimeout(function(){window.print()},350)</script>
      </body></html>`;

    const w = window.open('', '_blank', 'width=820,height=1050');
    if (!w) {
      setToastMsg('Pop-up blockiert – bitte Pop-ups für mrkshi.com erlauben.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const formatWhatsappHref = (phone: string, order: OrderRecord) => {
    const cleaned = phone.replace(/[^\d]/g, '');
    const msg = encodeURIComponent(
      `Hallo! Danke für deine MRKSHI Bestellung ${order.id} (${order.items
        .map((i) => `${i.name} · ${i.colorName} (${i.sizeLabel})`)
        .join(', ')}). Wir prüfen kurz deine Maße (${order.measurementsSummary || 'Standard'}) vor dem Zuschnitt in Marokko.`
    );
    return `https://wa.me/${cleaned}?text=${msg}`;
  };

  const formatWhatsappTrackingHref = (phone: string, order: OrderRecord) => {
    const cleaned = phone.replace(/[^\d]/g, '');
    const carrier = order.carrier || 'DHL';
    const trk = order.trackingNumber || '';
    const trackUrl = carrier.toLowerCase().includes('ups')
      ? `https://www.ups.com/track?tracknum=${encodeURIComponent(trk)}`
      : `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(trk)}`;
    const msg = encodeURIComponent(
      `Gute Nachrichten! Deine handgefertigte MRKSHI Lederjacke (${order.id}) ist unterwegs mit ${carrier}. Deine Sendungsnummer lautet: ${trk} — Live-Tracking: ${trackUrl}`
    );
    return `https://wa.me/${cleaned}?text=${msg}`;
  };

  const eventLabelMap: Record<string, string> = {
    page_view: '👁 Seitenaufruf',
    view_content: '🧥 Produkt angesehen',
    add_to_cart: '🛒 In den Warenkorb',
    initiate_checkout: '⚡ Checkout gestartet',
    purchase: '💰 Kauf bezahlt',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="MRKSHI Verkäufer-Dashboard"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[94vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col text-black"
      >
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/10 flex items-center justify-between gap-4 shrink-0">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-neutral-500">
              MRKSHI SELLER STUDIO · MRKSHI.COM
            </p>
            <h2 className="text-[20px] font-bold text-black font-masculine">
              Analyse, Produkt-Studio, Bestellungen, Zoll-Rechnung &amp; Logistik
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Gate */}
        {!token ? (
          <div className="p-8 max-w-md mx-auto w-full my-8">
            <div className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center text-black mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-[19px] font-bold text-black">
              {authMode === 'bootstrap'
                ? 'Admin-Passwort festlegen'
                : 'MRKSHI Verkäufer-Login'}
            </h3>
            <p className="mt-1.5 text-[13.5px] text-neutral-600">
              Gib dein Admin-Passwort ein, um Live-Analysen, Produktbilder, Lagerbestand,
              Zoll-Rechnungen und Paket-Zettel zu verwalten.
            </p>

            <form onSubmit={handleAuthSubmit} className="mt-5 space-y-3">
              <input
                type="password"
                required
                minLength={6}
                placeholder="Admin-Passwort…"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-black/20 text-[14px]"
              />
              {authError && <p className="text-[13px] text-red-700">{authError}</p>}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 rounded-lg bg-black text-white text-[14px] font-semibold hover:bg-neutral-800 cursor-pointer"
              >
                {authLoading ? 'Prüfe…' : 'Anmelden'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="px-5 sm:px-6 py-2.5 bg-neutral-50 border-b border-black/10 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              <div className="flex flex-wrap gap-1.5">
                {[
                  {
                    id: 'analytics' as const,
                    label: 'Live-Analyse',
                    icon: BarChart3,
                  },
                  {
                    id: 'orders' as const,
                    label: `Bestellungen (${adminState?.orders.length ?? 0})`,
                    icon: ShoppingCart,
                  },
                  {
                    id: 'logistics' as const,
                    label: 'Logistik & Zoll (SARL)',
                    icon: Truck,
                  },
                  {
                    id: 'products' as const,
                    label: `Produkt-Studio (${adminState?.products.length ?? 0})`,
                    icon: Package,
                  },
                  {
                    id: 'newsletter' as const,
                    label: `Newsletter (${adminState?.newsletter?.length ?? 0})`,
                    icon: Mail,
                  },
                  {
                    id: 'integrations' as const,
                    label: 'System & Pixel',
                    icon: Bell,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[12.5px] font-semibold cursor-pointer transition-colors ${
                        tab === item.id
                          ? 'bg-black text-white'
                          : 'bg-white text-neutral-700 hover:text-black border border-black/12'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    loadAdminState(token);
                    loadAnalytics(token, analyticsDays);
                  }}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-black/15 text-[12px] font-medium cursor-pointer hover:border-black"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Aktualisieren</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={busyAction === 'export-csv'}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-black/15 text-[12px] font-medium cursor-pointer hover:border-black"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Produkte CSV</span>
                </button>
              </div>
            </div>

            {toastMsg && (
              <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-[12.5px] text-emerald-900 flex items-center justify-between shrink-0">
                <span className="flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{toastMsg}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setToastMsg(null)}
                  className="text-emerald-800 hover:text-black text-[11px] underline cursor-pointer"
                >
                  Ausblenden
                </button>
              </div>
            )}

            {/* Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              {/* ================= TAB 1: LIVE ANALYTICS DASHBOARD ================= */}
              {tab === 'analytics' && (
                <div className="space-y-6">
                  {/* Top Filter Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      {[
                        { d: 1, label: 'Heute' },
                        { d: 7, label: '7 Tage' },
                        { d: 30, label: '30 Tage' },
                        { d: 0, label: 'Gesamt' },
                      ].map((opt) => (
                        <button
                          key={opt.d}
                          type="button"
                          onClick={() => setAnalyticsDays(opt.d)}
                          className={`h-8 px-3 rounded-lg text-[12px] font-bold cursor-pointer ${
                            analyticsDays === opt.d
                              ? 'bg-black text-white'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleExportAnalyticsJson}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-black/20 text-[12px] font-semibold hover:border-black cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Daten als JSON (für Tools/KI)</span>
                      </button>
                    </div>
                  </div>

                  {/* 6 KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3.5 rounded-xl border border-black/12 bg-white">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Besucher
                      </p>
                      <p className="mt-1 text-[24px] font-bold tabular-nums">
                        {analytics?.kpis.uniqueVisitors ?? 0}
                      </p>
                      <p className="text-[11px] text-neutral-500 tabular-nums">
                        {analytics?.kpis.pageViews ?? 0} Aufrufe
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-black/12 bg-white">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Produkt-Ansicht
                      </p>
                      <p className="mt-1 text-[24px] font-bold tabular-nums">
                        {analytics?.kpis.viewContent ?? 0}
                      </p>
                      <p className="text-[11px] text-neutral-500">ViewContent</p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-black/12 bg-white">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Warenkorb
                      </p>
                      <p className="mt-1 text-[24px] font-bold tabular-nums">
                        {analytics?.kpis.addToCart ?? 0}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                        {analytics?.kpis.atcRatePct ?? 0} % Rate
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-black/12 bg-white">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Checkouts
                      </p>
                      <p className="mt-1 text-[24px] font-bold tabular-nums">
                        {analytics?.kpis.initiateCheckout ?? 0}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                        {analytics?.kpis.checkoutRatePct ?? 0} % Rate
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border border-black/12 bg-white">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                        Käufe (Bezahlt)
                      </p>
                      <p className="mt-1 text-[24px] font-bold tabular-nums">
                        {analytics?.kpis.paidOrders ?? 0}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                        {analytics?.kpis.conversionRatePct ?? 0} % CR
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl border-2 border-black bg-black text-white">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
                        Umsatz
                      </p>
                      <p className="mt-1 text-[22px] font-bold tabular-nums">
                        {(analytics?.kpis.revenueEur ?? 0).toFixed(0)} €
                      </p>
                      <p className="text-[11px] text-white/75 tabular-nums">
                        Ø {(analytics?.kpis.aovEur ?? 0).toFixed(0)} € Warenkorb
                      </p>
                    </div>
                  </div>

                  {/* Funnel + Traffic Sources */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 p-4 rounded-xl border border-black/12 bg-white space-y-3">
                      <h3 className="text-[13.5px] font-bold uppercase tracking-wide">
                        Conversion-Trichter (Funnel)
                      </h3>
                      <div className="space-y-2.5">
                        {(analytics?.funnel ?? []).map((f) => (
                          <div key={f.step} className="space-y-1">
                            <div className="flex items-center justify-between text-[12.5px] tabular-nums">
                              <span className="font-semibold">{f.step}</span>
                              <span>
                                <strong>{f.count}</strong> ({f.pct} %)
                              </span>
                            </div>
                            <div className="h-2.5 rounded-full bg-neutral-100 overflow-hidden">
                              <div
                                className="h-full bg-black rounded-full transition-all duration-300"
                                style={{ width: `${Math.min(100, Math.max(f.count > 0 ? 4 : 0, f.pct))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-5 p-4 rounded-xl border border-black/12 bg-white space-y-4">
                      <div>
                        <h3 className="text-[13.5px] font-bold uppercase tracking-wide mb-2">
                          Traffic-Quellen (Herkunft)
                        </h3>
                        {!analytics || analytics.sources.length === 0 ? (
                          <p className="text-[12.5px] text-neutral-500">
                            Noch keine Sitzungen im gewählten Zeitraum.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {analytics.sources.slice(0, 6).map((s) => (
                              <div
                                key={s.source}
                                className="flex items-center justify-between text-[12.5px] py-1 border-b border-black/6 last:border-none"
                              >
                                <span className="font-medium">{s.source}</span>
                                <span className="font-bold tabular-nums">{s.visitors} Besucher</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[12.5px]">
                        <span className="text-neutral-600">Geräteverteilung:</span>
                        <span className="font-semibold tabular-nums">
                          📱 Mobil: {analytics?.devices.mobile ?? 0} · 💻 Desktop:{' '}
                          {analytics?.devices.desktop ?? 0}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Product Performance Table */}
                  <div className="p-4 rounded-xl border border-black/12 bg-white">
                    <h3 className="text-[13.5px] font-bold uppercase tracking-wide mb-3">
                      Performance pro Jacken-Modell
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[12.5px] border-collapse">
                        <thead>
                          <tr className="border-b border-black/15 text-neutral-500 uppercase text-[11px]">
                            <th className="py-2 pr-3">Modell</th>
                            <th className="py-2 px-2 text-right">Bestand</th>
                            <th className="py-2 px-2 text-right">Ansichten</th>
                            <th className="py-2 px-2 text-right">Warenkorb</th>
                            <th className="py-2 px-2 text-right">Checkouts</th>
                            <th className="py-2 px-2 text-right">Käufe</th>
                            <th className="py-2 pl-2 text-right">Umsatz</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/8 tabular-nums">
                          {(analytics?.topProducts ?? []).map((p) => (
                            <tr key={p.id} className="hover:bg-neutral-50">
                              <td className="py-2 pr-3 font-semibold">
                                {p.name}{' '}
                                {!p.active && (
                                  <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-neutral-200 rounded">
                                    Pausiert
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-right">
                                {p.stockTotal <= 0 ? (
                                  <span className="text-red-600 font-bold">Ausverkauft</span>
                                ) : (
                                  p.stockTotal
                                )}
                              </td>
                              <td className="py-2 px-2 text-right">{p.views}</td>
                              <td className="py-2 px-2 text-right font-medium">{p.carts}</td>
                              <td className="py-2 px-2 text-right">{p.checkouts}</td>
                              <td className="py-2 px-2 text-right font-bold">{p.purchases}</td>
                              <td className="py-2 pl-2 text-right font-bold">
                                {p.revenueEur.toFixed(0)} €
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 14-Day Trend + Recent Live Feed */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-7 p-4 rounded-xl border border-black/12 bg-white">
                      <h3 className="text-[13.5px] font-bold uppercase tracking-wide mb-3">
                        Letzte 14 Tage (Besucher & Warenkörbe)
                      </h3>
                      <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-[12px] tabular-nums">
                        {(analytics?.daily ?? [])
                          .slice()
                          .reverse()
                          .map((d) => (
                            <div
                              key={d.day}
                              className="flex items-center justify-between py-1 border-b border-black/6 last:border-none"
                            >
                              <span className="font-mono text-neutral-600">{d.day}</span>
                              <span>
                                <strong>{d.visitors}</strong> Besucher ·{' '}
                                <strong>{d.carts}</strong> WK · <strong>{d.checkouts}</strong>{' '}
                                Checkout ·{' '}
                                <strong className="text-emerald-700">
                                  {d.orders} Käufe ({d.revenueEur.toFixed(0)} €)
                                </strong>
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="lg:col-span-5 p-4 rounded-xl border border-black/12 bg-white">
                      <h3 className="text-[13.5px] font-bold uppercase tracking-wide mb-3">
                        Live-Aktivität im Shop
                      </h3>
                      {!analytics || analytics.recentEvents.length === 0 ? (
                        <p className="text-[12.5px] text-neutral-500">
                          Sobald Besucher im Shop klicken, siehst du jede Aktion hier live.
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 text-[12px]">
                          {analytics.recentEvents.map((ev, i) => (
                            <div
                              key={`${ev.ts}-${i}`}
                              className="py-1.5 border-b border-black/6 last:border-none flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold truncate">
                                  {eventLabelMap[ev.type] ?? ev.type}
                                  {ev.productName ? ` · ${ev.productName}` : ''}
                                </p>
                                <p className="text-[11px] text-neutral-500 truncate">
                                  {ev.source} · {ev.device === 'mobile' ? 'Mobil' : 'Desktop'}
                                  {ev.colorName ? ` · ${ev.colorName}` : ''}
                                </p>
                              </div>
                              <span className="text-[11px] font-mono text-neutral-500 shrink-0">
                                {new Date(ev.ts).toLocaleTimeString('de-DE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Developer / Automation Data API Info */}
                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-black/12 text-[12px] text-neutral-700 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>API für eigene Tools & n8n:</strong> Setze optional{' '}
                      <code className="font-mono bg-white px-1.5 py-0.5 border border-black/15">
                        ANALYTICS_API_KEY
                      </code>{' '}
                      in <code className="font-mono">.env</code> und rufe{' '}
                      <code className="font-mono">
                        https://mrkshi.com/api/admin/analytics?days=7&api_key=...
                      </code>{' '}
                      ab.
                    </span>
                  </div>
                </div>
              )}

              {/* ================= TAB 2: SMART PRODUCT STUDIO ================= */}
              {tab === 'products' && adminState && (
                <div className="space-y-4">
                  {/* Top Bar: Create Product + 1-EUR Live Test */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-7 p-4 rounded-xl border-2 border-black bg-white flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[14px] font-bold text-black">Neues Produkt einstellen</p>
                        <p className="text-[12px] text-neutral-600">
                          Foto direkt vom PC/Handy hochladen, Preis & Bestand setzen.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowNewProduct((v) => !v)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-black text-white text-[12.5px] font-bold cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{showNewProduct ? 'Schließen' : 'Neues Produkt'}</span>
                      </button>
                    </div>

                    <div className="lg:col-span-5 p-4 rounded-xl border border-black/15 bg-neutral-50 flex items-center justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <Smartphone className="w-4 h-4 text-black shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[12px] font-bold uppercase">1,00 € Live-Testmodus</p>
                          <p className="text-[11.5px] text-neutral-600">
                            {adminState.oneEuroTestProductId
                              ? `Aktiv auf „${adminState.oneEuroTestProductId}“`
                              : 'Ausgeschaltet (alle regulären Preise aktiv)'}
                          </p>
                        </div>
                      </div>
                      {adminState.oneEuroTestProductId && (
                        <button
                          type="button"
                          onClick={() => handleToggleOneEuroTest(null)}
                          className="h-8 px-3 rounded-lg bg-red-600 text-white text-[11.5px] font-bold uppercase cursor-pointer shrink-0"
                        >
                          Beenden
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Create New Product Form */}
                  {showNewProduct && (
                    <form
                      onSubmit={handleCreateProduct}
                      className="p-5 rounded-xl border-2 border-black bg-neutral-50 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-[12.5px]"
                    >
                      <label className="block sm:col-span-2">
                        <span className="font-bold">Produktname *</span>
                        <input
                          required
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          placeholder="z. B. Model Atlas"
                          className="mt-1 w-full h-10 px-3 rounded-lg border border-black/20 bg-white"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Lederart</span>
                        <select
                          value={newProduct.leatherType}
                          onChange={(e) =>
                            setNewProduct({
                              ...newProduct,
                              leatherType: e.target.value as JacketProduct['leatherType'],
                            })
                          }
                          className="mt-1 w-full h-10 px-3 rounded-lg border border-black/20 bg-white"
                        >
                          <option>Lamm-Nappa</option>
                          <option>Wildleder</option>
                          <option>Vollrind-Nappa</option>
                          <option>Rind-Wildleder</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="font-bold">Lagerbestand (0 = Ausverkauft)</span>
                        <input
                          type="number"
                          min={0}
                          value={newProduct.stockTotal}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, stockTotal: Number(e.target.value) })
                          }
                          className="mt-1 w-full h-10 px-3 rounded-lg border border-black/20 bg-white"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Verkaufspreis (€)</span>
                        <input
                          type="number"
                          min={1}
                          max={2999}
                          value={newProduct.priceEur}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, priceEur: Number(e.target.value) })
                          }
                          className="mt-1 w-full h-10 px-3 rounded-lg border border-black/20 bg-white"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Streichpreis / UVP (€)</span>
                        <input
                          type="number"
                          min={0}
                          max={5999}
                          value={newProduct.compareAtEur}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, compareAtEur: Number(e.target.value) })
                          }
                          className="mt-1 w-full h-10 px-3 rounded-lg border border-black/20 bg-white"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Erste Farbname</span>
                        <input
                          value={newProduct.colorName}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, colorName: e.target.value })
                          }
                          placeholder="z. B. Cognac"
                          className="mt-1 w-full h-10 px-3 rounded-lg border border-black/20 bg-white"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Farb-Punkt</span>
                        <input
                          type="color"
                          value={newProduct.colorHex}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, colorHex: e.target.value })
                          }
                          className="mt-1 w-full h-10 px-1 rounded-lg border border-black/20 bg-white"
                        />
                      </label>

                      <div className="sm:col-span-2 space-y-1.5">
                        <span className="font-bold block">Hauptbild (Datei hochladen oder URL)</span>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-black text-white text-[12px] font-bold cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{uploadingImage ? 'Lädt hoch…' : 'Foto vom Gerät wählen'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                const uploadedUrl = await uploadSingleFile(f);
                                if (uploadedUrl) {
                                  setNewProduct((prev) => ({ ...prev, imageUrl: uploadedUrl }));
                                }
                              }}
                            />
                          </label>
                          <input
                            value={newProduct.imageUrl}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, imageUrl: e.target.value })
                            }
                            placeholder="oder Bild-URL eintragen…"
                            className="flex-1 min-w-[200px] h-10 px-3 rounded-lg border border-black/20 bg-white"
                          />
                        </div>
                      </div>

                      <label className="block sm:col-span-2">
                        <span className="font-bold">Kurzbeschreibung</span>
                        <input
                          value={newProduct.tagline}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, tagline: e.target.value })
                          }
                          className="mt-1 w-full h-10 px-3 rounded-lg border border-black/20 bg-white"
                        />
                      </label>

                      <label className="block sm:col-span-2">
                        <span className="font-bold">Beschreibung</span>
                        <textarea
                          rows={2}
                          value={newProduct.description}
                          onChange={(e) =>
                            setNewProduct({ ...newProduct, description: e.target.value })
                          }
                          className="mt-1 w-full px-3 py-2 rounded-lg border border-black/20 bg-white"
                        />
                      </label>

                      <button
                        type="submit"
                        disabled={busyAction === 'create-product'}
                        className="sm:col-span-2 h-11 rounded-lg bg-[#16A34A] text-white font-bold text-[13.5px] cursor-pointer"
                      >
                        {busyAction === 'create-product'
                          ? 'Speichere…'
                          : 'Produkt speichern & live stellen'}
                      </button>
                    </form>
                  )}

                  {/* Product List + Expandable Smart Product Editor */}
                  <div className="space-y-3">
                    {adminState.products.map((prod, index) => {
                      const isOneEuro = adminState.oneEuroTestProductId === prod.id;
                      const isEditing = editingId === prod.id && draft !== null;
                      const isSoldOut = prod.stockTotal <= 0;

                      return (
                        <div
                          key={prod.id}
                          className={`rounded-xl border transition-colors ${
                            isEditing
                              ? 'border-2 border-black bg-white shadow-lg'
                              : 'border-black/12 bg-white'
                          }`}
                        >
                          {/* Compact Product Summary Row */}
                          <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Up / Down Sort Controls */}
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={index === 0 || busyAction === 'reorder-products'}
                                  onClick={() => handleMoveProductOrder(index, -1)}
                                  title="Nach oben schieben"
                                  className="w-6 h-6 rounded border border-black/15 flex items-center justify-center hover:border-black disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    index === adminState.products.length - 1 ||
                                    busyAction === 'reorder-products'
                                  }
                                  onClick={() => handleMoveProductOrder(index, 1)}
                                  title="Nach unten schieben"
                                  className="w-6 h-6 rounded border border-black/15 flex items-center justify-center hover:border-black disabled:opacity-30 cursor-pointer"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>

                              <img
                                src={prod.colors[0]?.image ?? prod.gallery[0]}
                                alt={prod.name}
                                className="w-13 h-15 rounded-lg object-contain bg-neutral-100 p-1 shrink-0 border border-black/10"
                              />

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-[11.5px] font-bold text-neutral-500">
                                    #{prod.code}
                                  </span>
                                  <h4 className="text-[15px] font-bold text-black truncate">
                                    {prod.name}
                                  </h4>
                                  <span className="text-[13px] font-bold tabular-nums">
                                    {prod.priceEur} €
                                  </span>
                                  {isSoldOut ? (
                                    <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[11px] font-bold uppercase">
                                      Ausverkauft (0)
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-semibold tabular-nums">
                                      Lager: {prod.stockTotal}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[12px] text-neutral-500 truncate">
                                  {prod.leatherType} · 1. Vordergrund-Farbe:{' '}
                                  <strong className="text-black">
                                    {prod.colors[0]?.name ?? '—'}
                                  </strong>{' '}
                                  · {prod.colors.length} Farben · {prod.gallery.length} Fotos
                                </p>
                                {prod.colors.length > 1 && (
                                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                                    <span className="text-[10.5px] font-bold uppercase text-neutral-500 mr-0.5">
                                      Vordergrund wählen:
                                    </span>
                                    {prod.colors.map((col, ci) => (
                                      <button
                                        key={`${col.id}-${ci}`}
                                        type="button"
                                        disabled={ci === 0 || busyAction === `prod-${prod.id}`}
                                        title={
                                          ci === 0
                                            ? `${col.name} ist aktuell 1. Vordergrund-Farbe`
                                            : `Klicken, um „${col.name}“ als 1. Vordergrund-Farbe nach vorne zu ziehen`
                                        }
                                        onClick={async () => {
                                          const reorderedColors = [
                                            col,
                                            ...prod.colors.filter((_, idx) => idx !== ci),
                                          ];
                                          const reorderedGallery = [
                                            col.image,
                                            ...prod.gallery.filter((u) => u !== col.image),
                                          ];
                                          const ok = await handleUpdateProduct(prod.id, {
                                            colors: reorderedColors,
                                            gallery: reorderedGallery,
                                          });
                                          if (ok && editingId === prod.id && draft) {
                                            setDraft({
                                              ...draft,
                                              colors: reorderedColors,
                                              gallery: reorderedGallery,
                                            });
                                          }
                                        }}
                                        className={`inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold border transition-all ${
                                          ci === 0
                                            ? 'bg-black text-white border-black cursor-default'
                                            : 'bg-white text-neutral-700 border-black/20 hover:border-black hover:text-black cursor-pointer'
                                        }`}
                                      >
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-white/50 shrink-0"
                                          style={{ backgroundColor: col.hex }}
                                        />
                                        <span>{col.name}</span>
                                        {ci === 0 && <span className="text-[9.5px]">★ #1</span>}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditor(prod)}
                                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold border cursor-pointer ${
                                  isEditing
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-black border-black hover:bg-black hover:text-white'
                                }`}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{isEditing ? 'Editor schließen' : 'Bearbeiten & Bilder'}</span>
                              </button>

                              {/* 1-Click Out of Stock / Restock toggle */}
                              <button
                                type="button"
                                disabled={busyAction === `prod-${prod.id}`}
                                onClick={() =>
                                  handleUpdateProduct(prod.id, {
                                    stockTotal: isSoldOut ? 50 : 0,
                                  })
                                }
                                className={`h-8 px-2.5 rounded-lg text-[11.5px] font-bold border cursor-pointer ${
                                  isSoldOut
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-white text-neutral-700 border-black/20 hover:border-red-500 hover:text-red-700'
                                }`}
                              >
                                {isSoldOut ? '+ Auf Lager (50)' : 'Auf Ausverkauft setzen'}
                              </button>

                              <button
                                type="button"
                                disabled={busyAction === 'one-euro-test'}
                                onClick={() => handleToggleOneEuroTest(isOneEuro ? null : prod.id)}
                                className={`h-8 px-2.5 rounded-lg text-[11.5px] font-bold border cursor-pointer ${
                                  isOneEuro
                                    ? 'bg-black text-white border-black'
                                    : 'bg-white text-neutral-700 border-black/20 hover:border-black'
                                }`}
                              >
                                {isOneEuro ? '1 € aktiv' : '1 € Test'}
                              </button>

                              <button
                                type="button"
                                disabled={busyAction === `prod-${prod.id}`}
                                onClick={() =>
                                  handleUpdateProduct(prod.id, { active: !prod.active })
                                }
                                className={`h-8 px-2.5 rounded-lg text-[11.5px] font-bold border cursor-pointer ${
                                  prod.active
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-neutral-100 text-neutral-600 border-black/15'
                                }`}
                              >
                                {prod.active ? 'Sichtbar' : 'Versteckt'}
                              </button>

                              <button
                                type="button"
                                aria-label="Produkt löschen"
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="h-8 w-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center justify-center cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* EXPANDED SMART PRODUCT STUDIO */}
                          {isEditing && draft && (
                            <div className="p-5 border-t border-black/12 bg-neutral-50/70 space-y-6">
                              {/* 1. Prices, Stock & Texts */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[12.5px]">
                                <label className="block sm:col-span-2">
                                  <span className="font-bold">Produktname</span>
                                  <input
                                    value={draft.name}
                                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                                    className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20 bg-white font-semibold"
                                  />
                                </label>

                                <label className="block">
                                  <span className="font-bold">Verkaufspreis (€)</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={2999}
                                    value={draft.priceEur}
                                    onChange={(e) =>
                                      setDraft({ ...draft, priceEur: Number(e.target.value) })
                                    }
                                    className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20 bg-white font-bold tabular-nums"
                                  />
                                </label>

                                <label className="block">
                                  <span className="font-bold">Streichpreis / UVP (€)</span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={5999}
                                    value={draft.compareAtEur}
                                    onChange={(e) =>
                                      setDraft({ ...draft, compareAtEur: Number(e.target.value) })
                                    }
                                    className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20 bg-white tabular-nums"
                                  />
                                </label>

                                <div className="sm:col-span-2">
                                  <span className="font-bold block">
                                    Lagerbestand (0 = Ausverkauft im Shop)
                                  </span>
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={99999}
                                      value={draft.stockTotal}
                                      onChange={(e) =>
                                        setDraft({
                                          ...draft,
                                          stockTotal: Math.max(0, Number(e.target.value)),
                                        })
                                      }
                                      className="w-28 h-9 px-3 rounded-lg border border-black/20 bg-white font-bold tabular-nums"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setDraft({ ...draft, stockTotal: 0 })}
                                      className="h-9 px-2.5 rounded-lg border border-red-300 bg-red-50 text-red-800 text-[11.5px] font-bold cursor-pointer"
                                    >
                                      Ausverkauft (0)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDraft({ ...draft, stockTotal: draft.stockTotal + 25 })
                                      }
                                      className="h-9 px-2.5 rounded-lg border border-black/20 bg-white text-[11.5px] font-semibold cursor-pointer"
                                    >
                                      +25
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDraft({ ...draft, stockTotal: draft.stockTotal + 100 })
                                      }
                                      className="h-9 px-2.5 rounded-lg border border-black/20 bg-white text-[11.5px] font-semibold cursor-pointer"
                                    >
                                      +100
                                    </button>
                                  </div>
                                </div>

                                <label className="block sm:col-span-2">
                                  <span className="font-bold">Lederart</span>
                                  <select
                                    value={draft.leatherType}
                                    onChange={(e) =>
                                      setDraft({
                                        ...draft,
                                        leatherType: e.target.value as JacketProduct['leatherType'],
                                      })
                                    }
                                    className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20 bg-white"
                                  >
                                    <option>Lamm-Nappa</option>
                                    <option>Wildleder</option>
                                    <option>Vollrind-Nappa</option>
                                    <option>Rind-Wildleder</option>
                                  </select>
                                </label>

                                <label className="block sm:col-span-4">
                                  <span className="font-bold">Kurzbeschreibung (Karte)</span>
                                  <input
                                    value={draft.tagline}
                                    onChange={(e) =>
                                      setDraft({ ...draft, tagline: e.target.value })
                                    }
                                    className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20 bg-white"
                                  />
                                </label>

                                <label className="block sm:col-span-4">
                                  <span className="font-bold">Detail-Beschreibung</span>
                                  <textarea
                                    rows={2}
                                    value={draft.description}
                                    onChange={(e) =>
                                      setDraft({ ...draft, description: e.target.value })
                                    }
                                    className="mt-1 w-full px-3 py-2 rounded-lg border border-black/20 bg-white"
                                  />
                                </label>
                              </div>

                              {/* 2. Gallery Manager: Upload, Add URL, Reorder & Delete */}
                              <div className="p-4 rounded-xl bg-white border border-black/15 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <h5 className="text-[13.5px] font-bold">
                                      Galerie-Bilder ({draft.gallery.length}) — Reihenfolge & Upload
                                    </h5>
                                    <p className="text-[11.5px] text-neutral-500">
                                      Bild #1 ist das Startbild. Mit Pfeilen sortieren, Stern setzt
                                      Bild auf Platz #1, Papierkorb löscht.
                                    </p>
                                  </div>

                                  <label className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-black text-white text-[12px] font-bold cursor-pointer">
                                    <ImagePlus className="w-4 h-4" />
                                    <span>
                                      {uploadingImage
                                        ? 'Komprimiere & lade hoch…'
                                        : 'Fotos hochladen (Mehrfachauswahl)'}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={async (e) => {
                                        const files = Array.from(e.target.files ?? []);
                                        if (files.length === 0) return;
                                        const uploaded: string[] = [];
                                        for (const f of files) {
                                          const u = await uploadSingleFile(f);
                                          if (u) uploaded.push(u);
                                        }
                                        if (uploaded.length > 0) {
                                          const nextGallery = [...uploaded, ...draft.gallery];
                                          const nextColors =
                                            draft.colors.length > 0
                                              ? [
                                                  { ...draft.colors[0], image: nextGallery[0] },
                                                  ...draft.colors.slice(1),
                                                ]
                                              : draft.colors;
                                          const nextDraft = {
                                            ...draft,
                                            gallery: nextGallery,
                                            colors: nextColors,
                                          };
                                          setDraft(nextDraft);
                                          // Immediately persist uploaded images live to storefront!
                                          await handleUpdateProduct(prod.id, nextDraft);
                                          setToastMsg(
                                            `${uploaded.length} Bild(er) hochgeladen & sofort live im Shop aktiviert!`
                                          );
                                        }
                                        e.target.value = '';
                                      }}
                                    />
                                  </label>
                                </div>

                                {/* Optional add by URL */}
                                <div className="flex gap-2">
                                  <input
                                    value={newImageUrlInput}
                                    onChange={(e) => setNewImageUrlInput(e.target.value)}
                                    placeholder="Oder Bild-URL einfügen (https://… oder /uploads/…)"
                                    className="flex-1 h-9 px-3 rounded-lg border border-black/20 text-[12.5px]"
                                  />
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const u = newImageUrlInput.trim();
                                      if (!u) return;
                                      const nextGallery = [u, ...draft.gallery];
                                      const nextColors =
                                        draft.colors.length > 0
                                          ? [
                                              { ...draft.colors[0], image: nextGallery[0] },
                                              ...draft.colors.slice(1),
                                            ]
                                          : draft.colors;
                                      const nextDraft = {
                                        ...draft,
                                        gallery: nextGallery,
                                        colors: nextColors,
                                      };
                                      setDraft(nextDraft);
                                      setNewImageUrlInput('');
                                      await handleUpdateProduct(prod.id, nextDraft);
                                    }}
                                    className="h-9 px-3.5 rounded-lg border border-black text-[12px] font-bold hover:bg-black hover:text-white cursor-pointer"
                                  >
                                    + Bild hinzufügen
                                  </button>
                                </div>

                                {/* Visual Sortable Image Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5 pt-1">
                                  {draft.gallery.map((imgUrl, gIdx) => (
                                    <div
                                      key={`${imgUrl}-${gIdx}`}
                                      className={`rounded-lg border p-1.5 bg-neutral-50 flex flex-col justify-between ${
                                        gIdx === 0 ? 'border-2 border-black' : 'border-black/15'
                                      }`}
                                    >
                                      <div className="relative aspect-square bg-white rounded overflow-hidden flex items-center justify-center">
                                        <img
                                          src={imgUrl}
                                          alt={`Bild ${gIdx + 1}`}
                                          className="w-full h-full object-contain"
                                        />
                                        <span className="absolute left-1 top-1 px-1.5 py-0.5 rounded bg-black/85 text-white font-mono text-[10px] font-bold">
                                          #{gIdx + 1}
                                        </span>
                                      </div>

                                      <div className="mt-1.5 flex items-center justify-between gap-1">
                                        <button
                                          type="button"
                                          disabled={gIdx === 0}
                                          title="Nach vorne"
                                          onClick={async () => {
                                            const next = [...draft.gallery];
                                            [next[gIdx - 1], next[gIdx]] = [
                                              next[gIdx],
                                              next[gIdx - 1],
                                            ];
                                            const nextColors =
                                              draft.colors.length > 0
                                                ? [
                                                    { ...draft.colors[0], image: next[0] },
                                                    ...draft.colors.slice(1),
                                                  ]
                                                : draft.colors;
                                            const nextDraft = {
                                              ...draft,
                                              gallery: next,
                                              colors: nextColors,
                                            };
                                            setDraft(nextDraft);
                                            await handleUpdateProduct(prod.id, nextDraft);
                                          }}
                                          className="h-6 flex-1 rounded bg-white border border-black/15 flex items-center justify-center hover:border-black disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowLeft className="w-3 h-3" />
                                        </button>

                                        <button
                                          type="button"
                                          disabled={gIdx === draft.gallery.length - 1}
                                          title="Nach hinten"
                                          onClick={async () => {
                                            const next = [...draft.gallery];
                                            [next[gIdx + 1], next[gIdx]] = [
                                              next[gIdx],
                                              next[gIdx + 1],
                                            ];
                                            const nextColors =
                                              draft.colors.length > 0
                                                ? [
                                                    { ...draft.colors[0], image: next[0] },
                                                    ...draft.colors.slice(1),
                                                  ]
                                                : draft.colors;
                                            const nextDraft = {
                                              ...draft,
                                              gallery: next,
                                              colors: nextColors,
                                            };
                                            setDraft(nextDraft);
                                            await handleUpdateProduct(prod.id, nextDraft);
                                          }}
                                          className="h-6 flex-1 rounded bg-white border border-black/15 flex items-center justify-center hover:border-black disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowRight className="w-3 h-3" />
                                        </button>

                                        {gIdx > 0 && (
                                          <button
                                            type="button"
                                            title="Als Hauptbild #1 setzen"
                                            onClick={async () => {
                                              const next = [...draft.gallery];
                                              const [picked] = next.splice(gIdx, 1);
                                              next.unshift(picked);
                                              const nextColors =
                                                draft.colors.length > 0
                                                  ? [
                                                      { ...draft.colors[0], image: next[0] },
                                                      ...draft.colors.slice(1),
                                                    ]
                                                  : draft.colors;
                                              const nextDraft = {
                                                ...draft,
                                                gallery: next,
                                                colors: nextColors,
                                              };
                                              setDraft(nextDraft);
                                              await handleUpdateProduct(prod.id, nextDraft);
                                            }}
                                            className="h-6 px-1.5 rounded bg-white border border-black/15 flex items-center justify-center hover:border-black cursor-pointer"
                                          >
                                            <Star className="w-3 h-3" />
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          disabled={draft.gallery.length <= 1}
                                          title="Bild löschen"
                                          onClick={async () => {
                                            const next = draft.gallery.filter(
                                              (_, idx) => idx !== gIdx
                                            );
                                            const nextColors = draft.colors.map((c, ci) =>
                                              ci === 0 || !next.includes(c.image)
                                                ? { ...c, image: next[0] }
                                                : c
                                            );
                                            const nextDraft = {
                                              ...draft,
                                              gallery: next,
                                              colors: nextColors,
                                            };
                                            setDraft(nextDraft);
                                            await handleUpdateProduct(prod.id, nextDraft);
                                          }}
                                          className="h-6 px-1.5 rounded bg-white border border-red-200 text-red-600 flex items-center justify-center hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 3. Color Variants Manager (Shopify-style Foreground #1 + Reorder) */}
                              <div className="p-4 rounded-xl bg-white border border-black/15 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <h5 className="text-[13.5px] font-bold">
                                      Farbvarianten ({draft.colors.length}) — Reihenfolge &
                                      Vordergrund-Farbe
                                    </h5>
                                    <p className="text-[11.5px] text-neutral-500">
                                      Farbe #1 wird im Shop als erste Vordergrund-Farbe & Titelbild
                                      angezeigt. Mit ★ oder Pfeilen sofort nach vorne ziehen.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDraft({
                                        ...draft,
                                        colors: [
                                          ...draft.colors,
                                          {
                                            id: `farbe-${Date.now().toString(36).slice(-4)}`,
                                            name: 'Neue Farbe',
                                            hex: '#46627F',
                                            image: draft.gallery[0] ?? '',
                                          },
                                        ],
                                      })
                                    }
                                    className="h-8 px-3 rounded-lg border border-black text-[12px] font-bold hover:bg-black hover:text-white cursor-pointer"
                                  >
                                    + Farbe hinzufügen
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  {draft.colors.map((c, cIdx) => (
                                    <div
                                      key={`${c.id}-${cIdx}`}
                                      className={`flex flex-wrap items-center gap-2 p-2.5 rounded-lg border text-[12px] ${
                                        cIdx === 0
                                          ? 'bg-neutral-100 border-2 border-black'
                                          : 'bg-neutral-50 border-black/10'
                                      }`}
                                    >
                                      {/* Up / Down Reorder Controls */}
                                      <div className="flex flex-col gap-0.5 shrink-0">
                                        <button
                                          type="button"
                                          disabled={cIdx === 0}
                                          title="Farbe nach oben schieben"
                                          onClick={async () => {
                                            const nextColors = [...draft.colors];
                                            [nextColors[cIdx - 1], nextColors[cIdx]] = [
                                              nextColors[cIdx],
                                              nextColors[cIdx - 1],
                                            ];
                                            const leadImg = nextColors[0].image;
                                            const nextGallery = leadImg
                                              ? [
                                                  leadImg,
                                                  ...draft.gallery.filter((u) => u !== leadImg),
                                                ]
                                              : draft.gallery;
                                            const nextDraft = {
                                              ...draft,
                                              colors: nextColors,
                                              gallery: nextGallery,
                                            };
                                            setDraft(nextDraft);
                                            await handleUpdateProduct(prod.id, nextDraft);
                                          }}
                                          className="w-6 h-5 rounded bg-white border border-black/15 flex items-center justify-center hover:border-black disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowUp className="w-3 h-3" />
                                        </button>
                                        <button
                                          type="button"
                                          disabled={cIdx === draft.colors.length - 1}
                                          title="Farbe nach unten schieben"
                                          onClick={async () => {
                                            const nextColors = [...draft.colors];
                                            [nextColors[cIdx + 1], nextColors[cIdx]] = [
                                              nextColors[cIdx],
                                              nextColors[cIdx + 1],
                                            ];
                                            const leadImg = nextColors[0].image;
                                            const nextGallery = leadImg
                                              ? [
                                                  leadImg,
                                                  ...draft.gallery.filter((u) => u !== leadImg),
                                                ]
                                              : draft.gallery;
                                            const nextDraft = {
                                              ...draft,
                                              colors: nextColors,
                                              gallery: nextGallery,
                                            };
                                            setDraft(nextDraft);
                                            await handleUpdateProduct(prod.id, nextDraft);
                                          }}
                                          className="w-6 h-5 rounded bg-white border border-black/15 flex items-center justify-center hover:border-black disabled:opacity-30 cursor-pointer"
                                        >
                                          <ArrowDown className="w-3 h-3" />
                                        </button>
                                      </div>

                                      <img
                                        src={c.image}
                                        alt={c.name}
                                        className="w-10 h-10 rounded object-contain bg-white border border-black/10 shrink-0"
                                      />

                                      {cIdx === 0 ? (
                                        <span className="px-2 py-1 rounded bg-black text-white text-[10.5px] font-bold uppercase tracking-wide shrink-0">
                                          ★ #1 Vordergrund
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          title="Als 1. Vordergrund-Farbe nach vorne ziehen"
                                          onClick={async () => {
                                            const nextColors = [
                                              c,
                                              ...draft.colors.filter((_, idx) => idx !== cIdx),
                                            ];
                                            const nextGallery = c.image
                                              ? [
                                                  c.image,
                                                  ...draft.gallery.filter((u) => u !== c.image),
                                                ]
                                              : draft.gallery;
                                            const nextDraft = {
                                              ...draft,
                                              colors: nextColors,
                                              gallery: nextGallery,
                                            };
                                            setDraft(nextDraft);
                                            await handleUpdateProduct(prod.id, nextDraft);
                                          }}
                                          className="h-7 px-2.5 rounded border border-black bg-white text-black text-[11px] font-bold hover:bg-black hover:text-white cursor-pointer shrink-0 inline-flex items-center gap-1"
                                        >
                                          <Star className="w-3 h-3" />
                                          <span>Als #1 setzen</span>
                                        </button>
                                      )}
                                      <input
                                        type="color"
                                        value={c.hex}
                                        onChange={(e) => {
                                          const next = [...draft.colors];
                                          next[cIdx] = { ...c, hex: e.target.value };
                                          setDraft({ ...draft, colors: next });
                                        }}
                                        className="w-9 h-8 p-0.5 rounded border border-black/20 bg-white cursor-pointer"
                                      />
                                      <input
                                        value={c.name}
                                        onChange={(e) => {
                                          const next = [...draft.colors];
                                          next[cIdx] = { ...c, name: e.target.value };
                                          setDraft({ ...draft, colors: next });
                                        }}
                                        placeholder="Farbname"
                                        className="w-36 h-8 px-2.5 rounded border border-black/20 bg-white font-semibold"
                                      />
                                      <select
                                        value={c.image}
                                        onChange={async (e) => {
                                          const chosen = e.target.value;
                                          const nextColors = [...draft.colors];
                                          nextColors[cIdx] = { ...c, image: chosen };
                                          const nextGallery =
                                            cIdx === 0
                                              ? [chosen, ...draft.gallery.filter((x) => x !== chosen)]
                                              : draft.gallery;
                                          const nextDraft = {
                                            ...draft,
                                            colors: nextColors,
                                            gallery: nextGallery,
                                          };
                                          setDraft(nextDraft);
                                          await handleUpdateProduct(prod.id, nextDraft);
                                        }}
                                        className="flex-1 min-w-[140px] h-8 px-2 rounded border border-black/20 bg-white text-[11.5px]"
                                      >
                                        {draft.gallery.map((gUrl, gi) => (
                                          <option key={`${gUrl}-${gi}`} value={gUrl}>
                                            Galerie-Bild #{gi + 1} ({gUrl.split('/').pop()?.slice(0, 22)})
                                          </option>
                                        ))}
                                        {!draft.gallery.includes(c.image) && (
                                          <option value={c.image}>Aktuelles Farb-Bild</option>
                                        )}
                                      </select>
                                      <label className="h-8 px-2.5 rounded border border-black/25 bg-white inline-flex items-center gap-1 font-semibold cursor-pointer hover:border-black">
                                        <Upload className="w-3 h-3" />
                                        <span>Foto</span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          className="hidden"
                                          onChange={async (e) => {
                                            const f = e.target.files?.[0];
                                            if (!f) return;
                                            const u = await uploadSingleFile(f);
                                            if (u) {
                                              const nextColors = [...draft.colors];
                                              nextColors[cIdx] = { ...c, image: u };
                                              const nextGallery =
                                                cIdx === 0
                                                  ? [u, ...draft.gallery]
                                                  : [...draft.gallery, u];
                                              const nextDraft = {
                                                ...draft,
                                                colors: nextColors,
                                                gallery: nextGallery,
                                              };
                                              setDraft(nextDraft);
                                              await handleUpdateProduct(prod.id, nextDraft);
                                            }
                                            e.target.value = '';
                                          }}
                                        />
                                      </label>
                                      <button
                                        type="button"
                                        disabled={draft.colors.length <= 1}
                                        onClick={() => {
                                          const next = draft.colors.filter((_, i) => i !== cIdx);
                                          setDraft({ ...draft, colors: next });
                                        }}
                                        className="h-8 w-8 rounded border border-red-200 text-red-600 inline-flex items-center justify-center hover:bg-red-50 disabled:opacity-30 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Save Bar */}
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(null);
                                    setDraft(null);
                                  }}
                                  className="h-10 px-4 rounded-lg border border-black/25 bg-white text-[13px] font-semibold cursor-pointer"
                                >
                                  Abbrechen
                                </button>
                                <button
                                  type="button"
                                  disabled={busyAction === `prod-${prod.id}`}
                                  onClick={async () => {
                                    const ok = await handleUpdateProduct(prod.id, draft);
                                    if (ok) {
                                      setEditingId(null);
                                      setDraft(null);
                                    }
                                  }}
                                  className="h-10 px-6 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[13.5px] font-bold cursor-pointer"
                                >
                                  {busyAction === `prod-${prod.id}`
                                    ? 'Speichert…'
                                    : '✓ Alle Änderungen live speichern'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ================= TAB 3: ORDERS, COMMERCIAL INVOICE & PARCEL LABELS ================= */}
              {tab === 'orders' && (
                <div className="space-y-4">
                  {/* Top Action Bar for Orders */}
                  <div className="p-3.5 rounded-xl bg-neutral-50 border border-black/12 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[14px] font-bold text-black">
                        Bestellungen, Zoll-Handelsrechnungen &amp; Paket-Aufkleber
                      </h4>
                      <p className="text-[12px] text-neutral-600">
                        Exporteur aktuell:{' '}
                        <strong>
                          {(adminState?.exporterSettings ?? exporterDraft).companyName}
                        </strong>{' '}
                        ({(adminState?.exporterSettings ?? exporterDraft).cityZip}) · Incoterms:{' '}
                        <strong>
                          {(adminState?.exporterSettings ?? exporterDraft).defaultIncoterms}
                        </strong>{' '}
                        · HS-Code:{' '}
                        <span className="font-mono">
                          {(adminState?.exporterSettings ?? exporterDraft).defaultHsCode}
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={busyAction === 'sync-stripe'}
                        onClick={handleSyncStripeOrders}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-black/20 text-[12px] font-semibold hover:border-black cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${busyAction === 'sync-stripe' ? 'animate-spin' : ''}`}
                        />
                        <span>Stripe-Zahlungen &amp; Adressen synchronisieren</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTab('logistics')}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-black text-white text-[12px] font-semibold hover:bg-neutral-800 cursor-pointer"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>SARL &amp; Online-Versand einrichten</span>
                      </button>
                    </div>
                  </div>

                  {!adminState || adminState.orders.length === 0 ? (
                    <div className="py-14 text-center text-neutral-500">
                      <p className="text-[15px] font-semibold text-black">
                        Noch keine Bestellungen eingegangen.
                      </p>
                    </div>
                  ) : (
                    adminState.orders.map((order) => {
                      const consignee = resolveConsignee(order);
                      const netEur = (Math.round(order.totalCents / 1.19) / 100)
                        .toFixed(2)
                        .replace('.', ',');
                      const fulfill = order.fulfillmentStatus ?? 'unfulfilled';
                      const isEditingThis = editingOrderId === order.id && orderEditDraft;

                      return (
                        <div
                          key={order.id}
                          className="p-4 rounded-xl border border-black/15 bg-white space-y-3 shadow-2xs"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[13.5px] font-bold text-black">
                                {order.id}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  order.status === 'paid'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {order.status === 'paid' ? '✓ Bezahlt (Stripe)' : '⏳ Offen'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                                  fulfill === 'shipped'
                                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                                    : fulfill === 'in_production'
                                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                                    : 'bg-neutral-100 text-neutral-700 border-black/10'
                                }`}
                              >
                                {fulfill === 'shipped'
                                  ? `📦 Versendet${order.trackingNumber ? ` (${order.trackingNumber})` : ''}`
                                  : fulfill === 'in_production'
                                  ? '✂️ Im Zuschnitt'
                                  : '📋 Versand offen'}
                              </span>
                              <span className="text-[11.5px] text-neutral-500">
                                {new Date(order.createdAt).toLocaleString('de-DE')}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[16px] font-bold tabular-nums text-black">
                                {(order.totalCents / 100).toFixed(2).replace('.', ',')} €
                              </span>
                              <span className="block text-[11px] text-emerald-800 font-semibold">
                                Zollwert Netto: {netEur} €
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
                            <div className="p-3 rounded-lg bg-neutral-50 space-y-1 border border-black/8">
                              <p>
                                <strong>Empfänger (Consignee):</strong>{' '}
                                <span
                                  className={
                                    consignee.hasFullAddress ? 'text-black font-semibold' : 'text-amber-700'
                                  }
                                >
                                  {consignee.name}
                                </span>
                              </p>
                              <p>
                                <strong>Lieferadresse:</strong>{' '}
                                {consignee.hasFullAddress ? (
                                  <span>
                                    {consignee.street}
                                    {consignee.line2 ? `, ${consignee.line2}` : ''},{' '}
                                    {consignee.zipCityCountry}
                                  </span>
                                ) : (
                                  <span className="text-amber-700">
                                    {order.shippingSummary ||
                                      'Noch nicht hinterlegt — „Stripe synchronisieren“ oder „Bearbeiten“ klicken'}
                                  </span>
                                )}
                              </p>
                              <p>
                                <strong>E-Mail:</strong> {consignee.email || '—'} ·{' '}
                                <strong>Tel/WA:</strong> {consignee.phone || '—'}
                              </p>
                              <p>
                                <strong>Maßchecker:</strong>{' '}
                                {order.measurementsSummary || 'Standardgröße (14 Tage Rückgabe)'}
                              </p>
                              {order.giftNote && (
                                <p>
                                  <strong>Notiz / Gutschein:</strong> {order.giftNote}
                                </p>
                              )}
                            </div>

                            <div className="p-3 rounded-lg bg-neutral-50 space-y-2 border border-black/8 flex flex-col justify-between">
                              <div className="space-y-1">
                                {order.items.map((item, idx) => (
                                  <p key={idx}>
                                    {item.quantity}× <strong>{item.name}</strong> — {item.colorName}{' '}
                                    · Gr. <strong>{item.sizeLabel}</strong>{' '}
                                    {item.customMeasure ? `(${item.customMeasure})` : ''}
                                  </p>
                                ))}
                              </div>

                              {/* Quick Fulfillment Switcher */}
                              <div className="pt-2 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
                                <span className="font-semibold text-neutral-600">
                                  Atelier-Status:
                                </span>
                                <div className="inline-flex rounded-lg border border-black/15 overflow-hidden bg-white">
                                  {(
                                    [
                                      { id: 'unfulfilled', label: 'Offen' },
                                      { id: 'in_production', label: 'Zuschnitt' },
                                      { id: 'shipped', label: 'Versendet' },
                                    ] as const
                                  ).map((st) => (
                                    <button
                                      key={st.id}
                                      type="button"
                                      disabled={busyAction === `fulfill-${order.id}`}
                                      onClick={() => handleQuickFulfillment(order.id, st.id)}
                                      className={`px-2.5 py-1 font-semibold cursor-pointer ${
                                        fulfill === st.id
                                          ? 'bg-black text-white'
                                          : 'text-neutral-700 hover:bg-neutral-100'
                                      }`}
                                    >
                                      {st.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Inline Order Address, Payment & Tracking Editor */}
                          {isEditingThis && (
                            <div className="p-4 rounded-xl bg-neutral-50 border-2 border-black space-y-3 text-[12.5px]">
                              <div className="flex items-center justify-between">
                                <h5 className="font-bold text-[13.5px]">
                                  Bestellung {order.id} — Empfängeradresse, Zahlungsstatus &amp;
                                  Sendungsnummer
                                </h5>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOrderId(null);
                                    setOrderEditDraft(null);
                                  }}
                                  className="text-neutral-500 hover:text-black cursor-pointer"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                <label className="block">
                                  <span className="font-bold">Empfänger Vor- &amp; Nachname</span>
                                  <input
                                    value={orderEditDraft.customerName}
                                    onChange={(e) =>
                                      setOrderEditDraft({
                                        ...orderEditDraft,
                                        customerName: e.target.value,
                                      })
                                    }
                                    placeholder="Max Mustermann"
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-bold">Straße &amp; Hausnummer</span>
                                  <input
                                    value={orderEditDraft.street}
                                    onChange={(e) =>
                                      setOrderEditDraft({
                                        ...orderEditDraft,
                                        street: e.target.value,
                                      })
                                    }
                                    placeholder="Musterstraße 12"
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-bold">Adresszusatz (optional)</span>
                                  <input
                                    value={orderEditDraft.line2}
                                    onChange={(e) =>
                                      setOrderEditDraft({
                                        ...orderEditDraft,
                                        line2: e.target.value,
                                      })
                                    }
                                    placeholder="Etage / c/o"
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-bold">PLZ</span>
                                  <input
                                    value={orderEditDraft.zip}
                                    onChange={(e) =>
                                      setOrderEditDraft({ ...orderEditDraft, zip: e.target.value })
                                    }
                                    placeholder="60311"
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-bold">Ort / Stadt</span>
                                  <input
                                    value={orderEditDraft.city}
                                    onChange={(e) =>
                                      setOrderEditDraft({ ...orderEditDraft, city: e.target.value })
                                    }
                                    placeholder="Frankfurt am Main"
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-bold">Land (Englisch für Zoll)</span>
                                  <select
                                    value={orderEditDraft.country}
                                    onChange={(e) =>
                                      setOrderEditDraft({
                                        ...orderEditDraft,
                                        country: e.target.value,
                                      })
                                    }
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  >
                                    <option value="Germany">Germany (Deutschland)</option>
                                    <option value="Austria">Austria (Österreich)</option>
                                    <option value="Switzerland">Switzerland (Schweiz)</option>
                                  </select>
                                </label>
                                <label className="block">
                                  <span className="font-bold">Telefon (wichtig für DHL/Zoll!)</span>
                                  <input
                                    value={orderEditDraft.whatsappNumber}
                                    onChange={(e) =>
                                      setOrderEditDraft({
                                        ...orderEditDraft,
                                        whatsappNumber: e.target.value,
                                      })
                                    }
                                    placeholder="+49 176 ..."
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-bold">E-Mail</span>
                                  <input
                                    value={orderEditDraft.customerEmail}
                                    onChange={(e) =>
                                      setOrderEditDraft({
                                        ...orderEditDraft,
                                        customerEmail: e.target.value,
                                      })
                                    }
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  />
                                </label>
                                <label className="block">
                                  <span className="font-bold">Zahlungsstatus (für Rechnung)</span>
                                  <select
                                    value={orderEditDraft.status}
                                    onChange={(e) =>
                                      setOrderEditDraft({
                                        ...orderEditDraft,
                                        status: e.target.value as OrderRecord['status'],
                                      })
                                    }
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  >
                                    <option value="paid">Bezahlt (Paid)</option>
                                    <option value="pending_payment">Offen (Pending)</option>
                                    <option value="cancelled">Storniert</option>
                                  </select>
                                </label>
                                <label className="block">
                                  <span className="font-bold">Versanddienstleister</span>
                                  <select
                                    value={orderEditDraft.carrier}
                                    onChange={(e) =>
                                      setOrderEditDraft({
                                        ...orderEditDraft,
                                        carrier: e.target.value,
                                      })
                                    }
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white"
                                  >
                                    <option value="DHL Express">DHL Express (Marokko → DE)</option>
                                    <option value="DHL Paket DE">
                                      DHL Paket DE (ab Hub Schöneck)
                                    </option>
                                    <option value="UPS Express">UPS Express</option>
                                    <option value="Chronopost / EMS">Chronopost / EMS</option>
                                  </select>
                                </label>
                                <label className="block sm:col-span-2">
                                  <span className="font-bold">
                                    Tracking-Nummer / AWB-Frachtbriefnummer
                                  </span>
                                  <input
                                    value={orderEditDraft.trackingNumber}
                                    onChange={(e) =>
                                      setOrderEditDraft({
                                        ...orderEditDraft,
                                        trackingNumber: e.target.value,
                                        fulfillmentStatus: e.target.value.trim()
                                          ? 'shipped'
                                          : orderEditDraft.fulfillmentStatus,
                                      })
                                    }
                                    placeholder="z. B. 1234567890 oder 00340434..."
                                    className="mt-1 w-full h-9 px-2.5 rounded border border-black/20 bg-white font-mono"
                                  />
                                </label>
                              </div>

                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingOrderId(null);
                                    setOrderEditDraft(null);
                                  }}
                                  className="h-9 px-3.5 rounded-lg border border-black/20 bg-white font-semibold cursor-pointer"
                                >
                                  Abbrechen
                                </button>
                                <button
                                  type="button"
                                  disabled={busyAction === `edit-ord-${order.id}`}
                                  onClick={() => handleSaveOrderEdit(order.id)}
                                  className="h-9 px-4 rounded-lg bg-[#16A34A] text-white font-bold cursor-pointer"
                                >
                                  ✓ Bestelldaten speichern
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Bottom Action Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px]">
                              <span
                                className={`px-2 py-0.5 rounded border ${
                                  order.n8nSent
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                    : 'bg-neutral-50 border-black/10 text-neutral-600'
                                }`}
                              >
                                n8n: {order.n8nSent ? 'Gesendet' : 'Ausstehend'}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyRecipient(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-black/15 bg-white hover:border-black font-medium cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Adresse kopieren</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openOrderEditor(order)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-black/15 bg-white hover:border-black font-medium cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Adresse &amp; Tracking bearbeiten</span>
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handlePrintInvoice(order)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-black text-white text-[12px] font-semibold hover:bg-neutral-800 cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Zoll- &amp; Kundenrechnung</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintShippingLabel(order)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border-2 border-black bg-white text-black text-[12px] font-bold hover:bg-neutral-100 cursor-pointer"
                              >
                                <Tag className="w-3.5 h-3.5" />
                                <span>Paket-Zettel &amp; Aufkleber</span>
                              </button>
                              {consignee.phone && order.trackingNumber && (
                                <a
                                  href={formatWhatsappTrackingHref(consignee.phone, order)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 text-white text-[12px] font-semibold"
                                >
                                  <Truck className="w-3.5 h-3.5" />
                                  <span>Tracking per WA</span>
                                </a>
                              )}
                              {consignee.phone && (
                                <a
                                  href={formatWhatsappHref(consignee.phone, order)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#25D366]/15 text-[#126E35] border border-[#25D366]/35 text-[12px] font-semibold"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  <span>WhatsApp</span>
                                </a>
                              )}
                              <button
                                type="button"
                                disabled={busyAction === `notify-${order.id}`}
                                onClick={() => handleNotifyOrder(order.id)}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-black/20 text-[12px] font-medium hover:border-black cursor-pointer"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>n8n</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ================= TAB 3B: LOGISTICS, CUSTOMS & SARL IN GRÜNDUNG ================= */}
              {tab === 'logistics' && (
                <div className="space-y-6">
                  {/* 1. Practical Playbook for SARL en cours de constitution + Online Postage */}
                  <div className="p-4 sm:p-5 rounded-xl bg-neutral-50 border-2 border-black space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded bg-black text-white text-[10.5px] font-bold uppercase tracking-wider">
                          SOFORT VERKAUFEN IN DER GRÜNDUNGSPHASE (SARL EN COURS DE CONSTITUTION)
                        </span>
                        <h3 className="mt-1.5 text-[17px] font-bold text-black">
                          So verschickt, frankiert &amp; verzollt ihr jetzt schon 100 % sauber —
                          bevor die finale ICE-Nummer da ist
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12.5px]">
                      <div className="p-3.5 rounded-xl bg-white border border-black/15 space-y-1.5">
                        <p className="font-bold text-black">
                          Option 1 · Direkt ab Casablanca mit bestehender ICE (echtes DDP)
                        </p>
                        <p className="text-neutral-700 leading-relaxed">
                          Solange die neue SARL <em>en cours de constitution</em> ist, verlangen DHL
                          Express &amp; UPS für ein <strong>DDP-Rechnungskonto</strong> eine aktive
                          ICE. Nutzt übergangsweise eure bestehende marokkanische Firma (z. B.{' '}
                          <span className="font-mono">marrakchi.shop</span>) oder den Gérant: unten
                          eintragen → <strong>Zollwert 148,74 € (&lt; 150 € = 0 % Zoll)</strong> →
                          Kunde zahlt 0 € an der Tür.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-white border border-black/15 space-y-1.5">
                        <p className="font-bold text-black">
                          Option 2 · Einzelpaket online buchen &amp; per Karte zahlen (MyDHL+ MA)
                        </p>
                        <p className="text-neutral-700 leading-relaxed">
                          Ohne Firmenkonto bucht ihr jedes Paket einzeln online auf{' '}
                          <strong>MyDHL+ Marokko</strong> oder <strong>UPS.ma</strong> (Bezahlung per
                          Kreditkarte, Label sofort ausdrucken). <strong>Wichtig:</strong> Ohne
                          DDP-Account verzollt der Kurier meist als <strong>DAP</strong> (0 % Zoll
                          dank Ursprungssatz, aber DHL zieht ~28,26 € Einfuhr-USt beim Empfänger ein
                          — könnt ihr dem Testkunden per PayPal/Stripe sofort erstatten).
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-300 space-y-1.5">
                        <p className="font-bold text-emerald-950">
                          Option 3 · Gründungs-Hack: Sammelbox nach 61137 Schöneck + DHL.de (6,19 €)
                        </p>
                        <p className="text-emerald-950/90 leading-relaxed">
                          Für eure ersten Meta-Ads-Testverkäufe: Schickt 5–10 Jacken gesammelt an
                          euren Standort <strong>Alte Dorfstraße 3a, 61137 Schöneck</strong> (1×
                          verzollen) und kauft pro Bestellung online auf <strong>DHL.de</strong>{' '}
                          eine 2-kg-Paketmarke (<strong>6,19 €</strong> per PayPal / Apple Pay,
                          sofort drucken &amp; aufkleben). Null Zollkontakt für deutsche Kunden!
                        </p>
                      </div>
                    </div>

                    {/* Direct 1-Click Online Franking Portals */}
                    <div className="pt-2 border-t border-black/10 flex flex-wrap items-center justify-between gap-2.5">
                      <span className="text-[12px] font-bold text-black">
                        Online Paketschein kaufen, bezahlen &amp; drucken:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <a
                          href="https://mydhl.express.dhl/ma/en/home.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#FFCC00] text-black text-[12px] font-bold border border-black/20 hover:brightness-95"
                        >
                          <span>MyDHL+ Marokko (Online buchen)</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href="https://www.ups.com/ma/en/Home.page"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#351C15] text-white text-[12px] font-bold hover:opacity-90"
                        >
                          <span>UPS Marokko Online</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href="https://www.dhl.de/de/privatkunden/pakete-versenden/online-frankieren.html"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-black text-white text-[12px] font-bold hover:bg-neutral-800"
                        >
                          <span>DHL.de Online-Frankierung (ab Schöneck · 6,19 €)</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* 2. Checklist: How to stick papers on the parcel */}
                  <div className="p-4 rounded-xl border border-black/15 bg-white text-[12.5px] space-y-2">
                    <h4 className="text-[14px] font-bold flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4" />
                      <span>
                        Checkliste beim Verpacken in Casablanca (damit kein Paket beim Zoll hängen
                        bleibt)
                      </span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-1">
                      <div className="p-2.5 rounded-lg bg-neutral-50 border border-black/10">
                        <strong>1. Paketschein aufkleben:</strong> Online bei MyDHL+ / UPS / DHL.de
                        bezahlen, als PDF drucken und oben flach aufs Paket kleben.
                      </div>
                      <div className="p-2.5 rounded-lg bg-neutral-50 border border-black/10">
                        <strong>2. 3× Handelsrechnung außen:</strong> Im Tab „Bestellungen“ auf{' '}
                        <em>Zoll- &amp; Kundenrechnung</em> klicken,{' '}
                        <strong>3× ausdrucken, unterschreiben/stempeln</strong> &amp; außen in eine
                        Dokumententasche kleben.
                      </div>
                      <div className="p-2.5 rounded-lg bg-neutral-50 border border-black/10">
                        <strong>3. Packzettel nach innen:</strong> Auf{' '}
                        <em>Paket-Zettel &amp; Aufkleber</em> klicken, unteren Lieferschein
                        abschneiden und zur Jacke ins Paket legen.
                      </div>
                      <div className="p-2.5 rounded-lg bg-neutral-50 border border-black/10">
                        <strong>4. Tracking senden:</strong> Sendungsnummer in der Bestellung
                        speichern → 1 Klick auf <em>Tracking per WA</em> informiert den Kunden.
                      </div>
                    </div>
                  </div>

                  {/* 3. Editable Exporter, SARL & Customs Settings Form */}
                  <form
                    onSubmit={handleSaveExporterSettings}
                    className="p-4 sm:p-5 rounded-xl border border-black/15 bg-white space-y-4"
                  >
                    <div>
                      <h4 className="text-[15px] font-bold text-black">
                        Verkäufer / Exporteur-Briefkopf &amp; Zoll-Stammdaten (erscheint oben rechts
                        auf jeder Rechnung &amp; im Impressum)
                      </h4>
                      <p className="text-[12px] text-neutral-600">
                        Wichtig: Oben rechts auf der Rechnung steht ausschließlich eure
                        marokkanische Einheit in Casablanca — <strong>niemals</strong> die deutsche
                        Adresse in Schöneck (diese erscheint nur unten als Retouren-Adresse).
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-[12.5px]">
                      <label className="block">
                        <span className="font-bold">Marokkanische Firma / Name der SARL</span>
                        <input
                          required
                          value={exporterDraft.companyName}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, companyName: e.target.value })
                          }
                          placeholder="z. B. MRKSHI SARL oder marrakchi.shop"
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Rechtsform / Gründungszusatz</span>
                        <input
                          value={exporterDraft.legalFormNote}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, legalFormNote: e.target.value })
                          }
                          placeholder="SARL en cours de constitution"
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">ICE-Nummer (oder Gründungsstatus)</span>
                        <input
                          value={exporterDraft.iceNumber}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, iceNumber: e.target.value })
                          }
                          placeholder="003... oder En cours d’attribution"
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20 font-mono"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Straße &amp; Hausnummer (Casablanca)</span>
                        <input
                          required
                          value={exporterDraft.street}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, street: e.target.value })
                          }
                          placeholder="Rue ..., Quartier Maarif"
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">PLZ &amp; Stadt (Marokko)</span>
                        <input
                          required
                          value={exporterDraft.cityZip}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, cityZip: e.target.value })
                          }
                          placeholder="20100 Casablanca"
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Ursprungsland (Englisch für Zoll)</span>
                        <input
                          required
                          value={exporterDraft.country}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, country: e.target.value })
                          }
                          placeholder="Morocco"
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">E-Mail auf Rechnung</span>
                        <input
                          type="email"
                          required
                          value={exporterDraft.email}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, email: e.target.value })
                          }
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Telefon Marokko (für Kurier-Abholung)</span>
                        <input
                          value={exporterDraft.phoneMorocco}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, phoneMorocco: e.target.value })
                          }
                          placeholder="+212 6 ..."
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Kundenservice / WhatsApp DE</span>
                        <input
                          value={exporterDraft.phoneSupportDe}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, phoneSupportDe: e.target.value })
                          }
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Zolltarifnummer (HS Code Lederbekleidung)</span>
                        <input
                          required
                          value={exporterDraft.defaultHsCode}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, defaultHsCode: e.target.value })
                          }
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20 font-mono"
                        />
                      </label>

                      <label className="block">
                        <span className="font-bold">Incoterms auf Handelsrechnung</span>
                        <select
                          value={exporterDraft.defaultIncoterms}
                          onChange={(e) =>
                            setExporterDraft({
                              ...exporterDraft,
                              defaultIncoterms: e.target.value as 'DDP' | 'DAP',
                            })
                          }
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20 bg-white"
                        >
                          <option value="DDP">DDP (Delivered Duty Paid — empfohlen)</option>
                          <option value="DAP">DAP (Delivered at Place — ohne DDP-Konto)</option>
                        </select>
                      </label>

                      <label className="block">
                        <span className="font-bold">Gewicht pro Jacke (kg) &amp; Paket-Absender</span>
                        <div className="mt-1 flex gap-2">
                          <input
                            type="number"
                            step="0.05"
                            min="0.3"
                            max="15"
                            value={exporterDraft.defaultWeightKg}
                            onChange={(e) =>
                              setExporterDraft({
                                ...exporterDraft,
                                defaultWeightKg: Number(e.target.value) || 1.35,
                              })
                            }
                            className="w-24 h-9 px-2.5 rounded-lg border border-black/20"
                          />
                          <select
                            value={exporterDraft.dispatchMode}
                            onChange={(e) =>
                              setExporterDraft({
                                ...exporterDraft,
                                dispatchMode: e.target.value as
                                  | 'casablanca_direct'
                                  | 'schoeneck_hub',
                              })
                            }
                            className="flex-1 h-9 px-2 rounded-lg border border-black/20 bg-white text-[11.5px]"
                          >
                            <option value="casablanca_direct">Direkt ab Casablanca</option>
                            <option value="schoeneck_hub">Ab Hub 61137 Schöneck</option>
                          </select>
                        </div>
                      </label>
                    </div>

                    <div className="pt-3 border-t border-black/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12.5px]">
                      <label className="block">
                        <span className="font-bold">Retouren-Empfänger Deutschland (nur Fußzeile)</span>
                        <input
                          value={exporterDraft.returnNameDe}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, returnNameDe: e.target.value })
                          }
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>
                      <label className="block">
                        <span className="font-bold">Retouren-Straße DE</span>
                        <input
                          value={exporterDraft.returnStreetDe}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, returnStreetDe: e.target.value })
                          }
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>
                      <label className="block">
                        <span className="font-bold">Retouren-PLZ &amp; Ort DE</span>
                        <input
                          value={exporterDraft.returnCityZipDe}
                          onChange={(e) =>
                            setExporterDraft({ ...exporterDraft, returnCityZipDe: e.target.value })
                          }
                          className="mt-1 w-full h-9 px-3 rounded-lg border border-black/20"
                        />
                      </label>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={busyAction === 'save-exporter'}
                        className="h-10 px-6 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[13.5px] font-bold cursor-pointer"
                      >
                        {busyAction === 'save-exporter'
                          ? 'Speichert…'
                          : '✓ Exporteur-, SARL- & Zoll-Stammdaten speichern'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* ================= TAB 4: NEWSLETTER ================= */}
              {tab === 'newsletter' && adminState && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[15px] font-bold text-black">
                        Newsletter & Treue-Club ({adminState.newsletter?.length ?? 0})
                      </h4>
                      <p className="text-[12.5px] text-neutral-600">
                        DSGVO-Opt-In + Gutschein TREUE10.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction === 'export-newsletter'}
                      onClick={handleExportNewsletterCsv}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-black text-white text-[12px] font-bold uppercase cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>CSV exportieren</span>
                    </button>
                  </div>

                  {!adminState.newsletter || adminState.newsletter.length === 0 ? (
                    <div className="py-10 text-center text-neutral-500 border border-black/10 rounded-xl">
                      Noch keine Newsletter-Anmeldungen vorhanden.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {adminState.newsletter.map((sub) => (
                        <div
                          key={sub.id}
                          className="p-3.5 border border-black/15 rounded-xl flex flex-wrap items-center justify-between gap-2 text-[13px]"
                        >
                          <div>
                            <p className="font-semibold text-black">{sub.email}</p>
                            <p className="text-[11.5px] text-neutral-600">
                              Farbe: {sub.preferredColor} · Code: {sub.voucherCode}
                            </p>
                          </div>
                          <span className="text-[11.5px] font-mono text-neutral-500">
                            {new Date(sub.createdAt).toLocaleString('de-DE')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ================= TAB 5: INTEGRATIONS & PIXEL ================= */}
              {tab === 'integrations' && adminState && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                      {
                        label: 'Stripe Checkout',
                        active: adminState.integrations.stripeConfigured,
                        hint: `Modus: ${adminState.integrations.stripeMode ?? 'unset'}`,
                      },
                      {
                        label: 'Stripe Webhook',
                        active: adminState.integrations.stripeWebhookConfigured,
                        hint: 'https://mrkshi.com/api/webhooks/stripe',
                      },
                      {
                        label: 'n8n & Telegram Automation',
                        active: adminState.integrations.n8nConfigured,
                        hint: 'N8N_WEBHOOK_URL verbunden',
                      },
                      {
                        label: 'Meta Pixel & CAPI',
                        active: Boolean(adminState.integrations.pixelId),
                        hint: `Pixel ${adminState.integrations.pixelId || 'fehlt'} · CAPI: ${
                          adminState.integrations.capiConfigured ? 'Aktiv' : 'Fehlt'
                        }`,
                      },
                      {
                        label: 'Cloudflare & SEO',
                        active: true,
                        hint: `${adminState.integrations.domain} · /sitemap.xml · /llms.txt`,
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className="p-4 rounded-xl border border-black/12 bg-neutral-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[13.5px] font-bold text-black">{card.label}</span>
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                              card.active
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-white text-neutral-600 border border-black/15'
                            }`}
                          >
                            {card.active ? 'Aktiv' : 'Offen'}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11.5px] font-mono text-neutral-600 break-all">
                          {card.hint}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl border border-black/12 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[14px] font-bold text-black flex items-center gap-1.5">
                        <Globe className="w-4 h-4" />
                        <span>Meta Pixel, CAPI & n8n Live-Test</span>
                      </h4>
                      <p className="text-[12.5px] text-neutral-600">
                        Pixel-Einstellungen anpassen oder Test-Event an n8n & Meta CAPI senden.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenPixelSettings(token)}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-black/25 text-[12.5px] font-semibold cursor-pointer hover:border-black"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Pixel & GA4 Einstellungen</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyAction === 'test-notify'}
                        onClick={handleTestIntegrations}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-black text-white text-[12.5px] font-semibold cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Test an n8n & Meta CAPI</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
