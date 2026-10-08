/**
 * The composed marketing page, as a server component.
 *
 * The unprefixed `/` entry point (`app/page.tsx`, serving `NEXT_PUBLIC_DEFAULT_LOCALE`)
 * keeps its self-contained render: it reads the DB-backed content through the cached
 * `lib/content.ts` helpers, seeds `LocaleThemeProvider`, and renders `LandingShell`
 * from that context. The locale layout (`app/[locale]/layout.tsx`) does the same seeding
 * for `/en` and `/bn`, so all three entries share one context-reading composition.
 *
 * Every read goes through `lib/content.ts`, the single `'use cache'` boundary, and every one
 * of them degrades to `null` when the database is unreachable. `null` is not an error state
 * in this component:
 *  - no sections → the static `landingContent` copy in `src/data/landingContent.ts`;
 *  - no menu rows → the hardcoded `content.header.nav` the header already renders.
 *
 * So an unseeded database, a DB outage and a build with no `DIRECT_URL` all produce the same
 * complete page. Nothing here can blank a section.
 */
import { LocaleThemeProvider } from '@/components/shell/LocaleThemeProvider';
import { getLandingContent, getMenu, getPricingPlans, getTestimonials } from '@/lib/content';
import { assembleLandingContent } from '@/lib/merge';
import type { Locale } from '@/src/types/landing';
import { LandingShell } from './LandingShell';

export async function LandingPage({ locale }: { locale: Locale }) {
  // Sequential, not `Promise.all`.
  //
  // Next 16's Cache Components tracks a dynamic API access through the `await` that reaches
  // it, and it does not follow several branches of a `Promise.all` the same way: with three
  // cached reads joined in one expression, the prerender pass reports the page as having read
  // uncached data and refuses to emit `/`. Awaiting one at a time keeps the chain observable
  // to the tracker, and costs nothing here — all four are cache reads, so the ones that follow
  // the first are microtasks, not queries.
  const sections = await getLandingContent(locale);
  const mainMenu = await getMenu('main', locale);
  const footerMenu = await getMenu('footer', locale);
  const pricing = await getPricingPlans();
  // 2c: published DB testimonials seed the proof section (null → static fallback copy).
  const testimonials = await getTestimonials();

  return (
    <LocaleThemeProvider
      initialLocale={locale}
      initialContent={assembleLandingContent(locale, sections)}
      initialMenu={mainMenu}
      initialFooterMenu={footerMenu}
      initialTestimonials={testimonials}
      initialIsPricingVisible={pricing?.isPricingVisible ?? true}
    >
      <LandingShell />
    </LocaleThemeProvider>
  );
}
