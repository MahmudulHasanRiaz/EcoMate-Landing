import React, { useState } from 'react';
import { LandingContent, Locale } from '../types/landing';
import {
  Sparkles,
  LayoutDashboard,
  PackageCheck,
  Truck,
  Store,
  Warehouse,
  Receipt,
  CheckCircle2,
  Barcode,
  ArrowRight,
} from 'lucide-react';

interface ProductInActionProps {
  content: LandingContent;
  locale: Locale;
}

export const ProductInActionSection: React.FC<ProductInActionProps> = ({
  content,
  locale,
}) => {
  const [activeModuleId, setActiveModuleId] = useState<string>('packing');

  const activeModule =
    content.productShowcase.modules.find((m) => m.id === activeModuleId) ||
    content.productShowcase.modules[0];

  const getModuleIcon = (id: string) => {
    switch (id) {
      case 'dashboard':
        return <LayoutDashboard className="h-4 w-4" />;
      case 'packing':
        return <PackageCheck className="h-4 w-4" />;
      case 'courier':
        return <Truck className="h-4 w-4" />;
      case 'pos':
        return <Store className="h-4 w-4" />;
      case 'inventory':
        return <Warehouse className="h-4 w-4" />;
      case 'finance':
        return <Receipt className="h-4 w-4" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <section id="tour" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#07080E] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-2 sm:mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>{content.productShowcase.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.productShowcase.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.productShowcase.subheading}
          </p>
        </div>

        {/* Module Selector Pill Bar */}
        <div className="mt-8 sm:mt-10 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {content.productShowcase.modules.map((m) => {
            const isActive = activeModule.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActiveModuleId(m.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:bg-white/[0.03] dark:text-slate-300 dark:border-white/[0.06] dark:hover:bg-white/[0.06]'
                }`}
              >
                {getModuleIcon(m.id)}
                <span>{m.name}</span>
              </button>
            );
          })}
        </div>

        {/* Cinematic Product UI Presentation Frame */}
        <div className="mt-6 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] p-5 sm:p-10 shadow-md dark:shadow-2xl relative overflow-hidden">
          {/* Ambient luminous glow */}
          <div className="pointer-events-none absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-3xl" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
            {/* Left 5 Cols: "What Problem Does This Solve?" Explanation */}
            <div className="lg:col-span-5 space-y-4 sm:space-y-5">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                {getModuleIcon(activeModule.id)}
                <span>EcoMate Module: {activeModule.name}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white leading-snug">
                {activeModule.shortDesc}
              </h3>

              <div className="rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-950/20 p-4 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 dark:text-indigo-400">
                  What Problem Does This Solve?
                </span>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                  {activeModule.problemSolved}
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="text-slate-500 dark:text-slate-400 uppercase font-semibold text-[10px] tracking-wider block">
                  Core Implementation Mechanism
                </span>
                <p className="leading-relaxed">
                  {activeModule.keyCapability}
                </p>
              </div>

              <div className="pt-2">
                <a
                  href="#lead-form"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <span>Request a full module walkthrough</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Right 7 Cols: Contextual Live Simulated Workspace Screen */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/90 dark:bg-black/60 p-5 sm:p-6 space-y-4 shadow-sm">
              {/* Top console bar */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-300">EcoMate // {activeModule.name}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-500 font-medium">Live Workspace Session</span>
              </div>

              {/* Module-Specific Rich UI Composition */}
              {activeModule.id === 'packing' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <p className="text-slate-900 dark:text-white font-semibold">SKU: DRK-DENIM-34 (Verified)</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Barcode: 89014299104 · Audio Chime OK</p>
                    </div>
                    <span className="font-mono text-emerald-700 dark:text-emerald-400 font-bold">[MATCH]</span>
                  </div>

                  <div className="p-3.5 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] flex items-center justify-between shadow-2xs">
                    <div>
                      <p className="text-slate-900 dark:text-slate-200 font-medium">Auto-Consignment #ST-991204</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Steadfast Logistics Hub · Weight: 0.8 kg</p>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300">
                      PRINT READY
                    </span>
                  </div>

                  <div className="p-2.5 rounded bg-slate-100/70 dark:bg-black/40 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between border border-slate-200/60 dark:border-transparent font-medium">
                    <span>Wrong Item Safeguard: ACTIVE</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">0 errors across 450 parcels today</span>
                  </div>
                </div>
              )}

              {activeModule.id === 'courier' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-2xs">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">Steadfast COD Today</span>
                      <p className="text-lg font-bold text-slate-900 dark:text-white font-mono-numbers mt-1">৳ 8,42,000</p>
                      <p className="text-emerald-600 dark:text-emerald-400 text-[10px] mt-0.5 font-semibold">380 parcels reconciled</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-2xs">
                      <span className="text-slate-500 dark:text-slate-400 text-[10px] font-medium">Pathao Courier Today</span>
                      <p className="text-lg font-bold text-slate-900 dark:text-white font-mono-numbers mt-1">৳ 4,12,500</p>
                      <p className="text-emerald-600 dark:text-emerald-400 text-[10px] mt-0.5 font-semibold">190 parcels reconciled</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-500/20 text-[11px] text-sky-800 dark:text-sky-300 font-medium">
                    ✓ Courier deduction audit: 12 disputed overcharges automatically flagged and recovered.
                  </div>
                </div>
              )}

              {activeModule.id === 'pos' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-2 shadow-2xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-300">
                      <span>Cashier: Gulshan Showroom Register 02</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Active Shift</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                      <span>Customer: Shariar Kabir (01819-***402)</span>
                      <span>Total: ৳ 7,850</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-500/20 text-purple-800 dark:text-purple-300 text-[11px] font-medium">
                    Split Receipt: ৳ 4,000 Cash + ৳ 3,850 bKash. Warehouse stock auto-updated instantly.
                  </div>
                </div>
              )}

              {activeModule.id === 'inventory' && (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2.5 rounded bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-2xs">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Total SKUs</span>
                      <p className="text-base font-bold text-slate-900 dark:text-white font-mono-numbers mt-0.5">1,480</p>
                    </div>
                    <div className="p-2.5 rounded bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-2xs">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Bin Locations</span>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers mt-0.5">Mapped</p>
                    </div>
                    <div className="p-2.5 rounded bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] shadow-2xs">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Low Stock SKUs</span>
                      <p className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono-numbers mt-0.5">12</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Aisle and bin routing ensures packers pick multiple orders in a single consolidated pass.
                  </p>
                </div>
              )}

              {activeModule.id === 'finance' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] space-y-1.5 shadow-2xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Delivered Net Revenue:</span>
                      <span className="font-mono text-slate-900 dark:text-white font-bold">৳ 42,85,900</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Landed Cost of Goods Sold (COGS):</span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">৳ 24,10,000</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 dark:border-white/[0.08] pt-1.5 text-emerald-700 dark:text-emerald-400 font-bold">
                      <span>Realized Gross Profit:</span>
                      <span className="font-mono">৳ 18,75,900 (43.8% Margin)</span>
                    </div>
                  </div>
                </div>
              )}

              {activeModule.id === 'dashboard' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/20">
                    <p className="text-slate-900 dark:text-white font-semibold">Executive Cockpit</p>
                    <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 font-medium">
                      Continuous live pulse of revenue, dispatched parcel count, and warehouse operations.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
