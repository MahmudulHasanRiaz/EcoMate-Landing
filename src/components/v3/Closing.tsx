'use client';

/**
 * v3 closing: FAQ accordion + 3-field lead form.
 *
 * The form keeps the existing `/api/leads` contract exactly (consent literal,
 * Turnstile token, shared `event_id` for Pixel/CAPI dedup, Meta browser event
 * name from the server response). Only the fields shown changed to the
 * mockup's three: name, phone/WhatsApp, monthly orders.
 */
import React, { useRef, useState } from 'react';
import { trackBrowserLead } from '@/components/MetaPixel';
import { useLanding } from '@/components/shell/useLanding';
import { Turnstile, type TurnstileHandle } from '@/components/Turnstile';
import { SectionHead, SectionShell } from './SectionHead';

/** Must match the version the server stores in `leads.consent_text`. */
const CONSENT_TEXT_VERSION = 'privacy-v1';

function readCookie(name: string): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1] ?? '') : '';
}

function newEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `lead-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function MkFaq() {
  const { content } = useLanding();
  const faq = content.faq;

  return (
    <SectionShell id="faq">
      <SectionHead
        index="13"
        eyebrow={faq.eyebrow}
        title={faq.heading}
        sub={faq.subheading}
      />
      <div className="mk-pn">
        {faq.items.map((item) => (
          <details key={item.question}>
            <summary>{item.question}</summary>
            <p style={{ color: 'var(--mk-mu)' }}>{item.answer}</p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

export function MkLeadForm() {
  const { content, locale } = useLanding();
  const form = content.leadForm;

  const defaultVolume = (options: readonly string[]): string =>
    options[0] ?? form.volumeFallback;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [volume, setVolume] = useState(() => defaultVolume(form.volumeOptions));
  const [consentGiven, setConsentGiven] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle | null>(null);

  const required = (message: string): boolean => {
    setFormError(message);
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      required(locale === 'en' ? 'Please enter your name.' : 'অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }
    if (!phone.trim() || phone.trim().length < 8) {
      required(
        locale === 'en'
          ? 'Please enter a valid phone number.'
          : 'অনুগ্রহ করে সঠিক ফোন নম্বর দিন।',
      );
      return;
    }
    if (!consentGiven) {
      required(
        locale === 'en'
          ? 'Please tick the consent box so we are allowed to contact you.'
          : 'যোগাযোগের অনুমতি দিতে অনুগ্রহ করে সম্মতির ঘরটি টিক দিন।',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const eventId = newEventId();

      let turnstileToken = '';
      const turnstile = turnstileRef.current;
      if (turnstile) {
        const token = await turnstile.getToken();
        if (token === null) {
          throw new Error(
            locale === 'en'
              ? 'Human verification failed. Please try again.'
              : 'মানব যাচাইকরণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।',
          );
        }
        turnstileToken = token;
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          dailyVolume: volume,
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
              : 'অনুরোধটি ব্যর্থ হয়েছে। আবার চেষ্টা করুন বা সরাসরি কল করুন।'),
        );
      }

      const created: unknown = await response.json().catch(() => null);
      const browserEventName =
        typeof created === 'object' && created !== null
        && typeof (created as { meta?: { eventName?: unknown } }).meta?.eventName === 'string'
          ? (created as { meta: { eventName: string } }).meta.eventName
          : 'Lead';
      trackBrowserLead(eventId, browserEventName);
      setIsSubmitted(true);
    } catch (err: unknown) {
      setFormError(
        err instanceof Error && err.message
          ? err.message
          : locale === 'en'
            ? 'Submission failed. Please call or WhatsApp us directly.'
            : 'অনুরোধটি পাঠানো সম্ভব হয়নি। সরাসরি ফোন বা হোয়াটসঅ্যাপে যোগাযোগ করুন।',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SectionShell id="demo">
      <SectionHead index="14" eyebrow={form.eyebrow} title={form.heading} sub={form.subheading} />
      <div className="mk-pn" style={{ maxWidth: 560 }}>
        {isSubmitted ? (
          <div aria-live="polite">
            <p style={{ fontWeight: 700, fontSize: 17 }}>{form.successHeading}</p>
            <p style={{ color: 'var(--mk-mu)', marginTop: 8 }}>{form.successMessage}</p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} noValidate={false}>
            <label className="mk-label" htmlFor="mk-lead-name">
              {form.nameLabel}
            </label>
            <input
              id="mk-lead-name"
              className="mk-input"
              type="text"
              autoComplete="name"
              placeholder={form.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <label className="mk-label" htmlFor="mk-lead-phone">
              {form.phoneLabel}
            </label>
            <input
              id="mk-lead-phone"
              className="mk-input"
              type="tel"
              autoComplete="tel"
              placeholder={form.phonePlaceholder}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <label className="mk-label" htmlFor="mk-lead-volume">
              {form.volumeLabel}
            </label>
            <select
              id="mk-lead-volume"
              className="mk-input"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            >
              {form.volumeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <label
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13, color: 'var(--mk-mu)', margin: '4px 0 12px', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                style={{ position: 'static', opacity: 1, pointerEvents: 'auto', marginTop: 3 }}
              />
              {form.consentLabel}
            </label>
            <Turnstile ref={turnstileRef} />
            {formError && (
              <p role="alert" style={{ color: 'var(--mk-bad)', fontSize: 13, margin: '0 0 10px' }}>
                {formError}
              </p>
            )}
            <button type="submit" className="mk-btn mk-btn-primary mk-btn-block" disabled={isSubmitting}>
              {isSubmitting ? form.submittingText : form.submitCta}
            </button>
            <p className="mk-strip">{form.privacyNote}</p>
          </form>
        )}
      </div>
    </SectionShell>
  );
}
