import React, { useRef, useState } from 'react';
import { useLanding } from '@/components/shell/useLanding';
import { trackBrowserLead } from '../../components/MetaPixel';
import { Turnstile, type TurnstileHandle } from '../../components/Turnstile';
import {
  MessageSquare,
  PhoneCall,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';

/** Must match the version the server stores in `leads.consent_text` (Task 13 §5). */
const CONSENT_TEXT_VERSION = 'privacy-v1';

/** Read a first-party cookie value (`_fbp` / `_fbc`) without throwing on a locked document. */
function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * One `event_id` for the browser pixel and the server CAPI call, so Meta deduplicates them.
 * `randomUUID` needs a secure context; the fallback keeps submission working otherwise.
 */
function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export const FinalConversionSection: React.FC = () => {
  const { content, locale } = useLanding();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
                        volume: content.leadForm.volumeOptions[1] || '150-500 orders / day',
    note: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  // Unticked by default: consent has to be an explicit act, never a pre-checked box.
  const [consentGiven, setConsentGiven] = useState(false);
  // Turnstile widget handle: rendered lazily on submit, so nothing loads until then.
  const turnstileRef = useRef<TurnstileHandle | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate Required fields
    if (!formData.name.trim()) {
      setFormError(locale === 'en' ? 'Please enter your name.' : 'অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 8) {
      setFormError(
        locale === 'en'
          ? 'Please enter a valid phone number (e.g. 01712-345678).'
          : 'অনুগ্রহ করে সঠিক ফোন নম্বর দিন (যেমন: ০১৭১২-৩৪৫৬৭৮)।'
      );
      return;
    }
    if (!consentGiven) {
      setFormError(
        locale === 'en'
          ? 'Please tick the consent box so we are allowed to contact you.'
          : 'যোগাযোগের অনুমতি দিতে অনুগ্রহ করে সম্মতির ঘরটি টিক দিন।'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Shared with the server-side Conversions API event: Meta deduplicates the browser
      // and server `Lead` events on this id (Task 13 §4).
      const eventId = newEventId();

      // Bot check (Task 14 §2): the widget is rendered only now and stays invisible unless
      // Cloudflare asks for an interaction. `''` = Turnstile not configured (the server
      // skips verification); `null` = challenge could not be completed → do not submit.
      let turnstileToken = '';
      const turnstile = turnstileRef.current;
      if (turnstile) {
        const token = await turnstile.getToken();
        if (token === null) {
          throw new Error(
            locale === 'en'
              ? 'Human verification failed. Please try again.'
              : 'মানব যাচাইকরণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।'
          );
        }
        turnstileToken = token;
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          dailyVolume: formData.volume,
          note: formData.note.trim(),
          source: 'landing_page_lead_form',
          consentGiven: true,
          consentText: CONSENT_TEXT_VERSION,
          eventId,
          fbp: readCookie('_fbp'),
          fbc: readCookie('_fbc'),
          turnstileToken,
        }),
      });

      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const serverMessage =
          typeof payload === 'object' && payload !== null && typeof (payload as { error?: unknown }).error === 'string'
            ? (payload as { error: string }).error
            : '';
        throw new Error(
          serverMessage ||
            (locale === 'en'
              ? 'Submission error. Please try again or call directly.'
              : 'অনুরোধটি ব্যর্থ হয়েছে। আবার চেষ্টা করুন বা সরাসরি কল করুন।')
        );
      }

      // Browser half of the deduplicated conversion. The server sends the other half with
      // the same event_id from the POST handler.
      trackBrowserLead(eventId);
      setIsSubmitted(true);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error && err.message
          ? err.message
          : locale === 'en'
            ? 'Submission failed. Please call or WhatsApp us directly.'
            : 'অনুরোধটি পাঠানো সম্ভব হয়নি। সরাসরি ফোন বা হোয়াটসঅ্যাপে যোগাযোগ করুন।'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="lead-form" className="relative py-14 md:py-24 border-t border-[#DDE1F0] dark:border-white/[0.06] bg-[#EDEEF6] dark:bg-[#07080E] overflow-hidden transition-colors">
      {/* Background glowing aura */}
      <div 
        className="pointer-events-none absolute -bottom-20 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-[140px] opacity-15 dark:opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.2) 50%, transparent 80%)',
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-12 items-center">
          {/* Left Column: Direct Call & Conversions (col-span-5) */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{content.leadForm.eyebrow}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight text-balance">
              {content.leadForm.heading}
            </h2>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed text-balance">
              {content.leadForm.subheading}
            </p>

            <div className="pt-2 sm:pt-4 space-y-2.5 sm:space-y-3">
              <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Direct Channels Available Now:
              </p>

              {/* WhatsApp direct CTA */}
              <a
                href="https://wa.me/8801894828290?text=Hello%20EcoMate%20Team%2C%20I%20would%20like%20to%20schedule%20a%20walkthrough."
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/30 transition-all text-xs shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-xs">
                    WA
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">WhatsApp Live Chat</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[10px] sm:text-[11px]">Chat with an operations specialist</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              </a>

              {/* Messenger direct CTA */}
              <a
                href="https://m.me/ecomate.app"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/30 transition-all text-xs shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                    FB
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Facebook Messenger</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[10px] sm:text-[11px]">Direct message EcoMate page</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </a>

              {/* Direct Phone Call */}
              <a
                href="tel:+8801894828290"
                className="flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all text-xs shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white flex items-center justify-center">
                    <PhoneCall className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">Direct Phone Line</span>
                    <span className="text-slate-600 dark:text-slate-300 text-[10px] sm:text-[11px] font-mono-numbers">+880 1894-828290</span>
                  </div>
                </div>
                <span className="text-slate-600 font-mono text-[10px] sm:text-[11px] dark:text-slate-300">Sun-Thu 9am-8pm</span>
              </a>
            </div>
          </div>

          {/* Right Column: High-Converting Streamlined Demo Booking Form (col-span-7) */}
          <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1C] p-5 sm:p-10 shadow-md dark:shadow-2xl relative">
            {isSubmitted ? (
              <div className="py-6 sm:py-8 text-center space-y-3 sm:space-y-4 animate-in fade-in duration-300">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md shadow-emerald-200">
                  <CheckCircle2 className="h-7 w-7 sm:h-8 sm:w-8" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                  {content.leadForm.successHeading}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
                  {content.leadForm.successMessage}
                </p>
                <div className="pt-3">
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({
                        name: '',
                        phone: '',
                        email: '',
    volume: content.leadForm.volumeOptions[1] || '150-500 orders / day',
                        note: '',
                      });
                      // Consent is per submission: a new request needs a fresh, explicit tick.
                      setConsentGiven(false);
                    }}
                    className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Submit another consultation request
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-xs">
                    {formError}
                  </div>
                )}

                {/* Name Field (Required) */}
                <div>
                  <label htmlFor="lead-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    {content.leadForm.nameLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input id="lead-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={content.leadForm.namePlaceholder}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {/* Phone Field (Required) */}
                <div>
                  <label htmlFor="lead-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    {content.leadForm.phoneLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input id="lead-phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder={content.leadForm.phonePlaceholder}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm font-mono-numbers focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {/* Email Field (Optional) */}
                <div>
                  <label htmlFor="lead-email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {content.leadForm.emailLabel}
                  </label>
                  <input id="lead-email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={content.leadForm.emailPlaceholder}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                </div>

                {/* Daily Order Volume Select */}
                <div>
                  <label htmlFor="lead-volume" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {content.leadForm.volumeLabel}
                  </label>
                  <select id="lead-volume"
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    className="w-full px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-slate-50 dark:bg-[#090B14] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                  >
                    {content.leadForm.volumeOptions.map((opt, idx) => (
                      <option key={idx} value={opt} className="bg-white dark:bg-[#090B14] text-slate-900 dark:text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Operational Note (Optional) */}
                <div>
                  <label htmlFor="lead-note" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {content.leadForm.noteLabel}
                  </label>
                  <textarea id="lead-note"
                    rows={2}
                    value={formData.note}
                    onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    placeholder={content.leadForm.notePlaceholder}
                    className="w-full px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
                  />
                </div>

                {/* Consent — legally required before we may store PII or fire a conversion
                    event, and unticked by default. The server rejects a POST without it. */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      aria-required="true"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-white/20 dark:bg-black/40"
                    />
                    <span>{content.leadForm.consentLabel}</span>
                  </label>
                </div>

                {/* Turnstile (Task 14 §2). Renders nothing at all until the form is
                    submitted, and even then only becomes visible if Cloudflare asks for an
                    interaction — the mobile layout stays exactly as it was. */}
                <div className="pt-1">
                  <Turnstile ref={turnstileRef} className="flex justify-center" />
                </div>

                {/* Primary Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 hover:brightness-105 text-white font-bold text-sm shadow-md shadow-indigo-300/50 dark:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{content.leadForm.submittingText}</span>
                      </>
                    ) : (
                      <>
                        <span>{content.leadForm.submitCta}</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="pt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                  <span>{content.leadForm.privacyNote}</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
