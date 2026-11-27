import React, { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import {
  CookieConsentStatus,
  getStoredConsent,
  setStoredConsent,
} from '../lib/metaPixel';

interface CookieConsentBannerProps {
  onConsentUpdated: (status: 'necessary' | 'all') => void;
  onOpenPrivacy: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({
  onConsentUpdated,
  onOpenPrivacy,
}) => {
  const [status, setStatus] = useState<CookieConsentStatus>(() => getStoredConsent());

  if (status !== 'unset') return null;

  const choose = (next: 'necessary' | 'all') => {
    setStoredConsent(next);
    setStatus(next);
    onConsentUpdated(next);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie- und Datenschutz-Einstellungen"
      className="fixed bottom-3 right-3 left-3 sm:left-auto sm:max-w-md z-50 bg-white text-black border-2 border-black shadow-2xl p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-black shrink-0" />
          <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-black">
            DATENSCHUTZ & TRACKING (DSGVO)
          </p>
        </div>
        <button
          type="button"
          onClick={() => choose('necessary')}
          aria-label="Nur notwendige akzeptieren"
          className="text-black/60 hover:text-black cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-2 text-[12.5px] font-medium leading-[1.5] text-black/80">
        Wir verwenden technisch notwendige Cookies für Warenkorb, Stripe/Klarna/Apple Pay &
        Cloudflare-Sicherheit sowie optionale Analyse-Tools (Meta Pixel, GA4), um Passform- &
        Farbkampagnen zu optimieren.{' '}
        <button
          type="button"
          onClick={onOpenPrivacy}
          className="font-bold text-black underline underline-offset-2 cursor-pointer"
        >
          Datenschutzerklärung
        </button>
      </p>

      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => choose('necessary')}
          className="h-9 px-3 border border-black bg-white text-black text-[11.5px] font-bold uppercase tracking-[0.05em] hover:bg-neutral-100 cursor-pointer"
        >
          Nur Notwendige
        </button>
        <button
          type="button"
          onClick={() => choose('all')}
          className="h-9 px-3 bg-black text-white text-[11.5px] font-bold uppercase tracking-[0.05em] hover:bg-neutral-800 cursor-pointer"
        >
          Alle akzeptieren
        </button>
      </div>
    </div>
  );
};
