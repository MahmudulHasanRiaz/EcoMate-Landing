import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { testimonialsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, failWithRequestId, logServerError, ok } from '@/lib/json';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';
import { invalidateDomains } from '@/lib/revalidate';
import { formatRequirements, testimonialCreate } from '@/lib/validation/testimonials';
import { stripUnknownKeys } from '@/lib/validation';

/** Paginated (Task 16 §4). Public: the landing page's customer-proof section reads this.
 * Only `isPublished` rows are served (M-4) — unpublished client quotes/names stay behind
 * the admin-gated preview endpoint. Mirrors `lib/content.ts:getTestimonials`. */
export async function GET(req: Request) {
  try {
    // Soft-deleted rows are gone from every public read: `is_published` controls
    // visibility within the live set, `deleted_at` removes a row from the set entirely.
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(testimonialsTable)
          .where(and(eq(testimonialsTable.isPublished, true), isNull(testimonialsTable.deletedAt)))
          // `id` tiebreaks ties in `sort_order` so a page boundary is stable between requests.
          .orderBy(asc(testimonialsTable.sortOrder), asc(testimonialsTable.id))
          .limit(limit)
          .offset(offset),
      async () => {
        const [row] = await getDb()
          .select({ count: sql<number>`count(*)` })
          .from(testimonialsTable)
          .where(and(eq(testimonialsTable.isPublished, true), isNull(testimonialsTable.deletedAt)));
        return { count: Number(row?.count ?? 0) };
      },
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/testimonials', e, requestId(req));
    return failWithRequestId(errorMessage(e), requestId(req));
  }
}

// NEVER spread the body into `.values()` — explicit field mapping only (no mass assignment).
export async function POST(req: Request) {
  // Decision 1: testimonials are CMS content, so testimonial CRUD is editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const parsed = testimonialCreate.safeParse(stripUnknownKeys(testimonialCreate, await req.json().catch(() => null)));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    // Per-format requirements run against the full new row: a `video_*` row without a
    // videoUrl (or `image` without imageUrl) is unrenderable and must 400, not 201.
    const requirement = formatRequirements({
      format: parsed.data.format,
      videoUrl: parsed.data.videoUrl,
      imageUrl: parsed.data.imageUrl,
      quoteEn: parsed.data.quoteEn,
    });
    if (requirement) return fail(requirement, 400);

    const [created] = await getDb()
      .insert(testimonialsTable)
      .values({
        clientName: parsed.data.clientName,
        clientRole: parsed.data.clientRole ?? '',
        companyName: parsed.data.companyName,
        category: parsed.data.category ?? '',
        location: parsed.data.location ?? '',
        quoteEn: parsed.data.quoteEn,
        quoteBn: parsed.data.quoteBn ?? '',
        websiteUrl: parsed.data.websiteUrl ?? '',
        logoUrl: parsed.data.logoUrl ?? '',
        videoUrl: parsed.data.videoUrl ?? '',
        videoDuration: parsed.data.videoDuration ?? '',
        videoProvider: parsed.data.videoProvider ?? 'youtube',
        imageUrl: parsed.data.imageUrl ?? '',
        rating: parsed.data.rating ?? null,
        format: parsed.data.format ?? 'text',
        metrics: parsed.data.metrics ?? [],
        sortOrder: parsed.data.sortOrder ?? 0,
        isPublished: parsed.data.isPublished ?? false,
      })
      .returning();
    if (!created) return fail('Testimonial could not be created', 500);
    // Close the CACHE.md "no writer" gap: the testimonials tag has a writer now.
    invalidateDomains('testimonials');
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/testimonials', e, requestId(req));
    return fail(errorMessage(e));
  }
}
