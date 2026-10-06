import React from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { TrendingUp, CheckCircle2, ShieldCheck, Database, Layers } from 'lucide-react';

export const MarketingSection: React.FC = () => {
  const { content, locale } = useLanding();
  return (
    <section id="marketing" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#07080E] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-2 sm:mb-3">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{content.marketing.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.marketing.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.marketing.subheading}
          </p>
        </div>

        {/* Server-Side Conversion Telemetry Architecture Flow */}
        <div className="mt-8 sm:mt-12 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-gradient-to-br from-rose-50/50 via-white to-purple-50/30 dark:from-[#110B18] dark:via-[#090A14] dark:to-[#07080F] p-4 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-rose-200/60 dark:border-white/[0.08] pb-3 mb-5">
            <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              {locale === 'en' ? 'Server-Side Deduplicated Tracking Architecture' : 'সার্ভার-সাইড ট্র্যাকিং আর্কিটেকচার'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-semibold">
              ● EMQ Quality Score 9.4/10
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Stage 1: Ad Click */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-mono text-rose-700 dark:text-rose-400 font-bold block mb-1">DATA STAGE 01</span>
              <p className="font-bold text-slate-900 dark:text-white">Customer Ad Click</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Meta / TikTok sponsored click</p>
              <div className="mt-2 text-[10px] font-mono text-slate-600 dark:text-slate-400">fbp / fbc clickID captured</div>
            </div>

            {/* Stage 2: Browser Adblocker bypass */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold block mb-1">DATA STAGE 02</span>
              <p className="font-bold text-slate-900 dark:text-white">iOS & AdBlock Immunity</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Bypasses Safari 7-day cookie limits</p>
              <div className="mt-2 text-[10px] font-mono text-purple-600 dark:text-purple-400 font-semibold">1st-Party Domain Cookied</div>
            </div>

            {/* Stage 3: EcoMate Server Dispatch */}
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-300 dark:border-rose-500/30 shadow-2xs">
              <span className="text-[10px] font-mono text-rose-700 dark:text-rose-400 font-bold block mb-1">DATA STAGE 03</span>
              <p className="font-bold text-slate-900 dark:text-white">Server-Side CAPI Event</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">Dispatched directly from backend</p>
              <div className="mt-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">PURCHASE MATCHED</div>
            </div>

            {/* Stage 4: Net Real Cash ROAS */}
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-emerald-300 dark:border-emerald-500/30 shadow-2xs">
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold block mb-1">DATA STAGE 04</span>
              <p className="font-bold text-slate-900 dark:text-white">True Net Cash ROAS</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Subtracts courier returns automatically</p>
              <div className="mt-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">REAL PROFIT VISIBILITY</div>
            </div>
          </div>
        </div>

        {/* 4 Server-Side Marketing Integrations */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {content.marketing.features.map((feature, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0C0E1B] p-5 sm:p-7 flex flex-col justify-between hover:border-rose-300 dark:hover:border-rose-500/30 transition-all shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] sm:text-xs font-mono font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                    {feature.type}
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-mono font-semibold">● Server Connected</span>
                </div>

                <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white mb-1.5">
                  {feature.platform}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feature.benefit}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                <span>Deduplicated Purchase Events</span>
                <span className="text-slate-900 dark:text-white font-mono font-semibold">EMQ 9.2/10 Match</span>
              </div>
            </div>
          ))}
        </div>

        {/* Business-Level Attribution Callout */}
        <div className="mt-6 sm:mt-8 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/10 p-5 sm:p-8 shadow-2xs">
          <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-4 text-center sm:text-left">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-rose-100 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
              <Database className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h4 className="text-sm sm:text-lg font-bold text-rose-950 dark:text-white">
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
