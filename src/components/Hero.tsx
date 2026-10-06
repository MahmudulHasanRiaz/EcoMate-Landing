import React, { useState } from 'react';
import { LandingContent, Locale } from '../types/landing';
import {
  ArrowRight,
  MessageCircle,
  PhoneCall,
  CheckCircle2,
  PackageCheck,
  ShieldCheck,
  Store,
  Warehouse,
  BarChart3,
  Layers,
  Sparkles,
  Barcode,
  Truck,
  AlertTriangle,
} from 'lucide-react';

interface HeroProps {
  content: LandingContent;
  locale: Locale;
}

export const Hero: React.FC<HeroProps> = ({ content, locale }) => {
  const [activeHeroTab, setActiveHeroTab] = useState<'overview' | 'packing' | 'courier' | 'pos'>('overview');

  const scrollToLead = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.querySelector('#lead-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="hero" className="relative overflow-hidden pt-6 pb-10 sm:pt-12 sm:pb-20 md:pt-20 md:pb-28">
      {/* Ambient background glows matching reference design with light/dark adaptability */}
      <div 
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[550px] md:w-[1100px] md:h-[650px] rounded-full blur-[140px] opacity-30 dark:opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.45) 0%, rgba(139, 92, 246, 0.25) 45%, rgba(67, 56, 202, 0.08) 80%, transparent 100%)',
        }}
      />
      <div 
        className="pointer-events-none absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full blur-[160px] opacity-15"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, transparent 70%)',
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Editorial Pill Sub-badge */}
        <div className="flex justify-center mb-2.5 sm:mb-6">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50/90 dark:bg-indigo-500/10 px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-xs backdrop-blur-md">
            <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate max-w-[280px] sm:max-w-none">{content.hero.badge}</span>
          </div>
        </div>

        {/* Hero Headline with Editorial Italic Distinction */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-[1.7rem] sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white leading-[1.15] sm:leading-[1.12] text-balance">
            {content.hero.headlinePart1}
            <span className="font-serif-italic font-normal text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 dark:from-indigo-200 dark:via-indigo-100 dark:to-purple-200 underline decoration-indigo-300 dark:decoration-indigo-400/40 underline-offset-4 sm:underline-offset-8">
              {content.hero.headlineHighlight}
            </span>
            {content.hero.headlinePart2}
          </h1>

          <p className="mt-2.5 sm:mt-5 text-sm sm:text-lg md:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto text-balance">
            {content.hero.subtitle}
          </p>

          {/* Primary & Secondary CTAs - Clean Mobile-First Layout */}
          <div id="hero-primary-cta" className="mt-5 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 relative z-30 isolate w-full max-w-xs sm:max-w-none mx-auto">
            <a
              href="#lead-form"
              onClick={scrollToLead}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base font-semibold text-white shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0"
            >
              <span>{content.hero.primaryCta}</span>
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20I%20am%20interested%20in%20a%20demo%20for%20my%20ecommerce%20operation."
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 dark:border-white/15 bg-white dark:bg-white/[0.04] px-5 sm:px-7 py-3 sm:py-3.5 text-sm sm:text-base font-medium text-slate-700 dark:text-slate-200 shadow-xs backdrop-blur-md transition-all hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white cursor-pointer shrink-0"
            >
              <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{locale === 'en' ? 'WhatsApp Sales' : 'হোয়াটসঅ্যাপে কথা বলুন'}</span>
            </a>
          </div>

          {/* Direct WhatsApp / Messenger / Phone Conversion Paths */}
          <div className="mt-3.5 sm:mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:gap-6 text-xs text-slate-600 dark:text-slate-400">
            <a
              href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20I%20am%20interested%20in%20a%20demo%20for%20my%20ecommerce%20operation."
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 hover:underline transition-colors font-medium"
            >
              <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{content.hero.contactOptions.whatsappText}</span>
            </a>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">·</span>
            <a
              href="https://m.me/ecomate.app"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 hover:underline transition-colors font-medium"
            >
              <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              <span>{content.hero.contactOptions.messengerText}</span>
            </a>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <a
              href="tel:+8801894828290"
              className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <PhoneCall className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-500 dark:text-slate-300" />
              <span className="font-mono-numbers font-medium">{content.hero.contactOptions.callText}</span>
            </a>
          </div>

          {/* Trust proof indicators - compact on mobile, wraps cleanly at 360px */}
          <div className="mt-4 sm:mt-8 pt-3 sm:pt-6 border-t border-slate-200/80 dark:border-white/[0.06] grid grid-cols-3 gap-2 sm:gap-6 max-w-xl mx-auto text-center px-1">
            <div className="min-w-0">
              <p className="text-[13px] sm:text-2xl font-bold text-slate-900 dark:text-white font-mono-numbers leading-tight break-words">{content.hero.trustProof.stat1}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{content.hero.trustProof.stat1Label}</p>
            </div>
            <div className="border-x border-slate-200 dark:border-white/[0.08] px-1 min-w-0">
              <p className="text-[13px] sm:text-2xl font-bold text-slate-900 dark:text-white font-mono-numbers leading-tight break-words">{content.hero.trustProof.stat2}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{content.hero.trustProof.stat2Label}</p>
            </div>
            <div className="min-w-0">
              <p className="text-[13px] sm:text-2xl font-bold text-slate-900 dark:text-white font-mono-numbers leading-tight break-words">{content.hero.trustProof.stat3}</p>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">{content.hero.trustProof.stat3Label}</p>
            </div>
          </div>
        </div>

        {/* Signature Editorial Console Deck: Convergence Architecture Integrated into Live Operations View */}
        <div className="mt-8 sm:mt-12 lg:mt-14 relative z-10 clear-both max-w-6xl mx-auto">
          {/* Subtle perimeter glow around dashboard container */}
          <div className="pointer-events-none absolute -inset-1.5 rounded-3xl bg-gradient-to-b from-indigo-500/15 via-purple-500/10 to-transparent dark:from-indigo-500/25 dark:via-purple-500/15 blur-2xl opacity-60" />

          <div className="relative rounded-2xl sm:rounded-3xl border border-[#DDE1F0] dark:border-white/10 bg-white dark:bg-[#0B0D18]/95 shadow-xl shadow-indigo-200/60 dark:shadow-[0_25px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden">
            {/* Unified Convergence Strip: Feeding Real-Time Signals into EcoMate Engine */}
            <div className="border-b border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] p-3.5 sm:p-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3.5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {locale === 'en' ? 'Central Operating Bus · Live Synchronized Feed' : 'সেন্ট্রাল অপারেটিং বাস · লাইভ সিনক্রোনাইজড ফিড'}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-semibold">
                  Sales and fulfillment nodes connected
                </span>
              </div>

              {/* 4 Connected Convergence Micro-Nodes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200/70 dark:border-white/[0.05] flex items-center gap-2.5 shadow-2xs">
                  <div className="h-7 w-7 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                    <Store className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Web Stores</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">WooCommerce · Custom</p>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200/70 dark:border-white/[0.05] flex items-center gap-2.5 shadow-2xs">
                  <div className="h-7 w-7 rounded-lg bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <Store className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Physical POS</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Banani · Dhanmondi</p>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200/70 dark:border-white/[0.05] flex items-center gap-2.5 shadow-2xs">
                  <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                    <Warehouse className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Warehouse Hub</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Multi-Bin · Barcode Lock</p>
                  </div>
                </div>

                <div className="p-2.5 sm:p-3 rounded-xl bg-white dark:bg-black/30 border border-slate-200/70 dark:border-white/[0.05] flex items-center gap-2.5 shadow-2xs">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Truck className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">Courier Fleet</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">Steadfast · Pathao</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Bar of Dashboard Simulation */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.08] px-3 py-2.5 sm:px-6 sm:py-3 bg-white dark:bg-[#0E1020]">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 ml-1.5 hidden md:inline">
                  EcoMate Central Operations Console · v4.2
                </span>
                <span className="ml-1 shrink-0 whitespace-nowrap rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
                  Demo data
                </span>
              </div>

              {/* Interactive View Switcher Tabs inside the Hero Frame */}
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-black/40 p-1 border border-slate-200 dark:border-white/5 overflow-x-auto max-w-full scrollbar-none">
                <button
                  onClick={() => setActiveHeroTab('overview')}
                  className={`px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    activeHeroTab === 'overview'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {locale === 'en' ? 'Live Overview' : 'লাইভ ড্যাশবোর্ড'}
                </button>
                <button
                  onClick={() => setActiveHeroTab('packing')}
                  className={`px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    activeHeroTab === 'packing'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {locale === 'en' ? 'Smart Packing Station' : 'স্মার্ট প্যাকিং'}
                </button>
                <button
                  onClick={() => setActiveHeroTab('courier')}
                  className={`px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    activeHeroTab === 'courier'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {locale === 'en' ? 'Fraud & Courier Check' : 'ফ্রড ও কুরিয়ার চেক'}
                </button>
                <button
                  onClick={() => setActiveHeroTab('pos')}
                  className={`px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-md transition-all whitespace-nowrap cursor-pointer ${
                    activeHeroTab === 'pos'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {locale === 'en' ? 'Showroom POS Sync' : 'শোরুম পিওএস সিঙ্ক'}
                </button>
              </div>
            </div>

            {/* Dashboard Workspace View */}
            <div className="p-3 sm:p-6 lg:p-8">
              {/* TAB 1: OVERVIEW */}
              {activeHeroTab === 'overview' && (
                <div className="space-y-6">
                  {/* Top 4 KPI Metrics */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{locale === 'en' ? "Today's Net Revenue" : 'আজকের নেট রেভিনিউ'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono-numbers font-semibold">+18.2%</span>
                      </div>
                      <p className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono-numbers">
                        ৳ 2,84,650
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">1,248 orders dispatched</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{locale === 'en' ? 'Fulfillment Accuracy' : 'প্যাকিং নির্ভুলতা'}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">Scan-checked</span>
                      </div>
                      <p className="mt-2 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers">
                        Blocked at scan
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">Mismatches stopped before labels print</p>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{locale === 'en' ? 'Courier Risk Pre-Check' : 'কুরিয়ার সাকসেস রেট'}</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">Steadfast + Pathao</span>
                      </div>
                      <p className="mt-2 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers">
                        {locale === 'en' ? 'Checked' : 'সম্পন্ন'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        {locale === 'en'
                          ? 'Per-courier delivery history reviewed before dispatch'
                          : 'ডিসপ্যাচের আগে প্রতিটি কুরিয়ারে ডেলিভারি হিস্ট্রি যাচাই করা হয়'}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-white/[0.02] p-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>{locale === 'en' ? 'Reconciled COD Cash' : 'রিকনসাইল্ড সিওডি ক্যাশ'}</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-mono-numbers font-medium">Today</span>
                      </div>
                      <p className="mt-2 text-xl sm:text-2xl font-bold text-indigo-700 dark:text-indigo-300 font-mono-numbers">
                        ৳ 14,20,500
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">Matched line by line to bank deposits</p>
                    </div>
                  </div>

                  {/* Middle Section: Live Channel Sync & Order Stream */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Real-time Order & Dispatch Velocity Graph */}
                    <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 sm:p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                            {locale === 'en' ? 'Real-Time Dispatch Velocity' : 'লাইভ ডিসপ্যাচ ভেলোসিটি'}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {locale === 'en' ? 'Orders verified and handed over by hour' : 'প্রতি ঘণ্টায় ভেরিফাইড পার্সেল সংখ্যা'}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Stream
                        </span>
                      </div>

                      {/* Simulated elegant bar chart - horizontal scroll on 360px so bars never crush */}
                      <div className="overflow-x-auto -mx-1 px-1">
                      <div className="h-44 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-2 border-b border-slate-200 dark:border-white/[0.06] min-w-[480px] sm:min-w-0">
                        {[
                          { time: '9 AM', count: 42, height: '35%' },
                          { time: '10 AM', count: 78, height: '58%' },
                          { time: '11 AM', count: 120, height: '82%' },
                          { time: '12 PM', count: 145, height: '94%' },
                          { time: '1 PM', count: 98, height: '65%' },
                          { time: '2 PM', count: 135, height: '88%' },
                          { time: '3 PM', count: 160, height: '100%' },
                          { time: '4 PM', count: 140, height: '90%' },
                        ].map((col, idx) => (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                              {col.count}
                            </span>
                            <div className="w-full rounded-t-md bg-gradient-to-t from-indigo-600 via-indigo-500 to-purple-400 transition-all duration-300 group-hover:brightness-110" style={{ height: col.height }} />
                            <span className="text-[10px] text-slate-500 font-mono">{col.time}</span>
                          </div>
                        ))}
                      </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-indigo-600 inline-block" />
                            Smart Packed
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-purple-500 inline-block" />
                            Courier Handover
                          </span>
                        </div>
                        <span className="text-slate-700 dark:text-slate-300 font-mono-numbers font-medium">Timed packing flow per order</span>
                      </div>
                    </div>

                    {/* Active Channels & Showrooms */}
                    <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3 flex items-center justify-between">
                          <span>{locale === 'en' ? 'Active Commerce Nodes' : 'সক্রিয় সেলস নোড'}</span>
                          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">All synchronized</span>
                        </h4>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.04]">
                            <div className="flex items-center gap-2.5">
                              <Store className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                              <div>
                                <p className="text-xs font-semibold text-slate-900 dark:text-white">Main Woo Store (Online)</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">842 orders today · Auto-Synced</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">● Live</span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.04]">
                            <div className="flex items-center gap-2.5">
                              <Store className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                              <div>
                                <p className="text-xs font-semibold text-slate-900 dark:text-white">Gulshan Flagship POS</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">৳ 1,42,000 billed · Stock Synced</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">● Live</span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.04]">
                            <div className="flex items-center gap-2.5">
                              <Warehouse className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                              <div>
                                <p className="text-xs font-semibold text-slate-900 dark:text-white">Central Hub (Tejgaon)</p>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400">4,280 items in stock · Bin Map A-G</p>
                              </div>
                            </div>
                            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">● Live</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/[0.06] text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                        <span>Central Inventory Lock: Active</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Zero Overselling</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SMART PACKING STATION */}
              {activeHeroTab === 'packing' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Order Invoice Details */}
                  <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/[0.08] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">ORDER #EM-84920</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                            PACKING IN PROGRESS
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          Customer: Ashrafur Rahman · Banani, Dhaka · 01711-892410
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-semibold">2 of 2 Items Verified</span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Invoice total: ৳ 4,650 (COD)</p>
                      </div>
                    </div>

                    {/* Packing Items with Barcode Verification State */}
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">Classic Oxford Shirt - Navy Blue</p>
                            <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                              Size: 42 (L) · SKU: OXF-NVY-42 · Bin: A-14-3
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded font-semibold">
                            <Barcode className="h-3 w-3" /> 890124800291 [MATCH]
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-white">Handcrafted Leather Belt - Tan</p>
                            <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                              Size: 110cm · SKU: BLT-TAN-110 · Bin: C-02-1
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-0.5 rounded font-semibold">
                            <Barcode className="h-3 w-3" /> 890124800742 [MATCH]
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Operator Feedback Indicator */}
                    <div className="mt-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Barcode Scan Audio Verification: <strong>MATCHED (Chime Sound)</strong></span>
                      </div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Mismatch protection enabled</span>
                    </div>
                  </div>

                  {/* Shipping Label Ready Panel */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">Courier Consignment</span>
                        <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">Steadfast API</span>
                      </div>

                      <div className="rounded-lg bg-slate-50 dark:bg-white p-3 text-slate-900 border border-slate-200 shadow-sm">
                        <div className="border-b border-slate-200 pb-2 mb-2 flex items-center justify-between">
                          <span className="font-bold text-xs">STEADFAST COURIER</span>
                          <span className="font-mono text-[10px] font-semibold text-indigo-700">COD: ৳ 4,650</span>
                        </div>
                        <p className="font-mono text-xs font-bold">CID: ST-99214820</p>
                        <p className="text-[10px] text-slate-700 mt-1">Recipient: Ashrafur Rahman (Banani)</p>
                        <div className="mt-2 h-7 bg-slate-800 rounded flex items-center justify-center text-white font-mono text-[10px]">
                          |||||||||||||||||||||||||||||||||||||||||||||||||||||
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <button className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer">
                        <PackageCheck className="h-4 w-4" />
                        <span>Print Label & Seal Parcel</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: COURIER & FRAUD INTELLIGENCE */}
              {activeHeroTab === 'courier' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer Risk Assessment */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Courier Network History Check</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Pre-dispatch evaluation for Phone: 01711-892410</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> High Trust Score
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.04]">
                        <p className="text-lg font-bold text-slate-900 dark:text-white font-mono-numbers">48</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Total Deliveries</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.04]">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers">47</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Successfully Received</p>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.04]">
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono-numbers">97.9%</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Delivery Success</p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                      ✓ No fake order history. Safe to dispatch without upfront delivery charge.
                    </div>
                  </div>

                  {/* Contrast: High Risk Fake Order Alert */}
                  <div className="rounded-xl border border-rose-200 dark:border-rose-500/20 bg-rose-50/60 dark:bg-rose-950/10 p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-rose-200 dark:border-rose-500/20 pb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-rose-800 dark:text-rose-300">Suspicious Order Flagged</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Order #EM-84918 · Phone: 01923-410982</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-500/30 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" /> High Return Risk
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-white dark:bg-black/30 border border-rose-100 dark:border-white/[0.04]">
                        <p className="text-lg font-bold text-slate-900 dark:text-white font-mono-numbers">14</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Past Orders</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-black/30 border border-rose-100 dark:border-white/[0.04]">
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono-numbers">11</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Returned / Refused</p>
                      </div>
                      <div className="p-3 rounded-lg bg-white dark:bg-black/30 border border-rose-100 dark:border-white/[0.04]">
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono-numbers">21.4%</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Success Rate</p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-rose-100/70 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-800 dark:text-rose-300 font-medium">
                      ⚠ Serial returner. EcoMate recommends requesting advance delivery fee before courier dispatch.
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: SHOWROOM POS SYNC */}
              {activeHeroTab === 'pos' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.08] pb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Gulshan Flagship POS Register 01</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Cashier: Sajjad Hossain · Shift: Morning</p>
                      </div>
                      <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">● Connected to Central Hub</span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.04] text-slate-800 dark:text-slate-200">
                        <span>Slim Fit Chino (Khaki 32) × 1</span>
                        <span className="font-mono-numbers font-semibold">৳ 2,150</span>
                      </div>
                      <div className="flex justify-between p-2 rounded bg-slate-50 dark:bg-black/30 border border-slate-200/80 dark:border-white/[0.04] text-slate-800 dark:text-slate-200">
                        <span>Pima Cotton Tee (White M) × 2</span>
                        <span className="font-mono-numbers font-semibold">৳ 2,400</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-slate-100/70 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06] flex items-center justify-between">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Split Payment Applied:</span>
                      <div className="flex gap-2 text-xs font-mono-numbers">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-medium">Cash: ৳ 2,000</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-800 dark:text-indigo-300 font-medium">bKash: ৳ 2,550</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] p-5 shadow-sm flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Automated Inventory Deduction</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        The moment this sale completes at the Gulshan showroom counter:
                      </p>
                      <ul className="mt-3 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Gulshan floor stock decremented</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Online WooCommerce stock auto-updated</span>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>COGS & Cash-drawer ledger posted</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/[0.06] text-xs font-mono text-indigo-700 dark:text-indigo-300 text-center font-medium">
                      Zero stock desync across retail & web
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
