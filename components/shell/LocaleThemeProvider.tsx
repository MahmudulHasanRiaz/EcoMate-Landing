'use client';

/**
 * Locale + theme + resolved landing content, as one client context (Task 23, revised Option A).
 *
 * The shell lives in `app/[locale]/layout.tsx`, NOT the root layout: layouts never receive
 * child `[locale]` params, so one `initialContent` in the root layout would serve English
 * chrome on `/bn`. The locale layout awaits `params`, reads `getLandingContent(locale)` +
 * menus for that locale through the single `'use cache'` boundary (`lib/content.ts`),
 * assembles via `lib/merge.ts`, and seeds this provider. `/` (`app/page.tsx`) keeps its
 * own self-contained `LandingPage` → `LandingShell` render, so the published sales URL is
 * byte-for-byte identical.
 *
 * This provider renders NO DOM of its own — just the context — so non-marketing routes
 * under `[locale]` (blog articles, case studies, legal pages) keep rendering exactly what
 * they render today. The marketing chrome (Header / sections / Footer / MobileStickyBar)
 * reads from the context in `src/components/LandingShell.tsx`.
 *
 * Server-seeded initial values carried here: `menu` + `footerMenu` (DB-managed navigation
 * per locale; Header/Footer need them) and `isPricingVisible` (site-settings toggle;
 * PricingSection needs it). `locale`/`theme` stay client state on purpose — they are
 * interaction state, not data.
 *
 * Locale-switch behaviour (Decision 15): the toggle navigates to `/{locale}` via the
 * client router — the URL carries the language, and the locale layout re-seeds
 * server-merged content for the new locale. Scroll-anchor preserve (section identity,
 * not pixels — Bangla copy is taller), theme persistence, and `document.lang` /
 * dark-class sync live here.
 */

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LandingContent, Locale, NavItem, Theme } from '@/src/types/landing';
import type { PublicTestimonial, SiteBranding } from '@/lib/content';

export interface ShellValue {
  locale: Locale;
  theme: Theme;
  /** Already merged static fallback + DB rows for the active locale. */
  content: LandingContent;
  /** Site branding (`site_settings`), or `null` → built-in logo mark + globe favicon. */
  branding: SiteBranding | null;
  /** DB-managed `main` menu for the seed locale, or `null` → fall back to `content.header.nav`. */
  menu: readonly NavItem[] | null;
  /** DB-managed `footer` menu for the seed locale, or `null` → hardcoded footer links. */
  footerMenu: readonly NavItem[] | null;
  /** Published DB testimonials (2c), or `null` → the section renders static proof copy. */
  testimonials: readonly PublicTestimonial[] | null;
  /** `site_settings.is_pricing_visible` at seed time; PricingSection renders hidden mode when false. */
  isPricingVisible: boolean;
  toggleLocale: () => void;
  /** Warm the alternate locale route (hover/focus hook for the language toggle). */
  prefetchLocale: () => void;
  toggleTheme: () => void;
}

export const ShellContext = createContext<ShellValue | null>(null);

/**
 * How close to the top of the viewport an element counts as "the section the visitor is in".
 * Matches the sticky header height so the section a visitor *reads* is the one restored, not
 * the one peeking above the header.
 */
const ANCHOR_PROBE_OFFSET = 120;

/** What a locale switch needs to put the visitor back where they were. */
interface ScrollAnchor {
  /** `id` of the section under the header, or `null` when there is no section (top of page). */
  sectionId: string | null;
  /** Raw `scrollY`, used when no section matched, and to re-sync after the document resizes. */
  offsetY: number;
  /** `hash` in the URL, so a copied `/` link to `#pricing` survives a switch too. */
  hash: string;
}

/**
 * Record where on the page the visitor is, as a *section identity* rather than a pixel
 * offset.
 *
 * A pixel offset is the obvious thing to save and the wrong thing to restore: Bangla copy is
 * taller than English in the same sections, so the same `scrollY` lands on a different
 * paragraph — or past the end of the document, which silently clamps to the bottom. The
 * section `id`s are stable across locales, so an id survives the swap.
 */
function captureScrollAnchor(): ScrollAnchor {
  if (typeof window === 'undefined') {
    return { sectionId: null, offsetY: 0, hash: '' };
  }
  const sections = Array.from(document.querySelectorAll<HTMLElement>('section[id], main [id]'));
  let sectionId: string | null = null;
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= ANCHOR_PROBE_OFFSET) sectionId = section.id;
    else break;
  }
  return { sectionId, offsetY: window.scrollY, hash: window.location.hash };
}

/**
 * Put the visitor back on the same section after the locale swap.
 *
 * Deferred through two animation frames on purpose: the language switch re-renders the whole
 * tree and the Bangla glyphs (`--font-bangla`) are applied by the same commit, so measuring
 * in the frame the click handler returns from reads the *old* layout. `requestAnimationFrame`
 * inside `requestAnimationFrame` lands after layout and after paint, which is the first
 * moment the new document has a measurable height.
 */
function restoreScrollAnchor(anchor: ScrollAnchor): void {
  if (typeof window === 'undefined') return;

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // A `hash` in the URL is an explicit deep link and always wins: the visitor asked for
      // that section by name, not by position.
      const targetId = anchor.hash.startsWith('#') ? anchor.hash.slice(1) : anchor.sectionId;
      const target = targetId ? document.getElementById(targetId) : null;

      if (target) {
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }
      // `behavior: 'instant'` rather than `'smooth'`: the scroll is already the visitor's own
      // position being put back, and animating it reads as the page lurching.
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
  });
}

export function LocaleThemeProvider({
  initialLocale,
  initialContent,
  initialMenu,
  initialFooterMenu,
  initialTestimonials,
  initialIsPricingVisible,
  initialBranding,
  children,
}: {
  initialLocale: Locale;
  initialContent: LandingContent;
  initialMenu: readonly NavItem[] | null;
  initialFooterMenu: readonly NavItem[] | null;
  initialTestimonials: readonly PublicTestimonial[] | null;
  initialIsPricingVisible: boolean;
  initialBranding: SiteBranding | null;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>(initialLocale);
  // M-31: theme persists across reloads. Lazy initializer (client-only read, no SSR
  // mismatch — this provider never server-renders differing markup from it, the class
  // sync effect below applies it to `documentElement` after mount).
  //
  // v3: dark is the default (the design is dark-first). Only an explicit stored
  // 'light' choice renders light; anything else (unset, private-mode denial) is dark.
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return window.localStorage.getItem('ecomate-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  const [content, setContent] = useState<LandingContent>(initialContent);
  // Pricing visibility is DB-driven (site_settings via /api/pricing). No local toggle in production.
  const isPricingVisible = initialIsPricingVisible;

  const localeRef = useRef<Locale>(initialLocale);

  // A cross-locale client navigation (`/en` → `/bn`) reuses this mounted provider with new
  // seed props — `useState` does not pick those up, so re-seed explicitly. A same-locale
  // re-render never changes `initialLocale` and is unaffected.
  useEffect(() => {
    localeRef.current = initialLocale;
    setLocale(initialLocale);
    setContent(initialContent);
  }, [initialLocale, initialContent]);

  // The alternate locale route, prefetched at idle (and on toggle hover) so the
  // next navigation serves a warm RSC payload instead of a cold server render.
  const prefetchAlternate = useCallback(() => {
    const next: Locale = localeRef.current === 'en' ? 'bn' : 'en';
    try {
      router.prefetch(`/${next}`);
    } catch {
      // Prefetch is advisory: a failure must never break the toggle itself.
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (typeof idle === 'function') {
      const id = idle(() => prefetchAlternate());
      return () => {
        try {
          window.cancelIdleCallback(id);
        } catch {
          // teardown best-effort only
        }
      };
    }
    const timer = setTimeout(() => prefetchAlternate(), 1500);
    return () => clearTimeout(timer);
  }, [prefetchAlternate]);

  // Decision 15 (M-29): the toggle navigates to `/{locale}` instead of swapping client
  // state. The URL carries the language — share/bookmark/crawl/hreflang all agree — and
  // the locale layout re-seeds server-merged content, so there is no stale-locale flash
  // (M-30): the old locale stays painted until the new route is ready.
  //
  // v3 polish: `scroll: false` keeps the browser at the current offset (no
  // scroll-to-top flash before the anchor restore), and the alternate route is
  // prefetched above, so the swap reads warm.
  const toggleLocale = useCallback(() => {
    const next: Locale = localeRef.current === 'en' ? 'bn' : 'en';
    // Read the anchor *before* navigating: the switch swaps the whole document body,
    // so afterwards the previous scroll offset points at an arbitrary section.
    const anchor = captureScrollAnchor();
    localeRef.current = next;
    router.push(`/${next}`, { scroll: false });
    restoreScrollAnchor(anchor);
  }, [router]);

  const prefetchLocale = useCallback(() => {
    prefetchAlternate();
  }, [prefetchAlternate]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      try {
        window.localStorage.setItem('ecomate-theme', next);
      } catch {
        // Private-mode storage denial must not break the toggle.
      }
      return next;
    });
  }, []);

  // Sync document language attribute
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Sync document class list for light/dark theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // `menu` / `footerMenu` / `testimonials` flow straight from the seed props (no client
  // state): a locale toggle keeps the seed locale's navigation, exactly as `LandingShell`
  // did before the extraction — the header falls back to `content.header.nav` when the
  // table is empty, and the proof section falls back to static copy with no testimonials.
  const value = useMemo<ShellValue>(
    () => ({
      locale,
      theme,
      content,
      branding: initialBranding,
      menu: initialMenu,
      footerMenu: initialFooterMenu,
      testimonials: initialTestimonials,
      isPricingVisible,
      toggleLocale,
      prefetchLocale,
      toggleTheme,
    }),
    [locale, theme, content, initialBranding, initialMenu, initialFooterMenu, initialTestimonials, isPricingVisible, toggleLocale, prefetchLocale, toggleTheme],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}
