import React from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { Warehouse, Check, Coins, FileSpreadsheet, ArrowRight, ShieldCheck } from 'lucide-react';

export const InventoryFinanceSection: React.FC = () => {
  const { content } = useLanding();
  return (
    <section id="inventory-finance" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#07080E] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-2 sm:mb-3">
            <Coins className="h-3.5 w-3.5" />
            <span>{content.inventoryFinance.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.inventoryFinance.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.inventoryFinance.subheading}
          </p>
        </div>

        {/* 4-Phase Physical to Financial Progression */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {content.inventoryFinance.steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#0C0E1B] p-5 sm:p-6 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-2xs"
            >
              <div>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  {step.phase}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1 mb-2">{step.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {step.detail}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-white/[0.06]">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                  <span>{step.outcome}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Ledger & Bin Location Visual Dashboard */}
        <div className="mt-6 sm:mt-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0B0D19] p-5 sm:p-8 shadow-md dark:shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Left: Bin Location Map Simulation */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-black/40 p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-2.5">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">Central Warehouse Bin Architecture</h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-600 dark:text-slate-300">Tejgaon Industrial Hub · Zone B</p>
                </div>
                <span className="text-[11px] sm:text-xs font-mono text-emerald-700 dark:text-emerald-300 font-bold">● Bin-located</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold block">RACK A-12</span>
                  <span className="text-slate-900 dark:text-white font-bold text-[11px]">Bin 01: Polo M</span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 block mt-0.5">140 pcs</span>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold block">RACK A-12</span>
                  <span className="text-slate-900 dark:text-white font-bold text-[11px]">Bin 02: Polo L</span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 block mt-0.5">185 pcs</span>
                </div>
                <div className="p-2.5 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold block">RACK A-12</span>
                  <span className="text-slate-900 dark:text-white font-bold text-[11px]">Bin 03: Polo XL</span>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300 block mt-0.5">92 pcs</span>
                </div>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300">
                Pickers receive exact rack and bin coordinates on pick sheets, cutting warehouse travel time significantly.
              </p>
            </div>

            {/* Right: Double-Entry Financial Health Highlights */}
            <div className="lg:col-span-6 space-y-3 sm:space-y-4">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Double-Entry Financial Rigor</span>
              </div>

              <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                No More Month-End Financial Surprises.
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                {content.inventoryFinance.financeHighlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 sm:p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-2xs">
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{highlight}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                Every sale, refund, courier COD settlement, and supplier purchase automatically posts journal entries to your integrated chart of accounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
