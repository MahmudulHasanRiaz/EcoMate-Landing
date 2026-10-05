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
    <section id="growth-complexity" className="relative py-20 md:py-28 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/60 dark:bg-[#080910] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>{content.complexity.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.complexity.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.complexity.subheading}
          </p>
        </div>

        {/* Interactive Problem vs Solution Contrast Grid */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Interactive Problem Selector List (col-span-5) */}
          <div className="lg:col-span-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 px-1">
              {content.complexity.frictionTitle}
            </div>

            {content.complexity.problems.map((problem) => {
              const isSelected = selectedProblem.id === problem.id;
              return (
                <button
                  key={problem.id}
                  onClick={() => setSelectedProblem(problem)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500/80 bg-indigo-50/90 dark:bg-indigo-950/30 shadow-md shadow-indigo-100 dark:shadow-[0_0_25px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="space-y-1">
                    <p className={`text-sm font-semibold transition-colors ${isSelected ? 'text-indigo-950 dark:text-white' : 'text-slate-800 dark:text-slate-300'}`}>
                      {problem.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
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

          {/* Right Column: Deep Dive Comparison Card (col-span-7) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1A] p-6 sm:p-8 shadow-xl shadow-slate-200/50 dark:shadow-2xl relative overflow-hidden">
            {/* Ambient inner card glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 bg-indigo-600/5 dark:bg-indigo-600/10 rounded-full blur-3xl" />

            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-4 mb-6">
              <div>
                <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">
                  Targeted System Module: {selectedProblem.module}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedProblem.title}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20">
                Operational Friction
              </span>
            </div>

            <div className="space-y-6">
              {/* Consequence Box */}
              <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/70 dark:bg-rose-950/10 p-4">
                <div className="flex items-start gap-3">
                  <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                      Consequence & Real Commercial Loss
                    </h4>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                      {selectedProblem.consequence}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-rose-700 dark:text-rose-300/90 font-mono-numbers">
                      Impact: {selectedProblem.financialImpact}
                    </p>
                  </div>
                </div>
              </div>

              {/* EcoMate Solution Box */}
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/70 dark:bg-emerald-950/10 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                      The EcoMate Solution
                    </h4>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                      {selectedProblem.solution}
                    </p>
                    <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{content.complexity.controlledTitle}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Eliminates guesswork across your daily operation</span>
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
