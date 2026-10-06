'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { landingContent } from '@/src/data/landingContent';
import { assembleLandingContent } from '@/lib/merge';
import { isPlainObject } from '@/lib/merge';
import { Locale, Theme, type LandingContent, type NavItem } from '@/src/types/landing';

// Component imports for narrative sections
import { Header } from '@/src/components/Header';
import { Hero } from '@/src/components/Hero';
import { ComplexitySection } from '@/src/components/ComplexitySection';
import { EcosystemSection } from '@/src/components/EcosystemSection';
import { MultiChannelSection } from '@/src/components/MultiChannelSection';
import { FulfillmentPipelineSection } from '@/src/components/FulfillmentPipelineSection';
import { LossPreventionSection } from '@/src/components/LossPreventionSection';
import { InventoryFinanceSection } from '@/src/components/InventoryFinanceSection';
import { PosShowroomSection } from '@/src/components/PosShowroomSection';
import { MarketingSection } from '@/src/components/MarketingSection';
import { TeamOperationsSection } from '@/src/components/TeamOperationsSection';
import { ExecutiveAnalyticsSection } from '@/src/components/ExecutiveAnalyticsSection';
import { CustomerProofSection } from '@/src/components/CustomerProofSection';
import { FaqSection } from '@/src/components/FaqSection';
import { PricingSection } from '@/src/components/PricingSection';
import { FinalConversionSection } from '@/src/components/FinalConversionSection';
import { Footer } from '@/src/components/Footer';
import { MobileStickyBar } from '@/src/components/MobileStickyBar';

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
 * taller than English in the same 16 sections, so the same `scrollY` lands on a different
 * paragraph — or past the end of the document, which silently clamps to the bottom. The
 * section `id`s are stable across locales, so an id survives the swap.
 *
 * The last section whose top is above the probe line wins, which is the section occupying the
 * top of the viewport. When nothing has scrolled past the hero, `sectionId` is `null` and the
 * caller restores the top of the page.
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
 *
 * `scrollIntoView` on the restored id, not `window.scrollTo(offset)`, because the section has
 * moved. When no section matched, the top of the page is the honest answer — restoring the
 * old pixel offset there would land mid-hero.
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

/**
 * The interactive shell of the landing page.
 *
 * `src/components/LandingPage.tsx` is the Server Component: it reads the DB-backed content
 * through the cached `lib/content.ts` helpers and hands the assembled payload in as
 * `initialContent`. Only the genuinely interactive state (theme, locale, pricing visibility)
 * lives here, so the data read is not dragged onto the client and can stay cached at the edge.
 */
export function LandingShell({
  initialLocale,
  initialContent,
  menu,
  footerMenu,
}: {
  /** The locale this render was produced for — `en` at `/` and `/en`, `bn` at `/bn`. */
  initialLocale: Locale;
  initialContent: LandingContent;
  /**
   * DB-managed `main` menu, or `null` when the table has no visible rows for this locale.
   * `null` falls back to `content.header.nav`; the shell never merges the two, because a
   * half-managed nav (some links from the DB, some hardcoded) is impossible to reason about
   * and impossible to un-edit.
   */
  menu: readonly NavItem[] | null;
  footerMenu: readonly NavItem[] | null;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [theme, setTheme] = useState<Theme>('light');
  // Pricing visibility is DB-driven (site_settings via /api/pricing). No local toggle in production.
  const isPricingVisible = true;
  const [content, setContent] = useState<LandingContent>(initialContent);

  // Which locales already hold DB-merged content, so a toggle does not refetch on every
  // flip back and forth. Seeded with the server-rendered locale so `/bn` does not refetch
  // the copy it already has.
  const loadedLocales = useRef<Set<Locale>>(new Set<Locale>([initialLocale]));
  const localeRef = useRef<Locale>(initialLocale);

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

  const handleToggleLocale = () => {
    const next: Locale = locale === 'en' ? 'bn' : 'en';
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
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

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

  return (
    <div className={`min-h-screen bg-[#F2F3F9] dark:bg-[#07080E] text-slate-900 dark:text-slate-100 selection:bg-indigo-600 selection:text-white transition-colors duration-200 ${locale === 'bn' ? 'font-bangla' : ''}`}>
      {/* Top Bar Navigation */}
      <Header
        content={content}
        locale={locale}
        theme={theme}
        navItems={menu}
        onToggleLocale={handleToggleLocale}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Flow — Streamlined, High-Converting Narrative */}
      <main>
        {/* Section 01: Hero with Integrated Convergence Bus & Live Console */}
        <Hero content={content} locale={locale} />

        {/* Section 02: Growth Creates Complexity — Chaos vs Control */}
        <ComplexitySection content={content} locale={locale} />

        {/* Section 03: One Business. One Control Center — 6 Pillars */}
        <EcosystemSection content={content} locale={locale} />

        {/* Section 04: Sell Everywhere — Master SKU Selective Routing */}
        <MultiChannelSection content={content} locale={locale} />

        {/* Section 05: The 5-Stage Physical Packing & Barcode Pipeline */}
        <FulfillmentPipelineSection content={content} locale={locale} />

        {/* Section 06: Courier Return Fraud & Loss Prevention Calculator + Mid-Funnel CTA */}
        <LossPreventionSection content={content} locale={locale} />

        {/* Section 07: Warehouses, Bin Locations & Double-Entry Accounting */}
        <InventoryFinanceSection content={content} locale={locale} />

        {/* Section 08: Showroom POS & Real-Time Cashier Simulation */}
        <PosShowroomSection content={content} locale={locale} />

        {/* Section 09: Server-Side Deduplicated Tracking Architecture */}
        <MarketingSection content={content} locale={locale} />

        {/* Section 10: Team Governance & RBAC Accountabilities */}
        <TeamOperationsSection content={content} locale={locale} />

        {/* Section 11: Executive Realized Profit Analytics & Courier Cohort Matrix */}
        <ExecutiveAnalyticsSection content={content} locale={locale} />

        {/* Section 12: Customer Proof & Verified Founder Stories */}
        <CustomerProofSection content={content} locale={locale} />

        {/* Section 13: Pricing (Supports Visible Tiered & Custom Architecture Modes) */}
        <PricingSection
          content={content}
          locale={locale}
          isPricingVisible={isPricingVisible}
        />

        {/* Section 14: Merchant Objection Handling FAQ */}
        <FaqSection content={content} locale={locale} />

        {/* Section 15: Final Conversion & Direct Multi-Channel Contact */}
        <FinalConversionSection content={content} locale={locale} />
      </main>

      {/* Section 16: Footer */}
      <Footer
        content={content}
        locale={locale}
        menu={footerMenu}
        onToggleLocale={handleToggleLocale}
      />

      {/* Mobile-Only Persistent Sticky Conversion Bar (< 15% Viewport Height) */}
      <MobileStickyBar content={content} locale={locale} />


    </div>
  );
}
