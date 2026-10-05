/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { landingContent } from './data/landingContent';
import { Locale, Theme } from './types/landing';

// Component imports for all 16 narrative sections
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
import { ProductInActionSection } from './components/ProductInActionSection';
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

      {/* Main Content Flow — 16 Narrative Sections */}
      <main>
        {/* Section 01: Hero */}
        <Hero content={content} locale={locale} />

        {/* Section 02: Growth Creates Complexity */}
        <ComplexitySection content={content} locale={locale} />

        {/* Section 03: One Business. One Control Center */}
        <EcosystemSection content={content} locale={locale} />

        {/* Section 04: Sell Everywhere. Manage Everything From One Place */}
        <MultiChannelSection content={content} locale={locale} />

        {/* Section 05: From Order to Delivery (The 7/8-Step Connected Fulfillment Pipeline) */}
        <FulfillmentPipelineSection content={content} locale={locale} />

        {/* Section 06: Prevent Mistakes. Protect Your Money (Economics & Calculator) */}
        <LossPreventionSection content={content} locale={locale} />

        {/* Section 07: Know Your Stock. Know Your Money (Warehouses, COGS, Ledger) */}
        <InventoryFinanceSection content={content} locale={locale} />

        {/* Section 08: Online + Physical Business (Multi-Showroom POS & Split Payments) */}
        <PosShowroomSection content={content} locale={locale} />

        {/* Section 09: Marketing That You Can Actually Measure (Server-Side CAPI & Feeds) */}
        <MarketingSection content={content} locale={locale} />

        {/* Section 10: Your Team, Organized (RBAC, Shifts, Attendance, Commissions) */}
        <TeamOperationsSection content={content} locale={locale} />

        {/* Section 11: See the Business Clearly (Executive Realized Profit Analytics) */}
        <ExecutiveAnalyticsSection content={content} locale={locale} />

        {/* Section 12: Customer Proof (Verifiable Case Studies & Video Walkthrough) */}
        <CustomerProofSection content={content} locale={locale} />

        {/* Section 13: Product in Action (Cinematic Interactive Tour & Problem Solver) */}
        <ProductInActionSection content={content} locale={locale} />

        {/* Section 14: Dynamic Pricing (Supports Visible Tiered & Custom Architecture Modes) */}
        <PricingSection
          content={content}
          locale={locale}
          isPricingVisible={isPricingVisible}
          onTogglePricingMode={handleTogglePricingMode}
        />

        {/* Section 15: Final Conversion (Streamlined Demo Booking & Direct WhatsApp/Call) */}
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
