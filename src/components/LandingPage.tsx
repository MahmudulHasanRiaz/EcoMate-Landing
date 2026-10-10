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
import { getLandingContent, getMenu, getPricingPlans, getSiteBranding, getTestimonials } from '@/lib/content';
import { assembleLandingContent } from '@/lib/merge';
import { errorMessage, logOnce } from '@/lib/json';
import { withTimeout } from '@/lib/withTimeout';
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
  //
  // P0 2026-10-09: the `'use cache'` R2/DO operations run outside any timeout guard — a
  // never-settling cache promise hangs the request until the runtime kills it (1101).
  // The whole five-await block is bounded to 20s (< ~30s kill); on timeout every result
  // stays `null` and the page renders fully static. Sequential awaits preserved inside.
  let sections: Awaited<ReturnType<typeof getLandingContent>> = null;
  let mainMenu: Awaited<ReturnType<typeof getMenu>> = null;
  let footerMenu: Awaited<ReturnType<typeof getMenu>> = null;
  let pricing: Awaited<ReturnType<typeof getPricingPlans>> = null;
  let testimonials: Awaited<ReturnType<typeof getTestimonials>> = null;
  let branding: Awaited<ReturnType<typeof getSiteBranding>> = null;
  try {
    const loaded = await withTimeout(
      (async () => {
        const s = await getLandingContent(locale);
        const m1 = await getMenu('main', locale);
        const m2 = await getMenu('footer', locale);
        const p = await getPricingPlans();
        // 2c: published DB testimonials seed the proof section (null → static fallback copy).
        const t = await getTestimonials();
        // v3 polish: header logo + favicon (null → built-in marks).
        const b = await getSiteBranding();
        return { sections: s, mainMenu: m1, footerMenu: m2, pricing: p, testimonials: t, branding: b };
      })(),
      `landing-page:${locale}`,
      20000,
    );
    sections = loaded.sections;
    mainMenu = loaded.mainMenu;
    footerMenu = loaded.footerMenu;
    pricing = loaded.pricing;
    testimonials = loaded.testimonials;
    branding = loaded.branding;
  } catch (e) {
    logOnce('warn', `landing-page:timeout:${locale}`, `[landing] data fetch timed out for locale "${locale}", serving static fallback:`, errorMessage(e));
  }

  return (
    <LocaleThemeProvider
      initialLocale={locale}
      initialContent={assembleLandingContent(locale, sections)}
      initialMenu={mainMenu}
      initialFooterMenu={footerMenu}
      initialTestimonials={testimonials}
      initialIsPricingVisible={pricing?.isPricingVisible ?? true}
      initialBranding={branding}
    >
      <LandingShell />
    </LocaleThemeProvider>
  );
}
