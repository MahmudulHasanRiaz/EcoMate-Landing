import { describe, expect, it } from 'vitest';
import { settingsPatch, stripUnknownKeys, testimonialUpdate } from '@/lib/validation';

/**
 * Regression tests for the admin "Save always fails with validation failed"
 * class of bugs: forms round-trip GET-shaped rows (id, createdAt, updatedAt)
 * back through PUT handlers with strict schemas. `stripUnknownKeys` drops
 * non-schema keys before validation so fetched rows always validate, while
 * mass assignment stays impossible (only declared keys reach `.set()`).
 */
describe('stripUnknownKeys', () => {
  it('keeps declared keys and drops everything else', () => {
    expect(
      stripUnknownKeys(settingsPatch, {
        siteName: 'EcoMate',
        id: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        isAdmin: true,
      }),
    ).toEqual({ siteName: 'EcoMate' });
  });

  it('passes non-object bodies through untouched', () => {
    expect(stripUnknownKeys(settingsPatch, null)).toBeNull();
    expect(stripUnknownKeys(settingsPatch, 'nope')).toBe('nope');
    expect(stripUnknownKeys(settingsPatch, undefined)).toBeUndefined();
  });

  it('a full GET-shaped settings row validates after stripping (bug 1a)', () => {
    const getShaped = {
      id: 1,
      siteName: 'EcoMate',
      tagline: 'Ops platform',
      logoUrl: '',
      faviconUrl: '',
      defaultLocale: 'en',
      supportPhone: '+880 1894-828290',
      supportEmail: 'hello@ecomate.bd',
      whatsappNumber: '8801894828290',
      messengerUrl: 'https://m.me/ecomate.bd',
      address: 'Dhaka',
      isPricingVisible: true,
      metaCapiMode: 'instant',
      metaLeadStatusTrigger: '',
      metaInstantEventName: 'LeadInitiated',
      seoTitle: 't',
      seoDescription: 'd',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    // Without stripping this is exactly what the admin sent: strict rejects it.
    expect(settingsPatch.safeParse(getShaped).success).toBe(false);

    const stripped = stripUnknownKeys(settingsPatch, getShaped);
    const parsed = settingsPatch.safeParse(stripped);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      // Mass assignment stays impossible: no id/createdAt leaks into the write.
      expect('id' in parsed.data).toBe(false);
      expect('createdAt' in parsed.data).toBe(false);
      expect('updatedAt' in parsed.data).toBe(false);
      expect(parsed.data.siteName).toBe('EcoMate');
    }
  });

  it('a full GET-shaped testimonial row validates after stripping', () => {
    const row = {
      id: 7,
      clientName: 'A',
      clientRole: 'R',
      companyName: 'C',
      category: '',
      location: '',
      quoteEn: 'q',
      quoteBn: '',
      websiteUrl: '',
      logoUrl: '',
      videoUrl: '',
      videoDuration: '',
      videoProvider: 'youtube',
      imageUrl: '',
      rating: null,
      format: 'text',
      metrics: [],
      sortOrder: 0,
      isPublished: true,
      deletedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    expect(testimonialUpdate.safeParse(row).success).toBe(false);
    const parsed = testimonialUpdate.safeParse(stripUnknownKeys(testimonialUpdate, row));
    expect(parsed.success).toBe(true);
  });

  it('still rejects invalid values on declared keys after stripping', () => {
    const parsed = settingsPatch.safeParse(
      stripUnknownKeys(settingsPatch, { siteName: '', id: 1 }),
    );
    expect(parsed.success).toBe(false);
  });
});
