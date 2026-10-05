import React, { useState } from 'react';
import { Locale, Theme } from '../types/landing';
import { Settings2, Globe, Eye, EyeOff, X, Sun, Moon, LayoutDashboard } from 'lucide-react';

interface PrototypeControllerProps {
  locale: Locale;
  onToggleLocale: () => void;
  isPricingVisible: boolean;
  onTogglePricingMode: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const PrototypeController: React.FC<PrototypeControllerProps> = ({
  locale,
  onToggleLocale,
  isPricingVisible,
  onTogglePricingMode,
  theme,
  onToggleTheme,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside 
      aria-label="Prototype Evaluation Panel"
      className="fixed bottom-14 md:bottom-6 right-4 z-40"
    >
      {isOpen ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/15 bg-white/95 dark:bg-[#0B0D1B]/95 p-4 shadow-2xl backdrop-blur-xl w-72 text-xs text-slate-700 dark:text-slate-200 animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-2.5 mb-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
              <Settings2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Prototype Evaluation</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
              aria-label="Close controls"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Theme Switch */}
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                {theme === 'light' ? (
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                ) : (
                  <Moon className="h-3.5 w-3.5 text-indigo-400" />
                )}
                Appearance:
              </span>
              <button
                onClick={onToggleTheme}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white font-semibold dark:hover:bg-white/15 transition-colors cursor-pointer capitalize font-mono text-[11px]"
              >
                {theme === 'light' ? 'Light Mode ☀️' : 'Dark Mode 🌙'}
              </button>
            </div>

            {/* Language Switch */}
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                Language System:
              </span>
              <button
                onClick={onToggleLocale}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white font-semibold dark:hover:bg-white/15 transition-colors uppercase font-mono cursor-pointer"
              >
                {locale === 'en' ? 'English (EN)' : 'বাংলা (BN)'}
              </button>
            </div>

            {/* Pricing Architecture Switch */}
            <div className="flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                {isPricingVisible ? (
                  <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                )}
                Pricing Mode:
              </span>
              <button
                onClick={onTogglePricingMode}
                className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-white font-semibold dark:hover:bg-white/15 transition-colors text-[11px] cursor-pointer"
              >
                {isPricingVisible ? 'Tiered Visible' : 'Contact / Hidden'}
              </button>
            </div>

            {/* EcoMate Admin — a real, session-gated route (Auth.js), not a client modal.
                A plain <a> is deliberate: /admin is a separate document with its own
                no-store headers, so a client-side transition buys nothing. */}
            <div className="pt-2 border-t border-slate-200 dark:border-white/[0.08]">
              <a
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-105 text-white font-bold flex items-center justify-center gap-2 text-xs shadow-md shadow-indigo-300/40 cursor-pointer transition-all"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Open EcoMate Admin</span>
              </a>
            </div>

            <div className="pt-1 text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
              Full-Stack PostgreSQL Drizzle ORM ready with persistent schema, lead pipeline & live CMS.
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-white/95 dark:bg-[#0B0D1B]/90 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xl backdrop-blur-md hover:bg-indigo-50 dark:hover:bg-indigo-600/30 hover:text-indigo-900 dark:hover:text-white transition-all cursor-pointer ring-1 ring-slate-900/5"
          title="Prototype Controls (Theme, Language & Pricing Mode)"
        >
          <Settings2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <span className="hidden sm:inline">Prototype Controls</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 uppercase">
            {theme} · {locale}
          </span>
        </button>
      )}
    </aside>
  );
};
