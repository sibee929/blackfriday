import React from 'react';
import { X } from 'lucide-react';

export type LegalDocType = 'datenschutz' | 'impressum' | 'agb' | 'widerruf' | 'versand' | null;

interface AtelierFooterProps {
  pixelConfigured: boolean;
  activeLegalDialog: LegalDocType;
  onChangeLegalDialog: (doc: LegalDocType) => void;
  onOpenPixelSettings: () => void;
  onOpenAdminPanel: () => void;
}

export const AtelierSectionAndFooter: React.FC<AtelierFooterProps> = ({
  pixelConfigured,
  activeLegalDialog,
  onChangeLegalDialog,
  onOpenPixelSettings,
  onOpenAdminPanel,
}) => {
  return (
    <>
      {/* Editorial Atelier Provenance & GEO FAQ Summary — Pure White + Sharp Black */}
      <section
        id="atelier"
        className="py-16 md:py-20 px-5 md:px-10 bg-white text-black border-t border-black/15"
      >
        <div className="max-w-[1220px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
          <div>
            <p className="text-[11.5px] font-bold tracking-[0.18em] uppercase text-black/60">
              01. DIREKT AB MAROKKO · -50 % OFF
            </p>
            <h3 className="mt-2 font-masculine text-[24px] font-bold text-black">
              FESTPREIS 177,00 € STATT 354,00 €.
            </h3>
            <p className="mt-2.5 text-[14.5px] font-medium leading-[1.6] text-black/75">
              Im Einzelhandel zahlen Männer 354 € bis 550 € für Zwischenhändler und Ladenmieten.
              MRKSHI fertigt alle 9 Modelle im eigenen Familienatelier in Marrakesch und liefert
              kostenlos bis an deine Haustür.
            </p>
          </div>

          <div>
            <p className="text-[11.5px] font-bold tracking-[0.18em] uppercase text-black/60">
              02. 100 % NATURLEDER
            </p>
            <h3 className="mt-2 font-masculine text-[24px] font-bold text-black">
              FARBAUSWAHL STATT EINHEITS-SCHWARZ.
            </h3>
            <p className="mt-2.5 text-[14.5px] font-medium leading-[1.6] text-black/75">
              Ob Bleu Petrol, Bordeaux, Blue Majorelle, Rouge Hermès, Mint, Tabak oder Olive — wir
              färben vollnarbiges Lamm-Nappa, Rindleder und Wildleder in seltenen Tönen, für die man
              sofort Komplimente bekommt.
            </p>
          </div>

          <div>
            <p className="text-[11.5px] font-bold tracking-[0.18em] uppercase text-black/60">
              03. MASSCHECKER & 14 TAGE RÜCKGABE
            </p>
            <h3 className="mt-2 font-masculine text-[24px] font-bold text-black">
              PERFEKTE PASSFORM S–3XL OHNE RISIKO.
            </h3>
            <p className="mt-2.5 text-[14.5px] font-medium leading-[1.6] text-black/75">
              Jede Größe S–3XL plus kostenloses Direkt-Maß (vor & nach Bezahlung) zum selben Preis
              von 177,00 €. Volles 14-tägiges Rückgaberecht über unseren deutschen Standort in
              61137 Schöneck.
            </p>
          </div>
        </div>
      </section>

      {/* Clean White & Black High-Contrast Footer */}
      <footer className="py-10 px-5 md:px-10 bg-white text-black border-t-2 border-black text-[13px]">
        <div className="max-w-[1220px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <span className="font-brand text-[20px] text-black">MRKSHI</span>
            <span className="ml-3 font-medium text-black/75">
              © {new Date().getFullYear()} www.mrkshi.com · Alte Dorfstraße 3a, 61137 Schöneck (DE)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-5 font-semibold">
            <button
              type="button"
              onClick={() => onChangeLegalDialog('versand')}
              className="text-black/80 hover:text-black transition-colors cursor-pointer"
            >
              Versand & Zoll
            </button>
            <button
              type="button"
              onClick={() => onChangeLegalDialog('widerruf')}
              className="text-black/80 hover:text-black transition-colors cursor-pointer"
            >
              14 Tage Widerruf
            </button>
            <button
              type="button"
              onClick={() => onChangeLegalDialog('datenschutz')}
              className="text-black/80 hover:text-black transition-colors cursor-pointer"
            >
              Datenschutz (DSGVO)
            </button>
            <button
              type="button"
              onClick={() => onChangeLegalDialog('agb')}
              className="text-black/80 hover:text-black transition-colors cursor-pointer"
            >
              AGB
            </button>
            <button
              type="button"
              onClick={() => onChangeLegalDialog('impressum')}
              className="text-black/80 hover:text-black transition-colors cursor-pointer"
            >
              Impressum
            </button>
            <button
              type="button"
              onClick={onOpenAdminPanel}
              className="text-black/55 hover:text-black transition-colors cursor-pointer"
            >
              Verkäufer-Login
            </button>
          </div>
        </div>
      </footer>

      {activeLegalDialog && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => onChangeLegalDialog(null)}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white border-2 border-black p-6 shadow-2xl text-black"
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/15">
              <h3 className="font-masculine text-[22px] font-bold text-black">
                {activeLegalDialog === 'versand' && 'VERSAND, ZOLL & 14 TAGE RÜCKGABE'}
                {activeLegalDialog === 'impressum' && 'IMPRESSUM & KONTAKT (WWW.MRKSHI.COM)'}
                {activeLegalDialog === 'datenschutz' && 'DATENSCHUTZERKLÄRUNG (DSGVO / TTDSG)'}
                {activeLegalDialog === 'widerruf' && 'WIDERRUFSBELEHRUNG (14 TAGE DEUTSCHLAND)'}
                {activeLegalDialog === 'agb' && 'ALLGEMEINE GESCHÄFTSBEDINGUNGEN (AGB)'}
              </h3>
              <button
                type="button"
                onClick={() => onChangeLegalDialog(null)}
                className="w-8 h-8 bg-black text-white flex items-center justify-center cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 text-[13.5px] font-medium leading-[1.65] text-black/85 space-y-3">
              {activeLegalDialog === 'versand' && (
                <>
                  <p>
                    Alle Bestellungen (alle 9 Herren-Lederjacken einheitlich 177,00 € inkl. MwSt.)
                    werden versichert per <strong>DHL Express</strong> kostenlos bis vor deine
                    Haustür nach Deutschland, Österreich und in die Schweiz geliefert (Lieferzeit:
                    7–14 Werktage, Versandkosten: 0,00 €).
                  </p>
                  <p>
                    Rücksendungen innerhalb von 14 Tagen erfolgen unkompliziert über unsere deutsche
                    Rücksendeadresse: <strong>Alte Dorfstraße 3a, 61137 Schöneck</strong>.
                  </p>
                </>
              )}

              {activeLegalDialog === 'impressum' && (
                <>
                  <p>
                    <strong>MRKSHI Lederatelier</strong> · Alte Dorfstraße 3a · 61137 Schöneck ·
                    Deutschland
                  </p>
                  <p>
                    E-Mail: <span className="font-mono">service@mrkshi.com</span> · WhatsApp &
                    Telefon: <span className="font-mono">+49 176 43488260</span>
                  </p>
                  <p>Domain: https://www.mrkshi.com</p>
                  <p>
                    Plattform der EU-Kommission zur Online-Streitbeilegung:
                    https://ec.europa.eu/consumers/odr/. Wir sind weder verpflichtet noch bereit, an
                    einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
                    teilzunehmen.
                  </p>
                </>
              )}

              {activeLegalDialog === 'widerruf' && (
                <>
                  <p>
                    <strong>Widerrufsrecht:</strong> Sie haben das Recht, binnen vierzehn Tagen
                    ohne Angabe von Gründen diesen Vertrag zu widerrufen (verlängert für
                    Weihnachtsgeschenke bis 15. Januar). Die Widerrufsfrist beträgt vierzehn Tage
                    ab dem Tag, an dem Sie oder ein benannter Dritter die Ware in Besitz genommen
                    haben.
                  </p>
                  <p>
                    Um Ihr Widerrufsrecht auszuüben, informieren Sie uns bitte per E-Mail an{' '}
                    <strong>service@mrkshi.com</strong> oder WhatsApp (+49 176 43488260) und senden
                    die ungetragene Jacke an: MRKSHI, Alte Dorfstraße 3a, 61137 Schöneck.
                  </p>
                  <p>
                    <strong>Hinweis zu Sondermaßen:</strong> Gesetzliche Ausnahme nach § 312g Abs.
                    2 Nr. 1 BGB bei individuell nach Kundenwunsch zugeschnittenen Maßen; bei
                    Standardgrößen (S–3XL) gilt volles 14-tägiges Rückgaberecht.
                  </p>
                </>
              )}

              {activeLegalDialog === 'agb' && (
                <>
                  <p>
                    <strong>1. Geltungsbereich:</strong> Diese AGB gelten für alle Bestellungen über
                    www.mrkshi.com durch Verbraucher in Deutschland, Österreich und der Schweiz.
                  </p>
                  <p>
                    <strong>2. Preise & Zahlung:</strong> Alle Preise verstehen sich in Euro inkl.
                    gesetzlicher Mehrwertsteuer und kostenlosem DHL-Expressversand. Die Zahlung
                    erfolgt sicher über Stripe (Apple Pay, Klarna, PayPal, Google Pay, Kreditkarte,
                    SEPA).
                  </p>
                  <p>
                    <strong>3. Naturprodukt Echtleder:</strong> Jede Jacke besteht aus 100 %
                    echtem Naturleder (Nappa, Rind- oder Wildleder). Leichte Unterschiede in Narbung
                    und Farbaufnahme unterstreichen die Handarbeit aus Marokko.
                  </p>
                </>
              )}

              {activeLegalDialog === 'datenschutz' && (
                <>
                  <p>
                    <strong>1. Verantwortlicher (Art. 4 Nr. 7 DSGVO):</strong> MRKSHI Lederatelier,
                    Alte Dorfstraße 3a, 61137 Schöneck, E-Mail: service@mrkshi.com, Tel: +49 176
                    43488260.
                  </p>
                  <p>
                    <strong>2. Zahlungsabwicklung (Stripe, Klarna, Apple Pay, PayPal):</strong>{' '}
                    Zur Durchführung Ihrer Bestellung übermitteln wir Zahlungsdaten an Stripe
                    Payments Europe, Ltd. (1 Grand Canal Street Lower, Dublin, Irland) auf Grundlage
                    von Art. 6 Abs. 1 lit. b DSGVO.
                  </p>
                  <p>
                    <strong>3. Hosting & Sicherheit (Cloudflare):</strong> Unsere Domain
                    www.mrkshi.com nutzt Cloudflare als CDN/Proxy zum Schutz vor Angriffen (Art. 6
                    Abs. 1 lit. f DSGVO).
                  </p>
                  <p>
                    <strong>4. WhatsApp & Maßchecker:</strong> Ihre WhatsApp-Nummer und Körpermaße
                    verarbeiten wir ausschließlich zur Passform-Abstimmung und Versandbenachrichtigung
                    (Art. 6 Abs. 1 lit. b DSGVO).
                  </p>
                  <p>
                    <strong>5. Meta Pixel & Newsletter:</strong>{' '}
                    Marketing-Tracking (Meta Pixel, Conversions API, GA4) wird erst nach Ihrer
                    ausdrücklichen Einwilligung über den Cookie-Banner (Art. 6 Abs. 1 lit. a DSGVO,
                    § 25 TDDDG) geladen. Newsletter-Daten dienen nur dem Versand von Gutscheinen
                    (TREUE10) und neuen Leder-Drops und können jederzeit widerrufen werden.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
