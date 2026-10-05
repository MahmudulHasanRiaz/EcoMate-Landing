import React from 'react';
import { LandingContent, Locale } from '../types/landing';
import { Store, Barcode, Printer, CreditCard, Check, ArrowRight } from 'lucide-react';

interface PosShowroomProps {
  content: LandingContent;
  locale: Locale;
}

export const PosShowroomSection: React.FC<PosShowroomProps> = ({ content, locale }) => {
  return (
    <section id="pos-showrooms" className="relative py-20 md:py-28 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#080910] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-3">
            <Store className="h-3.5 w-3.5" />
            <span>{content.posShowroom.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.posShowroom.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.posShowroom.subheading}
          </p>
        </div>

        {/* 4 Core POS Capabilities Grid */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {content.posShowroom.features.map((feat, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0C0E1B] p-6 flex flex-col justify-between hover:border-purple-300 dark:hover:border-purple-500/30 transition-all shadow-sm"
            >
              <div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
                  {idx === 0 && <Barcode className="h-5 w-5" />}
                  {idx === 1 && <Store className="h-5 w-5" />}
                  {idx === 2 && <CreditCard className="h-5 w-5" />}
                  {idx === 3 && <Printer className="h-5 w-5" />}
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feat.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
                <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-purple-600" />
                  <span>{feat.detail}</span>
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Showroom Counter Operational Showcase Card */}
        <div className="mt-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B0D19] p-6 sm:p-8 shadow-md shadow-slate-200/50 dark:shadow-none">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="text-xs font-mono text-purple-600 dark:text-purple-400 uppercase tracking-wider font-semibold">
                Multi-Branch Real-Time Telemetry
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                One Central System for Online + 10 Physical Showrooms.
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
                Cashiers close daily registers with automated cash-in/cash-out summaries. Floor sales staff receive commission credit without manual spreadsheet tallying.
              </p>
            </div>

            <a
              href="#lead-form"
              className="shrink-0 inline-flex items-center gap-2 rounded-full border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-500/10 px-5 py-2.5 text-xs font-semibold text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-500/20 transition-all whitespace-nowrap cursor-pointer"
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
