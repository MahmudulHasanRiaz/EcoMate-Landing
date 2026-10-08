/**
 * GET /api/admin/preview?entity=blog|content|testimonial|case-study&idOrSlug=...[&locale=en|bn]
 *
 * Admin-gated draft preview (Decision 10). The public GETs (`/api/blog`,
 * `/api/content/*`, `/api/testimonials`, `/api/case-studies`) only ever serve
 * published rows (M-1–M-5) — this route is the single path through which an
 * operator views a draft or unpublished record before publishing it. It requires
 * a valid session with `CONTENT_EDITOR_ROLES`; unauthenticated callers get
 * 401/403 from the guard, never the row.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  blogPostsTable,
  caseStudiesTable,
  landingContentTable,
  testimonialsTable,
} from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok, parseId } from '@/lib/json';
import { requestId } from '@/lib/request';

const ENTITIES = ['blog', 'content', 'testimonial', 'case-study'] as const;
type Entity = (typeof ENTITIES)[number];

function isEntity(value: string | null): value is Entity {
  return value === 'blog' || value === 'content' || value === 'testimonial' || value === 'case-study';
}

async function previewBlog(idOrSlug: string) {
  const id = parseId(idOrSlug);
  const [row] =
    id === null
      ? await getDb()
          .select()
          .from(blogPostsTable)
          .where(and(eq(blogPostsTable.slug, idOrSlug), isNull(blogPostsTable.deletedAt)))
          .limit(1)
      : await getDb()
          .select()
          .from(blogPostsTable)
          .where(and(eq(blogPostsTable.id, id), isNull(blogPostsTable.deletedAt)))
          .limit(1);
  // Any status (draft/scheduled/archived/published): this is the preview path.
  return row ?? null;
}

async function previewContent(sectionKey: string, locale: string | null) {
  const [row] = await getDb()
    .select()
    .from(landingContentTable)
    .where(
      and(
        eq(landingContentTable.sectionKey, sectionKey),
        isNull(landingContentTable.deletedAt),
        ...(locale === 'en' || locale === 'bn' ? [eq(landingContentTable.locale, locale)] : []),
      ),
    )
    .limit(1);
  return row ?? null;
}

async function previewTestimonial(idOrSlug: string) {
  // Testimonials have no slug column: preview is by numeric id only.
  const id = parseId(idOrSlug);
  if (id === null) return null;
  const [row] = await getDb()
    .select()
    .from(testimonialsTable)
    .where(and(eq(testimonialsTable.id, id), isNull(testimonialsTable.deletedAt)))
    .limit(1);
  return row ?? null;
}

async function previewCaseStudy(idOrSlug: string) {
  // `case_studies` has no soft-delete column; `isPublished` is ignored here by design.
  const id = parseId(idOrSlug);
  const [row] =
    id === null
      ? await getDb()
          .select()
          .from(caseStudiesTable)
          .where(eq(caseStudiesTable.slug, idOrSlug))
          .limit(1)
      : await getDb().select().from(caseStudiesTable).where(eq(caseStudiesTable.id, id)).limit(1);
  return row ?? null;
}

export async function GET(req: Request) {
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(req.url);
    const entityParam = url.searchParams.get('entity');
    const idOrSlug = (url.searchParams.get('idOrSlug') ?? '').trim();
    if (!isEntity(entityParam)) {
      return fail(`entity must be one of: ${ENTITIES.join(', ')}`, 400);
    }
    if (idOrSlug === '') return fail('idOrSlug is required', 400);

    let row: unknown = null;
    switch (entityParam) {
      case 'blog':
        row = await previewBlog(idOrSlug);
        break;
      case 'content':
        row = await previewContent(idOrSlug, url.searchParams.get('locale'));
        break;
      case 'testimonial':
        row = await previewTestimonial(idOrSlug);
        break;
      case 'case-study':
        row = await previewCaseStudy(idOrSlug);
        break;
    }
    if (!row) return fail('Record not found', 404);
    return ok(row);
  } catch (e) {
    logServerError('GET /api/admin/preview', e, requestId(req));
    return fail(errorMessage(e));
  }
}
