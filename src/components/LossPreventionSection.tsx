import React, { useState } from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { ShieldCheck, AlertTriangle, Calculator, CheckCircle2, TrendingUp, DollarSign, ArrowRight } from 'lucide-react';
import { formatMoney, formatNumber } from '@/lib/format';

export const LossPreventionSection: React.FC = () => {
  const { content, locale } = useLanding();
  const calc = content.lossPrevention.calculator;
  const scenarios = content.lossPrevention.scenarios;
  const narratives = content.lossPrevention.narratives;
  const [dailyOrders, setDailyOrders] = useState<number>(350);

  // Economic calculations grounded in Bangladesh e-commerce unit economics:
  // Avg mistake & return rate without barcode verification: ~4.5%
  // Delivery forward fee (~120-150 BDT) + return fee (~80-120 BDT) + packaging/rehandling = ~400 BDT per preventable return
  const monthlyOrders = dailyOrders * 30;
  const preventableMistakesWithoutSystem = Math.round(monthlyOrders * 0.045);
  const estimatedMonthlyLoss = preventableMistakesWithoutSystem * 420;
  // With EcoMate barcode verification & fraud check, packing error drops below 0.05% and fake orders reduce by 65%:
  const estimatedSavings = Math.round(estimatedMonthlyLoss * 0.82);

  return (
    <section id="loss-prevention" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#080911] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-2 sm:mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{content.lossPrevention.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.lossPrevention.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.lossPrevention.subheading}
          </p>
        </div>

        {/* Visual Courier Intelligence Trust-Score Matrix */}
        <div className="mt-8 sm:mt-12 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#0A0C16] p-4 sm:p-7 backdrop-blur-md shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-slate-200/80 dark:border-white/[0.08] pb-3 mb-5">
            <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {locale === 'en' ? 'Pre-Dispatch Courier Intelligence in Action' : 'ডিসপ্যাচের আগে কুরিয়ার হিস্ট্রি বিশ্লেষণ'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20 font-semibold">
              {scenarios.telemetryBadge}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Scenario A: Genuine Customer */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-300">{scenarios.aTitle}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  {scenarios.aScore}
                </span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{scenarios.aCustomer}</p>
              <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                <p>{scenarios.aLine1}</p>
                <p>{scenarios.aLine2}</p>
                <p className="text-emerald-700 dark:text-emerald-400 font-bold">{scenarios.aDecision}</p>
              </div>
            </div>

            {/* Scenario B: Serial Returner */}
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold text-rose-800 dark:text-rose-300">{scenarios.bTitle}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                  {scenarios.bScore}
                </span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">{scenarios.bCustomer}</p>
              <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                <p>{scenarios.bLine1}</p>
                <p>{scenarios.bLine2}</p>
                <p className="text-rose-700 dark:text-rose-400 font-bold">{scenarios.bDecision}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two Concrete Business-Value Narratives */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Packing Mistake Narrative */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1A] p-5 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-700 dark:text-rose-400" />
                  <span>{narratives.leakEyebrow}</span>
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 sm:py-1 rounded-full border border-rose-200 dark:border-rose-500/20 font-semibold">
                  {content.lossPrevention.packingStory.mistakeCost}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {content.lossPrevention.packingStory.mistakeHeading}
              </h3>

              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.04] mb-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">{narratives.chainTitle}</p>
                <p className="text-rose-700 dark:text-rose-300">{narratives.chain1}</p>
                <p className="text-rose-700 dark:text-rose-300">{narratives.chain2}</p>
                <p className="text-rose-700 dark:text-rose-300">{narratives.chain3}</p>
                <p className="text-rose-700 dark:text-rose-300">{narratives.chain4}</p>
              </div>

              <h4 className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <span>{content.lossPrevention.packingStory.solutionHeading}</span>
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {content.lossPrevention.packingStory.solutionDetail}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-600 dark:text-slate-300 font-medium">
              {narratives.outcome1}
            </div>
          </div>

          {/* Courier Return Fraud Narrative */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1A] p-5 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-700 dark:text-rose-400" />
                  <span>{narratives.drainEyebrow}</span>
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 sm:py-1 rounded-full border border-rose-200 dark:border-rose-500/20 font-semibold">
                  {content.lossPrevention.fraudStory.fakeOrderCost}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {content.lossPrevention.fraudStory.fakeOrderHeading}
              </h3>

              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.04] mb-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="text-slate-600 dark:text-slate-300 font-medium text-[11px]">{narratives.costTitle}</p>
                <p className="text-rose-700 dark:text-rose-300">{narratives.cost1}</p>
                <p className="text-rose-700 dark:text-rose-300">{narratives.cost2}</p>
                <p className="text-rose-700 dark:text-rose-300">{narratives.cost3}</p>
                <p className="text-rose-700 dark:text-rose-300">{narratives.cost4}</p>
              </div>

              <h4 className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-300 mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                <span>{content.lossPrevention.fraudStory.solutionHeading}</span>
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {content.lossPrevention.fraudStory.solutionDetail}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-600 dark:text-slate-300 font-medium">
              {narratives.outcome2}
            </div>
          </div>
        </div>

        {/* Interactive Loss Prevention Calculator */}
        <div className="mt-12 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-indigo-950/30 dark:via-[#0B0D1A] dark:to-purple-950/20 p-6 sm:p-10 shadow-xl shadow-indigo-100/50 dark:shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] pb-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {calc.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
                  {calc.intro}
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/20 self-start md:self-auto font-semibold">
              {calc.roiBadge}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Input Slider (col-span-6) */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="flex justify-between items-center text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  <span>{calc.ordersPerDayLabel}</span>
                  <span className="font-mono text-indigo-700 dark:text-indigo-400 font-bold text-lg">
                    {formatNumber(dailyOrders, locale)} {calc.ordersUnit}
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="2000"
                  step="25"
                  value={dailyOrders}
                  onChange={(e) => setDailyOrders(Number(e.target.value))}
                  className="w-full h-2.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  aria-label="Daily order volume"
                />
                <div className="flex justify-between text-[11px] text-slate-600 font-mono mt-1.5 font-medium dark:text-slate-300">
                  <span>{calc.scaleMin}</span>
                  <span>{calc.scaleMid}</span>
                  <span>{calc.scaleHigh}</span>
                  <span>{calc.scaleMax}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-300 space-y-2 shadow-xs">
                <div className="flex justify-between">
                  <span>{calc.monthlyVolumeLabel}</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">{formatNumber(monthlyOrders, locale)} {calc.monthlyVolumeUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span>{calc.avoidableLabel}</span>
                  <span className="font-mono text-rose-700 dark:text-rose-400 font-bold">{formatNumber(preventableMistakesWithoutSystem, locale)} {calc.avoidableUnit}</span>
                </div>
                <div className="flex justify-between">
                  <span>{calc.avgLossLabel}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">{formatMoney(420, locale)} {calc.avgLossNote}</span>
                </div>
              </div>
            </div>

            {/* Impact Calculation Cards (col-span-6) */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-950/20 p-5 shadow-xs">
                <span className="text-xs text-rose-800 dark:text-rose-300 uppercase tracking-wider font-bold">
                  {calc.estimatedLossLabel}
                </span>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400 font-mono-numbers">
                  {formatMoney(estimatedMonthlyLoss, locale)}
                </p>
                <p className="mt-1 text-xs text-rose-700 dark:text-rose-300/80">
                  {calc.lossNote}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-5 shadow-md shadow-emerald-100/50 dark:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  <span>{calc.savedWithEcoMateLabel}</span>
                </span>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 font-mono-numbers">
                  {formatMoney(estimatedSavings, locale)}
                </p>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300/80">
                  {calc.savedNote}
                </p>
              </div>
            </div>
          </div>

          {/* High-Converting Mid-Funnel Action Strip */}
          <div className="mt-8 pt-6 border-t border-indigo-200/60 dark:border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/70 dark:bg-black/30 p-4 sm:p-5 rounded-xl border border-indigo-100 dark:border-white/[0.04]">
            <div className="text-center sm:text-left">
              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {calc.stripTitle}
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                {calc.stripSub}
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <a
                href="#lead-form"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors cursor-pointer"
              >
                <span>{calc.stripCta}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20I%20want%20to%20calculate%20savings%20for%20my%20order%20volume."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
