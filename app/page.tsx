/**
 * `/` — the default-locale sales page.
 *
 * This route keeps serving the marketing page at the root URL; the locale-routing task adds
 * `/en` and `/bn` *alongside* it rather than moving it, because `/` is the address that has
 * been published, linked and bookmarked. The default locale is read from
 * `NEXT_PUBLIC_DEFAULT_LOCALE` (never hardcoded) so flipping it to `bn` re-points the root
 * URL without a code change.
 *
 * `/` and `/en` render the same content on purpose. `/en` is the explicit-locale alias that
 * hreflang needs; `/` stays the canonical English URL (see `lib/seo.ts` → `localeHomePath`),
 * so only one of the two ends up in the index.
 */
import { DEFAULT_LOCALE } from '@/lib/locales';
import { LandingPage } from '@/src/components/LandingPage';

export default function Page() {
  return <LandingPage locale={DEFAULT_LOCALE} />;
}