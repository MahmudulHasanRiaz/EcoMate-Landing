/**
 * SEO primitives: the site origin, canonical absolute URLs and JSON-LD builders.
 *
 * Kept in one module so the canonical origin has exactly one source of truth. `SITE_URL` is
 * read at module scope from `NEXT_PUBLIC_SITE_URL`, which Next inlines at build time — the
 * same value `metadataBase` and the sitemap use, so a canonical URL and a sitemap entry can
 * never disagree.
 */

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
    inLanguage: 'en',
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
