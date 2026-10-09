import { describe, expect, it } from 'vitest';
import {
  DISPATCH_MAX_ATTEMPTS,
  nextAttemptDelaySeconds,
} from '@/lib/leadDispatch';
import { fallbackPrivacy, fallbackTerms, legalDoc, LEGAL_PRIVACY_KEY } from '@/lib/legal';

describe('dispatch backoff (Task 20 §4)', () => {
  it('waits 1m, 5m, 30m, 2h, 12h then exhausts', () => {
    expect(nextAttemptDelaySeconds(1)).toBe(60);
    expect(nextAttemptDelaySeconds(2)).toBe(300);
    expect(nextAttemptDelaySeconds(3)).toBe(1800);
    expect(nextAttemptDelaySeconds(4)).toBe(7200);
    expect(nextAttemptDelaySeconds(5)).toBe(43200);
    expect(nextAttemptDelaySeconds(6)).toBeNull();
    expect(nextAttemptDelaySeconds(0)).toBeNull();
  });

  it('fails terminal after the budget', () => {
    expect(DISPATCH_MAX_ATTEMPTS).toBe(6);
  });
});

describe('legal fallback (Task 20 §6)', () => {
  it('serves static privacy copy when the DB row is missing', () => {
    const doc = legalDoc(null, LEGAL_PRIVACY_KEY, 'en');
    expect(doc.title).toBe('Privacy Policy');
    const bodies = doc.sections.map((s) => s.body).join(' ');
    expect(bodies).toContain('Meta Pixel');
    expect(bodies).toContain('180 days');
    expect(bodies).toContain('hello@ecomate.bd');
  });

  it('picks the DB row when present', () => {
    const dbDoc = fallbackTerms('bn');
    const doc = legalDoc(
      [{ sectionKey: 'legal.terms', content: dbDoc }],
      'legal.terms',
      'bn',
    );
    expect(doc.title).toBe(dbDoc.title);
  });

  it('privacy fallback exists in both locales', () => {
    expect(fallbackPrivacy('bn').title).not.toBe(fallbackPrivacy('en').title);
  });
});
