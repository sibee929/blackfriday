import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Lock,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { MassCheckerModal, MassCheckerResult } from './MassCheckerModal';
import { PaymentLogos } from './PaymentLogos';
import { generateMetaEventId, getMetaAttributionParams } from '../lib/metaPixel';

export interface CartColorInfo {
  id: string;
  name: string;
  hex: string;
  frontImage: string;
}

export interface CartItem {
  uid: string;
  productId: string;
  productName: string;
  colorVariant: CartColorInfo;
  sizeLabel: string;
  customMeasure: string;
  giftWrap: boolean;
  priceEur: number;
  quantity: number;
}

interface CartDrawerProps {
  open: boolean;
  items: CartItem[];
  activeVoucherCode: string;
  onVoucherChange: (code: string) => void;
  onClose: () => void;
  onUpdateQty: (uid: string, delta: number) => void;
  onRemoveItem: (uid: string) => void;
  onApplyCartMeasure?: (summary: string, recommendedSize: string, useCustom: boolean) => void;
  onInitiateCheckout: (items: CartItem[], totalEur: number, eventId: string) => void;
  onPreviewPurchaseComplete: (
    sessionId: string,
    totalEur: number,
    items: CartItem[],
    meta?: { orderNumber?: string; n8nSent?: boolean; telegramSent?: boolean }
  ) => void;
}

interface CheckoutApiResponse {
  mode?: 'stripe' | 'preview';
  sessionId?: string;
  orderId?: string;
  url?: string;
  totalCents?: number;
  message?: string;
  error?: string;
}

const VALID_CODES = ['TREUE10', 'MRKSHI10', 'BLACKFRIDAY', 'VIP10'];

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  items,
  activeVoucherCode,
  onVoucherChange,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onApplyCartMeasure,
  onInitiateCheckout,
  onPreviewPurchaseComplete,
}) => {
  const [voucherDraft, setVoucherDraft] = useState<string>(activeVoucherCode);
  const [appliedVoucher, setAppliedVoucher] = useState<string>(activeVoucherCode);
  const [voucherFeedback, setVoucherFeedback] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<boolean>(false);
  const [checkoutMeasurement, setCheckoutMeasurement] = useState<string>('');
  const [giftNote, setGiftNote] = useState<string>('');
  const [massCheckerOpen, setMassCheckerOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [completingPreview, setCompletingPreview] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stripeRedirectUrl, setStripeRedirectUrl] = useState<string | null>(null);
  const [previewInfo, setPreviewInfo] = useState<{
    sessionId: string;
    orderId?: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (activeVoucherCode) {
      const upper = activeVoucherCode.trim().toUpperCase();
      setVoucherDraft(upper);
      if (VALID_CODES.includes(upper)) {
        setAppliedVoucher(upper);
      }
    }
  }, [activeVoucherCode]);

  if (!open) return null;

  const hasOneEuroItem = items.some((i) => i.priceEur === 1);
  const itemsSubtotalEur = items.reduce((sum, item) => sum + item.priceEur * item.quantity, 0);
  const cleanApplied = appliedVoucher.trim().toUpperCase();
  const voucherValid =
    !hasOneEuroItem && itemsSubtotalEur >= 49 && VALID_CODES.includes(cleanApplied);
  const voucherDiscountEur = voucherValid ? 10 : 0;
  const finalTotalEur = Math.max(1, itemsSubtotalEur - voucherDiscountEur);
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleApplyVoucher = () => {
    const candidate = voucherDraft.trim().toUpperCase();
    setVoucherFeedback(null);
    if (!candidate) {
      setAppliedVoucher('');
      onVoucherChange('');
      return;
    }
    if (VALID_CODES.includes(candidate)) {
      setAppliedVoucher(candidate);
      onVoucherChange(candidate);
    } else {
      setVoucherFeedback('Gutscheincode nicht erkannt.');
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherDraft('');
    setAppliedVoucher('');
    setVoucherFeedback(null);
    onVoucherChange('');
  };

  const handleFastCheckout = async () => {
    if (items.length === 0 || loading) return;

    setLoading(true);
    setErrorMsg(null);
    setStripeRedirectUrl(null);
    setPreviewInfo(null);

    const checkoutEventId = generateMetaEventId('ic');
    const metaAttr = getMetaAttributionParams();
    onInitiateCheckout(items, finalTotalEur, checkoutEventId);

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkoutEventId,
          fbc: metaAttr.fbc,
          fbp: metaAttr.fbp,
          measurementsSummary: checkoutMeasurement.trim() || undefined,
          giftNote: giftNote.trim() || undefined,
          voucherCode: voucherValid ? cleanApplied : undefined,
          items: items.map((item) => ({
            productId: item.productId,
            colorId: item.colorVariant.id,
            colorName: item.colorVariant.name,
            sizeLabel: item.sizeLabel,
            customMeasure: item.customMeasure || checkoutMeasurement.trim(),
            giftWrap: item.giftWrap,
            quantity: item.quantity,
          })),
        }),
      });

      const rawText = await res.text();
      let data: CheckoutApiResponse = {};
      try {
        data = JSON.parse(rawText) as CheckoutApiResponse;
      } catch {
        setErrorMsg(`Server-Antwort ungültig (HTTP ${res.status}). Bitte erneut versuchen.`);
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error ?? `Checkout konnte nicht gestartet werden (HTTP ${res.status}).`);
        return;
      }

      if (data.mode === 'stripe' && data.url) {
        setStripeRedirectUrl(data.url);
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        } catch {
          // Fallback link stays rendered below
        }
      } else if (data.mode === 'preview' && data.sessionId) {
        setPreviewInfo({
          sessionId: data.sessionId,
          orderId: data.orderId,
          message:
            data.message ??
            'Vorschau-Modus aktiv. Mit Klick unten wird die Test-Bestellung abgeschlossen.',
        });
      }
    } catch {
      setErrorMsg('Keine Verbindung zum Server. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePreview = async () => {
    if (!previewInfo) return;
    setCompletingPreview(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/checkout/complete-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: previewInfo.sessionId }),
      });
      const data = (await res.json()) as {
        orderId?: string;
        n8nSent?: boolean;
        telegramSent?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Bestellabschluss fehlgeschlagen.');
        return;
      }
      onPreviewPurchaseComplete(previewInfo.sessionId, finalTotalEur, items, {
        orderNumber: data.orderId,
        n8nSent: data.n8nSent,
        telegramSent: data.telegramSent,
      });
    } catch {
      onPreviewPurchaseComplete(previewInfo.sessionId, finalTotalEur, items);
    } finally {
      setCompletingPreview(false);
    }
  };

  const handleApplyMeasure = (res: MassCheckerResult, useCustom: boolean) => {
    const label = useCustom
      ? `Direkt-Maß: ${res.summaryString}`
      : `Empfehlung ${res.recommendedSize}: ${res.summaryString}`;
    setCheckoutMeasurement(label);
    setNotesOpen(true);
    if (onApplyCartMeasure) {
      onApplyCartMeasure(label, res.recommendedSize, useCustom);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Warenkorb"
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] h-full bg-white flex flex-col shadow-2xl"
      >
        {/* Clean Minimal Header */}
        <div className="px-5 py-4 border-b border-black/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-[18px] font-bold text-black font-masculine tracking-wide">
              WARENKORB {totalCount > 0 ? `(${totalCount})` : ''}
            </h2>
            <p className="text-[12px] font-medium text-[#166534]">
              ✓ Kostenloser DHL Express Versand inklusive
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Warenkorb schließen"
            className="w-9 h-9 rounded-full hover:bg-neutral-100 flex items-center justify-center text-black cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Airy Scrollable Middle */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {items.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-[15px] font-semibold text-black">Dein Warenkorb ist leer.</p>
              <p className="text-[13px] text-neutral-600 max-w-[280px] mx-auto">
                Wähle eines unserer Modelle aus 100 % marokkanischem Naturleder — inklusive
                kostenlosem DHL Express Versand.
              </p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="divide-y divide-black/10">
                {items.map((item) => (
                  <div key={item.uid} className="py-4 first:pt-0 flex gap-3.5">
                    <div className="w-20 h-24 rounded-lg bg-[#F7F7F7] border border-black/8 shrink-0 flex items-center justify-center p-1.5">
                      <img
                        src={item.colorVariant.frontImage}
                        alt={item.colorVariant.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[14.5px] font-bold text-black truncate">
                            {item.productName}
                          </p>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.uid)}
                            aria-label="Artikel entfernen"
                            className="text-neutral-400 hover:text-black p-0.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <p className="mt-1 text-[12.5px] text-neutral-600 flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded-full inline-block border border-black/20 shrink-0"
                            style={{ backgroundColor: item.colorVariant.hex }}
                          />
                          <span className="font-medium text-black/85">
                            {item.colorVariant.name}
                          </span>
                          <span>·</span>
                          <span>Größe {item.sizeLabel}</span>
                        </p>

                        {item.customMeasure && (
                          <p className="mt-1 text-[11.5px] font-medium text-[#166534]">
                            {item.customMeasure}
                          </p>
                        )}
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center border border-black/15 rounded-lg bg-white">
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.uid, -1)}
                            aria-label="Menge verringern"
                            className="w-8 h-8 flex items-center justify-center text-black hover:bg-neutral-100 rounded-l-lg cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-[13px] font-semibold tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQty(item.uid, 1)}
                            aria-label="Menge erhöhen"
                            className="w-8 h-8 flex items-center justify-center text-black hover:bg-neutral-100 rounded-r-lg cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right tabular-nums">
                          {item.priceEur > 1 && (
                            <span className="text-[11.5px] text-neutral-400 line-through mr-1.5">
                              {(item.priceEur * 2 * item.quantity).toFixed(0)} €
                            </span>
                          )}
                          <span className="text-[15px] font-bold text-black">
                            {(item.priceEur * item.quantity).toFixed(2).replace('.', ',')} €
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Clean Single-Row Gutschein Box */}
              {!hasOneEuroItem && (
                <div className="pt-2">
                  {voucherValid ? (
                    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[12.5px]">
                      <span className="font-semibold text-[#166534] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Gutschein {cleanApplied} aktiv (−10,00 €)</span>
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveVoucher}
                        className="text-neutral-500 hover:text-black text-[12px] underline cursor-pointer"
                      >
                        Entfernen
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Gutscheincode"
                            value={voucherDraft}
                            onChange={(e) => {
                              setVoucherDraft(e.target.value.toUpperCase());
                              setVoucherFeedback(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyVoucher();
                              }
                            }}
                            className="w-full h-10 pl-8 pr-3 rounded-lg border border-black/20 bg-white text-[13px] font-semibold uppercase tracking-wide text-black placeholder:normal-case placeholder:font-normal focus:border-black outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyVoucher}
                          className="h-10 px-4 rounded-lg border border-black bg-white text-black text-[12.5px] font-bold hover:bg-black hover:text-white transition-colors cursor-pointer shrink-0"
                        >
                          Anwenden
                        </button>
                      </div>
                      {voucherFeedback && (
                        <p className="text-[11.5px] text-red-600">{voucherFeedback}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Subtle Collapsible Optional Bespoke / Note Accordion */}
              <div className="border border-black/10 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setNotesOpen((v) => !v)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-[12.5px] font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Sondermaß oder Bestellnotiz hinzufügen (optional)</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-neutral-500 transition-transform ${
                      notesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {notesOpen && (
                  <div className="px-3.5 pb-3.5 pt-1 space-y-2.5 bg-neutral-50/60 border-t border-black/8">
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-medium text-neutral-600">
                        Körpermaße (optional)
                      </span>
                      <button
                        type="button"
                        onClick={() => setMassCheckerOpen(true)}
                        className="text-[11.5px] font-semibold text-black underline cursor-pointer"
                      >
                        Maßchecker öffnen
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={140}
                      placeholder="z. B. 182 cm, 82 kg · Ärmel +2 cm"
                      value={checkoutMeasurement}
                      onChange={(e) => setCheckoutMeasurement(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-white border border-black/15 text-[12.5px] text-black"
                    />
                    <input
                      type="text"
                      maxLength={140}
                      placeholder="Notiz ans Atelier / Geschenk-Gruß (optional)"
                      value={giftNote}
                      onChange={(e) => setGiftNote(e.target.value)}
                      className="w-full h-9 px-3 rounded-md bg-white border border-black/15 text-[12.5px] text-black"
                    />
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-[12.5px] text-red-800">
                  {errorMsg}
                </div>
              )}

              {stripeRedirectUrl && (
                <div className="p-3.5 rounded-lg bg-neutral-50 border border-black/15 space-y-1.5">
                  <p className="text-[12.5px] font-medium text-black">
                    Weiterleitung zu Stripe Checkout…
                  </p>
                  <a
                    href={stripeRedirectUrl}
                    target="_top"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold text-black underline"
                  >
                    <span>Hier klicken, falls sich das Fenster nicht automatisch öffnet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {previewInfo && (
                <div className="p-3.5 rounded-lg bg-neutral-50 border border-black/15 space-y-2.5">
                  <p className="text-[12px] text-neutral-700">{previewInfo.message}</p>
                  <button
                    type="button"
                    disabled={completingPreview}
                    onClick={handleCompletePreview}
                    className="w-full h-10 px-4 rounded-lg bg-black text-white text-[12.5px] font-semibold cursor-pointer"
                  >
                    {completingPreview ? 'Wird abgeschlossen…' : 'Test-Bestellung abschließen'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Compact, Clean Sticky Checkout Footer (Zero Overlap) */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-black/12 bg-white space-y-3 shrink-0">
            <div className="space-y-1 text-[13px]">
              <div className="flex items-center justify-between text-neutral-600">
                <span>Versand (DHL Express)</span>
                <span className="font-semibold text-[#166534]">Kostenlos</span>
              </div>

              {voucherDiscountEur > 0 && (
                <div className="flex items-center justify-between font-semibold text-[#166534] tabular-nums">
                  <span>Gutschein ({cleanApplied})</span>
                  <span>−{voucherDiscountEur},00 €</span>
                </div>
              )}

              <div className="flex items-baseline justify-between pt-1.5 border-t border-black/8 tabular-nums">
                <span className="text-[15px] font-bold text-black">
                  Gesamt <span className="text-[11.5px] font-normal text-neutral-500">(inkl. MwSt.)</span>
                </span>
                <span className="text-[20px] font-bold text-black">
                  {finalTotalEur.toFixed(2).replace('.', ',')} €
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFastCheckout}
              disabled={loading}
              className="w-full h-[50px] px-5 rounded-xl bg-[#111111] hover:bg-black text-white text-[14.5px] font-bold uppercase tracking-[0.05em] active:scale-[0.99] disabled:opacity-55 transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>
                {loading
                  ? 'Express-Kasse öffnet…'
                  : `Express Checkout · ${finalTotalEur.toFixed(2).replace('.', ',')} €`}
              </span>
            </button>

            <PaymentLogos size="sm" />

            <p className="text-[11px] text-center text-neutral-500 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[#166534]" />
              <span>1-Klick Zahlung via Apple Pay, Google Pay, Klarna & Karte · 14 Tage Rückgabe</span>
            </p>
          </div>
        )}
      </div>

      <MassCheckerModal
        open={massCheckerOpen}
        productName={items[0]?.productName ?? 'MRKSHI Lederjacke'}
        colorName={items[0]?.colorVariant.name ?? ''}
        onClose={() => setMassCheckerOpen(false)}
        onApplyResult={handleApplyMeasure}
      />
    </div>
  );
};
