import { describe, expect, it } from 'vitest';
import {
  formatRequirements,
  testimonialCreate,
  testimonialUpdate,
} from '@/lib/validation/testimonials';
import { caseStudyCreate } from '@/lib/validation/caseStudies';

describe('testimonial multi-format validation (H-19)', () => {
  it('accepts the legacy minimal payload (back-compat: no format required)', () => {
    expect(
      testimonialCreate.safeParse({ clientName: 'ACME', companyName: 'ACME Ltd', quoteEn: 'Great!' }).success,
    ).toBe(true);
  });

  it('accepts each format with its required fields', () => {
    const base = { clientName: 'ACME', companyName: 'ACME Ltd', quoteEn: 'Great!' };
    expect(
      testimonialCreate.safeParse({ ...base, format: 'text' }).success,
    ).toBe(true);
    expect(
      testimonialCreate.safeParse({ ...base, format: 'video_short', videoUrl: 'https://youtu.be/abc123DEF45' }).success,
    ).toBe(true);
    expect(
      testimonialCreate.safeParse({ ...base, format: 'video_standard', videoUrl: 'https://www.youtube.com/watch?v=abc123DEF45' }).success,
    ).toBe(true);
    expect(
      testimonialCreate.safeParse({ ...base, format: 'image', imageUrl: 'https://media.ecomate.bd/media/x.jpg' }).success,
    ).toBe(true);
  });

  it('rejects unknown formats and bad enums', () => {
    const base = { clientName: 'ACME', companyName: 'ACME Ltd', quoteEn: 'Great!' };
    expect(testimonialCreate.safeParse({ ...base, format: 'podcast' }).success).toBe(false);
    expect(testimonialCreate.safeParse({ ...base, videoProvider: 'vimeo' }).success).toBe(false);
    expect(testimonialCreate.safeParse({ ...base, rating: 0 }).success).toBe(false);
    expect(testimonialCreate.safeParse({ ...base, rating: 6 }).success).toBe(false);
    expect(testimonialCreate.safeParse({ ...base, rating: 5 }).success).toBe(true);
    expect(testimonialCreate.safeParse({ ...base, rating: null }).success).toBe(true);
  });

  it('formatRequirements enforces per-format fields on the merged row', () => {
    expect(formatRequirements({ format: 'video_standard', videoUrl: 'https://x.test/v' })).toBeNull();
    expect(formatRequirements({ format: 'video_short', videoUrl: '' })).toContain('videoUrl');
    expect(formatRequirements({ format: 'image', imageUrl: 'https://x.test/i.jpg' })).toBeNull();
    expect(formatRequirements({ format: 'image', imageUrl: '' })).toContain('imageUrl');
    expect(formatRequirements({ format: 'text', quoteEn: 'Hi' })).toBeNull();
    expect(formatRequirements({ format: 'text', quoteEn: '' })).toContain('quote');
    // Absent format defaults to text (create path without a picker choice).
    expect(formatRequirements({ quoteEn: 'Hi' })).toBeNull();
    // Legacy rows render as standard while they carry a video.
    expect(formatRequirements({ format: 'video_walkthrough', videoUrl: 'https://x.test/v' })).toBeNull();
    // Unknown formats are rejected, not silently rendered.
    expect(formatRequirements({ format: 'hologram' })).toContain('unknown format');
  });

  it('update stays fully optional (requirements run against the merged row server-side)', () => {
    expect(testimonialUpdate.safeParse({}).success).toBe(true);
    expect(testimonialUpdate.safeParse({ videoUrl: '' }).success).toBe(true);
  });
});

describe('case-study slug-optional create (H-20)', () => {
  const body = {
    title: 'ACME Growth',
    client: 'ACME',
    problemOverview: 'P',
    solutionImplemented: 'S',
    quantifiedOutcome: 'Q',
  };
  it('accepts an explicit valid slug and auto-generation (absent slug)', () => {
    expect(caseStudyCreate.safeParse({ ...body, slug: 'acme-growth' }).success).toBe(true);
    expect(caseStudyCreate.safeParse(body).success).toBe(true);
  });

  it('still rejects malformed explicit slugs', () => {
    expect(caseStudyCreate.safeParse({ ...body, slug: 'BAD SLUG' }).success).toBe(false);
  });
});
