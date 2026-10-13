import { expect, test } from '@playwright/test';

/**
 * SEO kill-switch (default OFF): all four crawler surfaces stay dark until an
 * admin flips `site_settings.seo_indexing_enabled`. The ON-state is covered by
 * the existing `e2e/seo.spec.ts` expectations once the flag is enabled.
 */
test.describe('seo kill-switch (default OFF)', () => {
  test('/robots.txt disallows everything and advertises no sitemap', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain('Disallow: /');
    expect(body).not.toContain('Sitemap:');
  });

  test('/sitemap.xml is empty while dark', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    expect(xml).not.toMatch(/<loc>/);
  });

  test('/ carries noindex meta and X-Robots-Tag header', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    expect(response.headers()['x-robots-tag']).toContain('noindex');
    const html = await response.text();
    expect(html).toMatch(/name="robots"[^>]*content="[^"]*noindex/);
  });
});
