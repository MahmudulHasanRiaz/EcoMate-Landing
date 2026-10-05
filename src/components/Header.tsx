import React, { useState } from 'react';
import { EcoMateLogo } from './EcoMateLogo';
import { LandingContent, Locale, Theme } from '../types/landing';
import { Globe, Menu, X, ArrowUpRight, PhoneCall, Sun, Moon } from 'lucide-react';

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

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#07080E]/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single element wordmark brand mark matching top bar contract */}
        <a 
          href="#" 
          className="flex items-center gap-2 group transition-opacity hover:opacity-90"
          aria-label="EcoMate Home"
        >
          <EcoMateLogo size={32} />
        </a>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
          {content.header.nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => scrollToSection(e, item.href)}
              className="transition-colors hover:text-slate-900 dark:hover:text-white hover:underline underline-offset-8 decoration-indigo-600/40 dark:decoration-indigo-400/40"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Actions + Theme Switcher + Language Switcher */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={onToggleTheme}
            className="flex items-center justify-center h-8 w-8 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4 text-slate-700" />
            ) : (
              <Sun className="h-4 w-4 text-amber-400" />
            )}
          </button>

          {/* Language Toggle Button */}
          <button
            onClick={onToggleLocale}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/[0.04] px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
            title={locale === 'en' ? 'Switch to Bangla' : 'Switch to English'}
            aria-label="Toggle language"
          >
            <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-semibold uppercase tracking-wider">{locale === 'en' ? 'বাং' : 'EN'}</span>
          </button>

          {/* Secondary Quick Call (Desktop) */}
          <a
            href="tel:+8801894828290"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white px-2 py-1 transition-colors"
          >
            <PhoneCall className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="font-mono-numbers">01894-828290</span>
          </a>

          {/* Primary CTA */}
          <a
            href="#lead-form"
            onClick={(e) => scrollToSection(e, '#lead-form')}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-indigo-500 whitespace-nowrap"
          >
            <span>{content.header.ctaBookDemo}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden flex items-center justify-center rounded-lg p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#090B14]/98 px-6 py-5 shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-3">
            {content.header.nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => scrollToSection(e, item.href)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] hover:text-slate-900 dark:hover:text-white"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
              <a
                href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20I%20would%20like%20to%20know%20more%20about%20the%20platform"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 border border-emerald-300 dark:border-emerald-500/30 py-2.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-600/30"
              >
                WhatsApp Direct Support
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
