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
    <section id="loss-prevention" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#080911] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 sm:mb-3">
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
            <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              {locale === 'en' ? 'Pre-Dispatch Courier Intelligence in Action' : 'ডিসপ্যাচের আগে কুরিয়ার হিস্ট্রি বিশ্লেষণ'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-500/20 font-semibold">
              ● Cross-Courier Aggregate Telemetry (Steadfast + Pathao)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Scenario A: Genuine Customer */}
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold text-emerald-800 dark:text-emerald-300">SCENARIO A: GENUINE BUYER</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                  96% DELIVERY SCORE
                </span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">Customer: Tanvir Hasan (Dhanmondi, Dhaka)</p>
              <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                <p>• Historical parcels ordered: 25</p>
                <p>• Successfully accepted & paid: 24 (1 returned due to delay)</p>
                <p className="text-emerald-700 dark:text-emerald-400 font-bold">• EcoMate Decision: AUTO-APPROVE FOR IMMEDIATE PACKING</p>
              </div>
            </div>

            {/* Scenario B: Serial Returner */}
            <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-950/20 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] font-bold text-rose-800 dark:text-rose-300">SCENARIO B: SERIAL CANCELLER</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300">
                  24% DELIVERY SCORE
                </span>
              </div>
              <p className="font-semibold text-slate-900 dark:text-white">Customer: Unverified Caller (Sylhet Sadar)</p>
              <div className="mt-2 space-y-1 text-[11px] text-slate-600 dark:text-slate-300 font-mono">
                <p>• Historical parcels ordered: 17 across Bangladesh</p>
                <p>• Rejected at doorstep / unreachable: 13 parcels</p>
                <p className="text-rose-700 dark:text-rose-400 font-bold">• EcoMate Decision: REQUIRE ৳ 150 ADVANCE DELIVERY CHARGE</p>
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
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600 dark:text-rose-400" />
                  <span>The Preventable Packing Leak</span>
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 sm:py-1 rounded-full border border-rose-200 dark:border-rose-500/20 font-semibold">
                  {content.lossPrevention.packingStory.mistakeCost}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {content.lossPrevention.packingStory.mistakeHeading}
              </h3>

              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.04] mb-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">The Chain Reaction of a Wrong Size Dispatch:</p>
                <p className="text-rose-700 dark:text-rose-300">1. Wrong SKU packed (Size 41 instead of 42)</p>
                <p className="text-rose-700 dark:text-rose-300">2. Customer rejects parcel at doorstep</p>
                <p className="text-rose-700 dark:text-rose-300">3. Merchant pays forward + return delivery fees</p>
                <p className="text-rose-700 dark:text-rose-300">4. Capital blocked for 10-14 days while parcel returns</p>
              </div>

              <h4 className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{content.lossPrevention.packingStory.solutionHeading}</span>
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {content.lossPrevention.packingStory.solutionDetail}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400 font-medium">
              Outcome: Zero wrong shipments reach the courier truck.
            </div>
          </div>

          {/* Courier Return Fraud Narrative */}
          <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1A] p-5 sm:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-rose-600 dark:text-rose-400" />
                  <span>The Serial Returner Drain</span>
                </span>
                <span className="font-mono text-[11px] sm:text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 px-2.5 py-0.5 sm:py-1 rounded-full border border-rose-200 dark:border-rose-500/20 font-semibold">
                  {content.lossPrevention.fraudStory.fakeOrderCost}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {content.lossPrevention.fraudStory.fakeOrderHeading}
              </h3>

              <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.04] mb-3.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="text-slate-500 dark:text-slate-400 font-medium text-[11px]">The Cost of Blind Dispatch:</p>
                <p className="text-rose-700 dark:text-rose-300">1. Impulsive buyer places COD order without intent</p>
                <p className="text-rose-700 dark:text-rose-300">2. Dispatched blindly without delivery history check</p>
                <p className="text-rose-700 dark:text-rose-300">3. Customer phone switched off upon delivery attempt</p>
                <p className="text-rose-700 dark:text-rose-300">4. Merchant absorbs full courier return cost with zero sale</p>
              </div>

              <h4 className="text-xs sm:text-sm font-semibold text-emerald-700 dark:text-emerald-400 mt-3 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{content.lossPrevention.fraudStory.solutionHeading}</span>
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {content.lossPrevention.fraudStory.solutionDetail}
              </p>
            </div>

            <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400 font-medium">
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
