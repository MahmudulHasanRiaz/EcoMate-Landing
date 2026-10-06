import React, { useState } from 'react';
import { useLanding } from '@/components/shell/useLanding';
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

export const FulfillmentPipelineSection: React.FC = () => {
  const { content, locale } = useLanding();
  const [activeStepIndex, setActiveStepIndex] = useState<number>(2); // Default to Smart Packing

  const currentStep = content.fulfillment.pipeline[activeStepIndex];

  return (
    <section id="fulfillment" className="relative py-14 md:py-24 border-t border-slate-200 dark:border-white/[0.06] bg-white dark:bg-[#07080E] overflow-hidden transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-2 sm:mb-3">
            <PackageCheck className="h-3.5 w-3.5" />
            <span>{content.fulfillment.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.fulfillment.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.fulfillment.subheading}
          </p>
        </div>

        {/* Signature Verification Flow Diagram: Physical Packing Verification in Motion */}
        <div className="mt-8 sm:mt-12 rounded-2xl border border-indigo-200 dark:border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 dark:from-[#0C0E1B] dark:via-[#090A14] dark:to-[#07080F] p-4 sm:p-7 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-indigo-200/60 dark:border-white/[0.08] pb-3 mb-5">
            <span className="text-[11px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              {locale === 'en' ? 'Physical Packing Verification Sequence' : 'ফিজিক্যাল প্যাকিং ভেরিফিকেশন সিকোয়েন্স'}
            </span>
            <span className="text-[10px] sm:text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-semibold">
              ● {locale === 'en' ? 'Hardware Scanner Ready' : 'হার্ডওয়্যার বারকোড স্ক্যানার কানেক্টেড'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs items-center">
            {/* Step 1: Order Ticket */}
            <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 font-bold block mb-1">STAGE 01</span>
              <p className="font-bold text-slate-900 dark:text-white">Order Queued</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">WooCommerce #EM-84920</p>
              <div className="mt-2 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">✓ COD Confirmed</div>
            </div>

            {/* Step 2: Barcode Scan */}
            <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-indigo-300 dark:border-indigo-500/40 shadow-2xs">
              <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 font-bold block mb-1">STAGE 02</span>
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Barcode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Barcode Scan</span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Physical garment scanned</p>
              <div className="mt-2 text-[10px] font-mono text-indigo-700 dark:text-indigo-400 font-semibold">SKU: POLO-NVY-XL</div>
            </div>

            {/* Step 3: Match & Chime */}
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-500/40 shadow-2xs">
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold block mb-1">STAGE 03</span>
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>Audio Chime</span>
              </p>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">SKU match verified at scan</p>
              <div className="mt-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 font-bold">WRONG SIZE BLOCKED</div>
            </div>

            {/* Step 4: Shipping Label Unlock */}
            <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 font-bold block mb-1">STAGE 04</span>
              <p className="font-bold text-slate-900 dark:text-white">Label Unlocks</p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Thermal print generated</p>
              <div className="mt-2 text-[10px] font-mono text-indigo-700 dark:text-indigo-400 font-semibold">Steadfast #SF-948102</div>
            </div>

            {/* Step 5: Dispatch & Handover */}
            <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] shadow-2xs">
              <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold block mb-1">STAGE 05</span>
              <p className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                <span>Rider Handover</span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Manifest auto-signed</p>
              <div className="mt-2 text-[10px] text-purple-600 dark:text-purple-400 font-semibold">SMS Sent to Buyer</div>
            </div>
          </div>
        </div>

        {/* Connected Interactive Stepper Rail */}
        <div className="mt-8 sm:mt-12">
          {/* Horizontal scroll container on mobile, full width on desktop */}
          <div className="overflow-x-auto pb-3 sm:pb-4 scrollbar-none" role="region" aria-label="Fulfillment pipeline steps" tabIndex={0}>
            <div className="flex items-center min-w-[620px] lg:min-w-0 border-b border-slate-200 dark:border-white/10 pb-3 sm:pb-4 relative">
              {content.fulfillment.pipeline.map((step, idx) => {
                const isActive = activeStepIndex === idx;
                const isPassed = activeStepIndex > idx;
                return (
                  <button
                    key={step.stepNumber}
                    onClick={() => setActiveStepIndex(idx)}
                    className="flex-1 flex flex-col items-center text-center group cursor-pointer relative px-1 sm:px-2"
                  >
                    {/* Step indicator circle */}
                    <div
                      className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center font-mono text-[11px] sm:text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300/60 dark:shadow-[0_0_20px_rgba(99,102,241,0.6)] scale-105 sm:scale-110'
                          : isPassed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40'
                          : 'bg-slate-100 text-slate-600 border border-slate-200 group-hover:border-slate-300 group-hover:text-slate-800 dark:bg-white/[0.04] dark:text-slate-400 dark:border-white/10'
                      }`}
                    >
                      {step.stepNumber}
                    </div>

                    <span
                      className={`mt-1.5 sm:mt-2.5 text-[11px] sm:text-xs font-semibold transition-colors line-clamp-1 ${
                        isActive ? 'text-indigo-950 dark:text-white' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                      }`}
                    >
                      {step.title}
                    </span>

                    {/* Active highlight line */}
                    {isActive && (
                      <div className="absolute -bottom-3 sm:-bottom-4 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-500 shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Step Deep-Dive System Card */}
          <div className="mt-6 sm:mt-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0D19] p-5 sm:p-10 shadow-md dark:shadow-2xl relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-center">
              {/* Left Column: Narrative description */}
              <div className="lg:col-span-7 space-y-3 sm:space-y-4">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-mono bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
                  <span>Step {currentStep.stepNumber} of 07</span>
                  <span>·</span>
                  <span>{currentStep.realFeature}</span>
                </div>

                <h3 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  {currentStep.title}
                </h3>

                <p className="text-xs sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {currentStep.description}
                </p>

                <div className="pt-1.5 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span>Key Outcome: {currentStep.highlight}</span>
                </div>
              </div>

              {/* Right Column: Visual Mechanism Preview */}
              <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-white/[0.06] pb-2">
                  <span className="font-mono font-medium">Pipeline Telemetry</span>
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Connected</span>
                </div>

                {activeStepIndex === 2 ? (
                  <div className="space-y-2 text-xs">
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30">
                      <div className="flex items-center justify-between font-mono text-emerald-800 dark:text-emerald-300 mb-1 font-semibold">
                        <span>BARCODE SCAN STATUS</span>
                        <span>[VERIFIED]</span>
                      </div>
                      <p className="text-slate-900 dark:text-white font-medium">Item SKU: POLO-NVY-XL matched</p>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">Audio feedback: Success Chime Played</p>
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
                      <p className="mt-2 text-sky-700 dark:text-sky-300 font-mono text-[11px] font-semibold">842 sample parcels reconciled to Bank A/C: matched</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-white/[0.02] text-xs space-y-1.5">
                    <p className="text-slate-900 dark:text-slate-200 font-semibold">EcoMate Pipeline Intelligence</p>
                    <p className="text-slate-500 dark:text-slate-400">Continuous automated telemetry from placement to bank deposit.</p>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center text-[11px] text-slate-600 dark:text-slate-400">
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
