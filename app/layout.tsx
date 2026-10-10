import type { Metadata } from 'next';
import Script from 'next/script';
import { Hind_Siliguri, Instrument_Serif, Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ConsentBanner } from '@/components/ConsentBanner';
import { MetaPixel } from '@/components/MetaPixel';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_URL,
  organizationJsonLd,
  serializeJsonLd,
} from '@/lib/seo';
import { getSiteBranding } from '@/lib/content';

const sans = Inter({
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

const baseMetadata: Metadata = {
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
  // Canonical stays `/` (that is where the history and inbound links live), but the `en`
  // hreflang MUST point at `/en`, not `/`. Google requires a distinct URL per hreflang
  // entry — `en: '/'` collides with `x-default: '/'`, leaving only two unique targets
  // and failing reciprocity. `/en` exists precisely so hreflang has an explicit `en`.
  alternates: {
    canonical: '/',
    languages: { en: '/en', bn: '/bn', 'x-default': '/' },
  },
  // Ported from the Vite index.html head so the App Router shell carries the same
  // share-card meta the prototype shipped.
  openGraph: {
    type: 'website',
    // L-36: byte-identical with the canonical `/` (which resolves to SITE_URL + '/').
    url: `${SITE_URL}/`,
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
    'theme-color': '#090A0F',
  },
};

/**
 * v3 polish: the uploaded favicon (`site_settings.favicon_url`, Admin →
 * Settings) is served as the page icon. The read is cached (`branding` tag,
 * invalidated on settings save); when empty no `icons` entry is emitted and
 * the browser falls back to its default. Static-safe: at build time the
 * direct-URL fallback feeds the prerender, exactly like the landing content.
 */
export async function generateMetadata(): Promise<Metadata> {
  const branding = await getSiteBranding();
  const favicon = branding?.faviconUrl.trim() ?? '';
  if (!favicon) return baseMetadata;
  return { ...baseMetadata, icons: { icon: favicon } };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // H-15: `lang` is `en` here — the root layout is shared by both locales and reading
  // the locale per request (headers) would force every route dynamic, killing the §8
  // static strategy (Decision 4 outranks). `/bn` correctness comes from three
  // static-safe layers: the `content-language` meta + per-locale OG locale emitted by
  // `app/[locale]/layout.tsx` (SSR, per-path), and the client `document.lang` sync in
  // `LocaleThemeProvider` (post-hydration). `suppressHydrationWarning` absorbs the
  // resulting `lang` mismatch without console noise.
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`scroll-smooth ${sans.variable} ${serif.variable} ${bangla.variable} ${mono.variable}`}
    >
      <body className="bg-white text-slate-900 antialiased selection:bg-indigo-600 selection:text-white dark:bg-[#090A0F] dark:text-slate-100">
        {/* v3: apply the stored theme (default dark) before paint so the first
            frame matches the design instead of flashing light. */}
        <Script
          id="ecomate-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('ecomate-theme')!=='light'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`,
          }}
        />
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
        {/* Consent gate (Task 20 §5): renders above the mobile sticky CTA, keyboard
            accessible, no tracking fires until Accept-all. */}
        <ConsentBanner />
        {children}
      </body>
    </html>
  );
}
