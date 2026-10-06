/**
 * GET /api/admin/i18n-report — which sections have no Bangla translation (Task 15 §6).
 *
 * ## What a "gap" is, precisely
 *
 * Two distinct failure modes, reported separately because they need different fixes:
 *
 *  - `missing` — no `bn` row exists at all. The page still renders (the merge falls back to
 *    `en`), so this is invisible to a visitor; it is only visible to whoever is doing the
 *    translation, which is what this report is for.
 *  - `empty`   — a `bn` row exists but its payload is `{}`, i.e. a translator opened the
 *    section and saved nothing. Semantically identical to `missing` to a reader, but it means
 *    a half-finished job rather than an unstarted one.
 *
 * Draft rows are counted the same way: a `bn` row saved as `draft` has not been published to
 * the Bangla page, so it is a gap until it is.
 *
 * ## The fallback chain, restated
 *
 * `bn` missing or empty → the English payload renders. A page must never render blank because
 * a translation is late. `assembleLandingContent` in `lib/merge.ts` is what enforces that, and
 * this report exists to make the *size* of the gap visible, not to change the behaviour.
 */
import { isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingContentTable } from '@/db/schema';
import { requireAdminRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { isPlainObject } from '@/lib/merge';

export interface TranslationGap {
  sectionKey: string;
  /** `missing` = no Bangla row; `empty` = a Bangla row with nothing in it. */
  reason: 'missing' | 'empty';
}

export async function GET() {
  // Translation status is an editorial signal, not a public datum, and `editor` is the
  // read-only role: an editor can read the content but this report is used to drive a
  // publishing queue, so it stays with the roles that may publish.
  const guard = await requireAdminRole(['superadmin', 'admin']);
  if (!guard.ok) return guard.response;

  try {
    const rows = await getDb()
      .select({
        sectionKey: landingContentTable.sectionKey,
        locale: landingContentTable.locale,
        content: landingContentTable.content,
        status: landingContentTable.status,
      })
      .from(landingContentTable)
      .where(isNull(landingContentTable.deletedAt));

    // The English sections are the source of truth for *which* sections exist: a Bangla row
    // with no English counterpart is an orphan, not a translation gap, and is counted
    // separately rather than inflating the gap count.
    const english = new Map<string, { published: boolean }>();
    for (const row of rows) {
      if (row.locale !== 'en') continue;
      const existing = english.get(row.sectionKey);
      english.set(row.sectionKey, {
        published: (existing?.published ?? false) || row.status === 'published',
      });
    }

    const bangla = new Map<string, { usable: boolean }>();
    for (const row of rows) {
      if (row.locale !== 'bn') continue;
      const usable = row.status === 'published' && isPlainObject(row.content)
        && Object.keys(row.content).length > 0;
      bangla.set(row.sectionKey, {
        usable: (bangla.get(row.sectionKey)?.usable ?? false) || usable,
      });
    }

    const gaps: TranslationGap[] = [];
    const orphans: string[] = [];

    for (const [sectionKey] of english) {
      const state = bangla.get(sectionKey);
      if (!state) gaps.push({ sectionKey, reason: 'missing' });
      else if (!state.usable) gaps.push({ sectionKey, reason: 'empty' });
    }
    for (const sectionKey of bangla.keys()) {
      if (!english.has(sectionKey)) orphans.push(sectionKey);
    }

    gaps.sort((a, b) => a.sectionKey.localeCompare(b.sectionKey));
    orphans.sort();

    return ok({
      // The number the dashboard badge renders.
      gapCount: gaps.length,
      gaps,
      // Bangla sections with no English source: usually a mistyped `section_key`.
      orphans,
      englishSectionCount: english.size,
      translatedSectionCount: english.size - gaps.length,
    });
  } catch (e) {
    logServerError('GET /api/admin/i18n-report', e);
    return fail(errorMessage(e));
  }
}