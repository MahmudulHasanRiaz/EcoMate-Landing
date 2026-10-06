/**
 * The composed marketing page, as a server component.
 *
 * Both entry points render exactly this: `app/page.tsx` (the unprefixed `/`, serving
 * `NEXT_PUBLIC_DEFAULT_LOCALE`) and `app/[locale]/page.tsx` (`/en`, `/bn`). They share it
 * rather than each re-reading and re-assembling the content, because the 16-section
 * composition already lives in `LandingShell` — the only thing that differs between a root
 * entry and a locale entry is *which* locale's rows to read, and that is the only argument
 * here.
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
import { getLandingContent, getMenu } from '@/lib/content';
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
  // to the tracker, and costs nothing here — all three are cache reads, so the two that follow
  // the first are microtasks, not queries.
  const sections = await getLandingContent(locale);
  const mainMenu = await getMenu('main', locale);
  const footerMenu = await getMenu('footer', locale);

  return (
    <LandingShell
      initialLocale={locale}
      initialContent={assembleLandingContent(locale, sections)}
      menu={mainMenu}
      footerMenu={footerMenu}
    />
  );
}