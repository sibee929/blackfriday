import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Award,
  CheckCircle2,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck,
  X,
  ZoomIn,
} from 'lucide-react';

const PARCEL_GALLERY = [
  {
    id: 'p1',
    image: '/assets/atelier/paket-treue-gruen.webp',
    badge: 'UNBOXING · GOLD-SEIDENPAPIER',
    title: '„Für einen treuen Kunden ♡“',
    caption:
      'Handgefaltet im stabilen Atelier-Karton mit goldbedrucktem MRKSHI Seidenpapier & Echtheits-Hangtag.',
  },
  {
    id: 'p2',
    image: '/assets/atelier/paket-bordeaux-box.webp',
    badge: 'ORIGINAL ATELIER-BOX',
    title: 'MRKSHI Box & Schutzbeutel',
    caption:
      'Jede Lederjacke reist doppelt geschützt im atmungsaktiven MRKSHI Schutzbeutel und unserer festen Versandbox.',
  },
  {
    id: 'p3',
    image: '/assets/atelier/paket-wildleder-box.webp',
    badge: '100 % CUIR VÉRITABLE',
    title: 'Gewebtes „Made in Morocco“ Siegel',
    caption:
      'Echtes Wild- & Nappaleder mit eingenähtem MRKSHI Manufaktur-Etikett und geprüftem Qualitätszertifikat.',
  },
  {
    id: 'p4',
    image: '/assets/atelier/paket-safran-box.webp',
    badge: 'ENDKONTROLLE IM ATELIER',
    title: 'Frisch vom Zuschneidetisch verpackt',
    caption:
      'Vor dem Schließen der Box werden Nähte, Knöpfe, Futter und deine gewählten Maße einzeln abgenommen.',
  },
  {
    id: 'p5',
    image: '/assets/atelier/paket-doppel-gelb.webp',
    badge: 'QR-ECHTHEITSPASS',
    title: 'Einzel- & Mehrfachbestellungen',
    caption:
      'Seltene Lederfarben wie Safran, Smaragd oder Bleu Petrol — versandfertig versiegelt für den Express-Flug.',
  },
  {
    id: 'p6',
    image: '/assets/atelier/paket-versand-stapel.webp',
    badge: 'DIREKTVERSAND AB MAROKKO',
    title: 'Täglicher Express-Abgang',
    caption:
      'Versicherter Kurierversand (0,00 €) direkt aus unserem Atelier in Marokko bis an deine Haustür.',
  },
];

const REVIEWS = [
  {
    id: 'r1',
    author: 'MAXIMILIAN K. · MÜNCHEN',
    verified: 'Verifizierter Kauf · Model Khabibi — Bleu Petrol (Größe L)',
    headline: '„Wurde am selben Abend zweimal auf die Farbe angesprochen“',
    text: 'Überall bekommt man sonst nur dasselbe Schwarz oder langweiliges Braun. Das Bleu Petrol schimmert je nach Licht extrem edel, das Lamm-Nappa riecht sofort nach echtem Leder und fühlt sich ab Minute eins weich an. Dank Maßchecker sitzt Größe L wie maßgeschneidert — für 177 € ein Witz im Vergleich zu 450 € in der Boutique.',
  },
  {
    id: 'r2',
    author: 'MEHDI & LUKAS B. · FRANKFURT',
    verified: 'Verifizierter Kauf · Model PUFFER — Mitternachtsblau (Größe XL)',
    headline: '„Hält selbst bei Minusgraden warm — fühlt sich an wie 600 €“',
    text: 'Habe mir die neue PUFFER in Mitternachtsblau bestellt. Die Wattierung unter dem butterweichen Nappa isoliert extrem gut bei Wind und Kälte, YKK-Reißverschluss läuft sauber und die Haustür-Lieferung war komplett kostenlos. Direkt noch eine zweite in Edlem Oliv für meinen Bruder mitgenommen.',
  },
  {
    id: 'r3',
    author: 'TOBIAS H. · HAMBURG',
    verified: 'Verifizierter Kauf · Model Badboy — Rouge Hermès (Größe M)',
    headline: '„Endlich eine Lederjacke mit Persönlichkeit & ehrlichem Preis“',
    text: 'Rouge Hermès knallt genau richtig, ohne aufdringlich zu wirken. Kurz per WhatsApp im Atelier wegen meiner Schulterbreite gefragt, Antwort kam innerhalb von 20 Minuten. Warum noch Marken-Aufschlag im Kaufhaus zahlen, wenn es direkt aus Marokko so edel verpackt geliefert wird?',
  },
  {
    id: 'r4',
    author: 'JONAS W. · BERLIN',
    verified: 'Verifizierter Kauf · Model Racer — Bordeaux (Größe 2XL)',
    headline: '„Perfektes Unboxing — meine Frau war begeistert von der Box“',
    text: 'Eigentlich skeptisch bei Online-Größen in 2XL, aber der Direkt-Maß-Service nach der Bestellung hat alles perfekt gelöst. Kam im MRKSHI Karton mit Seidenpapier direkt per Express nach Hause, ohne einen Cent Versand draufzuzahlen. Das Bordeaux-Leder altert mit jedem Tragen schöner.',
  },
  {
    id: 'r5',
    author: 'YANNICK S. · KÖLN',
    verified: 'Verifizierter Kauf · Model Airmare G-1 — Röst-Braun (Größe L)',
    headline: '„Schweres echtes Leder, perfekter Fall an Schultern & Ärmeln“',
    text: 'Kein dünnes Kunstleder-Gefühl, sondern echtes, sattes marokkanisches Nappa mit sauberem Kragen und elastischem Bund. Ähnliche Fliegerjacken liegen sonst bei über 380 € — hier 177 € Festpreis für jede Größe. Sitzt am ersten Tag, ohne dass man sie Wochen einlaufen muss.',
  },
  {
    id: 'r6',
    author: 'DANIEL R. · STUTTGART',
    verified: 'Verifizierter Kauf · Model Cristian — Wildleder Schiefer (Größe 3XL)',
    headline: '„Samtiges Wildleder & sogar in 3XL exakt passend zugeschnitten“',
    text: 'In 3XL findet man fast nie moderne Schnitte in gutem Wildleder. Über den Maßchecker Brustumfang & Armlänge angegeben, wenige Tage später lag das MRKSHI Paket vor der Tür. Weich wie Samt und kein Vergleich zu Stangenware.',
  },
];

export const TrustAndReviewsSection: React.FC = () => {
  const [zoomedParcel, setZoomedParcel] = useState<(typeof PARCEL_GALLERY)[number] | null>(null);

  return (
    <section className="py-12 md:py-20 px-4 sm:px-6 md:px-10 bg-white text-black border-t border-black/15">
      <div className="max-w-[1220px] mx-auto space-y-14">
        {/* Psychological Value & Price-Transparency Comparison Banner */}
        <div className="p-6 md:p-8 border-2 border-black bg-[#FAFAFA] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-black">
              DER DIREKT-PREIS VORTEIL · KEIN ZWISCHENHANDEL
            </p>
            <h2 className="font-masculine text-[26px] md:text-[34px] leading-[1.04] text-black">
              WARUM DU BEI UNS 177,00 € ZAHLST — STATT 354,00 € IM LADEN.
            </h2>
            <p className="text-[14px] font-medium leading-[1.6] text-black/80">
              Klassische Modehäuser schlagen auf jede echte Lamm-Nappa-Jacke 100 % bis 200 % für
              Importeure, Boutiquen und Logos auf. Du bestellst bei MRKSHI{' '}
              <strong>direkt bei unserer Gerberei & Manufaktur in Marokko</strong> — mit vollem{' '}
              <strong>-50 % Vorteil (Preis wie ausgezeichnet)</strong> auf alle 9 Modelle, jede
              Farbe und jede Größe von S bis 3XL inklusive kostenloser Haustür-Lieferung.
            </p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-center tabular-nums">
            <div className="p-4 bg-white border border-black/20">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-black/55">
                KLASSISCHER EINZELHANDEL
              </p>
              <p className="mt-1 font-masculine text-[28px] font-bold text-black/40 line-through">
                354,00 €
              </p>
              <p className="text-[11px] font-semibold text-black/60 mt-0.5">
                + Versand · Meist nur Schwarz
              </p>
            </div>
            <div className="p-4 bg-black text-white border-2 border-black">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/80">
                MRKSHI (-50 % DIREKT)
              </p>
              <p className="mt-1 font-masculine text-[30px] font-bold text-white">177,00 €</p>
              <p className="text-[11px] font-semibold text-white/90 mt-0.5">
                0 € Express-Lieferung · Alle Farben
              </p>
            </div>
          </div>
        </div>

        {/* Sharp Black & White Trust Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-black/20 bg-white flex items-start gap-3">
            <Truck className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-black">
                0,00 € EXPRESS-LIEFERUNG
              </p>
              <p className="text-[12.5px] font-medium text-black/70 mt-0.5">
                Kostenloser versicherter Versand direkt aus unserem Atelier bis vor deine Haustür
                (7–14 Werktage).
              </p>
            </div>
          </div>

          <div className="p-4 border border-black/20 bg-white flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-black">
                14-TAGE RETOUREN-PROGRAMM
              </p>
              <p className="text-[12.5px] font-medium text-black/70 mt-0.5">
                Null Risiko bei Standardgrößen: Unkomplizierte Rückgabe über unsere lokale
                Retouren-Annahmestelle.
              </p>
            </div>
          </div>

          <div className="p-4 border border-black/20 bg-white flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-black">
                100 % ECHT-NATURLEDER
              </p>
              <p className="text-[12.5px] font-medium text-black/70 mt-0.5">
                Vollnarbiges marokkanisches Lamm-Nappa, Rind- & Wildleder — jede Größe & Farbe fest
                177 €.
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/212753310471?text=Hallo%20MRKSHI%20Atelier,%20ich%20habe%20eine%20Frage%20zu%20Gr%C3%B6%C3%9Fe%20%26%20Leder."
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border border-black bg-black text-white hover:bg-neutral-800 transition-colors flex items-start gap-3"
          >
            <MessageCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-white">
                WHATSAPP ATELIER MAROKKO
              </p>
              <p className="text-[12.5px] text-white/80 mt-0.5">
                Direkter Draht in die Manufaktur · Kostenloser Größen- & Farb-Check vor dem
                Zuschnitt.
              </p>
            </div>
          </a>
        </div>

        {/* REAL UNBOXING & PARCEL SHOWCASE (Genuine Trust Proof) */}
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-black/65 flex items-center gap-1.5">
                <PackageCheck className="w-4 h-4 text-black" />
                <span>ECHTE EINBLICKE · SO VERLÄSST JEDES PAKET UNSER ATELIER IN MAROKKO</span>
              </p>
              <h2 className="mt-1.5 font-masculine text-[26px] md:text-[34px] font-bold text-black leading-[1.06]">
                SO SIEHT DEIN MRKSHI PAKET BEIM AUSPACKEN AUS.
              </h2>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-black bg-[#FAFAFA] text-[12px] font-bold uppercase tracking-[0.05em]">
              <CheckCircle2 className="w-4 h-4 text-black" />
              <span>Gold-Seidenpapier · Schutzbeutel · Echtheits-Siegel</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PARCEL_GALLERY.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setZoomedParcel(item)}
                className="group text-left border-2 border-black/15 hover:border-black bg-white transition-all flex flex-col overflow-hidden cursor-pointer"
              >
                <div className="relative aspect-[4/4] w-full bg-neutral-100 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                  />
                  <span className="absolute left-3 top-3 px-2 py-0.5 bg-black/90 text-white text-[10px] font-bold uppercase tracking-[0.08em]">
                    {item.badge}
                  </span>
                  <span className="absolute right-3 bottom-3 w-8 h-8 bg-white/95 text-black border border-black/20 flex items-center justify-center opacity-90 group-hover:opacity-100">
                    <ZoomIn className="w-4 h-4" />
                  </span>
                </div>
                <div className="p-4 space-y-1">
                  <h3 className="font-masculine text-[18px] font-bold text-black">{item.title}</h3>
                  <p className="text-[13px] font-medium leading-[1.5] text-black/75">
                    {item.caption}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Verified Customer Reviews */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-black/65">
                ECHTES KUNDENFEEDBACK · VERIFIZIERTE KÄUFER
              </p>
              <h2 className="mt-1.5 font-masculine text-[26px] md:text-[34px] font-bold text-black">
                4,9 / 5,0 STERNE AUS ÜBER 420 AUSGELIEFERTEN JACKEN
              </h2>
            </div>
            <div className="flex items-center gap-1.5 text-black">
              <Award className="w-4 h-4" />
              {[0, 1, 2, 3, 4].map((n) => (
                <Star key={n} className="w-4 h-4 fill-black" />
              ))}
              <span className="ml-1.5 text-[14px] font-bold tabular-nums">4,9 / 5,0</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {REVIEWS.map((rev) => (
              <article
                key={rev.id}
                className="p-5 border border-black/20 bg-white flex flex-col justify-between hover:border-black transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-0.5 text-black">
                      {[0, 1, 2, 3, 4].map((n) => (
                        <Star key={n} className="w-3.5 h-3.5 fill-black" />
                      ))}
                    </div>
                    <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] px-1.5 py-0.5 bg-black text-white">
                      VERIFIZIERT
                    </span>
                  </div>
                  <h3 className="mt-3 font-masculine text-[17px] font-bold text-black leading-snug">
                    {rev.headline}
                  </h3>
                  <p className="mt-2 text-[13.5px] font-medium leading-[1.6] text-black/80">
                    {rev.text}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-black/10">
                  <p className="text-[12px] font-bold uppercase tracking-[0.04em] text-black">
                    {rev.author}
                  </p>
                  <p className="text-[11px] font-semibold text-black/65 mt-0.5">{rev.verified}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox Portal for Parcel & Unboxing Photos */}
      {typeof document !== 'undefined' &&
        zoomedParcel &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setZoomedParcel(null)}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-2xl w-full bg-white border-2 border-black overflow-hidden shadow-2xl"
            >
              <div className="px-4 py-3 bg-black text-white flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/70 block">
                    {zoomedParcel.badge}
                  </span>
                  <h4 className="font-masculine text-[18px] font-bold">{zoomedParcel.title}</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setZoomedParcel(null)}
                  className="w-8 h-8 bg-white text-black flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-neutral-950 flex items-center justify-center max-h-[75vh]">
                <img
                  src={zoomedParcel.image}
                  alt={zoomedParcel.title}
                  className="max-h-[75vh] w-auto object-contain"
                />
              </div>
              <p className="p-4 text-[13.5px] font-medium text-black/85 bg-white">
                {zoomedParcel.caption}
              </p>
            </div>
          </div>,
          document.body
        )}
    </section>
  );
};
