import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, CheckCircle2, Crown, Gift, Sparkles, X, ZoomIn } from 'lucide-react';

interface NewsletterAndVipSectionProps {
  activeVoucherCode: string;
  onActivateVoucher: (code: string) => void;
  onOpenPrivacy: () => void;
}

const RARE_LEATHER_OPTIONS = [
  'Kroko Vintage Tabac',
  'Reptile Blue Patrol',
  'Elephant Grey Silver',
  'Python Rouge Bordeaux',
  'Alligator Signature / Dark Kaki',
  'Croco Black Shiny',
  'Safari Legacy & Stone Evolution',
  'Moon Shadow & Royal Bordeaux',
  'Leder-Weekender & Taschen-Unikate',
  'Seltene Nappa-Farben (Majorelle / Hermès)',
];

const SWATCH_BOARDS = [
  {
    id: 'board-mrkshi',
    image: '/assets/atelier/raritaeten-mrkshi-kroko-python.webp',
    tag: 'RARITÄTEN-TAFEL I · 2 CM MAKRO-STRUKTUR',
    title: 'MRKSHI Ultra Luxus Premium Leder (A–F)',
    subtitle:
      'A: Kroko Vintage Tabac · B: Reptile Blue Patrol · C: Elephant Grey Silver · D: Python Rouge Bordeaux · E: Alligator Dark Kaki · F: Croco Black Shiny',
  },
  {
    id: 'board-editions',
    image: '/assets/atelier/raritaeten-alligator-safari.webp',
    tag: 'RARITÄTEN-TAFEL II · ÉDITIONS EXCLUSIVES',
    title: 'Exklusive Präge- & Patina-Häute (A–G)',
    subtitle:
      'A: Alligator Signature · B: Safari Legacy · C: Stone Evolution · D: Moon Shadow · E: Royal Bordeaux · F: Noir Néréide · G: Vintage Heritage',
  },
];

export const NewsletterAndVipSection: React.FC<NewsletterAndVipSectionProps> = ({
  activeVoucherCode,
  onActivateVoucher,
  onOpenPrivacy,
}) => {
  const [email, setEmail] = useState<string>('');
  const [selectedLeathers, setSelectedLeathers] = useState<string[]>([
    'Kroko Vintage Tabac',
    'Reptile Blue Patrol',
  ]);
  const [consent, setConsent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<{
    src: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [successVoucher, setSuccessVoucher] = useState<string | null>(
    activeVoucherCode === 'TREUE10' ? 'TREUE10' : null
  );

  const toggleLeatherOption = (label: string) => {
    setSelectedLeathers((prev) => {
      if (prev.includes(label)) {
        return prev.length > 1 ? prev.filter((x) => x !== label) : prev;
      }
      return [...prev, label];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const resp = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          preferredColor: selectedLeathers.join(' · '),
          consentAccepted: consent,
        }),
      });
      const data = (await resp.json()) as {
        voucherCode?: string;
        error?: string;
      };
      if (!resp.ok || !data.voucherCode) {
        setErrorMsg(data.error ?? 'Anmeldung fehlgeschlagen.');
        return;
      }
      setSuccessVoucher(data.voucherCode);
      onActivateVoucher(data.voucherCode);
      setEmail('');
    } catch {
      setErrorMsg('Verbindungsfehler — bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      id="newsletter"
      className="py-14 md:py-22 px-4 sm:px-6 md:px-10 bg-[#0D0C0B] text-white border-t-2 border-black"
    >
      <div className="max-w-[1220px] mx-auto space-y-12">
        {/* 1. START WITH LUXURY: Grand Moroccan Atelier & Full-Hide Showcase */}
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#D6B370] flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#D6B370]" />
                <span>MRKSHI HAUTE MAROQUINERIE · CASABLANCA & MARRAKESCH</span>
              </p>
              <h2 className="mt-2 font-masculine text-[30px] sm:text-[38px] md:text-[44px] font-bold leading-[1.02] text-white">
                ULTRA LUXUS ATELIER — SELTENE LEDERHÄUTE, MUSTER & UNIKATE.
              </h2>
            </div>
            <p className="max-w-md text-[13.5px] font-medium leading-[1.6] text-white/75">
              Neben unserer 177-€-Kollektion fertigen unsere Meister-Sattler in Marokko streng
              limitierte Einzelstücke, Weekender-Taschen und Sonderjacken aus charakterstarken
              Präge- und Vintage-Häuten.
            </p>
          </div>

          {/* 2 Luxury Hero Visuals + Badboy Couleurs Rares */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <button
              type="button"
              onClick={() =>
                setZoomedImage({
                  src: '/assets/atelier/luxus-atelier-panorama.webp',
                  title: 'MRKSHI Atelier — Vollhäute, Reisetaschen & Maßwerkzeuge',
                  subtitle:
                    'Handverlesene Nappa-, Wild- und Prägeleder-Chargen direkt auf dem Zuschneidetisch in Marokko.',
                })
              }
              className="lg:col-span-8 group relative overflow-hidden border border-[#D6B370]/40 bg-black text-left cursor-pointer"
            >
              <div className="aspect-[16/9] w-full overflow-hidden">
                <img
                  src="/assets/atelier/luxus-atelier-panorama.webp"
                  alt="MRKSHI Ultra Luxus Lederatelier Marokko"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
              </div>
              <div className="p-4 bg-gradient-to-t from-black via-black/90 to-black/60 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10.5px] font-bold tracking-[0.16em] uppercase text-[#D6B370]">
                    ATELIER-EINBLICK · HANDWERK & VOLLHÄUTE
                  </span>
                  <p className="text-[15px] font-bold text-white mt-0.5">
                    Vom schweren Kroko-Relief über Rind-Weekender bis zu butterweichem Nappa
                  </p>
                </div>
                <ZoomIn className="w-5 h-5 text-[#D6B370] shrink-0" />
              </div>
            </button>

            <div className="lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-4">
              <button
                type="button"
                onClick={() =>
                  setZoomedImage({
                    src: '/assets/atelier/luxus-riad-kollektion.webp',
                    title: 'MRKSHI Riad-Selektion — Vollrind & Patina-Häute',
                    subtitle:
                      'Natürliche Narbung in Tiefschwarz, Cognac-Tabac, Royal Bordeaux und Dunkel-Oliv.',
                  })
                }
                className="group relative overflow-hidden border border-[#D6B370]/40 bg-black text-left cursor-pointer"
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src="/assets/atelier/luxus-riad-kollektion.webp"
                    alt="MRKSHI Riad Lederjacken Auswahl"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-500"
                  />
                </div>
                <div className="px-3.5 py-2.5 bg-black flex items-center justify-between">
                  <span className="text-[11.5px] font-bold text-white">
                    Riad-Selektion · Schwere Naturhäute
                  </span>
                  <ZoomIn className="w-4 h-4 text-[#D6B370] shrink-0" />
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setZoomedImage({
                    src: '/assets/atelier/badboy-couleurs-rares.webp',
                    title: 'Badboy Morocco — Des Couleurs Rares',
                    subtitle:
                      'Seltene marokkanische Signatur-Färbungen: Mint, Hermès-Orange, Majorelle-Blau, Tabac & Safran.',
                  })
                }
                className="group relative overflow-hidden border border-[#D6B370]/40 bg-black text-left cursor-pointer"
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <img
                    src="/assets/atelier/badboy-couleurs-rares.webp"
                    alt="MRKSHI Badboy Seltene Farben Marokko"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                  />
                </div>
                <div className="px-3.5 py-2.5 bg-black flex items-center justify-between">
                  <span className="text-[11.5px] font-bold text-white">
                    Signature Marocaine · Seltene Färbungen
                  </span>
                  <ZoomIn className="w-4 h-4 text-[#D6B370] shrink-0" />
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 2. RARITÄTEN & STARKE LEDERTYPEN MUSTER-TAFELN (63 & 44 Swatch Boards) */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-[#D6B370]">
                FÜR KENNER STARKER LEDERTYPEN · KLICKEN ZUM MAKRO-ZOOM (2 CM)
              </p>
              <h3 className="mt-1 font-masculine text-[24px] sm:text-[30px] font-bold text-white">
                UNSERE EXKLUSIVEN LEDER-RARITÄTEN & MUSTER-ARCHIV
              </h3>
            </div>
            <span className="text-[12px] font-semibold text-white/70">
              Streng limitierte Kleinserien — Vorab-Zugang nur per E-Mail-Liste
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {SWATCH_BOARDS.map((board) => (
              <button
                key={board.id}
                type="button"
                onClick={() =>
                  setZoomedImage({
                    src: board.image,
                    title: board.title,
                    subtitle: board.subtitle,
                  })
                }
                className="group border border-[#D6B370]/45 hover:border-[#D6B370] bg-[#151311] text-left transition-colors overflow-hidden flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[16/12] w-full bg-black overflow-hidden">
                  <img
                    src={board.image}
                    alt={board.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  <span className="absolute left-3 top-3 px-2.5 py-1 bg-black/90 border border-[#D6B370]/50 text-[#D6B370] text-[10px] font-bold uppercase tracking-[0.1em]">
                    {board.tag}
                  </span>
                  <span className="absolute right-3 bottom-3 px-2.5 py-1 bg-[#D6B370] text-black text-[11px] font-bold uppercase inline-flex items-center gap-1">
                    <ZoomIn className="w-3.5 h-3.5" />
                    <span>Makro ansehen</span>
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  <h4 className="font-masculine text-[19px] font-bold text-white">{board.title}</h4>
                  <p className="text-[12.5px] leading-[1.55] text-white/75">{board.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 3. VIP RARITÄTEN & NEUHEITEN-NEWSLETTER SIGNUP */}
        <div className="border-2 border-[#D6B370] bg-white text-black p-6 sm:p-8 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-3">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-black/70 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span>VIP LEDER-INSIDER · NEUE EINZELTEILE & MUSTER</span>
            </p>
            <h3 className="font-masculine text-[28px] sm:text-[34px] font-bold leading-[1.04] text-black">
              SUCHST DU BESONDERE LEDER-MUSTER? WIR POSTEN JEDES NEUE TEIL ZUERST PER MAIL.
            </h3>
            <p className="text-[14px] font-medium leading-[1.6] text-black/80">
              Sobald im Atelier neue Häute eintreffen (Kroko-Prägung, Python-Finish, Elephant-Grain,
              schwere Vintage-Lederjacken oder handgenähte Leder-Reisetaschen), schicken wir Fotos &
              Einzelstück-Zugriff zuerst an unseren Insider-Verteiler — inklusive{' '}
              <strong>10,00 € Sofort-Gutschein (TREUE10)</strong> für deine Bestellung heute.
            </p>

            <div className="flex flex-wrap gap-2 pt-1 text-[11.5px] font-bold uppercase tracking-[0.06em]">
              <span className="px-2.5 py-1 bg-black text-white">
                ✓ SOFORT-CODE: TREUE10 (-10,00 €)
              </span>
              <span className="px-2.5 py-1 border border-black text-black">
                ✓ VORAB-ZUGANG ZU LEDER-RARITÄTEN
              </span>
            </div>
          </div>

          <div className="lg:col-span-7">
            {successVoucher ? (
              <div className="p-6 border-2 border-black bg-black text-white space-y-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-[#D6B370] shrink-0" />
                  <span className="font-masculine text-[22px] font-bold">
                    DU BIST AUF DER RARITÄTEN-LISTE · CODE: {successVoucher}
                  </span>
                </div>
                <p className="text-[13.5px] text-white/85 leading-[1.55]">
                  Deine gewünschten Ledertypen wurden im Atelier hinterlegt — sobald neue Einzelteile
                  und Sonderhäute fertig sind, erhältst du sie als Erster per E-Mail. Dein 10,00 €
                  Gutschein ist ab sofort im Warenkorb aktiv.
                </p>
                <button
                  type="button"
                  onClick={() => onActivateVoucher(successVoucher)}
                  className="inline-flex items-center gap-2 h-10 px-4 bg-[#D6B370] text-black text-[12.5px] font-bold uppercase tracking-[0.06em] hover:brightness-95 cursor-pointer"
                >
                  <Gift className="w-4 h-4" />
                  <span>10 € Code im Warenkorb nutzen</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <span className="block text-[11.5px] font-bold uppercase tracking-[0.08em] text-black mb-2">
                    WELCHE STARKEN LEDERTYPEN & RARITÄTEN INTERESSIEREN DICH? (MEHRFACHAUSWAHL)
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {RARE_LEATHER_OPTIONS.map((item) => {
                      const active = selectedLeathers.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleLeatherOption(item)}
                          className={`h-8 px-2.5 text-[11.5px] font-bold border transition-colors cursor-pointer ${
                            active
                              ? 'bg-black text-white border-black'
                              : 'bg-white text-black border-black/25 hover:border-black'
                          }`}
                        >
                          {active ? `✓ ${item}` : item}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    required
                    placeholder="deine@email-adresse.de"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 h-12 px-3.5 border-2 border-black bg-white text-[14px] font-medium text-black placeholder:text-black/45"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-12 px-5 bg-black text-white text-[13px] font-bold uppercase tracking-[0.06em] hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                  >
                    <span>
                      {loading ? 'Wird eingetragen…' : 'Für Raritäten eintragen + 10 € Code'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <label className="flex items-start gap-2.5 text-[12px] font-medium text-black/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-black shrink-0"
                  />
                  <span>
                    Ja, sendet mir neue MRKSHI Leder-Einzelteile, seltene Muster-Drops & meinen 10 €
                    Treue-Gutschein per E-Mail. Ich akzeptiere die{' '}
                    <button
                      type="button"
                      onClick={onOpenPrivacy}
                      className="font-bold text-black underline underline-offset-2 cursor-pointer"
                    >
                      Datenschutzerklärung
                    </button>{' '}
                    (jederzeit mit 1 Klick abbestellbar).
                  </span>
                </label>

                {errorMsg && (
                  <p className="text-[12.5px] font-semibold text-black border border-black px-3 py-1.5 bg-neutral-100">
                    {errorMsg}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Macro Lightbox for Luxury Atelier & Rarity Swatch Boards */}
      {typeof document !== 'undefined' &&
        zoomedImage &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-5xl w-full bg-[#12100E] border-2 border-[#D6B370] text-white overflow-hidden shadow-2xl"
            >
              <div className="px-4 py-3 bg-black border-b border-white/15 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-masculine text-[19px] font-bold text-[#D6B370]">
                    {zoomedImage.title}
                  </h4>
                  <p className="text-[12px] text-white/75">{zoomedImage.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="w-9 h-9 bg-white text-black flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-black flex items-center justify-center max-h-[80vh] p-2">
                <img
                  src={zoomedImage.src}
                  alt={zoomedImage.title}
                  className="max-h-[78vh] w-auto object-contain"
                />
              </div>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
