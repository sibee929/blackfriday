import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand, Gift, Ruler, ShoppingBag, Sparkles, X } from 'lucide-react';
import {
  EU_SIZES,
  GalleryShot,
  getAllKhabibiUrls,
  KHABIBI_COLORS,
  KHABIBI_DETAIL_SHOTS,
  KhabibiColorVariant,
  preloadGalleryImages,
} from '../data/jackets';
import { optimizeProductImage } from '../data/catalog';
import { MassCheckerModal, MassCheckerResult } from './MassCheckerModal';
import { PaymentLogos } from './PaymentLogos';

export interface ConfiguredOrderPayload {
  productId: string;
  productName: string;
  colorVariant: {
    id: string;
    name: string;
    hex: string;
    frontImage: string;
  };
  sizeLabel: string;
  customMeasure: string;
  giftWrap: boolean;
  priceEur: number;
}

interface ProductConfiguratorProps {
  selectedColorId: string;
  priceEur?: number;
  stockTotal?: number;
  extraGalleryUrls?: string[];
  onSelectColor: (colorId: string) => void;
  onAddToCart: (payload: ConfiguredOrderPayload, openDrawer: boolean) => void;
  onDirectStripeCheckout: (payload: ConfiguredOrderPayload) => void;
}

export const ProductConfigurator: React.FC<ProductConfiguratorProps> = ({
  selectedColorId,
  priceEur = 177,
  stockTotal = 631,
  extraGalleryUrls = [],
  onSelectColor,
  onAddToCart,
  onDirectStripeCheckout,
}) => {
  const activeVariant: KhabibiColorVariant = useMemo(
    () => KHABIBI_COLORS.find((v) => v.id === selectedColorId) ?? KHABIBI_COLORS[0],
    [selectedColorId]
  );

  const galleryItems: GalleryShot[] = useMemo(() => {
    const items: GalleryShot[] = [
      {
        id: `front-${activeVariant.id}`,
        label: `Front (${activeVariant.name})`,
        src: activeVariant.frontImage,
        colorId: activeVariant.id,
      },
    ];
    if (activeVariant.modelLookImage) {
      items.push({
        id: `look-${activeVariant.id}`,
        label: 'Am Model',
        src: activeVariant.modelLookImage,
        colorId: activeVariant.id,
      });
    }
    const seen = new Set(items.map((i) => i.src));
    for (const d of KHABIBI_DETAIL_SHOTS) {
      if (!seen.has(d.src)) {
        seen.add(d.src);
        items.push(d);
      }
    }
    extraGalleryUrls.forEach((url, idx) => {
      if (url && !seen.has(url)) {
        seen.add(url);
        items.push({
          id: `shop-${idx}`,
          label: `Atelier Aufnahme ${idx + 1}`,
          src: optimizeProductImage(url, 1000),
        });
      }
    });
    return items;
  }, [activeVariant, extraGalleryUrls]);

  const [activeShotId, setActiveShotId] = useState<string>(`front-${activeVariant.id}`);
  const [sizeMode, setSizeMode] = useState<'standard' | 'custom'>('standard');
  const [selectedSize, setSelectedSize] = useState<string>(EU_SIZES[1]);
  const [chestCm, setChestCm] = useState<string>('104');
  const [sleeveCm, setSleeveCm] = useState<string>('65');
  const [heightCm, setHeightCm] = useState<string>('181');
  const [massCheckerNote, setMassCheckerNote] = useState<string>('');
  const [massCheckerOpen, setMassCheckerOpen] = useState<boolean>(false);
  const [giftWrap, setGiftWrap] = useState<boolean>(true);
  const [zoomOpen, setZoomOpen] = useState<boolean>(false);

  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    preloadGalleryImages(getAllKhabibiUrls());
  }, []);

  useEffect(() => {
    setActiveShotId(`front-${activeVariant.id}`);
  }, [activeVariant.id]);

  // Subtle scroll-reveal motion via IntersectionObserver + WAAPI
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.animate(
              [
                { opacity: 0.78, transform: 'translateY(18px)' },
                { opacity: 1, transform: 'translateY(0px)' },
              ],
              { duration: 480, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'both' }
            );
            obs.disconnect();
          }
        }
      },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const activeIdx = Math.max(
    0,
    galleryItems.findIndex((item) => item.id === activeShotId)
  );
  const activeShot = galleryItems[activeIdx] ?? galleryItems[0];

  const stepShot = (dir: 1 | -1) => {
    const nextIdx = (activeIdx + dir + galleryItems.length) % galleryItems.length;
    setActiveShotId(galleryItems[nextIdx].id);
  };

  const handleApplyMassChecker = (res: MassCheckerResult, useCustomTailoring: boolean) => {
    if (res.chestCm) setChestCm(String(res.chestCm));
    if (res.sleeveCm) setSleeveCm(String(res.sleeveCm));
    setHeightCm(String(res.heightCm));
    setMassCheckerNote(res.summaryString);

    if (useCustomTailoring) {
      setSizeMode('custom');
    } else {
      setSizeMode('standard');
      const matched = EU_SIZES.find((s) => s.startsWith(res.recommendedSize));
      setSelectedSize(matched ?? `${res.recommendedSize}`);
    }
  };

  const buildPayload = (): ConfiguredOrderPayload => ({
    productId: 'khabibi',
    productName: 'Model Khabibi',
    colorVariant: {
      id: activeVariant.id,
      name: activeVariant.name,
      hex: activeVariant.hex,
      frontImage: activeVariant.frontImage,
    },
    sizeLabel: sizeMode === 'custom' ? 'Maßanfertigung' : selectedSize,
    customMeasure:
      sizeMode === 'custom'
        ? `Brust ${chestCm || '—'} cm · Ärmel ${sleeveCm || '—'} cm · ${heightCm || '—'} cm`
        : massCheckerNote,
    giftWrap,
    priceEur,
  });

  return (
    <section
      ref={sectionRef}
      id="konfigurator"
      className="py-12 md:py-20 px-4 sm:px-6 md:px-10 bg-white text-black border-b border-black/15"
    >
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-start">
        {/* Left: Pure White High-Contrast Gallery with ALL Shop Photos */}
        <div className="lg:col-span-6 lg:sticky lg:top-16">
          <div className="relative rounded-none border border-black/15 overflow-hidden bg-white aspect-[4/4.3]">
            <img
              key={activeShot.src}
              src={activeShot.src}
              alt={`Model Khabibi — ${activeShot.label}`}
              fetchPriority="high"
              decoding="async"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain p-2 sm:p-4"
            />
            <span className="absolute left-3 top-3 px-2 py-0.5 bg-black text-white font-mono text-[11px] font-bold tabular-nums">
              {activeIdx + 1} / {galleryItems.length}
            </span>
            <button
              type="button"
              onClick={() => setZoomOpen(true)}
              aria-label="Ansicht vergrößern"
              className="absolute right-3 top-3 w-9 h-9 bg-white border border-black text-black flex items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              <Expand className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => stepShot(-1)}
              aria-label="Vorheriges Bild"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/95 border border-black/25 text-black flex items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => stepShot(1)}
              aria-label="Nächstes Bild"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/95 border border-black/25 text-black flex items-center justify-center hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Complete Scrollable Thumbnail Strip (all original Khabibi shop photos) */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {galleryItems.map((item) => {
              const selected = item.id === activeShot.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveShotId(item.id)}
                  aria-label={item.label}
                  className={`relative w-16 h-16 shrink-0 overflow-hidden bg-white border transition-colors cursor-pointer ${
                    selected
                      ? 'border-2 border-black'
                      : 'border-black/15 hover:border-black'
                  }`}
                >
                  <img
                    src={optimizeProductImage(item.src, 220)}
                    alt={item.label}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Bold Masculine Black & White Purchase Module */}
        <div className="lg:col-span-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 bg-black text-white text-[11px] font-bold uppercase tracking-[0.12em]">
              -50 % RABATT · PREIS WIE AUSGEZEICHNET
            </span>
            <span className="px-2.5 py-1 border border-black text-black text-[11px] font-bold uppercase tracking-[0.08em]">
              BLACK FRIDAY & ATELIER-DIREKTPREIS
            </span>
          </div>

          <p className="mt-3 text-[11.5px] font-bold tracking-[0.18em] uppercase text-black/70">
            01 · 100 % NATUR-LAMMNAPPA · KLEIN-CHARGE MARRAKESCH · {stockTotal} STK. VERFÜGBAR
          </p>
          <h2 className="mt-1.5 font-masculine text-[32px] md:text-[42px] leading-[1.02] text-black">
            MODEL KHABIBI — {activeVariant.name}
          </h2>

          <div className="mt-3 flex flex-wrap items-baseline gap-3 tabular-nums">
            <span className="font-masculine text-[34px] font-bold text-black">
              {priceEur},00 €
            </span>
            <span className="text-[18px] font-semibold text-black/45 line-through">354,00 €</span>
            <span className="px-2 py-0.5 bg-black text-white text-[11.5px] font-bold uppercase tracking-[0.06em]">
              DU SPARST 177 € (-50 %)
            </span>
          </div>

          <p className="mt-2 text-[12px] font-bold uppercase tracking-[0.08em] text-black">
            ✓ JEDE FARBE · JEDE GRÖSSE (S–3XL) · 0,00 € KOSTENLOSE LIEFERUNG BIS AN DIE HAUSTÜR
          </p>

          <p className="mt-3.5 text-[15px] font-medium leading-[1.6] text-black/85">
            {activeVariant.dyeNote} Durchgehendes Shearling-Innenfutter, gefertigt im Familienatelier
            in Marrakesch für den deutschen Winter.
          </p>

          {/* Emotional & Psychological Conversion Anchor (Pure White / Black Border) */}
          <div className="mt-4 p-3.5 border border-black bg-[#FAFAFA] space-y-1.5 text-[12.5px] leading-[1.5] text-black">
            <p className="font-bold uppercase tracking-[0.06em] text-black">
              WARUM MÄNNER AUF DIESE JACKE ANGESPROCHEN WERDEN:
            </p>
            <p className="font-medium text-black/80">
              Statt dem immer gleichen Einheits-Schwarz trägst du handgefärbtes Voll-Nappa mit
              unverwechselbarem Griff & Duft. Im deutschen Einzelhandel kostet dieselbe Lederqualität{' '}
              <strong>354 € bis 550 €</strong> — bei MRKSHI zahlst du ohne Zwischenhändler{' '}
              <strong>exakt 177,00 € bis vor deine Haustür</strong>.
            </p>
            <p className="text-[11.5px] font-bold uppercase tracking-[0.05em] text-black pt-0.5">
              ⚡ Färbe-Charge stark limitiert · Heute bestellt = 0 € DHL Express + 14 Tage Geld-zurück
            </p>
          </div>

          {/* 1. 5 Khabibi Colors */}
          <div className="mt-6 pt-5 border-t border-black/15">
            <span className="block text-[13px] font-bold uppercase tracking-[0.08em] text-black">
              LEDERFARBE: {activeVariant.name}
            </span>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {KHABIBI_COLORS.map((variant) => {
                const selected = variant.id === activeVariant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => onSelectColor(variant.id)}
                    className={`inline-flex items-center gap-2 h-[40px] px-3.5 border text-[13px] font-bold uppercase tracking-[0.04em] transition-colors cursor-pointer ${
                      selected
                        ? 'border-black bg-black text-white'
                        : 'border-black/25 bg-white text-black hover:border-black'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/40 shrink-0"
                      style={{ backgroundColor: variant.hex }}
                    />
                    <span>{variant.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Size + Maßchecker + Free Bespoke Measurement */}
          <div className="mt-6 pt-5 border-t border-black/15">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-black">
                GRÖSSE & PASSFORM
              </span>
              <button
                type="button"
                onClick={() => setMassCheckerOpen(true)}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-bold uppercase tracking-[0.05em] text-black underline underline-offset-4 hover:opacity-70 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Maßchecker starten</span>
              </button>
            </div>

            <div className="grid grid-cols-2 border border-black bg-white">
              <button
                type="button"
                onClick={() => setSizeMode('standard')}
                className={`h-10 text-[12.5px] font-bold uppercase tracking-[0.06em] transition-colors cursor-pointer ${
                  sizeMode === 'standard'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-black/5'
                }`}
              >
                EU-Größe
              </button>
              <button
                type="button"
                onClick={() => setSizeMode('custom')}
                className={`inline-flex items-center justify-center gap-1.5 h-10 text-[12.5px] font-bold uppercase tracking-[0.06em] transition-colors cursor-pointer ${
                  sizeMode === 'custom'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-black/5'
                }`}
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Direkt-Maß (0 €)</span>
              </button>
            </div>

            {sizeMode === 'standard' ? (
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
                {EU_SIZES.map((size) => {
                  const active = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`h-[44px] text-[12.5px] font-bold border transition-colors cursor-pointer tabular-nums ${
                        active
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black border-black/25 hover:border-black'
                      }`}
                    >
                      {size.split(' ')[0]}
                      <span className="block text-[10px] font-medium opacity-75">
                        {size.split(' ')[1]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 p-3.5 border border-black bg-white grid grid-cols-3 gap-2.5">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-black">Brust (cm)</span>
                  <input
                    type="number"
                    min={80}
                    max={150}
                    value={chestCm}
                    onChange={(e) => setChestCm(e.target.value)}
                    className="mt-1 w-full h-9 px-2.5 bg-white border border-black/30 text-[13px] font-semibold text-black tabular-nums"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-black">Ärmel (cm)</span>
                  <input
                    type="number"
                    min={52}
                    max={78}
                    value={sleeveCm}
                    onChange={(e) => setSleeveCm(e.target.value)}
                    className="mt-1 w-full h-9 px-2.5 bg-white border border-black/30 text-[13px] font-semibold text-black tabular-nums"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase text-black">Größe (cm)</span>
                  <input
                    type="number"
                    min={155}
                    max={215}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="mt-1 w-full h-9 px-2.5 bg-white border border-black/30 text-[13px] font-semibold text-black tabular-nums"
                  />
                </label>
              </div>
            )}

            {massCheckerNote && sizeMode === 'standard' && (
              <p className="mt-2 text-[12px] font-semibold text-black border border-black px-3 py-1.5 bg-white">
                ✓ Maßchecker: {massCheckerNote}
              </p>
            )}
          </div>

          {/* Gift option */}
          <label className="mt-4 flex items-center gap-2.5 text-[13px] font-semibold text-black cursor-pointer">
            <input
              type="checkbox"
              checked={giftWrap}
              onChange={(e) => setGiftWrap(e.target.checked)}
              className="w-4 h-4 accent-black"
            />
            <Gift className="w-3.5 h-3.5 text-black" />
            <span>Kostenlose Weihnachts-Geschenkbox (Umtausch bis 15. Januar)</span>
          </label>

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => onAddToCart(buildPayload(), true)}
              className="flex-1 h-[48px] px-5 bg-black text-white text-[14px] font-bold uppercase tracking-[0.06em] hover:bg-neutral-800 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>IN DEN WARENKORB — {priceEur},00 €</span>
            </button>
            <button
              type="button"
              onClick={() => onDirectStripeCheckout(buildPayload())}
              className="h-[48px] px-5 border-2 border-black bg-white text-black text-[14px] font-bold uppercase tracking-[0.06em] hover:bg-black hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            >
              STRIPE CHECKOUT
            </button>
          </div>

          {/* Trusted Payment Partners & Post-Payment Bespoke + Direct Contact */}
          <div className="mt-4 pt-4 border-t border-black/15 space-y-2.5">
            <PaymentLogos size="md" showSecurityNote />

            <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] font-semibold text-black/80">
              <span>✓ Sondermaß & Maßabgleich direkt nach Bezahlung möglich</span>
              <a
                href="https://wa.me/4917643488260?text=Hallo%20MRKSHI%20Team,%20ich%20habe%20eine%20Frage%20zu%20Gr%C3%B6%C3%9Fe%20%26%20Farbe."
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold uppercase tracking-[0.05em] text-black underline underline-offset-4 hover:opacity-70"
              >
                WhatsApp Direkt-Kontakt
              </a>
            </div>
          </div>
        </div>
      </div>

      <MassCheckerModal
        open={massCheckerOpen}
        productName="Model Khabibi"
        colorName={activeVariant.name}
        onClose={() => setMassCheckerOpen(false)}
        onApplyResult={handleApplyMassChecker}
      />

      {zoomOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setZoomOpen(false)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-white border-2 border-black overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setZoomOpen(false)}
              aria-label="Schließen"
              className="absolute right-3 top-3 z-10 w-9 h-9 bg-black text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={activeShot.src}
              alt={activeShot.label}
              referrerPolicy="no-referrer"
              className="w-full max-h-[82vh] object-contain bg-white"
            />
          </div>
        </div>
      )}
    </section>
  );
};
