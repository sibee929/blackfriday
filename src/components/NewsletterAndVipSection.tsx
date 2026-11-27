import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Gift, Sparkles } from 'lucide-react';

interface NewsletterAndVipSectionProps {
  activeVoucherCode: string;
  onActivateVoucher: (code: string) => void;
  onOpenPrivacy: () => void;
}

const COLOR_PREFS = [
  'Bleu Petrol',
  'Blue Majorelle',
  'Rouge Hermès',
  'Bordeaux',
  'Olive',
  'Alle seltenen Farben',
];

export const NewsletterAndVipSection: React.FC<NewsletterAndVipSectionProps> = ({
  activeVoucherCode,
  onActivateVoucher,
  onOpenPrivacy,
}) => {
  const [email, setEmail] = useState<string>('');
  const [preferredColor, setPreferredColor] = useState<string>('Bleu Petrol');
  const [consent, setConsent] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successVoucher, setSuccessVoucher] = useState<string | null>(
    activeVoucherCode === 'TREUE10' ? 'TREUE10' : null
  );

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
          preferredColor,
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
      className="py-12 md:py-16 px-4 sm:px-6 md:px-10 bg-white text-black border-t border-black/15"
    >
      <div className="max-w-[1220px] mx-auto border-2 border-black p-6 sm:p-8 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-3">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-black/65 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-black" />
            <span>MRKSHI ATELIER-CLUB · NEUE FARB-DROPS & TREUE-VORTEIL</span>
          </p>
          <h2 className="font-masculine text-[28px] sm:text-[34px] font-bold leading-[1.04] text-black">
            10,00 € TREUE-GUTSCHEIN + EXKLUSIVE LEDER-DROPS PER E-MAIL.
          </h2>
          <p className="text-[14.5px] font-medium leading-[1.6] text-black/75">
            Erhalte frühzeitigen Zugang zu limitierten marokkanischen Färbungen (Saison-Drops, neue
            Wildleder-Chargen & Treue-Rabatte für Stammkunden). Direkt nach der Anmeldung wird dein
            10 € Code im Warenkorb freigeschaltet.
          </p>

          <div className="flex flex-wrap gap-2 pt-1 text-[11.5px] font-bold uppercase tracking-[0.06em]">
            <span className="px-2.5 py-1 border border-black text-black">
              ✓ CODE: TREUE10 (-10,00 €)
            </span>
            <span className="px-2.5 py-1 border border-black text-black">
              ✓ KOMBINIERBAR MIT 2-JACKEN RABATT (-20 €)
            </span>
          </div>
        </div>

        <div className="lg:col-span-6">
          {successVoucher ? (
            <div className="p-6 border-2 border-black bg-black text-white space-y-3">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
                <span className="font-masculine text-[22px] font-bold">
                  TREUE-GUTSCHEIN AKTIV: {successVoucher}
                </span>
              </div>
              <p className="text-[13.5px] text-white/85 leading-[1.55]">
                Dein 10,00 € Treue-Vorteil ist im Warenkorb vorgemerkt und wird direkt beim Stripe /
                Apple Pay / Klarna Checkout abgezogen. Neue Produkt-Drops erhältst du automatisch
                per E-Mail.
              </p>
              <button
                type="button"
                onClick={() => onActivateVoucher(successVoucher)}
                className="inline-flex items-center gap-2 h-10 px-4 bg-white text-black text-[12.5px] font-bold uppercase tracking-[0.06em] hover:bg-neutral-200 cursor-pointer"
              >
                <Gift className="w-4 h-4" />
                <span>Code im Warenkorb nutzen</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <span className="block text-[11.5px] font-bold uppercase tracking-[0.08em] text-black mb-1.5">
                  WELCHE LEDERFARBE SOLLEN WIR DIR ZUERST ZEIGEN?
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PREFS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPreferredColor(c)}
                      className={`h-8 px-2.5 text-[11.5px] font-bold border transition-colors cursor-pointer ${
                        preferredColor === c
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-black border-black/25 hover:border-black'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
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
                  className="h-12 px-5 bg-black text-white text-[13.5px] font-bold uppercase tracking-[0.06em] hover:bg-neutral-800 disabled:opacity-50 inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>{loading ? 'Wird aktiviert…' : '10 € Code sichern'}</span>
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
                  Ja, ich möchte E-Mails zu neuen MRKSHI Lederjacken & Treue-Gutscheinen erhalten
                  und akzeptiere die{' '}
                  <button
                    type="button"
                    onClick={onOpenPrivacy}
                    className="font-bold text-black underline underline-offset-2 cursor-pointer"
                  >
                    Datenschutzerklärung
                  </button>
                  . Abmeldung jederzeit mit einem Klick möglich.
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
    </section>
  );
};
