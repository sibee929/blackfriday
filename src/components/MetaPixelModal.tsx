import React, { useEffect, useState } from 'react';
import { Check, Send, X } from 'lucide-react';
import {
  isValidGa4Id,
  isValidGtmId,
  isValidPixelId,
  isValidTiktokId,
  MetaPixelConfig,
  PixelEventLogEntry,
  subscribePixelEvents,
} from '../lib/metaPixel';

interface MetaPixelModalProps {
  open: boolean;
  config: MetaPixelConfig;
  onClose: () => void;
  onSaveConfig: (nextConfig: MetaPixelConfig) => Promise<void>;
  onSendTestEvent: () => void;
}

export const MetaPixelModal: React.FC<MetaPixelModalProps> = ({
  open,
  config,
  onClose,
  onSaveConfig,
  onSendTestEvent,
}) => {
  const [draft, setDraft] = useState<MetaPixelConfig>(config);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<PixelEventLogEntry[]>([]);

  useEffect(() => {
    setDraft(config);
  }, [config, open]);

  useEffect(() => {
    return subscribePixelEvents(setLogs);
  }, []);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSavedNotice(null);

    const cleanId = draft.pixelId.trim();
    const cleanGa4 = (draft.ga4MeasurementId ?? '').trim().toUpperCase();
    const cleanGtm = (draft.gtmId ?? '').trim().toUpperCase();
    const cleanTiktok = (draft.tiktokPixelId ?? '').trim();

    if (cleanId !== '' && !isValidPixelId(cleanId)) {
      setErrorMsg('Meta Pixel ID muss aus 10 bis 20 Ziffern bestehen (z. B. 123456789012345).');
      return;
    }
    if (cleanGa4 !== '' && !isValidGa4Id(cleanGa4)) {
      setErrorMsg('GA4 Measurement ID muss mit G- beginnen (z. B. G-XXXXXXXXXX).');
      return;
    }
    if (cleanGtm !== '' && !isValidGtmId(cleanGtm)) {
      setErrorMsg('Google Tag ID muss mit GTM- oder AW- beginnen.');
      return;
    }
    if (cleanTiktok !== '' && !isValidTiktokId(cleanTiktok)) {
      setErrorMsg('TikTok Pixel ID Format ungültig (10–28 alphanumerische Zeichen).');
      return;
    }

    setSaving(true);
    try {
      await onSaveConfig({
        ...draft,
        pixelId: cleanId,
        enabled: draft.enabled && cleanId !== '',
        ga4MeasurementId: cleanGa4,
        gtmId: cleanGtm,
        tiktokPixelId: cleanTiktok,
      });
      setSavedNotice('Alle Pixel- & Analytics-Einstellungen gespeichert & aktiv.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Conversion-Pixel & Analytics-Suite"
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-6 md:p-7"
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#000000]/10">
          <div>
            <p className="text-[11.5px] font-semibold tracking-[0.14em] uppercase text-[#4A4A4A]">
              Werbeanzeigen, Retargeting & Conversion API
            </p>
            <h2 className="mt-1 text-[22px] font-semibold text-[#000000] font-masculine">
              Pixel & Analytics Einstellungen
            </h2>
            <p className="mt-1 text-[13.5px] text-[#4A4A4A]">
              Konfiguriere Meta Pixel (+ serverseitige CAPI), Google Analytics 4, Google Ads / GTM
              und TikTok Pixel für gezielte Kampagnen auf <span className="font-mono text-[12px]">mrkshi.com</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="w-9 h-9 rounded-full hover:bg-[#FAFAFA] flex items-center justify-center text-[#000000] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-5">
          {/* Meta Pixel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-[12.5px] font-semibold text-[#000000] mb-1.5">
                Meta Pixel ID
              </span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="z. B. 104938271645012"
                value={draft.pixelId}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    pixelId: e.target.value,
                    enabled: e.target.value.trim().length > 0 ? true : prev.enabled,
                  }))
                }
                className="w-full h-10 px-3.5 rounded-lg border border-[#000000]/20 font-mono text-[13.5px] text-[#000000]"
              />
            </label>

            <label className="block">
              <span className="block text-[12.5px] font-semibold text-[#000000] mb-1.5">
                Meta Test Event Code (optional)
              </span>
              <input
                type="text"
                placeholder="z. B. TEST48291"
                value={draft.testEventCode}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, testEventCode: e.target.value }))
                }
                className="w-full h-10 px-3.5 rounded-lg border border-[#000000]/20 font-mono text-[13.5px] text-[#000000]"
              />
            </label>
          </div>

          {/* GA4 + GTM/Google Ads + TikTok Pixel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <label className="block">
              <span className="block text-[12px] font-semibold text-[#000000] mb-1.5">
                Google Analytics 4
              </span>
              <input
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={draft.ga4MeasurementId ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, ga4MeasurementId: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-lg border border-[#000000]/20 font-mono text-[13px] text-[#000000]"
              />
            </label>

            <label className="block">
              <span className="block text-[12px] font-semibold text-[#000000] mb-1.5">
                GTM / Google Ads ID
              </span>
              <input
                type="text"
                placeholder="GTM-... oder AW-..."
                value={draft.gtmId ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, gtmId: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-lg border border-[#000000]/20 font-mono text-[13px] text-[#000000]"
              />
            </label>

            <label className="block">
              <span className="block text-[12px] font-semibold text-[#000000] mb-1.5">
                TikTok Pixel ID
              </span>
              <input
                type="text"
                placeholder="z. B. CXXXXXXXXXXXX"
                value={draft.tiktokPixelId ?? ''}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, tiktokPixelId: e.target.value }))
                }
                className="w-full h-10 px-3 rounded-lg border border-[#000000]/20 font-mono text-[13px] text-[#000000]"
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-[#FAFAFA]">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="w-4 h-4 accent-[#000000] cursor-pointer"
              />
              <div>
                <span className="block text-[13.5px] font-semibold text-[#000000]">
                  Conversion-Tracking aktivieren
                </span>
                <span className="text-[12px] text-[#4A4A4A]">
                  Sendet Standard-Events inkl. <span className="font-mono">leather_color</span> an
                  alle konfigurierten Pixel.
                </span>
              </div>
            </label>
            <span
              className={`text-[11.5px] font-medium px-2.5 py-1 rounded ${
                config.capiConfigured
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-white text-[#4A4A4A] border border-[#000000]/10'
              }`}
            >
              Meta CAPI Server: {config.capiConfigured ? 'Verbunden' : 'Optional via Secret'}
            </span>
          </div>

          {/* Standard Events Matrix */}
          <div>
            <span className="block text-[12.5px] font-semibold text-[#000000] mb-2.5">
              Aktive Conversion-Events
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                {
                  key: 'trackViewContent' as const,
                  title: 'ViewContent / view_item',
                  desc: 'Modell, EUR-Preis & gewählte Lederfarbe',
                },
                {
                  key: 'trackAddToCart' as const,
                  title: 'AddToCart / add_to_cart',
                  desc: 'Warenkorbwert (max. 177 EUR) & Größe',
                },
                {
                  key: 'trackInitiateCheckout' as const,
                  title: 'InitiateCheckout / begin_checkout',
                  desc: 'Beim Start des Stripe Express Checkouts',
                },
                {
                  key: 'trackPurchase' as const,
                  title: 'Purchase / CompletePayment',
                  desc: 'Nach bestätigter Zahlung (Browser + Server CAPI)',
                },
              ].map((ev) => (
                <label
                  key={ev.key}
                  className="flex items-start gap-2.5 p-3 rounded-xl border border-[#000000]/12 cursor-pointer hover:bg-[#FAFAFA]/60"
                >
                  <input
                    type="checkbox"
                    checked={draft[ev.key]}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [ev.key]: e.target.checked }))
                    }
                    className="mt-0.5 w-4 h-4 accent-[#000000] cursor-pointer"
                  />
                  <div>
                    <span className="block text-[12.5px] font-semibold font-mono text-[#000000]">
                      {ev.title}
                    </span>
                    <span className="text-[11.5px] text-[#4A4A4A]">{ev.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {errorMsg && <p className="text-[13px] text-red-700">{errorMsg}</p>}
          {savedNotice && (
            <p className="text-[13px] text-emerald-800 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>{savedNotice}</span>
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={onSendTestEvent}
              className="inline-flex items-center gap-2 h-10 px-4 border border-[#000000]/25 rounded-lg text-[13px] font-medium text-[#000000] hover:border-[#000000] cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Test-Event (ViewContent) feuern</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="h-10 px-5 rounded-lg bg-[#000000] text-white text-[13.5px] font-medium hover:bg-[#1A1A1A] disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'Speichern…' : 'Tracking speichern'}
            </button>
          </div>
        </form>

        {/* Live Fired Events Inspector */}
        <div className="mt-6 pt-5 border-t border-[#000000]/10">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[13px] font-semibold text-[#000000]">
              Erfasste Events dieser Sitzung ({logs.length})
            </h3>
            <span className="text-[11.5px] text-[#4A4A4A]">Neueste zuerst</span>
          </div>

          {logs.length === 0 ? (
            <p className="text-[12.5px] text-[#4A4A4A] py-3">
              Noch keine Events ausgelöst. Wechsle eine Lederfarbe oder lege eine Jacke in den
              Warenkorb.
            </p>
          ) : (
            <div className="max-h-44 overflow-y-auto space-y-2 pr-1">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="p-2.5 rounded-lg bg-[#FAFAFA] text-[12px] font-mono flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-[#000000]">
                      {entry.eventName}
                    </span>
                    <span className="text-[#4A4A4A]">
                      {entry.timestamp} ·{' '}
                      {entry.platforms.length > 0
                        ? entry.platforms.join(', ')
                        : 'lokal protokolliert'}
                    </span>
                  </div>
                  <code className="text-[11px] text-[#4A4A4A] break-all">
                    {JSON.stringify(entry.payload)}
                  </code>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
