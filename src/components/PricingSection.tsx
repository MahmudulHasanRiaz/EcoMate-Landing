import React, { useState } from 'react';
import { LandingContent, Locale, PricingPlan } from '../types/landing';
import { Check, ArrowRight, ShieldCheck, Sparkles, Building2, HelpCircle } from 'lucide-react';

interface PricingSectionProps {
  content: LandingContent;
  locale: Locale;
  isPricingVisible?: boolean;
  onTogglePricingMode?: () => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  content,
  locale,
  isPricingVisible = true,
  onTogglePricingMode,
}) => {
  const [annualBilling, setAnnualBilling] = useState<boolean>(true);

  return (
    <section id="pricing" className="relative py-20 md:py-28 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#080910] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{content.pricing.eyebrow}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
              {content.pricing.heading}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
              {content.pricing.subheading}
            </p>
          </div>

          {/* Prototype Mode Switcher (Visible vs Contact Sales Architecture) */}
          {onTogglePricingMode && (
            <div className="flex items-center gap-2 self-start md:self-auto p-1.5 rounded-xl bg-slate-100 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400 shadow-2xs">
              <span className="text-[11px] font-mono px-2 font-medium">Admin Setting:</span>
              <button
                onClick={onTogglePricingMode}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 hover:bg-indigo-100 dark:hover:bg-indigo-600/40 transition-colors font-semibold cursor-pointer"
              >
                {isPricingVisible ? 'Toggle to Hidden / Contact Mode' : 'Toggle to Visible Tiered Mode'}
              </button>
            </div>
          )}
        </div>

        {/* MODE 1: PRICING VISIBLE */}
        {isPricingVisible ? (
          <div>
            {/* Monthly / Annual Toggle */}
            <div className="flex justify-center mb-12">
              <div className="inline-flex items-center p-1 rounded-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 shadow-xs">
                <button
                  onClick={() => setAnnualBilling(false)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    !annualBilling
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {content.pricing.visiblePricing.monthlyToggle}
                </button>
                <button
                  onClick={() => setAnnualBilling(true)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer ${
                    annualBilling
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{content.pricing.visiblePricing.annualToggle}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-400 text-slate-950 font-bold">
                    -20%
                  </span>
                </button>
              </div>
            </div>

            {/* 3 Tier Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {content.pricing.visiblePricing.plans.map((plan: PricingPlan) => {
                const price = annualBilling ? plan.annualPrice : plan.monthlyPrice;
                const isPopular = plan.popular;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl sm:rounded-3xl border p-6 sm:p-8 flex flex-col justify-between transition-all relative ${
                      isPopular
                        ? 'border-indigo-500 bg-gradient-to-b from-indigo-50/70 to-white dark:from-[#111327] dark:to-[#0C0E1B] shadow-xl shadow-indigo-100/60 dark:shadow-[0_0_50px_rgba(99,102,241,0.25)] scale-[1.02] ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-white dark:border-white/[0.08] dark:bg-[#0C0E1B] hover:border-slate-300 dark:hover:border-white/20 shadow-md shadow-slate-100 dark:shadow-none'
                    }`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
                        Recommended for Scaling Brands
                      </div>
                    )}

                    <div>
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                          {plan.tierSubtitle}
                        </p>
                      </div>

                      {/* Price Display with Tabular Numerals */}
                      <div className="flex items-baseline gap-1 my-6 pb-6 border-b border-slate-200 dark:border-white/[0.08]">
                        <span className="text-2xl font-bold text-slate-500 dark:text-slate-400 font-mono">
                          {plan.currency}
                        </span>
                        <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white font-mono-numbers">
                          {price.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">/ month</span>
                      </div>

                      {/* Volume & Scale Limits */}
                      <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 mb-6 p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200/80 dark:border-white/[0.04]">
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Order Volume:</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">{plan.orderVolume}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Staff Access:</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">{plan.usersIncluded}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Showroom POS:</span>
                          <span className="font-bold text-slate-900 dark:text-white font-mono">{plan.showroomsIncluded}</span>
                        </div>
                      </div>

                      {/* Included Feature List */}
                      <div className="space-y-3 text-xs mb-8">
                        <span className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider block">
                          Included Capabilities
                        </span>
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tier CTA */}
                    <div>
                      <a
                        href="#lead-form"
                        className={`w-full py-3.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isPopular
                            ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-300/50 hover:brightness-105'
                            : 'bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 dark:bg-white/[0.05] dark:border-white/10 dark:text-white dark:hover:bg-white/10'
                        }`}
                      >
                        <span>{plan.ctaLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* MODE 2: PRICING HIDDEN / CONTACT SALES */
          <div className="rounded-3xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-b from-indigo-50/70 to-white dark:from-[#111327] dark:to-[#0C0E1B] p-8 sm:p-12 shadow-xl shadow-indigo-100/50 max-w-4xl mx-auto">
            <div className="max-w-2xl">
              <span className="text-xs font-mono uppercase tracking-wider text-indigo-700 dark:text-indigo-400 font-bold">
                Custom Architecture Consultation
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-2 leading-tight">
                {content.pricing.hiddenPricing.heading}
              </h3>
              <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {content.pricing.hiddenPricing.subheading}
              </p>

              <div className="mt-8 space-y-3">
                {content.pricing.hiddenPricing.points.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 font-medium">
                    <div className="h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                    <span>{pt}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <a
                  href="#lead-form"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-300/50 hover:brightness-105 transition-all cursor-pointer"
                >
                  <span>{content.pricing.hiddenPricing.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
