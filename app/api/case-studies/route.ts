import { asc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { caseStudiesTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { assertSlugAvailable } from '@/lib/guard';
import { errorMessage, fail, failWithRequestId, logServerError, ok } from '@/lib/json';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';
import { invalidateDomains } from '@/lib/revalidate';
import { slugify, slugWithSuffix } from '@/lib/slug';
import { caseStudyCreate } from '@/lib/validation/caseStudies';

/**
 * Paginated (Task 16 §4).
 *
 * `case_studies` has no ordering column and no soft-delete column, so the list is the whole
 * live set. It is ordered by `id` explicitly rather than left unordered: an `OFFSET` scan over
 * a query with no `ORDER BY` has no stable order, which means row 20 of page 1 and row 20 of
 * page 2 can be the same row — a duplicate with something silently dropped. `id` is the
 * primary key, so its existing index serves the scan; **no new index is needed here**, unlike
 * the other list routes which sort on an unindexed column.
 *
 * Only `isPublished` rows are served (M-5) — unpublished bodies stay behind the
 * admin-gated preview endpoint. Mirrors `lib/content.ts:getCaseStudies`.
 */
export async function GET(req: Request) {
  try {
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(caseStudiesTable)
          .where(eq(caseStudiesTable.isPublished, true))
          .orderBy(asc(caseStudiesTable.id))
          .limit(limit)
          .offset(offset),
      async () => {
        const [row] = await getDb()
          .select({ count: sql<number>`count(*)` })
          .from(caseStudiesTable)
          .where(eq(caseStudiesTable.isPublished, true));
        return { count: Number(row?.count ?? 0) };
      },
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/case-studies', e, requestId(req));
    return failWithRequestId(errorMessage(e), requestId(req));
  }
}

/**
 * Derive a unique slug from the title (post-name permalink, §1.5): the admin may
 * supply one explicitly, otherwise `slugify(title)` + numeric suffix on collision.
 * Returns null when no free slug is found within the attempt budget.
 */
export async function resolveCaseStudySlug(
  title: string,
  preferred: string | undefined,
  excludeId?: number,
): Promise<string | null> {
  const wanted = (preferred ?? '').trim();
  const base = (wanted !== '' ? wanted : slugify(title)).slice(0, 50).replace(/-+$/g, '') || 'post';
  for (let attempt = 1; attempt <= 50; attempt++) {
    const candidate = slugWithSuffix(base, attempt);
    if (!/^[a-z0-9-]{2,60}$/.test(candidate)) continue;
    const free = await assertSlugAvailable('case_studies', candidate, excludeId);
    if (free.ok) return candidate;
  }
  return null;
}

// NEVER spread the body into `.values()` — explicit field mapping only (no mass assignment).
export async function POST(req: Request) {
  // Decision 1: case studies are CMS content — editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const parsed = caseStudyCreate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const slug = await resolveCaseStudySlug(parsed.data.title, parsed.data.slug);
    if (!slug) return fail('Could not derive a unique slug for this title', 409);

    const [created] = await getDb()
      .insert(caseStudiesTable)
      .values({
        slug,
        title: parsed.data.title,
        client: parsed.data.client,
        businessType: parsed.data.businessType ?? '',
        problemOverview: parsed.data.problemOverview,
        solutionImplemented: parsed.data.solutionImplemented,
        quantifiedOutcome: parsed.data.quantifiedOutcome,
        metrics: parsed.data.metrics ?? [],
        featuredImageUrl: parsed.data.featuredImageUrl ?? '',
        videoUrl: parsed.data.videoUrl ?? '',
        websiteUrl: parsed.data.websiteUrl ?? '',
        isPublished: parsed.data.isPublished ?? false,
        seoTitle: parsed.data.seoTitle ?? '',
        seoDescription: parsed.data.seoDescription ?? '',
      })
      .returning();
    if (!created) return fail('Case study could not be created', 500);
    // Close the CACHE.md "no writer" gap: `casestudies` + `casestudies:{slug}` gain a writer.
    invalidateDomains('casestudies', 'en', created.slug);
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/case-studies', e, requestId(req));
    return fail(errorMessage(e));
  }
}
