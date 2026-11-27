import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  createTransparentCutout,
  KHABIBI_COLORS,
  KhabibiColorVariant,
} from '../data/jackets';

interface HeroTryOnProps {
  selectedColorId: string;
  cartCount: number;
  onSelectColor: (colorId: string, source?: 'hero' | 'gallery' | 'autoplay') => void;
  onOpenCart: () => void;
  onScrollToConfigurator: () => void;
  onScrollToCollection: () => void;
}

const COVER_TABLE: [number, number][] = [
  [0, 0],
  [0.031, 0.006],
  [0.134, 0.012],
  [0.206, 0.023],
  [0.278, 0.047],
  [0.34, 0.07],
  [0.412, 0.105],
  [0.485, 0.158],
  [0.546, 0.246],
  [0.583, 0.55],
  [0.62, 0.825],
  [0.69, 0.9],
  [0.79, 0.94],
  [0.85, 0.956],
  [0.93, 0.975],
  [1, 1],
];

function sampleCover(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  for (let i = 0; i < COVER_TABLE.length - 1; i++) {
    const [t0, c0] = COVER_TABLE[i];
    const [t1, c1] = COVER_TABLE[i + 1];
    if (clamped >= t0 && clamped <= t1) {
      const k = (clamped - t0) / (t1 - t0 || 1);
      const smooth = 3 * k * k - 2 * k * k * k;
      return c0 + (c1 - c0) * smooth;
    }
  }
  return 1;
}

function easeOutQuad(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return 1 - (1 - c) * (1 - c);
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
  const lastInteractionRef = useRef<number>(0);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const wheelAccRef = useRef<number>(0);
  const wheelDirRef = useRef<number>(0);
  const wheelTimerRef = useRef<number | null>(null);
  const lastWheelStepRef = useRef<number>(0);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Build crisp transparent cutouts for all 5 Model Khabibi front packshots
  useEffect(() => {
    let alive = true;
    Promise.all(
      variants.map(async (v) => {
        const url = await createTransparentCutout(v.frontImage);
        return [v.id, url] as const;
      })
    ).then((pairs) => {
      if (!alive) return;
      const map: Record<string, string> = {};
      for (const [id, url] of pairs) map[id] = url;
      setCutouts(map);
    });
    return () => {
      alive = false;
    };
  }, [variants]);

  // Responsive Blendy --u and --n scaling + canvas word measurements
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
    window.addEventListener('resize', measureScene);
    return () => window.removeEventListener('resize', measureScene);
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
    const t = window.setTimeout(() => syncUnderline(activeIdx), 120);
    return () => window.clearTimeout(t);
  }, [activeIdx, isMobile, navUnitPx, syncUnderline]);

  // Opening sequence (Section 8)
  useEffect(() => {
    if (prefersReducedMotion) {
      setRevealed(true);
      return;
    }

    let cancelled = false;
    const startOpening = () => {
      if (cancelled) return;
      const frameW = 1440 * (window.innerWidth <= 820 || window.innerHeight > window.innerWidth
        ? Math.min(window.innerWidth / 640, (window.innerHeight - 200) / 620)
        : Math.min(window.innerWidth / 1440, window.innerHeight / 900));

      const layers = layerRefs.current[0];
      const ease = 'cubic-bezier(0.22, 0.8, 0.3, 1)';
      if (layers) {
        const specs: Array<[HTMLDivElement | null, number]> = [
          [layers.word, 0.4],
          [layers.shadow, 0.3],
          [layers.jacket, 0.15],
          [layers.accent, 0.55],
        ];
        specs.forEach(([el, factor]) => {
          el?.animate(
            [
              { transform: `translateX(${factor * frameW}px)` },
              { transform: 'translateX(0px)' },
            ],
            { duration: 900, easing: ease, fill: 'both' }
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
      startOpening();
    }

    const failsafe = window.setTimeout(() => setRevealed(true), 2400);
    return () => {
      cancelled = true;
      window.clearTimeout(failsafe);
    };
  }, [prefersReducedMotion]);

  const goToSlide = useCallback(
    (targetIdx: number, explicitDir?: 1 | -1, source: 'hero' | 'autoplay' = 'hero') => {
      const fromIdx = activeIdxRef.current;
      if (targetIdx === fromIdx || isTransitioningRef.current) return;

      const dir: 1 | -1 = explicitDir ?? (targetIdx > fromIdx ? 1 : -1);

      if (prefersReducedMotion) {
        activeIdxRef.current = targetIdx;
        setActiveIdx(targetIdx);
        onSelectColor(variants[targetIdx].id, source);
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

      // Update active UI & tab underline immediately as wipe starts
      activeIdxRef.current = targetIdx;
      setActiveIdx(targetIdx);
      onSelectColor(variants[targetIdx].id, source);

      // Prepare B underneath A
      slideA.style.visibility = 'visible';
      slideA.style.zIndex = '2';
      slideB.style.visibility = 'visible';
      slideB.style.zIndex = '1';
      slideB.style.clipPath = 'none';

      const frameW = 1440 * unitPx;
      const factors = {
        word: 0.4,
        shadow: 0.3,
        jacket: 0.15,
        accent: 0.55,
      } as const;

      const startTime = performance.now();
      const wipeDuration = 970;

      const step = (now: number) => {
        const t = (now - startTime) / wipeDuration;
        const c = sampleCover(t);

        // Cover outgoing slide A from right-to-left (dir=+1) or left-to-right (dir=-1)
        if (dir === 1) {
          slideA.style.clipPath = `inset(0 ${c * 100}% 0 0)`;
        } else {
          slideA.style.clipPath = `inset(0 0 0 ${c * 100}%)`;
        }

        // Slide A drifts away
        const driftX = -dir * c * 0.14 * frameW;
        if (layersA.word) layersA.word.style.transform = `translateX(${driftX}px)`;
        if (layersA.shadow) layersA.shadow.style.transform = `translateX(${driftX}px)`;
        if (layersA.jacket) layersA.jacket.style.transform = `translateX(${driftX}px)`;
        if (layersA.accent) layersA.accent.style.transform = `translateX(${driftX}px)`;

        // Slide B arrives with parallax
        const k = easeOutQuad(Math.max(0, Math.min(1, (t - 0.5) / 0.42)));
        (Object.keys(factors) as Array<keyof typeof factors>).forEach((key) => {
          const el = layersB[key];
          if (el) {
            const px = dir * (1 - k) * factors[key] * frameW;
            el.style.transform = `translateX(${px}px)`;
          }
        });

        if (t < 1 || k < 1) {
          requestAnimationFrame(step);
        } else {
          // Clean reset
          slideA.style.visibility = 'hidden';
          slideA.style.zIndex = '0';
          slideA.style.clipPath = 'none';
          slideB.style.zIndex = '2';
          slideB.style.clipPath = 'none';

          [layersA, layersB].forEach((grp) => {
            if (grp.word) grp.word.style.transform = '';
            if (grp.shadow) grp.shadow.style.transform = '';
            if (grp.jacket) grp.jacket.style.transform = '';
            if (grp.accent) grp.accent.style.transform = '';
          });

          isTransitioningRef.current = false;
        }
      };

      requestAnimationFrame(step);
    },
    [onSelectColor, prefersReducedMotion, unitPx, variants]
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

  // Scroll-motion on desktop wheel inside hero: steps through the 5 colors, then releases to scroll page
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (window.innerWidth <= 820) return;
      if (window.scrollY > 12) return;

      let dy = e.deltaY;
      if (e.deltaMode === 1) dy *= 16;
      else if (e.deltaMode === 2) dy *= window.innerHeight;
      if (Math.abs(dy) < 1) return;

      const dir = dy > 0 ? 1 : -1;
      const cur = activeIdxRef.current;

      // Release scroll cleanly at the 5th color (Black -> down) or 1st color (Bleu Petrol -> up)
      if ((dir === 1 && cur === variants.length - 1) || (dir === -1 && cur === 0)) {
        return;
      }

      e.preventDefault();

      if (wheelDirRef.current !== dir) {
        wheelAccRef.current = 0;
        wheelDirRef.current = dir;
      }
      wheelAccRef.current += dy;

      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
      wheelTimerRef.current = window.setTimeout(() => {
        wheelAccRef.current = 0;
      }, 250);

      const now = performance.now();
      if (Math.abs(wheelAccRef.current) >= 50 && now - lastWheelStepRef.current >= 140) {
        wheelAccRef.current = 0;
        lastWheelStepRef.current = now;
        stepDirection(dir as 1 | -1);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      if (wheelTimerRef.current) window.clearTimeout(wheelTimerRef.current);
    };
  }, [stepDirection, variants.length]);

  // Autoplay every 2600ms (paused 6s after any user input)
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (window.scrollY > window.innerHeight * 0.45) return;
      if (Date.now() - lastInteractionRef.current < 6000) return;
      const next = mod(activeIdxRef.current + 1, variants.length);
      goToSlide(next, 1, 'autoplay');
    }, 2600);

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
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          stepDirection(dx < 0 ? 1 : -1);
        }
      }}
      onPointerCancel={() => {
        dragStartRef.current = null;
      }}
      className="relative w-full h-[100svh] min-h-[580px] overflow-hidden select-none"
      style={{ backgroundColor: variants[activeIdx].backdropHex }}
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
            }}
          >
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
                className="absolute inset-0 pointer-events-none"
              >
                <div
                  className="absolute left-1/2 -translate-x-1/2 font-masculine font-bold uppercase text-white whitespace-nowrap leading-none"
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
                className="absolute inset-0 pointer-events-none"
              >
                <div
                  className="absolute rounded-full"
                  style={{
                    left: `${(720 - 190) * unitPx}px`,
                    top: `${(734 - 16) * unitPx}px`,
                    width: `${380 * unitPx}px`,
                    height: `${32 * unitPx}px`,
                    background:
                      'radial-gradient(closest-side, rgba(20, 24, 30, 0.25), transparent)',
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
                className="absolute inset-0 pointer-events-none"
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
                    loading={idx === 0 ? 'eager' : 'lazy'}
                    fetchPriority={idx === 0 ? 'high' : 'auto'}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain drop-shadow-[0_18px_26px_rgba(20,25,35,0.18)]"
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
                className="absolute inset-0 pointer-events-none hidden md:block"
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
                  <p className="mt-0.5 text-white/85 tabular-nums">
                    -50 % · 177,00 € · Haustür-Lieferung 0 €
                  </p>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      {/* Fixed Blendy-Style Pure White UI Overlay */}
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
            className="pointer-events-auto font-brand text-white ui-text-shadow leading-none tracking-[-0.02em] whitespace-nowrap shrink-0 transition-[opacity,translate] duration-1000"
            style={{
              fontSize: isMobile ? '32px' : `${48 * navUnitPx}px`,
              opacity: revealed ? 1 : 0,
              translate: revealed ? '0 0' : '0 14px',
              transitionDelay: '250ms',
            }}
          >
            MRKSHI
          </a>

          {/* 5 Flavour/Color Tabs (Row 1 desktop, Row 2 mobile) */}
          <div
            ref={tabsWrapRef}
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2 flex items-center transition-[opacity,translate] duration-1000"
            style={{
              top: isMobile ? '50px' : '50%',
              transform: isMobile ? 'translateX(-50%)' : 'translate(-50%, -50%)',
              gap: isMobile ? '12px' : `${52 * navUnitPx}px`,
              opacity: revealed ? 1 : 0,
              translate: revealed ? '0 0' : '0 14px',
              transitionDelay: '330ms',
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
                  className="font-poppins font-semibold uppercase tracking-[0.04em] text-white ui-text-shadow whitespace-nowrap shrink-0 cursor-pointer"
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
                transform: `translateX(${underlineStyle.left}px)`,
                transition: prefersReducedMotion
                  ? 'none'
                  : 'transform 0.6s cubic-bezier(0.65, 0, 0.35, 1), width 0.6s cubic-bezier(0.65, 0, 0.35, 1)',
              }}
            />
          </div>

          {/* Right Account / Cart Links */}
          <div
            className="pointer-events-auto ml-auto flex items-center font-poppins font-medium text-white ui-text-shadow transition-[opacity,translate] duration-1000"
            style={{
              gap: isMobile ? '10px' : `${20 * navUnitPx}px`,
              fontSize: isMobile ? '14px' : `${19 * navUnitPx}px`,
              opacity: revealed ? 1 : 0,
              translate: revealed ? '0 0' : '0 14px',
              transitionDelay: '410ms',
            }}
          >
            <button
              type="button"
              onClick={onOpenCart}
              className="whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
            >
              Warenkorb ({cartCount})
            </button>
            <span className="opacity-90" aria-hidden="true">
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
          className="pointer-events-auto absolute flex items-center justify-center cursor-pointer hover:opacity-75 transition-[opacity,translate] duration-1000"
          style={{
            left: isMobile ? '8px' : `${36 * navUnitPx}px`,
            bottom: isMobile ? '12px' : `${30 * navUnitPx}px`,
            width: isMobile ? '48px' : `${52 * navUnitPx}px`,
            height: isMobile ? '48px' : `${52 * navUnitPx}px`,
            opacity: revealed ? 1 : 0,
            translate: revealed ? '0 0' : '0 14px',
            transitionDelay: '490ms',
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

        {/* Bottom Center SHOP NOW */}
        <button
          type="button"
          onClick={onScrollToConfigurator}
          className="pointer-events-auto absolute left-1/2 -translate-x-1/2 font-poppins font-semibold text-white ui-text-shadow uppercase whitespace-nowrap cursor-pointer hover:opacity-80 transition-[opacity,translate] duration-1000"
          style={{
            bottom: isMobile ? '18px' : `${34 * navUnitPx}px`,
            fontSize: isMobile ? '15px' : `${20 * navUnitPx}px`,
            letterSpacing: '0.2em',
            padding: isMobile ? '10px 14px' : `${10 * navUnitPx}px ${16 * navUnitPx}px`,
            opacity: revealed ? 1 : 0,
            translate: revealed ? '0 0' : '0 14px',
            transitionDelay: '570ms',
          }}
        >
          SHOP NOW · 177 €
        </button>

        {/* Bottom Right Next Arrow */}
        <button
          type="button"
          aria-label="Nächste Farbe"
          onClick={() => stepDirection(1)}
          className="pointer-events-auto absolute flex items-center justify-center cursor-pointer hover:opacity-75 transition-[opacity,translate] duration-1000"
          style={{
            right: isMobile ? '8px' : `${36 * navUnitPx}px`,
            bottom: isMobile ? '12px' : `${30 * navUnitPx}px`,
            width: isMobile ? '48px' : `${52 * navUnitPx}px`,
            height: isMobile ? '48px' : `${52 * navUnitPx}px`,
            opacity: revealed ? 1 : 0,
            translate: revealed ? '0 0' : '0 14px',
            transitionDelay: '650ms',
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
