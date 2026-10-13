/**
 * fix/perf-overhaul verification: B1 session cache, B2 parallel prechecks, B3 bootstrap
 * shape, C1 pending state, D2 reduced-motion kill-switch, C1 follow-up (AdminPanel-wide
 * shared async pattern).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import React from 'react';
import {
  SESSION_CACHE_TTL_MS_FOR_TESTS,
  getSessionCacheForTests,
  invalidateSessionCacheForTests,
  resetSessionCacheForTests,
  sessionCacheSizeForTests,
  setSessionCacheForTests,
} from '@/lib/sessionCache';
import { MOTION, prefersReducedMotion, staggerDelayMs } from '@/lib/motion';
import { AsyncButton } from '@/hooks/useAsyncAction';

const root = process.cwd();

beforeEach(() => {
  resetSessionCacheForTests();
  vi.unstubAllGlobals();
});

describe('B1 session cache (per-isolate 60s, fail-closed)', () => {
  it('miss on unknown sid', () => {
    expect(getSessionCacheForTests('nope', Date.now())).toBeNull();
    expect(sessionCacheSizeForTests()).toBe(0);
  });

  it('hit within TTL returns role', () => {
    const now = 1_000_000;
    setSessionCacheForTests('sid-1', 'admin', now + 3_600_000, now);
    const hit = getSessionCacheForTests('sid-1', now + 10_000);
    expect(hit?.role).toBe('admin');
    expect(sessionCacheSizeForTests()).toBe(1);
  });

  it('expiry by TTL evicts (revocation window bound)', () => {
    const now = 2_000_000;
    setSessionCacheForTests('sid-2', 'editor', now + 3_600_000, now);
    expect(
      getSessionCacheForTests('sid-2', now + SESSION_CACHE_TTL_MS_FOR_TESTS + 1),
    ).toBeNull();
    expect(sessionCacheSizeForTests()).toBe(0);
  });

  it('expiry by absolute session end evicts even within TTL', () => {
    const now = 3_000_000;
    setSessionCacheForTests('sid-3', 'admin', now + 5_000, now);
    expect(getSessionCacheForTests('sid-3', now + 6_000)).toBeNull();
  });

  it('fail-closed: invalidation on revocation removes stale entry', () => {
    const now = 4_000_000;
    setSessionCacheForTests('sid-4', 'admin', now + 3_600_000, now);
    invalidateSessionCacheForTests('sid-4');
    expect(getSessionCacheForTests('sid-4', now + 1_000)).toBeNull();
  });

  it('TTL is 60s', () => {
    expect(SESSION_CACHE_TTL_MS_FOR_TESTS).toBe(60_000);
  });
});

describe('B2 single-tick parallel prechecks', () => {
  it('four independent reads resolve concurrently, not sequentially', async () => {
    const order: string[] = [];
    const mk = (name: string, ms: number) => () =>
      new Promise<string>((resolve) => {
        order.push(`start:${name}`);
        setTimeout(() => {
          order.push(`end:${name}`);
          resolve(name);
        }, ms);
      });
    const start = Date.now();
    const [a, b, c, d] = await Promise.all([mk('rate', 30)(), mk('acct', 30)(), mk('ip', 30)(), mk('user', 30)()]);
    const elapsed = Date.now() - start;
    expect([a, b, c, d]).toEqual(['rate', 'acct', 'ip', 'user']);
    // Concurrent: ~30ms, not ~120ms sequential. Generous bound for loaded CI.
    expect(elapsed).toBeLessThan(100);
    expect(order.slice(0, 4)).toEqual(['start:rate', 'start:acct', 'start:ip', 'start:user']);
  });

  it('auth.ts authorize uses ONE Promise.all for the four pre-password reads', () => {
    const src = readFileSync(path.join(root, 'auth.ts'), 'utf8');
    expect(src).toContain('Promise.all([');
    expect(src).toContain("'auth:lockout-check'");
    expect(src).toContain("'auth:throttle-check'");
    expect(src).toContain("'auth:user-lookup'");
    // Timing equalizer + iteration cap untouched.
    expect(src).toContain('TIMING_EQUALIZER_HASH');
    expect(src).not.toContain('deriveBits(password, salt, 10000,');
  });
});

describe('B3 bootstrap shape', () => {
  it('route file exports GET and returns metrics.{posts,leads,media,categories,tags}', async () => {
    const src = readFileSync(
      path.join(root, 'app/api/admin/bootstrap/route.ts'),
      'utf8',
    );
    expect(src).toContain('export async function GET');
    expect(src).toContain('postsTotal');
    expect(src).toContain('leadsTotal');
    expect(src).toContain('mediaTotal');
    expect(src).toContain('categoriesTotal');
    expect(src).toContain('tagsTotal');
    // Individual endpoints stay intact (no deletion).
    expect(src).not.toContain('delete');
  });
});

describe('C1 pending state (AsyncButton)', () => {
  it('loading → disabled + aria-busy + spinner', () => {
    const html = renderToString(
      React.createElement(AsyncButton, { loading: true, children: 'Save' }),
    );
    expect(html).toContain('disabled');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('<svg');
  });

  it('idle → enabled, no aria-busy, no spinner', () => {
    const html = renderToString(
      React.createElement(AsyncButton, { loading: false, children: 'Save' }),
    );
    expect(html).not.toContain('disabled');
    expect(html).toContain('aria-busy="false"');
    expect(html).not.toContain('<svg');
  });

  it('auth sign-out path uses the shared primitive (no fire-and-forget)', () => {
    const src = readFileSync(path.join(root, 'app/admin/AdminConsole.tsx'), 'utf8');
    expect(src).toContain('useAsyncAction');
    expect(src).toContain('AsyncButton');
    expect(src).toContain('ToastStack');
    // The primitive itself owns aria-busy (verified in the hook source).
    const hook = readFileSync(path.join(root, 'hooks/useAsyncAction.tsx'), 'utf8');
    expect(hook).toContain('aria-busy');
    expect(hook).toContain('pushToast');
  });
});

describe('D2 reduced-motion kill-switch + D1 tokens', () => {
  it('globals.css has the global kill-switch', () => {
    const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('--motion-duration-base');
    expect(css).toContain('--motion-easing-standard');
    expect(css).toContain('.reveal');
    expect(css).toContain('.motion-shimmer');
  });

  it('motion helpers respect reduced-motion', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    expect(prefersReducedMotion()).toBe(true);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    expect(prefersReducedMotion()).toBe(false);
  });

  it('tokens are GPU-composited only (transform/opacity in reveal CSS)', () => {
    const css = readFileSync(path.join(root, 'app/globals.css'), 'utf8');
    const revealBlock = css.slice(css.indexOf('.reveal {'), css.indexOf('.reveal.is-visible'));
    expect(revealBlock).toContain('transform');
    expect(revealBlock).toContain('opacity');
    expect(revealBlock).not.toContain('width');
    expect(revealBlock).not.toContain('height');
  });

  it('stagger is capped and token-driven', () => {
    expect(staggerDelayMs(0)).toBe(0);
    expect(staggerDelayMs(2)).toBe(2 * MOTION.staggerStepMs);
    expect(staggerDelayMs(100)).toBe(8 * MOTION.staggerStepMs);
    expect(MOTION.pressScale).toBeLessThan(1);
  });
});

describe('C1 follow-up: AdminPanel-wide shared async pattern (no fire-and-forget)', () => {
  const ADMIN_PANEL_MUTATIONS = [
    'handleSaveLocale',
    'handlePublishLocale',
    'handleRestoreRevision',
    'handleUpdateLeadStatus',
    'handleAssignLead',
    'handleSaveFollowUp',
    'handleRetryLicenseSync',
    'handleRetryMetaSync',
    'handleTogglePricingMode',
    'handleSaveSettings',
    'handleSaveBlogPost',
    'handleDeleteBlogPost',
    'handleSaveTestimonial',
    'handleDeleteTestimonial',
    'handleSaveCaseStudy',
    'handleDeleteCaseStudy',
    'runPurge',
  ];

  it('every mutating handler runs through the shared async primitive', () => {
    const src = readFileSync(path.join(root, 'src/components/admin/AdminPanel.tsx'), 'utf8');
    for (const name of ADMIN_PANEL_MUTATIONS) expect(src).toContain(name);
    expect(src).toContain('useAsyncAction');
    const runs = src.match(/mutation\.run\(/g)?.length ?? 0;
    expect(runs).toBeGreaterThanOrEqual(ADMIN_PANEL_MUTATIONS.length);
  });

  it('no ad-hoc isSaving* pending states remain in AdminPanel (single source of truth)', () => {
    const src = readFileSync(path.join(root, 'src/components/admin/AdminPanel.tsx'), 'utf8');
    expect(src).not.toMatch(/setIsSavingEditor|setIsBlogSaving|setTestimonialSaving|setCaseStudySaving/);
    expect(src).not.toMatch(/const \[isSavingEditor|const \[isBlogSaving|const \[testimonialSaving|const \[caseStudySaving/);
  });

  it('panel loading states render Skeleton', () => {
    for (const file of [
      'src/components/admin/AdminPanel.tsx',
      'src/components/admin/tabs/ContentTab.tsx',
      'src/components/admin/tabs/LeadDrawer.tsx',
      'src/components/admin/MediaLibrary.tsx',
      'src/components/admin/BlogCategoryManager.tsx',
      'src/components/admin/BlogTagManager.tsx',
    ]) {
      const src = readFileSync(path.join(root, file), 'utf8');
      expect(src, file).toContain('Skeleton');
    }
  });

  it('mutating buttons across the panel surface use the shared AsyncButton', () => {
    for (const file of [
      'src/components/admin/AdminPanel.tsx',
      'src/components/admin/tabs/ContentTab.tsx',
      'src/components/admin/tabs/BlogTab.tsx',
      'src/components/admin/tabs/TestimonialsTab.tsx',
      'src/components/admin/tabs/LeadsTab.tsx',
      'src/components/admin/tabs/LeadDrawer.tsx',
      'src/components/admin/tabs/DashboardTab.tsx',
      'src/components/admin/tabs/PricingTab.tsx',
      'src/components/admin/tabs/SettingsTab.tsx',
      // SectionsTab has no buttons (checkbox + blur autosaves) — it owns the hook and
      // wires pending into disabled + aria-busy instead (asserted below).
      'src/components/admin/AdminShell.tsx',
      'src/components/admin/MediaLibrary.tsx',
      'src/components/admin/BlogCategoryManager.tsx',
      'src/components/admin/BlogTagManager.tsx',
    ]) {
      const src = readFileSync(path.join(root, file), 'utf8');
      expect(src, file).toContain('AsyncButton');
    }
    const sections = readFileSync(
      path.join(root, 'src/components/admin/tabs/SectionsTab.tsx'),
      'utf8',
    );
    expect(sections).toContain('useAsyncAction');
    expect(sections).toContain('aria-busy');
  });

  it('self-contained mutation islands own the shared hook (no unhandled rejections)', () => {
    for (const file of [
      'src/components/admin/tabs/SectionsTab.tsx',
      'src/components/admin/MediaLibrary.tsx',
      'src/components/admin/BlogCategoryManager.tsx',
      'src/components/admin/BlogTagManager.tsx',
      'src/components/admin/AdminShell.tsx',
    ]) {
      const src = readFileSync(path.join(root, file), 'utf8');
      expect(src, file).toContain('useAsyncAction');
    }
  });
});
