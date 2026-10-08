'use client';

/**
 * Tracking-consent banner (Task 20 §5 — legally required, blocks tracking).
 *
 * No pixel, no CAPI, no analytics run until the visitor chooses. Choices:
 * Accept all / Essential only. The choice persists in the `ecomate_consent`
 * cookie (12 months) via `lib/consent.ts`; the per-lead record is written by
 * the lead form + route (`consentGiven`, `consentAt`, `consentText`).
 *
 * Locale (H-18): copy comes from `LandingContent.consent`, resolved from the URL
 * prefix (`/bn` → Bangla). This banner lives in the root layout, outside the
 * locale provider, so it cannot use `useLanding()` — the pathname is the locale.
 *
 * Privacy link (H-17): locale-prefixed (`/${locale}/privacy`) — the unprefixed
 * `/privacy` is not a route and 404s.
 *
 * Admin (L-63): never renders under `/admin/*` — operators must not be asked for
 * marketing consent inside their own console.
 *
 * Constraints honoured here:
 * - sits ABOVE the mobile sticky CTA bar (`bottom-[13vh]` on mobile, `md:bottom-6`
 *   on desktop — the bar is `z-40` capped at 12vh, this is `z-50`);
 * - keyboard accessible (`role="dialog"`, labelled, focus moved in on show,
 *   Escape dismisses to Essential-only);
 * - `prefers-reduced-motion` respected (`motion-safe:` guards the entrance);
 * - axe-clean: labelled dialog, real buttons, no positive-tabindex tricks.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getConsentChoice, setConsentChoice } from '@/lib/consent';
// M-26: the banner imports ONLY the ~1 KB consent module — never the full
// `landingContent` seed (~100 KB, both locales), which stays server-side.
import { consentCopy } from '@/src/data/consentCopy';
import type { Locale } from '@/src/types/landing';

function localeFromPathname(pathname: string | null): Locale {
  return pathname === '/bn' || (pathname ?? '').startsWith('/bn/') ? 'bn' : 'en';
}

export function ConsentBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // L-63: the admin console is outside marketing consent — render nothing there.
  // (Checked after the hooks below: an early return here would break hook order.)
  const isAdmin = pathname !== null && (pathname === '/admin' || pathname.startsWith('/admin/'));

  const locale = localeFromPathname(pathname);
  const copy = consentCopy[locale];

  useEffect(() => {
    // Show only when undecided. The pixel (`MetaPixel`) and the browser Lead
    // event both read the same cookie, so nothing fires before this resolves.
    if (getConsentChoice() === null) setVisible(true);
    const onChange = () => setVisible(false);
    window.addEventListener('ecomate-consent-changed', onChange);
    return () => window.removeEventListener('ecomate-consent-changed', onChange);
  }, []);

  useEffect(() => {
    if (!visible) return;
    // Focus management: move focus into the dialog so keyboard users land on it.
    const node = dialogRef.current;
    const target = node?.querySelector<HTMLButtonElement>('button');
    target?.focus();
  }, [visible]);

  const choose = useCallback((choice: 'accepted' | 'essential') => {
    setConsentChoice(choice);
    setVisible(false);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      // Escape dismisses to Essential-only: the privacy-safe default, never an
      // implicit Accept-all.
      if (event.key === 'Escape') choose('essential');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [visible, choose]);

  if (isAdmin || !visible) return null;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="consent-title"
      aria-describedby="consent-description"
      className="fixed inset-x-3 bottom-[13vh] z-50 motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:duration-300 md:inset-x-auto md:bottom-6 md:right-6 md:w-[380px]"
    >
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0C0E1C]/95">
        <h2 id="consent-title" className="text-sm font-bold text-slate-900 dark:text-white">
          {copy.title}
        </h2>
        <p id="consent-description" className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {copy.descriptionPrefix}
          <a href={`/${locale}/privacy`} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
            {copy.privacyPolicyLabel}
          </a>
          {copy.descriptionSuffix}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:brightness-105"
          >
            {copy.acceptAll}
          </button>
          <button
            type="button"
            onClick={() => choose('essential')}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            {copy.essentialOnly}
          </button>
        </div>
      </div>
    </div>
  );
}
