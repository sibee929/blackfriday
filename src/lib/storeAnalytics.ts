// Privacy-safe, cookie-free 1st-party storefront analytics client for MRKSHI Seller Dashboard

const SESSION_STORAGE_KEY = 'mrkshi_anon_sid_v1';
const SOURCE_STORAGE_KEY = 'mrkshi_traffic_src_v1';

export type StoreAnalyticsEventType =
  | 'page_view'
  | 'view_content'
  | 'add_to_cart'
  | 'initiate_checkout'
  | 'purchase';

function getAnonSessionId(): string {
  if (typeof window === 'undefined') return 'srv';
  try {
    let sid = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sid) {
      sid = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sid);
    }
    return sid;
  } catch {
    return `s_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function detectTrafficSource(): string {
  if (typeof window === 'undefined') return 'Direkt';
  try {
    const cached = window.sessionStorage.getItem(SOURCE_STORAGE_KEY);
    const params = new URLSearchParams(window.location.search);
    const utm = (params.get('utm_source') ?? '').toLowerCase();
    const hasFbclid = Boolean(params.get('fbclid'));
    const hasTtclid = Boolean(params.get('ttclid'));
    const hasGclid = Boolean(params.get('gclid'));
    const ref = (document.referrer ?? '').toLowerCase();

    let detected = '';
    if (
      hasFbclid ||
      utm.includes('fb') ||
      utm.includes('ig') ||
      utm.includes('meta') ||
      utm.includes('facebook') ||
      utm.includes('instagram') ||
      ref.includes('instagram.com') ||
      ref.includes('facebook.com') ||
      ref.includes('fb.com')
    ) {
      detected = 'Meta / Instagram Ads';
    } else if (hasTtclid || utm.includes('tiktok') || ref.includes('tiktok.com')) {
      detected = 'TikTok';
    } else if (hasGclid || utm.includes('google') || ref.includes('google.')) {
      detected = 'Google';
    } else if (utm) {
      detected = utm.slice(0, 28);
    } else if (cached) {
      return cached;
    } else if (ref && !ref.includes(window.location.hostname)) {
      try {
        detected = new URL(ref).hostname.replace(/^www\./, '').slice(0, 28);
      } catch {
        detected = 'Referral';
      }
    } else {
      detected = 'Direkt';
    }

    window.sessionStorage.setItem(SOURCE_STORAGE_KEY, detected);
    return detected;
  } catch {
    return 'Direkt';
  }
}

function detectDevice(): 'mobile' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  return window.innerWidth <= 820 || /iphone|ipad|ipod|android|mobile/i.test(navigator.userAgent)
    ? 'mobile'
    : 'desktop';
}

let pageViewTrackedInTab = false;

export function trackStoreEvent(
  type: StoreAnalyticsEventType,
  extra?: {
    productId?: string;
    productName?: string;
    colorName?: string;
    valueEur?: number;
  }
): void {
  if (typeof window === 'undefined') return;
  if (type === 'page_view') {
    if (pageViewTrackedInTab) return;
    pageViewTrackedInTab = true;
  }

  const payload = JSON.stringify({
    sid: getAnonSessionId(),
    type,
    source: detectTrafficSource(),
    device: detectDevice(),
    productId: extra?.productId,
    productName: extra?.productName,
    colorName: extra?.colorName,
    valueEur: extra?.valueEur,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/event', blob);
      return;
    }
  } catch {
    // fallback to fetch below
  }

  fetch('/api/analytics/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
