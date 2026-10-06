import React from 'react';
import { LandingContent, Locale } from '../types/landing';
import { Store, Barcode, Printer, CreditCard, Check, ArrowRight } from 'lucide-react';

interface PosShowroomProps {
  content: LandingContent;
  locale: Locale;
}

export const PosShowroomSection: React.FC<PosShowroomProps> = ({ content, locale }) => {
  return (
    <section id="pos-showrooms" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#080910] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-2 sm:mb-3">
            <Store className="h-3.5 w-3.5" />
            <span>{content.posShowroom.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.posShowroom.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.posShowroom.subheading}
          </p>
        </div>

        {/* Live Showroom Cashier Counter Simulation: Physical Retail Meets Central Inventory */}
        <div className="mt-8 sm:mt-12 rounded-2xl border border-purple-200 dark:border-purple-500/20 bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 dark:from-[#0E0F1E] dark:via-[#090A14] dark:to-[#07080F] p-4 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-purple-200/60 dark:border-white/[0.08] pb-3 mb-5">
            <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-300">
              {locale === 'en' ? 'Showroom Counter Live Billing Flow' : 'শোরুম ক্যাশিয়ার কাউন্টার লাইভ বিলিং'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-semibold">
              ● Banani Flagship Terminal #02 (Live)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
            {/* Step 1: Physical Barcode Scanning */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-black/40 border border-purple-200/70 dark:border-white/[0.06] shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold">POS STEP 01</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium font-mono">1.2s Scan Speed</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Instant Barcode Billing</h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs">
                Walk-in customer hands item to cashier. Handheld scanner beeps once, instantly pulling unit cost and inventory lock.
              </p>
              <div className="mt-3 p-2 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] font-mono text-[11px]">
                Item: Denim Jacket (Size M) · ৳ 2,850
              </div>
            </div>

            {/* Step 2: Split Payments */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-black/40 border border-purple-200/70 dark:border-white/[0.06] shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400 font-bold">POS STEP 02</span>
                <span className="text-purple-600 dark:text-purple-400 font-medium font-mono">Split Payment</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">bKash + Cash Settlement</h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs">
                Supports partial payments: customer pays ৳ 1,500 in Cash and ৳ 1,350 via bKash QR. Automatically recorded in cash drawer.
              </p>
              <div className="mt-3 p-2 rounded bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04] font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                Cashier: Rifat Ahmed · Commission Logged
              </div>
            </div>

            {/* Step 3: Central Stock Auto-Deduction */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-black/40 border border-emerald-300 dark:border-emerald-500/30 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">POS STEP 03</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium font-mono">Zero Lag Sync</span>
              </div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1">Instant Warehouse Deduction</h4>
              <p className="text-slate-600 dark:text-slate-300 text-xs">
                Upon invoice print, Central Stock drops from 35 to 34. Online store stock updates simultaneously to prevent double orders.
              </p>
              <div className="mt-3 p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 font-mono text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                Online Web Stock: 34 Units [SYNCED]
              </div>
            </div>
          </div>
        </div>

        {/* 4 Core POS Capabilities Grid */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {content.posShowroom.features.map((feat, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0C0E1B] p-5 sm:p-6 flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-500/30 transition-all shadow-xs"
            >
              <div>
                <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-3 sm:mb-4">
                  {idx === 0 && <Barcode className="h-4 w-4 sm:h-5 sm:w-5" />}
                  {idx === 1 && <Store className="h-4 w-4 sm:h-5 sm:w-5" />}
                  {idx === 2 && <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />}
                  {idx === 3 && <Printer className="h-4 w-4 sm:h-5 sm:w-5" />}
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feat.desc}
                </p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 dark:border-white/[0.06]">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-purple-600" />
                  <span>{feat.detail}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Showroom Counter Operational Showcase Card */}
        <div className="mt-6 sm:mt-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0D19] p-5 sm:p-8 shadow-xs dark:shadow-none">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-1.5">
              <span className="text-[11px] sm:text-xs font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold">
                Multi-Branch Real-Time Telemetry
              </span>
              <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
                One Central System for Online + 10 Physical Showrooms.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Cashiers close daily registers with automated cash-in/cash-out summaries. Floor sales staff receive commission credit without manual spreadsheet tallying.
              </p>
            </div>

            <a
              href="#lead-form"
              className="shrink-0 inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 px-4 sm:px-5 py-2.5 text-xs font-semibold text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all whitespace-nowrap cursor-pointer self-start md:self-auto"
            >
              <span>See Showroom POS in Action</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
