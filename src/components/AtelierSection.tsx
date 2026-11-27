import React from 'react';
import { X } from 'lucide-react';

export type LegalDocType = 'datenschutz' | 'impressum' | 'agb' | 'widerruf' | 'versand' | null;

export interface ExporterPublicInfo {
  companyName: string;
  legalFormNote: string;
  street: string;
  cityZip: string;
  country: string;
  iceNumber: string;
  email: string;
  phoneMorocco: string;
  phoneSupportDe: string;
  returnNameDe: string;
  returnStreetDe: string;
  returnCityZipDe: string;
  defaultHsCode: string;
  defaultIncoterms: 'DDP' | 'DAP';
}

const DEFAULT_EXPORTER_INFO: ExporterPublicInfo = {
  companyName: 'MRKSHI Atelier',
  legalFormNote: 'SARL en cours de constitution',
  street: 'Quartier Maarif, Casablanca',
  cityZip: '20100 Casablanca',
  country: 'Morocco',
  iceNumber: 'En cours d’attribution',
  email: 'service@mrkshi.com',
  phoneMorocco: '',
  phoneSupportDe: '+49 176 43488260',
  returnNameDe: 'MRKSHI',
  returnStreetDe: 'Alte Dorfstraße 3a',
  returnCityZipDe: '61137 Schöneck',
  defaultHsCode: '42031000',
  defaultIncoterms: 'DDP',
};

interface AtelierFooterProps {
  pixelConfigured: boolean;
  activeLegalDialog: LegalDocType;
  exporterInfo?: ExporterPublicInfo | null;
  onChangeLegalDialog: (doc: LegalDocType) => void;
  onOpenPixelSettings: () => void;
  onOpenAdminPanel: () => void;
}

export const AtelierSectionAndFooter: React.FC<AtelierFooterProps> = ({
  activeLegalDialog,
  exporterInfo,
  onChangeLegalDialog,
  onOpenAdminPanel,
}) => {
  const exp = exporterInfo ?? DEFAULT_EXPORTER_INFO;
  const sellerTitle = exp.legalFormNote
    ? `${exp.companyName} (${exp.legalFormNote})`
    : exp.companyName;
  const deReturnLine = `${exp.returnNameDe}, ${exp.returnStreetDe}, ${exp.returnCityZipDe}`;
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
              © {new Date().getFullYear()} www.mrkshi.com · Casablanca × Deutschland (Retouren:{' '}
              {exp.returnCityZipDe})
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
                    Alle Bestellungen (Herren-Lederjacken ab 177,00 € inkl. Abgaben) werden
                    versichert per <strong>DHL Express / Kurier</strong> kostenlos (0,00 €
                    Versandkosten) bis vor deine Haustür nach Deutschland, Österreich und in die
                    Schweiz geliefert (Lieferzeit: 7–14 Werktage).
                  </p>
                  <p>
                    <strong>Zoll & Präferenzursprung Marokko:</strong> Unsere Jacken werden in
                    Marokko aus 100 % Naturleder gefertigt (HS-Code {exp.defaultHsCode}, Origin:
                    Morocco, Präferenzzollsatz 0 % gem. EU-Marokko-Abkommen). Der Versand erfolgt im
                    Modus <strong>Incoterms: {exp.defaultIncoterms}</strong>.
                  </p>
                  <p>
                    <strong>Deutsche Rücksendeadresse (14 Tage bei Standardgrößen):</strong>{' '}
                    Rücksendungen innerhalb Deutschlands erfolgen unkompliziert an unsere deutsche
                    Retouren-Annahmestelle: <strong>{deReturnLine}</strong> (kein teurer
                    Rückversand nach Marokko nötig).
                  </p>
                </>
              )}

              {activeLegalDialog === 'impressum' && (
                <>
                  <p>
                    <strong>Verkäufer & Betreiber (Exporter):</strong>
                    <br />
                    {sellerTitle}
                    <br />
                    {exp.street} · {exp.cityZip} · {exp.country}
                    {exp.iceNumber ? (
                      <>
                        <br />
                        ICE: <span className="font-mono">{exp.iceNumber}</span>
                      </>
                    ) : null}
                  </p>
                  <p>
                    <strong>Kontakt & Kundenservice (Deutsch / Englisch / Französisch):</strong>
                    <br />
                    E-Mail: <span className="font-mono">{exp.email}</span> · WhatsApp & Support:{' '}
                    <span className="font-mono">{exp.phoneSupportDe}</span>
                  </p>
                  <p>
                    <strong>Rücksendeadresse & Logistik-Annahmestelle Deutschland:</strong>
                    <br />
                    {deReturnLine}, Deutschland <em>(ausschließlich Retouren-Empfangsstelle)</em>
                  </p>
                  <p>Domain: https://www.mrkshi.com</p>
                  <p>
                    Wir sind weder verpflichtet noch bereit, an einem Streitbeilegungsverfahren vor
                    einer Verbraucherschlichtungsstelle teilzunehmen.
                  </p>
                </>
              )}

              {activeLegalDialog === 'widerruf' && (
                <>
                  <p>
                    <strong>Widerrufsrecht (14 Tage bei Standardgrößen):</strong> Sie haben das
                    Recht, binnen vierzehn Tagen ab Erhalt der Ware ohne Angabe von Gründen diesen
                    Vertrag bei Standardgrößen (S–3XL) zu widerrufen.
                  </p>
                  <p>
                    Um Ihr Widerrufsrecht auszuüben, informieren Sie uns bitte per E-Mail an{' '}
                    <strong>{exp.email}</strong> oder WhatsApp ({exp.phoneSupportDe}) und senden die
                    ungetragene Jacke innerhalb Deutschlands an unsere Retouren-Empfangsstelle:{' '}
                    <strong>{deReturnLine}</strong>.
                  </p>
                  <p>
                    <strong>Ausschluss bei Maßanfertigungen:</strong> Kein Widerrufsrecht besteht
                    bei individuellen Maßanfertigungen / Sondermaßen, die nach Kundenspezifikation
                    angefertigt werden (<strong>§ 312g Abs. 2 Nr. 1 BGB</strong>).
                  </p>
                </>
              )}

              {activeLegalDialog === 'agb' && (
                <>
                  <p>
                    <strong>1. Vertragspartner & Geltungsbereich:</strong> Vertragspartner für alle
                    Bestellungen über www.mrkshi.com ist <strong>{sellerTitle}</strong> ({exp.street}
                    , {exp.cityZip}, {exp.country}). Für Rücksendungen innerhalb Deutschlands steht
                    unsere Retouren-Annahmestelle ({deReturnLine}) bereit.
                  </p>
                  <p>
                    <strong>2. Preise, Zoll & Zahlung:</strong> Alle ausgewiesenen Endpreise
                    verstehen sich in Euro inklusive kostenlosem Kurierversand (0,00 €). Die
                    Zahlung erfolgt verschlüsselt über Stripe (Apple Pay, Google Pay, Klarna,
                    PayPal, Visa, Mastercard).
                  </p>
                  <p>
                    <strong>3. Naturprodukt Echtleder & Maßanfertigung:</strong> Jede Jacke besteht
                    aus 100 % echtem marokkanischem Naturleder (Lamm-Nappa, Rind- oder Wildleder).
                    Bei Standardgrößen (S–3XL) gilt ein 14-tägiges Widerrufsrecht ab Erhalt der
                    Ware; individuelle Maßanfertigungen sind gem. § 312g Abs. 2 Nr. 1 BGB vom
                    Widerruf ausgeschlossen.
                  </p>
                </>
              )}

              {activeLegalDialog === 'datenschutz' && (
                <>
                  <p>
                    <strong>1. Verantwortlicher (Art. 4 Nr. 7 DSGVO):</strong> {sellerTitle},{' '}
                    {exp.street}, {exp.cityZip}, {exp.country}, E-Mail: {exp.email}, Kundenservice &
                    Ansprechpartner DE: {deReturnLine}, Tel: {exp.phoneSupportDe}.
                  </p>
                  <p>
                    <strong>2. Zahlungsabwicklung (Stripe, Klarna, Apple Pay, PayPal):</strong>{' '}
                    Zur Durchführung Ihrer Bestellung übermitteln wir Zahlungsdaten an Stripe
                    Payments Europe, Ltd. (1 Grand Canal Street Lower, Dublin, Irland) auf Grundlage
                    von Art. 6 Abs. 1 lit. b DSGVO.
                  </p>
                  <p>
                    <strong>3. Versand, Zollabwicklung & Hosting (Cloudflare):</strong> Zur
                    Zustellung und Verzollung (Commercial Invoice / DHL / UPS) werden Name,
                    Lieferadresse und Telefonnummer an den Versanddienstleister übermittelt (Art. 6
                    Abs. 1 lit. b DSGVO). Unsere Domain www.mrkshi.com nutzt Cloudflare als
                    CDN/Proxy zum Schutz vor Angriffen (Art. 6 Abs. 1 lit. f DSGVO).
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
