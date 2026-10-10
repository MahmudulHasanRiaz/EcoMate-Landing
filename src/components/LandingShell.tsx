'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useLanding } from '@/components/shell/useLanding';

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
import {
  AdBudgetDefenseSection,
  GettingStartedSection,
  LogisticsAutomationSection,
  PackingWorkspaceSection,
  RevenueProtectionSection,
  StatsBarSection,
  StoreSwitchesSection,
  TrustedBySection,
  WhyDifferentSection,
} from '@/src/components/V2Sections';

/**
 * The interactive marketing composition, reading everything from the shell context.
 *
 * Data seeding lives outside this component: `src/components/LandingPage.tsx` (the
 * self-contained `/`) and `app/[locale]/layout.tsx` (`/en`, `/bn`) each fetch through
 * the cached `lib/content.ts` helpers and seed `LocaleThemeProvider`. Locale/theme
 * interaction state, the locale-switch behaviour (scroll-anchor preserve, static-then-
 * `/api/content` upgrade, `document.lang` / dark-class sync) and the resolved content
 * all come from `useLanding()` — this component only composes.
 */
export function LandingShell() {
  const { locale } = useLanding();

  return (
    <div className={`min-h-screen bg-[#F2F3F9] dark:bg-[#07080E] text-slate-900 dark:text-slate-100 selection:bg-indigo-600 selection:text-white transition-colors duration-200 ${locale === 'bn' ? 'font-bangla' : ''}`}>
      {/* Top Bar Navigation */}
      <Header />

      {/* Main Content Flow — Streamlined, High-Converting Narrative */}
      <main>
        {/* Section 01: Hero with Integrated Convergence Bus & Live Console */}
        <Hero />

        {/* v2: Stats bar */}
        <StatsBarSection />

        {/* v2: Trusted-by strip */}
        <TrustedBySection />

        {/* Section 02: Growth Creates Complexity — Chaos vs Control (fragmented reality before/after) */}
        <ComplexitySection />

        {/* v2: Packing workspace interactive scan demo */}
        <PackingWorkspaceSection />

        {/* v2: Revenue protection policy toggles */}
        <RevenueProtectionSection />

        {/* v2: Logistics automation courier booking demo */}
        <LogisticsAutomationSection />

        {/* v2: Ad budget defense CAPI mode selector */}
        <AdBudgetDefenseSection />

        {/* Attribution ROAS panel — Executive Realized Profit Analytics & Courier Cohort Matrix */}
        <ExecutiveAnalyticsSection />

        {/* v2: Multi-store & showroom toggle switches demo */}
        <StoreSwitchesSection />

        {/* v2: Why-different feature grid (renders CMS productShowcase modules) */}
        <WhyDifferentSection />

        {/* Section 03: One Business. One Control Center — 6 Pillars (infrastructure) */}
        <EcosystemSection />

        {/* Section 04: Sell Everywhere — Master SKU Selective Routing */}
        <MultiChannelSection />

        {/* Section 05: The 5-Stage Physical Packing & Barcode Pipeline */}
        <FulfillmentPipelineSection />

        {/* Section 06: Courier Return Fraud & Loss Prevention Calculator + Mid-Funnel CTA */}
        <LossPreventionSection />

        {/* Financial clarity — Warehouses, Bin Locations & Double-Entry Accounting */}
        <InventoryFinanceSection />

        {/* Section 08: Showroom POS & Real-Time Cashier Simulation */}
        <PosShowroomSection />

        {/* Section 09: Server-Side Deduplicated Tracking Architecture */}
        <MarketingSection />

        {/* Section 10: Team Governance & RBAC Accountabilities */}
        <TeamOperationsSection />

        {/* v2: Getting started in 3 steps */}
        <GettingStartedSection />

        {/* Section 12: Customer Proof & Verified Founder Stories */}
        <CustomerProofSection />

        {/* Section 13: Pricing (Supports Visible Tiered & Custom Architecture Modes) */}
        <PricingSection />

        {/* Section 14: Merchant Objection Handling FAQ */}
        <FaqSection />

        {/* Section 15: Final Conversion & Direct Multi-Channel Contact */}
        <FinalConversionSection />
      </main>

      {/* Section 16: Footer */}
      <Footer />

      {/* Mobile-Only Persistent Sticky Conversion Bar (< 15% Viewport Height) */}
      <MobileStickyBar />


    </div>
  );
}
