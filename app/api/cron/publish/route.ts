/**
 * Cron: scheduled publishing (Task 19 §6).
 *
 * Flips `blog_posts` where `status = 'scheduled'` AND `published_at <= now()` to
 * `published`, then invalidates the `blog` tag so the newly live posts appear in the
 * index, the article pages and the sitemap without a rebuild.
 *
 * ## Authorisation — same shape as the retention cron
 *
 * Cloudflare Cron Triggers invoke a Worker *URL* with a plain `GET` and cannot attach a
 * header, so the route accepts the secret as an `Authorization: Bearer`, an
 * `x-cron-secret` header or a `?secret=` parameter — and it FAILS CLOSED when
 * `CRON_SECRET` is unset. The job is idempotent (a second run finds no scheduled rows
 * whose time has come), so a replayed invocation re-does nothing rather than corrupting
 * anything.
 *
 * Invalidation here is `revalidateTag` (background), not `updateTag`: there is no request
 * whose next navigation must see the write synchronously, so stale-while-revalidate is
 * the correct direction.
 */
import { and, eq, isNull, lte, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { blogPostsTable } from '@/db/schema';
import { envString } from '@/lib/env';
import { logServerError } from '@/lib/json';
import { requestId } from '@/lib/request';
import { invalidateDomainsInBackground } from '@/lib/revalidate';

/**
 * Constant-time-ish secret comparison.
 *
 * Length is checked first (an early length leak is not a practical risk for a header
 * value on an edge-cached request) and every character is compared regardless, so the
 * loop does not short-circuit on the first mismatch.
 */
function secretMatches(candidate: string, expected: string): boolean {
  if (candidate === '' || expected === '') return false;
  if (candidate.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i++) {
    diff |= candidate.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** The secret from either accepted header or query parameter. */
function presentedSecret(req: Request): string {
  const header = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const custom = req.headers.get('x-cron-secret') ?? '';
  const query = new URL(req.url).searchParams.get('secret') ?? '';
  return header || custom || query;
}

export async function GET(req: Request): Promise<Response> {
  const reqId = requestId(req);
  const secret = envString('CRON_SECRET');

  // Fail closed. A missing secret means the route is unauthenticated, and an
  // unauthenticated publishing endpoint is not a configuration state worth tolerating.
  if (secret === '') {
    console.error(
      JSON.stringify({
        event: 'cron.publish.denied',
        level: 'error',
        requestId: reqId,
        reason: 'CRON_SECRET is not configured',
      }),
    );
    return Response.json(
      { error: 'CRON_SECRET is not configured', requestId: reqId },
      { status: 503 },
    );
  }

  if (!secretMatches(presentedSecret(req), secret)) {
    console.warn(
      JSON.stringify({
        event: 'cron.publish.denied',
        level: 'warn',
        requestId: reqId,
        reason: 'secret mismatch',
      }),
    );
    return Response.json({ error: 'Unauthorized', requestId: reqId }, { status: 401 });
  }

  try {
    const now = new Date();
    const due = await getDb()
      .update(blogPostsTable)
      .set({ status: 'published', updatedAt: now })
      .where(
        and(
          eq(blogPostsTable.status, 'scheduled'),
          isNull(blogPostsTable.deletedAt),
          // Phase 3a: compare in the database's own clock (`now()`), not the app's
          // `new Date()`. `published_at` is a naive timestamp and PG sessions can run
          // in different timezones per connection (observed: Supavisor sessions in
          // Asia/Dhaka vs UTC), so an app-supplied instant can phantom-shift the
          // comparison by hours and a due post never publishes. One frame = no skew.
          lte(blogPostsTable.publishedAt, sql`now()`),
        ),
      )
      .returning({ id: blogPostsTable.id, slug: blogPostsTable.slug });

    if (due.length > 0) invalidateDomainsInBackground('blog');

    // The count is logged because the whole point of a publishing job is that it is
    // auditable: "we ran it" is not evidence, "we ran it and N posts went live" is.
    console.log(
      JSON.stringify({
        event: 'cron.publish.completed',
        level: 'info',
        requestId: reqId,
        published: due.length,
        slugs: due.map((row) => row.slug),
      }),
    );

    return Response.json(
      { ok: true, requestId: reqId, published: due.length },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e) {
    logServerError('cron publish', e, reqId);
    return Response.json(
      { error: 'Publish job failed', requestId: reqId },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}

/** POST is rejected explicitly rather than 405-by-accident through the GET guard above. */
export async function POST(req: Request): Promise<Response> {
  return Response.json(
    { error: 'Use GET', requestId: requestId(req) },
    { status: 405, headers: { Allow: 'GET' } },
  );
}
