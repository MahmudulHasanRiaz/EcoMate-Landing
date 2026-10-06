import { describe, expect, it } from 'vitest';
import {
  caseStudyCreate,
  menuCreate,
  menuReplace,
  operatorCreate,
  operatorUpdate,
  redirectCreate,
  redirectUpdate,
  sectionUpdate,
  setupCreate,
  socialLinkCreate,
  socialLinkUpdate,
  testimonialCreate,
} from '@/lib/validation';
import { ApiValidationError, fieldErrorsOf, toFieldErrors } from '@/src/components/admin/fieldErrors';

describe('route-adjacent schemas', () => {
  it('sectionUpdate is a strict partial', () => {
    expect(sectionUpdate.safeParse({ titleEn: 'Hello' }).success).toBe(true);
    expect(sectionUpdate.safeParse({ sectionKey: 'hero' }).success).toBe(false);
  });

  it('social links accept the platform vocabulary and safe urls only', () => {
    expect(socialLinkCreate.safeParse({ platform: 'facebook', url: 'https://facebook.com/x' }).success).toBe(true);
    expect(socialLinkCreate.safeParse({ platform: 'myspace' }).success).toBe(false);
    expect(socialLinkCreate.safeParse({ platform: 'facebook', url: 'javascript:alert(1)' }).success).toBe(false);
    expect(socialLinkUpdate.safeParse({ id: 1, isVisible: false }).success).toBe(true);
    expect(socialLinkUpdate.safeParse({ isVisible: false }).success).toBe(false);
  });

  it('menus accept safe hrefs and reject scripts', () => {
    expect(menuCreate.safeParse({ key: 'main', label: 'Home', href: '/' }).success).toBe(true);
    expect(menuCreate.safeParse({ key: 'main', label: 'Home', href: 'javascript:alert(1)' }).success).toBe(false);
    expect(menuCreate.safeParse({ key: 'sidebar', label: 'Home', href: '/' }).success).toBe(false);
    expect(
      menuReplace.safeParse({ key: 'main', items: [{ label: 'Home', href: '/' }] }).success,
    ).toBe(true);
    expect(
      menuReplace.safeParse({ key: 'main', items: [{ label: '', href: '/' }] }).success,
    ).toBe(false);
  });

  it('redirects accept paths and numeric status codes', () => {
    expect(redirectCreate.safeParse({ fromPath: '/old', toPath: '/new' }).success).toBe(true);
    expect(redirectCreate.safeParse({ fromPath: 'old', toPath: '/new' }).success).toBe(false);
    expect(redirectUpdate.safeParse({ id: 1, fromPath: '/a', toPath: '/b', statusCode: 301 }).success).toBe(true);
    expect(
      redirectCreate.safeParse({ fromPath: '/a', toPath: '/b', statusCode: 200 }).success,
    ).toBe(false);
  });

  it('operator schemas enforce email shape and password length', () => {
    expect(
      operatorCreate.safeParse({ email: 'op@ecomate.app', password: 'long-enough-password', role: 'editor' }).success,
    ).toBe(true);
    expect(operatorCreate.safeParse({ email: 'nope', password: 'long-enough-password' }).success).toBe(false);
    expect(operatorCreate.safeParse({ email: 'op@ecomate.app', password: 'short' }).success).toBe(false);
    expect(operatorCreate.safeParse({ email: 'op@ecomate.app', password: 'long-enough-password', totpEnabled: true }).success).toBe(false);
    expect(operatorUpdate.safeParse({ role: 'admin' }).success).toBe(true);
    expect(operatorUpdate.safeParse({ role: 'root' }).success).toBe(false);
    expect(setupCreate.safeParse({ token: 't', email: 'root@ecomate.app', password: 'long-enough-password' }).success).toBe(true);
  });

  it('testimonials and case studies require their identity fields', () => {
    expect(
      testimonialCreate.safeParse({ clientName: 'ACME', companyName: 'ACME Ltd', quoteEn: 'Great!' }).success,
    ).toBe(true);
    expect(testimonialCreate.safeParse({ companyName: 'ACME Ltd', quoteEn: 'Great!' }).success).toBe(false);
    expect(
      caseStudyCreate.safeParse({
        slug: 'acme-growth',
        title: 'ACME Growth',
        client: 'ACME',
        problemOverview: 'P',
        solutionImplemented: 'S',
        quantifiedOutcome: 'Q',
      }).success,
    ).toBe(true);
    expect(
      caseStudyCreate.safeParse({ slug: 'BAD SLUG', title: 'T', client: 'C', problemOverview: 'P', solutionImplemented: 'S', quantifiedOutcome: 'Q' }).success,
    ).toBe(false);
  });
});

describe('fieldErrors helper', () => {
  it('maps issues[].path to the field id', () => {
    const payload = {
      error: 'Validation failed',
      details: {
        issues: [
          { path: ['siteName'], message: 'Too short' },
          { path: ['items', 2, 'href'], message: 'Bad href' },
        ],
      },
    };
    expect(toFieldErrors(payload)).toEqual({ siteName: 'Too short', items: 'Bad href' });
  });

  it('returns {} for non-validation payloads', () => {
    expect(toFieldErrors({ error: 'Boom' })).toEqual({});
    expect(toFieldErrors(null)).toEqual({});
    expect(fieldErrorsOf(new Error('plain'))).toEqual({});
    expect(fieldErrorsOf(new ApiValidationError('Validation failed', {
      error: 'Validation failed',
      details: { issues: [{ path: ['slug'], message: 'Invalid' }] },
    }))).toEqual({ slug: 'Invalid' });
  });
});
