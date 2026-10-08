/**
 * Locale-scoped shell for `/en/*` and `/bn/*` (Task 15 §2, Task 23 Option A).
 *
 * This layout owns the locale *contract* — which locales exist, and what a given locale's
 * URL set looks like — plus the locale *data*: it awaits `params`, reads
 * `getLandingContent(locale)` + both menus for that locale through the single `'use cache'`
 * boundary (`lib/content.ts`), assembles via `lib/merge.ts`, and seeds the client
 * `LocaleThemeProvider`. The marketing page (`app/[locale]/page.tsx` → `LandingShell`)
 * renders Header / sections / Footer / MobileStickyBar from that context.
 *
 * The provider renders NO DOM of its own, so non-marketing routes under `[locale]` (blog
 * articles, case studies, privacy/terms) render exactly what they render today — no
 * marketing chrome is added to them. `/admin` is outside this layout entirely.
 *
 * `generateStaticParams` lives here rather than in the page because it has to cover every
 * route under `[locale]`: without `en` in the list, `/bn` would be the only prerendered
 * locale and the hreflang set would advertise a URL that is generated on demand.
 *
 * Metadata note: this returns `alternates` only. The root layout's `title`, `description` and
 * OpenGraph block are inherited, and a `title.template` here would override the admin-set
 * `site_settings.seo_title` that the root layout already reads.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LocaleThemeProvider } from '@/components/shell/LocaleThemeProvider';
import { getLandingContent, getMenu, getPricingPlans, getTestimonials } from '@/lib/content';
import { assembleLandingContent } from '@/lib/merge';
import { LOCALES, isLocale } from '@/lib/locales';
import { localeAlternates, ogLocale } from '@/lib/seo';
import { timed } from '@/lib/slowlog';

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  // Unknown locale -> this layout's `notFound()` below fires, but `generateMetadata` runs
  // before/independently of it, so it must also refuse rather than emit hreflang for a URL
  // that 404s. Advertising a language alternate that does not resolve is the exact failure
  // the old root-layout comment warned about. `noindex` covers the cold-hit window where
  // the not-found UI serves with a 200 status before the 404 result caches (Phase 3a note
  // on the slug pages): crawlers drop it instead of indexing a junk URL.
  if (!isLocale(locale)) return { robots: { index: false, follow: true } };

  // H-15 (static-safe half) + M-23: per-locale OG locale + content-language, emitted at
  // build time per path. The `<html lang>` attribute itself stays `en` in the shared
  // root layout (reading it per request would de-static every route — see root layout);
  // the client provider syncs `document.lang` post-hydration.
  return {
    alternates: localeAlternates(locale),
    openGraph: { locale: ogLocale(locale) },
    other: { 'content-language': locale },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // `/fr`, `/api`-shaped typos and any future unknown segment all 404 here rather than
  // rendering an English page under a Bangla-looking URL. Next calls this on the dynamic
  // (non-prerendered) path, so an unknown locale still costs nothing at build time.
  if (!isLocale(locale)) notFound();

  // Sequential, not `Promise.all` — same reasoning as `LandingPage`: Next 16's Cache
  // Components tracks a dynamic API access through the `await` that reaches it, and joined
  // branches can read as uncached data and refuse the prerender. Cache reads follow the
  // first as microtasks, not queries, so this costs nothing.
  const sections = await timed(getLandingContent(locale), `layout:content:${locale}`, 10000, { locale });
  const mainMenu = await timed(getMenu('main', locale), `layout:menu-main:${locale}`, 10000, { locale });
  const footerMenu = await timed(getMenu('footer', locale), `layout:menu-footer:${locale}`, 10000, { locale });
  const pricing = await timed(getPricingPlans(), `layout:pricing:${locale}`, 10000, { locale });
  // 2c: published DB testimonials seed the proof section (null → static fallback copy).
  const testimonials = await timed(getTestimonials(), 'layout:testimonials', 10000, { locale });

  return (
    <LocaleThemeProvider
      initialLocale={locale}
      initialContent={assembleLandingContent(locale, sections)}
      initialMenu={mainMenu}
      initialFooterMenu={footerMenu}
      initialTestimonials={testimonials}
      initialIsPricingVisible={pricing?.isPricingVisible ?? true}
    >
      {children}
    </LocaleThemeProvider>
  );
}
