import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogPostsTable } from '@/db/schema';
import {
  errorMessage,
  fail,
  isUniqueViolation,
  logServerError,
  ok,
  parseId,
} from '@/lib/json';
import { invalidateDomains } from '@/lib/revalidate';
import { sanitizeHtml } from '@/lib/sanitize';
import { blogPostUpdate } from '@/lib/validation';

/**
 * `/api/blog/[idOrSlug]`
 *
 * The plan called for two sibling dynamic segments (`[slug]` + `[id]`), but Next 16 rejects
 * that outright: "You cannot use different slug names for the same dynamic path
 * ('id' !== 'slug')". Since the client contract is a single URL shape —
 * `GET /api/blog/<slug>` and `PUT /api/blog/<id>` — the two handlers live in one file and
 * interpret the segment per method.
 */

// Next 16: `params` is a Promise in route handlers. Never destructure it synchronously.
export async function GET(_req: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { idOrSlug } = await params;
    const [post] = await getDb()
      .select()
      .from(blogPostsTable)
      .where(and(eq(blogPostsTable.slug, idOrSlug), isNull(blogPostsTable.deletedAt)))
      .limit(1);
    if (!post) return fail('Blog post not found', 404);
    return ok(post);
  } catch (e) {
    logServerError('GET /api/blog/[idOrSlug]', e);
    return fail(errorMessage(e));
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const { idOrSlug } = await params;
    const id = parseId(idOrSlug);
    if (id === null) return fail('Invalid post id', 400);

    const parsed = blogPostUpdate.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    // `slug` is not updatable (stable, indexed, SEO-visible identifier) and has no column
    // `og_image_url` — both are stripped before the write rather than spread in.
    const { ogImageUrl: _ogImage, publishedAt, content, ...rest } = parsed.data;
    void _ogImage;
    const [updated] = await getDb()
      .update(blogPostsTable)
      .set({
        ...rest,
        ...(content !== undefined ? { content: sanitizeHtml(content) } : {}),
        // `null` (or absent) leaves the column alone — never silently re-dated.
        ...(typeof publishedAt === 'string' ? { publishedAt: new Date(publishedAt) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(blogPostsTable.id, id))
      .returning();
    if (!updated) return fail('Blog post not found', 404);
    // Flipping `status` to `published` (or away from it) is the edit that matters: it decides
    // whether the article page and its sitemap entry exist at all.
    invalidateDomains('blog');
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/blog/[idOrSlug]', e);
    if (isUniqueViolation(e)) return fail('A live post with that slug already exists', 409);
    return fail(errorMessage(e));
  }
}
