/**
 * Legal copy: static fallback + DB extraction (Task 20 §6).
 *
 * The CMS-editable source is `landing_content` rows with section keys
 * `legal.privacy` / `legal.terms` (one per locale, `status = 'published'`).
 * These pages reuse `getLandingContent(locale)` — the single `'use cache'`
 * boundary — and pick their row out of that list, so no new cache scope exists.
 *
 * The static copy below is honest and generic-but-accurate: it describes only
 * what this codebase actually does (lead form fields, Meta Pixel/CAPI gating,
 * the 180-day retention cron, WhatsApp/phone/email contact). Anything that
 * needs a lawyer's sign-off is marked with an HTML comment in the page, never
 * as visible text.
 */
import type { ContentSection } from '@/lib/merge';
import type { Locale } from '@/src/types/landing';

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

export const LEGAL_PRIVACY_KEY = 'legal.privacy';
export const LEGAL_TERMS_KEY = 'legal.terms';

function isLegalDoc(value: unknown): value is LegalDoc {
  if (typeof value !== 'object' || value === null) return false;
  const doc = value as Record<string, unknown>;
  return (
    typeof doc.title === 'string' &&
    typeof doc.intro === 'string' &&
    Array.isArray(doc.sections) &&
    doc.sections.every(
      (section): section is LegalSection =>
        typeof section === 'object' &&
        section !== null &&
        typeof (section as { heading?: unknown }).heading === 'string' &&
        typeof (section as { body?: unknown }).body === 'string',
    )
  );
}

/** Pick the legal row out of a `getLandingContent` result, or `null`. */
export function selectLegalDoc(
  sections: ContentSection[] | null,
  key: string,
): LegalDoc | null {
  if (!sections) return null;
  const row = sections.find((section) => section.sectionKey === key);
  if (!row) return null;
  const content = row.content as unknown;
  // Rows are seeded as the doc directly or as `{ doc: ... }` — accept both.
  if (isLegalDoc(content)) return content;
  if (
    typeof content === 'object' &&
    content !== null &&
    isLegalDoc((content as { doc?: unknown }).doc)
  ) {
    return (content as { doc: LegalDoc }).doc;
  }
  return null;
}

export function legalDoc(
  sections: ContentSection[] | null,
  key: string,
  locale: Locale,
): LegalDoc {
  return (
    selectLegalDoc(sections, key) ??
    (key === LEGAL_TERMS_KEY ? fallbackTerms(locale) : fallbackPrivacy(locale))
  );
}

// --- Static fallbacks ---------------------------------------------------------
//
// Mirrors the seeded rows in `db/seed.ts`. Keep the two in sync when the product
// changes; the DB row wins whenever it exists.

export function fallbackPrivacy(locale: Locale): LegalDoc {
  if (locale === 'bn') {
    return {
      title: 'গোপনীয়তা নীতি',
      updated: '2026-10-06',
      intro:
        'EcoMate (“আমরা”) আপনার ব্যক্তিগত তথ্য কীভাবে সংগ্রহ, ব্যবহার ও সংরক্ষণ করে তা এই নীতিতে ব্যাখ্যা করা হয়েছে। আমরা শুধু ডেমো অনুরোধ ও যোগাযোগের জন্য যতটুকু প্রয়োজন ততটুকুই সংগ্রহ করি।',
      sections: [
        {
          heading: 'আমরা কী সংগ্রহ করি',
          body: 'নাম, ফোন নম্বর, ঐচ্ছিক ইমেইল, দৈনিক অর্ডার ভলিউম, আপনার লেখা নোট, উৎস/UTM প্যারামিটার, IP ঠিকানা, ব্রাউজার user-agent, এবং সম্মতির রেকর্ড (সম্মতি দেওয়া হয়েছে কিনা, কখন, কোন নীতি সংস্করণে)। প্রযুক্তিগতভাবে: _fbp/_fbc কুকি মান ও একটি event_id — তবে শুধু ট্র্যাকিংয়ে সম্মতি দিলে।',
        },
        {
          heading: 'সম্মতি ও ট্র্যাকিং',
          body: 'Meta Pixel (ব্রাউজার) ও Conversions API (সার্ভার) শুধু “Accept all” বাছলে চলে। “Essential only” বাছলে পিক্সেল লোড হয় না, PageView/Lead ইভেন্ট পাঠানো হয় না, এবং সার্ভার CAPI ডিসপ্যাচ বাদ দেয় (Skipped হিসেবে রেকর্ড হয়)। লিড ফর্মের চেকবক্স যোগাযোগের সম্মতি; ট্র্যাকিংয়ের সম্মতি ব্যানার থেকে আলাদাভাবে নেওয়া হয়।',
        },
        {
          heading: 'ব্যবহার ও সংরক্ষণ',
          body: 'তথ্য ব্যবহার হয় ডেমো অনুরোধের জবাব, বিক্রয় ফলো-আপ ও অপারেশনাল যোগাযোগে। লিড PII ১৮০ দিন পর স্বয়ংক্রিয়ভাবে anonymise করা হয় (Won/Qualified অবস্থার বাণিজ্যিক রেকর্ড বাদে)। সেশন কুকি ও মেয়াদোত্তীর্ণ প্রমাণপত্র মুছে ফেলা হয়।',
        },
        {
          heading: 'যোগাযোগ ও ডেটা মুছে ফেলা',
          body: 'যেকোনো অনুরোধে: WhatsApp +880 1894-828290, ফোন +880 1894-828290, ইমেইল hello@ecomate.bd, ঠিকানা Tejgaon I/A, Dhaka 1208। আপনার তথ্য দেখতে, সংশোধন বা মুছে ফেলতে লিখুন — আমরা যাচাই করে ব্যবস্থা নেব।',
        },
      ],
    };
  }
  return {
    title: 'Privacy Policy',
    updated: '2026-10-06',
    intro:
      'This policy explains what personal data EcoMate (“we”) collects, why, and how long we keep it. We collect only what a demo request and follow-up need.',
    sections: [
      {
        heading: 'What we collect',
        body: 'Name, phone number, optional email, daily order volume, your note, source/UTM parameters, IP address, browser user-agent, and the consent record (whether given, when, which policy version). Technical values: _fbp/_fbc cookie values and one event_id — stored only when you accept tracking.',
      },
      {
        heading: 'Consent and tracking',
        body: 'Meta Pixel (browser) and the Conversions API (server) run only after you choose “Accept all”. With “Essential only”, the pixel never loads, no PageView/Lead event fires, and the server skips the CAPI dispatch (recorded as Skipped). The lead-form checkbox is contact consent; tracking consent comes separately from the banner.',
      },
      {
        heading: 'Use and retention',
        body: 'Data is used to answer demo requests, for sales follow-up and operational contact. Lead PII is automatically anonymised after 180 days (live commercial records in Won/Qualified excluded). Expired sessions and credentials are deleted.',
      },
      {
        heading: 'Contact and deletion requests',
        body: 'Reach us anytime: WhatsApp +880 1894-828290, phone +880 1894-828290, email hello@ecomate.bd, address Tejgaon I/A, Dhaka 1208. Write in to view, correct or delete your data — we verify and act.',
      },
    ],
  };
}

export function fallbackTerms(locale: Locale): LegalDoc {
  if (locale === 'bn') {
    return {
      title: 'সেবার শর্তাবলী',
      updated: '2026-10-06',
      intro:
        'এই সাইট ব্যবহার ও ডেমো অনুরোধ পাঠানোর শর্ত নিচে দেওয়া হলো। ফর্ম পাঠিয়ে আপনি এই শর্তে সম্মত হন।',
      sections: [
        {
          heading: 'সেবা',
          body: 'EcoMate ই-কমার্স অপারেশন প্ল্যাটফর্মের তথ্য ও ডেমো অনুরোধের মাধ্যম সরবরাহ করে। সাইটের তথ্য সাধারণ পরিচিতির জন্য; মূল্য, ফিচার ও প্রাপ্যতা পরিবর্তন হতে পারে।',
        },
        {
          heading: 'গ্রহণযোগ্য ব্যবহার',
          body: 'ভুয়া তথ্য, অন্যের তথ্য, স্প্যাম বা অপব্যবহারমূলক জমা নিষেধ। স্বয়ংক্রিয় অপব্যবহার রোধে হার-সীমা ও মানব-যাচাই (Turnstile) চলে।',
        },
        {
          heading: 'গোপনীয়তা ও সম্মতি',
          body: 'ব্যক্তিগত তথ্যের ব্যবহার গোপনীয়তা নীতি অনুযায়ী হয়। যোগাযোগের জন্য ফর্মে সম্মতি আবশ্যক; ট্র্যাকিংয়ের জন্য ব্যানারে আলাদা সম্মতি লাগে। সম্মতি ছাড়া PII সংরক্ষণ বা Meta-তে ইভেন্ট পাঠানো হয় না।',
        },
        {
          heading: 'যোগাযোগ',
          body: 'প্রশ্ন বা বিরোধে: WhatsApp +880 1894-828290, ফোন +880 1894-828290, ইমেইল hello@ecomate.bd।',
        },
      ],
    };
  }
  return {
    title: 'Terms of Service',
    updated: '2026-10-06',
    intro:
      'These are the terms for using this site and sending a demo request. Submitting the form means you agree to them.',
    sections: [
      {
        heading: 'Service',
        body: 'EcoMate provides information about its e-commerce operations platform and a channel to request a demo. Site content is general introduction; pricing, features and availability may change.',
      },
      {
        heading: 'Acceptable use',
        body: 'No false data, no other person\u2019s data, no spam or abusive submissions. Rate limits and human verification (Turnstile) guard against automated abuse.',
      },
      {
        heading: 'Privacy and consent',
        body: 'Personal data is handled under the Privacy Policy. Contact requires the form consent; tracking needs the separate banner consent. No PII is stored and no Meta event is sent without consent.',
      },
      {
        heading: 'Contact',
        body: 'Questions or disputes: WhatsApp +880 1894-828290, phone +880 1894-828290, email hello@ecomate.bd.',
      },
    ],
  };
}
