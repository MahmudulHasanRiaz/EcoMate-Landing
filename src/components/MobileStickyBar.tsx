import React, { useState, useEffect } from 'react';
import { LandingContent, Locale } from '../types/landing';
import { ArrowUpRight, MessageCircle, PhoneCall, X } from 'lucide-react';

interface MobileStickyBarProps {
  content: LandingContent;
  locale: Locale;
}

export const MobileStickyBar: React.FC<MobileStickyBarProps> = ({ content, locale }) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [hasScrolledPastHero, setHasScrolledPastHero] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Reveal sticky bar only after the visitor has scrolled past the hero CTA block (~260px)
      // This guarantees the Hero CTA has 100% unobstructed visibility on smaller mobile devices
      if (window.scrollY > 260) {
        setHasScrolledPastHero(true);
      } else {
        setHasScrolledPastHero(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (isDismissed || !hasScrolledPastHero) return null;

  const scrollToLead = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.querySelector('#lead-form');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <aside
      aria-label="Quick contact"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 dark:border-white/10 bg-white/95 dark:bg-[#07080E]/95 backdrop-blur-xl px-3 py-2 shadow-[0_-5px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-10px_30px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom duration-300"
      style={{ maxHeight: '12vh' }} // Strictly complies with < 15% mobile sticky cap rule
    >
      <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
        {/* WhatsApp Direct */}
        <a
          href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20I%20would%20like%20to%20know%20more."
          target="_blank"
          rel="noreferrer"
          className="h-10 w-10 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-colors shadow-2xs"
          aria-label="WhatsApp"
        >
          <MessageCircle className="h-5 w-5" />
        </a>

        {/* Direct Call */}
        <a
          href="tel:+8801894828290"
          className="h-10 w-10 shrink-0 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white border border-slate-200 dark:border-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors shadow-2xs"
          aria-label="Call"
        >
          <PhoneCall className="h-4 w-4" />
        </a>

        {/* Primary Booking CTA */}
        <a
          href="#lead-form"
          onClick={scrollToLead}
          className="flex-1 h-10 px-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform"
        >
          <span className="truncate">{content.hero.primaryCta}</span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
        </a>

        {/* Dismiss Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
          aria-label="Dismiss quick contact bar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
