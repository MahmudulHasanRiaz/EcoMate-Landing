import React, { useState } from 'react';
import { LandingContent, Locale } from '../types/landing';
import { ShieldCheck, AlertTriangle, Calculator, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react';

interface LossPreventionProps {
  content: LandingContent;
  locale: Locale;
}

export const LossPreventionSection: React.FC<LossPreventionProps> = ({ content, locale }) => {
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
    <section id="loss-prevention" className="relative py-20 md:py-28 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#080911] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{content.lossPrevention.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.lossPrevention.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.lossPrevention.subheading}
          </p>
        </div>

        {/* Two Concrete Business-Value Narratives */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Packing Mistake Narrative */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1A] p-6 sm:p-8 flex flex-col justify-between shadow-lg shadow-slate-200/50 dark:shadow-none">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>The Preventable Packing Leak</span>
                </span>
                <span className="font-mono text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-500/20 font-semibold">
                  {content.lossPrevention.packingStory.mistakeCost}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {content.lossPrevention.packingStory.mistakeHeading}
              </h3>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.04] mb-4 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <p className="text-slate-500 dark:text-slate-400 font-medium">The Anatomy of a Wrong Size Dispatch:</p>
                <p className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <span>1. Wrong SKU packed (Size 41 instead of 42)</span>
                </p>
                <p className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <span>2. Customer rejects parcel at doorstep</span>
                </p>
                <p className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <span>3. You pay forward delivery fee + return transit fee</span>
                </p>
                <p className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <span>4. Capital blocked for 10-14 days while parcel returns</span>
                </p>
              </div>

              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{content.lossPrevention.packingStory.solutionHeading}</span>
              </h4>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {content.lossPrevention.packingStory.solutionDetail}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400 font-medium">
              Outcome: Zero wrong shipments reach the courier truck.
            </div>
          </div>

          {/* Courier Return Fraud Narrative */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1A] p-6 sm:p-8 flex flex-col justify-between shadow-lg shadow-slate-200/50 dark:shadow-none">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span>The Serial Returner Drain</span>
                </span>
                <span className="font-mono text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-500/20 font-semibold">
                  {content.lossPrevention.fraudStory.fakeOrderCost}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {content.lossPrevention.fraudStory.fakeOrderHeading}
              </h3>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.04] mb-4 text-xs text-slate-700 dark:text-slate-300 space-y-1.5">
                <p className="text-slate-500 dark:text-slate-400 font-medium">The Cost of Blind Dispatch:</p>
                <p className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <span>1. Impulsive buyer places COD order with no intent to receive</span>
                </p>
                <p className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <span>2. Dispatched blindly without delivery history check</span>
                </p>
                <p className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <span>3. Customer phone switched off upon delivery attempt</span>
                </p>
                <p className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <span>4. Merchant pays full courier return cost with zero sale</span>
                </p>
              </div>

              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{content.lossPrevention.fraudStory.solutionHeading}</span>
              </h4>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {content.lossPrevention.fraudStory.solutionDetail}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400 font-medium">
              Outcome: Mandatory advance delivery charge on serial cancelers.
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
                  {content.lossPrevention.calculator.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
                  See how much capital your business can protect with barcode verification and courier intelligence.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/20 self-start md:self-auto font-semibold">
              Live ROI Estimator
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Input Slider (col-span-6) */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="flex justify-between items-center text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  <span>{content.lossPrevention.calculator.ordersPerDayLabel}</span>
                  <span className="font-mono text-indigo-700 dark:text-indigo-400 font-bold text-lg">
                    {dailyOrders.toLocaleString()} orders / day
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
                <div className="flex justify-between text-[11px] text-slate-500 font-mono mt-1.5 font-medium">
                  <span>50 orders</span>
                  <span>500 orders</span>
                  <span>1,000 orders</span>
                  <span>2,000+ orders</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] text-xs text-slate-700 dark:text-slate-300 space-y-2 shadow-xs">
                <div className="flex justify-between">
                  <span>Monthly Dispatched Volume:</span>
                  <span className="font-mono text-slate-900 dark:text-white font-bold">{monthlyOrders.toLocaleString()} orders / mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Avoidable Packing & Fake Returns without System:</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 font-bold">{preventableMistakesWithoutSystem} parcels</span>
                </div>
                <div className="flex justify-between">
                  <span>Average Loss per Preventable Mistake:</span>
                  <span className="font-mono text-slate-600 dark:text-slate-300 font-medium">৳ 420 (Courier + transit + overhead)</span>
                </div>
              </div>
            </div>

            {/* Impact Calculation Cards (col-span-6) */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-950/20 p-5 shadow-xs">
                <span className="text-xs text-rose-800 dark:text-rose-300 uppercase tracking-wider font-bold">
                  {content.lossPrevention.calculator.estimatedLossLabel}
                </span>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-rose-600 dark:text-rose-400 font-mono-numbers">
                  ৳ {estimatedMonthlyLoss.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-rose-700/80 dark:text-rose-300/80">
                  Drained in wasted courier bills and return overhead every month.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 p-5 shadow-md shadow-emerald-100/50 dark:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>{content.lossPrevention.calculator.savedWithEcoMateLabel}</span>
                </span>
                <p className="mt-2 text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers">
                  ৳ {estimatedSavings.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  Protected straight to your net operating profit every single month.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
