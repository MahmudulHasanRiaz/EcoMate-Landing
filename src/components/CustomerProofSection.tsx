import React, { useState } from 'react';
import type { CaseStudy } from '../types/landing';
import { useLanding } from '@/components/shell/useLanding';
import { CaseStudyVideoModal } from './CaseStudyVideoModal';
import { ShieldCheck, Play, Globe, Building2, CheckCircle2, ArrowRight } from 'lucide-react';

export const CustomerProofSection: React.FC = () => {
  const { content } = useLanding();
  const [selectedVideoCase, setSelectedVideoCase] = useState<CaseStudy | null>(null);

  const featuredStudy = content.proof.caseStudies[0];
  const supportingStudies = content.proof.caseStudies.slice(1);

  return (
    <section id="case-studies" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-[#080910] transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-2 sm:mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{content.proof.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.proof.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.proof.subheading}
          </p>
        </div>

        {/* Editorial Layout: Featured Story + Supporting Grid */}
        <div className="mt-8 sm:mt-12 space-y-6">
          {/* Featured Case Study Card */}
          {featuredStudy && (
            <div className="rounded-2xl sm:rounded-3xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/60 via-white to-purple-50/30 dark:from-[#111327] dark:via-[#0C0E1B] dark:to-[#0A0C16] p-6 sm:p-10 shadow-md dark:shadow-2xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white">
                      Featured Merchant Story
                    </span>
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {featuredStudy.category} · {featuredStudy.location}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                    {featuredStudy.businessName}
                  </h3>

                  <div className="relative pl-6 border-l-2 border-indigo-400 dark:border-indigo-500/60 my-2">
                    <span className="absolute -left-2.5 -top-2 text-3xl font-serif text-indigo-400 dark:text-indigo-500 select-none">“</span>
                    <blockquote className="text-base sm:text-lg text-slate-800 dark:text-slate-200 italic font-serif leading-relaxed">
                      {featuredStudy.quote}
                    </blockquote>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {featuredStudy.founderName}
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {featuredStudy.role}, {featuredStudy.businessName} · Operating since 2021
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={() => setSelectedVideoCase(featuredStudy)}
                      className="inline-flex items-center gap-2 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5" />
                      <span>Watch Founder Interview ({featuredStudy.videoDuration})</span>
                    </button>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-black/50 p-5 space-y-4 shadow-2xs">
                  <span className="text-xs font-mono uppercase tracking-wider text-slate-600 font-semibold block dark:text-slate-300">
                    Illustrative Metrics (Demo Data)
                  </span>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {featuredStudy.metrics.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-slate-50 dark:bg-white/[0.03]">
                        <p className="text-base sm:text-xl font-bold text-emerald-700 dark:text-emerald-400 font-mono-numbers">
                          {m.stat}
                        </p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 leading-tight">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400">Live Website:</span>
                    <a
                      href={`https://${featuredStudy.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      <span>{featuredStudy.website}</span>
                      <Globe className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Supporting Case Studies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {supportingStudies.map((study) => (
              <div
                key={study.id}
                className="rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0C0E1B] p-5 sm:p-6 flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-500/30 transition-all shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{study.businessName}</span>
                      </h4>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                        {study.category} · {study.location}
                      </p>
                    </div>

                    <a
                      href={`https://${study.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 font-mono inline-flex items-center gap-1 font-semibold"
                    >
                      <span>Visit</span>
                      <Globe className="h-3 w-3" />
                    </a>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.04] mb-3 text-center">
                    {study.metrics.map((m, idx) => (
                      <div key={idx}>
                        <p className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 font-mono-numbers">
                          {m.stat}
                        </p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5 font-medium">{m.label}</p>
                      </div>
                    ))}
                  </div>

                  <blockquote className="text-xs text-slate-700 dark:text-slate-300 italic leading-relaxed mb-3">
                    "{study.quote}"
                  </blockquote>

                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {study.founderName}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {study.role}, {study.businessName}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
                  <button
                    onClick={() => setSelectedVideoCase(study)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                  >
                    <Play className="h-3 w-3" />
                    <span>Watch Case Study ({study.videoDuration})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
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
