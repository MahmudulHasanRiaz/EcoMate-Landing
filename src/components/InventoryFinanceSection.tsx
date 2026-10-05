import React from 'react';
import { LandingContent, Locale } from '../types/landing';
import { Warehouse, Check, Coins, FileSpreadsheet, ArrowRight, ShieldCheck } from 'lucide-react';

interface InventoryFinanceProps {
  content: LandingContent;
  locale: Locale;
}

export const InventoryFinanceSection: React.FC<InventoryFinanceProps> = ({ content, locale }) => {
  return (
    <section id="inventory-finance" className="relative py-20 md:py-28 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#07080E] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
            <Coins className="h-3.5 w-3.5" />
            <span>{content.inventoryFinance.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.inventoryFinance.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.inventoryFinance.subheading}
          </p>
        </div>

        {/* 4-Phase Physical to Financial Progression */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {content.inventoryFinance.steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#0C0E1B] p-6 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-sm"
            >
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  {step.phase}
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 mb-2.5">{step.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {step.detail}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/[0.06]">
                <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{step.outcome}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Financial Ledger & Bin Location Visual Dashboard */}
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-[#0B0D19] p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Bin Location Map Simulation */}
            <div className="lg:col-span-6 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-black/40 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Central Warehouse Bin Architecture</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Tejgaon Industrial Hub · Zone B</p>
                </div>
                <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">● 100% Located</span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-3 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold block">RACK A-12</span>
                  <span className="text-slate-900 dark:text-white font-bold">Bin 01: Polo M</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">Stock: 140 pcs</span>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold block">RACK A-12</span>
                  <span className="text-slate-900 dark:text-white font-bold">Bin 02: Polo L</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">Stock: 185 pcs</span>
                </div>
                <div className="p-3 rounded-lg bg-indigo-50/90 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30">
                  <span className="text-[10px] text-indigo-700 dark:text-indigo-400 font-bold block">RACK A-12</span>
                  <span className="text-slate-900 dark:text-white font-bold">Bin 03: Polo XL</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">Stock: 92 pcs</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pickers receive exact rack and bin coordinates on pick sheets, cutting warehouse travel time by 60%.
              </p>
            </div>

            {/* Right: Double-Entry Financial Health Highlights */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Double-Entry Financial Rigor</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                No More Month-End Financial Surprises.
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {content.inventoryFinance.financeHighlights.map((highlight, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-3 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-2xs">
                    <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{highlight}</span>
                  </div>
                ))}
              </div>

              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-2">
                Every sale, refund, courier COD settlement, and supplier purchase automatically posts journal entries to your integrated chart of accounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
