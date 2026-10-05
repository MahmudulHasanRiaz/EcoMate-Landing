import React, { useState } from 'react';
import { LandingContent, Locale, CaseStudy } from '../types/landing';
import { CaseStudyVideoModal } from './CaseStudyVideoModal';
import { ShieldCheck, Play, Globe, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

interface CustomerProofProps {
  content: LandingContent;
  locale: Locale;
}

export const CustomerProofSection: React.FC<CustomerProofProps> = ({ content, locale }) => {
  const [selectedVideoCase, setSelectedVideoCase] = useState<CaseStudy | null>(null);

  return (
    <section id="case-studies" className="relative py-20 md:py-28 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-[#080910] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{content.proof.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.proof.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.proof.subheading}
          </p>
        </div>

        {/* 3 Detailed Brand Case Study Cards */}
        <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {content.proof.caseStudies.map((study) => (
            <div
              key={study.id}
              className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0C0E1B] p-6 sm:p-7 flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-500/30 transition-all shadow-md shadow-slate-200/50 dark:shadow-xl"
            >
              <div>
                {/* Brand Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{study.businessName}</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                      {study.category} · {study.location}
                    </p>
                  </div>

                  <a
                    href={`https://${study.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-mono inline-flex items-center gap-1 font-semibold"
                  >
                    <span>Visit</span>
                    <Globe className="h-3 w-3" />
                  </a>
                </div>

                {/* Concrete Quantified Metrics */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.04] mb-5 text-center">
                  {study.metrics.map((m, idx) => (
                    <div key={idx}>
                      <p className="text-sm sm:text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono-numbers">
                        {m.stat}
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">{m.label}</p>
                    </div>
                  ))}
                </div>

                {/* Attributable Quote */}
                <blockquote className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed mb-4">
                  "{study.quote}"
                </blockquote>

                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {study.founderName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {study.role}, {study.businessName}
                </p>
              </div>

              {/* Video Walkthrough CTA Trigger */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                <button
                  onClick={() => setSelectedVideoCase(study)}
                  className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                >
                  <span className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-500/20 border border-indigo-200 dark:border-transparent flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Play className="h-3 w-3 ml-0.5" />
                  </span>
                  <span>Watch Video Case Study ({study.videoDuration})</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Case Study Video Modal */}
      <CaseStudyVideoModal
        caseStudy={selectedVideoCase}
        onClose={() => setSelectedVideoCase(null)}
      />
    </section>
  );
};
