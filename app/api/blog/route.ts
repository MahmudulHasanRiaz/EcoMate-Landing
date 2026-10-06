import { desc, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogPostsTable } from '@/db/schema';
import {
  asObject,
  errorMessage,
  fail,
  failWithRequestId,
  isUniqueViolation,
  logServerError,
  ok,
} from '@/lib/json';
import { readBlogPostCreate } from '@/lib/blog';
import { paginate } from '@/lib/paginate';
import { requestId } from '@/lib/request';
import { invalidateDomains } from '@/lib/revalidate';

/** Paginated (Task 16 §4). Public: this route is the index feed, not an admin surface. */
export async function GET(req: Request) {
  try {
    const page = await paginate(
      req.url,
      (limit, offset) =>
        getDb()
          .select()
          .from(blogPostsTable)
          .where(isNull(blogPostsTable.deletedAt))
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
          .where(isNull(blogPostsTable.deletedAt));
        return { count: Number(row?.count ?? 0) };
      },
    );
    return ok(page);
  } catch (e) {
    logServerError('GET /api/blog', e, requestId(req));
    return failWithRequestId(errorMessage(e), requestId(req));
  }
}

// NEVER `.values(body)` — mass assignment on insert is the same hole as on update.
export async function POST(req: Request) {
  try {
    const row = readBlogPostCreate(asObject(await req.json()));
    if (!row.slug || !row.title) return fail('slug and title are required', 400);
    const [created] = await getDb().insert(blogPostsTable).values(row).returning();
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
