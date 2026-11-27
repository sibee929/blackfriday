import { useCallback, useEffect, useMemo, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import {
  KHABIBI_COLORS,
  preloadGalleryImages,
} from './data/jackets';
import { INITIAL_EIGHT_PRODUCTS, JacketProduct } from './data/catalog';
import {
  DEFAULT_PIXEL_CONFIG,
  generateMetaEventId,
  getMetaAttributionParams,
  initAllAnalytics,
  loadLocalPixelConfig,
  MetaPixelConfig,
  saveLocalPixelConfig,
  trackMetaEvent,
} from './lib/metaPixel';
import { HeroTryOn } from './components/HeroTryOn';
import {
  ConfiguredOrderPayload,
  ProductConfigurator,
} from './components/ProductConfigurator';
import { CollectionSixSection } from './components/CollectionSixSection';
import { TrustAndReviewsSection } from './components/TrustAndReviewsSection';
import {
  AtelierSectionAndFooter,
  LegalDocType,
} from './components/AtelierSection';
import { CartDrawer, CartItem } from './components/CartDrawer';
import { MetaPixelModal } from './components/MetaPixelModal';
import { ReverseShopifyAdmin } from './components/ReverseShopifyAdmin';
import {
  OrderConfirmationState,
  PostPaymentModal,
} from './components/PostPaymentModal';
import { NewsletterAndVipSection } from './components/NewsletterAndVipSection';
import { CookieConsentBanner } from './components/CookieConsentBanner';
import { trackStoreEvent } from './lib/storeAnalytics';

export default function App() {
  const [products, setProducts] = useState<JacketProduct[]>(INITIAL_EIGHT_PRODUCTS);
  const [selectedColorId, setSelectedColorId] = useState<string>(KHABIBI_COLORS[0].id);
  const [showStickyNav, setShowStickyNav] = useState<boolean>(false);
  const [cartOpen, setCartOpen] = useState<boolean>(false);
  const [pixelModalOpen, setPixelModalOpen] = useState<boolean>(false);
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(null);
  const [fastCheckoutLoading, setFastCheckoutLoading] = useState<boolean>(false);
  const [legalDialog, setLegalDialog] = useState<LegalDocType>(null);
  const [externalOpenProductId, setExternalOpenProductId] = useState<string | null>(null);
  const [activeVoucherCode, setActiveVoucherCode] = useState<string>('');
  const [pixelConfig, setPixelConfig] = useState<MetaPixelConfig>(() => loadLocalPixelConfig());
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderConfirmation, setOrderConfirmation] = useState<OrderConfirmationState | null>(null);

  // Only preload the 5 hero front cutouts (not 30+ full-res gallery shots) + record 1st-party page_view
  useEffect(() => {
    preloadGalleryImages(KHABIBI_COLORS.map((c) => c.frontImage));
    trackStoreEvent('page_view');
  }, []);

  // Load authoritative Reverse-Shopify catalog from server (no-store so admin edits appear immediately)
  useEffect(() => {
    let active = true;
    fetch('/api/catalog', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { products?: JacketProduct[] } | null) => {
        if (active && Array.isArray(data?.products) && data.products.length > 0) {
          setProducts(data.products);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Show minimal sticky bar only once scrolled past the full-viewport Blendy hero
  useEffect(() => {
    const onScroll = () => {
      setShowStickyNav(window.scrollY > window.innerHeight * 0.72);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let active = true;
    const local = loadLocalPixelConfig();

    fetch('/api/pixel-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverConfig: MetaPixelConfig | null) => {
        if (!active) return;
        if (!serverConfig) {
          initAllAnalytics(local);
          return;
        }
        const merged: MetaPixelConfig = {
          ...local,
          ...serverConfig,
          pixelId: serverConfig.pixelId || local.pixelId,
          enabled: serverConfig.pixelId ? serverConfig.enabled : local.enabled,
          ga4MeasurementId: serverConfig.ga4MeasurementId || local.ga4MeasurementId,
          gtmId: serverConfig.gtmId || local.gtmId,
          tiktokPixelId: serverConfig.tiktokPixelId || local.tiktokPixelId,
        };
        setPixelConfig(merged);
        saveLocalPixelConfig(merged);
        initAllAnalytics(merged);
      })
      .catch(() => {
        if (active) initAllAnalytics(local);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkoutState = params.get('checkout');
    const sessionId = params.get('session_id');
    if (checkoutState === 'success' && sessionId) {
      Promise.all([
        fetch(`/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`).then(
          (res) => (res.ok ? res.json() : null)
        ),
        fetch('/api/pixel-config')
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      ])
        .then(
          ([data, latestPixel]: [
            {
              amountTotalCents?: number;
              mode?: 'stripe' | 'preview';
              orderId?: string;
              contentIds?: string[];
              numItems?: number;
              n8nSent?: boolean;
              telegramSent?: boolean;
            } | null,
            MetaPixelConfig | null,
          ]) => {
            const totalEur = data?.amountTotalCents ? data.amountTotalCents / 100 : 177;
            setOrderConfirmation({
              sessionId,
              orderNumber: data?.orderId,
              totalEur,
              mode: data?.mode ?? 'stripe',
              n8nSent: data?.n8nSent,
              telegramSent: data?.telegramSent,
            });
            setCartItems([]);
            if (latestPixel?.pixelId) {
              initAllAnalytics(latestPixel);
            }
            trackMetaEvent(
              'Purchase',
              {
                currency: 'EUR',
                value: totalEur,
                content_type: 'product',
                content_ids:
                  Array.isArray(data?.contentIds) && data.contentIds.length > 0
                    ? data.contentIds
                    : ['khabibi'],
                num_items: data?.numItems ?? 1,
              },
              latestPixel ?? undefined,
              data?.orderId ?? sessionId
            );
          }
        )
        .catch(() => {
          setOrderConfirmation({
            sessionId,
            totalEur: 177,
            mode: 'stripe',
          });
        });

      window.history.replaceState({}, '', window.location.pathname);
    }

    // Preserve old Lovable & Shopify Sidelinks (/products/:id, /kollektion, /datenschutz, /impressum, etc.)
    const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    const productParam = params.get('product')?.toLowerCase();
    const colorParam = params.get('color')?.toLowerCase();

    if (colorParam && KHABIBI_COLORS.some((c) => c.id === colorParam)) {
      setSelectedColorId(colorParam);
    }

    const resolveProductSlug = (slug: string): string | null => {
      const clean = slug.replace(/^\/?(products|product|shop|kollektion)\//, '');
      const exact = INITIAL_EIGHT_PRODUCTS.find((p) => p.id === clean);
      if (exact) return exact.id;
      const partial = INITIAL_EIGHT_PRODUCTS.find(
        (p) => clean.includes(p.id) || p.name.toLowerCase().includes(clean)
      );
      return partial ? partial.id : null;
    };

    if (productParam) {
      const resolved = resolveProductSlug(productParam);
      if (resolved) setExternalOpenProductId(resolved);
    } else if (path && path !== '/') {
      if (path === '/datenschutz' || path === '/privacy') {
        setLegalDialog('datenschutz');
      } else if (path === '/impressum') {
        setLegalDialog('impressum');
      } else if (path === '/agb') {
        setLegalDialog('agb');
      } else if (path === '/widerruf' || path === '/returns') {
        setLegalDialog('widerruf');
      } else if (path === '/versand' || path === '/shipping') {
        setLegalDialog('versand');
      } else if (path === '/admin') {
        setAdminModalOpen(true);
      } else if (path === '/kollektion' || path === '/shop' || path === '/collection') {
        setTimeout(() => {
          document.getElementById('kollektion')?.scrollIntoView({ behavior: 'smooth' });
        }, 250);
      } else if (path === '/masschecker' || path === '/khabibi') {
        setTimeout(() => {
          document.getElementById('konfigurator')?.scrollIntoView({ behavior: 'smooth' });
        }, 250);
      } else {
        const matched = resolveProductSlug(path);
        if (matched) {
          setExternalOpenProductId(matched);
        }
      }
    }
  }, []);

  const khabibiProduct = useMemo(
    () => products.find((p) => p.id === 'khabibi') ?? INITIAL_EIGHT_PRODUCTS[0],
    [products]
  );

  const handleSelectColor = useCallback(
    (colorId: string, source: 'hero' | 'gallery' | 'autoplay' = 'gallery') => {
      setSelectedColorId(colorId);
      if (source !== 'autoplay') {
        const variant = KHABIBI_COLORS.find((v) => v.id === colorId);
        if (variant) {
          trackMetaEvent('ViewContent', {
            content_name: 'Model Khabibi',
            content_category: 'Herren Lederjacken Nappa',
            content_ids: ['khabibi'],
            content_type: 'product',
            leather_color: variant.name,
            currency: 'EUR',
            value: khabibiProduct.priceEur,
          });
          trackStoreEvent('view_content', {
            productId: 'khabibi',
            productName: khabibiProduct.name,
            colorName: variant.name,
            valueEur: khabibiProduct.priceEur,
          });
        }
      }
    },
    [khabibiProduct.priceEur]
  );

  const addConfiguredToCart = useCallback(
    (payload: ConfiguredOrderPayload, openDrawer: boolean) => {
      const uid = `${payload.productId}__${payload.colorVariant.id}__${payload.sizeLabel}__${payload.customMeasure}__${payload.giftWrap ? 'gift' : 'std'}`;

      setCartItems((prev) => {
        const existing = prev.find((item) => item.uid === uid);
        if (existing) {
          return prev.map((item) =>
            item.uid === uid ? { ...item, quantity: Math.min(10, item.quantity + 1) } : item
          );
        }
        return [
          ...prev,
          {
            uid,
            productId: payload.productId,
            productName: payload.productName,
            colorVariant: payload.colorVariant,
            sizeLabel: payload.sizeLabel,
            customMeasure: payload.customMeasure,
            giftWrap: payload.giftWrap,
            priceEur: payload.priceEur,
            quantity: 1,
          },
        ];
      });

      trackMetaEvent('AddToCart', {
        content_name: payload.productName,
        content_ids: [payload.productId],
        content_type: 'product',
        leather_color: payload.colorVariant.name,
        size: payload.sizeLabel,
        currency: 'EUR',
        value: payload.priceEur,
      });
      trackStoreEvent('add_to_cart', {
        productId: payload.productId,
        productName: payload.productName,
        colorName: payload.colorVariant.name,
        valueEur: payload.priceEur,
      });

      if (openDrawer) {
        setCartOpen(true);
      }
    },
    []
  );

  const handleUpdateQty = useCallback((uid: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) =>
          item.uid === uid
            ? { ...item, quantity: Math.min(10, Math.max(0, item.quantity + delta)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const handleRemoveItem = useCallback((uid: string) => {
    setCartItems((prev) => prev.filter((item) => item.uid !== uid));
  }, []);

  const handleApplyCartMeasure = useCallback(
    (summary: string, recommendedSize: string, useCustom: boolean) => {
      setCartItems((prev) =>
        prev.map((item, idx) =>
          idx === 0
            ? {
                ...item,
                sizeLabel: useCustom ? 'Maßanfertigung' : recommendedSize,
                customMeasure: summary,
              }
            : item
        )
      );
    },
    []
  );

  const handleSavePixelConfig = useCallback(
    async (nextConfig: MetaPixelConfig) => {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (adminSessionToken) {
        headers.Authorization = `Bearer ${adminSessionToken}`;
      }
      const res = await fetch('/api/pixel-config', {
        method: 'POST',
        headers,
        body: JSON.stringify(nextConfig),
      });
      const data = (await res.json()) as MetaPixelConfig & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? 'Speichern fehlgeschlagen (bitte über Admin einloggen).');
      }
      setPixelConfig(data);
      saveLocalPixelConfig(data);
      initAllAnalytics(data);
    },
    [adminSessionToken]
  );

  const handleDirectFastCheckout = useCallback(
    async (payload: ConfiguredOrderPayload) => {
      if (fastCheckoutLoading) return;
      setFastCheckoutLoading(true);

      const cleanVoucher = activeVoucherCode.trim().toUpperCase();
      const voucherOk =
        payload.priceEur >= 49 &&
        ['TREUE10', 'MRKSHI10', 'BLACKFRIDAY', 'VIP10'].includes(cleanVoucher);
      const effectiveEur = Math.max(1, payload.priceEur - (voucherOk ? 10 : 0));

      const checkoutEventId = generateMetaEventId('ic');
      const metaAttr = getMetaAttributionParams();

      trackMetaEvent(
        'InitiateCheckout',
        {
          currency: 'EUR',
          value: effectiveEur,
          num_items: 1,
          content_ids: [payload.productId],
          leather_colors: [payload.colorVariant.name],
        },
        undefined,
        checkoutEventId
      );
      trackStoreEvent('initiate_checkout', {
        productId: payload.productId,
        productName: payload.productName,
        colorName: payload.colorVariant.name,
        valueEur: effectiveEur,
      });

      try {
        const res = await fetch('/api/checkout/create-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            checkoutEventId,
            fbc: metaAttr.fbc,
            fbp: metaAttr.fbp,
            voucherCode: voucherOk ? cleanVoucher : undefined,
            measurementsSummary: payload.customMeasure || undefined,
            items: [
              {
                productId: payload.productId,
                colorId: payload.colorVariant.id,
                colorName: payload.colorVariant.name,
                sizeLabel: payload.sizeLabel,
                customMeasure: payload.customMeasure,
                giftWrap: payload.giftWrap,
                quantity: 1,
              },
            ],
          }),
        });

        const data = (await res.json()) as { mode?: string; url?: string };
        if (res.ok && data.mode === 'stripe' && data.url) {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
          return;
        }
        // Fallback: place in cart & open drawer if preview mode or error
        addConfiguredToCart(payload, true);
      } catch {
        addConfiguredToCart(payload, true);
      } finally {
        setFastCheckoutLoading(false);
      }
    },
    [activeVoucherCode, addConfiguredToCart, fastCheckoutLoading]
  );

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const totalCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const trackingActive =
    (pixelConfig.enabled && Boolean(pixelConfig.pixelId)) ||
    Boolean(pixelConfig.ga4MeasurementId) ||
    Boolean(pixelConfig.gtmId) ||
    Boolean(pixelConfig.tiktokPixelId);

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      {/* Scrolled Minimal Bar (pure white + sharp black contrast) */}
      {showStickyNav && (
        <header className="fixed top-0 inset-x-0 z-30 h-[52px] bg-white/95 backdrop-blur-sm border-b border-black/15 px-4 md:px-8 flex items-center justify-between">
          <a
            href="#"
            className="font-brand text-[24px] text-black whitespace-nowrap shrink-0"
          >
            MRKSHI
          </a>

          <nav className="hidden sm:flex items-center gap-6 text-[13px] font-bold uppercase tracking-[0.06em] text-black/70">
            <button
              type="button"
              onClick={() => scrollToSection('konfigurator')}
              className="hover:text-black cursor-pointer"
            >
              Model Khabibi
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('kollektion')}
              className="hover:text-black cursor-pointer"
            >
              Alle 9 Modelle
            </button>
          </nav>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="inline-flex items-center gap-2 h-[36px] px-3.5 bg-black text-white text-[12.5px] font-bold uppercase tracking-[0.05em] hover:bg-neutral-800 cursor-pointer whitespace-nowrap"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span className="tabular-nums">Warenkorb ({totalCount})</span>
          </button>
        </header>
      )}

      <main className="flex-1">
        {/* 1. Full-Viewport Blendy Color-Flood Panel-Wipe Hero (ONLY Khabibi 5 Front Cutouts) */}
        <HeroTryOn
          selectedColorId={selectedColorId}
          cartCount={totalCount}
          onSelectColor={handleSelectColor}
          onOpenCart={() => setCartOpen(true)}
          onScrollToConfigurator={() => scrollToSection('konfigurator')}
          onScrollToCollection={() => scrollToSection('kollektion')}
        />

        {/* 2. Fast Preloaded Gallery, Maßchecker & Configuration for Model Khabibi */}
        <ProductConfigurator
          selectedColorId={selectedColorId}
          priceEur={khabibiProduct.priceEur}
          compareAtEur={khabibiProduct.compareAtEur}
          stockTotal={khabibiProduct.stockTotal}
          extraGalleryUrls={khabibiProduct.gallery}
          fastCheckoutLoading={fastCheckoutLoading}
          onSelectColor={(colorId) => handleSelectColor(colorId, 'gallery')}
          onAddToCart={addConfiguredToCart}
          onDirectStripeCheckout={handleDirectFastCheckout}
        />

        {/* 3. All 9 Real Models (1. Khabibi, 2. PUFFER, 3. Badboy, ...) */}
        <CollectionSixSection
          products={products}
          externalOpenProductId={externalOpenProductId}
          fastCheckoutLoading={fastCheckoutLoading}
          onClearExternalOpen={() => setExternalOpenProductId(null)}
          onAddToCart={addConfiguredToCart}
          onDirectFastCheckout={handleDirectFastCheckout}
          onSelectHeroColor={(colorId) => handleSelectColor(colorId, 'gallery')}
          onViewProduct={(prod, colorName) => {
            trackMetaEvent('ViewContent', {
              content_name: prod.name,
              content_category: prod.leatherType,
              content_ids: [prod.id],
              content_type: 'product',
              leather_color: colorName,
              currency: 'EUR',
              value: prod.priceEur,
            });
            trackStoreEvent('view_content', {
              productId: prod.id,
              productName: prod.name,
              colorName,
              valueEur: prod.priceEur,
            });
          }}
        />

        {/* 4. Trust Strip, DHL Express, 14-Day DE Return & Verified Reviews */}
        <TrustAndReviewsSection />

        {/* 5. VIP Treue-Club & E-Mail-Newsletter (10 € Sofort-Gutschein TREUE10) */}
        <NewsletterAndVipSection
          activeVoucherCode={activeVoucherCode}
          onActivateVoucher={(code) => {
            setActiveVoucherCode(code);
            if (cartItems.length > 0) setCartOpen(true);
          }}
          onOpenPrivacy={() => setLegalDialog('datenschutz')}
        />

        {/* 6. Atelier Provenance & Legal Footer (DSGVO, Pixel & Reverse-Shopify Admin) */}
        <AtelierSectionAndFooter
          pixelConfigured={trackingActive}
          activeLegalDialog={legalDialog}
          onChangeLegalDialog={setLegalDialog}
          onOpenPixelSettings={() => setPixelModalOpen(true)}
          onOpenAdminPanel={() => setAdminModalOpen(true)}
        />
      </main>

      <CartDrawer
        open={cartOpen}
        items={cartItems}
        activeVoucherCode={activeVoucherCode}
        onVoucherChange={setActiveVoucherCode}
        onClose={() => setCartOpen(false)}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onApplyCartMeasure={handleApplyCartMeasure}
        onInitiateCheckout={(items, totalEur, eventId) => {
          trackMetaEvent(
            'InitiateCheckout',
            {
              currency: 'EUR',
              value: totalEur,
              num_items: items.reduce((sum, i) => sum + i.quantity, 0),
              content_ids: items.map((i) => i.productId),
              leather_colors: items.map((i) => i.colorVariant.name),
            },
            undefined,
            eventId
          );
          trackStoreEvent('initiate_checkout', {
            productId: items[0]?.productId,
            productName: items.map((i) => i.productName).join(', '),
            colorName: items[0]?.colorVariant.name,
            valueEur: totalEur,
          });
        }}
        onPreviewPurchaseComplete={(sessionId, totalEur, items, meta) => {
          trackMetaEvent(
            'Purchase',
            {
              currency: 'EUR',
              value: totalEur,
              content_type: 'product',
              content_ids: items.map((i) => i.productId),
              leather_colors: items.map((i) => i.colorVariant.name),
            },
            undefined,
            meta?.orderNumber ?? sessionId
          );
          setCartItems([]);
          setCartOpen(false);
          setOrderConfirmation({
            sessionId,
            orderNumber: meta?.orderNumber,
            totalEur,
            mode: 'preview',
            n8nSent: meta?.n8nSent,
            telegramSent: meta?.telegramSent,
          });
        }}
      />

      <MetaPixelModal
        open={pixelModalOpen}
        config={pixelConfig ?? DEFAULT_PIXEL_CONFIG}
        onClose={() => setPixelModalOpen(false)}
        onSaveConfig={handleSavePixelConfig}
        onSendTestEvent={() => {
          const activeVariant =
            KHABIBI_COLORS.find((v) => v.id === selectedColorId) ?? KHABIBI_COLORS[0];
          trackMetaEvent('ViewContent', {
            content_name: 'Model Khabibi (Test)',
            leather_color: activeVariant.name,
            currency: 'EUR',
            value: khabibiProduct.priceEur,
          });
        }}
      />

      <ReverseShopifyAdmin
        open={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        onCatalogUpdated={(next) => setProducts(next)}
        onOpenPixelSettings={(activeAdminToken) => {
          if (activeAdminToken) setAdminSessionToken(activeAdminToken);
          setAdminModalOpen(false);
          setPixelModalOpen(true);
        }}
      />

      <PostPaymentModal
        confirmation={orderConfirmation}
        onClose={() => setOrderConfirmation(null)}
      />

      <CookieConsentBanner
        onConsentUpdated={(status) => {
          if (status === 'all') {
            initAllAnalytics(pixelConfig, true);
          }
        }}
        onOpenPrivacy={() => setLegalDialog('datenschutz')}
      />
    </div>
  );
}
