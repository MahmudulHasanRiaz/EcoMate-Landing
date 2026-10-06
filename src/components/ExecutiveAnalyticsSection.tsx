import React from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { BarChart3, TrendingUp, DollarSign, CheckCircle2, ArrowUpRight } from 'lucide-react';

export const ExecutiveAnalyticsSection: React.FC = () => {
  const { content } = useLanding();
  return (
    <section id="analytics" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#07080E] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2 sm:mb-3">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{content.analytics.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.analytics.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.analytics.subheading}
          </p>
        </div>

        {/* 4 Core Financial & Operational Metric Cards */}
        <div className="mt-8 sm:mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {content.analytics.metrics.map((metric, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#0C0E1B] p-4 sm:p-6 hover:border-indigo-400 dark:hover:border-indigo-500/30 transition-all flex flex-col justify-between shadow-2xs"
            >
              <div>
                <span className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 font-semibold">{metric.label}</span>
                <p className="mt-1.5 sm:mt-2 text-xl sm:text-3xl font-bold text-slate-900 dark:text-white font-mono-numbers">
                  {metric.value}
                </p>
                {metric.subtext && (
                  <p className="mt-1 text-[11px] sm:text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                    {metric.subtext}
                  </p>
                )}
              </div>

              {metric.trend && (
                <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-[11px] sm:text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold">{metric.trend}</span>
                  <span className="text-[10px] text-slate-600 uppercase font-mono font-medium hidden sm:inline dark:text-slate-300">Verified Metric</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Channel Contribution & Delivery Success Decomposition */}
        <div className="mt-6 sm:mt-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0B0D19] p-5 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            <div className="lg:col-span-7 space-y-3 sm:space-y-4">
              <span className="text-[10px] sm:text-xs font-mono text-indigo-700 dark:text-indigo-400 uppercase tracking-wider font-semibold">
                Decomposed Revenue Attribution
              </span>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                Gross Inflow vs Net Realized Cash.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Most platforms display vanity order values without factoring in cancelled packages, rejected deliveries, or return shipping penalties. EcoMate calculates your true bottom-line margin only after courier settlements are finalized.
              </p>

              <div className="space-y-2 pt-1 text-xs">
                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-medium">
                  <span>WooCommerce Online Channel (Delivered)</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">58% of Total Volume</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 sm:h-2">
                  <div className="bg-indigo-600 h-1.5 sm:h-2 rounded-full" style={{ width: '58%' }} />
                </div>

                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-medium pt-1.5">
                  <span>Gulshan Flagship Showroom POS</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">28% of Total Volume</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 sm:h-2">
                  <div className="bg-purple-600 h-1.5 sm:h-2 rounded-full" style={{ width: '28%' }} />
                </div>

                <div className="flex justify-between items-center text-slate-700 dark:text-slate-300 font-medium pt-1.5">
                  <span>Dhanmondi Retail Outlet POS</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">14% of Total Volume</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 sm:h-2">
                  <div className="bg-emerald-600 h-1.5 sm:h-2 rounded-full" style={{ width: '14%' }} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-black/40 p-4 sm:p-5 space-y-2.5 text-xs shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-2 text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-900 dark:text-white">Courier Performance Matrix</span>
                <span className="font-mono text-[10px] sm:text-[11px]">30-Day Cohort</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-transparent">
                  <span className="font-semibold text-slate-900 dark:text-slate-200">Steadfast Courier</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">92.6% Success (1.8d avg)</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-transparent">
                  <span className="font-semibold text-slate-900 dark:text-slate-200">Pathao Logistics</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">91.2% Success (1.6d avg)</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-transparent">
                  <span className="font-semibold text-slate-900 dark:text-slate-200">RedX Delivery</span>
                  <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">89.4% Success (2.2d avg)</span>
                </div>
              </div>

              <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-400 pt-1.5 font-medium">
                Real-time delivery score auto-routes shipments to the fastest performing courier in each district.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
