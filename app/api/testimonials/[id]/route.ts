/**
 * PUT/DELETE /api/testimonials/[id] — testimonial write endpoints (H-19).
 *
 * PUT maps fields explicitly (never a body spread — mass assignment would let a caller
 * write `id`, `deleted_at` or a future column). Per-format requirements run against the
 * MERGED row (existing + patch): clearing `videoUrl` on a `video_standard` row must
 * 400 even though `videoUrl` is patch-optional. DELETE is a soft delete (`deleted_at`,
 * like blog posts) so the public readers — which already filter it — drop the row and
 * an accidental delete is recoverable.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { testimonialsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { invalidateDomains } from '@/lib/revalidate';
import { formatRequirements, testimonialUpdate } from '@/lib/validation/testimonials';
import { stripUnknownKeys } from '@/lib/validation';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Decision 1: testimonials are CMS content — editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid testimonial id', 400);

    const parsed = testimonialUpdate.safeParse(stripUnknownKeys(testimonialUpdate, await req.json().catch(() => null)));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }

    const [current] = await getDb()
      .select()
      .from(testimonialsTable)
      .where(and(eq(testimonialsTable.id, id), isNull(testimonialsTable.deletedAt)))
      .limit(1);
    if (!current) return fail('Testimonial not found', 404);

    const merged = { ...current, ...parsed.data };
    const requirement = formatRequirements({
      format: merged.format,
      videoUrl: merged.videoUrl,
      imageUrl: merged.imageUrl,
      quoteEn: merged.quoteEn,
    });
    if (requirement) return fail(requirement, 400);

    const patch = parsed.data;
    const [updated] = await getDb()
      .update(testimonialsTable)
      .set({
        ...(patch.clientName !== undefined ? { clientName: patch.clientName } : {}),
        ...(patch.clientRole !== undefined ? { clientRole: patch.clientRole } : {}),
        ...(patch.companyName !== undefined ? { companyName: patch.companyName } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.location !== undefined ? { location: patch.location } : {}),
        ...(patch.quoteEn !== undefined ? { quoteEn: patch.quoteEn } : {}),
        ...(patch.quoteBn !== undefined ? { quoteBn: patch.quoteBn } : {}),
        ...(patch.websiteUrl !== undefined ? { websiteUrl: patch.websiteUrl } : {}),
        ...(patch.logoUrl !== undefined ? { logoUrl: patch.logoUrl } : {}),
        ...(patch.videoUrl !== undefined ? { videoUrl: patch.videoUrl } : {}),
        ...(patch.videoDuration !== undefined ? { videoDuration: patch.videoDuration } : {}),
        ...(patch.videoProvider !== undefined ? { videoProvider: patch.videoProvider } : {}),
        ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
        ...(patch.rating !== undefined ? { rating: patch.rating } : {}),
        ...(patch.format !== undefined ? { format: patch.format } : {}),
        ...(patch.metrics !== undefined ? { metrics: patch.metrics } : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
        ...(patch.isPublished !== undefined ? { isPublished: patch.isPublished } : {}),
      })
      .where(eq(testimonialsTable.id, id))
      .returning();
    if (!updated) return fail('Testimonial not found', 404);
    invalidateDomains('testimonials');
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/testimonials/[id]', e);
    return fail(errorMessage(e));
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Decision 1: testimonials are CMS content — editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { id: rawId } = await params;
    const id = parseId(rawId);
    if (id === null) return fail('Invalid testimonial id', 400);

    const [deleted] = await getDb()
      .update(testimonialsTable)
      .set({ deletedAt: new Date() })
      .where(and(eq(testimonialsTable.id, id), isNull(testimonialsTable.deletedAt)))
      .returning({ id: testimonialsTable.id });
    if (!deleted) return fail('Testimonial not found', 404);
    invalidateDomains('testimonials');
    return ok({ success: true });
  } catch (e) {
    logServerError('DELETE /api/testimonials/[id]', e);
    return fail(errorMessage(e));
  }
}
