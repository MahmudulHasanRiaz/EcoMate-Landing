import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogPostsTable } from '@/db/schema';
import { CONTENT_EDITOR_ROLES, requireRole } from '@/lib/authz';
import {
  errorMessage,
  fail,
  failWithRequestId,
  isUniqueViolation,
  logServerError,
  ok,
} from '@/lib/json';
import { assertSlugAvailable } from '@/lib/guard';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';
import { invalidateDomains } from '@/lib/revalidate';
import { recordRevision } from '@/lib/revisions';
import { sanitizeHtml } from '@/lib/sanitize';
import { slugify, slugWithSuffix } from '@/lib/slug';
import { blogPostCreate } from '@/lib/validation';

/** Paginated (Task 16 §4). Public: this route is the index feed, not an admin surface.
 * Only `status = 'published'` rows are served — drafts/scheduled/archived posts stay
 * behind the admin-gated preview endpoint (`GET /api/admin/preview`), never on a
 * public URL. Mirrors `lib/content.ts:getPublishedBlogPosts`. */
export async function GET(req: Request) {
  try {
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(blogPostsTable)
          .where(and(eq(blogPostsTable.status, 'published'), isNull(blogPostsTable.deletedAt)))
          // `published_at` desc, exactly as specified — but with `created_at` as the tiebreaker
          // so unscheduled drafts (NULL `published_at`) do not jump ahead of live posts the way
          // Postgres' default NULLS FIRST ordering would otherwise place them.
          .orderBy(desc(sql`coalesce(${blogPostsTable.publishedAt}, ${blogPostsTable.createdAt})`))
          .limit(limit)
          .offset(offset),
      async () => {
        const [row] = await getDb()
          .select({ count: sql<number>`count(*)` })
          .from(blogPostsTable)
          .where(and(eq(blogPostsTable.status, 'published'), isNull(blogPostsTable.deletedAt)));
        return { count: Number(row?.count ?? 0) };
      },
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/blog', e, requestId(req));
    return failWithRequestId(errorMessage(e), requestId(req));
  }
}

/**
 * Derive a unique slug from the title (post-name permalink, §1.5): the admin may
 * supply one explicitly, otherwise `slugify(title)` + numeric suffix on collision.
 * An explicitly supplied slug that is taken returns null (the route answers 409)
 * rather than silently publishing under a renamed URL. Returns null when no free
 * slug is found within the attempt budget.
 */
export async function resolveBlogSlug(
  title: string,
  preferred: string | undefined,
): Promise<string | null> {
  const wanted = (preferred ?? '').trim();
  if (wanted !== '') {
    const guard = await assertSlugAvailable('blog_posts', wanted);
    return guard.ok ? wanted : null;
  }
  const base = slugify(title).slice(0, 50).replace(/-+$/g, '') || 'post';
  for (let attempt = 1; attempt <= 50; attempt++) {
    const candidate = slugWithSuffix(base, attempt);
    if (!/^[a-z0-9-]{2,60}$/.test(candidate)) continue;
    const free = await assertSlugAvailable('blog_posts', candidate);
    if (free.ok) return candidate;
  }
  return null;
}

// NEVER `.values(body)` — mass assignment on insert is the same hole as on update.
export async function POST(req: Request) {
  // Decision 1: editors do blog posting, so blog CRUD is editor-allowed.
  const guard = await requireRole(CONTENT_EDITOR_ROLES);
  if (!guard.ok) return guard.response;

  try {
    // Validate first (shape + length): a 120KB payload is rejected by length before it
    // ever reaches the sanitizer.
    const parsed = blogPostCreate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    // Post-name permalink (§1.5): the admin may supply a slug explicitly, otherwise it
    // derives from the title + numeric suffix on collision. An explicitly supplied slug
    // that is taken is still a 409 — silent renaming would publish under a URL the
    // admin never approved.
    const slug = await resolveBlogSlug(parsed.data.title, parsed.data.slug);
    if (!slug) {
      return fail(
        (parsed.data.slug ?? '').trim() !== ''
          ? 'A live post with that slug already exists'
          : 'Could not derive a unique slug for this title',
        409,
      );
    }
    const { ogImageUrl: _ogImage, publishedAt, ...rest } = parsed.data;
    void _ogImage;
    // The insert and its revision commit together (Task 19 §2): a post without a v1
    // revision would leave the restore endpoint with nothing to apply.
    const [created] = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(blogPostsTable)
        .values({
          slug,
          title: rest.title,
          excerpt: rest.excerpt ?? '',
          // Sanitized after validation: the length bound already held on the raw input,
          // and sanitizing can only shrink it.
          content: sanitizeHtml(rest.content),
          author: rest.author ?? 'EcoMate Engineering Team',
          category: rest.category ?? 'Operations & Fulfillment',
          tags: rest.tags ?? [],
          featuredImageUrl: rest.featuredImageUrl ?? '',
          readTime: rest.readTime ?? '5 min read',
          status: rest.status ?? 'draft',
          seoTitle: rest.seoTitle ?? '',
          seoDescription: rest.seoDescription ?? '',
          canonicalUrl: rest.canonicalUrl ?? '',
          publishedAt: publishedAt ? new Date(publishedAt) : rest.status === 'published' ? new Date() : undefined,
        })
        .returning();
      if (!row) return [];
      await recordRevision(tx, {
        entity: 'blog_post',
        entityKey: String(row.id),
        payload: {
          title: row.title,
          excerpt: row.excerpt,
          content: row.content,
          author: row.author,
          category: row.category,
          tags: row.tags,
          featuredImageUrl: row.featuredImageUrl,
          readTime: row.readTime,
          status: row.status,
          seoTitle: row.seoTitle,
          seoDescription: row.seoDescription,
          canonicalUrl: row.canonicalUrl,
          publishedAt: row.publishedAt?.toISOString() ?? null,
        },
        status: row.status === 'published' ? 'published' : 'draft',
        actorId: guard.actorId,
        note: 'create',
      });
      return [row];
    });
    if (!created) return fail('Blog post could not be created', 500);
    // The blog index, the article page and the sitemap all read under this tag, so a new
    // draft is not searchable and a newly published one appears without a rebuild.
    invalidateDomains('blog');
    return ok(created, 201);
  } catch (e) {
    logServerError('POST /api/blog', e, requestId(req));
    // Live slugs are unique via a partial index; a soft-deleted post frees its slug.
    if (isUniqueViolation(e)) return fail('A live post with that slug already exists', 409);
    return fail(errorMessage(e));
  }
}
