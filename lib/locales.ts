/**
 * Locale vocabulary shared by routing, formatting and SEO.
 *
 * Same rationale as `lib/roles.ts`: one place that knows which locales exist, which one is
 * the default, and how a site locale maps onto a CLDR tag. `Locale` itself lives in
 * `src/types/landing.ts` because the marketing components already import from there; this
 * module adds the runtime helpers without creating an import cycle.
 */
import type { Locale } from '@/src/types/landing';

/** Every locale this site ships. `generateStaticParams` and `notFound()` both key off it. */
export const LOCALES: readonly Locale[] = ['en', 'bn'];

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'bn';
}

/** Coerce an untrusted path segment to a `Locale`, falling back to the default. */
export function localeOrDefault(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * The unprefixed locale served at `/`.
 *
 * `NEXT_PUBLIC_DEFAULT_LOCALE` is a `NEXT_PUBLIC_*` var, so Next inlines it at build time
 * and the same value is baked into the server render and the client bundle. Anything other
 * than an explicit `bn` means English — a missing or misspelled var must not produce a site
 * whose root URL renders a language nobody chose.
 */
export const DEFAULT_LOCALE: Locale =
  process.env.NEXT_PUBLIC_DEFAULT_LOCALE === 'bn' ? 'bn' : 'en';

/**
 * Site locale → CLDR tag used for `Intl`.
 *
 * Region matters: `en-BD` and `bn-BD` order and punctuate dates differently from `en-US`
 * and `bn-BD` respectively, and the region is also what a screen reader and a translation
 * vendor use to pick the right English/Bangla conventions. Never plain `en`/`bn` here.
 */
export const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-BD',
  bn: 'bn-BD',
};

/**
 * First path segment of a URL, read as a locale, or `null` when the URL is not locale
 * scoped. `/` and `/en` are both the default locale: `/` is the canonical English URL and
 * `/en` is its explicit-locale alias (see `lib/seo.ts`).
 */
export function localeFromPathname(pathname: string): Locale | null {
  const segment = pathname.split('/')[1] ?? '';
  return isLocale(segment) ? segment : null;
}