import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Expand, Ruler, ShoppingBag, Sparkles, X } from 'lucide-react';
import { JacketProduct, optimizeProductImage } from '../data/catalog';
import { preloadGalleryImages } from '../data/jackets';
import { MassCheckerModal, MassCheckerResult } from './MassCheckerModal';
import { ConfiguredOrderPayload } from './ProductConfigurator';

interface CollectionSixSectionProps {
  products: JacketProduct[];
  externalOpenProductId?: string | null;
  fastCheckoutLoading?: boolean;
  onClearExternalOpen?: () => void;
  onAddToCart: (payload: ConfiguredOrderPayload, openDrawer: boolean) => void;
  onDirectFastCheckout?: (payload: ConfiguredOrderPayload) => void;
  onSelectHeroColor?: (colorId: string) => void;
  onViewProduct?: (product: JacketProduct, colorName: string) => void;
}

type FilterTab = 'alle' | 'nappa' | 'wildleder' | 'rare';

export const CollectionSixSection: React.FC<CollectionSixSectionProps> = ({
  products,
  externalOpenProductId,
  fastCheckoutLoading = false,
  onClearExternalOpen,
  onAddToCart,
  onDirectFastCheckout,
  onSelectHeroColor,
  onViewProduct,
}) => {
  const [filter, setFilter] = useState<FilterTab>('alle');
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [detailProduct, setDetailProduct] = useState<JacketProduct | null>(null);
  const [detailImageIdx, setDetailImageIdx] = useState<number>(0);
  const [massCheckerProduct, setMassCheckerProduct] = useState<JacketProduct | null>(null);
  const [customMeasures, setCustomMeasures] = useState<Record<string, string>>({});
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const sectionRef = useRef<HTMLElement | null>(null);

  // Open product gallery modal automatically when visited via Lovable sidelink (/products/:handle)
  useEffect(() => {
    if (!externalOpenProductId) return;
    const match = products.find((p) => p.id === externalOpenProductId);
    if (match) {
      setDetailProduct(match);
      setDetailImageIdx(0);
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onClearExternalOpen?.();
    }
  }, [externalOpenProductId, products, onClearExternalOpen]);

  // Lock background page scroll while detail modal is open so viewport never shifts
  useEffect(() => {
    if (!detailProduct || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailProduct(null);
    };
    window.addEventListener('keydown', onEsc);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onEsc);
    };
  }, [detailProduct]);

  const visibleProducts = useMemo(() => {
    const active = products.filter((p) => p.active);
    if (filter === 'nappa') return active.filter((p) => p.leatherType.includes('Nappa'));
    if (filter === 'wildleder') return active.filter((p) => p.leatherType.includes('Wildleder'));
    if (filter === 'rare') return active.filter((p) => p.colors.length >= 4);
    return active;
  }, [products, filter]);

  const getActiveColor = (product: JacketProduct) => {
    const colorId = selectedColors[product.id];
    return product.colors.find((c) => c.id === colorId) ?? product.colors[0];
  };

  const getActiveSize = (product: JacketProduct) => {
    return selectedSizes[product.id] ?? (product.sizes.includes('M') ? 'M' : product.sizes[0] ?? 'M');
  };

  const handleChooseColor = (product: JacketProduct, colorId: string) => {
    setSelectedColors((prev) => ({ ...prev, [product.id]: colorId }));
    const targetColor = product.colors.find((c) => c.id === colorId);
    if (targetColor?.image) {
      preloadGalleryImages([optimizeProductImage(targetColor.image, 640)]);
    }
    if (targetColor && onViewProduct) {
      onViewProduct(product, targetColor.name);
    }
    if (product.id === 'khabibi' && onSelectHeroColor) {
      const heroIds = ['bleu-petrol', 'bordeaux', 'olive', 'espresso', 'black'];
      if (heroIds.includes(colorId)) {
        onSelectHeroColor(colorId);
      }
    }
  };

  const buildProductPayload = (product: JacketProduct): ConfiguredOrderPayload => {
    const activeColor = getActiveColor(product);
    const activeSize = getActiveSize(product);
    const customNote = customMeasures[product.id] ?? '';

    return {
      productId: product.id,
      productName: product.name,
      colorVariant: {
        id: activeColor.id,
        name: activeColor.name,
        hex: activeColor.hex,
        frontImage: optimizeProductImage(activeColor.image, 640),
      },
      sizeLabel: customNote.includes('Direkt-Maß') ? 'Maßanfertigung' : activeSize,
      customMeasure: customNote,
      giftWrap: true,
      priceEur: product.priceEur,
    };
  };

  const handleBuyProduct = (product: JacketProduct, openDrawer: boolean) => {
    onAddToCart(buildProductPayload(product), openDrawer);
  };

  const handleApplyMassChecker = (res: MassCheckerResult, useCustom: boolean) => {
    if (!massCheckerProduct) return;
    const pid = massCheckerProduct.id;
    const size = massCheckerProduct.sizes.includes(res.recommendedSize)
      ? res.recommendedSize
      : massCheckerProduct.sizes[Math.min(2, massCheckerProduct.sizes.length - 1)] ?? 'M';

    setSelectedSizes((prev) => ({ ...prev, [pid]: size }));
    setCustomMeasures((prev) => ({
      ...prev,
      [pid]: useCustom ? `Direkt-Maß: ${res.summaryString}` : res.summaryString,
    }));
  };

  return (
    <section
      ref={sectionRef}
      id="kollektion"
      className="py-12 md:py-20 px-4 sm:px-6 md:px-10 bg-white text-black"
    >
      <div className="max-w-[1220px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[11.5px] font-bold tracking-[0.2em] uppercase text-black/65">
              9 MODELLE · 50 % RABATT · PREIS WIE AUSGEZEICHNET (STATT 354,00 €)
            </p>
            <h2 className="mt-2 font-masculine text-[28px] md:text-[38px] leading-[1.04] text-black">
              ALLE 9 HERREN-LEDERJACKEN — JEDE FARBE, JEDE GRÖSSE 177,00 €.
            </h2>
          </div>

          {/* Crisp Black/White Filter Bar */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'alle' as const, label: `Alle (${products.filter((p) => p.active).length})` },
              { id: 'rare' as const, label: 'Seltene Farben' },
              { id: 'nappa' as const, label: 'Nappa Leder' },
              { id: 'wildleder' as const, label: 'Wildleder' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`h-9 px-3.5 text-[12px] font-bold uppercase tracking-[0.06em] border transition-colors cursor-pointer ${
                  filter === tab.id
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-black/25 hover:border-black'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* High-Conversion Value Anchor & Psychological Deal Bar */}
        <div className="mt-5 p-3.5 border-2 border-black bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3 text-[12px] font-bold uppercase tracking-[0.06em] text-black">
          <span>🔥 -50 % DEAL (BLACK FRIDAY & DIREKT-ATELIER): 354,00 € → 177,00 €</span>
          <span>✓ ALLE GRÖSSEN S–3XL & SONDERMASS</span>
          <span>✓ 0,00 € KOSTENLOSE LIEFERUNG BIS NACH HAUSE</span>
        </div>

        {/* 9-Product Pure White & Black Grid */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {visibleProducts.map((jacket, cardIdx) => {
            const activeColor = getActiveColor(jacket);
            const activeSize = getActiveSize(jacket);
            const optimizedSrc = optimizeProductImage(activeColor.image, 640);
            const imgFailed = failedImages[optimizedSrc];
            const openDetails = () => {
              setDetailProduct(jacket);
              setDetailImageIdx(0);
              onViewProduct?.(jacket, activeColor.name);
            };

            return (
              <article
                key={jacket.id}
                className="flex flex-col justify-between bg-white border border-black/15 overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:border-black"
              >
                <div>
                  {/* Fast-loading White Studio Image (click anywhere on image to open detail modal) */}
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`${jacket.name} Details & Fotos öffnen`}
                    onClick={openDetails}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openDetails();
                      }
                    }}
                    className="relative aspect-[4/4.4] bg-white border-b border-black/10 overflow-hidden group cursor-pointer"
                  >
                    {!imgFailed && optimizedSrc ? (
                      <img
                        src={optimizedSrc}
                        alt={`${jacket.name} — ${activeColor.name}`}
                        loading={cardIdx < 4 ? 'eager' : 'lazy'}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [optimizedSrc]: true }))
                        }
                        className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex flex-col items-center justify-center p-4 text-center"
                        style={{ backgroundColor: activeColor.hex }}
                      >
                        <span className="text-white font-bold uppercase text-[15px]">
                          {jacket.name}
                        </span>
                        <span className="text-white/85 text-[12px] mt-1">{activeColor.name}</span>
                      </div>
                    )}

                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1 pointer-events-none">
                      <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold tracking-[0.08em] uppercase">
                        {jacket.leatherType}
                      </span>
                      {jacket.stockTotal <= 0 ? (
                        <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-bold tracking-[0.06em] uppercase">
                          Ausverkauft
                        </span>
                      ) : jacket.compareAtEur > jacket.priceEur ? (
                        <span className="px-1.5 py-0.5 bg-white border border-black text-black text-[10px] font-bold tracking-[0.06em] uppercase tabular-nums">
                          -{Math.round(((jacket.compareAtEur - jacket.priceEur) / jacket.compareAtEur) * 100)} %
                        </span>
                      ) : null}
                    </div>

                    <span className="absolute right-2.5 top-2.5 h-8 px-2 bg-white border border-black text-black flex items-center gap-1 group-hover:bg-black group-hover:text-white transition-colors pointer-events-none">
                      <Expand className="w-3.5 h-3.5" />
                      <span className="text-[10.5px] font-bold tabular-nums">
                        {jacket.gallery.length}
                      </span>
                    </span>
                  </div>

                  <div className="p-4">
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={openDetails}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openDetails();
                        }
                      }}
                      className="cursor-pointer group/title"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-black/60 tabular-nums">
                        <span className="font-mono">{jacket.code}</span>
                        <span className="underline underline-offset-2 group-hover/title:text-black">
                          Details & {jacket.gallery.length} Fotos →
                        </span>
                      </div>

                      <h3 className="mt-1 font-masculine text-[21px] font-bold text-black group-hover/title:underline underline-offset-2">
                        {jacket.name}
                      </h3>
                      <p className="text-[12.5px] font-medium text-black/70 line-clamp-2 mt-0.5">
                        {jacket.tagline}
                      </p>
                    </div>

                    {/* Interactive Color Swatches */}
                    <div className="mt-3">
                      <p className="text-[11.5px] font-bold uppercase tracking-[0.04em] text-black mb-1.5 truncate">
                        FARBE: {activeColor.name}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {jacket.colors.map((c) => {
                          const selected = c.id === activeColor.id;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              title={c.name}
                              aria-label={`${jacket.name} Farbe ${c.name}`}
                              onClick={() => handleChooseColor(jacket, c.id)}
                              className={`w-6 h-6 rounded-full border transition-transform cursor-pointer ${
                                selected
                                  ? 'ring-2 ring-black ring-offset-1 scale-105 border-black'
                                  : 'border-black/25 hover:scale-105'
                              }`}
                              style={{ backgroundColor: c.hex }}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Size Picker + Maßchecker */}
                    <div className="mt-3 pt-3 border-t border-black/10">
                      <div className="flex items-center justify-between text-[11.5px] mb-1.5">
                        <span className="font-bold uppercase text-black">GRÖSSE: {activeSize}</span>
                        <button
                          type="button"
                          onClick={() => setMassCheckerProduct(jacket)}
                          className="inline-flex items-center gap-1 font-bold uppercase text-black underline underline-offset-2 hover:opacity-70 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Maßchecker</span>
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {jacket.sizes.map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() =>
                              setSelectedSizes((prev) => ({ ...prev, [jacket.id]: sz }))
                            }
                            className={`h-7 min-w-[34px] px-1.5 text-[11px] font-bold border cursor-pointer tabular-nums ${
                              activeSize === sz
                                ? 'bg-black text-white border-black'
                                : 'bg-white text-black border-black/20 hover:border-black'
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                      {customMeasures[jacket.id] && (
                        <p className="mt-1.5 text-[11px] font-semibold text-black truncate">
                          ✓ {customMeasures[jacket.id]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Price & Buy Footer */}
                <div className="px-4 pb-4 pt-2.5 border-t border-black/10 space-y-2.5">
                  <div className="flex items-baseline justify-between tabular-nums">
                    <div>
                      <span className="font-masculine text-[22px] font-bold text-black">
                        {jacket.priceEur},00 €
                      </span>
                      <span className="ml-1.5 text-[12px] font-semibold text-black/45 line-through">
                        {jacket.compareAtEur},00 €
                      </span>
                    </div>
                    <span className="text-[10.5px] font-bold uppercase text-black">
                      HAUSTÜR-LIEFERUNG 0 €
                    </span>
                  </div>

                  <div className="flex gap-1.5">
                    {jacket.stockTotal <= 0 ? (
                      <span className="flex-1 h-9 px-2.5 bg-neutral-200 text-neutral-600 text-[11.5px] font-bold uppercase tracking-[0.05em] flex items-center justify-center">
                        Ausverkauft
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={fastCheckoutLoading}
                          onClick={() =>
                            onDirectFastCheckout
                              ? onDirectFastCheckout(buildProductPayload(jacket))
                              : handleBuyProduct(jacket, true)
                          }
                          className="flex-1 h-9 px-2.5 bg-black text-white text-[12px] font-bold uppercase tracking-[0.05em] hover:bg-neutral-800 disabled:opacity-60 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <span>⚡ Sofort kaufen</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleBuyProduct(jacket, true)}
                          aria-label={`${jacket.name} in den Warenkorb`}
                          title="In den Warenkorb"
                          className="h-9 px-2.5 border border-black text-black text-[11.5px] font-bold uppercase hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={openDetails}
                      className="h-9 px-2 border border-black/30 text-black text-[11px] font-bold uppercase hover:border-black transition-colors cursor-pointer"
                    >
                      Fotos ({jacket.gallery.length})
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Full Multi-Angle Gallery Modal rendered via Portal directly in viewport */}
      {detailProduct &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setDetailProduct(null)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white border-2 border-black shadow-2xl p-5 md:p-7 text-black"
          >
            <div className="sticky top-0 z-10 bg-white flex items-start justify-between gap-4 pb-3 pt-1 border-b border-black/15">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-black/65">
                  {detailProduct.code} · {detailProduct.leatherType} · 100 % NATURLEDER
                </p>
                <h3 className="font-masculine text-[26px] font-bold text-black">
                  {detailProduct.name} — {getActiveColor(detailProduct).name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailProduct(null)}
                aria-label="Schließen"
                className="w-9 h-9 bg-black text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-6">
                {(() => {
                  const imgs = Array.from(
                    new Set([getActiveColor(detailProduct).image, ...detailProduct.gallery].filter(Boolean))
                  );
                  const safeIdx = Math.min(detailImageIdx, Math.max(0, imgs.length - 1));
                  const shown = optimizeProductImage(imgs[safeIdx] ?? imgs[0], 1000);
                  return (
                    <>
                      <div className="relative aspect-[4/4.3] border border-black/15 bg-white overflow-hidden flex items-center justify-center p-2">
                        <img
                          src={shown}
                          alt={`${detailProduct.name} Ansicht ${safeIdx + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                        <span className="absolute left-2.5 top-2.5 px-2 py-0.5 bg-black text-white font-mono text-[11px] font-bold tabular-nums">
                          {safeIdx + 1} / {imgs.length}
                        </span>
                        {imgs.length > 1 && (
                          <>
                            <button
                              type="button"
                              aria-label="Vorheriges Foto"
                              onClick={() =>
                                setDetailImageIdx((safeIdx - 1 + imgs.length) % imgs.length)
                              }
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-black text-black flex items-center justify-center hover:bg-black hover:text-white cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              aria-label="Nächstes Foto"
                              onClick={() => setDetailImageIdx((safeIdx + 1) % imgs.length)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white border border-black text-black flex items-center justify-center hover:bg-black hover:text-white cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Full Original Shop Thumbnail Grid */}
                      <div className="mt-2.5 grid grid-cols-6 sm:grid-cols-7 gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {imgs.map((u, idx) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setDetailImageIdx(idx)}
                            className={`aspect-square bg-white overflow-hidden border cursor-pointer ${
                              safeIdx === idx
                                ? 'border-2 border-black'
                                : 'border-black/15 hover:border-black'
                            }`}
                          >
                            <img
                              src={optimizeProductImage(u, 220)}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              <div className="md:col-span-6 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <span className="inline-block px-2 py-0.5 bg-black text-white text-[10.5px] font-bold uppercase tracking-[0.08em]">
                      -50 % PREIS WIE AUSGEZEICHNET · DU SPARST 177 €
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2.5 tabular-nums">
                      <span className="font-masculine text-[28px] font-bold text-black">
                        {detailProduct.priceEur},00 €
                      </span>
                      <span className="text-[14px] font-semibold text-black/45 line-through">
                        {detailProduct.compareAtEur},00 €
                      </span>
                      <span className="text-[11.5px] font-bold uppercase text-black">
                        0,00 € LIEFERUNG BIS NACH HAUSE
                      </span>
                    </div>
                  </div>

                  <p className="text-[14.5px] font-medium leading-[1.6] text-black/80">
                    {detailProduct.description}
                  </p>

                  <div>
                    <p className="text-[12.5px] font-bold uppercase tracking-[0.06em] text-black mb-2">
                      LEDERFARBE ({detailProduct.colors.length}):{' '}
                      {getActiveColor(detailProduct).name}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailProduct.colors.map((c) => {
                        const active = c.id === getActiveColor(detailProduct).id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              handleChooseColor(detailProduct, c.id);
                              setDetailImageIdx(0);
                            }}
                            className={`inline-flex items-center gap-1.5 h-8 px-2.5 border text-[12px] font-bold cursor-pointer ${
                              active
                                ? 'border-black bg-black text-white'
                                : 'border-black/25 bg-white text-black hover:border-black'
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-white/40"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span>{c.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[12.5px] font-bold uppercase text-black">
                        GRÖSSE: {getActiveSize(detailProduct)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMassCheckerProduct(detailProduct)}
                        className="inline-flex items-center gap-1 text-[12px] font-bold uppercase underline cursor-pointer"
                      >
                        <Ruler className="w-3.5 h-3.5" />
                        <span>Maßchecker öffnen</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {detailProduct.sizes.map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() =>
                            setSelectedSizes((prev) => ({
                              ...prev,
                              [detailProduct.id]: sz,
                            }))
                          }
                          className={`h-9 min-w-[44px] px-2.5 border text-[12.5px] font-bold cursor-pointer ${
                            getActiveSize(detailProduct) === sz
                              ? 'bg-black text-white border-black'
                              : 'border-black/25 bg-white text-black hover:border-black'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  {detailProduct.stockTotal <= 0 ? (
                    <div className="w-full h-12 bg-neutral-200 text-neutral-600 text-[13px] font-bold uppercase tracking-[0.06em] flex items-center justify-center">
                      AKTUELL AUSVERKAUFT
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={fastCheckoutLoading}
                        onClick={() => {
                          const payload = buildProductPayload(detailProduct);
                          setDetailProduct(null);
                          if (onDirectFastCheckout) {
                            onDirectFastCheckout(payload);
                          } else {
                            onAddToCart(payload, true);
                          }
                        }}
                        className="flex-1 h-12 bg-black text-white text-[13.5px] font-bold uppercase tracking-[0.06em] hover:bg-neutral-800 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>⚡ SOFORT KAUFEN — {detailProduct.priceEur},00 €</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleBuyProduct(detailProduct, true);
                          setDetailProduct(null);
                        }}
                        className="h-12 px-4 border-2 border-black bg-white text-black text-[13px] font-bold uppercase tracking-[0.05em] hover:bg-black hover:text-white flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>WARENKORB</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <MassCheckerModal
        open={Boolean(massCheckerProduct)}
        productName={massCheckerProduct?.name}
        colorName={massCheckerProduct ? getActiveColor(massCheckerProduct).name : ''}
        onClose={() => setMassCheckerProduct(null)}
        onApplyResult={handleApplyMassChecker}
      />
    </section>
  );
};
