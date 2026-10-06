import React, { useState } from 'react';
import { LandingContent, Locale, ProblemItem } from '../types/landing';
import { AlertCircle, ArrowRight, CheckCircle2, ShieldAlert, Sparkles, TrendingDown } from 'lucide-react';

interface ComplexitySectionProps {
  content: LandingContent;
  locale: Locale;
}

export const ComplexitySection: React.FC<ComplexitySectionProps> = ({ content, locale }) => {
  const [selectedProblem, setSelectedProblem] = useState<ProblemItem>(content.complexity.problems[0]);

  return (
    <section id="growth-complexity" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#080910] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header with Integrated Friction Context */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 sm:mb-3">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{content.complexity.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.complexity.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.complexity.subheading}
          </p>
        </div>

        {/* Visual Architectural Contrast: Disconnected Chaos vs Unified Control */}
        <div className="mt-8 sm:mt-12 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#0B0D18]/90 backdrop-blur-xl p-5 sm:p-8 shadow-sm">
          <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
            <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {locale === 'en' ? 'Operational Architecture Comparison' : 'অপারেশনাল আর্কিটেকচার তুলনা'}
            </span>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {locale === 'en' ? 'The Disconnected Stack vs. The EcoMate Engine' : 'টুকরো টুকরো টুলস বনাম একীভূত ইকোমেট ইঞ্জিন'}
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-stretch">
            {/* The Disconnected Reality (Chaos) */}
            <div className="rounded-xl border border-rose-200/80 dark:border-rose-500/20 bg-rose-50/40 dark:bg-rose-950/10 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-rose-200/60 dark:border-rose-500/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" />
                    {locale === 'en' ? 'Fragmented Operation (Without EcoMate)' : 'টুকরো টুকরো অপারেশন (ইকোমেট ছাড়া)'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold">
                    HIGH FRICTION
                  </span>
                </div>

                {/* Disconnected Nodes Diagram */}
                <div className="my-5 space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 dark:bg-black/30 border border-rose-200/60 dark:border-white/[0.04] text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Online Store & Facebook Orders</span>
                    <span className="font-mono text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Unlinked Excel Sheet ✗</span>
                  </div>

                  <div className="flex justify-center my-0.5">
                    <span className="text-[10px] font-mono text-rose-500/80 dark:text-rose-400/80">↓ Manual copy-pasting between tabs</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 dark:bg-black/30 border border-rose-200/60 dark:border-white/[0.04] text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Showroom POS & Warehouse Bin</span>
                    <span className="font-mono text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Stock Desync & Oversell ✗</span>
                  </div>

                  <div className="flex justify-center my-0.5">
                    <span className="text-[10px] font-mono text-rose-500/80 dark:text-rose-400/80">↓ Verbal calls & unverified packing slips</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 dark:bg-black/30 border border-rose-200/60 dark:border-white/[0.04] text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Courier Delivery & COD Return</span>
                    <span className="font-mono text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Blind Dispatch & Lost Cash ✗</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-rose-200/60 dark:border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 font-medium">
                {locale === 'en' ? 'Result: 4-6% return rate, delayed reconciliation, and constant firefighting.' : 'ফলাফল: উচ্চ রিটার্ন, ক্যাশ রিকনসিলিয়েশন ঘাটতি ও কর্মীদের ভুলে ক্যাপিটাল ব্লকেজ।'}
              </div>
            </div>

            {/* The EcoMate Architecture (Control) */}
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/10 p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-emerald-200/60 dark:border-emerald-500/20">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
                    {locale === 'en' ? 'Disciplined Pipeline (With EcoMate)' : 'একীভূত ডিসিপ্লিনড অপারেশন (ইকোমেট)'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                    SYNCHRONIZED
                  </span>
                </div>

                {/* Connected Flow Diagram */}
                <div className="my-5 space-y-2.5">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 dark:bg-black/30 border border-emerald-200/60 dark:border-white/[0.04] text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">All Sales Channels (Web + POS)</span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Instant Order Ingestion ✓</span>
                  </div>

                  <div className="flex justify-center my-0.5">
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">↓ Automated courier fraud check & reservation</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 dark:bg-black/30 border border-emerald-200/60 dark:border-white/[0.04] text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Barcode Audio Verification Station</span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Zero Mismatch Guarantee ✓</span>
                  </div>

                  <div className="flex justify-center my-0.5">
                    <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">↓ Auto-generated consignment & tracking SMS</span>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/80 dark:bg-black/30 border border-emerald-200/60 dark:border-white/[0.04] text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">Automated Courier COD Reconciliation</span>
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Bank Matched ✓</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                {locale === 'en' ? 'Result: Sub-0.05% packing error, fast cash cycle, and zero operational blindness.' : 'ফলাফল: নির্ভুল প্যাকিং, দ্রুত ক্যাশ ফ্লো এবং ব্যবসা পরিচালনায় শতভাগ দৃশ্যমানতা।'}
              </div>
            </div>
          </div>
        </div>

        {/* Problem Deep Dive Section */}
        <div className="mt-8 sm:mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column: Problem Selector Pills (col-span-5) */}
          <div className="lg:col-span-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 px-1">
              {content.complexity.frictionTitle}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {content.complexity.problems.map((problem) => {
                const isSelected = selectedProblem.id === problem.id;
                return (
                  <button
                    key={problem.id}
                    onClick={() => setSelectedProblem(problem)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500/80 bg-indigo-50/90 dark:bg-indigo-950/30 shadow-xs ring-1 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <p className={`text-xs sm:text-sm font-semibold transition-colors ${isSelected ? 'text-indigo-950 dark:text-white' : 'text-slate-800 dark:text-slate-300'}`}>
                        {problem.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {problem.consequence}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 mt-1 h-2 w-2 rounded-full transition-all ${
                        isSelected ? 'bg-indigo-600 dark:bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Deep Dive Comparison Card (col-span-7) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1A] p-5 sm:p-8 shadow-md dark:shadow-2xl relative overflow-hidden">
            {/* Ambient inner card glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-3xl" />

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-3.5 mb-5">
              <div>
                <span className="text-[10px] sm:text-[11px] font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">
                  Module: {selectedProblem.module}
                </span>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedProblem.title}
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                Operational Leak
              </span>
            </div>

            <div className="space-y-4">
              {/* Consequence Box */}
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/10 p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                      Consequence & Real Commercial Loss
                    </h4>
                    <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {selectedProblem.consequence}
                    </p>
                    <p className="mt-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 font-mono-numbers">
                      Impact: {selectedProblem.financialImpact}
                    </p>
                  </div>
                </div>
              </div>

              {/* EcoMate Solution Box */}
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/10 p-3.5 sm:p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      The EcoMate Solution
                    </h4>
                    <p className="mt-1 text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {selectedProblem.solution}
                    </p>
                    <div className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{content.complexity.controlledTitle}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="hidden sm:inline">Eliminates guesswork across your daily operation</span>
              <a
                href="#lead-form"
                className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                <span>See it in a live demo</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
