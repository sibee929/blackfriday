import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BarChart3,
  Bell,
  Check,
  Download,
  Edit3,
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
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ColorOption, JacketProduct } from '../data/catalog';

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
  onOpenPixelSettings,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'checking' | 'bootstrap' | 'login'>('checking');
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [tab, setTab] = useState<'analytics' | 'orders' | 'products' | 'newsletter' | 'integrations'>('analytics');
  const [adminState, setAdminState] = useState<AdminStateResponse | null>(null);
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

  const handlePrintInvoice = (order: OrderRecord) => {
    const esc = (s: string) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const eur = (cents: number) => (cents / 100).toFixed(2).replace('.', ',') + ' €';
    const gross = order.totalCents;
    const net = Math.round(gross / 1.19);
    const vat = gross - net;
    const itemsSum = order.items.reduce((s, i) => s + i.unitAmountCents * i.quantity, 0);
    const discount = Math.max(0, itemsSum - gross);
    const date = new Date(order.paidAt ?? order.createdAt).toLocaleDateString('de-DE');
    const rows = order.items
      .map(
        (i, idx) => `<tr>
          <td>${idx + 1}</td>
          <td><strong>${esc(i.name)}</strong><br/><small>Farbe: ${esc(i.colorName)} · Größe: ${esc(
          i.sizeLabel
        )}${i.customMeasure ? ' · ' + esc(i.customMeasure) : ''}</small></td>
          <td class="r">${i.quantity}</td>
          <td class="r">${eur(i.unitAmountCents)}</td>
          <td class="r">${eur(i.unitAmountCents * i.quantity)}</td>
        </tr>`
      )
      .join('');

    const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"/>
      <title>Rechnung ${esc(order.id)}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:40px;font-size:13px}
        .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:18px}
        .brand{font-size:30px;font-weight:900;letter-spacing:.06em}
        h1{font-size:22px;margin:28px 0 6px} .muted{color:#555}
        .grid{display:flex;justify-content:space-between;margin-top:18px;gap:30px}
        table{width:100%;border-collapse:collapse;margin-top:24px}
        th{background:#000;color:#fff;text-align:left;padding:9px;font-size:12px}
        td{padding:9px;border-bottom:1px solid #ddd;vertical-align:top}
        .r{text-align:right} .tot td{border:none;padding:5px 9px}
        .grand td{font-size:16px;font-weight:900;border-top:2px solid #000}
        .foot{margin-top:40px;border-top:1px solid #ccc;padding-top:12px;font-size:11px;color:#555}
        @media print{body{padding:18mm} .noprint{display:none}}
      </style></head><body>
      <div class="noprint" style="text-align:right;margin-bottom:16px">
        <button onclick="window.print()" style="padding:10px 18px;background:#000;color:#fff;border:0;font-weight:700;cursor:pointer">Drucken / als PDF speichern</button>
      </div>
      <div class="top">
        <div><div class="brand">MRKSHI</div><div class="muted">Lederatelier · Marrakesch × Deutschland</div></div>
        <div class="r muted">MRKSHI Lederatelier<br/>Alte Dorfstraße 3a<br/>61137 Schöneck<br/>service@mrkshi.com<br/>+49 176 43488260</div>
      </div>
      <h1>Rechnung ${esc(order.id)}</h1>
      <div class="grid">
        <div><strong>Rechnung an:</strong><br/>${esc(order.customerEmail || 'Lt. Stripe-Beleg')}<br/>${esc(
      order.whatsappNumber || ''
    )}<br/><span class="muted">${esc(order.shippingSummary || 'Lieferadresse lt. Stripe-Checkout')}</span></div>
        <div class="r">
          <strong>Rechnungsdatum:</strong> ${date}<br/>
          <strong>Bestellnummer:</strong> ${esc(order.id)}<br/>
          <strong>Status:</strong> ${order.status === 'paid' ? 'Bezahlt' : 'Offen'}<br/>
          <strong>Zahlung:</strong> Stripe (${esc(order.mode)})
        </div>
      </div>
      <table>
        <thead><tr><th>#</th><th>Artikel</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Gesamt</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <table style="width:320px;margin-left:auto;margin-top:12px">
        <tr class="tot"><td>Zwischensumme</td><td class="r">${eur(itemsSum)}</td></tr>
        ${discount > 0 ? `<tr class="tot"><td>Rabatt</td><td class="r">-${eur(discount)}</td></tr>` : ''}
        <tr class="tot"><td>Versand (DHL Express)</td><td class="r">0,00 €</td></tr>
        <tr class="tot"><td>Netto</td><td class="r">${eur(net)}</td></tr>
        <tr class="tot"><td>zzgl. 19 % MwSt.</td><td class="r">${eur(vat)}</td></tr>
        <tr class="grand"><td>Gesamtbetrag</td><td class="r">${eur(gross)}</td></tr>
      </table>
      ${order.giftNote ? `<p class="muted" style="margin-top:20px"><strong>Hinweis:</strong> ${esc(order.giftNote)}</p>` : ''}
      <div class="foot">Vielen Dank für deinen Einkauf bei MRKSHI. Widerrufsrecht: 14 Tage ab Erhalt der Ware (Standardgrößen). Rücksendung an MRKSHI, Alte Dorfstraße 3a, 61137 Schöneck.</div>
      <script>setTimeout(function(){window.print()},400)</script>
      </body></html>`;

    const w = window.open('', '_blank', 'width=900,height=1100');
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
              Analyse, Produkt-Studio, Bestellungen & Rechnungen
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
              Gib dein Admin-Passwort ein, um Live-Analysen, Produktbilder, Lagerbestand und
              Rechnungen zu verwalten.
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
                    id: 'products' as const,
                    label: `Produkt-Studio (${adminState?.products.length ?? 0})`,
                    icon: Package,
                  },
                  {
                    id: 'orders' as const,
                    label: `Bestellungen (${adminState?.orders.length ?? 0})`,
                    icon: ShoppingCart,
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
                                  {prod.leatherType} · {prod.colors.length} Farben ·{' '}
                                  {prod.gallery.length} Galerie-Fotos
                                </p>
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

                              {/* 3. Color Variants Manager */}
                              <div className="p-4 rounded-xl bg-white border border-black/15 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-[13.5px] font-bold">
                                    Farbvarianten ({draft.colors.length})
                                  </h5>
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
                                      className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-neutral-50 border border-black/10 text-[12px]"
                                    >
                                      <img
                                        src={c.image}
                                        alt={c.name}
                                        className="w-10 h-10 rounded object-contain bg-white border border-black/10 shrink-0"
                                      />
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

              {/* ================= TAB 3: ORDERS & INVOICES ================= */}
              {tab === 'orders' && (
                <div className="space-y-4">
                  {!adminState || adminState.orders.length === 0 ? (
                    <div className="py-14 text-center text-neutral-500">
                      <p className="text-[15px] font-semibold text-black">
                        Noch keine Bestellungen eingegangen.
                      </p>
                    </div>
                  ) : (
                    adminState.orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-xl border border-black/12 bg-white space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[13px] font-bold text-black">
                              {order.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                                order.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {order.status === 'paid' ? 'Bezahlt' : 'Offen (Stripe)'}
                            </span>
                            <span className="text-[11.5px] text-neutral-500">
                              {new Date(order.createdAt).toLocaleString('de-DE')}
                            </span>
                          </div>

                          <span className="text-[16px] font-bold tabular-nums text-black">
                            {(order.totalCents / 100).toFixed(2).replace('.', ',')} €
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
                          <div className="p-3 rounded-lg bg-neutral-50 space-y-1">
                            <p>
                              <strong>E-Mail:</strong>{' '}
                              {order.customerEmail || 'Wird über Stripe erfasst'}
                            </p>
                            <p>
                              <strong>Telefon / WhatsApp:</strong>{' '}
                              {order.whatsappNumber || 'Lt. Stripe Checkout'}
                            </p>
                            {order.shippingSummary && (
                              <p>
                                <strong>Lieferadresse:</strong> {order.shippingSummary}
                              </p>
                            )}
                            <p>
                              <strong>Maßchecker:</strong>{' '}
                              {order.measurementsSummary || 'Standardgröße'}
                            </p>
                            {order.giftNote && (
                              <p>
                                <strong>Notiz:</strong> {order.giftNote}
                              </p>
                            )}
                          </div>

                          <div className="p-3 rounded-lg bg-neutral-50 space-y-1">
                            {order.items.map((item, idx) => (
                              <p key={idx}>
                                {item.quantity}× <strong>{item.name}</strong> — {item.colorName} ·{' '}
                                {item.sizeLabel}{' '}
                                {item.customMeasure ? `(${item.customMeasure})` : ''}
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2 text-[11.5px]">
                            <span
                              className={`px-2 py-0.5 rounded border ${
                                order.n8nSent
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-neutral-50 border-black/10 text-neutral-600'
                              }`}
                            >
                              n8n: {order.n8nSent ? 'Gesendet' : 'Ausstehend'}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handlePrintInvoice(order)}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-black text-white text-[12px] font-semibold hover:bg-neutral-800 cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Rechnung drucken</span>
                            </button>
                            {order.whatsappNumber && (
                              <a
                                href={formatWhatsappHref(order.whatsappNumber, order)}
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
                              <span>An n8n senden</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
