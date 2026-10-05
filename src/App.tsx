/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { landingContent } from './data/landingContent';
import { Locale, Theme } from './types/landing';

// Component imports for narrative sections
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ComplexitySection } from './components/ComplexitySection';
import { EcosystemSection } from './components/EcosystemSection';
import { MultiChannelSection } from './components/MultiChannelSection';
import { FulfillmentPipelineSection } from './components/FulfillmentPipelineSection';
import { LossPreventionSection } from './components/LossPreventionSection';
import { InventoryFinanceSection } from './components/InventoryFinanceSection';
import { PosShowroomSection } from './components/PosShowroomSection';
import { MarketingSection } from './components/MarketingSection';
import { TeamOperationsSection } from './components/TeamOperationsSection';
import { ExecutiveAnalyticsSection } from './components/ExecutiveAnalyticsSection';
import { CustomerProofSection } from './components/CustomerProofSection';
import { FaqSection } from './components/FaqSection';
import { PricingSection } from './components/PricingSection';
import { FinalConversionSection } from './components/FinalConversionSection';
import { Footer } from './components/Footer';
import { MobileStickyBar } from './components/MobileStickyBar';
import { PrototypeController } from './components/PrototypeController';
import { AdminPanel } from './components/admin/AdminPanel';

export default function App() {
  const [locale, setLocale] = useState<Locale>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [isPricingVisible, setIsPricingVisible] = useState<boolean>(true);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);

  const content = landingContent[locale];

  const handleToggleLocale = () => {
    setLocale((prev) => (prev === 'en' ? 'bn' : 'en'));
  };

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleTogglePricingMode = () => {
    setIsPricingVisible((prev) => !prev);
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
    <div className={`min-h-screen bg-[#F8FAFC] dark:bg-[#07080E] text-slate-900 dark:text-slate-100 selection:bg-indigo-600 selection:text-white transition-colors duration-200 ${locale === 'bn' ? 'font-bangla' : ''}`}>
      {/* Top Bar Navigation */}
      <Header
        content={content}
        locale={locale}
        theme={theme}
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
          onTogglePricingMode={handleTogglePricingMode}
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
        onToggleLocale={handleToggleLocale}
      />

      {/* Mobile-Only Persistent Sticky Conversion Bar (< 15% Viewport Height) */}
      <MobileStickyBar content={content} locale={locale} />

      {/* Floating Evaluation Controller for Prototype Reviewers */}
      <PrototypeController
        locale={locale}
        onToggleLocale={handleToggleLocale}
        isPricingVisible={isPricingVisible}
        onTogglePricingMode={handleTogglePricingMode}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      {/* Full-Stack EcoMate CMS & Database Admin Modal */}
      {isAdminOpen && (
        <AdminPanel
          onClose={() => setIsAdminOpen(false)}
          locale={locale}
          theme={theme}
        />
      )}
    </div>
  );
}
