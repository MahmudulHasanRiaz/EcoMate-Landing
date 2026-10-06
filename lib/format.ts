/**
 * Locale-correct value formatting (Task 15 §3).
 *
 * Bangla is not a string swap. `Intl` carries a different numeral system (`bn-BD` renders
 * ১২,৫০০), a different month vocabulary and a different date order than English, so every
 * number, price and date a visitor sees has to come out of `Intl` rather than a template
 * literal. Hand-rolling digit grouping would also silently break on the lakh/crore scale
 * this market actually transacts in.
 *
 * Every helper is total: a `NaN`, an `Infinity` or an unparseable date string returns a
 * neutral placeholder rather than `NaN` or `Invalid Date` reaching the page. A formatting
 * helper must never be the reason a section renders a lie.
 */
import { INTL_LOCALE } from '@/lib/locales';
import type { Locale } from '@/src/types/landing';

/** Shown in place of a value that cannot be formatted. */
const PLACEHOLDER = '—';

const CURRENCY = 'BDT';

/**
 * The taka sign, read out of ICU rather than typed into the source.
 *
 * `formatToParts` is asked for the currency token at an amount of `1` — a string whose only
 * interesting part is the currency, independent of grouping or digit system.
 */
function takaSign(locale: Locale): string {
  const parts = new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: CURRENCY,
    currencyDisplay: 'narrowSymbol',
    maximumFractionDigits: 0,
  }).formatToParts(1);
  return parts.find((part) => part.type === 'currency')?.value ?? CURRENCY;
}

/** Plain grouped integer in the locale's own numerals: `12,500` (en) / `১২,৫০০` (bn). */
export function formatNumber(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) return PLACEHOLDER;
  try {
    return new Intl.NumberFormat(INTL_LOCALE[locale], {
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return PLACEHOLDER;
  }
}

/**
 * A price, in whole Taka. `amount` is major units (12,500 = ৳12,500) — never minor units,
 * so the caller cannot halve the displayed price by confusing the two.
 *
 * `bn` → `৳12,500`, `en` → `BDT 12,500`.
 *
 * Both affixes are composed around a grouped integer rather than taken from a single
 * `formatToParts` render, because ICU does not produce either of those two shapes on its own:
 *
 *  - `bn-BD` puts the sign *after* the amount in its own numerals (`১২,৫০০৳`), and Bangladeshi
 *    prices are quoted with the sign leading the way an English price is (`৳12,500`). The
 *    digits stay Latin so a price matches the figure on an invoice or a bank statement.
 *  - `en-BD` renders the currency *code* (`BDT 12,500`), which is what an English-language
 *    BDT price should read as.
 *
 * Grouping and separators still come from ICU in both cases — only the sign placement is a
 * presentation decision made here.
 */
export function formatMoney(amount: number, locale: Locale): string {
  if (!Number.isFinite(amount)) return PLACEHOLDER;
  const digits = new Intl.NumberFormat(INTL_LOCALE[locale], {
    maximumFractionDigits: 0,
  }).format(amount);
  return locale === 'bn' ? `${takaSign(locale)}${digits}` : `${CURRENCY} ${digits}`;
}

/**
 * A calendar date (no time component — no visitor-facing surface on this site shows a clock).
 *
 * Accepts an ISO 8601 string or anything `new Date()` understands, because the admin and the
 * blog both hand over raw column values. An unparseable input yields the placeholder.
 */
export function formatDate(iso: string | number | Date, locale: Locale): string {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (Number.isNaN(date.getTime())) return PLACEHOLDER;
  try {
    return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return PLACEHOLDER;
  }
}