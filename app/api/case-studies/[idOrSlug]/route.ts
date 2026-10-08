/**
 * PUT/DELETE /api/case-studies/[idOrSlug] — case-study write endpoints (H-20).
 *
 * The segment is an id for numeric input and a slug otherwise (same single-segment
 * contract as `/api/blog/[idOrSlug]`). `slug` itself is not updatable: it is the
 * stable, indexed, SEO-visible identifier. DELETE is a hard delete — this table has
 * no `deleted_at` lifecycle (deliberate, like `social_links`: a removed study is a
 * one-row delete), and every public reader serves `isPublished` rows only, so an
 * unpublished-then-deleted study was never visible.
 */
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { caseStudiesTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { invalidateDomains } from '@/lib/revalidate';
import { caseStudyUpdate } from '@/lib/validation/caseStudies';

export async function PUT(req: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  // Decision 1: case studies are CMS content — editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { idOrSlug } = await params;
    const parsed = caseStudyUpdate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }

    const id = parseId(idOrSlug);
    const [current] =
      id === null
        ? await getDb()
            .select({ id: caseStudiesTable.id, slug: caseStudiesTable.slug })
            .from(caseStudiesTable)
            .where(eq(caseStudiesTable.slug, idOrSlug))
            .limit(1)
        : await getDb()
            .select({ id: caseStudiesTable.id, slug: caseStudiesTable.slug })
            .from(caseStudiesTable)
            .where(eq(caseStudiesTable.id, id))
            .limit(1);
    if (!current) return fail('Case study not found', 404);

    const patch = parsed.data;
    const [updated] = await getDb()
      .update(caseStudiesTable)
      .set({
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.client !== undefined ? { client: patch.client } : {}),
        ...(patch.businessType !== undefined ? { businessType: patch.businessType } : {}),
        ...(patch.problemOverview !== undefined ? { problemOverview: patch.problemOverview } : {}),
        ...(patch.solutionImplemented !== undefined ? { solutionImplemented: patch.solutionImplemented } : {}),
        ...(patch.quantifiedOutcome !== undefined ? { quantifiedOutcome: patch.quantifiedOutcome } : {}),
        ...(patch.metrics !== undefined ? { metrics: patch.metrics } : {}),
        ...(patch.featuredImageUrl !== undefined ? { featuredImageUrl: patch.featuredImageUrl } : {}),
        ...(patch.videoUrl !== undefined ? { videoUrl: patch.videoUrl } : {}),
        ...(patch.websiteUrl !== undefined ? { websiteUrl: patch.websiteUrl } : {}),
        ...(patch.isPublished !== undefined ? { isPublished: patch.isPublished } : {}),
        ...(patch.seoTitle !== undefined ? { seoTitle: patch.seoTitle } : {}),
        ...(patch.seoDescription !== undefined ? { seoDescription: patch.seoDescription } : {}),
      })
      .where(eq(caseStudiesTable.id, current.id))
      .returning();
    if (!updated) return fail('Case study not found', 404);
    // The study page and its sitemap entry key off the slug tag — invalidate both.
    invalidateDomains('casestudies', 'en', updated.slug);
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/case-studies/[idOrSlug]', e);
    return fail(errorMessage(e));
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  // Decision 1: case studies are CMS content — editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const { idOrSlug } = await params;
    const id = parseId(idOrSlug);
    const [deleted] =
      id === null
        ? await getDb()
            .delete(caseStudiesTable)
            .where(eq(caseStudiesTable.slug, idOrSlug))
            .returning({ id: caseStudiesTable.id, slug: caseStudiesTable.slug })
        : await getDb()
            .delete(caseStudiesTable)
            .where(eq(caseStudiesTable.id, id))
            .returning({ id: caseStudiesTable.id, slug: caseStudiesTable.slug });
    if (!deleted) return fail('Case study not found', 404);
    invalidateDomains('casestudies', 'en', deleted.slug);
    return ok({ success: true });
  } catch (e) {
    logServerError('DELETE /api/case-studies/[idOrSlug]', e);
    return fail(errorMessage(e));
  }
}
