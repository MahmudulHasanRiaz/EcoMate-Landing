/**
 * Tracking-consent helpers (Task 20 §5).
 *
 * The visitor's choice lives in the `ecomate_consent` cookie (12 months):
 * `accepted` (all tracking) or `essential` (no pixel, no CAPI). The per-lead
 * record (`consentGiven`, `consentAt`, `consentText`) is written by the lead
 * form + route — this module only reads the browser choice.
 */

/** Privacy-policy version the banner and the lead form agree on. */
export const CONSENT_POLICY_VERSION = 'privacy-v1';

export type ConsentChoice = 'accepted' | 'essential';

const COOKIE_NAME = 'ecomate_consent';
/** 12 months, in seconds. */
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function parseCookieValue(raw: string): ConsentChoice | null {
  const value = raw.trim().toLowerCase();
  if (value.startsWith('{')) {
    try {
      const parsed: unknown = JSON.parse(value);
      const choice =
        typeof parsed === 'object' && parsed !== null
          ? (parsed as { choice?: unknown }).choice
          : null;
      if (choice === 'accepted' || choice === 'essential') return choice;
      return null;
    } catch {
      return null;
    }
  }
  if (value === 'accepted' || value === 'essential') return value;
  // Legacy/alternate spellings: anything explicitly opt-in counts, everything
  // else is essential-only.
  if (value.includes('accept')) return 'accepted';
  return null;
}

/** Read the stored choice from `document.cookie`, or `null` when undecided. */
export function getConsentChoice(): ConsentChoice | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`),
  );
  if (!match) return null;
  try {
    return parseCookieValue(decodeURIComponent(match[1] ?? ''));
  } catch {
    return null;
  }
}

/** Persist the choice for 12 months. Fires `ecomate-consent-changed` for listeners. */
export function setConsentChoice(choice: ConsentChoice): void {
  if (typeof document === 'undefined') return;
  const payload = encodeURIComponent(
    JSON.stringify({ choice, v: CONSENT_POLICY_VERSION, at: new Date().toISOString() }),
  );
  document.cookie = `${COOKIE_NAME}=${payload}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  try {
    window.dispatchEvent(
      new CustomEvent<ConsentChoice>('ecomate-consent-changed', { detail: choice }),
    );
  } catch {
    // Event dispatch is a nicety; the cookie write above is the record.
  }
}

/** True only after an explicit Accept-all. */
export function hasTrackingConsent(): boolean {
  return getConsentChoice() === 'accepted';
}
