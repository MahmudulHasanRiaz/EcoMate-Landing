import type { Metadata } from 'next';
import { Hind_Siliguri, Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { MetaPixel } from '@/components/MetaPixel';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  organizationJsonLd,
  serializeJsonLd,
} from '@/lib/seo';

const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});
const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
});
const bangla = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-bangla',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  // Every relative URL below (canonical, OG, sitemap) resolves against this origin, so the
  // deployed host and the declared canonical can never drift apart.
  metadataBase: new URL(SITE_URL),
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // The site-wide default. `/en` and `/bn` override `alternates` with their own per-locale
  // canonical plus the full hreflang set (`lib/seo.ts` → `localeAlternates`); this block is
  // what the unprefixed `/` and every non-localized route inherits.
  //
  // `en` points at `/` rather than `/en` because `/` is the canonical English URL — the one
  // with the history and the inbound links. `/en` exists so `/bn` has a sibling in the same
  // dynamic segment and so hreflang has an explicit `en` to advertise.
  alternates: {
    canonical: '/',
    languages: { en: '/', bn: '/bn', 'x-default': '/' },
  },
  // Ported from the Vite index.html head so the App Router shell carries the same
  // share-card meta the prototype shipped.
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'en_US',
    alternateLocale: ['bn_BD'],
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      'Manage orders, multi-warehouse inventory, smart barcode packing, couriers, POS showrooms, double-entry finance and marketing from one central control center.',
    // No site-wide `images` entry: there is no default OG asset in `public/`, and a URL that
    // 404s renders a broken share card, which is worse than no card. The per-post and
    // per-case-study pages resolve `images` from the row's own `featuredImageUrl` through
    // `ogImageUrl()`, which resolves relative values against `SITE_URL` and omits the field
    // entirely when the column is empty.
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  other: {
    'theme-color': '#F2F3F9',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${sans.variable} ${serif.variable} ${bangla.variable} ${mono.variable}`}
    >
      <body className="bg-[#F2F3F9] text-slate-900 antialiased selection:bg-indigo-600 selection:text-white dark:bg-[#07080E] dark:text-slate-100">
        {/* Site-wide Organization node. Rendered server-side so no JavaScript is needed for
            crawlers to see it; `serializeJsonLd` escapes `<` so content can never break out
            of the script element. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(organizationJsonLd()) }}
        />
        {/* Meta browser pixel. Renders nothing until NEXT_PUBLIC_META_PIXEL_ID is set, and
            the Lead event it fires shares its event_id with the server-side CAPI call so
            Meta deduplicates the pair (Task 13). */}
        <MetaPixel />
        {children}
      </body>
    </html>
  );
}
