/**
 * GET /api/content?locale=en|bn — the whole landing payload for one locale, as the
 * section-keyed object the page assembles over the static fallback.
 *
 * Public and read-only; writes go through `/api/content/[sectionKey]` (Task 12) which is
 * session-gated by `proxy.ts` because it is a PUT.
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingContentTable } from '@/db/schema';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { requestId } from '@/lib/request';
import type { Locale } from '@/src/types/landing';

const LOCALES = new Set<string>(['en', 'bn']);

function readLocale(raw: string | null): Locale {
  return raw && LOCALES.has(raw) ? (raw as Locale) : 'en';
}

export async function GET(req: Request) {
  const reqId = requestId(req);
  try {
    const locale = readLocale(new URL(req.url).searchParams.get('locale'));
    const rows = await getDb()
      .select({
        sectionKey: landingContentTable.sectionKey,
        content: landingContentTable.content,
      })
      .from(landingContentTable)
      .where(and(
        eq(landingContentTable.locale, locale),
        // Drafts never reach a visitor: only the published row is the site (Task 19 §3).
        eq(landingContentTable.status, 'published'),
        isNull(landingContentTable.deletedAt),
      ))
      .orderBy(asc(landingContentTable.sectionKey));

    const assembled: Record<string, unknown> = {};
    for (const row of rows) assembled[row.sectionKey] = row.content;
    return ok(assembled);
  } catch (e) {
    // Task 20 §3: public read degrades — log server-side with the request id, return
    // the uniform envelope. The landing page keeps its static fallback on any
    // non-OK here, so the visitor never sees an outage.
    logServerError('GET /api/content', e, reqId);
    return fail(errorMessage(e), 500, undefined, reqId);
  }
}
