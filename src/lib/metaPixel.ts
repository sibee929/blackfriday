export interface MetaPixelConfig {
  pixelId: string;
  enabled: boolean;
  testEventCode: string;
  trackViewContent: boolean;
  trackAddToCart: boolean;
  trackInitiateCheckout: boolean;
  trackPurchase: boolean;
  // Erweiterte Analytics & Conversion-Plattformen
  ga4MeasurementId?: string;
  gtmId?: string;
  tiktokPixelId?: string;
  capiConfigured?: boolean;
}

export interface PixelEventLogEntry {
  id: string;
  timestamp: string;
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';
  payload: Record<string, unknown>;
  dispatchedToMeta: boolean;
  platforms: string[];
}

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: unknown;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ttq?: {
      track?: (event: string, payload?: Record<string, unknown>) => void;
      page?: () => void;
      load?: (id: string) => void;
      _i?: Record<string, unknown>;
    };
  }
}

const STORAGE_KEY = 'mrkshi_meta_pixel_config_v1';
const CONSENT_STORAGE_KEY = 'mrkshi_cookie_consent_v1';
const eventLogSubscribers = new Set<(entries: PixelEventLogEntry[]) => void>();
let eventLog: PixelEventLogEntry[] = [];
let initializedPixelId: string | null = null;
let initializedGa4Id: string | null = null;
let initializedGtmId: string | null = null;
let initializedTiktokId: string | null = null;

export type CookieConsentStatus = 'unset' | 'necessary' | 'all';

export function getStoredConsent(): CookieConsentStatus {
  if (typeof window === 'undefined') return 'unset';
  try {
    const val = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (val === 'all' || val === 'necessary') return val;
    return 'unset';
  } catch {
    return 'unset';
  }
}

export function setStoredConsent(status: 'necessary' | 'all'): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, status);
  } catch {
    // ignore storage errors
  }
}

export function hasMarketingConsent(): boolean {
  return getStoredConsent() === 'all';
}

export const DEFAULT_PIXEL_CONFIG: MetaPixelConfig = {
  pixelId: '1027857760085345',
  enabled: true,
  testEventCode: '',
  trackViewContent: true,
  trackAddToCart: true,
  trackInitiateCheckout: true,
  trackPurchase: true,
  ga4MeasurementId: '',
  gtmId: '',
  tiktokPixelId: '',
  capiConfigured: false,
};

export function loadLocalPixelConfig(): MetaPixelConfig {
  if (typeof window === 'undefined') return DEFAULT_PIXEL_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PIXEL_CONFIG;
    const parsed = JSON.parse(raw) as Partial<MetaPixelConfig>;
    return {
      ...DEFAULT_PIXEL_CONFIG,
      ...parsed,
      pixelId: (parsed.pixelId && parsed.pixelId.trim()) ? parsed.pixelId : DEFAULT_PIXEL_CONFIG.pixelId,
    };
  } catch {
    return DEFAULT_PIXEL_CONFIG;
  }
}

export function saveLocalPixelConfig(config: MetaPixelConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
}

export function subscribePixelEvents(listener: (entries: PixelEventLogEntry[]) => void): () => void {
  eventLogSubscribers.add(listener);
  listener([...eventLog]);
  return () => {
    eventLogSubscribers.delete(listener);
  };
}

function recordPixelEvent(entry: PixelEventLogEntry): void {
  eventLog = [entry, ...eventLog].slice(0, 40);
  for (const listener of eventLogSubscribers) {
    listener([...eventLog]);
  }
}

export function isValidPixelId(pixelId: string): boolean {
  return /^\d{10,20}$/.test(pixelId.trim());
}

export function isValidGa4Id(id: string): boolean {
  return /^G-[A-Z0-9]{6,14}$/i.test(id.trim());
}

export function isValidGtmId(id: string): boolean {
  return /^(GTM-[A-Z0-9]{5,10}|AW-\d{6,14})$/i.test(id.trim());
}

export function isValidTiktokId(id: string): boolean {
  return /^[A-Z0-9]{10,28}$/i.test(id.trim());
}

function injectScriptOnce(id: string, src: string): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

export function initAllAnalytics(config: MetaPixelConfig, forceAllow = false): void {
  if (typeof window === 'undefined') return;
  if (!forceAllow && !hasMarketingConsent()) return;

  // 1. Meta Pixel
  const cleanMetaId = config.pixelId.trim();
  if (config.enabled && isValidPixelId(cleanMetaId) && initializedPixelId !== cleanMetaId) {
    if (typeof window.fbq !== 'function') {
      const n: any = function (...args: unknown[]) {
        if (n.callMethod) {
          n.callMethod(...args);
        } else {
          n.queue.push(args);
        }
      };
      if (!window._fbq) window._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      window.fbq = n;
      injectScriptOnce('mrkshi-meta-fbevents', 'https://connect.facebook.net/en_US/fbevents.js');
    }
    window.fbq?.('init', cleanMetaId);
    initializedPixelId = cleanMetaId;
    trackMetaEvent('PageView', { market: 'DE', currency: 'EUR' }, config);
  }

  // 2. Google Analytics 4
  const cleanGa4 = (config.ga4MeasurementId ?? '').trim().toUpperCase();
  if (cleanGa4 && isValidGa4Id(cleanGa4) && initializedGa4Id !== cleanGa4) {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function gtag(...args: unknown[]) {
        window.dataLayer?.push(args);
      };
      window.gtag('js', new Date());
    }
    injectScriptOnce(
      'mrkshi-ga4-script',
      `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanGa4)}`
    );
    window.gtag('config', cleanGa4, { currency: 'EUR', send_page_view: true });
    initializedGa4Id = cleanGa4;
  }

  // 3. Google Tag Manager / Google Ads
  const cleanGtm = (config.gtmId ?? '').trim().toUpperCase();
  if (cleanGtm && isValidGtmId(cleanGtm) && initializedGtmId !== cleanGtm) {
    window.dataLayer = window.dataLayer || [];
    if (cleanGtm.startsWith('GTM-')) {
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
      injectScriptOnce(
        'mrkshi-gtm-script',
        `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(cleanGtm)}`
      );
    } else if (cleanGtm.startsWith('AW-')) {
      if (typeof window.gtag !== 'function') {
        window.gtag = function gtag(...args: unknown[]) {
          window.dataLayer?.push(args);
        };
        window.gtag('js', new Date());
      }
      injectScriptOnce(
        'mrkshi-gads-script',
        `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cleanGtm)}`
      );
      window.gtag('config', cleanGtm);
    }
    initializedGtmId = cleanGtm;
  }

  // 4. TikTok Pixel
  const cleanTiktok = (config.tiktokPixelId ?? '').trim();
  if (cleanTiktok && isValidTiktokId(cleanTiktok) && initializedTiktokId !== cleanTiktok) {
    injectScriptOnce(
      'mrkshi-tiktok-script',
      `https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=${encodeURIComponent(cleanTiktok)}&lib=ttq`
    );
    window.ttq?.load?.(cleanTiktok);
    window.ttq?.page?.();
    initializedTiktokId = cleanTiktok;
  }
}

export function initMetaPixel(config: MetaPixelConfig): void {
  initAllAnalytics(config);
}

export function trackMetaEvent(
  eventName: PixelEventLogEntry['eventName'],
  payload: Record<string, unknown>,
  configOverride?: MetaPixelConfig,
  eventId?: string
): void {
  const config = configOverride ?? loadLocalPixelConfig();

  if (eventName === 'ViewContent' && !config.trackViewContent) return;
  if (eventName === 'AddToCart' && !config.trackAddToCart) return;
  if (eventName === 'InitiateCheckout' && !config.trackInitiateCheckout) return;
  if (eventName === 'Purchase' && !config.trackPurchase) return;

  const cleanId = config.pixelId.trim();
  const canSendMeta =
    config.enabled &&
    isValidPixelId(cleanId) &&
    typeof window !== 'undefined' &&
    typeof window.fbq === 'function';

  const enrichedPayload = config.testEventCode.trim()
    ? { ...payload, test_event_code: config.testEventCode.trim() }
    : payload;

  const platforms: string[] = [];

  if (canSendMeta && window.fbq) {
    if (eventId) {
      window.fbq('track', eventName, enrichedPayload, { eventID: eventId });
    } else {
      window.fbq('track', eventName, enrichedPayload);
    }
    platforms.push('Meta Pixel');
  }

  // Forward to GA4 / GTM dataLayer
  const ga4EventMap: Record<PixelEventLogEntry['eventName'], string> = {
    PageView: 'page_view',
    ViewContent: 'view_item',
    AddToCart: 'add_to_cart',
    InitiateCheckout: 'begin_checkout',
    Purchase: 'purchase',
  };

  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', ga4EventMap[eventName], {
      currency: 'EUR',
      value: payload.value,
      item_name: payload.content_name,
      leather_color: payload.leather_color,
    });
    if (config.ga4MeasurementId || config.gtmId) {
      platforms.push('GA4/Ads');
    }
  } else if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
    window.dataLayer.push({
      event: ga4EventMap[eventName],
      ...payload,
    });
    if (config.gtmId) platforms.push('GTM');
  }

  // Forward to TikTok Pixel
  const ttEventMap: Record<PixelEventLogEntry['eventName'], string> = {
    PageView: 'PageView',
    ViewContent: 'ViewContent',
    AddToCart: 'AddToCart',
    InitiateCheckout: 'InitiateCheckout',
    Purchase: 'CompletePayment',
  };
  if (
    typeof window !== 'undefined' &&
    config.tiktokPixelId &&
    typeof window.ttq?.track === 'function'
  ) {
    window.ttq.track(ttEventMap[eventName], enrichedPayload);
    platforms.push('TikTok');
  }

  recordPixelEvent({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString('de-DE'),
    eventName,
    payload: enrichedPayload,
    dispatchedToMeta: canSendMeta,
    platforms,
  });
}
