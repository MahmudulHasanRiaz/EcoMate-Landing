import { and, count, eq, isNull, like, ne, or, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import {
  adminUsersTable,
  blogPostsTable,
  caseStudiesTable,
  landingContentTable,
  pricingPlansTable,
  siteSettingsTable,
  testimonialsTable,
} from '@/db/schema';

export type GuardResult = { ok: true } | { ok: false; reason: string };

/**
 * Refuse to deactivate or demote the final active superadmin.
 *
 * The count is queried live — never trusted from a client-supplied value — because a
 * caller who can name the count can always claim "there is another one".
 */
export async function assertNotLastSuperadmin(userId: number): Promise<GuardResult> {
  const db = getDb();
  const [target] = await db
    .select({ role: adminUsersTable.role, isActive: adminUsersTable.isActive })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, userId))
    .limit(1);
  if (!target || target.role !== 'superadmin' || !target.isActive) return { ok: true };
  const [others] = await db
    .select({ total: count() })
    .from(adminUsersTable)
    .where(
      and(
        eq(adminUsersTable.role, 'superadmin'),
        eq(adminUsersTable.isActive, true),
        ne(adminUsersTable.id, userId),
      ),
    );
  if ((others?.total ?? 0) > 0) return { ok: true };
  return { ok: false, reason: 'Cannot remove the last active superadmin' };
}

/** An admin cannot lock themselves out mid-session by deactivating their own account. */
export function assertNotSelfDeactivate(
  actorId: number | null,
  targetId: number,
): GuardResult {
  if (actorId !== null && actorId === targetId) {
    return { ok: false, reason: 'You cannot deactivate your own account while signed in' };
  }
  return { ok: true };
}

export interface MediaUseResult {
  ok: boolean;
  reason?: string;
  referencing?: string[];
}

/**
 * Refuse to delete a media asset that live content still references.
 *
 * Checks `featuredImageUrl`/logo/og-image columns across blog posts, testimonials, case
 * studies and the settings logo/favicon, plus a JSON-text search over landing content
 * (the hero payload embeds image URLs inside `content`). Returns the referencing entity
 * names so the 409 can say *what* still uses the key.
 */
export async function assertMediaNotInUse(key: string): Promise<MediaUseResult> {
  if (key.trim() === '') return { ok: true };
  const db = getDb();
  const pattern = `%${key}%`;
  const referencing: string[] = [];

  const [blog] = await db
    .select({ id: blogPostsTable.id })
    .from(blogPostsTable)
    .where(
      and(isNull(blogPostsTable.deletedAt), like(blogPostsTable.featuredImageUrl, pattern)),
    )
    .limit(1);
  if (blog) referencing.push('blog_posts');

  const [testimonial] = await db
    .select({ id: testimonialsTable.id })
    .from(testimonialsTable)
    .where(
      and(
        isNull(testimonialsTable.deletedAt),
        or(
          like(testimonialsTable.logoUrl, pattern),
          like(testimonialsTable.videoUrl, pattern),
        ),
      ),
    )
    .limit(1);
  if (testimonial) referencing.push('testimonials');

  const [caseStudy] = await db
    .select({ id: caseStudiesTable.id })
    .from(caseStudiesTable)
    .where(like(caseStudiesTable.featuredImageUrl, pattern))
    .limit(1);
  if (caseStudy) referencing.push('case_studies');

  const [settings] = await db
    .select({ id: siteSettingsTable.id })
    .from(siteSettingsTable)
    .where(
      or(
        like(siteSettingsTable.logoUrl, pattern),
        like(siteSettingsTable.faviconUrl, pattern),
      ),
    )
    .limit(1);
  if (settings) referencing.push('site_settings');

  const [hero] = await db
    .select({ id: landingContentTable.id })
    .from(landingContentTable)
    .where(
      and(
        isNull(landingContentTable.deletedAt),
        sql`${landingContentTable.content}::text LIKE ${pattern}`,
      ),
    )
    .limit(1);
  if (hero) referencing.push('landing_content');

  if (referencing.length === 0) return { ok: true };
  return {
    ok: false,
    reason: `Media asset is still referenced by: ${referencing.join(', ')}`,
    referencing,
  };
}

export type SlugTable = 'blog_posts' | 'case_studies' | 'pricing_plans';

/**
 * Report whether `slug` is free in `table`, ignoring `excludeId` (the row being edited).
 *
 * Blog slugs live under a partial unique index on live rows, so soft-deleted posts free
 * their slug — the check mirrors that by ignoring deleted rows.
 */
export async function assertSlugAvailable(
  table: SlugTable,
  slug: string,
  excludeId?: number,
): Promise<GuardResult> {
  const db = getDb();
  if (table === 'blog_posts') {
    const [row] = await db
      .select({ id: blogPostsTable.id })
      .from(blogPostsTable)
      .where(
        and(
          eq(blogPostsTable.slug, slug),
          isNull(blogPostsTable.deletedAt),
          excludeId === undefined ? undefined : ne(blogPostsTable.id, excludeId),
        ),
      )
      .limit(1);
    return row
      ? { ok: false, reason: 'A live post with that slug already exists' }
      : { ok: true };
  }
  if (table === 'case_studies') {
    const [row] = await db
      .select({ id: caseStudiesTable.id })
      .from(caseStudiesTable)
      .where(
        and(
          eq(caseStudiesTable.slug, slug),
          excludeId === undefined ? undefined : ne(caseStudiesTable.id, excludeId),
        ),
      )
      .limit(1);
    return row
      ? { ok: false, reason: 'A case study with that slug already exists' }
      : { ok: true };
  }
  const [row] = await db
    .select({ id: pricingPlansTable.id })
    .from(pricingPlansTable)
    .where(
      and(
        eq(pricingPlansTable.slug, slug),
        excludeId === undefined ? undefined : ne(pricingPlansTable.id, excludeId),
      ),
    )
    .limit(1);
  return row
    ? { ok: false, reason: 'A plan with that slug already exists' }
    : { ok: true };
}
