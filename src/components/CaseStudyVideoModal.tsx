import React from 'react';
import { CaseStudy } from '../types/landing';
import { X, Play, CheckCircle2, Globe, Building2 } from 'lucide-react';

interface CaseStudyVideoModalProps {
  caseStudy: CaseStudy | null;
  onClose: () => void;
}

export const CaseStudyVideoModal: React.FC<CaseStudyVideoModalProps> = ({
  caseStudy,
  onClose,
}) => {
  if (!caseStudy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] p-6 sm:p-8 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Video Simulation Box */}
        <div className="relative aspect-video rounded-xl bg-slate-900 border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col items-center justify-center text-center p-6 group">
          <div className="h-16 w-16 rounded-full bg-indigo-600/90 text-white flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.6)] group-hover:scale-110 transition-transform">
            <Play className="h-7 w-7 ml-1" />
          </div>
          <span className="mt-4 text-sm font-semibold text-white">
            {caseStudy.videoTitle || 'Operational Case Study Video Walkthrough'}
          </span>
          <span className="text-xs text-indigo-300 mt-1 font-mono">
            Duration: {caseStudy.videoDuration || '3:30 min'} · High Definition
          </span>
          <p className="mt-2 text-[11px] text-slate-400 max-w-md">
            Clicking play simulates the video interview detailing warehouse packing redesign and courier reconciliation.
          </p>
        </div>

        {/* Case Study Summary */}
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                <span>{caseStudy.businessName}</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {caseStudy.founderName} · {caseStudy.role} · {caseStudy.location}
              </p>
            </div>
            <a
              href={`https://${caseStudy.website}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{caseStudy.website}</span>
            </a>
          </div>

          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
            "{caseStudy.quote}"
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {caseStudy.metrics.map((m, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.04] text-center">
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 font-mono-numbers">{m.stat}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
