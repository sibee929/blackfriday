import React from 'react';

interface PaymentLogosProps {
  size?: 'sm' | 'md';
  showSecurityNote?: boolean;
  className?: string;
}

export const PaymentLogos: React.FC<PaymentLogosProps> = ({
  size = 'md',
  showSecurityNote = false,
  className = '',
}) => {
  const h = size === 'sm' ? 'h-[26px]' : 'h-[30px]';

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {/* Apple Pay */}
        <span
          title="Apple Pay"
          aria-label="Apple Pay"
          className={`${h} inline-flex items-center justify-center px-2.5 rounded-[5px] bg-[#000000] border border-black text-white shadow-2xs`}
        >
          <svg
            viewBox="0 0 64 26"
            className="h-[15px] w-auto"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M13.25 6.42c.68-.83 1.14-1.97 1.01-3.12-.98.04-2.18.66-2.88 1.48-.62.72-1.17 1.88-1.02 3 .1.01 2.21.14 2.89-1.36zm1.01 1.62c-1.59-.1-2.96.9-3.72.9-.77 0-1.93-.85-3.19-.83-1.64.02-3.16.95-4 2.43-1.72 2.97-.44 7.36 1.22 9.77.81 1.18 1.78 2.5 3.06 2.45 1.22-.05 1.7-.79 3.18-.79 1.48 0 1.91.79 3.2.76 1.33-.02 2.16-1.19 2.97-2.38.94-1.36 1.32-2.69 1.34-2.76-.03-.01-2.57-.99-2.6-3.92-.02-2.45 2-3.63 2.09-3.69-1.14-1.68-2.92-1.86-3.55-1.94z" />
            <text
              x="22"
              y="19.5"
              fontFamily="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif"
              fontSize="15.5"
              fontWeight="600"
              letterSpacing="-0.3"
              fill="#FFFFFF"
            >
              Pay
            </text>
          </svg>
        </span>

        {/* Google Pay */}
        <span
          title="Google Pay"
          aria-label="Google Pay"
          className={`${h} inline-flex items-center justify-center px-2.5 rounded-[5px] bg-white border border-[#D4D4D8] shadow-2xs`}
        >
          <svg viewBox="0 0 72 26" className="h-[15px] w-auto" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 13.2c0-.64-.06-1.25-.16-1.84H9.18v3.48h4.74a4.05 4.05 0 0 1-1.76 2.66v2.21h2.85c1.67-1.54 2.63-3.8 2.63-6.51z"
            />
            <path
              fill="#34A853"
              d="M9.18 21.82c2.38 0 4.38-.79 5.84-2.14l-2.85-2.21c-.79.53-1.8.84-2.99.84-2.3 0-4.25-1.55-4.95-3.64H1.28v2.28a8.82 8.82 0 0 0 7.9 4.87z"
            />
            <path
              fill="#FBBC05"
              d="M4.23 14.67a5.3 5.3 0 0 1 0-3.34V9.05H1.28a8.82 8.82 0 0 0 0 7.9l2.95-2.28z"
            />
            <path
              fill="#EA4335"
              d="M9.18 7.69c1.3 0 2.46.45 3.38 1.32l2.53-2.53C13.55 5.04 11.56 4.18 9.18 4.18a8.82 8.82 0 0 0-7.9 4.87l2.95 2.28c.7-2.09 2.65-3.64 4.95-3.64z"
            />
            <text
              x="23.5"
              y="18.6"
              fontFamily="'Product Sans', 'Roboto', 'Segoe UI', Arial, sans-serif"
              fontSize="14.5"
              fontWeight="600"
              fill="#3C4043"
            >
              Pay
            </text>
          </svg>
        </span>

        {/* VISA */}
        <span
          title="Visa"
          aria-label="Visa"
          className={`${h} inline-flex items-center justify-center px-2.5 rounded-[5px] bg-white border border-[#D4D4D8] shadow-2xs`}
        >
          <svg viewBox="0 0 56 20" className="h-[13px] w-auto" aria-hidden="true">
            <text
              x="28"
              y="16"
              textAnchor="middle"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="18"
              fontWeight="900"
              fontStyle="italic"
              letterSpacing="0.5"
              fill="#1434CB"
            >
              VISA
            </text>
          </svg>
        </span>

        {/* Mastercard */}
        <span
          title="Mastercard"
          aria-label="Mastercard"
          className={`${h} inline-flex items-center justify-center px-2.5 rounded-[5px] bg-white border border-[#D4D4D8] shadow-2xs`}
        >
          <svg viewBox="0 0 42 26" className="h-[17px] w-auto" aria-hidden="true">
            <circle cx="15" cy="13" r="9.5" fill="#EB001B" />
            <circle cx="27" cy="13" r="9.5" fill="#F79E1B" />
            <path
              d="M21 5.52a9.5 9.5 0 0 0 0 14.96 9.5 9.5 0 0 0 0-14.96z"
              fill="#FF5F00"
            />
          </svg>
        </span>

        {/* Klarna */}
        <span
          title="Klarna"
          aria-label="Klarna"
          className={`${h} inline-flex items-center justify-center px-2.5 rounded-[5px] bg-[#FFB3C7] border border-[#F497B0] shadow-2xs`}
        >
          <svg viewBox="0 0 60 20" className="h-[13px] w-auto" aria-hidden="true">
            <text
              x="30"
              y="15"
              textAnchor="middle"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="14.5"
              fontWeight="900"
              letterSpacing="-0.3"
              fill="#0A0B09"
            >
              Klarna.
            </text>
          </svg>
        </span>

        {/* PayPal */}
        <span
          title="PayPal"
          aria-label="PayPal"
          className={`${h} inline-flex items-center justify-center px-2.5 rounded-[5px] bg-white border border-[#D4D4D8] shadow-2xs`}
        >
          <svg viewBox="0 0 68 20" className="h-[13.5px] w-auto" aria-hidden="true">
            <text
              x="34"
              y="15"
              textAnchor="middle"
              fontFamily="Verdana, Arial, sans-serif"
              fontSize="13.5"
              fontWeight="800"
              fontStyle="italic"
            >
              <tspan fill="#003087">Pay</tspan>
              <tspan fill="#0079C1">Pal</tspan>
            </text>
          </svg>
        </span>

        {/* SEPA */}
        <span
          title="SEPA Lastschrift"
          aria-label="SEPA"
          className={`${h} inline-flex items-center justify-center px-2 rounded-[5px] bg-white border border-[#D4D4D8] shadow-2xs`}
        >
          <svg viewBox="0 0 46 20" className="h-[12px] w-auto" aria-hidden="true">
            <text
              x="23"
              y="14.5"
              textAnchor="middle"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="12.5"
              fontWeight="800"
              letterSpacing="0.8"
              fill="#1E3A8A"
            >
              SEPA
            </text>
          </svg>
        </span>
      </div>

      {showSecurityNote && (
        <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-[#166534]">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0]">
            <svg viewBox="0 0 16 16" className="w-3 h-3 fill-[#059669]" aria-hidden="true">
              <path d="M8 1L2 3.5V7.5C2 11.1 4.6 14.3 8 15C11.4 14.3 14 11.1 14 7.5V3.5L8 1ZM7.1 10.6L4.6 8.1L5.7 7L7.1 8.4L10.4 5.1L11.5 6.2L7.1 10.6Z" />
            </svg>
            <span>256-Bit SSL · Stripe Käuferschutz</span>
          </span>
        </div>
      )}
    </div>
  );
};
