import React, { useState } from 'react';
import {
  CheckCircle2,
  Mail,
  MessageCircle,
  Ruler,
  ShieldCheck,
  X,
} from 'lucide-react';

export interface OrderConfirmationState {
  sessionId: string;
  orderNumber?: string;
  totalEur: number;
  mode: 'stripe' | 'preview';
  n8nSent?: boolean;
  telegramSent?: boolean;
}

interface PostPaymentModalProps {
  confirmation: OrderConfirmationState | null;
  onClose: () => void;
}

export const PostPaymentModal: React.FC<PostPaymentModalProps> = ({
  confirmation,
  onClose,
}) => {
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [chestCm, setChestCm] = useState<string>('');
  const [sleeveCm, setSleeveCm] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!confirmation) return null;

  const orderLabel = confirmation.orderNumber ?? confirmation.sessionId;
  const whatsappUrl = `https://wa.me/212753310471?text=${encodeURIComponent(
    `Hallo MRKSHI Atelier, ich habe gerade bestellt (${orderLabel}) und möchte mein Sondermaß / meine Lieferung direkt abstimmen.`
  )}`;

  const handleSubmitBespoke = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedMsg(null);
    setSubmitting(true);

    try {
      const resp = await fetch('/api/orders/post-payment-measure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: confirmation.sessionId,
          heightCm: heightCm ? Number(heightCm) : undefined,
          weightKg: weightKg ? Number(weightKg) : undefined,
          chestCm: chestCm ? Number(chestCm) : undefined,
          sleeveCm: sleeveCm ? Number(sleeveCm) : undefined,
          note: note.trim(),
        }),
      });

      const data = (await resp.json()) as {
        error?: string;
        measurementsSummary?: string;
      };

      if (!resp.ok) {
        setErrorMsg(data.error ?? 'Sondermaß konnte nicht gespeichert werden.');
        return;
      }

      setSavedMsg(
        data.measurementsSummary ??
          'Deine Maße wurden im Atelier gespeichert und per Telegram/n8n übermittelt.'
      );
    } catch {
      setErrorMsg('Verbindungsfehler — bitte per WhatsApp direkt senden.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bestellbestätigung und Sondermaß nach Bezahlung"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white border-2 border-black shadow-2xl text-black my-4"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-black text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-white shrink-0" />
            <div>
              <p className="text-[10.5px] font-bold tracking-[0.18em] uppercase text-white/70">
                BEZAHLUNG BESTÄTIGT · MRKSHI.COM
              </p>
              <h2 className="font-masculine text-[22px] font-bold leading-tight">
                BESTELLUNG {confirmation.orderNumber ?? 'ERFASSEN'} BESTÄTIGT
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="w-8 h-8 bg-white text-black flex items-center justify-center hover:bg-neutral-200 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Order Metadata */}
          <div className="p-3.5 border border-black/20 bg-white flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-black/60">
                GESAMTBETRAG (INKL. DHL EXPRESS)
              </p>
              <p className="font-masculine text-[22px] font-bold text-black tabular-nums">
                {confirmation.totalEur.toFixed(2).replace('.', ',')} €
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-black">
                ATELIER-STATUS
              </p>
              <p className="text-[12px] font-mono text-black/75 break-all">
                Ref: {confirmation.sessionId}
              </p>
            </div>
          </div>

          {/* Post-Payment Sondermaß Form */}
          <form onSubmit={handleSubmitBespoke} className="border-2 border-black p-4 space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/65 flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-black" />
                  <span>SONDERMASS NACH BEZAHLUNG (0,00 €)</span>
                </p>
                <h3 className="mt-1 font-masculine text-[19px] font-bold text-black">
                  EXAKTE KÖRPERMASSE FÜR ZUSCHNITT SENDEN
                </h3>
              </div>
              <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold uppercase tracking-[0.08em] shrink-0">
                DIREKT-MASS
              </span>
            </div>

            <p className="text-[12.5px] font-medium text-black/75 leading-[1.45]">
              Optional: Trag hier direkt deine exakten Maße ein (Brust, Ärmel, Schulter oder Sonderwunsch). Wir legen sie verbindlich in dein Atelier-Ticket in Marrakesch.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <label className="block">
                <span className="block text-[11px] font-bold uppercase text-black mb-1">
                  Größe (cm)
                </span>
                <input
                  type="number"
                  min={130}
                  max={230}
                  placeholder="182"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full h-9 px-2.5 border border-black/30 bg-white text-[13px] font-semibold text-black tabular-nums"
                />
              </label>

              <label className="block">
                <span className="block text-[11px] font-bold uppercase text-black mb-1">
                  Gewicht (kg)
                </span>
                <input
                  type="number"
                  min={40}
                  max={200}
                  placeholder="82"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full h-9 px-2.5 border border-black/30 bg-white text-[13px] font-semibold text-black tabular-nums"
                />
              </label>

              <label className="block">
                <span className="block text-[11px] font-bold uppercase text-black mb-1">
                  Brust (cm)
                </span>
                <input
                  type="number"
                  min={75}
                  max={165}
                  placeholder="106"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  className="w-full h-9 px-2.5 border border-black/30 bg-white text-[13px] font-semibold text-black tabular-nums"
                />
              </label>

              <label className="block">
                <span className="block text-[11px] font-bold uppercase text-black mb-1">
                  Ärmel (cm)
                </span>
                <input
                  type="number"
                  min={50}
                  max={85}
                  placeholder="65"
                  value={sleeveCm}
                  onChange={(e) => setSleeveCm(e.target.value)}
                  className="w-full h-9 px-2.5 border border-black/30 bg-white text-[13px] font-semibold text-black tabular-nums"
                />
              </label>
            </div>

            <label className="block">
              <span className="block text-[11px] font-bold uppercase text-black mb-1">
                Sonderwunsch / Bauchweite / Schulter-Hinweis
              </span>
              <input
                type="text"
                maxLength={200}
                placeholder="z. B. Ärmel +2 cm, sportliche Schulter, dicker Pullover darunter"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full h-9 px-2.5 border border-black/30 bg-white text-[13px] text-black"
              />
            </label>

            {errorMsg && (
              <p className="p-2.5 border border-black bg-neutral-100 text-[12.5px] font-semibold text-black">
                {errorMsg}
              </p>
            )}

            {savedMsg && (
              <p className="p-2.5 border border-black bg-black text-white text-[12.5px] font-semibold">
                ✓ {savedMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-10 bg-black text-white text-[13px] font-bold uppercase tracking-[0.06em] hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? 'WIRD INS ATELIER GESENDET…' : 'SONDERMASS JETZT AN ATELIER SENDEN'}
            </button>
          </form>

          {/* Direkt-Kontakt Strip */}
          <div className="border border-black/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-black">
                DIREKT-KONTAKT ZUM ATELIER MAROKKO (CASABLANCA & MARRAKESCH)
              </span>
              <ShieldCheck className="w-4 h-4 text-black shrink-0" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="h-10 px-3 bg-black text-white text-[12px] font-bold uppercase tracking-[0.05em] hover:bg-neutral-800 inline-flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>WhatsApp Atelier Direkt</span>
              </a>

              <a
                href={`mailto:service@mrkshi.com?subject=${encodeURIComponent(
                  `MRKSHI Bestellung ${orderLabel} — Sondermaß / Rückfrage`
                )}`}
                className="h-10 px-3 border border-black bg-white text-black text-[12px] font-bold uppercase tracking-[0.05em] hover:bg-black hover:text-white transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span>service@mrkshi.com</span>
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 border-2 border-black bg-white text-black text-[13.5px] font-bold uppercase tracking-[0.06em] hover:bg-black hover:text-white transition-colors cursor-pointer"
          >
            ZURÜCK ZUM SHOP
          </button>
        </div>
      </div>
    </div>
  );
};
