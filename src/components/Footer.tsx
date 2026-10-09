import React from 'react';
import { EcoMateLogo } from './EcoMateLogo';
import type { NavItem } from '../types/landing';
import { useLanding } from '@/components/shell/useLanding';
import { Globe, PhoneCall, Mail, MapPin, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  const { content, locale, footerMenu: menu, toggleLocale: onToggleLocale } = useLanding();
  // M-44/M-45: the hardcoded English defaults are gone — the fallback is per-locale
  // content, and a present-but-empty DB menu falls back the same way.
  const DEFAULT_PLATFORM_LINKS: readonly NavItem[] = content.footer.defaultPlatformLinks;

  // M-45: a present-but-empty DB menu (`[]`) means "no links" to `??` — treat it as
  // "no menu configured" and fall back to the hardcoded links instead of blanking nav.
  const platformLinks: readonly NavItem[] = menu !== null && menu.length > 0 ? menu : DEFAULT_PLATFORM_LINKS;
  return (
    <footer className="border-t border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#05060A] text-slate-600 dark:text-slate-300 text-xs pt-14 pb-28 md:pb-14 transition-colors">
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
              {platformLinks.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="hover:text-slate-900 dark:hover:text-white transition-colors dark:text-slate-300">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Capabilities (M-44): per-locale anchors from content — no dead `#tour`. */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-slate-200 uppercase text-[11px] tracking-wider">
              {content.footer.operationsTitle}
            </h4>
            <ul className="space-y-2 text-xs">
              {content.footer.capabilities.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="hover:text-slate-900 dark:hover:text-white transition-colors dark:text-slate-300">
                    {item.label}
                  </a>
                </li>
              ))}
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
                {/* L-44: `tel:` URIs must not contain literal spaces — some dialers
                    misparse `tel:+880 1894-…`. The visible label keeps its spacing. */}
                <a href={`tel:${content.footer.phone.replace(/\s+/g, '')}`} className="hover:text-slate-900 dark:hover:text-white font-mono-numbers font-medium dark:text-slate-300">
                  {content.footer.phone}
                </a>
              </li>
              <li className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                <Mail className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <a href={`mailto:${content.footer.email}`} className="hover:text-slate-900 dark:hover:text-white font-medium dark:text-slate-300">
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
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600 dark:text-slate-300">
          <p>{content.footer.copyright}</p>
          <div className="flex items-center gap-5">
            {/* Legal pages (Task 20 §6): locale-routed in both languages. Sub-pages
                always use the explicit `/{locale}` prefix — `/privacy` is not a route. */}
            {/* M-44: legal labels are content, not hardcoded English. */}
            <a href={`/${locale}/privacy`} className="hover:text-slate-800 dark:hover:text-slate-400 transition-colors">{content.footer.privacyLabel}</a>
            <a href={`/${locale}/terms`} className="hover:text-slate-800 dark:hover:text-slate-400 transition-colors">{content.footer.termsLabel}</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
