/**
 * Landing-content merge helpers.
 *
 * The public page is DB-driven with a static fallback (Task 12 §4): the static
 * `landingContent` object is the base, a `landing_content` row overrides it, and a missing
 * or unreadable row means the static copy renders. That fallback chain is what keeps the
 * sales page up when Postgres is unreachable, so it has to be a pure function with no I/O
 * and no framework imports — the client locale switcher runs it too.
 */
import { landingContent } from '../src/data/landingContent';
import type { LandingContent, Locale } from '../src/types/landing';

export type Json = Record<string, unknown>;

/** One `landing_content` row, flattened to what the merge needs. */
export interface ContentSection {
  sectionKey: string;
  content: unknown;
}

export function isPlainObject(value: unknown): value is Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Deep merge where `db` wins per key and `fallback` fills the gaps.
 *
 * Arrays are replaced wholesale, never merged element-wise: a partially-merged feature
 * list is worse than either version, because it reads as intentional.
 */
export function mergeContent<T extends Json>(db: Json | null, fallback: T): T {
  if (!db) return fallback;
  const out: Json = { ...fallback };
  for (const [key, value] of Object.entries(db)) {
    const base = fallback[key];
    out[key] = isPlainObject(value) && isPlainObject(base) ? mergeContent(value, base) : value;
  }
  return out as T;
}

/**
 * Placeholder for keys that are missing an index signature: `LandingContent`'s sections
 * are interface types, so `LandingContent` cannot satisfy `T extends Json` the way an
 * object-literal type does. Widening once here keeps the merge itself fully typed and
 * keeps the double assertion in a single documented spot.
 */
type SectionPayload = Record<string, unknown>;

function asSectionPayload(content: LandingContent): SectionPayload {
  return content as unknown as SectionPayload;
}

/**
 * Assemble a full `LandingContent` for one locale: static base, DB sections on top.
 *
 * Unknown top-level keys in the DB payload are ignored rather than injected — an admin
 * typo in `section_key` must not add a property that no component renders.
 */
export function assembleLandingContent(
  locale: Locale,
  sections: SectionPayload | readonly ContentSection[] | null | undefined,
): LandingContent {
  const base = asSectionPayload(landingContent[locale]);
  if (!sections) return base as unknown as LandingContent;

  const overrides: SectionPayload = Array.isArray(sections)
    ? Object.fromEntries(
        (sections as readonly ContentSection[])
          .filter((row) => row.sectionKey.length > 0)
          .map((row) => [row.sectionKey, row.content]),
      )
    : (sections as SectionPayload);

  const merged: SectionPayload = { ...base };
  let overridden = false;
  for (const [sectionKey, value] of Object.entries(overrides)) {
    const current = merged[sectionKey];
    if (!isPlainObject(current)) continue;
    merged[sectionKey] = mergeContent(isPlainObject(value) ? value : null, current);
    overridden = true;
  }
  return (overridden ? merged : base) as unknown as LandingContent;
}
