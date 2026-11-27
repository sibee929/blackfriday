import { createFileRoute, Link } from "@tanstack/react-router";
import { LANDINGS } from "@/lib/landing";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Header } from "@/components/Header";
import { FilterSheet } from "@/components/FilterSheet";
import { PRICE_NOTE } from "@/lib/legal";
import { TrustStrip } from "@/components/TrustExperience";
import { ReviewsSection } from "@/components/ReviewsSection";
import { ExternalTrustLinks } from "@/components/ExternalTrustLinks";
import { ProductGrid, ProductGridSkeleton } from "@/components/ProductGrid";
import { Button } from "@/components/ui/button";
import { CATEGORIES, GENDERS } from "@/lib/catalog";
import { X } from "lucide-react";

import { archiveQuery, type ArchiveFilters } from "@/lib/catalog";
import { absoluteImageUrl, SITE_ORIGIN } from "@/lib/product-images";
import { getPublicTrustData } from "@/lib/trust.functions";

type Search = ArchiveFilters;

const TITLE = "Lederjacken, Ledermäntel & Ledertaschen | MRKSHI";
const DESCRIPTION =
  "MRKSHI Lederjacken, Ledermäntel, Ledertaschen und Lederröcke aus echtem Leder – gefertigt in Marokko, in außergewöhnlichen Farben. Lieferung in 7–14 Werktagen.";

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "@id": `${SITE_ORIGIN}/#organization`,
  name: "MRKSHI",
  url: `${SITE_ORIGIN}/`,
  description:
    "MRKSHI is a direct-to-consumer leather fashion brand offering premium leather jackets, coats, bags and accessories made in Morocco.",
  email: "service@mrkshi.com",
  telephone: "+4917643488260",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Alte Dorfstraße 3a",
    postalCode: "61137",
    addressLocality: "Schöneck",
    addressCountry: "DE",
  },
  hasMerchantReturnPolicy: {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "DE",
    returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
    merchantReturnDays: 14,
    returnMethod: "https://schema.org/ReturnByMail",
    returnFees: "https://schema.org/ReturnShippingFees",
    customerRemorseReturnLabelSource: "https://schema.org/ReturnLabelCustomerResponsibility",
    customerRemorseReturnFees: "https://schema.org/ReturnShippingFees",
    merchantReturnLink: `${SITE_ORIGIN}/returns`,
    returnPolicyCountry: "DE",
  },
} as Record<string, unknown>;

const SHIPPING_LD = {
  "@type": "OfferShippingDetails",
  shippingDestination: {
    "@type": "DefinedRegion",
    addressCountry: "DE",
  },
  shippingRate: {
    "@type": "MonetaryAmount",
    value: "0",
    currency: "EUR",
  },
};

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    who: typeof search['who'] === "string" ? search['who'] : undefined,
    category: typeof search['category'] === "string" ? search['category'] : undefined,
    color: typeof search['color'] === "string" ? search['color'] : undefined,
    material: typeof search['material'] === "string" ? search['material'] : undefined,
    instock: search['instock'] === true || search['instock'] === "true" ? true : undefined,
    q: typeof search['q'] === "string" ? search['q'] : undefined,
  }),
  loaderDeps: ({ search }) => search,
  // Server-rendered so crawlers receive real product links in the initial HTML.
  loader: async ({ context, deps }) => {
    const [products, trust] = await Promise.all([
      context.queryClient.ensureQueryData(archiveQuery(deps)),
      getPublicTrustData(),
    ]);
    const first = products.find((p) => p.front_image)?.front_image ?? null;
    return { ogImage: first ? absoluteImageUrl(first) : null, trust };
  },
  head: ({ loaderData }) => {
    const ogImage = (loaderData as { ogImage: string | null } | undefined)?.ogImage ?? null;
    const meta = [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "MRKSHI" },
      { property: "og:url", content: `${SITE_ORIGIN}/` },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ];
    if (ogImage) {
      meta.push({ property: "og:image", content: ogImage });
      meta.push({ name: "twitter:image", content: ogImage });
    }
    return {
      meta,
      links: [{ rel: "canonical", href: `${SITE_ORIGIN}/` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            ...ORGANIZATION_LD,
            makesOffer: {
              "@type": "Offer",
              shippingDetails: SHIPPING_LD,
            },
          }),
        },
      ],
    };
  },
  component: Archive,
  pendingComponent: ArchivePending,
});

const FILTER_LABELS: Partial<Record<keyof ArchiveFilters, string>> = {
  who: "Auswahl",
  category: "Produkt",
  color: "Farbe",
  material: "Material",
  instock: "Auf Lager",
  q: "Suche",
};

function ArchivePending() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-[1600px] px-4 lg:px-8">
        <div className="h-36 border-b border-border" />
        <ProductGridSkeleton />
      </main>
    </>
  );
}

function Archive() {
  const { trust } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [filterOpen, setFilterOpen] = useState(false);
  const { data: products } = useSuspenseQuery(archiveQuery(search));

  const activeCount = Object.values(search).filter(Boolean).length;

  const updateSearch = (next: ArchiveFilters) => {
    void navigate({ to: "/", search: next, resetScroll: false });
  };

  const valueLabel = (key: keyof ArchiveFilters, value: ArchiveFilters[keyof ArchiveFilters]) => {
    if (key === "who") return GENDERS.find((item) => item.value === value)?.label ?? String(value);
    if (key === "category") return CATEGORIES.find((item) => item.value === value)?.label ?? String(value);
    if (key === "instock") return "Auf Lager";
    return String(value);
  };

  return (
    <>
      <Header />
      <main className="font-shop-body">
        <TrustStrip settings={trust.settings} />
        <div className="mx-auto w-full max-w-[1600px] px-4 lg:px-8">
          <h1 className="pt-5 font-shop-display text-sm font-semibold text-foreground sm:text-base">
            MRKSHI — Lederarchiv für Lederjacken, Ledermäntel &amp; Ledertaschen
          </h1>

          <section aria-label="Kollektion auswählen" className="border-b border-border pt-4 pb-3 sm:pt-6">
            <div className="grid grid-cols-2 border border-border bg-surface p-1 sm:max-w-md">
              {[
                { label: "Damen", value: "womens" },
                { label: "Herren", value: "mens" },
              ].map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant="ghost"
                  onClick={() => updateSearch({ ...search, who: option.value })}
                  aria-pressed={search.who === option.value}
                  className={`h-11 rounded-none font-shop-display text-xs font-extrabold uppercase shadow-none hover:bg-background ${
                    search.who === option.value ? "bg-background text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {option.label}
                </Button>
              ))}
            </div>
            <Button
              type="button"
              variant="link"
              onClick={() => updateSearch({ ...search, who: "kids" })}
              className={`mt-1 h-11 rounded-none px-0 font-shop-body text-[11px] font-semibold uppercase ${search.who === "kids" ? "text-foreground underline" : "text-muted-foreground"}`}
            >
              Kinder
            </Button>
          </section>

          <nav aria-label="Produktkategorien" className="scrollbar-none flex gap-2 overflow-x-auto border-b border-border py-3">
            {CATEGORIES.map((category) => (
              <Button
                key={category.value}
                type="button"
                variant={search.category === category.value ? "default" : "outline"}
                onClick={() => updateSearch({ ...search, category: search.category === category.value ? undefined : category.value })}
                className="h-11 shrink-0 rounded-none px-4 font-shop-body text-[10px] font-semibold uppercase shadow-none"
              >
                {category.label}
              </Button>
            ))}
          </nav>

          <div className="sticky top-15 z-30 border-b border-border bg-background/95 py-2 backdrop-blur-sm">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <Button
                type="button"
                onClick={() => setFilterOpen(true)}
                variant="outline"
                className="h-11 min-w-0 justify-start rounded-none border-foreground px-4 font-shop-display text-[11px] font-extrabold uppercase shadow-none"
                aria-haspopup="dialog"
              >
                Filter &amp; Sortieren {activeCount ? `(${activeCount})` : ""}
              </Button>
              <span className="shrink-0 font-shop-body text-[10px] font-semibold uppercase text-muted-foreground">
                {products.length} Produkte
              </span>
            </div>

            {activeCount ? (
              <div className="scrollbar-none mt-2 flex gap-2 overflow-x-auto" aria-label="Aktive Filter">
                {(Object.entries(search) as Array<[keyof ArchiveFilters, ArchiveFilters[keyof ArchiveFilters]]>)
                  .filter((entry): entry is [keyof ArchiveFilters, NonNullable<ArchiveFilters[keyof ArchiveFilters]>] => Boolean(entry[1]))
                  .map(([key, value]) => (
                    <Button
                      key={key}
                      type="button"
                      variant="secondary"
                      onClick={() => updateSearch({ ...search, [key]: undefined })}
                      className="h-11 shrink-0 rounded-none px-3 font-shop-body text-[10px] font-semibold uppercase shadow-none"
                      aria-label={`${FILTER_LABELS[key] ?? key}: ${valueLabel(key, value)} entfernen`}
                    >
                      {FILTER_LABELS[key]}: {valueLabel(key, value)}
                      <X aria-hidden="true" />
                    </Button>
                  ))}
              </div>
            ) : null}
          </div>

          <ProductGrid products={products} />
        </div>

        <section aria-label="Preisinformation" className="mx-auto max-w-[1600px] px-4 pt-10 lg:px-8">
          <p className="label-xs mt-3 text-muted-foreground">{PRICE_NOTE}.</p>
        </section>

        <ReviewsSection reviews={trust.reviews} averageRating={trust.averageRating} reviewCount={trust.reviewCount} />
        <ExternalTrustLinks settings={trust.settings} />



        <section aria-labelledby="kategorien" className="mx-auto max-w-[1600px] px-4 pt-10 lg:px-8">
          <h2 id="kategorien" className="label-xs text-muted-foreground">
            Kategorien
          </h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {LANDINGS.map((l) => (
              <li key={l.slug}>
                <Link
                  to="/$slug"
                  params={{ slug: l.slug }}
                  className="label-xs underline underline-offset-4"
                >
                  {l.h1}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="brand-entity"
          className="mx-auto max-w-2xl px-4 pt-8 pb-16 text-center"
        >
          <h2 id="brand-entity" className="label-xs tracking-[0.3em]">
            MRKSHI — LEATHER IN COLOUR
          </h2>
          <p className="label-xs mt-5 leading-6 text-muted-foreground">
            MRKSHI is a direct-to-consumer leather fashion brand creating premium leather
            jackets, coats, bags and accessories in an exceptional range of colours.
          </p>
          <p className="label-xs mt-4 leading-6 text-muted-foreground">
            Our leather pieces are made in Morocco and sold directly through MRKSHI. For
            customers in Germany, we ship tracked with DHL Express and offer personal sizing
            support, with returns handled through our German return location.
          </p>
          <p className="label-xs mt-4 text-muted-foreground">Wear the feeling.</p>
        </section>

        <nav aria-labelledby="leder-entdecken" className="border-t border-border px-4 py-16">
          <div className="mx-auto max-w-2xl">
            <h2 id="leder-entdecken" className="label-xs text-muted-foreground">
              Leder entdecken
            </h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              <li>
                <Link
                  to="/$slug"
                  params={{ slug: "lederjacken-herren" }}
                  className="group flex items-center justify-between border-b border-border pb-3 transition-colors hover:border-foreground"
                >
                  <span className="label-sm">Lederjacken Herren</span>
                  <span aria-hidden="true" className="text-muted-foreground transition-colors group-hover:text-foreground">→</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/$slug"
                  params={{ slug: "lederjacken-damen" }}
                  className="group flex items-center justify-between border-b border-border pb-3 transition-colors hover:border-foreground"
                >
                  <span className="label-sm">Lederjacken Damen</span>
                  <span aria-hidden="true" className="text-muted-foreground transition-colors group-hover:text-foreground">→</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/$slug"
                  params={{ slug: "ledermaentel-herren" }}
                  className="group flex items-center justify-between border-b border-border pb-3 transition-colors hover:border-foreground"
                >
                  <span className="label-sm">Ledermäntel Herren</span>
                  <span aria-hidden="true" className="text-muted-foreground transition-colors group-hover:text-foreground">→</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/leder-aus-marokko"
                  className="group flex items-center justify-between border-b border-border pb-3 transition-colors hover:border-foreground"
                >
                  <span className="label-sm">Leder aus Marokko</span>
                  <span aria-hidden="true" className="text-muted-foreground transition-colors group-hover:text-foreground">→</span>
                </Link>
              </li>
              <li className="sm:col-span-2">
                <Link
                  to="/ratgeber/lederjacke-qualitaet-erkennen"
                  className="group flex items-center justify-between border-b border-border pb-3 transition-colors hover:border-foreground"
                >
                  <span className="label-sm">Lederqualität erkennen</span>
                  <span aria-hidden="true" className="text-muted-foreground transition-colors group-hover:text-foreground">→</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>
      </main>

      <FilterSheet
        open={filterOpen}
        filters={search}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setFilterOpen(false);
          updateSearch(next);
        }}
      />
    </>
  );
}
