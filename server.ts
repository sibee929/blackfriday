import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import Stripe from 'stripe';
import { INITIAL_EIGHT_PRODUCTS, type JacketProduct } from './src/data/catalog.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.resolve(DATA_DIR, 'store-state.json');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const ANALYTICS_FILE = path.resolve(DATA_DIR, 'analytics.json');

interface StoreAnalyticsEvent {
  ts: number;
  day: string;
  sid: string;
  type: 'page_view' | 'view_content' | 'add_to_cart' | 'initiate_checkout' | 'purchase';
  source: string;
  device: 'mobile' | 'desktop';
  productId?: string;
  productName?: string;
  colorName?: string;
  valueEur?: number;
  orderId?: string;
}

interface AnalyticsStore {
  events: StoreAnalyticsEvent[];
}

function loadAnalyticsStore(): AnalyticsStore {
  try {
    if (!fs.existsSync(ANALYTICS_FILE)) return { events: [] };
    const parsed = JSON.parse(fs.readFileSync(ANALYTICS_FILE, 'utf8')) as Partial<AnalyticsStore>;
    return { events: Array.isArray(parsed.events) ? parsed.events.slice(-30000) : [] };
  } catch {
    return { events: [] };
  }
}

let analyticsStore: AnalyticsStore = loadAnalyticsStore();
let analyticsSaveTimer: NodeJS.Timeout | null = null;

function flushAnalyticsStore(): void {
  if (analyticsSaveTimer) {
    clearTimeout(analyticsSaveTimer);
    analyticsSaveTimer = null;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (analyticsStore.events.length > 30000) {
      analyticsStore.events = analyticsStore.events.slice(-30000);
    }
    fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analyticsStore), 'utf8');
  } catch (err) {
    console.error('Persist analytics error:', err);
  }
}

function scheduleAnalyticsSave(immediate = false): void {
  if (immediate) {
    flushAnalyticsStore();
    return;
  }
  if (analyticsSaveTimer) return;
  analyticsSaveTimer = setTimeout(flushAnalyticsStore, 2500);
}

interface PixelConfigState {
  pixelId: string;
  enabled: boolean;
  testEventCode: string;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  ga4MeasurementId: string;
  gtmId: string;
  tiktokPixelId: string;
}

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

interface OrderShippingAddress {
  name: string;
  street: string;
  line2?: string;
  zip: string;
  city: string;
  country: string;
  phone?: string;
}

interface ExporterSettings {
  companyName: string;
  legalFormNote: string;
  street: string;
  cityZip: string;
  country: string;
  iceNumber: string;
  email: string;
  phoneMorocco: string;
  phoneSupportDe: string;
  returnNameDe: string;
  returnStreetDe: string;
  returnCityZipDe: string;
  defaultHsCode: string;
  defaultIncoterms: 'DDP' | 'DAP';
  defaultWeightKg: number;
  dispatchMode: 'casablanca_direct' | 'schoeneck_hub';
}

interface CloudflareEmailConfig {
  accountId: string;
  apiToken: string;
  fromAddress: string;
  fromName: string;
  autoOrderConfirmation: boolean;
  autoTrackingEmail: boolean;
  autoVoucherWelcome: boolean;
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
  emailSent?: boolean;
  trackingEmailSent?: boolean;
  capiSent?: boolean;
  inventoryDecremented: boolean;
  shippingSummary?: string;
  shippingAddress?: OrderShippingAddress;
  fulfillmentStatus?: 'unfulfilled' | 'in_production' | 'shipped';
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  createdAt: string;
  paidAt?: string;
}

interface DropWaitlistEntry {
  productId: string;
  colorName: string;
  email: string;
  createdAt: string;
}

interface NewsletterSubscriber {
  id: string;
  email: string;
  preferredColor: string;
  voucherCode: string;
  consentAccepted: boolean;
  createdAt: string;
}

interface StoreState {
  products: JacketProduct[];
  orders: OrderRecord[];
  waitlist: DropWaitlistEntry[];
  newsletter: NewsletterSubscriber[];
  oneEuroTestProductId: string | null;
  pixelConfig: PixelConfigState;
  exporterSettings: ExporterSettings;
  cloudflareEmail: CloudflareEmailConfig;
  adminPasswordHash: string | null;
  orderCounter: number;
}

function cleanEnvSecret(val: string | undefined): string {
  const trimmed = (val ?? '').trim();
  if (!trimmed || trimmed.includes('HIER_EINTRAGEN') || trimmed === 'MY_GEMINI_API_KEY') {
    return '';
  }
  return trimmed;
}

const LEGACY_TEMPLATE_PIXEL_ID = '1027857760085345';
const initialPixelId = cleanEnvSecret(process.env.META_PIXEL_ID);
const initialGa4 = (process.env.GA4_MEASUREMENT_ID ?? '').trim();
const initialGtm = (process.env.GTM_ID ?? '').trim();
const initialTiktok = (process.env.TIKTOK_PIXEL_ID ?? '').trim();

function createDefaultExporterSettings(): ExporterSettings {
  return {
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
}

function createDefaultState(): StoreState {
  return {
    products: JSON.parse(JSON.stringify(INITIAL_EIGHT_PRODUCTS)) as JacketProduct[],
    orders: [],
    waitlist: [],
    newsletter: [],
    oneEuroTestProductId: null,
    pixelConfig: {
      pixelId: /^\d{10,20}$/.test(initialPixelId) ? initialPixelId : '',
      enabled: true,
      testEventCode: '',
      trackViewContent: true,
      trackAddToCart: true,
      trackInitiateCheckout: true,
      trackPurchase: true,
      ga4MeasurementId: /^G-[A-Z0-9]{6,14}$/i.test(initialGa4) ? initialGa4.toUpperCase() : '',
      gtmId: /^(GTM-[A-Z0-9]{5,10}|AW-\d{6,14})$/i.test(initialGtm) ? initialGtm.toUpperCase() : '',
      tiktokPixelId: /^[A-Z0-9]{10,28}$/i.test(initialTiktok) ? initialTiktok : '',
    },
    exporterSettings: createDefaultExporterSettings(),
    cloudflareEmail: {
      accountId: cleanEnvSecret(process.env.CLOUDFLARE_ACCOUNT_ID),
      apiToken:
        cleanEnvSecret(process.env.CLOUDFLARE_EMAIL_API_TOKEN) ||
        cleanEnvSecret(process.env.CLOUDFLARE_API_TOKEN),
      fromAddress: cleanEnvSecret(process.env.CLOUDFLARE_EMAIL_FROM) || 'service@mrkshi.com',
      fromName: 'MRKSHI Atelier',
      autoOrderConfirmation: true,
      autoTrackingEmail: true,
      autoVoucherWelcome: true,
    },
    adminPasswordHash: null,
    orderCounter: 1001,
  };
}

function loadStoreState(): StoreState {
  try {
    if (!fs.existsSync(STATE_FILE)) {
      return createDefaultState();
    }
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    const defaults = createDefaultState();

    // Preserve admin-edited products (gallery order, colors, prices, stock, names & product order)
    // while upgrading any legacy dead cdn.shopify.com or .png aistudio links to clean defaults.
    const savedList = Array.isArray(parsed.products) ? parsed.products : [];
    const defaultById = new Map(defaults.products.map((p) => [p.id, p]));
    const hasLegacyUrl = (u: string) =>
      !u || u.includes('cdn.shopify.com') || (u.startsWith('/assets/aistudio/') && u.endsWith('.png'));

    let mergedProducts: JacketProduct[];
    if (savedList.length > 0) {
      const seenIds = new Set<string>();
      mergedProducts = [];
      for (const saved of savedList) {
        if (!saved || typeof saved.id !== 'string') continue;
        seenIds.add(saved.id);
        const defProd = defaultById.get(saved.id);
        if (!defProd) {
          mergedProducts.push(saved);
          continue;
        }
        const savedGalleryClean =
          Array.isArray(saved.gallery) &&
          saved.gallery.length > 0 &&
          !saved.gallery.some(hasLegacyUrl);
        const savedColorsClean =
          Array.isArray(saved.colors) &&
          saved.colors.length > 0 &&
          !saved.colors.some((c) => hasLegacyUrl(c.image));

        mergedProducts.push({
          ...defProd,
          name: typeof saved.name === 'string' && saved.name.trim() ? saved.name : defProd.name,
          subtitle:
            typeof saved.subtitle === 'string' && saved.subtitle.trim()
              ? saved.subtitle
              : defProd.subtitle,
          leatherType: saved.leatherType ?? defProd.leatherType,
          tagline:
            typeof saved.tagline === 'string' && saved.tagline.trim()
              ? saved.tagline
              : defProd.tagline,
          description:
            typeof saved.description === 'string' && saved.description.trim()
              ? saved.description
              : defProd.description,
          priceEur:
            typeof saved.priceEur === 'number' && saved.priceEur >= 1 && saved.priceEur <= 2999
              ? saved.priceEur
              : defProd.priceEur,
          compareAtEur:
            typeof saved.compareAtEur === 'number' && saved.compareAtEur >= 0
              ? saved.compareAtEur
              : defProd.compareAtEur,
          gallery: savedGalleryClean ? saved.gallery : defProd.gallery,
          colors: savedColorsClean
            ? saved.colors.map((sc) => {
                const defColor = defProd.colors.find(
                  (dc) => dc.id === sc.id || dc.name.toLowerCase() === sc.name.toLowerCase()
                );
                return {
                  ...sc,
                  outOfStock:
                    typeof sc.outOfStock === 'boolean'
                      ? sc.outOfStock
                      : Boolean(defColor?.outOfStock),
                };
              })
            : defProd.colors,
          stockTotal: typeof saved.stockTotal === 'number' ? saved.stockTotal : defProd.stockTotal,
          active: typeof saved.active === 'boolean' ? saved.active : defProd.active,
        });
      }
      for (const defProd of defaults.products) {
        if (!seenIds.has(defProd.id)) {
          mergedProducts.push(defProd);
        }
      }
      mergedProducts = mergedProducts.map((p, idx) => ({
        ...p,
        code: String(idx + 1).padStart(2, '0'),
      }));
    } else {
      mergedProducts = defaults.products;
    }

    const savedPixel = parsed.pixelConfig ?? ({} as Partial<PixelConfigState>);
    const envPixel = cleanEnvSecret(process.env.META_PIXEL_ID);
    const hasCustomEnvPixel = /^\d{10,20}$/.test(envPixel);
    const savedId = typeof savedPixel.pixelId === 'string' ? savedPixel.pixelId.trim() : '';
    const resolvedPixelId = hasCustomEnvPixel
      ? envPixel
      : /^\d{10,20}$/.test(savedId) && savedId !== LEGACY_TEMPLATE_PIXEL_ID
      ? savedId
      : defaults.pixelConfig.pixelId;

    return {
      products: mergedProducts,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      waitlist: Array.isArray(parsed.waitlist) ? parsed.waitlist : [],
      newsletter: Array.isArray(parsed.newsletter) ? parsed.newsletter : [],
      oneEuroTestProductId:
        typeof parsed.oneEuroTestProductId === 'string' ? parsed.oneEuroTestProductId : null,
      pixelConfig: {
        ...defaults.pixelConfig,
        ...savedPixel,
        pixelId: resolvedPixelId,
        enabled: savedPixel.pixelId ? Boolean(savedPixel.enabled) : true,
      },
      exporterSettings: (() => {
        const rawExp =
          parsed.exporterSettings && typeof parsed.exporterSettings === 'object'
            ? parsed.exporterSettings
            : {};
        const mergedExp = {
          ...defaults.exporterSettings,
          ...rawExp,
        };
        if (mergedExp.phoneSupportDe === '+49 176 43488260') {
          mergedExp.phoneSupportDe = '';
        }
        if (!mergedExp.phoneMorocco) {
          mergedExp.phoneMorocco = '+212 753 310 471';
        }
        return mergedExp;
      })(),
      cloudflareEmail: {
        ...defaults.cloudflareEmail,
        ...(parsed.cloudflareEmail && typeof parsed.cloudflareEmail === 'object'
          ? parsed.cloudflareEmail
          : {}),
        accountId:
          cleanEnvSecret(process.env.CLOUDFLARE_ACCOUNT_ID) ||
          (parsed.cloudflareEmail?.accountId ?? ''),
        apiToken:
          cleanEnvSecret(process.env.CLOUDFLARE_EMAIL_API_TOKEN) ||
          cleanEnvSecret(process.env.CLOUDFLARE_API_TOKEN) ||
          (parsed.cloudflareEmail?.apiToken ?? ''),
      },
      adminPasswordHash:
        typeof parsed.adminPasswordHash === 'string' ? parsed.adminPasswordHash : null,
      orderCounter: typeof parsed.orderCounter === 'number' ? parsed.orderCounter : 1001,
    };
  } catch {
    return createDefaultState();
  }
}

let store: StoreState = loadStoreState();

function persistStoreState(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.error('Persist store error:', err);
  }
}

// In-memory Bearer session tokens (24h TTL)
const adminSessions = new Map<string, number>();

function hashPasscode(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyScryptPasscode(passcode: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(passcode, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function verifyPlainSecret(input: string, envSecret: string): boolean {
  const a = Buffer.from(input, 'utf8');
  const b = Buffer.from(envSecret, 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function issueAdminToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, Date.now() + 24 * 60 * 60 * 1000);
  return token;
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization ?? '';
  const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(auth.trim());
  if (!match) {
    res.status(401).json({ error: 'Nicht autorisiert.' });
    return;
  }
  const expiresAt = adminSessions.get(match[1]);
  if (!expiresAt || Date.now() > expiresAt) {
    adminSessions.delete(match[1]);
    res.status(401).json({ error: 'Sitzung abgelaufen.' });
    return;
  }
  next();
}

function isSafeWebhookUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function getStripeClient(): Stripe | null {
  const key = (process.env.STRIPE_SECRET_KEY ?? '').trim();
  if (!key) return null;
  return new Stripe(key);
}

function resolveBaseUrl(req: Request): string {
  const configured = (process.env.APP_URL ?? '').trim();
  if (configured && /^https?:\/\//i.test(configured) && !configured.includes('MY_APP_URL')) {
    return configured.replace(/\/+$/, '');
  }
  const protoHeader = req.headers['x-forwarded-proto'];
  const proto = typeof protoHeader === 'string' ? protoHeader.split(',')[0].trim() : 'http';
  const host = req.headers['x-forwarded-host'] ?? req.headers.host ?? `localhost:${PORT}`;
  const cleanHost = typeof host === 'string' ? host.split(',')[0].trim() : `localhost:${PORT}`;
  return `${proto === 'https' ? 'https' : 'http'}://${cleanHost}`;
}

async function sendMetaCapiEvent(params: {
  eventName: 'InitiateCheckout' | 'Purchase';
  eventId: string;
  valueEur: number;
  contentIds: string[];
  numItems?: number;
  customerEmail?: string;
  phone?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  overrideTestCode?: string;
}): Promise<{ sent: boolean; detail?: string }> {
  const token = cleanEnvSecret(process.env.META_CAPI_ACCESS_TOKEN);
  const pixelId = store.pixelConfig.pixelId.trim();
  if (!token || !pixelId || !store.pixelConfig.enabled) {
    return {
      sent: false,
      detail: !pixelId
        ? 'META_PIXEL_ID fehlt'
        : !token
        ? 'META_CAPI_ACCESS_TOKEN fehlt'
        : 'Pixel deaktiviert',
    };
  }
  if (params.eventName === 'InitiateCheckout' && !store.pixelConfig.trackInitiateCheckout) {
    return { sent: false, detail: 'InitiateCheckout deaktiviert' };
  }
  if (params.eventName === 'Purchase' && !store.pixelConfig.trackPurchase) {
    return { sent: false, detail: 'Purchase deaktiviert' };
  }

  const sha256 = (v: string) =>
    crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

  const testCode = params.overrideTestCode ?? store.pixelConfig.testEventCode;
  const cleanDigits = params.phone ? params.phone.replace(/[^\d]/g, '') : '';

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            {
              event_name: params.eventName,
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: 'https://mrkshi.com/',
              event_id: params.eventId,
              user_data: {
                em: params.customerEmail ? [sha256(params.customerEmail)] : undefined,
                ph: cleanDigits ? [sha256(cleanDigits)] : undefined,
                client_ip_address: params.clientIp || undefined,
                client_user_agent: params.clientUserAgent || undefined,
                fbc: params.fbc || undefined,
                fbp: params.fbp || undefined,
              },
              custom_data: {
                currency: 'EUR',
                value: Number(params.valueEur.toFixed(2)),
                content_ids: params.contentIds,
                content_type: 'product',
                ...(params.numItems ? { num_items: params.numItems } : {}),
              },
            },
          ],
          ...(testCode ? { test_event_code: testCode } : {}),
        }),
      }
    );
    const bodyText = await resp.text();
    if (!resp.ok) {
      console.error(`[Meta CAPI ${params.eventName} Error]`, resp.status, bodyText);
      return { sent: false, detail: `HTTP ${resp.status}: ${bodyText.slice(0, 180)}` };
    }
    return { sent: true, detail: bodyText.slice(0, 180) };
  } catch (err) {
    console.error(`[Meta CAPI ${params.eventName} Network Error]`, err);
    return { sent: false, detail: err instanceof Error ? err.message : 'Netzwerkfehler' };
  }
}

async function sendMetaCapiPurchase(
  order: OrderRecord,
  overrideTestCode?: string
): Promise<{ sent: boolean; detail?: string }> {
  return sendMetaCapiEvent({
    eventName: 'Purchase',
    eventId: order.id,
    valueEur: order.totalCents / 100,
    contentIds: order.items.map((i) => i.productId),
    numItems: order.items.reduce((s, i) => s + i.quantity, 0),
    customerEmail: order.customerEmail,
    phone: order.whatsappNumber,
    clientIp: order.clientIp,
    clientUserAgent: order.clientUserAgent,
    fbc: order.fbc,
    fbp: order.fbp,
    overrideTestCode,
  });
}

function mapCountryName(codeOrName: string | null | undefined): string {
  const c = (codeOrName ?? '').trim();
  const upper = c.toUpperCase();
  if (upper === 'DE' || upper === 'DEU' || upper === 'DEUTSCHLAND') return 'Germany';
  if (upper === 'AT' || upper === 'AUT' || upper === 'ÖSTERREICH') return 'Austria';
  if (upper === 'CH' || upper === 'CHE' || upper === 'SCHWEIZ') return 'Switzerland';
  if (upper === 'FR') return 'France';
  if (upper === 'NL') return 'Netherlands';
  if (upper === 'BE') return 'Belgium';
  if (upper === 'LU') return 'Luxembourg';
  return c || 'Germany';
}

function formatShippingSummaryFromAddress(addr: OrderShippingAddress): string {
  return [
    addr.name,
    addr.street,
    addr.line2,
    [addr.zip, addr.city].filter(Boolean).join(' '),
    addr.country,
  ]
    .filter(Boolean)
    .join(', ')
    .slice(0, 260);
}

function enrichOrderFromStripeSession(order: OrderRecord, session: Stripe.Checkout.Session): boolean {
  let changed = false;
  const stripeEmail = session.customer_details?.email?.trim().toLowerCase();
  if (stripeEmail && !order.customerEmail) {
    order.customerEmail = stripeEmail;
    changed = true;
  }
  const stripePhone = session.customer_details?.phone?.trim();
  if (stripePhone && (!order.whatsappNumber || order.whatsappNumber === 'via Stripe Checkout')) {
    order.whatsappNumber = stripePhone;
    changed = true;
  }

  const legacyShip = (
    session as unknown as {
      shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
    }
  ).shipping_details;
  const ship =
    session.collected_information?.shipping_details ?? legacyShip ?? session.customer_details;
  const resolvedName =
    ship?.name?.trim() || session.customer_details?.name?.trim() || order.customerName || '';

  if (resolvedName && !order.customerName) {
    order.customerName = resolvedName;
    changed = true;
  }

  const addr = ship?.address ?? session.customer_details?.address;
  if (addr && (addr.line1 || addr.city || addr.postal_code)) {
    const structured: OrderShippingAddress = {
      name: resolvedName || order.shippingAddress?.name || '',
      street: (addr.line1 ?? '').trim(),
      ...(addr.line2 ? { line2: addr.line2.trim() } : {}),
      zip: (addr.postal_code ?? '').trim(),
      city: (addr.city ?? '').trim(),
      country: mapCountryName(addr.country),
      phone: stripePhone || order.whatsappNumber || undefined,
    };
    if (!order.shippingAddress || !order.shippingAddress.street) {
      order.shippingAddress = structured;
      order.shippingSummary = formatShippingSummaryFromAddress(structured);
      changed = true;
    } else if (!order.shippingSummary) {
      order.shippingSummary = formatShippingSummaryFromAddress(order.shippingAddress);
      changed = true;
    }
  }
  return changed;
}

async function dispatchOrderNotifications(
  order: OrderRecord
): Promise<{ n8nSent: boolean; telegramSent: boolean }> {
  let n8nSent = order.n8nSent;
  let telegramSent = order.telegramSent;

  const cleanPhone = order.whatsappNumber.replace(/[^\d]/g, '');
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '';

  const n8nUrl = cleanEnvSecret(process.env.N8N_WEBHOOK_URL);
  if (n8nUrl && isSafeWebhookUrl(n8nUrl)) {
    const totalEurNum = Number((order.totalCents / 100).toFixed(2));
    const totalPriceStr = totalEurNum.toFixed(2);
    const numericOrderNum = Number(order.id.replace(/[^\d]/g, '')) || order.id;
    const shipParts = (order.shippingSummary ?? '').split(',').map((s) => s.trim());
    const fullName =
      order.shippingAddress?.name ||
      order.customerName ||
      shipParts[0] ||
      order.customerEmail.split('@')[0] ||
      'MRKSHI Kunde';
    const [firstName, ...restName] = fullName.split(' ');
    const lastName = restName.join(' ');

    try {
      const resp = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Native MRKSHI fields
          event: 'mrkshi.order.paid',
          source: 'reverse-shopify-mrkshi',
          domain: 'mrkshi.com',
          orderId: order.id,
          sessionId: order.sessionId,
          status: order.status,
          totalEur: totalEurNum,
          currency: 'EUR',
          customerEmail: order.customerEmail,
          whatsappNumber: order.whatsappNumber,
          whatsappLink: waLink,
          shippingSummary: order.shippingSummary ?? '',
          measurementsSummary: order.measurementsSummary,
          giftNote: order.giftNote,
          items: order.items,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
          // Full Shopify Webhook compatibility fields (for existing n8n mrkshi-order-sale workflow)
          id: order.id,
          order_number: numericOrderNum,
          name: `#${numericOrderNum}`,
          financial_status: order.status === 'paid' ? 'paid' : 'pending',
          total_price: totalPriceStr,
          subtotal_price: totalPriceStr,
          email: order.customerEmail,
          phone: order.whatsappNumber,
          note: [order.measurementsSummary, order.giftNote].filter(Boolean).join(' | '),
          customer: {
            first_name: firstName,
            last_name: lastName,
            email: order.customerEmail,
            phone: order.whatsappNumber,
          },
          shipping_address: {
            name: fullName,
            address1:
              order.shippingAddress?.street || shipParts[1] || order.shippingSummary || '',
            address2: order.shippingAddress?.line2 || '',
            zip: order.shippingAddress?.zip || '',
            city: order.shippingAddress?.city || shipParts[2] || '',
            country:
              order.shippingAddress?.country || shipParts[shipParts.length - 1] || 'Germany',
            phone: order.shippingAddress?.phone || order.whatsappNumber,
          },
          line_items: order.items.map((i) => ({
            product_id: i.productId,
            title: i.name,
            name: `${i.name} - ${i.colorName} / ${i.sizeLabel}`,
            variant_title: `${i.colorName} / ${i.sizeLabel}`,
            quantity: i.quantity,
            price: (i.unitAmountCents / 100).toFixed(2),
            properties: i.customMeasure ? [{ name: 'Maß', value: i.customMeasure }] : [],
          })),
        }),
      });
      if (resp.ok) {
        n8nSent = true;
      } else {
        const n8nErr = await resp.text().catch(() => '');
        console.error('[n8n Webhook Error]', resp.status, n8nErr);
      }
    } catch (err) {
      console.error('n8n webhook failed:', err);
    }
  }

  const tgToken = cleanEnvSecret(process.env.TELEGRAM_BOT_TOKEN);
  const tgChatId = cleanEnvSecret(process.env.TELEGRAM_CHAT_ID);
  if (tgToken && tgChatId) {
    const linesText = order.items
      .map(
        (i) =>
          `• ${i.quantity}x ${i.name} | Farbe: ${i.colorName} | Gr: ${i.sizeLabel}${
            i.customMeasure ? ` (${i.customMeasure})` : ''
          }`
      )
      .join('\n');

    const text = [
      `🧥 NEUE MRKSHI BESTELLUNG (${order.id})`,
      `Status: ${order.status === 'paid' ? '✅ BEZAHLT' : '⏳ OFFEN'} (${order.mode.toUpperCase()})`,
      `Summe: ${(order.totalCents / 100).toFixed(2)} €`,
      ``,
      linesText,
      ``,
      `📧 E-Mail: ${order.customerEmail || 'via Stripe'}`,
      order.whatsappNumber ? `📱 Tel/WhatsApp: ${order.whatsappNumber}` : '',
      order.shippingSummary ? `🏠 Adresse: ${order.shippingSummary}` : '',
      waLink ? `💬 Chat: ${waLink}` : '',
      order.measurementsSummary ? `📏 Maßchecker: ${order.measurementsSummary}` : '',
      order.giftNote ? `🎁 Notiz: ${order.giftNote}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const tgResp = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(tgToken)}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tgChatId,
            text,
            disable_web_page_preview: true,
          }),
        }
      );
      if (tgResp.ok) {
        telegramSent = true;
      } else {
        const tgErr = await tgResp.text().catch(() => '');
        console.error('[Telegram Error]', tgResp.status, tgErr);
      }
    } catch (err) {
      console.error('Telegram alert failed:', err);
    }
  }

  order.n8nSent = n8nSent;
  order.telegramSent = telegramSent;
  persistStoreState();

  return { n8nSent, telegramSent };
}

function resolveCloudflareEmailCredentials() {
  const cfg = store.cloudflareEmail;
  const accountId = (
    cleanEnvSecret(process.env.CLOUDFLARE_ACCOUNT_ID) ||
    cfg.accountId ||
    ''
  ).trim();
  const apiToken = (
    cleanEnvSecret(process.env.CLOUDFLARE_EMAIL_API_TOKEN) ||
    cleanEnvSecret(process.env.CLOUDFLARE_API_TOKEN) ||
    cfg.apiToken ||
    ''
  ).trim();
  const fromAddress = (cfg.fromAddress || store.exporterSettings.email || 'service@mrkshi.com')
    .trim()
    .toLowerCase();
  const fromName = (cfg.fromName || 'MRKSHI Atelier').trim();
  return {
    configured: Boolean(accountId && apiToken && fromAddress.includes('@')),
    accountId,
    apiToken,
    fromAddress,
    fromName,
    autoOrderConfirmation: cfg.autoOrderConfirmation !== false,
    autoTrackingEmail: cfg.autoTrackingEmail !== false,
    autoVoucherWelcome: cfg.autoVoucherWelcome !== false,
  };
}

function escapeHtml(raw: string): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendCloudflareTransactionalEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; status?: string; detail: string }> {
  const creds = resolveCloudflareEmailCredentials();
  if (!creds.configured) {
    return {
      ok: false,
      detail: 'Cloudflare Email Sending noch nicht verbunden (Account-ID & API-Token fehlen).',
    };
  }
  const toClean = params.to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toClean)) {
    return { ok: false, detail: 'Ungültige Empfänger-E-Mail-Adresse.' };
  }

  try {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(creds.accountId)}/email/sending/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: toClean,
          from: {
            address: creds.fromAddress,
            name: creds.fromName,
          },
          reply_to: creds.fromAddress,
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      }
    );

    const rawText = await resp.text();
    let parsed: {
      success?: boolean;
      errors?: Array<{ code?: number | string; message?: string }>;
      result?: {
        delivered?: string[];
        queued?: string[];
        permanent_bounces?: string[];
      };
    } = {};
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // non-json error fallback
    }

    if (!resp.ok || parsed.success === false) {
      const errMsg =
        parsed.errors?.map((e) => e.message).filter(Boolean).join(' · ') ||
        rawText.slice(0, 180) ||
        `HTTP ${resp.status}`;
      console.error('[Cloudflare Email Sending Error]', resp.status, errMsg);
      return { ok: false, detail: `Cloudflare API (${resp.status}): ${errMsg}` };
    }

    const bounced = parsed.result?.permanent_bounces ?? [];
    if (bounced.length > 0) {
      return {
        ok: false,
        status: 'bounced',
        detail: `E-Mail abgewiesen (Permanent Bounce): ${bounced.join(', ')}`,
      };
    }

    const delivered = parsed.result?.delivered ?? [];
    const queued = parsed.result?.queued ?? [];
    const status = delivered.length > 0 ? 'delivered' : queued.length > 0 ? 'queued' : 'sent';
    return {
      ok: true,
      status,
      detail:
        status === 'delivered'
          ? `Zugestellt an ${toClean} via ${creds.fromAddress}`
          : `In Zustellung (${status}) an ${toClean} via ${creds.fromAddress}`,
    };
  } catch (err) {
    console.error('[Cloudflare Email Network Error]', err);
    return {
      ok: false,
      detail: err instanceof Error ? err.message : 'Netzwerkfehler zu Cloudflare Email API.',
    };
  }
}

async function sendOrderConfirmationEmail(
  order: OrderRecord
): Promise<{ ok: boolean; detail: string }> {
  if (!order.customerEmail) {
    return { ok: false, detail: 'Keine Kunden-E-Mail in der Bestellung hinterlegt.' };
  }
  const exp = store.exporterSettings;
  const totalEur = (order.totalCents / 100).toFixed(2).replace('.', ',');
  const greetingName =
    order.shippingAddress?.name || order.customerName || 'MRKSHI Kunde';
  const returnInfo = `${exp.returnNameDe}, ${exp.returnStreetDe}, ${exp.returnCityZipDe}`;

  const itemsText = order.items
    .map(
      (i) =>
        `- ${i.quantity}x ${i.name} | Farbe: ${i.colorName} | Größe: ${i.sizeLabel}${
          i.customMeasure ? ` (${i.customMeasure})` : ''
        }`
    )
    .join('\n');

  const itemsHtml = order.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:10px 0;border-bottom:1px solid #E5E5E5">
            <strong>${escapeHtml(i.name)}</strong><br/>
            <span style="color:#555;font-size:13px">Farbe: ${escapeHtml(i.colorName)} · Größe: ${escapeHtml(i.sizeLabel)}${
          i.customMeasure ? ` · Maß: ${escapeHtml(i.customMeasure)}` : ''
        }</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #E5E5E5;text-align:right;white-space:nowrap">
            ${i.quantity} × ${((i.unitAmountCents / 100).toFixed(2)).replace('.', ',')} €
          </td>
        </tr>`
    )
    .join('');

  const subject = `Deine MRKSHI Bestellbestätigung (${order.id})`;
  const text = [
    `Hallo ${greetingName},`,
    ``,
    `vielen Dank für deine Bestellung bei MRKSHI (${order.id})!`,
    `Unsere Meister-Schneider im Lederatelier in Marokko bereiten deine Jacke jetzt vor.`,
    ``,
    `DEINE BESTELLUNG (${order.id}):`,
    itemsText,
    order.measurementsSummary ? `Maßchecker-Angaben: ${order.measurementsSummary}` : '',
    ``,
    `Gesamtbetrag (Bezahlt): ${totalEur} € (inkl. 0,00 € Express-Lieferung)`,
    ``,
    `Sobald dein Paket unser Atelier verlässt, erhältst du automatisch deine Sendungsnummer per E-Mail.`,
    `Du möchtest noch ein genaues Körpermaß ergänzen? Antworte einfach direkt auf diese E-Mail (${exp.email}).`,
    ``,
    `14-Tage-Retouren-Programm (bei Standardgrößen): ${returnInfo}`,
    ``,
    `Herzliche Grüße`,
    `${exp.companyName} · Casablanca & Marrakesch, Marokko`,
    `https://www.mrkshi.com`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#111;background:#fff;border:2px solid #000">
    <div style="background:#0B0B0B;color:#fff;padding:22px 26px;border-bottom:2px solid #D6B370">
      <div style="font-size:24px;font-weight:900;letter-spacing:0.08em">MRKSHI</div>
      <div style="font-size:11px;color:#D6B370;letter-spacing:0.14em;text-transform:uppercase;margin-top:4px">Lederatelier · Casablanca &amp; Marrakesch</div>
    </div>
    <div style="padding:26px;font-size:14px;line-height:1.6">
      <h2 style="margin:0 0 12px;font-size:20px">Vielen Dank für deine Bestellung, ${escapeHtml(greetingName)}!</h2>
      <p style="margin:0 0 16px;color:#333">Deine Bestellung <strong>${escapeHtml(order.id)}</strong> ist bezahlt und liegt jetzt in unserem Atelier in Marokko zur Qualitäts- &amp; Maßprüfung bereit.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${itemsHtml}</table>
      ${
        order.measurementsSummary
          ? `<div style="padding:10px 12px;background:#F7F7F7;border-left:3px solid #000;font-size:13px;margin-bottom:14px"><strong>Hinterlegtes Maß:</strong> ${escapeHtml(order.measurementsSummary)}</div>`
          : ''
      }
      <div style="padding:12px 14px;background:#0B0B0B;color:#fff;font-weight:700;display:flex;justify-content:space-between">
        <span>Gesamtbetrag (inkl. 0,00 € Express-Versand):</span>
        <span style="margin-left:auto">${totalEur} €</span>
      </div>
      <p style="margin:18px 0 0;font-size:13px;color:#444">Sobald dein MRKSHI Paket unterwegs ist, senden wir dir sofort deinen Tracking-Link. Falls du uns noch ein Sondermaß durchgeben möchtest, antworte einfach direkt auf diese E-Mail.</p>
    </div>
    <div style="padding:14px 26px;background:#F8F8F8;border-top:1px solid #E5E5E5;font-size:11.5px;color:#555;line-height:1.5">
      <strong>${escapeHtml(exp.companyName)}</strong> · ${escapeHtml(exp.cityZip)}, ${escapeHtml(exp.country)} · <a href="https://www.mrkshi.com" style="color:#000">www.mrkshi.com</a><br/>
      14-Tage-Retouren-Programm (Standardgrößen): ${escapeHtml(returnInfo)}
    </div>
  </div>`;

  const res = await sendCloudflareTransactionalEmail({
    to: order.customerEmail,
    subject,
    html,
    text,
  });
  if (res.ok) {
    order.emailSent = true;
    persistStoreState();
  }
  return res;
}

async function sendOrderTrackingEmail(
  order: OrderRecord
): Promise<{ ok: boolean; detail: string }> {
  if (!order.customerEmail) {
    return { ok: false, detail: 'Keine Kunden-E-Mail hinterlegt.' };
  }
  const exp = store.exporterSettings;
  const carrier = order.carrier || 'DHL Express';
  const trk = (order.trackingNumber || '').trim();
  const trackUrl = trk
    ? carrier.toLowerCase().includes('ups')
      ? `https://www.ups.com/track?tracknum=${encodeURIComponent(trk)}`
      : `https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=${encodeURIComponent(trk)}`
    : 'https://www.mrkshi.com';
  const greetingName =
    order.shippingAddress?.name || order.customerName || 'MRKSHI Kunde';

  const subject = `Dein MRKSHI Paket (${order.id}) ist unterwegs!`;
  const text = [
    `Hallo ${greetingName},`,
    ``,
    `gute Nachrichten: Deine handgefertigte MRKSHI Lederjacke (${order.id}) wurde versendet!`,
    `Versanddienstleister: ${carrier}`,
    trk ? `Sendungsnummer: ${trk}` : '',
    trk ? `Live-Sendungsverfolgung: ${trackUrl}` : '',
    ``,
    `Wir wünschen dir viel Freude beim Auspacken!`,
    `${exp.companyName} · https://www.mrkshi.com`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;color:#111;background:#fff;border:2px solid #000">
    <div style="background:#0B0B0B;color:#fff;padding:22px 26px;border-bottom:2px solid #D6B370">
      <div style="font-size:24px;font-weight:900;letter-spacing:0.08em">MRKSHI</div>
      <div style="font-size:11px;color:#D6B370;letter-spacing:0.14em;text-transform:uppercase;margin-top:4px">Versandbestätigung · ${escapeHtml(order.id)}</div>
    </div>
    <div style="padding:26px;font-size:14px;line-height:1.6">
      <h2 style="margin:0 0 12px;font-size:20px">Dein MRKSHI Paket ist auf dem Weg, ${escapeHtml(greetingName)}!</h2>
      <p style="margin:0 0 16px;color:#333">Deine Lederjacke hat unsere Endkontrolle bestanden und wurde im Seidenpapier &amp; Atelier-Karton an <strong>${escapeHtml(carrier)}</strong> übergeben.</p>
      ${
        trk
          ? `<div style="padding:14px 16px;background:#F8F8F8;border:1.5px solid #000;margin:16px 0">
              <div style="font-size:12px;color:#555;text-transform:uppercase">Sendungsnummer (${escapeHtml(carrier)})</div>
              <div style="font-family:monospace;font-size:18px;font-weight:900;margin:4px 0 12px">${escapeHtml(trk)}</div>
              <a href="${escapeHtml(trackUrl)}" style="display:inline-block;padding:10px 18px;background:#000;color:#fff;text-decoration:none;font-weight:700;font-size:13px">Sendung jetzt live verfolgen →</a>
            </div>`
          : ''
      }
      <p style="margin:16px 0 0;font-size:13px;color:#444">Bei Fragen erreichst du uns jederzeit per Antwort auf diese E-Mail (${escapeHtml(exp.email)}).</p>
    </div>
  </div>`;

  const res = await sendCloudflareTransactionalEmail({
    to: order.customerEmail,
    subject,
    html,
    text,
  });
  if (res.ok) {
    order.trackingEmailSent = true;
    order.emailSent = true;
    persistStoreState();
  }
  return res;
}

async function markOrderPaidAndDispatch(order: OrderRecord): Promise<OrderRecord> {
  const wasAlreadyPaid = order.status === 'paid';
  order.status = 'paid';
  if (!order.paidAt) {
    order.paidAt = new Date().toISOString();
  }

  if (!order.inventoryDecremented) {
    for (const item of order.items) {
      const prod = store.products.find((p) => p.id === item.productId);
      if (prod) {
        prod.stockTotal = Math.max(0, prod.stockTotal - item.quantity);
      }
    }
    order.inventoryDecremented = true;
  }

  persistStoreState();

  const hasN8n = Boolean(cleanEnvSecret(process.env.N8N_WEBHOOK_URL));
  const hasTg = Boolean(
    cleanEnvSecret(process.env.TELEGRAM_BOT_TOKEN) && cleanEnvSecret(process.env.TELEGRAM_CHAT_ID)
  );
  if (!wasAlreadyPaid || (hasN8n && !order.n8nSent) || (hasTg && !order.telegramSent)) {
    await dispatchOrderNotifications(order);
  }

  if (!order.capiSent) {
    const capiRes = await sendMetaCapiPurchase(order);
    if (capiRes.sent) {
      order.capiSent = true;
      persistStoreState();
    }
  }

  const emailCreds = resolveCloudflareEmailCredentials();
  if (emailCreds.configured && emailCreds.autoOrderConfirmation && order.customerEmail && !order.emailSent) {
    await sendOrderConfirmationEmail(order);
  }

  // Record verified paid order in 1st-party analytics (idempotent by order.id)
  if (!analyticsStore.events.some((ev) => ev.type === 'purchase' && ev.orderId === order.id)) {
    const now = Date.now();
    analyticsStore.events.push({
      ts: now,
      day: new Date(now).toISOString().slice(0, 10),
      sid: `ord_${order.id}`,
      type: 'purchase',
      source: order.fbc ? 'Meta / Instagram Ads' : 'Checkout',
      device: /iphone|ipad|android|mobile/i.test(order.clientUserAgent ?? '')
        ? 'mobile'
        : 'desktop',
      productId: order.items[0]?.productId,
      productName: order.items.map((i) => i.name).join(', '),
      colorName: order.items[0]?.colorName,
      valueEur: Number((order.totalCents / 100).toFixed(2)),
      orderId: order.id,
    });
    scheduleAnalyticsSave(true);
  }

  return order;
}

interface CheckoutCartItemInput {
  productId: string;
  colorId: string;
  colorName?: string;
  sizeLabel: string;
  customMeasure?: string;
  giftWrap?: boolean;
  quantity: number;
}

async function startServer() {
  const app = express();
  // Trust Cloudflare / Cloud Run reverse proxy headers (X-Forwarded-Proto / Host / CF-Connecting-IP)
  app.set('trust proxy', true);

  // Serve seller-uploaded product images from persistent data/uploads directory
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      maxAge: '30d',
      immutable: true,
    })
  );

  // Admin image upload route (accepts up to 8MB base64 data URL before default 128kb JSON parser)
  app.post(
    '/api/admin/upload-image',
    requireAdminAuth,
    express.json({ limit: '8mb' }),
    (req: Request, res: Response) => {
      const body = req.body as { dataUrl?: unknown };
      const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl.trim() : '';
      const match = /^data:image\/(webp|jpeg|jpg|png);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
      if (!match) {
        res
          .status(400)
          .json({ error: 'Ungültiges Bildformat (nur WEBP, JPG oder PNG erlaubt).' });
        return;
      }
      const ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
      const buf = Buffer.from(match[2], 'base64');
      if (buf.length < 100 || buf.length > 6 * 1024 * 1024) {
        res.status(400).json({ error: 'Bilddatei ist leer oder größer als 6 MB.' });
        return;
      }
      const fileName = `prod_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
      const filePath = path.resolve(UPLOADS_DIR, fileName);
      fs.writeFileSync(filePath, buf);
      res.json({ ok: true, url: `/uploads/${fileName}` });
    }
  );

  // Stripe Webhook must inspect raw body BEFORE express.json()
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    async (req: Request, res: Response) => {
      const stripe = getStripeClient();
      const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET ?? '').trim();
      const sig = req.headers['stripe-signature'];

      if (!stripe || !webhookSecret || typeof sig !== 'string') {
        res.status(400).json({ error: 'Stripe Webhook nicht konfiguriert.' });
        return;
      }

      try {
        const event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session;
          const order = store.orders.find((o) => o.sessionId === session.id);
          if (order && session.payment_status === 'paid') {
            enrichOrderFromStripeSession(order, session);
            await markOrderPaidAndDispatch(order);
          }
        }
        res.json({ received: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ungültige Webhook-Signatur.';
        res.status(400).json({ error: msg });
      }
    }
  );

  app.use(express.json({ limit: '128kb' }));

  // --- SEO & GEO (Generative Engine Optimization) Discovery Routes for www.mrkshi.com ---
  app.get('/robots.txt', (_req: Request, res: Response) => {
    res.type('text/plain; charset=utf-8').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/admin/',
        '',
        'User-agent: GPTBot',
        'Allow: /',
        'User-agent: OAI-SearchBot',
        'Allow: /',
        'User-agent: ChatGPT-User',
        'Allow: /',
        'User-agent: PerplexityBot',
        'Allow: /',
        'User-agent: ClaudeBot',
        'Allow: /',
        'User-agent: Google-Extended',
        'Allow: /',
        '',
        'Sitemap: https://www.mrkshi.com/sitemap.xml',
        '# AI Search / GEO Specification: https://www.mrkshi.com/llms.txt',
      ].join('\n')
    );
  });

  app.get('/llms.txt', (_req: Request, res: Response) => {
    const productLines = store.products
      .filter((p) => p.active)
      .map(
        (p) =>
          `- [${p.name}](https://www.mrkshi.com/products/${p.id}): ${p.priceEur},00 € (statt ${p.compareAtEur},00 €), ${p.leatherType}, Größen S–3XL + kostenloses Direkt-Maß, Farben: ${p.colors
            .map((c) => c.name)
            .join(', ')}`
      );

    res.type('text/plain; charset=utf-8').send(
      [
        '# MRKSHI — Marokkanische Herren-Lederjacken (https://www.mrkshi.com)',
        '',
        '> Direkter Online-Shop für handgefertigte Herren-Lederjacken aus 100 % echtem Naturleder (Lamm-Nappa, Rindleder, Wildleder), direkt aus dem eigenen Familienatelier in Marrakesch (Marokko) nach Deutschland, Österreich und in die Schweiz geliefert.',
        '',
        '## Kernfakten & Alleinstellungsmerkmale (USP)',
        '- Festpreis-Garantie: Alle 9 Modelle, jede Größe (S–3XL) & jede Farbe einheitlich 177,00 € (-50 % Preis wie ausgezeichnet statt 354,00 €)',
        '- Haustür-Lieferung: 0,00 € kostenloser versicherter DHL Express Versand bis nach Hause (7–14 Werktage)',
        '- Seltene Farben statt Standard-Schwarz: Bleu Petrol, Blue Majorelle, Rouge Hermès, Bordeaux, Olive, Espresso, Mitternachtsblau, Mint',
        '- Größen: Alle 9 Modelle von S bis 3XL plus kostenloses Sondermaß (vor & direkt nach Bezahlung)',
        '- Bundle-Vorteil: 20,00 € Sofortrabatt beim Kauf von 2+ Lederjacken · 10 € Treue-Gutschein: TREUE10',
        '- Zahlung: Stripe Checkout mit Klarna, Apple Pay, Google Pay, PayPal & Visa/Mastercard',
        '- 14-Tage-Retouren-Programm: Unkomplizierte Rücksendung bei Standardgrößen über unsere Retouren-Annahmestelle (Alte Dorfstraße 3a, 61137 Schöneck)',
        '- Unternehmenssitz & Atelier: Casablanca & Marrakesch, Marokko · Kontakt: service@mrkshi.com · WhatsApp Atelier: +212 753 310 471',
        '',
        '## Alle 9 Herren-Lederjacken Modelle',
        ...productLines,
        '',
        '## Wichtige URLs',
        '- Startseite & Virtual Try-On: https://www.mrkshi.com/',
        '- Alle 9 Modelle: https://www.mrkshi.com/kollektion',
        '- Maßchecker & Sondermaß: https://www.mrkshi.com/masschecker',
        '- Versand & 14 Tage Rückgabe: https://www.mrkshi.com/versand',
        '- Datenschutz & Impressum: https://www.mrkshi.com/datenschutz',
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', (_req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];
    const xmlEsc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const staticPaths = [
      { loc: 'https://www.mrkshi.com/', priority: '1.0', changefreq: 'daily' },
      { loc: 'https://www.mrkshi.com/kollektion', priority: '0.9', changefreq: 'daily' },
      { loc: 'https://www.mrkshi.com/masschecker', priority: '0.8', changefreq: 'weekly' },
      { loc: 'https://www.mrkshi.com/versand', priority: '0.6', changefreq: 'monthly' },
      { loc: 'https://www.mrkshi.com/impressum', priority: '0.5', changefreq: 'monthly' },
      { loc: 'https://www.mrkshi.com/datenschutz', priority: '0.5', changefreq: 'monthly' },
      { loc: 'https://www.mrkshi.com/agb', priority: '0.5', changefreq: 'monthly' },
      { loc: 'https://www.mrkshi.com/widerruf', priority: '0.5', changefreq: 'monthly' },
    ];

    const toAbsUrl = (u: string) =>
      !u ? '' : u.startsWith('http') ? u : `https://www.mrkshi.com${u.startsWith('/') ? '' : '/'}${u}`;

    const productUrls = store.products
      .filter((p) => p.active)
      .map((p) => ({
        loc: `https://www.mrkshi.com/products/${encodeURIComponent(p.id)}`,
        priority: '0.9',
        changefreq: 'daily',
        image: toAbsUrl(p.colors[0]?.image ?? ''),
        title: `${p.name} — ${p.leatherType}`,
      }));

    const entries = [
      ...staticPaths.map(
        (u) =>
          `  <url>\n    <loc>${xmlEsc(u.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      ),
      ...productUrls.map(
        (u) =>
          `  <url>\n    <loc>${xmlEsc(u.loc)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>${
            u.image
              ? `\n    <image:image>\n      <image:loc>${xmlEsc(u.image)}</image:loc>\n      <image:title>${xmlEsc(u.title)}</image:title>\n    </image:image>`
              : ''
          }\n  </url>`
      ),
    ];

    res.type('application/xml; charset=utf-8').send(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ...entries,
        '</urlset>',
      ].join('\n')
    );
  });

  // Live Google Merchant Center (Free Shopping) & Meta Catalog Feed (Advantage+ Dynamic Ads)
  app.get('/products-feed.xml', (_req: Request, res: Response) => {
    const xmlEsc = (s: string) =>
      String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const toAbsUrl = (u: string) =>
      !u ? '' : u.startsWith('http') ? u : `https://www.mrkshi.com${u.startsWith('/') ? '' : '/'}${u}`;

    const itemsXml: string[] = [];
    for (const p of store.products.filter((x) => x.active)) {
      const leadColor = p.colors[0];
      const imgUrl = toAbsUrl(leadColor?.image ?? p.gallery[0] ?? '');
      const extraImgs = p.gallery
        .map(toAbsUrl)
        .filter((u) => u && u !== imgUrl)
        .slice(0, 6);
      const avail = p.stockTotal > 0 ? 'in stock' : 'out of stock';
      const regularPrice = `${Math.max(p.compareAtEur, p.priceEur).toFixed(2)} EUR`;
      const salePrice = `${p.priceEur.toFixed(2)} EUR`;

      // Primary item matching Meta Pixel content_ids = p.id
      itemsXml.push(
        [
          '    <item>',
          `      <g:id>${xmlEsc(p.id)}</g:id>`,
          `      <g:item_group_id>${xmlEsc(p.id)}</g:item_group_id>`,
          `      <g:title>${xmlEsc(`${p.name} — ${leadColor?.name ?? 'Naturleder'} (100 % Echtleder)`)}</g:title>`,
          `      <g:description>${xmlEsc(`${p.tagline} ${p.description}`)}</g:description>`,
          `      <g:link>${xmlEsc(`https://www.mrkshi.com/products/${encodeURIComponent(p.id)}`)}</g:link>`,
          `      <g:image_link>${xmlEsc(imgUrl)}</g:image_link>`,
          ...extraImgs.map(
            (x) => `      <g:additional_image_link>${xmlEsc(x)}</g:additional_image_link>`
          ),
          `      <g:availability>${avail}</g:availability>`,
          `      <g:condition>new</g:condition>`,
          `      <g:price>${regularPrice}</g:price>`,
          `      <g:sale_price>${salePrice}</g:sale_price>`,
          `      <g:brand>MRKSHI</g:brand>`,
          `      <g:google_product_category>Apparel &amp; Accessories &gt; Clothing &gt; Outerwear &gt; Coats &amp; Jackets</g:google_product_category>`,
          `      <g:gender>male</g:gender>`,
          `      <g:age_group>adult</g:age_group>`,
          `      <g:material>${xmlEsc(p.leatherType)}</g:material>`,
          `      <g:color>${xmlEsc(leadColor?.name ?? 'Schwarz')}</g:color>`,
          '      <g:shipping>',
          '        <g:country>DE</g:country>',
          '        <g:service>DHL Express</g:service>',
          '        <g:price>0.00 EUR</g:price>',
          '      </g:shipping>',
          '    </item>',
        ].join('\n')
      );
    }

    res.type('application/xml; charset=utf-8').send(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
        '  <channel>',
        '    <title>MRKSHI — Marokkanische Herren-Lederjacken</title>',
        '    <link>https://www.mrkshi.com/</link>',
        '    <description>100 % echtes Naturleder direkt ab Atelier Marokko</description>',
        ...itemsXml,
        '  </channel>',
        '</rss>',
      ].join('\n')
    );
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      domain: 'www.mrkshi.com',
      productsCount: store.products.length,
      stripeConfigured: Boolean(cleanEnvSecret(process.env.STRIPE_SECRET_KEY)),
      stripeWebhookConfigured: Boolean(cleanEnvSecret(process.env.STRIPE_WEBHOOK_SECRET)),
      metaPixelId: store.pixelConfig.pixelId || null,
      metaCapiConfigured: Boolean(cleanEnvSecret(process.env.META_CAPI_ACCESS_TOKEN)),
      oneEuroTestProductId: store.oneEuroTestProductId,
      n8nConfigured: Boolean(cleanEnvSecret(process.env.N8N_WEBHOOK_URL)),
      telegramConfigured: Boolean(
        cleanEnvSecret(process.env.TELEGRAM_BOT_TOKEN) &&
          cleanEnvSecret(process.env.TELEGRAM_CHAT_ID)
      ),
    });
  });

  // Authoritative Catalog Endpoint (never cached by browser/CDN so admin edits appear instantly)
  app.get('/api/catalog', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const publicProducts = store.products.map((prod) =>
      store.oneEuroTestProductId === prod.id ? { ...prod, priceEur: 1 } : prod
    );
    res.json({
      products: publicProducts,
      oneEuroTestProductId: store.oneEuroTestProductId,
    });
  });

  app.get('/api/pixel-config', (_req: Request, res: Response) => {
    res.json({
      ...store.pixelConfig,
      capiConfigured: Boolean(cleanEnvSecret(process.env.META_CAPI_ACCESS_TOKEN)),
    });
  });

  app.post('/api/pixel-config', requireAdminAuth, (req: Request, res: Response) => {
    const body = req.body as Partial<PixelConfigState>;
    const rawPixelId = typeof body.pixelId === 'string' ? body.pixelId.trim() : '';
    const rawGa4 = typeof body.ga4MeasurementId === 'string' ? body.ga4MeasurementId.trim().toUpperCase() : '';
    const rawGtm = typeof body.gtmId === 'string' ? body.gtmId.trim().toUpperCase() : '';
    const rawTiktok = typeof body.tiktokPixelId === 'string' ? body.tiktokPixelId.trim() : '';

    if (rawPixelId !== '' && !/^\d{10,20}$/.test(rawPixelId)) {
      res.status(400).json({ error: 'Bitte eine gültige Meta Pixel ID eingeben (10–20 Ziffern).' });
      return;
    }
    if (rawGa4 !== '' && !/^G-[A-Z0-9]{6,14}$/i.test(rawGa4)) {
      res.status(400).json({ error: 'Ungültige GA4 Measurement ID (Format: G-XXXXXXXXXX).' });
      return;
    }
    if (rawGtm !== '' && !/^(GTM-[A-Z0-9]{5,10}|AW-\d{6,14})$/i.test(rawGtm)) {
      res.status(400).json({ error: 'Ungültige GTM oder Google Ads ID.' });
      return;
    }
    if (rawTiktok !== '' && !/^[A-Z0-9]{10,28}$/i.test(rawTiktok)) {
      res.status(400).json({ error: 'Ungültige TikTok Pixel ID.' });
      return;
    }

    const rawTestCode =
      typeof body.testEventCode === 'string' ? body.testEventCode.trim().slice(0, 40) : '';

    store.pixelConfig = {
      pixelId: rawPixelId,
      enabled: Boolean(body.enabled) && rawPixelId !== '',
      testEventCode: rawTestCode,
      trackViewContent: body.trackViewContent !== false,
      trackAddToCart: body.trackAddToCart !== false,
      trackInitiateCheckout: body.trackInitiateCheckout !== false,
      trackPurchase: body.trackPurchase !== false,
      ga4MeasurementId: rawGa4,
      gtmId: rawGtm,
      tiktokPixelId: rawTiktok,
    };
    persistStoreState();

    res.json({
      ...store.pixelConfig,
      capiConfigured: Boolean(cleanEnvSecret(process.env.META_CAPI_ACCESS_TOKEN)),
    });
  });

  app.post('/api/drop-notify', (req: Request, res: Response) => {
    const body = req.body as { productId?: unknown; colorName?: unknown; email?: unknown };
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    const colorName = typeof body.colorName === 'string' ? body.colorName.trim().slice(0, 60) : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    const product = store.products.find((p) => p.id === productId);
    if (!product) {
      res.status(400).json({ error: 'Ungültiges Jackenmodell.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
      res.status(400).json({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
      return;
    }

    store.waitlist.push({
      productId,
      colorName: colorName || 'Signature-Farbe',
      email,
      createdAt: new Date().toISOString(),
    });
    persistStoreState();

    res.json({
      ok: true,
      message: `Vormerkung gespeichert für ${product.name}.`,
    });
  });

  // VIP Newsletter & Treue-Gutschein Endpoint
  app.post('/api/newsletter/subscribe', async (req: Request, res: Response) => {
    const body = req.body as {
      email?: unknown;
      preferredColor?: unknown;
      consentAccepted?: unknown;
    };

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
      res.status(400).json({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
      return;
    }

    if (body.consentAccepted !== true) {
      res.status(400).json({
        error: 'Bitte bestätige die Datenschutz-Einwilligung für Produkt-News & Gutscheine.',
      });
      return;
    }

    const preferredColor =
      typeof body.preferredColor === 'string' && body.preferredColor.trim()
        ? body.preferredColor.trim().slice(0, 260)
        : 'Alle seltenen Ledertypen & Raritäten';
    const voucherCode = 'TREUE10';

    const existing = store.newsletter.find((n) => n.email === email);
    if (existing) {
      existing.preferredColor = preferredColor;
      persistStoreState();
    } else {
      store.newsletter.unshift({
        id: `NL-${Date.now().toString(36).toUpperCase()}`,
        email,
        preferredColor,
        voucherCode,
        consentAccepted: true,
        createdAt: new Date().toISOString(),
      });
      persistStoreState();
    }

    const n8nUrl = (process.env.N8N_WEBHOOK_URL ?? '').trim();
    if (n8nUrl && isSafeWebhookUrl(n8nUrl)) {
      fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'mrkshi.newsletter.subscribed',
          domain: 'www.mrkshi.com',
          email,
          preferredColor,
          voucherCode,
          subscribedAt: new Date().toISOString(),
        }),
      }).catch(() => {});
    }

    const tgToken = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
    const tgChatId = (process.env.TELEGRAM_CHAT_ID ?? '').trim();
    if (tgToken && tgChatId) {
      fetch(`https://api.telegram.org/bot${encodeURIComponent(tgToken)}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: tgChatId,
          text: `💌 NEUER VIP RARITÄTEN & NEWSLETTER-KUNDE\n📧 ${email}\n🧥 Leder- & Muster-Wunsch: ${preferredColor}\n🎟️ Code: ${voucherCode}`,
          disable_web_page_preview: true,
        }),
      }).catch(() => {});
    }

    const emailCreds = resolveCloudflareEmailCredentials();
    if (emailCreds.configured && emailCreds.autoVoucherWelcome) {
      sendCloudflareTransactionalEmail({
        to: email,
        subject: `Dein 10 € MRKSHI Code (${voucherCode}) & Zugang zur Raritäten-Liste`,
        text: [
          `Willkommen im MRKSHI Atelier-Insider-Verteiler!`,
          ``,
          `Dein persönlicher 10,00 € Sofort-Gutschein lautet: ${voucherCode}`,
          `Einlösbar direkt im Warenkorb auf https://www.mrkshi.com`,
          ``,
          `Deine hinterlegten Leder- & Muster-Wünsche: ${preferredColor}`,
          `Sobald neue Einzelteile und Sonderhäute aus unserem Atelier verfügbar sind, informieren wir dich zuerst.`,
          ``,
          `MRKSHI Atelier · Casablanca & Marrakesch`,
        ].join('\n'),
        html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:580px;margin:0 auto;color:#111;border:2px solid #000;background:#fff">
          <div style="background:#0B0B0B;color:#fff;padding:20px 24px;border-bottom:2px solid #D6B370">
            <div style="font-size:22px;font-weight:900;letter-spacing:0.08em">MRKSHI</div>
            <div style="font-size:11px;color:#D6B370;letter-spacing:0.14em;text-transform:uppercase;margin-top:4px">Raritäten-Liste &amp; Treue-Vorteil</div>
          </div>
          <div style="padding:24px;font-size:14px;line-height:1.6">
            <h2 style="margin:0 0 10px;font-size:20px">Willkommen auf der MRKSHI Insider-Liste!</h2>
            <p style="margin:0 0 14px">Deine gewünschten Ledertypen (<strong>${escapeHtml(preferredColor)}</strong>) sind vermerkt. Dein 10,00 € Sofort-Code für deine Bestellung lautet:</p>
            <div style="padding:14px;background:#0B0B0B;color:#D6B370;font-family:monospace;font-size:22px;font-weight:900;text-align:center;letter-spacing:0.12em">${voucherCode}</div>
            <p style="margin:16px 0 0"><a href="https://www.mrkshi.com" style="display:inline-block;padding:10px 18px;background:#000;color:#fff;text-decoration:none;font-weight:700">Jetzt im Shop einlösen →</a></p>
          </div>
        </div>`,
      }).catch(() => {});
    }

    res.json({
      ok: true,
      voucherCode,
      message:
        'Willkommen im MRKSHI Treue-Club! Dein 10,00 € Gutschein-Code TREUE10 ist sofort aktiv.',
    });
  });

  app.post('/api/checkout/create-session', async (req: Request, res: Response) => {
    const body = req.body as {
      items?: unknown;
      customerEmail?: unknown;
      whatsappNumber?: unknown;
      measurementsSummary?: unknown;
      giftNote?: unknown;
      voucherCode?: unknown;
      checkoutEventId?: unknown;
      fbc?: unknown;
      fbp?: unknown;
    };

    if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
      res.status(400).json({ error: 'Der Warenkorb ist leer oder ungültig.' });
      return;
    }

    const customerEmail =
      typeof body.customerEmail === 'string' ? body.customerEmail.trim().toLowerCase() : '';
    if (
      customerEmail &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail) || customerEmail.length > 120)
    ) {
      res.status(400).json({ error: 'Bitte eine gültige E-Mail-Adresse eingeben.' });
      return;
    }

    const whatsappNumber =
      typeof body.whatsappNumber === 'string' ? body.whatsappNumber.trim().slice(0, 32) : '';
    if (whatsappNumber && whatsappNumber.replace(/[^\d]/g, '').length < 6) {
      res.status(400).json({
        error: 'Bitte eine gültige WhatsApp-Nummer eingeben oder das Feld leer lassen.',
      });
      return;
    }

    const measurementsSummary =
      typeof body.measurementsSummary === 'string'
        ? body.measurementsSummary.trim().slice(0, 180)
        : '';
    const giftNote = typeof body.giftNote === 'string' ? body.giftNote.trim().slice(0, 200) : '';
    const rawVoucher =
      typeof body.voucherCode === 'string' ? body.voucherCode.trim().toUpperCase() : '';
    const clientIp =
      (typeof req.headers['cf-connecting-ip'] === 'string' && req.headers['cf-connecting-ip']) ||
      req.ip ||
      '';
    const clientUserAgent =
      typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 250) : '';
    const checkoutEventId =
      typeof body.checkoutEventId === 'string' && body.checkoutEventId.trim()
        ? body.checkoutEventId.trim().slice(0, 80)
        : `ic_${Date.now()}`;
    const fbc = typeof body.fbc === 'string' ? body.fbc.trim().slice(0, 180) : '';
    const fbp = typeof body.fbp === 'string' ? body.fbp.trim().slice(0, 120) : '';

    const validatedLines: OrderItemRecord[] = [];
    let totalJacketQty = 0;
    let includesOneEuroTest = false;

    for (const rawItem of body.items) {
      if (!rawItem || typeof rawItem !== 'object') {
        res.status(400).json({ error: 'Ungültiger Artikel im Warenkorb.' });
        return;
      }
      const item = rawItem as Partial<CheckoutCartItemInput>;
      const productId = typeof item.productId === 'string' ? item.productId.trim() : '';
      const product = store.products.find((p) => p.id === productId && p.active);
      if (!product) {
        res.status(400).json({ error: `Unbekanntes oder pausiertes Produkt: ${productId}` });
        return;
      }
      if (product.stockTotal <= 0) {
        res.status(400).json({ error: `${product.name} ist aktuell leider ausverkauft.` });
        return;
      }

      const colorId = typeof item.colorId === 'string' ? item.colorId.trim() : '';
      const rawColorName =
        typeof item.colorName === 'string' ? item.colorName.trim().slice(0, 40) : '';
      const matchedColor =
        product.colors.find((c) => c.id === colorId) ??
        (rawColorName
          ? product.colors.find((c) => c.name.toLowerCase() === rawColorName.toLowerCase())
          : undefined);

      if (matchedColor?.outOfStock) {
        res.status(400).json({
          error: `${product.name} in der Farbe „${matchedColor.name}“ ist aktuell leider ausverkauft. Bitte wähle eine andere verfügbare Farbe.`,
        });
        return;
      }

      const colorName = matchedColor?.name ?? (rawColorName || product.colors[0]?.name || 'Signature');

      const quantity = Number.isInteger(item.quantity) ? Number(item.quantity) : 1;
      if (quantity < 1 || quantity > 10) {
        res.status(400).json({ error: 'Ungültige Artikelanzahl (1–10 erlaubt).' });
        return;
      }

      const sizeLabel =
        typeof item.sizeLabel === 'string' && item.sizeLabel.trim().length > 0
          ? item.sizeLabel.trim().slice(0, 40)
          : 'M';
      const customMeasure =
        typeof item.customMeasure === 'string' ? item.customMeasure.trim().slice(0, 160) : '';

      const isAdminOneEuroTest = store.oneEuroTestProductId === product.id;
      if (isAdminOneEuroTest) includesOneEuroTest = true;

      // Authoritative EUR price enforced server-side (1 EUR strictly when Admin 1-EUR Live Test is active)
      const safePriceEur = isAdminOneEuroTest
        ? 1
        : Math.min(999, Math.max(49, Math.round(product.priceEur)));

      totalJacketQty += quantity;
      validatedLines.push({
        productId,
        name: product.name,
        colorName,
        sizeLabel,
        customMeasure,
        giftWrap: Boolean(item.giftWrap),
        unitAmountCents: safePriceEur * 100,
        quantity,
      });
    }

    const subtotalCents = validatedLines.reduce(
      (sum, line) => sum + line.unitAmountCents * line.quantity,
      0
    );

    // Loyalty Voucher ONLY (TREUE10 / MRKSHI10 / BLACKFRIDAY / VIP10 -> -10 EUR)
    const VALID_VOUCHERS = new Set(['TREUE10', 'MRKSHI10', 'BLACKFRIDAY', 'VIP10']);
    const voucherValid =
      !includesOneEuroTest && subtotalCents >= 4900 && VALID_VOUCHERS.has(rawVoucher);
    const voucherDiscountCents = voucherValid ? 1000 : 0;
    const totalDiscountCents = voucherDiscountCents;
    const totalCents = Math.max(100, subtotalCents - totalDiscountCents);

    const discountLabels: string[] = [];
    if (voucherDiscountCents > 0) discountLabels.push(`Gutschein ${rawVoucher} (-10 €)`);

    const orderId = `MRK-${store.orderCounter++}`;
    const stripe = getStripeClient();
    const baseUrl = resolveBaseUrl(req);

    // Fire Server-Side Meta CAPI InitiateCheckout non-blocking (deduplicated with Browser Pixel via checkoutEventId)
    sendMetaCapiEvent({
      eventName: 'InitiateCheckout',
      eventId: checkoutEventId,
      valueEur: totalCents / 100,
      contentIds: validatedLines.map((l) => l.productId),
      numItems: totalJacketQty,
      customerEmail: customerEmail || undefined,
      phone: whatsappNumber || undefined,
      clientIp,
      clientUserAgent,
      fbc: fbc || undefined,
      fbp: fbp || undefined,
    }).catch(() => {});

    if (!stripe) {
      const previewSessionId = `cs_preview_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const order: OrderRecord = {
        id: orderId,
        sessionId: previewSessionId,
        mode: 'preview',
        status: 'pending_payment',
        customerEmail,
        whatsappNumber,
        measurementsSummary:
          measurementsSummary || validatedLines.map((l) => l.customMeasure).filter(Boolean).join(' | '),
        giftNote: [giftNote, discountLabels.length > 0 ? discountLabels.join(' + ') : null]
          .filter(Boolean)
          .join(' | '),
        totalCents,
        currency: 'EUR',
        items: validatedLines,
        n8nSent: false,
        telegramSent: false,
        inventoryDecremented: false,
        createdAt: new Date().toISOString(),
      };
      store.orders.unshift(order);
      persistStoreState();

      res.json({
        mode: 'preview',
        orderId,
        sessionId: previewSessionId,
        totalCents,
        discountCents: totalDiscountCents,
        currency: 'EUR',
        lines: validatedLines,
        message:
          'Stripe-Vorschau bereit: Hinterlege STRIPE_SECRET_KEY (sk_live_...) in den Secrets für Live-Zahlungen (Apple Pay, Klarna, PayPal, SEPA).',
      });
      return;
    }

    try {
      let stripeDiscounts: Array<{ coupon: string }> | undefined;
      let fallbackInlineDiscountCents = 0;
      if (totalDiscountCents > 0) {
        try {
          const coupon = await stripe.coupons.create({
            amount_off: totalDiscountCents,
            currency: 'eur',
            duration: 'once',
            name: discountLabels.join(' + ').slice(0, 40) || 'MRKSHI Atelier-Vorteil',
          });
          stripeDiscounts = [{ coupon: coupon.id }];
        } catch (couponErr) {
          console.warn(
            '[Stripe Coupon Fallback] Coupon konnte nicht erstellt werden, Rabatt wird direkt auf Artikel angewendet:',
            couponErr instanceof Error ? couponErr.message : couponErr
          );
          fallbackInlineDiscountCents = totalDiscountCents;
        }
      }

      const lineItemsForStripe = validatedLines.map((line, index) => {
        const detailsParts = [
          `Farbe: ${line.colorName}`,
          `Größe: ${line.sizeLabel}`,
          line.customMeasure ? `Maß: ${line.customMeasure}` : null,
          line.giftWrap ? 'Inkl. Weihnachts-Geschenkbox' : null,
          fallbackInlineDiscountCents > 0 && index === 0 && discountLabels.length > 0
            ? `Rabatt abgezogen: ${discountLabels.join(' + ')}`
            : null,
        ].filter(Boolean);

        let unitAmount = line.unitAmountCents;
        if (fallbackInlineDiscountCents > 0 && index === 0) {
          const maxDeductiblePerUnit = Math.floor(fallbackInlineDiscountCents / line.quantity);
          const actualDeduct = Math.min(Math.max(0, unitAmount - 100), maxDeductiblePerUnit);
          unitAmount -= actualDeduct;
          fallbackInlineDiscountCents -= actualDeduct * line.quantity;
        }

        return {
          quantity: line.quantity,
          price_data: {
            currency: 'eur',
            unit_amount: unitAmount,
            product_data: {
              name: `${line.name} — ${line.colorName}`,
              description: detailsParts.join(' · ') || 'MRKSHI Marokko Naturleder',
            },
          },
        };
      });

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        locale: 'de',
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        shipping_address_collection: {
          allowed_countries: ['DE', 'AT', 'CH'],
        },
        billing_address_collection: 'auto',
        phone_number_collection: {
          enabled: true,
        },
        ...(stripeDiscounts
          ? { discounts: stripeDiscounts }
          : { allow_promotion_codes: true }),
        line_items: lineItemsForStripe,
        metadata: {
          origin: 'MRKSHI_DE_STOREFRONT',
          orderId,
          whatsappNumber: whatsappNumber || 'via Stripe Checkout',
          measurementsSummary: measurementsSummary.slice(0, 450),
          giftNote: giftNote.slice(0, 300),
          discountsApplied: discountLabels.join(', '),
          oneEuroLiveTest: includesOneEuroTest ? 'true' : 'false',
        },
        success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?checkout=cancelled`,
      });

      const order: OrderRecord = {
        id: orderId,
        sessionId: session.id,
        mode: 'stripe',
        status: 'pending_payment',
        customerEmail,
        whatsappNumber,
        measurementsSummary:
          measurementsSummary || validatedLines.map((l) => l.customMeasure).filter(Boolean).join(' | '),
        giftNote: [giftNote, discountLabels.length > 0 ? discountLabels.join(' + ') : null]
          .filter(Boolean)
          .join(' | '),
        totalCents,
        currency: 'EUR',
        items: validatedLines,
        n8nSent: false,
        telegramSent: false,
        inventoryDecremented: false,
        clientIp,
        clientUserAgent,
        fbc: fbc || undefined,
        fbp: fbp || undefined,
        createdAt: new Date().toISOString(),
      };
      store.orders.unshift(order);
      persistStoreState();

      res.json({
        mode: 'stripe',
        orderId,
        sessionId: session.id,
        url: session.url,
        totalCents,
        discountCents: totalDiscountCents,
        currency: 'EUR',
      });
    } catch (err) {
      console.error('[Stripe Checkout Error]', err);
      const rawMessage =
        err instanceof Error ? err.message : 'Stripe Checkout konnte nicht erstellt werden.';
      const friendlyMessage = rawMessage.toLowerCase().includes('invalid api key')
        ? 'Stripe API-Schlüssel (STRIPE_SECRET_KEY) ist ungültig. Bitte im Server .env prüfen.'
        : rawMessage;
      // Return HTTP 400 (never 502) so Cloudflare never replaces the JSON payload with an HTML 502 page
      res.status(400).json({ error: friendlyMessage });
    }
  });

  app.post('/api/checkout/complete-preview', async (req: Request, res: Response) => {
    const body = req.body as { sessionId?: unknown };
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : '';
    const order = store.orders.find((o) => o.sessionId === sessionId && o.mode === 'preview');
    if (!order) {
      res.status(404).json({ error: 'Vorschau-Bestellung nicht gefunden.' });
      return;
    }
    const updated = await markOrderPaidAndDispatch(order);
    res.json({
      ok: true,
      orderId: updated.id,
      n8nSent: updated.n8nSent,
      telegramSent: updated.telegramSent,
    });
  });

  app.get('/api/checkout/session-status', async (req: Request, res: Response) => {
    const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id.trim() : '';
    if (!sessionId || sessionId.length > 120) {
      res.status(400).json({ error: 'Ungültige Session-ID.' });
      return;
    }

    const existingOrder = store.orders.find((o) => o.sessionId === sessionId);

    if (sessionId.startsWith('cs_preview_')) {
      if (existingOrder) {
        await markOrderPaidAndDispatch(existingOrder);
      }
      res.json({
        status: 'complete',
        paymentStatus: 'paid',
        amountTotalCents: existingOrder?.totalCents ?? 17700,
        orderId: existingOrder?.id,
        n8nSent: existingOrder?.n8nSent ?? false,
        telegramSent: existingOrder?.telegramSent ?? false,
        currency: 'eur',
        mode: 'preview',
      });
      return;
    }

    const stripe = getStripeClient();
    if (!stripe) {
      res.status(400).json({ error: 'Stripe ist nicht konfiguriert.' });
      return;
    }

    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (existingOrder && session.payment_status === 'paid') {
        enrichOrderFromStripeSession(existingOrder, session);
        await markOrderPaidAndDispatch(existingOrder);
      }
      res.json({
        status: session.status,
        paymentStatus: session.payment_status,
        amountTotalCents: session.amount_total ?? 0,
        currency: session.currency ?? 'eur',
        customerEmail: session.customer_details?.email ?? null,
        orderId: existingOrder?.id,
        contentIds: existingOrder?.items.map((i) => i.productId) ?? ['khabibi'],
        numItems: existingOrder?.items.reduce((s, i) => s + i.quantity, 0) ?? 1,
        n8nSent: existingOrder?.n8nSent ?? false,
        telegramSent: existingOrder?.telegramSent ?? false,
        capiSent: existingOrder?.capiSent ?? false,
        mode: 'stripe',
      });
    } catch {
      res.status(404).json({ error: 'Checkout-Session nicht gefunden.' });
    }
  });

  // Post-payment bespoke measurements submission ("Sondermaß nach Bezahlung")
  app.post('/api/orders/post-payment-measure', async (req: Request, res: Response) => {
    const body = req.body as {
      sessionId?: unknown;
      heightCm?: unknown;
      weightKg?: unknown;
      chestCm?: unknown;
      sleeveCm?: unknown;
      note?: unknown;
    };

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim().slice(0, 140) : '';
    if (!sessionId) {
      res.status(400).json({ error: 'Gültige Bestell-Referenz erforderlich.' });
      return;
    }

    const order = store.orders.find((o) => o.sessionId === sessionId);
    if (!order) {
      res.status(404).json({ error: 'Bestellung nicht gefunden.' });
      return;
    }

    let isPaid = order.status === 'paid';
    if (!isPaid && order.mode === 'stripe') {
      const stripe = getStripeClient();
      if (stripe) {
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          if (session.payment_status === 'paid') {
            await markOrderPaidAndDispatch(order);
            isPaid = true;
          }
        } catch {
          // handled by status check below
        }
      }
    }
    if (!isPaid) {
      res.status(403).json({
        error: 'Sondermaß-Nachtrag ist erst nach abgeschlossener Bezahlung möglich.',
      });
      return;
    }

    const parseBoundedInt = (val: unknown, min: number, max: number): number | null => {
      const n = typeof val === 'number' ? val : typeof val === 'string' && val.trim() ? Number(val) : NaN;
      if (!Number.isFinite(n)) return null;
      const rounded = Math.round(n);
      if (rounded < min || rounded > max) return null;
      return rounded;
    };

    const heightCm = parseBoundedInt(body.heightCm, 130, 230);
    const weightKg = parseBoundedInt(body.weightKg, 40, 200);
    const chestCm = parseBoundedInt(body.chestCm, 75, 165);
    const sleeveCm = parseBoundedInt(body.sleeveCm, 50, 85);
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 200) : '';

    if (!heightCm && !weightKg && !chestCm && !sleeveCm && !note) {
      res.status(400).json({ error: 'Bitte mindestens ein Körpermaß oder einen Passform-Hinweis angeben.' });
      return;
    }

    const parts: string[] = [];
    if (heightCm) parts.push(`Größe ${heightCm} cm`);
    if (weightKg) parts.push(`Gewicht ${weightKg} kg`);
    if (chestCm) parts.push(`Brust ${chestCm} cm`);
    if (sleeveCm) parts.push(`Ärmel ${sleeveCm} cm`);
    if (note) parts.push(`Hinweis: ${note}`);

    const bespokeSummary = `SONDERMAẞ NACH BEZAHLUNG: ${parts.join(' · ')}`.slice(0, 320);
    order.measurementsSummary = bespokeSummary;
    persistStoreState();

    // Dispatch immediate bespoke update to n8n & Telegram
    const cleanPhone = order.whatsappNumber.replace(/[^\d]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '';

    let n8nUpdated = false;
    const n8nUrl = (process.env.N8N_WEBHOOK_URL ?? '').trim();
    if (n8nUrl && isSafeWebhookUrl(n8nUrl)) {
      try {
        const resp = await fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'mrkshi.order.sondermass_updated',
            source: 'reverse-shopify-mrkshi',
            domain: 'mrkshi.com',
            orderId: order.id,
            sessionId: order.sessionId,
            customerEmail: order.customerEmail,
            whatsappNumber: order.whatsappNumber,
            whatsappLink: waLink,
            measurementsSummary: bespokeSummary,
            items: order.items,
            updatedAt: new Date().toISOString(),
          }),
        });
        if (resp.ok) n8nUpdated = true;
      } catch {
        // non-fatal
      }
    }

    let telegramUpdated = false;
    const tgToken = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
    const tgChatId = (process.env.TELEGRAM_CHAT_ID ?? '').trim();
    if (tgToken && tgChatId) {
      const msgText = [
        `📏 SONDERMAẞ NACHTRAG (${order.id})`,
        `Kunde: ${order.customerEmail}`,
        `📱 WhatsApp: ${order.whatsappNumber}`,
        waLink ? `💬 Chat: ${waLink}` : '',
        ``,
        bespokeSummary,
      ]
        .filter(Boolean)
        .join('\n');

      try {
        const tgResp = await fetch(
          `https://api.telegram.org/bot${encodeURIComponent(tgToken)}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: tgChatId,
              text: msgText,
              disable_web_page_preview: true,
            }),
          }
        );
        if (tgResp.ok) telegramUpdated = true;
      } catch {
        // non-fatal
      }
    }

    res.json({
      ok: true,
      orderId: order.id,
      measurementsSummary: bespokeSummary,
      n8nUpdated,
      telegramUpdated,
    });
  });

  // --- Reverse-Shopify Admin Auth & Management API ---
  app.get('/api/admin/auth-status', (_req: Request, res: Response) => {
    const hasEnv = Boolean(cleanEnvSecret(process.env.ADMIN_PASSCODE));
    res.json({
      initialized: hasEnv || Boolean(store.adminPasswordHash),
    });
  });

  app.post('/api/admin/bootstrap', (req: Request, res: Response) => {
    const hasEnv = Boolean(cleanEnvSecret(process.env.ADMIN_PASSCODE));
    if (hasEnv || store.adminPasswordHash) {
      res.status(403).json({ error: 'Admin-Passwort wurde bereits eingerichtet.' });
      return;
    }
    const body = req.body as { passcode?: unknown };
    const passcode = typeof body.passcode === 'string' ? body.passcode.trim() : '';
    if (passcode.length < 6 || passcode.length > 100) {
      res.status(400).json({ error: 'Passwort muss zwischen 6 und 100 Zeichen lang sein.' });
      return;
    }
    store.adminPasswordHash = hashPasscode(passcode);
    persistStoreState();
    const token = issueAdminToken();
    res.json({ token });
  });

  app.post('/api/admin/login', (req: Request, res: Response) => {
    const body = req.body as { passcode?: unknown };
    const passcode = typeof body.passcode === 'string' ? body.passcode.trim() : '';
    const envPass = cleanEnvSecret(process.env.ADMIN_PASSCODE);

    let ok = false;
    if (envPass && verifyPlainSecret(passcode, envPass)) {
      ok = true;
    } else if (store.adminPasswordHash && verifyScryptPasscode(passcode, store.adminPasswordHash)) {
      ok = true;
    }

    if (!ok) {
      res.status(401).json({ error: 'Falsches Admin-Passwort.' });
      return;
    }

    res.json({ token: issueAdminToken() });
  });

  // Public read-only exporter & customs metadata for storefront legal pages
  app.get('/api/exporter-info', (_req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(store.exporterSettings);
  });

  let lastAutoStripeSyncAt = 0;
  async function syncRecentStripeOrders(
    force = false
  ): Promise<{ syncedCount: number; paidRecoveredCount: number }> {
    const now = Date.now();
    if (!force && now - lastAutoStripeSyncAt < 15_000) {
      return { syncedCount: 0, paidRecoveredCount: 0 };
    }
    lastAutoStripeSyncAt = now;

    const stripe = getStripeClient();
    if (!stripe) return { syncedCount: 0, paidRecoveredCount: 0 };

    const candidates = store.orders
      .filter(
        (o) =>
          o.mode === 'stripe' &&
          o.sessionId &&
          !o.sessionId.startsWith('cs_preview_') &&
          (o.status !== 'paid' || !o.shippingAddress?.street || !o.customerName)
      )
      .slice(0, 20);

    if (candidates.length === 0) {
      return { syncedCount: 0, paidRecoveredCount: 0 };
    }

    let syncedCount = 0;
    let paidRecoveredCount = 0;
    let dirty = false;

    for (const ord of candidates) {
      try {
        const session = await stripe.checkout.sessions.retrieve(ord.sessionId);
        const enriched = enrichOrderFromStripeSession(ord, session);
        if (enriched) {
          syncedCount += 1;
          dirty = true;
        }
        if (session.payment_status === 'paid' && ord.status !== 'paid') {
          await markOrderPaidAndDispatch(ord);
          paidRecoveredCount += 1;
          syncedCount += 1;
          dirty = false; // markOrderPaidAndDispatch already persisted
        }
      } catch {
        // Ignore expired or test/live mismatched sessions cleanly
      }
    }

    if (dirty) {
      persistStoreState();
    }
    return { syncedCount, paidRecoveredCount };
  }

  app.get('/api/admin/state', requireAdminAuth, async (_req: Request, res: Response) => {
    await syncRecentStripeOrders(false);

    const sk = cleanEnvSecret(process.env.STRIPE_SECRET_KEY);
    const stripeMode = sk.startsWith('sk_live_')
      ? 'live'
      : sk.startsWith('sk_test_')
      ? 'test'
      : 'unset';

    const cfEmail = resolveCloudflareEmailCredentials();

    res.json({
      products: store.products,
      orders: store.orders,
      newsletter: store.newsletter,
      oneEuroTestProductId: store.oneEuroTestProductId,
      exporterSettings: store.exporterSettings,
      cloudflareEmail: {
        configured: cfEmail.configured,
        accountId: cfEmail.accountId,
        hasApiToken: Boolean(cfEmail.apiToken),
        fromAddress: cfEmail.fromAddress,
        fromName: cfEmail.fromName,
        autoOrderConfirmation: cfEmail.autoOrderConfirmation,
        autoTrackingEmail: cfEmail.autoTrackingEmail,
        autoVoucherWelcome: cfEmail.autoVoucherWelcome,
      },
      integrations: {
        stripeConfigured: Boolean(sk),
        stripeMode,
        stripeWebhookConfigured: Boolean(cleanEnvSecret(process.env.STRIPE_WEBHOOK_SECRET)),
        n8nConfigured: Boolean(cleanEnvSecret(process.env.N8N_WEBHOOK_URL)),
        telegramConfigured: Boolean(
          cleanEnvSecret(process.env.TELEGRAM_BOT_TOKEN) &&
            cleanEnvSecret(process.env.TELEGRAM_CHAT_ID)
        ),
        capiConfigured: Boolean(cleanEnvSecret(process.env.META_CAPI_ACCESS_TOKEN)),
        emailConfigured: cfEmail.configured,
        emailFrom: cfEmail.fromAddress,
        pixelId: store.pixelConfig.pixelId || '',
        domain: 'www.mrkshi.com',
      },
    });
  });

  app.put('/api/admin/cloudflare-email', requireAdminAuth, (req: Request, res: Response) => {
    const body = (req.body ?? {}) as {
      accountId?: unknown;
      apiToken?: unknown;
      fromAddress?: unknown;
      fromName?: unknown;
      autoOrderConfirmation?: unknown;
      autoTrackingEmail?: unknown;
      autoVoucherWelcome?: unknown;
    };

    const cur = store.cloudflareEmail;
    if (typeof body.accountId === 'string') {
      cur.accountId = body.accountId.trim().slice(0, 80);
    }
    if (typeof body.apiToken === 'string' && body.apiToken.trim().length > 0) {
      cur.apiToken = body.apiToken.trim().slice(0, 200);
    }
    if (typeof body.fromAddress === 'string' && body.fromAddress.includes('@')) {
      cur.fromAddress = body.fromAddress.trim().toLowerCase().slice(0, 100);
    }
    if (typeof body.fromName === 'string' && body.fromName.trim()) {
      cur.fromName = body.fromName.trim().slice(0, 80);
    }
    if (typeof body.autoOrderConfirmation === 'boolean') {
      cur.autoOrderConfirmation = body.autoOrderConfirmation;
    }
    if (typeof body.autoTrackingEmail === 'boolean') {
      cur.autoTrackingEmail = body.autoTrackingEmail;
    }
    if (typeof body.autoVoucherWelcome === 'boolean') {
      cur.autoVoucherWelcome = body.autoVoucherWelcome;
    }

    persistStoreState();
    const resolved = resolveCloudflareEmailCredentials();
    res.json({
      ok: true,
      cloudflareEmail: {
        configured: resolved.configured,
        accountId: resolved.accountId,
        hasApiToken: Boolean(resolved.apiToken),
        fromAddress: resolved.fromAddress,
        fromName: resolved.fromName,
        autoOrderConfirmation: resolved.autoOrderConfirmation,
        autoTrackingEmail: resolved.autoTrackingEmail,
        autoVoucherWelcome: resolved.autoVoucherWelcome,
      },
      message: resolved.configured
        ? `Cloudflare Email Sending verbunden (${resolved.fromAddress}).`
        : 'Einstellungen gespeichert (bitte Account-ID & API-Token ergänzen).',
    });
  });

  app.post('/api/admin/test-email', requireAdminAuth, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as { to?: unknown };
    const to = typeof body.to === 'string' ? body.to.trim().toLowerCase() : '';
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      res.status(400).json({ error: 'Bitte eine echte Empfänger-E-Mail-Adresse eingeben.' });
      return;
    }
    const creds = resolveCloudflareEmailCredentials();
    const result = await sendCloudflareTransactionalEmail({
      to,
      subject: 'MRKSHI Atelier — Cloudflare Email Live-Test erfolgreich',
      text: `Dein Cloudflare Email Sending über ${creds.fromAddress} (www.mrkshi.com) ist aktiv und SPF/DKIM-signiert.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;border:2px solid #000;background:#fff;color:#111">
        <div style="background:#0B0B0B;color:#fff;padding:18px 22px;border-bottom:2px solid #D6B370">
          <strong style="font-size:20px;letter-spacing:0.08em">MRKSHI</strong> · <span style="color:#D6B370;font-size:12px">CLOUDFLARE EMAIL TEST</span>
        </div>
        <div style="padding:22px;font-size:14px;line-height:1.6">
          <p style="margin:0 0 10px"><strong>✓ Verbindung steht!</strong></p>
          <p style="margin:0;color:#444">Dein MRKSHI Shop versendet jetzt Bestellbestätigungen, Tracking-Nummern und Gutschein-Codes direkt über <strong>${escapeHtml(creds.fromAddress)}</strong> mit automatischer Cloudflare SPF- &amp; DKIM-Signatur.</p>
        </div>
      </div>`,
    });
    if (!result.ok) {
      res.status(400).json({ error: result.detail });
      return;
    }
    res.json({ ok: true, message: result.detail });
  });

  app.post('/api/admin/orders/:id/send-email', requireAdminAuth, async (req: Request, res: Response) => {
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Bestellung nicht gefunden.' });
      return;
    }
    const body = (req.body ?? {}) as { type?: unknown };
    const mailType =
      body.type === 'tracking' || (body.type !== 'confirmation' && Boolean(order.trackingNumber))
        ? 'tracking'
        : 'confirmation';

    const result =
      mailType === 'tracking'
        ? await sendOrderTrackingEmail(order)
        : await sendOrderConfirmationEmail(order);

    if (!result.ok) {
      res.status(400).json({ error: result.detail });
      return;
    }
    res.json({
      ok: true,
      order,
      orders: store.orders,
      message: `${mailType === 'tracking' ? 'Tracking-Mail' : 'Bestellbestätigung'} gesendet: ${result.detail}`,
    });
  });

  app.put('/api/admin/exporter-settings', requireAdminAuth, (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Partial<Record<keyof ExporterSettings, unknown>>;
    const cleanStr = (val: unknown, fallback: string, maxLen = 140) =>
      typeof val === 'string' ? val.trim().slice(0, maxLen) : fallback;

    const cur = store.exporterSettings;
    const nextWeight =
      typeof body.defaultWeightKg === 'number' && Number.isFinite(body.defaultWeightKg)
        ? Math.min(25, Math.max(0.2, Number(body.defaultWeightKg.toFixed(2))))
        : cur.defaultWeightKg;

    store.exporterSettings = {
      companyName: cleanStr(body.companyName, cur.companyName, 100) || 'MRKSHI Atelier',
      legalFormNote: cleanStr(body.legalFormNote, cur.legalFormNote, 120),
      street: cleanStr(body.street, cur.street, 140),
      cityZip: cleanStr(body.cityZip, cur.cityZip, 90),
      country: cleanStr(body.country, cur.country, 60) || 'Morocco',
      iceNumber: cleanStr(body.iceNumber, cur.iceNumber, 90),
      email: cleanStr(body.email, cur.email, 100) || 'service@mrkshi.com',
      phoneMorocco: cleanStr(body.phoneMorocco, cur.phoneMorocco, 50),
      phoneSupportDe: cleanStr(body.phoneSupportDe, cur.phoneSupportDe, 50),
      returnNameDe: cleanStr(body.returnNameDe, cur.returnNameDe, 90) || 'MRKSHI',
      returnStreetDe: cleanStr(body.returnStreetDe, cur.returnStreetDe, 120) || 'Alte Dorfstraße 3a',
      returnCityZipDe: cleanStr(body.returnCityZipDe, cur.returnCityZipDe, 80) || '61137 Schöneck',
      defaultHsCode:
        cleanStr(body.defaultHsCode, cur.defaultHsCode, 20).replace(/[^0-9.]/g, '') || '42031000',
      defaultIncoterms: body.defaultIncoterms === 'DAP' ? 'DAP' : 'DDP',
      defaultWeightKg: nextWeight,
      dispatchMode: body.dispatchMode === 'schoeneck_hub' ? 'schoeneck_hub' : 'casablanca_direct',
    };
    persistStoreState();
    res.json({
      ok: true,
      exporterSettings: store.exporterSettings,
      message: 'Exporteur-, SARL- & Zoll-Stammdaten gespeichert.',
    });
  });

  app.post('/api/admin/orders/sync-stripe', requireAdminAuth, async (_req: Request, res: Response) => {
    const { syncedCount, paidRecoveredCount } = await syncRecentStripeOrders(true);
    res.json({
      ok: true,
      orders: store.orders,
      syncedCount,
      paidRecoveredCount,
      message:
        syncedCount > 0
          ? `${syncedCount} Stripe-Bestellung(en) synchronisiert (${paidRecoveredCount} Zahlung(en) auf Bezahlt aktualisiert).`
          : 'Alle Stripe-Bestellungen sind bereits aktuell.',
    });
  });

  app.patch('/api/admin/orders/:id', requireAdminAuth, async (req: Request, res: Response) => {
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Bestellung nicht gefunden.' });
      return;
    }

    const body = (req.body ?? {}) as {
      status?: unknown;
      fulfillmentStatus?: unknown;
      carrier?: unknown;
      trackingNumber?: unknown;
      customerName?: unknown;
      customerEmail?: unknown;
      whatsappNumber?: unknown;
      measurementsSummary?: unknown;
      giftNote?: unknown;
      shippingAddress?: Partial<Record<keyof OrderShippingAddress, unknown>>;
    };

    if (typeof body.customerName === 'string') {
      order.customerName = body.customerName.trim().slice(0, 120);
    }
    if (typeof body.customerEmail === 'string') {
      order.customerEmail = body.customerEmail.trim().toLowerCase().slice(0, 120);
    }
    if (typeof body.whatsappNumber === 'string') {
      order.whatsappNumber = body.whatsappNumber.trim().slice(0, 50);
    }
    if (typeof body.measurementsSummary === 'string') {
      order.measurementsSummary = body.measurementsSummary.trim().slice(0, 450);
    }
    if (typeof body.giftNote === 'string') {
      order.giftNote = body.giftNote.trim().slice(0, 350);
    }
    if (typeof body.carrier === 'string') {
      order.carrier = body.carrier.trim().slice(0, 60);
    }
    if (typeof body.trackingNumber === 'string') {
      order.trackingNumber = body.trackingNumber.trim().slice(0, 90);
    }
    if (
      body.fulfillmentStatus === 'unfulfilled' ||
      body.fulfillmentStatus === 'in_production' ||
      body.fulfillmentStatus === 'shipped'
    ) {
      order.fulfillmentStatus = body.fulfillmentStatus;
      if (body.fulfillmentStatus === 'shipped' && !order.shippedAt) {
        order.shippedAt = new Date().toISOString();
      }
    }

    if (body.shippingAddress && typeof body.shippingAddress === 'object') {
      const s = body.shippingAddress;
      const prev = order.shippingAddress ?? {
        name: order.customerName ?? '',
        street: '',
        zip: '',
        city: '',
        country: 'Germany',
      };
      const nextAddr: OrderShippingAddress = {
        name:
          typeof s.name === 'string'
            ? s.name.trim().slice(0, 120)
            : order.customerName || prev.name,
        street: typeof s.street === 'string' ? s.street.trim().slice(0, 140) : prev.street,
        ...(typeof s.line2 === 'string' && s.line2.trim()
          ? { line2: s.line2.trim().slice(0, 100) }
          : {}),
        zip: typeof s.zip === 'string' ? s.zip.trim().slice(0, 24) : prev.zip,
        city: typeof s.city === 'string' ? s.city.trim().slice(0, 90) : prev.city,
        country:
          typeof s.country === 'string' && s.country.trim()
            ? mapCountryName(s.country)
            : prev.country || 'Germany',
        phone:
          typeof s.phone === 'string' && s.phone.trim()
            ? s.phone.trim().slice(0, 50)
            : order.whatsappNumber || prev.phone,
      };
      order.shippingAddress = nextAddr;
      if (nextAddr.name && !order.customerName) {
        order.customerName = nextAddr.name;
      }
      order.shippingSummary = formatShippingSummaryFromAddress(nextAddr);
    }

    const wasShippedBefore = order.fulfillmentStatus === 'shipped' && Boolean(order.trackingEmailSent);
    if (body.status === 'paid' && order.status !== 'paid') {
      await markOrderPaidAndDispatch(order);
    } else if (body.status === 'pending_payment' || body.status === 'cancelled') {
      order.status = body.status;
      persistStoreState();
    } else {
      persistStoreState();
    }

    const cfCreds = resolveCloudflareEmailCredentials();
    if (
      cfCreds.configured &&
      cfCreds.autoTrackingEmail &&
      !wasShippedBefore &&
      order.fulfillmentStatus === 'shipped' &&
      order.trackingNumber &&
      order.customerEmail
    ) {
      await sendOrderTrackingEmail(order);
    }

    res.json({
      ok: true,
      order,
      orders: store.orders,
      message: `Bestellung ${order.id} gespeichert.`,
    });
  });

  app.post('/api/admin/one-euro-test', requireAdminAuth, (req: Request, res: Response) => {
    const body = req.body as { productId?: unknown };
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';

    if (!productId) {
      store.oneEuroTestProductId = null;
      persistStoreState();
      res.json({
        oneEuroTestProductId: null,
        products: store.products,
        message: '1,00 € Apple Pay Live-Testmodus beendet — alle regulären Preise wieder aktiv.',
      });
      return;
    }

    const found = store.products.find((p) => p.id === productId);
    if (!found) {
      res.status(404).json({ error: 'Test-Produkt nicht gefunden.' });
      return;
    }

    store.oneEuroTestProductId = found.id;
    persistStoreState();
    const publicProducts = store.products.map((prod) =>
      prod.id === store.oneEuroTestProductId ? { ...prod, priceEur: 1 } : prod
    );

    res.json({
      oneEuroTestProductId: store.oneEuroTestProductId,
      products: publicProducts,
      message: `${found.name} ist jetzt für den Apple Pay / sk_live_ Test auf 1,00 € gesetzt.`,
    });
  });

  app.get('/api/admin/export-newsletter-csv', requireAdminAuth, (_req: Request, res: Response) => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      'ID,Email,Lieblingsfarbe,Gutschein,DSGVO_Consent,Datum',
      ...store.newsletter.map((s) =>
        [
          esc(s.id),
          esc(s.email),
          esc(s.preferredColor),
          esc(s.voucherCode),
          esc(s.consentAccepted ? 'JA' : 'NEIN'),
          esc(s.createdAt),
        ].join(',')
      ),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="mrkshi-treue-newsletter.csv"');
    res.send(rows.join('\n'));
  });

  // --- 1st-Party Storefront Analytics Ingestion & Seller Analytics API ---
  app.post('/api/analytics/event', (req: Request, res: Response) => {
    const body = req.body as {
      sid?: unknown;
      type?: unknown;
      source?: unknown;
      device?: unknown;
      productId?: unknown;
      productName?: unknown;
      colorName?: unknown;
      valueEur?: unknown;
    };

    const allowedTypes = new Set([
      'page_view',
      'view_content',
      'add_to_cart',
      'initiate_checkout',
    ]);
    const type = typeof body.type === 'string' ? body.type : '';
    if (!allowedTypes.has(type)) {
      res.status(204).end();
      return;
    }

    const sid =
      typeof body.sid === 'string' && body.sid.trim()
        ? body.sid.trim().slice(0, 48)
        : `anon_${Date.now().toString(36)}`;
    const source =
      typeof body.source === 'string' && body.source.trim()
        ? body.source.trim().slice(0, 40)
        : 'Direkt';
    const device = body.device === 'mobile' ? 'mobile' : 'desktop';
    const now = Date.now();

    analyticsStore.events.push({
      ts: now,
      day: new Date(now).toISOString().slice(0, 10),
      sid,
      type: type as StoreAnalyticsEvent['type'],
      source,
      device,
      productId: typeof body.productId === 'string' ? body.productId.slice(0, 80) : undefined,
      productName: typeof body.productName === 'string' ? body.productName.slice(0, 80) : undefined,
      colorName: typeof body.colorName === 'string' ? body.colorName.slice(0, 50) : undefined,
      valueEur:
        typeof body.valueEur === 'number' && Number.isFinite(body.valueEur)
          ? Number(body.valueEur.toFixed(2))
          : undefined,
    });
    scheduleAnalyticsSave(false);
    res.status(204).end();
  });

  app.get('/api/admin/analytics', (req: Request, res: Response) => {
    // Allow either Admin Bearer token OR optional ANALYTICS_API_KEY (for n8n / AI tools)
    const apiKeyEnv = cleanEnvSecret(process.env.ANALYTICS_API_KEY);
    const providedKey =
      (typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'].trim() : '') ||
      (typeof req.query.api_key === 'string' ? req.query.api_key.trim() : '');

    let authorized = false;
    if (apiKeyEnv && providedKey && verifyPlainSecret(providedKey, apiKeyEnv)) {
      authorized = true;
    } else {
      const auth = req.headers.authorization ?? '';
      const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(auth.trim());
      if (match) {
        const exp = adminSessions.get(match[1]);
        if (exp && Date.now() <= exp) authorized = true;
      }
    }

    if (!authorized) {
      res.status(401).json({ error: 'Nicht autorisiert.' });
      return;
    }

    const daysParam = Number(req.query.days) || 0;
    const now = Date.now();
    const cutoffTs =
      daysParam > 0
        ? daysParam === 1
          ? new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z').getTime()
          : now - daysParam * 24 * 60 * 60 * 1000
        : 0;

    const filteredEvents = cutoffTs
      ? analyticsStore.events.filter((e) => e.ts >= cutoffTs)
      : analyticsStore.events;

    const paidOrders = store.orders.filter((o) => {
      if (o.status !== 'paid') return false;
      const t = new Date(o.paidAt ?? o.createdAt).getTime();
      return !cutoffTs || t >= cutoffTs;
    });

    const uniqueSessionSet = new Set<string>();
    const viewSessions = new Set<string>();
    const cartSessions = new Set<string>();
    const checkoutSessions = new Set<string>();

    let pageViews = 0;
    let viewContent = 0;
    let addToCart = 0;
    let initiateCheckout = 0;

    const sourceCounts = new Map<string, Set<string>>();
    const deviceSessions = { mobile: new Set<string>(), desktop: new Set<string>() };

    const productStats = new Map<
      string,
      {
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
      }
    >();

    for (const p of store.products) {
      productStats.set(p.id, {
        id: p.id,
        name: p.name,
        stockTotal: p.stockTotal,
        priceEur: p.priceEur,
        active: p.active,
        views: 0,
        carts: 0,
        checkouts: 0,
        purchases: 0,
        revenueEur: 0,
      });
    }

    for (const ev of filteredEvents) {
      if (ev.type !== 'purchase') {
        uniqueSessionSet.add(ev.sid);
        deviceSessions[ev.device === 'mobile' ? 'mobile' : 'desktop'].add(ev.sid);
        const srcKey = ev.source || 'Direkt';
        if (!sourceCounts.has(srcKey)) sourceCounts.set(srcKey, new Set());
        sourceCounts.get(srcKey)!.add(ev.sid);
      }

      if (ev.type === 'page_view') pageViews++;
      if (ev.type === 'view_content') {
        viewContent++;
        viewSessions.add(ev.sid);
        if (ev.productId && productStats.has(ev.productId)) {
          productStats.get(ev.productId)!.views++;
        }
      }
      if (ev.type === 'add_to_cart') {
        addToCart++;
        cartSessions.add(ev.sid);
        if (ev.productId && productStats.has(ev.productId)) {
          productStats.get(ev.productId)!.carts++;
        }
      }
      if (ev.type === 'initiate_checkout') {
        initiateCheckout++;
        checkoutSessions.add(ev.sid);
        if (ev.productId && productStats.has(ev.productId)) {
          productStats.get(ev.productId)!.checkouts++;
        }
      }
    }

    let revenueEur = 0;
    for (const ord of paidOrders) {
      const eur = Number((ord.totalCents / 100).toFixed(2));
      revenueEur += eur;
      for (const item of ord.items) {
        const st = productStats.get(item.productId);
        if (st) {
          st.purchases += item.quantity;
          st.revenueEur += Number(((item.unitAmountCents * item.quantity) / 100).toFixed(2));
        }
      }
    }

    const uniqueVisitors = uniqueSessionSet.size;
    const paidCount = paidOrders.length;
    const pct = (num: number, den: number) =>
      den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0;

    // Last 14 days breakdown
    const dailyMap = new Map<
      string,
      {
        day: string;
        visitorsSet: Set<string>;
        pageViews: number;
        carts: number;
        checkouts: number;
        orders: number;
        revenueEur: number;
      }
    >();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * 86400000).toISOString().slice(0, 10);
      dailyMap.set(d, {
        day: d,
        visitorsSet: new Set(),
        pageViews: 0,
        carts: 0,
        checkouts: 0,
        orders: 0,
        revenueEur: 0,
      });
    }
    for (const ev of analyticsStore.events) {
      const slot = dailyMap.get(ev.day);
      if (!slot) continue;
      if (ev.type !== 'purchase') slot.visitorsSet.add(ev.sid);
      if (ev.type === 'page_view') slot.pageViews++;
      if (ev.type === 'add_to_cart') slot.carts++;
      if (ev.type === 'initiate_checkout') slot.checkouts++;
    }
    for (const ord of store.orders) {
      if (ord.status !== 'paid') continue;
      const d = (ord.paidAt ?? ord.createdAt).slice(0, 10);
      const slot = dailyMap.get(d);
      if (slot) {
        slot.orders++;
        slot.revenueEur = Number((slot.revenueEur + ord.totalCents / 100).toFixed(2));
      }
    }

    const daily = Array.from(dailyMap.values()).map((d) => ({
      day: d.day,
      visitors: d.visitorsSet.size,
      pageViews: d.pageViews,
      carts: d.carts,
      checkouts: d.checkouts,
      orders: d.orders,
      revenueEur: d.revenueEur,
    }));

    const sources = Array.from(sourceCounts.entries())
      .map(([source, set]) => ({ source, visitors: set.size }))
      .sort((a, b) => b.visitors - a.visitors);

    res.json({
      generatedAt: new Date().toISOString(),
      rangeDays: daysParam || 'all',
      kpis: {
        uniqueVisitors,
        pageViews,
        viewContent,
        addToCart,
        initiateCheckout,
        paidOrders: paidCount,
        revenueEur: Number(revenueEur.toFixed(2)),
        aovEur: paidCount > 0 ? Number((revenueEur / paidCount).toFixed(2)) : 0,
        atcRatePct: pct(cartSessions.size || addToCart, Math.max(uniqueVisitors, 1)),
        checkoutRatePct: pct(checkoutSessions.size || initiateCheckout, Math.max(uniqueVisitors, 1)),
        conversionRatePct: pct(paidCount, Math.max(uniqueVisitors, 1)),
      },
      funnel: [
        { step: 'Besucher', count: uniqueVisitors, pct: 100 },
        {
          step: 'Produkt angesehen',
          count: viewSessions.size || viewContent,
          pct: pct(viewSessions.size || viewContent, uniqueVisitors),
        },
        {
          step: 'In den Warenkorb',
          count: cartSessions.size || addToCart,
          pct: pct(cartSessions.size || addToCart, uniqueVisitors),
        },
        {
          step: 'Checkout gestartet',
          count: checkoutSessions.size || initiateCheckout,
          pct: pct(checkoutSessions.size || initiateCheckout, uniqueVisitors),
        },
        {
          step: 'Kauf abgeschlossen',
          count: paidCount,
          pct: pct(paidCount, uniqueVisitors),
        },
      ],
      devices: {
        mobile: deviceSessions.mobile.size,
        desktop: deviceSessions.desktop.size,
      },
      sources,
      topProducts: Array.from(productStats.values()).sort(
        (a, b) => b.revenueEur - a.revenueEur || b.carts - a.carts || b.views - a.views
      ),
      daily,
      recentEvents: filteredEvents.slice(-25).reverse(),
    });
  });

  app.post('/api/admin/analytics/reset', requireAdminAuth, (_req: Request, res: Response) => {
    analyticsStore = { events: [] };
    scheduleAnalyticsSave(true);
    res.json({ ok: true });
  });

  app.post('/api/admin/products/reorder', requireAdminAuth, (req: Request, res: Response) => {
    const body = req.body as { orderedIds?: unknown };
    if (!Array.isArray(body.orderedIds)) {
      res.status(400).json({ error: 'Ungültige Sortierliste.' });
      return;
    }
    const byId = new Map(store.products.map((p) => [p.id, p]));
    const next: JacketProduct[] = [];
    for (const rawId of body.orderedIds) {
      if (typeof rawId === 'string' && byId.has(rawId)) {
        next.push(byId.get(rawId)!);
        byId.delete(rawId);
      }
    }
    for (const leftover of byId.values()) {
      next.push(leftover);
    }
    store.products = next.map((p, i) => ({
      ...p,
      code: String(i + 1).padStart(2, '0'),
    }));
    persistStoreState();
    res.json({ products: store.products });
  });

  app.patch('/api/admin/products/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const prod = store.products.find((p) => p.id === id);
    if (!prod) {
      res.status(404).json({ error: 'Produkt nicht gefunden.' });
      return;
    }
    const body = req.body as {
      name?: unknown;
      subtitle?: unknown;
      leatherType?: unknown;
      tagline?: unknown;
      description?: unknown;
      priceEur?: unknown;
      compareAtEur?: unknown;
      stockTotal?: unknown;
      active?: unknown;
      gallery?: unknown;
      colors?: unknown;
    };

    if (typeof body.name === 'string' && body.name.trim().length >= 2) {
      prod.name = body.name.trim().slice(0, 90);
    }
    if (typeof body.subtitle === 'string') {
      prod.subtitle = body.subtitle.trim().slice(0, 120);
    }
    const validLeatherTypes = [
      'Lamm-Nappa',
      'Wildleder',
      'Vollrind-Nappa',
      'Rind-Wildleder',
    ] as const;
    if (validLeatherTypes.includes(body.leatherType as (typeof validLeatherTypes)[number])) {
      prod.leatherType = body.leatherType as (typeof validLeatherTypes)[number];
    }
    if (typeof body.tagline === 'string') {
      prod.tagline = body.tagline.trim().slice(0, 180);
    }
    if (typeof body.description === 'string') {
      prod.description = body.description.trim().slice(0, 800);
    }
    if (typeof body.priceEur === 'number' && Number.isFinite(body.priceEur)) {
      prod.priceEur = Math.min(2999, Math.max(1, Math.round(body.priceEur)));
    }
    if (typeof body.compareAtEur === 'number' && Number.isFinite(body.compareAtEur)) {
      prod.compareAtEur = Math.min(5999, Math.max(0, Math.round(body.compareAtEur)));
    }
    if (typeof body.stockTotal === 'number' && Number.isFinite(body.stockTotal)) {
      prod.stockTotal = Math.max(0, Math.round(body.stockTotal));
    }
    if (typeof body.active === 'boolean') {
      prod.active = body.active;
    }
    const prevLeadImage = prod.gallery[0] ?? prod.colors[0]?.image ?? '';
    const prevFirstColorId = prod.colors[0]?.id ?? '';
    const prevGallerySet = new Set(prod.gallery);

    if (Array.isArray(body.gallery)) {
      const cleanGallery = body.gallery
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => u.trim().slice(0, 500));
      if (cleanGallery.length > 0) {
        prod.gallery = cleanGallery;
      }
    }
    if (Array.isArray(body.colors)) {
      const cleanColors = body.colors
        .filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'))
        .map((c, idx) => {
          const cName =
            typeof c.name === 'string' && c.name.trim()
              ? c.name.trim().slice(0, 40)
              : `Farbe ${idx + 1}`;
          const cId =
            typeof c.id === 'string' && c.id.trim()
              ? c.id.trim().slice(0, 40)
              : cName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `color-${idx + 1}`;
          const cHex =
            typeof c.hex === 'string' && /^#[0-9a-f]{6}$/i.test(c.hex.trim())
              ? c.hex.trim()
              : '#1B1C1E';
          const cImg =
            typeof c.image === 'string' && c.image.trim()
              ? c.image.trim().slice(0, 500)
              : prod.gallery[0] ?? '';
          const cOutOfStock = Boolean(c.outOfStock);
          return { id: cId, name: cName, hex: cHex, image: cImg, outOfStock: cOutOfStock };
        })
        .filter((c) => c.image.length > 0);
      if (cleanColors.length > 0) {
        prod.colors = cleanColors;
      }
    }

    const foregroundColorChanged =
      prod.colors.length > 0 && prod.colors[0].id !== prevFirstColorId;

    if (foregroundColorChanged && prod.colors[0]?.image) {
      // Seller pulled a different color variant to #1 foreground -> put its photo at gallery[0]
      const fgImg = prod.colors[0].image;
      prod.gallery = [fgImg, ...prod.gallery.filter((u) => u !== fgImg)];
    } else {
      // Seller changed gallery[0] on the same foreground color -> sync colors[0].image
      const newLeadImage = prod.gallery[0] ?? '';
      if (
        newLeadImage &&
        prod.colors.length > 0 &&
        (prod.colors.length === 1 || prod.colors[0].image === prevLeadImage)
      ) {
        prod.colors[0] = { ...prod.colors[0], image: newLeadImage };
      }
    }

    // If an image was explicitly deleted from gallery, fallback affected colors to gallery[0]
    if (Array.isArray(body.gallery) && prod.gallery.length > 0) {
      const currentGalSet = new Set(prod.gallery);
      prod.colors = prod.colors.map((c) =>
        !currentGalSet.has(c.image) && prevGallerySet.has(c.image)
          ? { ...c, image: prod.gallery[0] }
          : c
      );
    }

    persistStoreState();
    const publicProducts = store.products.map((p) =>
      store.oneEuroTestProductId === p.id ? { ...p, priceEur: 1 } : p
    );
    res.json({ product: prod, products: publicProducts });
  });

  app.post('/api/admin/products', requireAdminAuth, (req: Request, res: Response) => {
    const body = req.body as {
      name?: unknown;
      subtitle?: unknown;
      leatherType?: unknown;
      priceEur?: unknown;
      compareAtEur?: unknown;
      tagline?: unknown;
      description?: unknown;
      colorName?: unknown;
      colorHex?: unknown;
      imageUrl?: unknown;
      stockTotal?: unknown;
    };

    const name = typeof body.name === 'string' ? body.name.trim().slice(0, 80) : '';
    if (name.length < 2) {
      res.status(400).json({ error: 'Bitte einen gültigen Produktnamen eingeben.' });
      return;
    }

    const slugBase = name
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `modell-${Date.now()}`;

    const id = store.products.some((p) => p.id === slugBase)
      ? `${slugBase}-${Date.now().toString(36).slice(-4)}`
      : slugBase;

    const validLeatherTypes = [
      'Lamm-Nappa',
      'Wildleder',
      'Vollrind-Nappa',
      'Rind-Wildleder',
    ] as const;
    const leatherType = validLeatherTypes.includes(body.leatherType as (typeof validLeatherTypes)[number])
      ? (body.leatherType as (typeof validLeatherTypes)[number])
      : 'Lamm-Nappa';

    const priceEur =
      typeof body.priceEur === 'number' && Number.isFinite(body.priceEur)
        ? Math.min(999, Math.max(49, Math.round(body.priceEur)))
        : 177;
    const compareAtEur =
      typeof body.compareAtEur === 'number' && Number.isFinite(body.compareAtEur)
        ? Math.max(priceEur, Math.round(body.compareAtEur))
        : priceEur * 2;
    const stockTotal =
      typeof body.stockTotal === 'number' && Number.isFinite(body.stockTotal)
        ? Math.max(0, Math.round(body.stockTotal))
        : 50;

    const colorName =
      typeof body.colorName === 'string' && body.colorName.trim()
        ? body.colorName.trim().slice(0, 40)
        : 'Bleu Petrol';
    const colorHex =
      typeof body.colorHex === 'string' && /^#[0-9a-f]{6}$/i.test(body.colorHex.trim())
        ? body.colorHex.trim()
        : '#1B1C1E';
    const imageUrl =
      typeof body.imageUrl === 'string' && body.imageUrl.trim()
        ? body.imageUrl.trim().slice(0, 500)
        : '/assets/aistudio/CA15DAC8-4245-4F0F-981D-ED38CFB17326_e15622ac.webp';

    const nextCode = String(store.products.length + 1).padStart(2, '0');
    const newProduct: JacketProduct = {
      id,
      code: nextCode,
      name,
      subtitle:
        typeof body.subtitle === 'string' && body.subtitle.trim()
          ? body.subtitle.trim().slice(0, 100)
          : `${leatherType} Atelier-Edition`,
      leatherType,
      priceEur,
      compareAtEur,
      madPrice: Math.round(priceEur * 11),
      tagline:
        typeof body.tagline === 'string' && body.tagline.trim()
          ? body.tagline.trim().slice(0, 140)
          : 'Handgefertigt im Familienatelier in Marrakesch — 100 % Naturleder.',
      description:
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim().slice(0, 500)
          : 'Vollnarbiges Naturleder direkt ab Manufaktur inkl. kostenlosem DHL Express Versand.',
      sizes: ['S', 'M', 'L', 'XL', '2XL', '3XL'],
      colors: [
        {
          id: colorName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'standard',
          name: colorName,
          hex: colorHex,
          image: imageUrl,
        },
      ],
      gallery: [imageUrl],
      stockTotal,
      active: true,
      tags: ['leather', 'new'],
    };

    store.products.push(newProduct);
    persistStoreState();
    res.json({ product: newProduct, products: store.products });
  });

  app.delete('/api/admin/products/:id', requireAdminAuth, (req: Request, res: Response) => {
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Produkt nicht gefunden.' });
      return;
    }
    store.products.splice(idx, 1);
    persistStoreState();
    res.json({ products: store.products });
  });

  app.post('/api/admin/orders/:id/notify', requireAdminAuth, async (req: Request, res: Response) => {
    const order = store.orders.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Bestellung nicht gefunden.' });
      return;
    }
    const result = await dispatchOrderNotifications(order);
    res.json({
      order,
      message: `n8n: ${result.n8nSent ? 'OK' : 'nicht konfiguriert/Fehler'} · Telegram: ${
        result.telegramSent ? 'OK' : 'nicht konfiguriert/Fehler'
      }`,
    });
  });

  app.post('/api/admin/test-notifications', requireAdminAuth, async (_req: Request, res: Response) => {
    const mockOrder: OrderRecord = {
      id: 'MRK-TEST',
      sessionId: 'cs_test_notification',
      mode: 'preview',
      status: 'paid',
      customerEmail: 'test@mrkshi.com',
      whatsappNumber: '+212753310471',
      measurementsSummary: '182 cm · 80 kg · Brust 104 cm (Regular Fit)',
      giftNote: 'Test-Benachrichtigung aus Reverse-Shopify Admin',
      totalCents: 17700,
      currency: 'EUR',
      items: [
        {
          productId: 'khabibi',
          name: 'Model Khabibi',
          colorName: 'Bleu Petrol',
          sizeLabel: 'L',
          customMeasure: 'Direkt-Maß Check',
          giftWrap: true,
          unitAmountCents: 17700,
          quantity: 1,
        },
      ],
      n8nSent: false,
      telegramSent: false,
      inventoryDecremented: false,
      createdAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    };

    const result = await dispatchOrderNotifications(mockOrder);
    const capiTest = await sendMetaCapiPurchase(mockOrder);
    res.json({
      ...result,
      capiSent: capiTest.sent,
      capiDetail: capiTest.detail,
      message: `Telegram: ${result.telegramSent ? '✅ Gesendet' : '❌ Fehlt/Fehler'} · Meta CAPI: ${
        capiTest.sent ? '✅ Events empfangen' : `❌ ${capiTest.detail ?? 'Fehler'}`
      } · n8n: ${result.n8nSent ? '✅ Gesendet' : 'Optional'}`,
    });
  });

  app.get('/api/admin/export-csv', requireAdminAuth, (_req: Request, res: Response) => {
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = [
      'Handle',
      'Title',
      'Vendor',
      'Type',
      'Option1 Name',
      'Option1 Value',
      'Option2 Name',
      'Option2 Value',
      'Variant Price (EUR)',
      'Variant Compare At Price (EUR)',
      'Variant Inventory Qty',
      'Status',
      'Image Src',
    ].join(',');

    const rows: string[] = [header];
    for (const prod of store.products) {
      for (const color of prod.colors) {
        for (const sz of prod.sizes) {
          rows.push(
            [
              esc(prod.id),
              esc(prod.name),
              esc('MRKSHI'),
              esc(prod.leatherType),
              esc('Größe'),
              esc(sz),
              esc('Farbe'),
              esc(color.name),
              esc(prod.priceEur.toFixed(2)),
              esc(prod.compareAtEur.toFixed(2)),
              esc(Math.max(1, Math.floor(prod.stockTotal / (prod.colors.length * prod.sizes.length)))),
              esc(prod.active ? 'active' : 'draft'),
              esc(color.image),
            ].join(',')
          );
        }
      }
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="mrkshi-reverse-shopify-9-products.csv"'
    );
    res.send(rows.join('\n'));
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      '/assets',
      express.static(path.resolve(distDir, 'assets'), {
        maxAge: '30d',
        immutable: true,
      })
    );
    app.use(express.static(distDir, { maxAge: '1h' }));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.resolve(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MRKSHI Server läuft auf http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server-Startfehler:', err);
  process.exit(1);
});
