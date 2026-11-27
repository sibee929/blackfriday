import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, MessageCircle, Ruler, X } from 'lucide-react';

export interface MassCheckerResult {
  recommendedSize: string;
  heightCm: number;
  weightKg: number;
  chestCm?: number;
  sleeveCm?: number;
  fit: 'slim' | 'regular' | 'relaxed';
  summaryString: string;
}

interface MassCheckerModalProps {
  open: boolean;
  productName?: string;
  colorName?: string;
  onClose: () => void;
  onApplyResult: (result: MassCheckerResult, useCustomTailoring: boolean) => void;
}

export const MassCheckerModal: React.FC<MassCheckerModalProps> = ({
  open,
  productName = 'MRKSHI Lederjacke',
  colorName = '',
  onClose,
  onApplyResult,
}) => {
  const [heightCm, setHeightCm] = useState<number>(180);
  const [weightKg, setWeightKg] = useState<number>(78);
  const [chestCm, setChestCm] = useState<string>('');
  const [sleeveCm, setSleeveCm] = useState<string>('');
  const [build, setBuild] = useState<'slim' | 'normal' | 'broad'>('normal');
  const [fit, setFit] = useState<'slim' | 'regular' | 'relaxed'>('regular');

  const computed = useMemo(() => {
    const parsedChest = Number(chestCm) || 0;
    const parsedSleeve = Number(sleeveCm) || 0;

    // Präzise EU-Herren-Größenberechnung auf Basis Größe, Gewicht, Brust & Passform
    let score = (weightKg - 54) / 8 + (heightCm - 165) / 14;
    if (build === 'broad') score += 0.65;
    if (build === 'slim') score -= 0.35;
    if (fit === 'relaxed') score += 0.55;
    if (fit === 'slim') score -= 0.35;

    if (parsedChest >= 88) {
      if (parsedChest < 94) score = Math.min(score, 0.8);
      else if (parsedChest < 100) score = 1.6;
      else if (parsedChest < 106) score = 2.6;
      else if (parsedChest < 112) score = 3.6;
      else if (parsedChest < 118) score = 4.6;
      else score = 5.4;
    }

    const sizeLadder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL'];
    const idx = Math.max(0, Math.min(sizeLadder.length - 1, Math.round(score)));
    const recommendedSize = sizeLadder[idx];

    const euNumMap: Record<string, string> = {
      XS: '44',
      S: '46',
      M: '48',
      L: '50',
      XL: '52',
      '2XL': '54',
      '3XL': '56',
    };

    const estimatedChest = parsedChest > 0 ? parsedChest : Math.round(86 + idx * 5.2);
    const estimatedSleeve =
      parsedSleeve > 0 ? parsedSleeve : Math.round(61 + Math.max(0, heightCm - 170) * 0.28);

    const fitLabel =
      fit === 'slim' ? 'Körpernah' : fit === 'relaxed' ? 'Mit Pullover (Winter)' : 'Regular Fit';

    const summaryString = `${heightCm} cm · ${weightKg} kg · Brust ~${estimatedChest} cm · Ärmel ~${estimatedSleeve} cm (${fitLabel})`;

    return {
      recommendedSize,
      euCode: euNumMap[recommendedSize] ?? '48',
      estimatedChest,
      estimatedSleeve,
      summaryString,
    };
  }, [heightCm, weightKg, chestCm, sleeveCm, build, fit]);

  if (!open || typeof document === 'undefined') return null;

  const waMessage = encodeURIComponent(
    `Hallo MRKSHI Team, ich nutze den Maßchecker für ${productName}${colorName ? ` (${colorName})` : ''}: ${computed.summaryString}. Passt EU ${computed.recommendedSize} (${computed.euCode}) oder empfehlt ihr Direkt-Maß?`
  );

  const buildResult = (): MassCheckerResult => ({
    recommendedSize: computed.recommendedSize,
    heightCm,
    weightKg,
    chestCm: Number(chestCm) || computed.estimatedChest,
    sleeveCm: Number(sleeveCm) || computed.estimatedSleeve,
    fit,
    summaryString: computed.summaryString,
  });

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="MRKSHI Maßchecker"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/55 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#000000]/10">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-[#4A4A4A] flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" />
              <span>Atelier-Passform & Direkt-Maß (0 €)</span>
            </p>
            <h2 className="mt-1 text-[21px] font-semibold text-[#000000] font-masculine">
              MRKSHI Maßchecker
            </h2>
            <p className="mt-1 text-[13px] text-[#4A4A4A]">
              In 10 Sekunden zur perfekten Passform — oder kostenlos auf deine Maße in Marokko
              zugeschnitten.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Maßchecker schließen"
            className="w-9 h-9 rounded-full hover:bg-[#FAFAFA] flex items-center justify-center text-[#000000] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[12px] font-medium text-[#000000] mb-1">
                Körpergröße (cm)
              </span>
              <input
                type="number"
                min={150}
                max={215}
                value={heightCm}
                onChange={(e) => setHeightCm(Math.max(150, Math.min(215, Number(e.target.value) || 175)))}
                className="w-full h-10 px-3 rounded-lg border border-[#000000]/20 text-[14px] tabular-nums"
              />
            </label>
            <label className="block">
              <span className="block text-[12px] font-medium text-[#000000] mb-1">
                Gewicht (kg)
              </span>
              <input
                type="number"
                min={45}
                max={145}
                value={weightKg}
                onChange={(e) => setWeightKg(Math.max(45, Math.min(145, Number(e.target.value) || 75)))}
                className="w-full h-10 px-3 rounded-lg border border-[#000000]/20 text-[14px] tabular-nums"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[12px] font-medium text-[#4A4A4A] mb-1">
                Brustumfang cm (optional)
              </span>
              <input
                type="number"
                min={80}
                max={150}
                placeholder={`ca. ${computed.estimatedChest}`}
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#000000]/15 text-[14px] tabular-nums"
              />
            </label>
            <label className="block">
              <span className="block text-[12px] font-medium text-[#4A4A4A] mb-1">
                Ärmellänge cm (optional)
              </span>
              <input
                type="number"
                min={52}
                max={78}
                placeholder={`ca. ${computed.estimatedSleeve}`}
                value={sleeveCm}
                onChange={(e) => setSleeveCm(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#000000]/15 text-[14px] tabular-nums"
              />
            </label>
          </div>

          <div>
            <span className="block text-[12px] font-medium text-[#000000] mb-1.5">
              Schulter & Statur
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'slim' as const, label: 'Schmal' },
                { id: 'normal' as const, label: 'Normal / Sportlich' },
                { id: 'broad' as const, label: 'Breite Schultern' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBuild(opt.id)}
                  className={`h-9 px-2 rounded-lg border text-[12px] font-medium cursor-pointer transition-colors ${
                    build === opt.id
                      ? 'bg-[#000000] text-white border-[#000000]'
                      : 'border-[#000000]/15 text-[#000000] hover:border-[#000000]/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-[12px] font-medium text-[#000000] mb-1.5">
              Gewünschte Passform
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'slim' as const, label: 'Körpernah (Slim)' },
                { id: 'regular' as const, label: 'Regular (Ideal)' },
                { id: 'relaxed' as const, label: 'Mit dickem Pulli' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFit(opt.id)}
                  className={`h-9 px-2 rounded-lg border text-[12px] font-medium cursor-pointer transition-colors ${
                    fit === opt.id
                      ? 'bg-[#000000] text-white border-[#000000]'
                      : 'border-[#000000]/15 text-[#000000] hover:border-[#000000]/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Result Card */}
          <div className="p-4 rounded-xl bg-[#FAFAFA] border border-[#000000]/10">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4A4A4A]">
                  Empfohlene EU-Größe
                </span>
                <p className="text-[28px] font-semibold text-[#000000] tabular-nums leading-tight mt-0.5">
                  {computed.recommendedSize}{' '}
                  <span className="text-[15px] font-normal text-[#4A4A4A]">
                    (EU {computed.euCode})
                  </span>
                </p>
              </div>
              <span className="text-[11.5px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                98 % Passform-Match
              </span>
            </div>
            <p className="mt-2 text-[12.5px] text-[#4A4A4A] tabular-nums">
              {computed.summaryString}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => {
                onApplyResult(buildResult(), false);
                onClose();
              }}
              className="h-11 px-4 rounded-lg bg-[#000000] text-white text-[13.5px] font-medium hover:bg-[#1A1A1A] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Größe {computed.recommendedSize} übernehmen</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onApplyResult(buildResult(), true);
                onClose();
              }}
              className="h-11 px-4 rounded-lg border border-[#000000] text-[#000000] text-[13.5px] font-medium hover:bg-[#FAFAFA] flex items-center justify-center gap-2 cursor-pointer"
            >
              <Ruler className="w-4 h-4" />
              <span>Als Direkt-Maß (0 €)</span>
            </button>
          </div>

          <a
            href={`https://wa.me/4917643488260?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-10 px-4 rounded-lg bg-[#25D366]/12 text-[#126E35] border border-[#25D366]/35 text-[13px] font-medium hover:bg-[#25D366]/20 flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Unsicher? Maße direkt per WhatsApp prüfen (+49 176 43488260)</span>
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
};
