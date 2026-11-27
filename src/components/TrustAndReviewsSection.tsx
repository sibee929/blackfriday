import React from 'react';
import { Award, MessageCircle, RotateCcw, ShieldCheck, Star, Truck } from 'lucide-react';

const REVIEWS = [
  {
    id: 'r1',
    author: 'MAXIMILIAN K. · MÜNCHEN',
    verified: 'Verifizierter Kauf · Model Khabibi — Bleu Petrol (Größe L)',
    headline: '„Wurde am selben Abend zweimal auf die Farbe angesprochen“',
    text: 'In Deutschland bekommt man überall nur dasselbe Schwarz oder langweiliges Braun. Das Bleu Petrol schimmert je nach Licht extrem edel, das Lamm-Nappa riecht sofort nach echtem Leder und fühlt sich ab Minute eins weich an. Dank Maßchecker sitzt Größe L wie maßgeschneidert — für 177 € ein Witz im Vergleich zu 450 € in der Innenstadt.',
  },
  {
    id: 'r2',
    author: 'MEHDI & LUKAS B. · FRANKFURT',
    verified: 'Verifizierter Kauf · Model PUFFER — Mitternachtsblau (Größe XL)',
    headline: '„Hält selbst bei Minusgraden warm — fühlt sich an wie 600 €“',
    text: 'Habe mir die neue PUFFER in Mitternachtsblau bestellt (vorher im alten Shop schon auf der Merkliste). Die Wattierung unter dem butterweichen Nappa isoliert brutal gut bei Wind und Kälte, YKK-Reißverschluss läuft sauber und die Haustür-Lieferung war komplett kostenlos. Direkt noch eine zweite in Edlem Oliv für meinen Bruder mitgenommen.',
  },
  {
    id: 'r3',
    author: 'TOBIAS H. · HAMBURG',
    verified: 'Verifizierter Kauf · Model Badboy — Rouge Hermès (Größe M)',
    headline: '„Endlich eine Lederjacke mit Persönlichkeit & ehrlichem Preis“',
    text: 'Als Weihnachtsgeschenk für mich selbst geholt. Rouge Hermès knallt genau richtig, ohne billig zu wirken. Kurz per WhatsApp wegen meiner Schulterbreite gefragt, Antwort aus dem Team kam innerhalb von 20 Minuten. Warum noch Marken-Aufschlag im Kaufhaus zahlen, wenn es direkt aus Marrakesch so geliefert wird?',
  },
  {
    id: 'r4',
    author: 'JONAS W. · BERLIN',
    verified: 'Verifizierter Kauf · Model Racer — Bordeaux (Größe 2XL)',
    headline: '„Perfektes Geschenk — meine Frau war begeistert von der Box“',
    text: 'Eigentlich extrem skeptisch bei Online-Größen in 2XL, aber der Direkt-Maß-Service nach der Bestellung hat alles gerettet. Kam in der edlen Geschenkbox direkt per DHL Express nach Hause, ohne einen Cent Versand oder Zoll draufzuzahlen. Das Bordeaux-Leder altert mit jedem Tragen schöner.',
  },
  {
    id: 'r5',
    author: 'YANNICK S. · KÖLN',
    verified: 'Verifizierter Kauf · Model Airmare G-1 — Röst-Braun (Größe L)',
    headline: '„Schweres echtes Leder, perfekter Fall an Schultern & Ärmeln“',
    text: 'Kein dünnes Kunstleder-Gefühl, sondern echtes, sattes marokkanisches Nappa mit sauberem Kragen und elastischem Bund. Ich habe im Urlaub ähnliche Jacken für über 380 € gesehen — hier 177 € Festpreis für jede Größe. Sitzt am ersten Tag, ohne dass man sie Wochen einlaufen muss.',
  },
  {
    id: 'r6',
    author: 'DANIEL R. · STUTTGART',
    verified: 'Verifizierter Kauf · Model Cristian — Wildleder Schiefer (Größe 3XL)',
    headline: '„Samtiges Wildleder & sogar in 3XL exakt passend zugeschnitten“',
    text: 'In 3XL findet man in Deutschland fast nie moderne Schnitte in gutem Wildleder. Über den Maßchecker Brustumfang & Armlänge angegeben, neun Tage später lag das Paket vor der Tür. Weich wie Samt und kein Vergleich zu Stangenware.',
  },
];

export const TrustAndReviewsSection: React.FC = () => {
  return (
    <section className="py-12 md:py-20 px-4 sm:px-6 md:px-10 bg-white text-black border-t border-black/15">
      <div className="max-w-[1220px] mx-auto space-y-12">
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
              <strong>direkt bei unserer Gerberei & Manufaktur in Marrakesch</strong> — mit vollem{' '}
              <strong>-50 % Rabatt (Preis wie ausgezeichnet)</strong> auf alle 9 Modelle, jede Farbe
              und jede Größe von S bis 3XL inklusive kostenloser Haustür-Lieferung.
            </p>
          </div>

          <div className="lg:col-span-5 grid grid-cols-2 gap-3 text-center tabular-nums">
            <div className="p-4 bg-white border border-black/20">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-black/55">
                EINZELHANDEL DE
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
                MRKSHI (-50 % OFF)
              </p>
              <p className="mt-1 font-masculine text-[30px] font-bold text-white">177,00 €</p>
              <p className="text-[11px] font-semibold text-white/90 mt-0.5">
                0 € Haustür-Lieferung · Alle Farben
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
                0,00 € HAUSTÜR-LIEFERUNG
              </p>
              <p className="text-[12.5px] font-medium text-black/70 mt-0.5">
                Kostenloser versicherter DHL Express direkt bis nach Hause (7–14 Werktage, DE/AT/CH).
              </p>
            </div>
          </div>

          <div className="p-4 border border-black/20 bg-white flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-black shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-black">
                14 TAGE RÜCKGABE IN DE
              </p>
              <p className="text-[12.5px] font-medium text-black/70 mt-0.5">
                Null Risiko: Einfache Rückgabe über unseren Standort in 61137 Schöneck (Hessen).
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
                Vollnarbiges Lamm-Nappa, Rind- & Wildleder — jede Größe & Farbe fest 177 €.
              </p>
            </div>
          </div>

          <a
            href="https://wa.me/4917643488260"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 border border-black bg-black text-white hover:bg-neutral-800 transition-colors flex items-start gap-3"
          >
            <MessageCircle className="w-5 h-5 text-white shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold uppercase tracking-[0.04em] text-white">
                WHATSAPP MASS-SERVICE
              </p>
              <p className="text-[12.5px] text-white/80 mt-0.5">
                +49 176 43488260 · Kostenloser Größen- & Farb-Check vor dem Zuschnitt.
              </p>
            </div>
          </a>
        </div>

        {/* Verified Customer Reviews (Translated from Original Shop Feedback) */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold tracking-[0.18em] uppercase text-black/65">
                ÜBERTRAGEN AUS DEM ORIGINAL-SHOP · VERIFIZIERTE KÄUFER
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
    </section>
  );
};
