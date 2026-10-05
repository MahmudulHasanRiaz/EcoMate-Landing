import React from 'react';
import { EcoMateLogo } from './EcoMateLogo';
import { LandingContent, Locale } from '../types/landing';
import { Globe, PhoneCall, Mail, MapPin, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  content: LandingContent;
  locale: Locale;
  onToggleLocale: () => void;
}

export const Footer: React.FC<FooterProps> = ({ content, locale, onToggleLocale }) => {
  return (
    <footer className="border-t border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#05060A] text-slate-600 dark:text-slate-400 text-xs py-14 transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand Col (col-span-2) */}
          <div className="lg:col-span-2 space-y-4">
            <EcoMateLogo size={34} />
            <p className="text-slate-600 dark:text-slate-400 text-sm max-w-sm leading-relaxed">
              {content.footer.tagline}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={onToggleLocale}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-white/[0.04] text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors shadow-2xs cursor-pointer"
              >
                <Globe className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{locale === 'en' ? 'বাংলায় দেখুন (Bangla)' : 'Switch to English'}</span>
              </button>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-200 uppercase text-[11px] tracking-wider">
              {content.footer.linksTitle}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#ecosystem" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Central Architecture
                </a>
              </li>
              <li>
                <a href="#multi-channel" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Multi-Store & Showrooms
                </a>
              </li>
              <li>
                <a href="#fulfillment" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Fulfillment Pipeline
                </a>
              </li>
              <li>
                <a href="#loss-prevention" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Loss Prevention
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Commercial Plans
                </a>
              </li>
            </ul>
          </div>

          {/* Capabilities */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-200 uppercase text-[11px] tracking-wider">
              {content.footer.operationsTitle}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#tour" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Smart Packing Workspace
                </a>
              </li>
              <li>
                <a href="#pos-showrooms" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Showroom Cloud POS
                </a>
              </li>
              <li>
                <a href="#tour" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Courier Reconciliation
                </a>
              </li>
              <li>
                <a href="#inventory-finance" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Double-Entry Ledger
                </a>
              </li>
              <li>
                <a href="#marketing" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  Server-Side Meta CAPI
                </a>
              </li>
            </ul>
          </div>

          {/* Direct Contact */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-200 uppercase text-[11px] tracking-wider">
              {content.footer.contactTitle}
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <PhoneCall className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <a href={`tel:${content.footer.phone}`} className="hover:text-slate-900 dark:hover:text-white font-mono-numbers font-medium">
                  {content.footer.phone}
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <a href={`mailto:${content.footer.email}`} className="hover:text-slate-900 dark:hover:text-white font-medium">
                  {content.footer.email}
                </a>
              </li>
              <li className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>{content.footer.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <p>{content.footer.copyright}</p>
          <div className="flex items-center gap-5">
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-400 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-400 transition-colors">Security & RBAC</a>
            <a href="#" className="hover:text-slate-800 dark:hover:text-slate-400 transition-colors">System Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
