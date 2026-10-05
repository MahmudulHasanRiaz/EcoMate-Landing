import React, { useState } from 'react';
import { LandingContent, Locale, PipelineStep } from '../types/landing';
import {
  PackageCheck,
  CheckCircle2,
  Barcode,
  Truck,
  ShieldCheck,
  Receipt,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

interface FulfillmentPipelineProps {
  content: LandingContent;
  locale: Locale;
}

export const FulfillmentPipelineSection: React.FC<FulfillmentPipelineProps> = ({
  content,
  locale,
}) => {
  const [activeStepIndex, setActiveStepIndex] = useState<number>(2); // Default to Smart Packing

  const currentStep = content.fulfillment.pipeline[activeStepIndex];

  return (
    <section id="fulfillment" className="relative py-20 md:py-28 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#07080E] overflow-hidden transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3">
            <PackageCheck className="h-3.5 w-3.5" />
            <span>{content.fulfillment.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.fulfillment.heading}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.fulfillment.subheading}
          </p>
        </div>

        {/* Connected Interactive Stepper Rail */}
        <div className="mt-12">
          {/* Horizontal scroll container on mobile, full width on desktop */}
          <div className="overflow-x-auto pb-4 scrollbar-none">
            <div className="flex items-center min-w-[760px] lg:min-w-0 border-b border-slate-200 dark:border-white/10 pb-4 relative">
              {content.fulfillment.pipeline.map((step, idx) => {
                const isActive = activeStepIndex === idx;
                const isPassed = activeStepIndex > idx;
                return (
                  <button
                    key={step.stepNumber}
                    onClick={() => setActiveStepIndex(idx)}
                    className="flex-1 flex flex-col items-center text-center group cursor-pointer relative px-2"
                  >
                    {/* Step indicator circle */}
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300/60 dark:shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-110'
                          : isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                          : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:border-slate-300 group-hover:text-slate-800 dark:bg-white/[0.04] dark:text-slate-400 dark:border-white/10'
                      }`}
                    >
                      {step.stepNumber}
                    </div>

                    <span
                      className={`mt-2.5 text-xs font-semibold transition-colors line-clamp-1 ${
                        isActive ? 'text-indigo-950 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                      }`}
                    >
                      {step.title}
                    </span>

                    {/* Active highlight line */}
                    {isActive && (
                      <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Step Deep-Dive System Card */}
          <div className="mt-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0B0D19] p-6 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left Column: Narrative description */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
                  <span>Step {currentStep.stepNumber} of 07</span>
                  <span>·</span>
                  <span>{currentStep.realFeature}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {currentStep.title}
                </h3>

                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {currentStep.description}
                </p>

                <div className="pt-2 flex items-center gap-3 text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>Key Operational Impact: {currentStep.highlight}</span>
                </div>
              </div>

              {/* Right Column: Visual Mechanism Preview */}
              <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 p-5 space-y-3 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/[0.06] pb-2">
                  <span className="font-mono font-medium">Fulfillment Status Monitor</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">System Connected</span>
                </div>

                {activeStepIndex === 2 ? (
                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30">
                      <div className="flex items-center justify-between font-mono text-emerald-800 dark:text-emerald-300 mb-1 font-semibold">
                        <span>BARCODE SCAN STATUS</span>
                        <span>[VERIFIED]</span>
                      </div>
                      <p className="text-slate-900 dark:text-white font-medium">Item SKU: POLO-NVY-XL matched</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">Audio feedback: Success Chime Played</p>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-white/[0.03] text-slate-700 dark:text-slate-300 flex justify-between border border-slate-100 dark:border-transparent">
                      <span>Label Generation</span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">UNLOCKED</span>
                    </div>
                  </div>
                ) : activeStepIndex === 1 ? (
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-500/30">
                      <p className="font-bold text-slate-900 dark:text-white">Courier Fraud Pre-Check</p>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">Cross-referencing customer number across delivery nodes.</p>
                      <p className="mt-2 text-emerald-700 dark:text-emerald-400 font-mono text-[11px] font-semibold">Result: 94% Delivery Score (Safe to dispatch)</p>
                    </div>
                  </div>
                ) : activeStepIndex === 6 ? (
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-500/30">
                      <p className="font-bold text-slate-900 dark:text-white">Courier COD Reconciliation</p>
                      <p className="text-slate-600 dark:text-slate-300 mt-1">Parsed Steadfast Settlement Statement #ST-4829.</p>
                      <p className="mt-2 text-sky-700 dark:text-sky-300 font-mono text-[11px] font-semibold">842 parcels reconciled to Bank A/C: 100% matched</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-50 dark:bg-white/[0.02] text-xs space-y-2">
                    <p className="text-slate-900 dark:text-slate-200 font-semibold">EcoMate Pipeline Intelligence</p>
                    <p className="text-slate-500 dark:text-slate-400">Continuous automated telemetry from placement to bank deposit.</p>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Part of connected 7-step engine</span>
                  <button
                    onClick={() => setActiveStepIndex((activeStepIndex + 1) % content.fulfillment.pipeline.length)}
                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next step</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
