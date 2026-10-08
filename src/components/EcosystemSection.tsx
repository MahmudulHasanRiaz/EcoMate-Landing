import React, { useState } from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { EcoMateLogo } from './EcoMateLogo';
import {
  Store,
  PackageCheck,
  Warehouse,
  Receipt,
  TrendingUp,
  Users,
  Check,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';

export const EcosystemSection: React.FC = () => {
  const { content } = useLanding();
  const chrome = content.ecosystem.chrome;
  // CR-5: the CMS can save an empty `nodes` array — `nodes[0].id` would throw.
  // Null-safe init; the pillars grid + capabilities card render only when a node exists.
  const [activeNodeId, setActiveNodeId] = useState<string | null>(content.ecosystem.nodes[0]?.id ?? null);

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'Store':
        return <Store className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
      case 'PackageCheck':
        return <PackageCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />;
      case 'Warehouse':
        return <Warehouse className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />;
      case 'Receipt':
        return <Receipt className="h-5 w-5 text-sky-600 dark:text-sky-400" />;
      case 'TrendingUp':
        return <TrendingUp className="h-5 w-5 text-rose-700 dark:text-rose-400" />;
      case 'Users':
        return <Users className="h-5 w-5 text-amber-700 dark:text-amber-400" />;
      default:
        return <Layers className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />;
    }
  };

  const activeNode = content.ecosystem.nodes.find((n) => n.id === activeNodeId) ?? content.ecosystem.nodes[0] ?? null;

  return (
    <section id="ecosystem" className="relative py-14 md:py-24 bg-[#EDEEF6] dark:bg-[#07080E] border-t border-[#DDE1F0] dark:border-transparent overflow-hidden transition-colors">
      {/* Background ambient center radial light */}
      <div 
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full blur-[160px] opacity-15 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 80%)',
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 mb-2 sm:mb-3">
            <Cpu className="h-3.5 w-3.5" />
            <span>{content.ecosystem.eyebrow}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
            {content.ecosystem.heading}
          </h2>
          <p className="mt-2.5 sm:mt-4 text-sm sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
            {content.ecosystem.subheading}
          </p>
        </div>

        {/* Central Core Visual & Pillar Selector */}
        <div className="mt-10 sm:mt-14 max-w-5xl mx-auto">
          {/* Center Brand Badge with radial connection cues */}
          <div className="flex flex-col items-center justify-center text-center mb-6 sm:mb-8">
            <div className="p-3.5 sm:p-4 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-white dark:bg-[#0E101F] shadow-md shadow-indigo-100/50 dark:shadow-[0_0_40px_rgba(99,102,241,0.25)] flex items-center gap-3">
              <EcoMateLogo size={36} showWordmark={false} />
              <div className="text-left">
                <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-wide">
                  {content.ecosystem.centerNodeTitle}
                </span>
                <p className="text-[11px] sm:text-xs text-indigo-700 dark:text-indigo-300 font-medium">{chrome.centerTagline}</p>
              </div>
            </div>
            <div className="w-0.5 h-4 sm:h-6 bg-gradient-to-b from-indigo-500 to-transparent" />
          </div>

          {/* 6 Peripheral Pillars - single column at 360px, 2-col from 480px up */}
          {activeNode ? (
          <>
          <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {content.ecosystem.nodes.map((node) => {
              const isActive = activeNode.id === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => setActiveNodeId(node.id)}
                  className={`p-3 sm:p-3.5 rounded-xl border text-left transition-all relative cursor-pointer ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50/90 dark:bg-indigo-950/40 shadow-xs ring-1 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="mb-1.5 sm:mb-2">{getIcon(node.iconName)}</div>
                  <h4 className={`text-[13px] font-bold leading-snug ${isActive ? 'text-indigo-950 dark:text-white' : 'text-slate-800 dark:text-white'}`}>
                    {node.title}
                  </h4>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">{node.subtitle}</p>

                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 sm:w-8 h-1 bg-indigo-600 dark:bg-indigo-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Pillar Capabilities Card */}
          <div className="mt-6 sm:mt-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] p-5 sm:p-8 shadow-md dark:shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.08] pb-4 sm:pb-5">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20">
                  {getIcon(activeNode.iconName)}
                </div>
                <div>
                  <span className="text-[10px] sm:text-[11px] font-mono text-indigo-700 dark:text-indigo-300 uppercase tracking-wider font-semibold">
                    {chrome.pillarPrefix} {activeNode.subtitle}
                  </span>
                  <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{activeNode.title}</h3>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                {chrome.integratedBadge}
              </span>
            </div>

            <div className="mt-5 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {activeNode.items.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 dark:border-white/[0.06] bg-slate-50 dark:bg-white/[0.02] p-3 sm:p-4 flex items-start gap-2.5"
                >
                  <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400">
                    <Check className="h-3 w-3" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100">{item}</p>
                    <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 mt-0.5">{chrome.itemNote}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 sm:mt-6 pt-4 sm:pt-5 border-t border-slate-200 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
              <p className="max-w-xl">
                {chrome.connectBody}
              </p>
              <a
                href="#lead-form"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {chrome.walkthroughCta}
              </a>
            </div>
          </div>
          </>
          ) : null}
        </div>
      </div>
    </section>
  );
};
