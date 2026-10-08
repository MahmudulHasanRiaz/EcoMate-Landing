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
 * Locale-switch behaviour moved here from `LandingShell`: scroll-anchor preserve (section
 * identity, not pixels — Bangla copy is taller), static-then-`/api/content` upgrade, and
 * `document.lang` / dark-class sync.
 */

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LandingContent, Locale, NavItem, Theme } from '@/src/types/landing';
import type { PublicTestimonial } from '@/lib/content';
import { landingContent } from '@/src/data/landingContent';
import { assembleLandingContent, isPlainObject } from '@/lib/merge';

export interface ShellValue {
  locale: Locale;
  theme: Theme;
  /** Already merged static fallback + DB rows for the active locale. */
  content: LandingContent;
  /** DB-managed `main` menu for the seed locale, or `null` → fall back to `content.header.nav`. */
  menu: readonly NavItem[] | null;
  /** DB-managed `footer` menu for the seed locale, or `null` → hardcoded footer links. */
  footerMenu: readonly NavItem[] | null;
  /** Published DB testimonials (2c), or `null` → the section renders static proof copy. */
  testimonials: readonly PublicTestimonial[] | null;
  /** `site_settings.is_pricing_visible` at seed time; PricingSection renders hidden mode when false. */
  isPricingVisible: boolean;
  toggleLocale: () => void;
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
  children,
}: {
  initialLocale: Locale;
  initialContent: LandingContent;
  initialMenu: readonly NavItem[] | null;
  initialFooterMenu: readonly NavItem[] | null;
  initialTestimonials: readonly PublicTestimonial[] | null;
  initialIsPricingVisible: boolean;
  children: React.ReactNode;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [theme, setTheme] = useState<Theme>('light');
  const [content, setContent] = useState<LandingContent>(initialContent);
  // Pricing visibility is DB-driven (site_settings via /api/pricing). No local toggle in production.
  const isPricingVisible = initialIsPricingVisible;

  // Which locales already hold DB-merged content, so a toggle does not refetch on every
  // flip back and forth. Seeded with the server-rendered locale so `/bn` does not refetch
  // the copy it already has.
  const loadedLocales = useRef<Set<Locale>>(new Set<Locale>([initialLocale]));
  const localeRef = useRef<Locale>(initialLocale);

  // A cross-locale client navigation (`/en` → `/bn`) reuses this mounted provider with new
  // seed props — `useState` does not pick those up, so re-seed explicitly. A client toggle
  // never changes `initialLocale` and is unaffected.
  useEffect(() => {
    localeRef.current = initialLocale;
    loadedLocales.current = new Set<Locale>([initialLocale]);
    setLocale(initialLocale);
    setContent(initialContent);
  }, [initialLocale, initialContent]);

  const loadLocaleContent = useCallback(async (target: Locale) => {
    try {
      const response = await fetch(`/api/content?locale=${target}`);
      if (!response.ok) return;
      const payload: unknown = await response.json();
      // Deep-merge the DB payload over the static copy for that locale. A malformed
      // response leaves the static content in place — the page must never blank out
      // because a JSON body was a string.
      const merged = assembleLandingContent(target, isPlainObject(payload) ? payload : null);
      loadedLocales.current.add(target);
      if (localeRef.current === target) setContent(merged);
    } catch {
      // Offline / DB outage: the static fallback already rendered, so there is nothing to
      // do and nothing to tell the visitor.
    }
  }, []);

  const toggleLocale = useCallback(() => {
    const next: Locale = localeRef.current === 'en' ? 'bn' : 'en';
    // Read the anchor *before* any state change: the switch swaps the whole document body,
    // so after it lands the previous scroll offset points at an arbitrary section.
    const anchor = captureScrollAnchor();
    localeRef.current = next;
    setLocale(next);
    // Switch to the static copy immediately (no empty state / layout jump), then upgrade
    // to the DB payload when it arrives.
    setContent(landingContent[next]);
    if (!loadedLocales.current.has(next)) void loadLocaleContent(next);
    restoreScrollAnchor(anchor);
  }, [loadLocaleContent]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
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
      menu: initialMenu,
      footerMenu: initialFooterMenu,
      testimonials: initialTestimonials,
      isPricingVisible,
      toggleLocale,
      toggleTheme,
    }),
    [locale, theme, content, initialMenu, initialFooterMenu, initialTestimonials, isPricingVisible, toggleLocale, toggleTheme],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}
