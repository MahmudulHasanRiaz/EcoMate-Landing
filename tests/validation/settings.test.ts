import { describe, expect, it } from 'vitest';
import { settingsPatch } from '@/lib/validation';

const valid = {
  siteName: 'EcoMate',
  tagline: 'Your Entire E-commerce Operation, Managed From One Place',
  logoUrl: 'https://media.ecomate.bd/media/logo.png',
  faviconUrl: '',
  defaultLocale: 'en',
  supportPhone: '+880 1894-828290',
  supportEmail: 'hello@ecomate.bd',
  whatsappNumber: '8801894828290',
  messengerUrl: 'https://m.me/ecomate.bd',
  address: 'Tejgaon I/A, Dhaka 1208, Bangladesh',
  isPricingVisible: true,
  seoTitle: 'EcoMate — Operations Platform',
  seoDescription: 'Complete operating platform for high-volume brands.',
} as const;

describe('settingsPatch', () => {
  it('accepts a fully-valid representative payload', () => {
    const parsed = settingsPatch.safeParse({ ...valid });
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown key (strictObject proof)', () => {
    const parsed = settingsPatch.safeParse({ ...valid, isAdmin: true });
    expect(parsed.success).toBe(false);
  });

  it('rejects oversized / out-of-range / malformed values', () => {
    expect(settingsPatch.safeParse({ siteName: '' }).success).toBe(false);
    expect(settingsPatch.safeParse({ siteName: 'x'.repeat(121) }).success).toBe(false);
    expect(settingsPatch.safeParse({ defaultLocale: 'fr' }).success).toBe(false);
    expect(settingsPatch.safeParse({ supportPhone: '123' }).success).toBe(false);
    expect(settingsPatch.safeParse({ supportEmail: 'not-an-email' }).success).toBe(false);
    expect(settingsPatch.safeParse({ whatsappNumber: 'abc' }).success).toBe(false);
    expect(settingsPatch.safeParse({ logoUrl: 'not a url' }).success).toBe(false);
    expect(settingsPatch.safeParse({ seoTitle: 'x'.repeat(71) }).success).toBe(false);
    expect(settingsPatch.safeParse({ isPricingVisible: 'yes' }).success).toBe(false);
  });

  it('accepts an empty patch (all fields optional)', () => {
    expect(settingsPatch.safeParse({}).success).toBe(true);
  });
});
