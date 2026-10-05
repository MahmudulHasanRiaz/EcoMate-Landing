import React from 'react';
import { LandingContent, Locale } from '../types/landing';
import { TrendingUp, CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';

interface MarketingSectionProps {
  content: LandingContent;
  locale: Locale;
}

export const MarketingSection: React.FC<MarketingSectionProps> = ({ content, locale }) => {
  return (
    <section id="marketing" className="relative py-20 md:py-28 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#07080E] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-3">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{content.marketing.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.marketing.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.marketing.subheading}
          </p>
        </div>

        {/* 4 Server-Side Marketing Integrations */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          {content.marketing.features.map((feature, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#0C0E1B] p-6 sm:p-7 flex flex-col justify-between hover:border-rose-300 dark:hover:border-rose-500/30 transition-all shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                    {feature.type}
                  </span>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">● Server Connected</span>
                </div>

                <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {feature.platform}
                </h3>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feature.benefit}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Deduplicated Purchase Events</span>
                <span className="text-slate-900 dark:text-white font-mono font-semibold">EMQ 9.2/10 Match</span>
              </div>
            </div>
          ))}
        </div>

        {/* Business-Level Attribution Callout */}
        <div className="mt-8 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/10 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="h-12 w-12 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-rose-950 dark:text-white">
                "{content.marketing.attributionQuote}"
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                EcoMate bridges the gap between ad click telemetry and real money collected by your courier trucks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
