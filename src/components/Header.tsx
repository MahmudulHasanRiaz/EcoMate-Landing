import React, { useState, useEffect } from 'react';
import { EcoMateLogo } from './EcoMateLogo';
import { LandingContent, Locale, Theme } from '../types/landing';
import { Globe, Menu, X, ArrowUpRight, PhoneCall, Sun, Moon, MessageCircle } from 'lucide-react';

interface HeaderProps {
  content: LandingContent;
  locale: Locale;
  theme: Theme;
  onToggleLocale: () => void;
  onToggleTheme: () => void;
  onOpenLeadModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  content,
  locale,
  theme,
  onToggleLocale,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Close the mobile dropdown with Escape. Cleanup on unmount or close.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [mobileMenuOpen]);

  // Intensify the glass once the hero scrolls away. No size change,
  // so the sticky pill never shifts page layout.
  useEffect(() => {
    const hero = document.querySelector('#hero');
    if (!hero) return;
    const observer = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-72px 0px 0px 0px' }
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  const shortCta = locale === 'en' ? 'Book Demo' : 'ডেমো বুক';

  return (
    <header className="sticky top-0 z-40 px-3 pt-2 sm:px-6 sm:pt-3">
      <div className="relative mx-auto max-w-7xl">
        {/* Floating glass pill. Detached from viewport edges on every breakpoint.
            Light: white glass at 80%+ opacity with indigo-tinted shadow.
            Dark: navy glass with inner top highlight. */}
        <div className={`relative flex h-16 items-center justify-between gap-2 overflow-hidden rounded-2xl border py-0 pr-2 pl-3 backdrop-blur-xl transition-all duration-300 sm:pl-4 ${scrolled ? 'border-[#D5DBF0] bg-white/90 shadow-[0_12px_32px_-8px_rgba(99,102,241,0.28),inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/15 dark:bg-[#0B0D18]/90 dark:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)]' : 'border-[#E0E4F2] bg-white/80 shadow-[0_8px_24px_-10px_rgba(99,102,241,0.22),inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/10 dark:bg-[#0B0D18]/80 dark:shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.08)]'}`}>
          {/* Glossy light streak across the top edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent dark:via-indigo-300/40"
          />

          {/* Left: brand mark */}
          <a
            href="#hero"
            onClick={(e) => scrollToSection(e, '#hero')}
            className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none"
            aria-label="EcoMate Home"
          >
            <EcoMateLogo
              size={32}
              wordmarkClassName="hidden text-lg font-bold tracking-tight text-slate-900 sm:inline dark:text-white"
            />
          </a>

          {/* Center: desktop nav in normal flow, centered via flex. Never overlaps. */}
          <nav
            aria-label="Primary"
            className="hidden min-w-0 flex-1 items-center justify-center gap-5 text-[13px] font-medium whitespace-nowrap text-slate-600 xl:flex 2xl:gap-7 2xl:text-sm dark:text-slate-300"
          >
            {content.header.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => scrollToSection(e, item.href)}
                className="rounded-md px-1 py-1 transition-colors duration-200 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Theme toggle */}
            <button
              onClick={onToggleTheme}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/70 text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
            </button>

            {/* Language toggle */}
            <button
              onClick={onToggleLocale}
              className="flex h-9 cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-white/70 px-2.5 text-[11px] font-semibold tracking-wider text-slate-700 uppercase transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              title={locale === 'en' ? 'Switch to Bangla' : 'Switch to English'}
              aria-label="Toggle language"
            >
              <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{locale === 'en' ? 'বাং' : 'EN'}</span>
            </button>

            {/* Quick call, tablet and up only to protect 360px widths */}
            <a
              href="tel:+8801894828290"
              className="hidden items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium whitespace-nowrap text-slate-600 transition-colors duration-200 hover:text-slate-950 md:inline-flex dark:text-slate-400 dark:hover:text-white"
            >
              <PhoneCall className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-mono-numbers">01894-828290</span>
            </a>

            {/* Primary CTA. Compact label under 420px so the pill never overflows. */}
            <a
              href="#lead-form"
              onClick={(e) => scrollToSection(e, '#lead-form')}
              className="inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 px-3.5 text-xs font-semibold whitespace-nowrap text-white shadow-md shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:outline-none active:scale-[0.98] sm:px-5"
            >
              <span className="hidden min-[420px]:inline">{content.header.ctaBookDemo}</span>
              <span className="min-[420px]:hidden">{shortCta}</span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
            </a>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-700 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none xl:hidden dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-panel"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown panel. Absolute overlay anchored to the pill,
            same glass language, never pushes page content around. */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-panel"
            className="absolute inset-x-0 top-[calc(100%+8px)] overflow-hidden rounded-2xl border border-[#E0E4F2] bg-white/90 p-2 shadow-xl shadow-indigo-200/40 backdrop-blur-xl xl:hidden dark:border-white/10 dark:bg-[#0B0D18]/95 dark:shadow-black/60"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {content.header.nav.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => scrollToSection(e, item.href)}
                  className="flex cursor-pointer items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-indigo-50 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:text-slate-200 dark:hover:bg-white/[0.06] dark:hover:text-white"
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                </a>
              ))}
            </nav>

            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-slate-200/80 p-2 dark:border-white/10">
              <a
                href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20I%20would%20like%20to%20know%20more%20about%20the%20platform"
                target="_blank"
                rel="noreferrer"
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-700 transition-colors duration-200 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </a>
              <a
                href="tel:+8801894828290"
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 transition-colors duration-200 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/10"
              >
                <PhoneCall className="h-3.5 w-3.5" />
                <span className="font-mono-numbers">01894-828290</span>
              </a>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
