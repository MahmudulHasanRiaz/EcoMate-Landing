import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogPostsTable } from '@/db/schema';
import { requireAdminRole } from '@/lib/authz';
import {
  errorMessage,
  fail,
  isUniqueViolation,
  logServerError,
  ok,
  parseId,
} from '@/lib/json';
import { recordAudit } from '@/lib/audit';
import { invalidateDomains } from '@/lib/revalidate';
import { getRevision, recordRevision } from '@/lib/revisions';
import { sanitizeHtml } from '@/lib/sanitize';
import { blogPostUpdate } from '@/lib/validation';
import { contentRestore } from '@/lib/validation/content';

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
  const guard = await requireAdminRole(['superadmin', 'admin']);
  if (!guard.ok) return guard.response;

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
    // The row write and its revision go through one transaction (Task 19 §2): a post
    // without its history row is untraceable, exactly what `content_revisions` forbids.
    const updated = await getDb().transaction(async (tx) => {
      const [row] = await tx
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
      if (!row) return null;
      await recordRevision(tx, {
        entity: 'blog_post',
        entityKey: String(id),
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
        note: 'edit',
      });
      return row;
    });
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

/**
 * POST /api/blog/[id]/restore — roll a post back to a historical version (Task 19 §4).
 *
 * Same forward-only shape as the content restore: the old payload is applied as a *new*
 * revision, never by deleting history. The payload fields are mapped explicitly — never
 * spread — so a revision written by a future schema cannot smuggle a column this handler
 * never intended to expose (`id`, `slug`, `deleted_at`, ...).
 */
export async function POST(req: Request, { params }: { params: Promise<{ idOrSlug: string }> }) {
  const guard = await requireAdminRole(['superadmin', 'admin']);
  if (!guard.ok) return guard.response;

  try {
    const { idOrSlug } = await params;
    const id = parseId(idOrSlug);
    if (id === null) return fail('Invalid post id', 400);

    const parsed = contentRestore.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const revision = await getRevision('blog_post', String(id), parsed.data.version);
    if (!revision) return fail('Revision not found', 404);
    const payload =
      typeof revision.payload === 'object' && revision.payload !== null
        ? (revision.payload as Record<string, unknown>)
        : null;
    if (!payload || typeof payload.content !== 'string') {
      return fail('Revision payload is not a blog payload', 422);
    }
    const readText = (value: unknown, fallback: string): string =>
      typeof value === 'string' ? value : fallback;
    const readTags = (value: unknown): string[] =>
      Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === 'string') : [];

    const applied = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .update(blogPostsTable)
        .set({
          title: readText(payload.title, ''),
          excerpt: readText(payload.excerpt, ''),
          content: sanitizeHtml(readText(payload.content, '')),
          author: readText(payload.author, 'EcoMate Engineering Team'),
          category: readText(payload.category, 'Operations & Fulfillment'),
          tags: readTags(payload.tags),
          featuredImageUrl: readText(payload.featuredImageUrl, ''),
          readTime: readText(payload.readTime, '5 min read'),
          status: payload.status === 'published' ? 'published' : 'draft',
          seoTitle: readText(payload.seoTitle, ''),
          seoDescription: readText(payload.seoDescription, ''),
          canonicalUrl: readText(payload.canonicalUrl, ''),
          updatedAt: new Date(),
        })
        .where(eq(blogPostsTable.id, id))
        .returning();
      if (!row) return null;
      const { version: newVersion } = await recordRevision(tx, {
        entity: 'blog_post',
        entityKey: String(id),
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
        note: `restore:${parsed.data.version}`,
      });
      return { row, newVersion };
    });
    if (!applied) return fail('Blog post not found', 404);
    invalidateDomains('blog');
    await recordAudit({
      actorId: guard.actorId,
      action: 'CONTENT_RESTORE',
      target: `blog_post:${id}#v${parsed.data.version}->v${applied.newVersion}`,
    });
    return ok({ ...applied.row, restoredFrom: parsed.data.version, revisionVersion: applied.newVersion });
  } catch (e) {
    logServerError('POST /api/blog/[idOrSlug]/restore', e);
    return fail(errorMessage(e));
  }
}
