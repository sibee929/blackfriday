import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTransparentCutout,
  KHABIBI_COLORS,
} from '../data/jackets';

interface HeroTryOnProps {
  selectedColorId: string;
  cartCount: number;
  onSelectColor: (colorId: string, source?: 'hero' | 'gallery' | 'autoplay') => void;
  onOpenCart: () => void;
  onScrollToConfigurator: () => void;
  onScrollToCollection: () => void;
}

/** Smooth, continuous easeInOutQuart curve (no jerky mid-transition snaps) */
function easeInOutQuart(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c < 0.5 ? 8 * c * c * c * c : 1 - Math.pow(-2 * c + 2, 4) / 2;
}

/** Silky deceleration for incoming hero layers */
function easeOutQuint(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - c, 5);
}

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

interface WordLayout {
  fontSize: number;
  letterSpacing: string;
  top: number;
}

function computeWordLayout(word: string, maxWidth: number): WordLayout {
  if (typeof document === 'undefined') {
    return { fontSize: 320, letterSpacing: '-0.02em', top: 240 };
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  let fontSize = 445;
  let letterSpacing = '0.005em';

  if (ctx) {
    ctx.font = '700 100px Oswald, Archivo, system-ui, sans-serif';
    const metrics = ctx.measureText(word.toUpperCase());
    const inkAt100 =
      (metrics.actualBoundingBoxLeft ?? 0) + (metrics.actualBoundingBoxRight ?? metrics.width);
    const widthAt445 = (inkAt100 / 100) * 445;

    if (widthAt445 > Math.min(1330, maxWidth * 0.96)) {
      letterSpacing = '-0.02em';
      const tightFactor = 0.96;
      const targetMax = Math.min(1380, maxWidth);
      fontSize = Math.min(445, Math.floor((targetMax / (inkAt100 * tightFactor)) * 100));
    }
  }

  const baseline = 403.5 + (0.698 * fontSize) / 2;
  const top = baseline - 0.85 * fontSize;
  return { fontSize, letterSpacing, top };
}

export const HeroTryOn: React.FC<HeroTryOnProps> = ({
  selectedColorId,
  cartCount,
  onSelectColor,
  onOpenCart,
  onScrollToConfigurator,
  onScrollToCollection,
}) => {
  const variants = KHABIBI_COLORS;
  const externalIdx = useMemo(() => {
    const i = variants.findIndex((v) => v.id === selectedColorId);
    return i >= 0 ? i : 0;
  }, [selectedColorId, variants]);

  const [activeIdx, setActiveIdx] = useState<number>(externalIdx);
  const [cutouts, setCutouts] = useState<Record<string, string>>({});
  const [unitPx, setUnitPx] = useState<number>(1);
  const [navUnitPx, setNavUnitPx] = useState<number>(1);
  const [frameYOffset, setFrameYOffset] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [wordLayouts, setWordLayouts] = useState<Record<string, WordLayout>>({});
  const [underlineStyle, setUnderlineStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });
  const [revealed, setRevealed] = useState<boolean>(false);

  const stageRef = useRef<HTMLElement | null>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const layerRefs = useRef<
    Record<
      number,
      {
        word: HTMLDivElement | null;
        shadow: HTMLDivElement | null;
        jacket: HTMLDivElement | null;
        accent: HTMLDivElement | null;
      }
    >
  >({});
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabsWrapRef = useRef<HTMLDivElement | null>(null);

  const activeIdxRef = useRef<number>(externalIdx);
  const isTransitioningRef = useRef<boolean>(false);
  const queuedTargetRef = useRef<{ idx: number; dir: 1 | -1; source: 'hero' | 'autoplay' } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastInteractionRef = useRef<number>(0);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Build crisp transparent cutouts progressively (active slide first, rest staggered in idle frames)
  // so the opening hero motion never stutters on the main thread.
  useEffect(() => {
    let alive = true;
    const scheduleIdle = (fn: () => void, delayMs: number) => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      };
      if (typeof w.requestIdleCallback === 'function') {
        w.requestIdleCallback(fn, { timeout: delayMs + 400 });
      } else {
        w.setTimeout(fn, delayMs);
      }
    };

    const first = variants[activeIdxRef.current] ?? variants[0];
    if (first) {
      createTransparentCutout(first.frontImage).then((url) => {
        if (!alive) return;
        setCutouts((prev) => ({ ...prev, [first.id]: url }));
      });
    }

    const others = variants.filter((v) => v.id !== first?.id);
    others.forEach((v, i) => {
      scheduleIdle(() => {
        if (!alive) return;
        createTransparentCutout(v.frontImage).then((url) => {
          if (!alive) return;
          setCutouts((prev) => ({ ...prev, [v.id]: url }));
        });
      }, 280 + i * 240);
    });

    return () => {
      alive = false;
    };
  }, [variants]);

  // Responsive --u and --n scaling + canvas word measurements
  const measureScene = useCallback(() => {
    if (typeof window === 'undefined') return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mobile = vw <= 820 || vh > vw;
    setIsMobile(mobile);

    const u = mobile
      ? Math.min(vw / 640, (vh - 200) / 620)
      : Math.min(vw / 1440, vh / 900);
    const n = mobile
      ? 1
      : Math.max(0.5, Math.min(Math.min(vw / 1440, vh / 900), 1.3));
    const fy = mobile ? 8 : 0;

    setUnitPx(u);
    setNavUnitPx(n);
    setFrameYOffset(fy);

    const visibleFrameWidth = mobile ? Math.min(1440, vw / Math.max(0.2, u)) * 0.92 : 1380;
    const nextLayouts: Record<string, WordLayout> = {};
    for (const v of variants) {
      nextLayouts[v.id] = computeWordLayout(v.word, visibleFrameWidth);
    }
    setWordLayouts(nextLayouts);
  }, [variants]);

  useEffect(() => {
    measureScene();
    if (document.fonts?.ready) {
      document.fonts.ready.then(measureScene);
    }
    let resizeRaf = 0;
    const onResize = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(measureScene);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener('resize', onResize);
    };
  }, [measureScene]);

  // Update sliding tab underline
  const syncUnderline = useCallback((idx: number) => {
    const tab = tabRefs.current[idx];
    const wrap = tabsWrapRef.current;
    if (!tab || !wrap) return;
    setUnderlineStyle({
      left: tab.offsetLeft,
      width: tab.offsetWidth,
    });
  }, []);

  useEffect(() => {
    syncUnderline(activeIdx);
    const t = window.setTimeout(() => syncUnderline(activeIdx), 100);
    return () => window.clearTimeout(t);
  }, [activeIdx, isMobile, navUnitPx, syncUnderline]);

  // Clean GPU-accelerated opening entrance
  useEffect(() => {
    if (prefersReducedMotion) {
      setRevealed(true);
      return;
    }

    let cancelled = false;
    const startOpening = () => {
      if (cancelled) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const frameW =
        1440 *
        (vw <= 820 || vh > vw
          ? Math.min(vw / 640, (vh - 200) / 620)
          : Math.min(vw / 1440, vh / 900));

      const layers = layerRefs.current[activeIdxRef.current];
      const ease = 'cubic-bezier(0.16, 1, 0.3, 1)';
      if (layers) {
        const specs: Array<[HTMLDivElement | null, number, number]> = [
          [layers.word, 0.18, 0.98],
          [layers.shadow, 0.12, 0.94],
          [layers.jacket, 0.08, 0.96],
          [layers.accent, 0.22, 1],
        ];
        specs.forEach(([el, factor, startScale]) => {
          el?.animate(
            [
              {
                opacity: 0,
                transform: `translate3d(${factor * frameW}px, 0, 0) scale(${startScale})`,
              },
              {
                opacity: 1,
                transform: 'translate3d(0px, 0, 0) scale(1)',
              },
            ],
            { duration: 780, easing: ease, fill: 'both' }
          );
        });
      }
      setRevealed(true);
    };

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        requestAnimationFrame(startOpening);
      });
    } else {
      requestAnimationFrame(startOpening);
    }

    const failsafe = window.setTimeout(() => setRevealed(true), 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
    };
  }, [prefersReducedMotion]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  const goToSlide = useCallback(
    (targetIdx: number, explicitDir?: 1 | -1, source: 'hero' | 'autoplay' = 'hero') => {
      const fromIdx = activeIdxRef.current;
      if (targetIdx === fromIdx) return;

      const dir: 1 | -1 = explicitDir ?? (targetIdx > fromIdx ? 1 : -1);

      if (isTransitioningRef.current) {
        // Queue the latest user selection so rapid clicks feel responsive
        if (source === 'hero') {
          queuedTargetRef.current = { idx: targetIdx, dir, source };
        }
        return;
      }

      if (prefersReducedMotion) {
        activeIdxRef.current = targetIdx;
        setActiveIdx(targetIdx);
        startTransition(() => onSelectColor(variants[targetIdx].id, source));
        return;
      }

      isTransitioningRef.current = true;
      const slideA = slideRefs.current[fromIdx];
      const slideB = slideRefs.current[targetIdx];
      const layersA = layerRefs.current[fromIdx];
      const layersB = layerRefs.current[targetIdx];

      if (!slideA || !slideB || !layersA || !layersB) {
        activeIdxRef.current = targetIdx;
        setActiveIdx(targetIdx);
        isTransitioningRef.current = false;
        return;
      }

      // Sync tab underline immediately; defer heavy parent re-render to avoid frame drop on frame 1
      activeIdxRef.current = targetIdx;
      syncUnderline(targetIdx);

      // Prepare B smoothly underneath A
      slideA.style.visibility = 'visible';
      slideA.style.zIndex = '2';
      slideA.style.willChange = 'clip-path';
      slideB.style.visibility = 'visible';
      slideB.style.zIndex = '1';
      slideB.style.clipPath = 'none';

      const frameW = 1440 * unitPx;
      const factors = {
        word: 0.24,
        shadow: 0.16,
        jacket: 0.1,
        accent: 0.3,
      } as const;

      const startTime = performance.now();
      const wipeDuration = 680;

      const step = (now: number) => {
        const rawT = Math.min(1, (now - startTime) / wipeDuration);
        const c = easeInOutQuart(rawT);

        // Smooth edge-to-edge panel wipe
        const insetPct = (c * 100).toFixed(3);
        if (dir === 1) {
          slideA.style.clipPath = `inset(0 ${insetPct}% 0 0)`;
        } else {
          slideA.style.clipPath = `inset(0 0 0 ${insetPct}%)`;
        }

        // Outgoing slide A drifts softly with subtle depth scale
        const driftX = (-dir * c * 0.1 * frameW).toFixed(2);
        const outScale = (1 - c * 0.025).toFixed(4);
        if (layersA.word) layersA.word.style.transform = `translate3d(${driftX}px, 0, 0)`;
        if (layersA.shadow) layersA.shadow.style.transform = `translate3d(${driftX}px, 0, 0)`;
        if (layersA.jacket) {
          layersA.jacket.style.transform = `translate3d(${driftX}px, 0, 0) scale(${outScale})`;
        }
        if (layersA.accent) layersA.accent.style.transform = `translate3d(${driftX}px, 0, 0)`;

        // Incoming slide B glides in with silky parallax & subtle settle
        const k = easeOutQuint(Math.max(0, Math.min(1, (rawT - 0.16) / 0.84)));
        const inScale = (0.97 + k * 0.03).toFixed(4);
        (Object.keys(factors) as Array<keyof typeof factors>).forEach((key) => {
          const el = layersB[key];
          if (el) {
            const px = (dir * (1 - k) * factors[key] * frameW).toFixed(2);
            el.style.transform =
              key === 'jacket'
                ? `translate3d(${px}px, 0, 0) scale(${inScale})`
                : `translate3d(${px}px, 0, 0)`;
          }
        });

        if (rawT < 1) {
          rafIdRef.current = requestAnimationFrame(step);
        } else {
          rafIdRef.current = null;
          // Clean GPU reset
          slideA.style.visibility = 'hidden';
          slideA.style.zIndex = '0';
          slideA.style.clipPath = 'none';
          slideA.style.willChange = 'auto';
          slideB.style.zIndex = '2';
          slideB.style.clipPath = 'none';

          [layersA, layersB].forEach((grp) => {
            if (grp.word) grp.word.style.transform = '';
            if (grp.shadow) grp.shadow.style.transform = '';
            if (grp.jacket) grp.jacket.style.transform = '';
            if (grp.accent) grp.accent.style.transform = '';
          });

          isTransitioningRef.current = false;

          // Commit React state after the 60/120fps transition finishes so zero frames drop
          startTransition(() => {
            setActiveIdx(targetIdx);
            onSelectColor(variants[targetIdx].id, source);
          });

          // Flush queued click if user clicked another color mid-transition
          const queued = queuedTargetRef.current;
          queuedTargetRef.current = null;
          if (queued && queued.idx !== activeIdxRef.current) {
            requestAnimationFrame(() => goToSlide(queued.idx, queued.dir, queued.source));
          }
        }
      };

      rafIdRef.current = requestAnimationFrame(step);
    },
    [onSelectColor, prefersReducedMotion, syncUnderline, unitPx, variants]
  );

  // Sync if user selects color in configurator below
  useEffect(() => {
    if (externalIdx !== activeIdxRef.current && !isTransitioningRef.current) {
      activeIdxRef.current = externalIdx;
      setActiveIdx(externalIdx);
    }
  }, [externalIdx]);

  const stepDirection = useCallback(
    (dir: 1 | -1) => {
      lastInteractionRef.current = Date.now();
      const next = mod(activeIdxRef.current + dir, variants.length);
      goToSlide(next, dir, 'hero');
    },
    [goToSlide, variants.length]
  );

  // Smooth Autoplay every 3400ms (paused 7s after any user input or when scrolled down)
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (window.scrollY > window.innerHeight * 0.45) return;
      if (Date.now() - lastInteractionRef.current < 7000) return;
      const next = mod(activeIdxRef.current + 1, variants.length);
      goToSlide(next, 1, 'autoplay');
    }, 3400);

    return () => window.clearInterval(timer);
  }, [goToSlide, variants.length]);

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepDirection(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepDirection(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stepDirection]);

  return (
    <section
      ref={stageRef}
      aria-label="Model Khabibi — Farbauswahl Slider"
      onPointerDown={(e) => {
        dragStartRef.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const start = dragStartRef.current;
        dragStartRef.current = null;
        if (!start) return;
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          stepDirection(dx < 0 ? 1 : -1);
        }
      }}
      onPointerCancel={() => {
        dragStartRef.current = null;
      }}
      className="relative w-full h-[100svh] min-h-[580px] overflow-hidden select-none"
      style={{
        backgroundColor: variants[activeIdx].backdropHex,
        transition: 'background-color 0.5s ease',
      }}
    >
      {/* 5 Stacked Full-Viewport Color-Flood Slides */}
      {variants.map((variant, idx) => {
        const isActive = idx === activeIdx;
        const wl = wordLayouts[variant.id] ?? { fontSize: 340, letterSpacing: '-0.02em', top: 220 };
        const imgSrc = cutouts[variant.id] ?? variant.frontImage;
        const hasTransparentCutout = Boolean(cutouts[variant.id]);

        return (
          <article
            key={variant.id}
            ref={(el) => {
              slideRefs.current[idx] = el;
            }}
            className="absolute inset-0 overflow-hidden"
            style={{
              backgroundColor: variant.backdropHex,
              zIndex: isActive ? 2 : 0,
              visibility: isActive ? 'visible' : 'hidden',
              contain: 'layout style paint',
            }}
          >
            {/* Subtle radial studio spotlight for depth */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.16) 0%, rgba(0,0,0,0.08) 72%, rgba(0,0,0,0.22) 100%)',
              }}
            />

            {/* 1440 x 900 Centered Design Frame */}
            <div
              className="absolute"
              style={{
                width: `${1440 * unitPx}px`,
                height: `${900 * unitPx}px`,
                left: `calc(50% - ${720 * unitPx}px)`,
                top: `calc(50% - ${450 * unitPx}px + ${frameYOffset}px)`,
              }}
            >
              {/* Layer 1: Giant White Colour Word behind Jacket */}
              <div
                ref={(el) => {
                  if (!layerRefs.current[idx]) {
                    layerRefs.current[idx] = { word: null, shadow: null, jacket: null, accent: null };
                  }
                  layerRefs.current[idx].word = el;
                }}
                className="absolute inset-0 pointer-events-none will-change-transform"
              >
                <div
                  className="absolute left-1/2 -translate-x-1/2 font-masculine font-bold uppercase text-white/95 whitespace-nowrap leading-none"
                  style={{
                    top: `${wl.top * unitPx}px`,
                    fontSize: `${wl.fontSize * unitPx}px`,
                    letterSpacing: wl.letterSpacing,
                  }}
                >
                  {variant.word}
                </div>
              </div>

              {/* Layer 2: Soft Studio Floor Shadow */}
              <div
                ref={(el) => {
                  if (!layerRefs.current[idx]) {
                    layerRefs.current[idx] = { word: null, shadow: null, jacket: null, accent: null };
                  }
                  layerRefs.current[idx].shadow = el;
                }}
                className="absolute inset-0 pointer-events-none will-change-transform"
              >
                <div
                  className="absolute rounded-full"
                  style={{
                    left: `${(720 - 190) * unitPx}px`,
                    top: `${(734 - 16) * unitPx}px`,
                    width: `${380 * unitPx}px`,
                    height: `${32 * unitPx}px`,
                    background:
                      'radial-gradient(closest-side, rgba(16, 20, 26, 0.28), transparent)',
                    filter: `blur(${4 * unitPx}px)`,
                  }}
                />
              </div>

              {/* Layer 3: Centered Khabibi Front Packshot */}
              <div
                ref={(el) => {
                  if (!layerRefs.current[idx]) {
                    layerRefs.current[idx] = { word: null, shadow: null, jacket: null, accent: null };
                  }
                  layerRefs.current[idx].jacket = el;
                }}
                className="absolute inset-0 pointer-events-none will-change-transform"
              >
                <div
                  className={`absolute ${hasTransparentCutout ? '' : 'mix-blend-multiply'}`}
                  style={{
                    left: `${455 * unitPx}px`,
                    top: `${142 * unitPx}px`,
                    width: `${530 * unitPx}px`,
                    height: `${610 * unitPx}px`,
                  }}
                >
                  <img
                    src={imgSrc}
                    alt={`MRKSHI Model Khabibi in ${variant.name}`}
                    loading="eager"
                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain drop-shadow-[0_18px_28px_rgba(15,20,30,0.22)]"
                  />
                </div>
              </div>

              {/* Layer 4: Minimal Floating Price / Material Spec */}
              <div
                ref={(el) => {
                  if (!layerRefs.current[idx]) {
                    layerRefs.current[idx] = { word: null, shadow: null, jacket: null, accent: null };
                  }
                  layerRefs.current[idx].accent = el;
                }}
                className="absolute inset-0 pointer-events-none hidden md:block will-change-transform"
              >
                <div
                  className="absolute text-white/95 ui-text-shadow font-poppins text-right"
                  style={{
                    right: `${72 * unitPx}px`,
                    bottom: `${96 * unitPx}px`,
                    fontSize: `${15 * unitPx}px`,
                    letterSpacing: '0.12em',
                  }}
                >
                  <p className="uppercase font-semibold">Model Khabibi · 100 % Naturleder</p>
                  <p className="mt-0.5 text-white/90 tabular-nums">
                    -50 % · 177,00 € · Haustür-Lieferung 0 €
                  </p>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {/* Fixed Pure White UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none text-white">
        {/* Header Row */}
        <header
          className="absolute flex items-center"
          style={{
            left: isMobile ? '20px' : `${50 * navUnitPx}px`,
            right: isMobile ? '20px' : `${50 * navUnitPx}px`,
            top: isMobile ? '16px' : `${26 * navUnitPx}px`,
            height: isMobile ? '40px' : `${50 * navUnitPx}px`,
          }}
        >
          {/* Brand Logo */}
          <a
            href="#"
            className="pointer-events-auto font-brand text-white ui-text-shadow leading-none tracking-[-0.02em] whitespace-nowrap shrink-0 transition-[opacity,transform] duration-700 ease-out"
            style={{
              fontSize: isMobile ? '32px' : `${48 * navUnitPx}px`,
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,12px,0)',
              transitionDelay: '120ms',
            }}
          >
            MRKSHI
          </a>

          {/* 5 Flavour/Color Tabs */}
          <div
            ref={tabsWrapRef}
            className="pointer-events-auto absolute left-1/2 flex items-center transition-opacity duration-700 ease-out"
            style={{
              top: isMobile ? '50px' : '50%',
              transform: isMobile ? 'translateX(-50%)' : 'translate(-50%, -50%)',
              gap: isMobile ? '12px' : `${48 * navUnitPx}px`,
              opacity: revealed ? 1 : 0,
              transitionDelay: '180ms',
            }}
          >
            {variants.map((v, idx) => {
              const isCurrent = idx === activeIdx;
              return (
                <button
                  key={v.id}
                  ref={(el) => {
                    tabRefs.current[idx] = el;
                  }}
                  type="button"
                  aria-current={isCurrent ? 'true' : undefined}
                  onClick={() => {
                    lastInteractionRef.current = Date.now();
                    goToSlide(idx, idx > activeIdxRef.current ? 1 : -1, 'hero');
                  }}
                  className={`font-poppins font-semibold uppercase tracking-[0.04em] text-white ui-text-shadow whitespace-nowrap shrink-0 cursor-pointer transition-opacity duration-200 ${
                    isCurrent ? 'opacity-100' : 'opacity-80 hover:opacity-100'
                  }`}
                  style={{
                    fontSize: isMobile ? '12px' : `${18 * navUnitPx}px`,
                    padding: isMobile ? '5px 0' : `${6 * navUnitPx}px 0`,
                  }}
                >
                  {v.name}
                </button>
              );
            })}

            {/* Sliding 2px White Underline */}
            <div
              aria-hidden="true"
              className="absolute h-[2px] bg-white rounded-[2px] pointer-events-none"
              style={{
                bottom: isMobile ? '0px' : `-${2 * navUnitPx}px`,
                width: `${underlineStyle.width}px`,
                transform: `translate3d(${underlineStyle.left}px, 0, 0)`,
                transition: prefersReducedMotion
                  ? 'none'
                  : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), width 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            />
          </div>

          {/* Right Cart & Models Links */}
          <div
            className="pointer-events-auto ml-auto flex items-center font-poppins font-medium text-white ui-text-shadow transition-[opacity,transform] duration-700 ease-out"
            style={{
              gap: isMobile ? '10px' : `${20 * navUnitPx}px`,
              fontSize: isMobile ? '14px' : `${19 * navUnitPx}px`,
              opacity: revealed ? 1 : 0,
              transform: revealed ? 'translate3d(0,0,0)' : 'translate3d(0,12px,0)',
              transitionDelay: '220ms',
            }}
          >
            <button
              type="button"
              onClick={onOpenCart}
              className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
            >
              Warenkorb ({cartCount})
            </button>
            <span className="opacity-85" aria-hidden="true">
              |
            </span>
            <button
              type="button"
              onClick={onScrollToCollection}
              className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity font-semibold uppercase tracking-[0.04em]"
            >
              9 Modelle
            </button>
          </div>
        </header>

        {/* Bottom Left Previous Arrow */}
        <button
          type="button"
          aria-label="Vorherige Farbe"
          onClick={() => stepDirection(-1)}
          className="pointer-events-auto absolute flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-[opacity,transform] duration-300"
          style={{
            left: isMobile ? '10px' : `${36 * navUnitPx}px`,
            bottom: isMobile ? '14px' : `${30 * navUnitPx}px`,
            width: isMobile ? '48px' : `${52 * navUnitPx}px`,
            height: isMobile ? '48px' : `${52 * navUnitPx}px`,
            opacity: revealed ? 1 : 0,
          }}
        >
          <svg
            viewBox="0 0 28 28"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: isMobile ? '24px' : `${28 * navUnitPx}px`,
              height: isMobile ? '24px' : `${28 * navUnitPx}px`,
            }}
          >
            <path d="M24 14H4 M12 6l-8 8 8 8" />
          </svg>
        </button>

        {/* Bottom Center CTA + Color Dots */}
        <div
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2.5 transition-opacity duration-700"
          style={{
            bottom: isMobile ? '14px' : `${26 * navUnitPx}px`,
            opacity: revealed ? 1 : 0,
            transitionDelay: '260ms',
          }}
        >
          <button
            type="button"
            onClick={onScrollToConfigurator}
            className="font-poppins font-bold text-white uppercase whitespace-nowrap cursor-pointer px-6 py-2.5 rounded-full bg-black/30 hover:bg-black/55 backdrop-blur-sm border border-white/40 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
            style={{
              fontSize: isMobile ? '13px' : `${16 * navUnitPx}px`,
              letterSpacing: '0.18em',
            }}
          >
            SHOP NOW · 177 €
          </button>

          <div className="flex items-center gap-2">
            {variants.map((v, idx) => (
              <button
                key={v.id}
                type="button"
                aria-label={`Farbe ${v.name}`}
                onClick={() => {
                  lastInteractionRef.current = Date.now();
                  goToSlide(idx, idx > activeIdxRef.current ? 1 : -1, 'hero');
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer border border-white/70 ${
                  idx === activeIdx ? 'w-7 bg-white' : 'w-2 bg-white/45 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Bottom Right Next Arrow */}
        <button
          type="button"
          aria-label="Nächste Farbe"
          onClick={() => stepDirection(1)}
          className="pointer-events-auto absolute flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-[opacity,transform] duration-300"
          style={{
            right: isMobile ? '10px' : `${36 * navUnitPx}px`,
            bottom: isMobile ? '14px' : `${30 * navUnitPx}px`,
            width: isMobile ? '48px' : `${52 * navUnitPx}px`,
            height: isMobile ? '48px' : `${52 * navUnitPx}px`,
            opacity: revealed ? 1 : 0,
          }}
        >
          <svg
            viewBox="0 0 28 28"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              width: isMobile ? '24px' : `${28 * navUnitPx}px`,
              height: isMobile ? '24px' : `${28 * navUnitPx}px`,
            }}
          >
            <path d="M4 14h20 M16 6l8 8-8 8" />
          </svg>
        </button>
      </div>
    </section>
  );
};
