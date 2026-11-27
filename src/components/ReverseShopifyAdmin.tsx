import React, { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Check,
  Download,
  Globe,
  Lock,
  Mail,
  MessageCircle,
  Package,
  RefreshCw,
  Send,
  Settings,
  ShoppingCart,
  Smartphone,
  X,
} from 'lucide-react';
import { JacketProduct } from '../data/catalog';

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
  domain: string;
}

interface AdminStateResponse {
  products: JacketProduct[];
  orders: OrderRecord[];
  newsletter: NewsletterSubscriber[];
  oneEuroTestProductId: string | null;
  integrations: AdminIntegrationsStatus;
}

interface ReverseShopifyAdminProps {
  open: boolean;
  onClose: () => void;
  onCatalogUpdated: (nextProducts: JacketProduct[]) => void;
  onOpenPixelSettings: () => void;
}

export const ReverseShopifyAdmin: React.FC<ReverseShopifyAdminProps> = ({
  open,
  onClose,
  onCatalogUpdated,
  onOpenPixelSettings,
}) => {
  // Auth token strictly in React memory (never persisted to localStorage)
  const [token, setToken] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'checking' | 'bootstrap' | 'login'>('checking');
  const [passcodeInput, setPasscodeInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  const [tab, setTab] = useState<'orders' | 'products' | 'newsletter' | 'integrations'>('orders');
  const [adminState, setAdminState] = useState<AdminStateResponse | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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

  useEffect(() => {
    if (!open) return;
    if (!token) {
      fetchAuthStatus();
    } else {
      loadAdminState(token);
    }
  }, [open, token, fetchAuthStatus, loadAdminState]);

  if (!open) return null;

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
      await loadAdminState(data.token);
    } catch {
      setAuthError('Verbindungsfehler zum Server.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUpdateProduct = async (
    productId: string,
    patch: Partial<Pick<JacketProduct, 'priceEur' | 'stockTotal' | 'active'>>
  ) => {
    if (!token) return;
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
        return;
      }
      setAdminState((prev) => (prev ? { ...prev, products: data.products! } : prev));
      onCatalogUpdated(data.products);
      setToastMsg('Produkt in Reverse-Shopify aktualisiert.');
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
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mrkshi-reverse-shopify-9-products.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToastMsg('Shopify-CSV (9 Produkte) exportiert.');
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
            ? {
                ...prev,
                orders: prev.orders.map((o) => (o.id === orderId ? data.order! : o)),
              }
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

  const handleToggleOneEuroTest = async (productId: string | null) => {
    if (!token) return;
    setBusyAction('one-euro-test');
    setToastMsg(null);
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
        error?: string;
      };
      if (!res.ok) {
        setToastMsg(data.error ?? 'Testmodus konnte nicht umgeschaltet werden.');
        return;
      }
      setAdminState((prev) =>
        prev
          ? {
              ...prev,
              oneEuroTestProductId: data.oneEuroTestProductId ?? null,
            }
          : prev
      );
      if (data.products) {
        onCatalogUpdated(data.products);
      }
      setToastMsg(data.message ?? '1,00 € Live-Testmodus aktualisiert.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleExportNewsletterCsv = async () => {
    if (!token) return;
    setBusyAction('export-newsletter');
    try {
      const res = await fetch('/api/admin/export-newsletter-csv', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mrkshi-treue-newsletter.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setToastMsg('Newsletter & Treue-Abonnenten exportiert.');
    } finally {
      setBusyAction(null);
    }
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="MRKSHI Reverse-Shopify Verwaltung"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[92vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#000000]/10 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#4A4A4A]">
              MRKSHI Reverse-Shopify · mrkshi.com
            </p>
            <h2 className="text-[20px] font-semibold text-[#000000] font-masculine">
              Verwaltung, Bestellungen, n8n & Telegram
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="w-9 h-9 rounded-full hover:bg-[#FAFAFA] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth Gate */}
        {!token ? (
          <div className="p-8 max-w-md mx-auto w-full my-8">
            <div className="w-11 h-11 rounded-xl bg-[#FAFAFA] flex items-center justify-center text-[#000000] mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-[19px] font-semibold text-[#000000]">
              {authMode === 'bootstrap'
                ? 'Admin-Passwort festlegen (Ersteinrichtung)'
                : 'Reverse-Shopify Admin Login'}
            </h3>
            <p className="mt-1.5 text-[13.5px] text-[#4A4A4A]">
              {authMode === 'bootstrap'
                ? 'Lege jetzt dein persönliches Admin-Passwort fest (mind. 8 Zeichen). Dieses schützt Produkte, Preise, Bestellungen und WhatsApp-Kundendaten.'
                : 'Gib dein Admin-Passwort (oder ADMIN_PASSCODE aus den Secrets) ein, um Bestellungen & die 9 Produkte zu verwalten.'}
            </p>

            <form onSubmit={handleAuthSubmit} className="mt-5 space-y-3">
              <input
                type="password"
                required
                minLength={6}
                placeholder="Admin-Passwort eingeben…"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#000000]/20 text-[14px]"
              />
              {authError && <p className="text-[13px] text-red-700">{authError}</p>}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 rounded-lg bg-[#000000] text-white text-[14px] font-medium hover:bg-[#1A1A1A] cursor-pointer"
              >
                {authLoading
                  ? 'Prüfe…'
                  : authMode === 'bootstrap'
                  ? 'Passwort speichern & öffnen'
                  : 'Anmelden'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="px-6 py-2.5 bg-[#FAFAFA] border-b border-[#000000]/10 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-1.5">
                {[
                  {
                    id: 'orders' as const,
                    label: `Bestellungen (${adminState?.orders.length ?? 0})`,
                    icon: ShoppingCart,
                  },
                  {
                    id: 'products' as const,
                    label: `9 Produkte & 1-€ Test`,
                    icon: Package,
                  },
                  {
                    id: 'newsletter' as const,
                    label: `Newsletter (${adminState?.newsletter?.length ?? 0})`,
                    icon: Mail,
                  },
                  {
                    id: 'integrations' as const,
                    label: `Cloudflare, Stripe & n8n`,
                    icon: Bell,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setTab(item.id)}
                      className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium cursor-pointer transition-colors ${
                        tab === item.id
                          ? 'bg-[#000000] text-white'
                          : 'bg-white text-[#4A4A4A] hover:text-[#000000] border border-[#000000]/10'
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
                  onClick={() => loadAdminState(token)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-[#000000]/15 text-[12px] font-medium cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Aktualisieren</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={busyAction === 'export-csv'}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-white border border-[#000000]/15 text-[12px] font-medium cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Shopify-CSV Export</span>
                </button>
              </div>
            </div>

            {toastMsg && (
              <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-200 text-[12.5px] text-emerald-800 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{toastMsg}</span>
              </div>
            )}

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {tab === 'orders' && (
                <div className="space-y-4">
                  {(!adminState || adminState.orders.length === 0) ? (
                    <div className="py-14 text-center text-[#4A4A4A]">
                      <p className="text-[15px] font-medium text-[#000000]">
                        Noch keine Bestellungen eingegangen.
                      </p>
                      <p className="mt-1 text-[13px]">
                        Sobald ein Kunde über Stripe (oder den Vorschau-Test) kauft, erscheint die
                        Bestellung inkl. WhatsApp, Maßchecker & n8n/Telegram Status hier.
                      </p>
                    </div>
                  ) : (
                    adminState.orders.map((order) => (
                      <div
                        key={order.id}
                        className="p-4 rounded-xl border border-[#000000]/12 bg-white space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[13px] font-semibold text-[#000000]">
                              {order.id}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                                order.status === 'paid'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {order.status === 'paid' ? 'Bezahlt' : 'Offen (Stripe)'}
                            </span>
                            <span className="text-[11.5px] text-[#4A4A4A]">
                              {new Date(order.createdAt).toLocaleString('de-DE')}
                            </span>
                          </div>

                          <span className="text-[16px] font-semibold tabular-nums text-[#000000]">
                            {(order.totalCents / 100).toFixed(2).replace('.', ',')} €
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px]">
                          <div className="p-3 rounded-lg bg-[#FAFAFA] space-y-1">
                            <p>
                              <strong className="text-[#000000]">E-Mail:</strong>{' '}
                              {order.customerEmail}
                            </p>
                            <p>
                              <strong className="text-[#000000]">WhatsApp:</strong>{' '}
                              {order.whatsappNumber}
                            </p>
                            <p>
                              <strong className="text-[#000000]">Maßchecker:</strong>{' '}
                              {order.measurementsSummary || 'Standardgröße'}
                            </p>
                            {order.giftNote && (
                              <p>
                                <strong className="text-[#000000]">Notiz:</strong> {order.giftNote}
                              </p>
                            )}
                          </div>

                          <div className="p-3 rounded-lg bg-[#FAFAFA] space-y-1">
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
                                  : 'bg-[#FAFAFA] border-[#000000]/10 text-[#4A4A4A]'
                              }`}
                            >
                              n8n: {order.n8nSent ? 'Gesendet' : 'Ausstehend'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded border ${
                                order.telegramSent
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                  : 'bg-[#FAFAFA] border-[#000000]/10 text-[#4A4A4A]'
                              }`}
                            >
                              Telegram: {order.telegramSent ? 'Gesendet' : 'Ausstehend'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {order.whatsappNumber && (
                              <a
                                href={formatWhatsappHref(order.whatsappNumber, order)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#25D366]/15 text-[#126E35] border border-[#25D366]/35 text-[12px] font-medium"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                <span>WhatsApp öffnen</span>
                              </a>
                            )}
                            <button
                              type="button"
                              disabled={busyAction === `notify-${order.id}`}
                              onClick={() => handleNotifyOrder(order.id)}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#000000]/20 text-[12px] font-medium hover:border-[#000000] cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>n8n & Telegram senden</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {tab === 'products' && adminState && (
                <div className="space-y-3">
                  {/* 1-EUR Live Apple Pay / sk_live_ Verification Banner */}
                  <div className="p-4 border-2 border-black bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <Smartphone className="w-4 h-4 text-black shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[12.5px] font-bold uppercase text-black">
                          APPLE PAY / SK_LIVE 1,00 € LIVE-TESTMODUS
                        </p>
                        <p className="text-[12px] text-[#4A4A4A]">
                          {adminState.oneEuroTestProductId
                            ? `Aktiv auf „${adminState.oneEuroTestProductId}“ — Kundenpreis aktuell 1,00 € zum Live-Testen.`
                            : 'Wähle unten bei einem Modell „1 € Test“, um Stripe Live & Apple Pay real mit 1,00 € zu testen.'}
                        </p>
                      </div>
                    </div>
                    {adminState.oneEuroTestProductId && (
                      <button
                        type="button"
                        disabled={busyAction === 'one-euro-test'}
                        onClick={() => handleToggleOneEuroTest(null)}
                        className="h-8 px-3 bg-black text-white text-[12px] font-bold uppercase cursor-pointer"
                      >
                        1 € Test beenden
                      </button>
                    )}
                  </div>

                  {adminState.products.map((prod) => {
                    const isOneEuro = adminState.oneEuroTestProductId === prod.id;
                    return (
                      <div
                        key={prod.id}
                        className="p-4 rounded-xl border border-[#000000]/12 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          <img
                            src={prod.colors[0]?.image}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-14 rounded-lg object-contain bg-[#FAFAFA] p-1 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[11px] text-[#4A4A4A]">
                                {prod.code}
                              </span>
                              <h4 className="text-[15px] font-semibold text-[#000000]">
                                {prod.name}
                              </h4>
                            </div>
                            <p className="text-[12px] text-[#4A4A4A]">
                              {prod.leatherType} · {prod.colors.length} Farben · Handle:{' '}
                              <span className="font-mono">{prod.id}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <label className="text-[11.5px] text-[#4A4A4A]">
                            Preis (€ max 177)
                            <input
                              type="number"
                              min={49}
                              max={177}
                              defaultValue={prod.priceEur}
                              onBlur={(e) => {
                                const next = Math.min(177, Math.max(49, Number(e.target.value) || prod.priceEur));
                                if (next !== prod.priceEur) {
                                  handleUpdateProduct(prod.id, { priceEur: next });
                                }
                              }}
                              className="ml-1.5 w-16 h-8 px-2 rounded border border-[#000000]/20 text-[13px] font-medium text-[#000000] tabular-nums"
                            />
                          </label>

                          <label className="text-[11.5px] text-[#4A4A4A]">
                            Bestand
                            <input
                              type="number"
                              min={0}
                              max={99999}
                              defaultValue={prod.stockTotal}
                              onBlur={(e) => {
                                const next = Math.max(0, Number(e.target.value) || 0);
                                if (next !== prod.stockTotal) {
                                  handleUpdateProduct(prod.id, { stockTotal: next });
                                }
                              }}
                              className="ml-1.5 w-16 h-8 px-2 rounded border border-[#000000]/20 text-[13px] font-medium text-[#000000] tabular-nums"
                            />
                          </label>

                          <button
                            type="button"
                            disabled={busyAction === 'one-euro-test'}
                            onClick={() => handleToggleOneEuroTest(isOneEuro ? null : prod.id)}
                            className={`h-8 px-2.5 rounded-lg text-[11.5px] font-bold border cursor-pointer ${
                              isOneEuro
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-black border-black/25 hover:border-black'
                            }`}
                          >
                            {isOneEuro ? '1 € Test aktiv' : '1 € Test'}
                          </button>

                          <button
                            type="button"
                            disabled={busyAction === `prod-${prod.id}`}
                            onClick={() =>
                              handleUpdateProduct(prod.id, { active: !prod.active })
                            }
                            className={`h-8 px-3 rounded-lg text-[12px] font-medium border cursor-pointer ${
                              prod.active
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-[#FAFAFA] text-[#4A4A4A] border-[#000000]/15'
                            }`}
                          >
                            {prod.active ? 'Online' : 'Pausiert'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {tab === 'newsletter' && adminState && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[15px] font-semibold text-black">
                        Newsletter & Treue-Club Abonnenten ({adminState.newsletter?.length ?? 0})
                      </h4>
                      <p className="text-[12.5px] text-[#4A4A4A]">
                        Jeder Eintrag enthält DSGVO-Opt-In, Wunsch-Lederfarbe & Gutschein TREUE10.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={busyAction === 'export-newsletter'}
                      onClick={handleExportNewsletterCsv}
                      className="inline-flex items-center gap-1.5 h-9 px-3.5 border border-black bg-black text-white text-[12px] font-bold uppercase cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>E-Mail-Liste CSV exportieren</span>
                    </button>
                  </div>

                  {!adminState.newsletter || adminState.newsletter.length === 0 ? (
                    <div className="py-10 text-center text-[#4A4A4A] border border-black/10 rounded-xl">
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
                            <p className="text-[11.5px] text-[#4A4A4A]">
                              Farbe: {sub.preferredColor} · Code: {sub.voucherCode} · DSGVO:{' '}
                              {sub.consentAccepted ? 'Bestätigt' : 'Offen'}
                            </p>
                          </div>
                          <span className="text-[11.5px] font-mono text-[#4A4A4A]">
                            {new Date(sub.createdAt).toLocaleString('de-DE')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {tab === 'integrations' && adminState && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {[
                      {
                        label: 'Stripe Checkout',
                        active: adminState.integrations.stripeConfigured,
                        hint: `STRIPE_SECRET_KEY (${adminState.integrations.stripeMode ?? 'unset'})`,
                      },
                      {
                        label: 'Stripe Webhook',
                        active: adminState.integrations.stripeWebhookConfigured,
                        hint: 'https://www.mrkshi.com/api/webhooks/stripe',
                      },
                      {
                        label: 'n8n Automation',
                        active: adminState.integrations.n8nConfigured,
                        hint: 'Secret: N8N_WEBHOOK_URL',
                      },
                      {
                        label: 'Telegram Order Alerts',
                        active: adminState.integrations.telegramConfigured,
                        hint: 'Secrets: TELEGRAM_BOT_TOKEN & CHAT_ID',
                      },
                      {
                        label: 'Meta Pixel & CAPI',
                        active: true,
                        hint: `Pixel 1027857760085345 · CAPI: ${
                          adminState.integrations.capiConfigured ? 'Aktiv' : 'Optional'
                        }`,
                      },
                      {
                        label: 'Cloudflare & GEO/SEO',
                        active: true,
                        hint: `${adminState.integrations.domain} · /sitemap.xml · /llms.txt`,
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className="p-4 rounded-xl border border-[#000000]/12 bg-[#FAFAFA]/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[13.5px] font-semibold text-[#000000]">
                            {card.label}
                          </span>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                              card.active
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-white text-[#4A4A4A] border border-[#000000]/15'
                            }`}
                          >
                            {card.active ? 'Aktiv' : 'Secret fehlt'}
                          </span>
                        </div>
                        <p className="mt-1.5 text-[11.5px] font-mono text-[#4A4A4A] break-all">
                          {card.hint}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Cloudflare + www.mrkshi.com + Lovable Sidelink Continuity Panel */}
                  <div className="p-4 rounded-xl border-2 border-black bg-white space-y-2.5 text-[12.5px]">
                    <div className="flex items-center gap-2 font-bold uppercase tracking-[0.06em] text-black">
                      <Globe className="w-4 h-4" />
                      <span>CLOUDFLARE DNS & WWW.MRKSHI.COM VERBINDUNGS-STATUS</span>
                    </div>
                    <p className="text-[#4A4A4A] leading-[1.55]">
                      Da Stripe Checkout (<code className="font-mono">sk_live_...</code>), Telegram
                      und n8n geheim auf dem Node.js-Server laufen, verbinde{' '}
                      <strong>www.mrkshi.com</strong> in Cloudflare per Proxy-CNAME (Orange Cloud)
                      auf deine Server-URL oder Cloud Run Custom Domain Mapping.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11.5px] bg-[#FAFAFA] p-3 border border-black/10">
                      <div>Sitemap: https://www.mrkshi.com/sitemap.xml</div>
                      <div>GEO / AI Index: https://www.mrkshi.com/llms.txt</div>
                      <div>Robots: https://www.mrkshi.com/robots.txt</div>
                      <div>Stripe Webhook: https://www.mrkshi.com/api/webhooks/stripe</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[#000000]/12 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-[14px] font-semibold text-[#000000]">
                        n8n & Telegram Live-Verbindung prüfen
                      </h4>
                      <p className="text-[12.5px] text-[#4A4A4A]">
                        Sendet eine Test-Bestellung an deinen konfigurierten n8n Webhook &
                        Telegram Chat.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onOpenPixelSettings}
                        className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#000000]/20 text-[12.5px] font-medium cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Pixel & GA4 öffnen</span>
                      </button>
                      <button
                        type="button"
                        disabled={busyAction === 'test-notify'}
                        onClick={handleTestIntegrations}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#000000] text-white text-[12.5px] font-medium cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Test-Alert senden</span>
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
