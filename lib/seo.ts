/**
 * SEO primitives: the site origin, canonical absolute URLs and JSON-LD builders.
 *
 * Kept in one module so the canonical origin has exactly one source of truth. `SITE_URL` is
 * read at module scope from `NEXT_PUBLIC_SITE_URL`, which Next inlines at build time — the
 * same value `metadataBase` and the sitemap use, so a canonical URL and a sitemap entry can
 * never disagree.
 *
 * Locale-aware URL construction lives here too (Task 15): hreflang, per-locale canonicals and
 * breadcrumbs all have to agree about where `/en` and `/bn` live, and this is the module that
 * already owns the origin.
 */
import { DEFAULT_LOCALE, LOCALES } from '@/lib/locales';
import type { Locale } from '@/src/types/landing';

/** Canonical origin. `wrangler.toml` `[vars]` sets the production value. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ecomate.app';

/** Site name used by `openGraph.siteName`, the sitemap entries and the Organization node. */
export const SITE_NAME = 'EcoMate';

export const SITE_TAGLINE = 'Your Entire E-commerce Operation, Managed From One Place';

export const SITE_DESCRIPTION =
  'EcoMate is the complete operating platform for scaling e-commerce businesses. Unify online stores, showrooms, inventory, smart packing, couriers, finance, and marketing.';

/** Support details mirrored from the seeded `site_settings` row (Task 12 makes them DB-driven). */
const SUPPORT_EMAIL = 'hello@ecomate.app';
const SUPPORT_PHONE = '+880 1894-828290';

export type JsonLdObject = Record<string, unknown>;

/** Absolute URL for a root-relative path, so structured data never ships a relative `@id`. */
export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

/**
 * Organization node for the site-wide JSON-LD block.
 *
 * `@id` is the origin itself, which lets an `Article` node reference the same publisher
 * entity instead of duplicating it.
 */
export function organizationJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    slogan: SITE_TAGLINE,
    email: SUPPORT_EMAIL,
    telephone: SUPPORT_PHONE,
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Tejgaon I/A',
      addressLocality: 'Dhaka',
      postalCode: '1208',
      addressCountry: 'BD',
    },
    areaServed: { '@type': 'Country', name: 'Bangladesh' },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: SUPPORT_EMAIL,
        telephone: SUPPORT_PHONE,
        availableLanguage: ['en', 'bn'],
      },
    ],
  };
}

export interface ArticleJsonLdInput {
  title: string;
  description: string;
  /** Absolute URL of the article (use `absoluteUrl('/blog/<slug>')`). */
  url: string;
  author: string;
  /** ISO 8601. */
  datePublished: string;
  /** ISO 8601; defaults to `datePublished`. */
  dateModified?: string;
  /** Absolute image URL. Omitted from the output when absent — a broken `image` URL is
   *  worse than no image node. */
  imageUrl?: string;
  section?: string;
  tags?: readonly string[];
  /** BCP-47 language of the article body. Omitted when unknown rather than guessed. */
  locale?: Locale;
}

/** `Article` node for a blog post or case study. */
export function articleJsonLd(input: ArticleJsonLdInput): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.url },
    url: input.url,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { '@type': 'Person', name: input.author },
    publisher: { '@id': `${SITE_URL}#organization` },
    ...(input.imageUrl ? { image: [input.imageUrl] } : {}),
    ...(input.section ? { articleSection: input.section } : {}),
    ...(input.tags && input.tags.length > 0 ? { keywords: input.tags.join(', ') } : {}),
    ...(input.locale ? { inLanguage: input.locale } : {}),
  };
}

/**
 * Serialize a JSON-LD node for an inline `<script type="application/ld+json">`.
 *
 * `<` is escaped so that a `</script>` sequence inside content (a blog title, a client
 * name) cannot terminate the script element early and turn structured data into an XSS
 * vector. `\u003c` is equivalent JSON for the parser.
 */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

// --- Locale URLs, hreflang and canonicals (Task 15 §2, §4) ----------------------------

/**
 * The canonical path for a locale's home page.
 *
 * English canonicalises to the **unprefixed** `/`, not to `/en`. `/` is the URL that has
 * existed since the prototype and carries its inbound links; `/en` exists only because
 * `generateStaticParams` must return `en` for `/bn` to have a sibling in the same dynamic
 * segment, and hreflang needs an `en` entry. Pointing `/en`'s canonical at `/` keeps one
 * English URL in the index instead of two competing ones, and keeps `/` the address the
 * sales team has been handing out.
 *
 * The return type is a literal union, not `string`, because `typedRoutes: true` makes every
 * `<Link href>` a checked route: a bare `string` would not type-check at the call site.
 */
export function localeHomePath(locale: Locale): '/' | `/${Locale}` {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
}

/**
 * The URL *prefix* a sub-page of this locale lives under — always `/${locale}`, including for
 * the default locale.
 *
 * This is deliberately different from `localeHomePath`. Only the locale home is served
 * unprefixed; `/blog/<slug>` has no route at all (it 404s), while `/en/blog/<slug>` does. The
 * sitemap got this wrong once — emitting the canonical home path for sub-pages and publishing
 * a list of 404s — so the two concepts are now separate functions with separate names.
 */
export function localeRoutePrefix(locale: Locale): `/${Locale}` {
  return `/${locale}`;
}

/**
 * The canonical absolute URL for a page in `locale`. `path` is relative to the locale home.
 *
 * The locale home uses the *canonical* prefix (`/` for the default locale, `/bn` otherwise),
 * but every sub-page uses the *route* prefix (`/en/...`, `/bn/...`) — unconditionally.
 *
 * That asymmetry is deliberate and load-bearing: `/blog/<slug>` is not a route in this app,
 * so a canonical of `/blog/<slug>` would point search engines at a URL that 404s, which is
 * worse than having no canonical at all. Only the home page is reachable unprefixed.
 *
 * The join is written out rather than concatenated because `'/' + '/blog/x'` is `'//blog/x'`,
 * a *protocol-relative* URL that `new URL` resolves against the host as `http://blog/x` —
 * which silently turned every English sub-page canonical, OG URL and hreflang into a URL on
 * a host named after the first path segment.
 */
export function localeUrl(locale: Locale, path = ''): string {
  const suffix = path === '/' ? '' : path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (suffix === '') return absoluteUrl(localeHomePath(locale));
  return absoluteUrl(`${localeRoutePrefix(locale)}/${suffix}`);
}

/**
 * `alternates` block for a page: a per-locale canonical plus the full hreflang set.
 *
 * `hreflang` alternates are *locale-relative paths*, not absolute URLs — Next resolves them
 * against `metadataBase`, so declaring them twice here would guarantee they drift. The
 * convention `alternates.languages` expects is `{ 'en': '/en', 'x-default': '/' }`.
 *
 * Every locale in the set must list every other locale in the set, including itself.
 * `x-default` points at the unprefixed root because that is where an unmatched-language
 * visitor (a crawler with no `Accept-Language` match, a shared link) should land.
 */
export function localeAlternates(locale: Locale, path = '') {
  const languages: Record<string, string> = {};
  for (const candidate of LOCALES) {
    // hreflang entries MUST use the explicit route prefix (`/en`, `/bn`), never the
    // canonical home path. For the default locale, `localeUrl('en', '')` returns `/`,
    // which collides with `x-default` (`/`) — Google requires distinct URLs per language
    // and flags duplicates. The canonical stays `/`; only the hreflang set uses `/en`.
    const suffix = path === '/' ? '' : path.replace(/^\/+/, '').replace(/\/+$/, '');
    const routePath = suffix === '' ? localeRoutePrefix(candidate) : `${localeRoutePrefix(candidate)}/${suffix}`;
    languages[candidate] = routePath;
  }
  languages['x-default'] = localeHomePath(DEFAULT_LOCALE);
  return {
    canonical: localeUrl(locale, path),
    languages,
  };
}

/**
 * Absolute URL for a social share image.
 *
 * `featuredImageUrl` is whatever the admin typed, so it can be a bare `/media/x.png` or an
 * absolute `https://media.ecomate.app/x.png`. Resolving through `absoluteUrl` means a
 * relative value still produces a valid absolute OG URL, and an absolute one is passed
 * through unchanged. Empty input returns `undefined` so callers can omit the field entirely:
 * an OG `images` entry pointing at a 404 renders a broken card, which is worse than no card.
 */
export function ogImageUrl(imageUrl: string | null | undefined): string | undefined {
  const raw = (imageUrl ?? '').trim();
  if (!raw) return undefined;
  try {
    return absoluteUrl(raw);
  } catch {
    return undefined;
  }
}

export interface BreadcrumbEntry {
  name: string;
  /** Locale-relative path of the crumb (`/`, `/blog`). */
  path: string;
}

/**
 * `BreadcrumbList` node for a page nested under the site root.
 *
 * `BreadcrumbList` is what puts the real path in a SERP instead of a bare URL, and it is the
 * one structured-data type that genuinely differs between a blog post and a case study — both
 * sit one level deeper than home, at different parents.
 */
export function breadcrumbJsonLd(
  locale: Locale,
  crumbs: readonly BreadcrumbEntry[],
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: localeUrl(locale, crumb.path),
    })),
  };
}
