import { describe, expect, it } from 'vitest';
import { leadCreate, leadUpdate } from '@/lib/validation';

const valid = {
  name: 'Rahim Uddin',
  phone: '+880 1712-345678',
  email: 'rahim@example.com',
  dailyVolume: '150 – 500 orders / day',
  note: 'Needs demo next week',
  source: 'landing_page_lead_form',
  utmSource: 'facebook',
  utmCampaign: 'launch',
  consentGiven: true,
  consentText: 'privacy-v1',
  turnstileToken: 'token',
  eventId: 'evt-12345678',
  fbp: 'fb.1.1234567890.1',
  fbc: 'fb.1.1234567890.abc',
} as const;

describe('leadCreate', () => {
  it('accepts a fully-valid representative payload', () => {
    const parsed = leadCreate.safeParse({ ...valid });
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown key (strictObject proof)', () => {
    expect(leadCreate.safeParse({ ...valid, isAdmin: true }).success).toBe(false);
    expect(leadCreate.safeParse({ ...valid, status: 'Won' }).success).toBe(false);
  });

  it('rejects oversized / out-of-range / malformed values', () => {
    expect(leadCreate.safeParse({ ...valid, name: '' }).success).toBe(false);
    expect(leadCreate.safeParse({ ...valid, phone: '123' }).success).toBe(false);
    expect(leadCreate.safeParse({ ...valid, phone: 'not a phone!!!' }).success).toBe(false);
    expect(leadCreate.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false);
    expect(leadCreate.safeParse({ ...valid, consentGiven: false }).success).toBe(false);
    expect(leadCreate.safeParse({ ...valid, consentGiven: 'yes' }).success).toBe(false);
  });

  it('requires name, phone and consent', () => {
    const { name: _n, ...noName } = valid;
    void _n;
    expect(leadCreate.safeParse(noName).success).toBe(false);
    const { consentGiven: _c, ...noConsent } = valid;
    void _c;
    expect(leadCreate.safeParse(noConsent).success).toBe(false);
  });

  it('accepts empty-string email (optional contact channel)', () => {
    expect(leadCreate.safeParse({ ...valid, email: '' }).success).toBe(true);
  });
});

describe('leadUpdate', () => {
  it('accepts operator patches and rejects unknown keys', () => {
    expect(leadUpdate.safeParse({ status: 'Qualified' }).success).toBe(true);
    expect(leadUpdate.safeParse({ assignedToId: null }).success).toBe(true);
    expect(leadUpdate.safeParse({ followUpAt: null }).success).toBe(true);
    expect(leadUpdate.safeParse({ actorId: 1 }).success).toBe(false);
  });

  it('rejects invalid status and assignee shapes', () => {
    expect(leadUpdate.safeParse({ status: 'Won tomorrow' }).success).toBe(false);
    expect(leadUpdate.safeParse({ assignedToId: -3 }).success).toBe(false);
    expect(leadUpdate.safeParse({ followUpAt: 'tomorrow' }).success).toBe(false);
  });
});
