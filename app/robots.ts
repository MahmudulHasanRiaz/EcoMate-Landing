import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/**
 * Everything public is crawlable. `/admin` and `/api` are excluded from indexing by the
 * `robots` metadata on the admin layout and by being non-content routes, but they are
 * disallowed here too so a crawler does not spend budget on session-gated URLs that only
 * ever answer with a redirect.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // L-37: no `host` directive — only Yandex supports it, and Next warns on it.
  };
}
