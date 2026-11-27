import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Gift,
  Lock,
  MessageCircle,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { JacketProduct, optimizeProductImage } from '../data/catalog';
import { MassCheckerModal, MassCheckerResult } from './MassCheckerModal';
import { PaymentLogos } from './PaymentLogos';

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
  products: JacketProduct[];
  activeVoucherCode: string;
  onVoucherChange: (code: string) => void;
  onQuickAddUpsell: (product: JacketProduct) => void;
  onClose: () => void;
  onUpdateQty: (uid: string, delta: number) => void;
  onRemoveItem: (uid: string) => void;
  onApplyCartMeasure?: (summary: string, recommendedSize: string, useCustom: boolean) => void;
  onInitiateCheckout: (items: CartItem[], totalEur: number) => void;
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

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  items,
  products,
  activeVoucherCode,
  onVoucherChange,
  onQuickAddUpsell,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onApplyCartMeasure,
  onInitiateCheckout,
  onPreviewPurchaseComplete,
}) => {
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [whatsappNumber, setWhatsappNumber] = useState<string>('');
  const [checkoutMeasurement, setCheckoutMeasurement] = useState<string>('');
  const [giftNote, setGiftNote] = useState<string>('');
  const [upsellCareKit, setUpsellCareKit] = useState<boolean>(false);
  const [voucherInput, setVoucherInput] = useState<string>(activeVoucherCode);
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
      setVoucherInput(activeVoucherCode);
    }
  }, [activeVoucherCode]);

  const recommendedUpsell = useMemo(() => {
    const inCartIds = new Set(items.map((i) => i.productId));
    return (
      products.find((p) => p.active && p.priceEur > 1 && !inCartIds.has(p.id)) ??
      products.find((p) => p.active && p.priceEur > 1) ??
      null
    );
  }, [items, products]);

  if (!open) return null;

  const totalJacketQty = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasOneEuroItem = items.some((i) => i.priceEur === 1);
  const itemsSubtotalEur = items.reduce((sum, item) => sum + item.priceEur * item.quantity, 0);
  const careKitEur = upsellCareKit ? 14 : 0;
  const bundleDiscountEur = !hasOneEuroItem && totalJacketQty >= 2 ? 20 : 0;
  const cleanVoucher = voucherInput.trim().toUpperCase();
  const VALID_CODES = ['TREUE10', 'MRKSHI10', 'BLACKFRIDAY', 'VIP10'];
  const voucherValid =
    !hasOneEuroItem &&
    itemsSubtotalEur + careKitEur - bundleDiscountEur >= 49 &&
    VALID_CODES.includes(cleanVoucher);
  const voucherInvalidTyped = cleanVoucher.length >= 3 && !voucherValid;
  const voucherDiscountEur = voucherValid ? 10 : 0;
  const finalTotalEur = Math.max(
    1,
    itemsSubtotalEur + careKitEur - bundleDiscountEur - voucherDiscountEur
  );
  const compareAtTotalEur = items.reduce(
    (sum, i) => sum + (i.priceEur > 1 ? i.priceEur * 2 : i.priceEur) * i.quantity,
    0
  );
  const totalSavingsEur = Math.max(
    0,
    compareAtTotalEur - itemsSubtotalEur + bundleDiscountEur + voucherDiscountEur
  );
  const freeShippingProgress = 100;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    const cleanEmail = customerEmail.trim();
    const cleanWhatsapp = whatsappNumber.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMsg('Bitte gib eine gültige E-Mail-Adresse für Tracking & Rechnung ein.');
      return;
    }

    const digitsOnly = cleanWhatsapp.replace(/[^\d]/g, '');
    if (cleanWhatsapp && digitsOnly.length < 6) {
      setErrorMsg('Bitte eine gültige WhatsApp-Nummer eingeben oder das Feld leer lassen.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setStripeRedirectUrl(null);
    setPreviewInfo(null);

    onInitiateCheckout(items, finalTotalEur);

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: cleanEmail,
          whatsappNumber: cleanWhatsapp,
          measurementsSummary: checkoutMeasurement.trim() || undefined,
          giftNote: giftNote.trim() || undefined,
          upsellCareKit,
          voucherCode: voucherValid ? cleanVoucher : undefined,
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
        setErrorMsg(
          `Server-Antwort ungültig (HTTP ${res.status}). Bitte in 10 Sekunden erneut versuchen oder per WhatsApp bestellen.`
        );
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
            'Stripe-Vorschau aktiv. Mit Klick unten wird die Bestellung inkl. n8n & Telegram-Alert abgeschlossen.',
        });
      }
    } catch (err) {
      console.error('[Checkout] network error', err);
      setErrorMsg(
        'Keine Verbindung zum Server. Bitte Internet prüfen und erneut auf „Jetzt sicher bezahlen“ tippen.'
      );
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
    if (onApplyCartMeasure) {
      onApplyCartMeasure(label, res.recommendedSize, useCustom);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Warenkorb & Stripe Checkout"
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] h-full bg-white flex flex-col justify-between shadow-2xl"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#000000]/10 flex items-center justify-between">
          <div>
            <h2 className="text-[18px] font-semibold text-[#000000] font-masculine">Warenkorb & Express-Kasse</h2>
            <p className="text-[12px] text-[#4A4A4A]">
              Kostenlose Lieferung bis vor die Haustür (DHL Express 0 €) · 14 Tage Rückgabe
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Warenkorb schließen"
            className="w-9 h-9 rounded-full hover:bg-[#FAFAFA] flex items-center justify-center text-[#000000] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item List & Simple Checkout Inputs */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-[15px] font-medium text-[#000000]">
                Dein Warenkorb ist noch leer.
              </p>
              <p className="mt-1.5 text-[13.5px] text-[#4A4A4A]">
                Wähle eines unserer 9 Modelle aus marokkanischem Naturleder — jede Farbe & Größe
                177,00 € (-50 % Preis wie ausgezeichnet).
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.uid}
                className="flex gap-3.5 pb-4 border-b border-[#000000]/8"
              >
                <div className="w-20 h-24 rounded-lg overflow-hidden bg-[#FAFAFA] shrink-0 flex items-center justify-center p-1">
                  <img
                    src={item.colorVariant.frontImage}
                    alt={item.colorVariant.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-semibold text-[#000000] truncate">
                      {item.productName}
                    </p>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.uid)}
                      aria-label="Artikel entfernen"
                      className="text-[#4A4A4A] hover:text-[#000000] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="mt-0.5 text-[12.5px] text-[#4A4A4A] flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block border border-black/15"
                      style={{ backgroundColor: item.colorVariant.hex }}
                    />
                    <span>{item.colorVariant.name}</span>
                    <span>·</span>
                    <span>Größe {item.sizeLabel}</span>
                  </p>

                  {item.customMeasure && (
                    <p className="mt-1 text-[11.5px] text-emerald-800">{item.customMeasure}</p>
                  )}

                  {item.giftWrap && (
                    <p className="mt-0.5 text-[11.5px] text-[#4A4A4A]">
                      Inkl. Weihnachts-Geschenkbox (0,00 €)
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#000000]/15 rounded-lg">
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.uid, -1)}
                        aria-label="Menge verringern"
                        className="w-8 h-8 flex items-center justify-center text-[#000000] hover:bg-[#FAFAFA] cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-[13px] font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQty(item.uid, 1)}
                        aria-label="Menge erhöhen"
                        className="w-8 h-8 flex items-center justify-center text-[#000000] hover:bg-[#FAFAFA] cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <span className="text-[14.5px] font-semibold tabular-nums text-[#000000]">
                      {(item.priceEur * item.quantity).toFixed(2).replace('.', ',')} €
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}

          {items.length > 0 && (
            <form id="stripe-checkout-form" onSubmit={handleCheckout} className="space-y-3.5 pt-1">
              <div className="p-3.5 rounded-xl bg-[#FAFAFA] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#4A4A4A]">
                    Kundendaten & Maß-Check
                  </span>
                  <button
                    type="button"
                    onClick={() => setMassCheckerOpen(true)}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[#000000] underline cursor-pointer"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    <span>Maßchecker</span>
                  </button>
                </div>

                <label className="block">
                  <span className="block text-[12px] font-medium text-[#000000] mb-1">
                    E-Mail-Adresse *
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="max@beispiel.de"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#000000]/18 text-[13.5px] text-[#000000]"
                  />
                </label>

                <label className="block">
                  <span className="block text-[12px] font-medium text-[#000000] mb-1 flex items-center gap-1.5">
                    <MessageCircle className="w-3.5 h-3.5 text-[#126E35]" />
                    <span>WhatsApp (optional · für Passform & DHL Tracking)</span>
                  </span>
                  <input
                    type="tel"
                    placeholder="+49 176 12345678"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#000000]/18 text-[13.5px] text-[#000000]"
                  />
                </label>

                <label className="block">
                  <span className="block text-[12px] font-medium text-[#000000] mb-1">
                    Körpermaße / Größe (optional oder via Maßchecker)
                  </span>
                  <input
                    type="text"
                    maxLength={140}
                    placeholder="z. B. 182 cm, 82 kg · Größe L oder Ärmel +2 cm"
                    value={checkoutMeasurement}
                    onChange={(e) => setCheckoutMeasurement(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-[#000000]/18 text-[13px] text-[#000000]"
                  />
                </label>

                <label className="block">
                  <span className="block text-[12px] font-medium text-[#4A4A4A] mb-1">
                    Geschenknotiz / Hinweis ans Atelier (optional)
                  </span>
                  <input
                    type="text"
                    maxLength={140}
                    placeholder="z. B. Frohe Weihnachten!"
                    value={giftNote}
                    onChange={(e) => setGiftNote(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-white border border-[#000000]/15 text-[13px] text-[#000000]"
                  />
                </label>
              </div>
            </form>
          )}

          {items.length > 0 && !hasOneEuroItem && (
            <div className="space-y-3 pt-1">
              {/* High-Conversion 2-Jacken Kombi-Vorteil (-20 EUR) & 1-Click Cross-Sell */}
              <div className="p-3.5 border-2 border-black bg-white space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-black flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-black" />
                    <span>
                      {bundleDiscountEur > 0
                        ? '✓ 20,00 € KOMBI-RABATT AKTIVIERT!'
                        : '2-JACKEN KOMBI: NOCH 1 HINZUFÜGEN = -20 €'}
                    </span>
                  </span>
                </div>

                {bundleDiscountEur === 0 && recommendedUpsell && (
                  <div className="flex items-center justify-between gap-2.5 pt-1 border-t border-black/10">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={optimizeProductImage(recommendedUpsell.colors[0]?.image ?? '', 180)}
                        alt={recommendedUpsell.name}
                        referrerPolicy="no-referrer"
                        className="w-11 h-11 object-contain border border-black/10 bg-white shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-[12.5px] font-bold text-black truncate">
                          {recommendedUpsell.name}
                        </p>
                        <p className="text-[11px] font-medium text-black/70 truncate">
                          {recommendedUpsell.colors[0]?.name} · nur{' '}
                          {recommendedUpsell.priceEur - 20},00 € mit Kombi-Rabatt
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onQuickAddUpsell(recommendedUpsell)}
                      className="h-8 px-2.5 bg-black text-white text-[11px] font-bold uppercase tracking-[0.05em] hover:bg-neutral-800 shrink-0 cursor-pointer"
                    >
                      + 20 € sparen
                    </button>
                  </div>
                )}

                {/* 1-Click Leather Care Kit Upsell */}
                <label className="flex items-center justify-between gap-2 pt-2 border-t border-black/10 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={upsellCareKit}
                      onChange={(e) => setUpsellCareKit(e.target.checked)}
                      className="w-4 h-4 accent-black cursor-pointer"
                    />
                    <div>
                      <p className="text-[12px] font-bold text-black flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        <span>Argan-Bienenwachs Lederpflege-Set</span>
                      </p>
                      <p className="text-[11px] text-black/65">
                        Schützt seltene Farben vor Regen & Schnee (100 ml)
                      </p>
                    </div>
                  </div>
                  <span className="text-[12.5px] font-bold text-black tabular-nums shrink-0">
                    +14,00 €
                  </span>
                </label>
              </div>

              {/* Voucher Code Field with live validation */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-black/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Gutscheincode eingeben"
                      value={voucherInput}
                      onChange={(e) => {
                        const v = e.target.value.toUpperCase().replace(/\s+/g, '');
                        setVoucherInput(v);
                        onVoucherChange(v);
                      }}
                      className={`w-full h-10 pl-8 pr-3 rounded-lg bg-white font-mono text-[12.5px] font-bold uppercase text-black outline-none transition-colors ${
                        voucherValid
                          ? 'border-2 border-[#16A34A] bg-[#F0FDF4]'
                          : voucherInvalidTyped
                          ? 'border-2 border-[#DC2626]'
                          : 'border border-black/25 focus:border-black'
                      }`}
                    />
                  </div>
                  {voucherValid ? (
                    <span className="h-10 px-3 rounded-lg bg-[#16A34A] text-white text-[11.5px] font-bold uppercase inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      -10 €
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setVoucherInput('TREUE10');
                        onVoucherChange('TREUE10');
                      }}
                      className="h-10 px-3 rounded-lg bg-black text-white text-[11.5px] font-bold uppercase hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      Einlösen
                    </button>
                  )}
                </div>
                {voucherInvalidTyped && (
                  <p className="text-[11.5px] font-semibold text-[#DC2626]">
                    Code ungültig. Probiere <strong>TREUE10</strong> oder <strong>BLACKFRIDAY</strong>.
                  </p>
                )}
                {!voucherValid && !voucherInvalidTyped && (
                  <div className="flex flex-wrap gap-1.5">
                    {['TREUE10', 'BLACKFRIDAY'].map((code) => (
                      <button
                        key={code}
                        type="button"
                        onClick={() => {
                          setVoucherInput(code);
                          onVoucherChange(code);
                        }}
                        className="px-2 py-1 rounded-md border border-dashed border-[#DC2626] bg-[#FEF2F2] text-[#B91C1C] font-mono text-[11px] font-bold cursor-pointer hover:bg-[#FEE2E2]"
                      >
                        {code} · -10 €
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[13px] text-red-800">
              {errorMsg}
            </div>
          )}

          {stripeRedirectUrl && (
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#000000]/15 space-y-2.5">
              <p className="text-[13px] font-medium text-[#000000]">
                Deine sichere Stripe-Zahlungsseite ist bereit:
              </p>
              <a
                href={stripeRedirectUrl}
                target="_top"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#000000] underline"
              >
                <span>Jetzt bei Stripe Checkout bezahlen</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {previewInfo && (
            <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#000000]/15 space-y-3">
              <p className="text-[12.5px] leading-[1.5] text-[#4A4A4A]">
                {previewInfo.message}
              </p>
              <button
                type="button"
                disabled={completingPreview}
                onClick={handleCompletePreview}
                className="w-full h-10 px-4 rounded-lg bg-[#000000] text-white text-[13px] font-medium hover:bg-[#1A1A1A] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {completingPreview
                    ? 'Bestellung & Telegram/n8n werden gesendet…'
                    : 'Bestellung abschließen (n8n, Telegram & Pixel prüfen)'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-black/10 bg-[#FAFAFA] space-y-2.5">
            {/* Free shipping progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[12px] font-bold text-[#166534]">
                <span>🚚 Gratis DHL Express Versand freigeschaltet</span>
                <span>0,00 €</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#DCFCE7] overflow-hidden">
                <div
                  className="h-full bg-[#16A34A] rounded-full"
                  style={{ width: `${freeShippingProgress}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-[13px] text-black/70 tabular-nums">
              <span>Zwischensumme</span>
              <span>{(itemsSubtotalEur + careKitEur).toFixed(2).replace('.', ',')} €</span>
            </div>

            {bundleDiscountEur > 0 && (
              <div className="flex items-center justify-between text-[13px] font-bold text-[#16A34A] tabular-nums">
                <span>2-Jacken Kombi-Vorteil</span>
                <span>-{bundleDiscountEur},00 €</span>
              </div>
            )}

            {voucherDiscountEur > 0 && (
              <div className="flex items-center justify-between text-[13px] font-bold text-[#16A34A] tabular-nums">
                <span>Gutschein ({cleanVoucher})</span>
                <span>-{voucherDiscountEur},00 €</span>
              </div>
            )}

            <div className="flex items-end justify-between pt-1.5 border-t border-black/10 tabular-nums">
              <div>
                <span className="block text-[16px] font-bold text-black">Gesamt</span>
                <span className="text-[11px] text-black/55">inkl. MwSt. · Versand 0 €</span>
              </div>
              <div className="text-right">
                {totalSavingsEur > 0 && (
                  <span className="block text-[12px] text-black/45 line-through">
                    {(finalTotalEur + totalSavingsEur).toFixed(2).replace('.', ',')} €
                  </span>
                )}
                <span className="text-[22px] font-bold text-black">
                  {finalTotalEur.toFixed(2).replace('.', ',')} €
                </span>
              </div>
            </div>

            {totalSavingsEur > 0 && (
              <div className="text-center text-[12px] font-bold text-white bg-[#DC2626] rounded-md py-1.5">
                🔥 Du sparst heute {totalSavingsEur.toFixed(2).replace('.', ',')} €
              </div>
            )}

            <button
              type="submit"
              form="stripe-checkout-form"
              disabled={loading}
              className="w-full h-[54px] px-5 rounded-xl bg-[#16A34A] text-white text-[15px] font-bold uppercase tracking-[0.05em] hover:bg-[#15803D] active:scale-[0.99] disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2 cursor-pointer shadow-[0_6px_18px_rgba(22,163,74,0.35)]"
            >
              <Lock className="w-4 h-4" />
              <span>
                {loading
                  ? 'Sichere Kasse wird geöffnet…'
                  : `Jetzt sicher bezahlen · ${finalTotalEur.toFixed(2).replace('.', ',')} €`}
              </span>
            </button>

            <PaymentLogos size="sm" showSecurityNote />

            <p className="text-[11px] font-medium text-center text-black/65 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-black" />
              <span>14 Tage Rückgabe · Klarna: Jetzt kaufen, später bezahlen</span>
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
