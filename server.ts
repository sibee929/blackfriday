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
  inventoryDecremented: boolean;
  shippingSummary?: string;
  clientIp?: string;
  clientUserAgent?: string;
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
  adminPasswordHash: string | null;
  orderCounter: number;
}

const DEFAULT_META_PIXEL_ID = '1027857760085345';
const initialPixelId = (process.env.META_PIXEL_ID ?? DEFAULT_META_PIXEL_ID).trim();
const initialGa4 = (process.env.GA4_MEASUREMENT_ID ?? '').trim();
const initialGtm = (process.env.GTM_ID ?? '').trim();
const initialTiktok = (process.env.TIKTOK_PIXEL_ID ?? '').trim();

function createDefaultState(): StoreState {
  return {
    products: JSON.parse(JSON.stringify(INITIAL_EIGHT_PRODUCTS)) as JacketProduct[],
    orders: [],
    waitlist: [],
    newsletter: [],
    oneEuroTestProductId: null,
    pixelConfig: {
      pixelId: /^\d{10,20}$/.test(initialPixelId) ? initialPixelId : DEFAULT_META_PIXEL_ID,
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

    // Merge latest media/colors/descriptions from catalog while preserving admin-edited price/stock/active and custom products
    const savedList = Array.isArray(parsed.products) ? parsed.products : [];
    const savedById = new Map(savedList.map((p) => [p.id, p]));
    const defaultIds = new Set(defaults.products.map((p) => p.id));
    const mergedDefaults = defaults.products.map((defProd) => {
      const saved = savedById.get(defProd.id);
      if (!saved) return defProd;
      return {
        ...defProd,
        priceEur:
          typeof saved.priceEur === 'number' && saved.priceEur >= 49 && saved.priceEur <= 999
            ? saved.priceEur
            : 177,
        compareAtEur:
          typeof saved.compareAtEur === 'number' && saved.compareAtEur > 0
            ? saved.compareAtEur
            : 354,
        stockTotal: typeof saved.stockTotal === 'number' ? saved.stockTotal : defProd.stockTotal,
        active: typeof saved.active === 'boolean' ? saved.active : defProd.active,
      };
    });
    const customProducts = savedList.filter(
      (p) => p && typeof p.id === 'string' && !defaultIds.has(p.id)
    );
    const mergedProducts = [...mergedDefaults, ...customProducts];

    const savedPixel = parsed.pixelConfig ?? ({} as Partial<PixelConfigState>);
    const envPixel = (process.env.META_PIXEL_ID ?? '').trim();
    const hasCustomEnvPixel = /^\d{10,20}$/.test(envPixel);
    const savedId = typeof savedPixel.pixelId === 'string' ? savedPixel.pixelId.trim() : '';
    const resolvedPixelId =
      hasCustomEnvPixel && (!savedId || savedId === DEFAULT_META_PIXEL_ID)
        ? envPixel
        : /^\d{10,20}$/.test(savedId)
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
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) {
      return false;
    }
    return true;
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

async function sendMetaCapiPurchase(order: OrderRecord): Promise<void> {
  const token = (process.env.META_CAPI_ACCESS_TOKEN ?? '').trim();
  const pixelId = store.pixelConfig.pixelId.trim();
  if (!token || !pixelId || !store.pixelConfig.enabled) return;

  const sha256 = (v: string) =>
    crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex');

  try {
    await fetch(
      `https://graph.facebook.com/v20.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [
            {
              event_name: 'Purchase',
              event_time: Math.floor(Date.now() / 1000),
              action_source: 'website',
              event_source_url: 'https://mrkshi.com/',
              event_id: order.id,
              user_data: {
                em: order.customerEmail ? [sha256(order.customerEmail)] : undefined,
                ph: order.whatsappNumber
                  ? [sha256(order.whatsappNumber.replace(/[^\d]/g, ''))]
                  : undefined,
                client_ip_address: order.clientIp || undefined,
                client_user_agent: order.clientUserAgent || undefined,
              },
              custom_data: {
                currency: 'EUR',
                value: Number((order.totalCents / 100).toFixed(2)),
                content_ids: order.items.map((i) => i.productId),
                content_type: 'product',
              },
            },
          ],
          ...(store.pixelConfig.testEventCode
            ? { test_event_code: store.pixelConfig.testEventCode }
            : {}),
        }),
      }
    );
  } catch {
    // non-fatal analytics failure
  }
}

function enrichOrderFromStripeSession(order: OrderRecord, session: Stripe.Checkout.Session): void {
  const stripeEmail = session.customer_details?.email?.trim().toLowerCase();
  if (stripeEmail && !order.customerEmail) {
    order.customerEmail = stripeEmail;
  }
  const stripePhone = session.customer_details?.phone?.trim();
  if (stripePhone && !order.whatsappNumber) {
    order.whatsappNumber = stripePhone;
  }
  const ship = session.collected_information?.shipping_details ?? session.customer_details;
  const addr = ship?.address;
  if (addr && !order.shippingSummary) {
    const parts = [
      ship?.name,
      addr.line1,
      addr.line2,
      [addr.postal_code, addr.city].filter(Boolean).join(' '),
      addr.country,
    ].filter(Boolean);
    if (parts.length > 0) {
      order.shippingSummary = parts.join(', ').slice(0, 240);
    }
  }
}

async function dispatchOrderNotifications(
  order: OrderRecord
): Promise<{ n8nSent: boolean; telegramSent: boolean }> {
  let n8nSent = order.n8nSent;
  let telegramSent = order.telegramSent;

  const cleanPhone = order.whatsappNumber.replace(/[^\d]/g, '');
  const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : '';

  const n8nUrl = (process.env.N8N_WEBHOOK_URL ?? '').trim();
  if (n8nUrl && isSafeWebhookUrl(n8nUrl)) {
    try {
      const resp = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'mrkshi.order.paid',
          source: 'reverse-shopify-mrkshi',
          domain: 'mrkshi.com',
          orderId: order.id,
          sessionId: order.sessionId,
          status: order.status,
          totalEur: Number((order.totalCents / 100).toFixed(2)),
          currency: 'EUR',
          customerEmail: order.customerEmail,
          whatsappNumber: order.whatsappNumber,
          whatsappLink: waLink,
          measurementsSummary: order.measurementsSummary,
          giftNote: order.giftNote,
          items: order.items,
          createdAt: order.createdAt,
          paidAt: order.paidAt,
        }),
      });
      if (resp.ok) {
        n8nSent = true;
      }
    } catch (err) {
      console.error('n8n webhook failed:', err);
    }
  }

  const tgToken = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
  const tgChatId = (process.env.TELEGRAM_CHAT_ID ?? '').trim();
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

  if (!wasAlreadyPaid || !order.n8nSent || !order.telegramSent) {
    await dispatchOrderNotifications(order);
    await sendMetaCapiPurchase(order);
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
        '- Zahlung: Stripe Checkout mit Klarna, Apple Pay, Google Pay, PayPal, Visa/Mastercard & SEPA',
        '- Rückgabe & Standort DE: 14 Tage Widerruf über Alte Dorfstraße 3a, 61137 Schöneck (Hessen)',
        '- Kontakt: service@mrkshi.com · WhatsApp +49 176 43488260',
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

    const productUrls = store.products
      .filter((p) => p.active)
      .map((p) => ({
        loc: `https://www.mrkshi.com/products/${encodeURIComponent(p.id)}`,
        priority: '0.9',
        changefreq: 'daily',
        image: p.colors[0]?.image ?? '',
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

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      domain: 'www.mrkshi.com',
      productsCount: store.products.length,
      stripeConfigured: Boolean((process.env.STRIPE_SECRET_KEY ?? '').trim()),
      oneEuroTestProductId: store.oneEuroTestProductId,
      n8nConfigured: Boolean((process.env.N8N_WEBHOOK_URL ?? '').trim()),
      telegramConfigured: Boolean(
        (process.env.TELEGRAM_BOT_TOKEN ?? '').trim() &&
          (process.env.TELEGRAM_CHAT_ID ?? '').trim()
      ),
    });
  });

  // Authoritative 8-Product Catalog Endpoint (applies optional Admin 1-EUR Live Test price)
  app.get('/api/catalog', (_req: Request, res: Response) => {
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
      capiConfigured: Boolean((process.env.META_CAPI_ACCESS_TOKEN ?? '').trim()),
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
      capiConfigured: Boolean((process.env.META_CAPI_ACCESS_TOKEN ?? '').trim()),
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
        ? body.preferredColor.trim().slice(0, 50)
        : 'Alle seltenen Farben';
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
          text: `💌 NEUER NEWSLETTER & TREUE-KUNDE\n📧 ${email}\n🎨 Farb-Wunsch: ${preferredColor}\n🎟️ Code: ${voucherCode}`,
          disable_web_page_preview: true,
        }),
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
      upsellCareKit?: unknown;
      voucherCode?: unknown;
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

      const colorId = typeof item.colorId === 'string' ? item.colorId.trim() : '';
      const matchedColor = product.colors.find((c) => c.id === colorId);
      const colorName =
        matchedColor?.name ??
        (typeof item.colorName === 'string' && item.colorName.trim()
          ? item.colorName.trim().slice(0, 40)
          : product.colors[0]?.name ?? 'Signature');

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
        n8nSent: existingOrder?.n8nSent ?? false,
        telegramSent: existingOrder?.telegramSent ?? false,
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
    const hasEnv = Boolean((process.env.ADMIN_PASSCODE ?? '').trim());
    res.json({
      initialized: hasEnv || Boolean(store.adminPasswordHash),
    });
  });

  app.post('/api/admin/bootstrap', (req: Request, res: Response) => {
    const hasEnv = Boolean((process.env.ADMIN_PASSCODE ?? '').trim());
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
    const envPass = (process.env.ADMIN_PASSCODE ?? '').trim();

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

  app.get('/api/admin/state', requireAdminAuth, (_req: Request, res: Response) => {
    const sk = (process.env.STRIPE_SECRET_KEY ?? '').trim();
    const stripeMode = sk.startsWith('sk_live_')
      ? 'live'
      : sk.startsWith('sk_test_')
      ? 'test'
      : 'unset';

    res.json({
      products: store.products,
      orders: store.orders,
      newsletter: store.newsletter,
      oneEuroTestProductId: store.oneEuroTestProductId,
      integrations: {
        stripeConfigured: Boolean(sk),
        stripeMode,
        stripeWebhookConfigured: Boolean((process.env.STRIPE_WEBHOOK_SECRET ?? '').trim()),
        n8nConfigured: Boolean((process.env.N8N_WEBHOOK_URL ?? '').trim()),
        telegramConfigured: Boolean(
          (process.env.TELEGRAM_BOT_TOKEN ?? '').trim() &&
            (process.env.TELEGRAM_CHAT_ID ?? '').trim()
        ),
        capiConfigured: Boolean((process.env.META_CAPI_ACCESS_TOKEN ?? '').trim()),
        domain: 'www.mrkshi.com',
      },
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

  app.patch('/api/admin/products/:id', requireAdminAuth, (req: Request, res: Response) => {
    const { id } = req.params;
    const prod = store.products.find((p) => p.id === id);
    if (!prod) {
      res.status(404).json({ error: 'Produkt nicht gefunden.' });
      return;
    }
    const body = req.body as {
      priceEur?: unknown;
      stockTotal?: unknown;
      active?: unknown;
    };

    if (typeof body.priceEur === 'number' && Number.isFinite(body.priceEur)) {
      prod.priceEur = Math.min(999, Math.max(49, Math.round(body.priceEur)));
    }
    if (typeof body.stockTotal === 'number' && Number.isFinite(body.stockTotal)) {
      prod.stockTotal = Math.max(0, Math.round(body.stockTotal));
    }
    if (typeof body.active === 'boolean') {
      prod.active = body.active;
    }

    persistStoreState();
    res.json({ products: store.products });
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
        : '/assets/aistudio/CA15DAC8-4245-4F0F-981D-ED38CFB17326_e15622ac.png';

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
      whatsappNumber: '+4917643488260',
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
    res.json({
      ...result,
      message: `Test abgeschlossen — n8n: ${
        result.n8nSent ? 'Gesendet' : 'Secret fehlt/Fehler'
      }, Telegram: ${result.telegramSent ? 'Gesendet' : 'Secret fehlt/Fehler'}.`,
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
    app.use(express.static(distDir));
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
