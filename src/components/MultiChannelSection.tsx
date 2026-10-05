import React from 'react';
import { LandingContent, Locale } from '../types/landing';
import { Globe, Store, Clock, CheckCircle2, Shuffle, Layers } from 'lucide-react';

interface MultiChannelSectionProps {
  content: LandingContent;
  locale: Locale;
}

export const MultiChannelSection: React.FC<MultiChannelSectionProps> = ({ content, locale }) => {
  return (
    <section id="multi-channel" className="relative py-20 md:py-28 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#080910] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
            <Globe className="h-3.5 w-3.5" />
            <span>{content.multiChannel.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.multiChannel.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.multiChannel.subheading}
          </p>
        </div>

        {/* Central Inventory Allocation Demo Bar */}
        <div className="mt-10 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/70 dark:bg-indigo-950/20 p-5 sm:p-6 backdrop-blur-md shadow-md shadow-indigo-100/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-200/80 dark:border-indigo-500/20 pb-4 mb-4">
            <div>
              <span className="text-xs font-mono text-indigo-700 dark:text-indigo-300 uppercase tracking-wider font-semibold">
                Multi-Channel Inventory Orchestrator
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                Product SKU: LUX-POLO-NAVY (Available Stock: 350 Units)
              </h3>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Real-Time Allocation Lock</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-indigo-100 dark:border-white/[0.06] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span>Online WooCommerce Store</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">180 Units</span>
              </div>
              <p className="text-slate-900 dark:text-slate-300 font-semibold">Global Online Catalog</p>
              <p className="text-[11px] text-slate-500 mt-1">Auto-sync on customer checkout</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-indigo-100 dark:border-white/[0.06] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span>Gulshan Flagship POS</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">120 Units</span>
              </div>
              <p className="text-slate-900 dark:text-slate-300 font-semibold">Physical Showroom Rack A</p>
              <p className="text-[11px] text-slate-500 mt-1">Barcode cashier checkout decrement</p>
            </div>

            <div className="p-3.5 rounded-xl bg-white dark:bg-black/40 border border-indigo-100 dark:border-white/[0.06] shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span>Dhanmondi Outlet POS</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-bold">50 Units</span>
              </div>
              <p className="text-slate-900 dark:text-slate-300 font-semibold">Physical Showroom Display</p>
              <p className="text-[11px] text-slate-500 mt-1">Low-stock transfer trigger enabled</p>
            </div>
          </div>
        </div>

        {/* Channel Cards Grid */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.multiChannel.channels.map((channel, idx) => {
            const isRoadmap = channel.status === 'roadmap';
            return (
              <div
                key={idx}
                className={`rounded-2xl border p-6 flex flex-col justify-between transition-all ${
                  isRoadmap
                    ? 'border-purple-200 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/10 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.02] shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wider uppercase ${
                        isRoadmap
                          ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                      }`}
                    >
                      {channel.type}
                    </span>
                    {isRoadmap ? (
                      <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{channel.name}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {channel.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.06] text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>
                    {isRoadmap ? 'Under Active Engineering' : 'Integrated into EcoMate Core'}
                  </span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                    {isRoadmap ? 'Roadmap' : 'Production Ready'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
