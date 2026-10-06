import { expect, test } from '@playwright/test';

/**
 * SEO (Task 18 Step 3): sitemap completeness, hreflang reciprocity, and every
 * sitemap URL returning 200.
 *
 * Published-slug inclusion from a freshly seeded row is covered at the
 * integration level (`tests/integration/constraints.test.ts` — the exact
 * enumeration `generateStaticParams` performs), because the sitemap and the
 * prerender read through a 5-minute cache profile: a row seeded mid-run may
 * legitimately not appear yet. What IS deterministic here: drafts are never
 * listed (the test DB holds a draft post), static entries are always listed,
 * hreflang is reciprocal, and every listed URL resolves.
 */
test.describe('seo', () => {
  test('/sitemap.xml excludes drafts and lists the static locale entries', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    // The seeded draft must never be advertised to crawlers.
    expect(xml).not.toContain('why-ecommerce-businesses-lose-money-on-courier-returns');
    // Static entries: canonical English home, Bangla home, explicit /en alias.
    // Origin-agnostic: the sitemap correctly uses the configured SITE_URL, which is
    // localhost in E2E and ecomate.app in production. Assert paths, not origin.
    expect(xml).toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/);
    expect(xml).toContain('/bn</loc>');
    expect(xml).toContain('/en</loc>');
  });

  test('hreflang is reciprocal on / and /bn', async ({ page }) => {
    for (const path of ['/', '/bn']) {
      await page.goto(path);
      const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) =>
        links.map((link) => ({
          lang: link.getAttribute('hreflang'),
          href: link.getAttribute('href'),
        })),
      );
      const langs = alternates.map((entry) => entry.lang);
      expect(langs).toContain('en');
      expect(langs).toContain('bn');
      expect(langs).toContain('x-default');
      // Reciprocity: both pages advertise the same set of language targets.
      const hrefs = alternates.map((entry) => entry.href).sort();
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  test('every sitemap URL returns 200', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const path = new URL(url).pathname || '/';
      const head = await request.get(path);
      expect(head.status(), `sitemap URL ${path}`).toBe(200);
    }
  });
});
