import { afterAll, expect, it } from 'vitest';
import { and, count, eq, gt, isNull, like } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { isUniqueViolation } from '@/lib/json';
import {
  adminUsersTable,
  blogPostsTable,
  pricingPlansTable,
  sessionsTable,
  siteSettingsTable,
  usersTable,
} from '@/db/schema';
import { LOCALES } from '@/lib/locales';
import { settingsPatch } from '@/lib/validation';
import { integrationSuite, probeTag } from './setup';

integrationSuite('DB constraints + session + prerender source rows (throwaway Postgres)', () => {
  const tag = probeTag('int-constraint');

  /** SQLSTATE from a Drizzle-wrapped driver error (same walk as lib/json.ts). */
  function driverCode(e: unknown): string {
    let current: unknown = e;
    for (let depth = 0; depth < 4 && typeof current === 'object' && current !== null; depth++) {
      const code = (current as { code?: unknown }).code;
      if (typeof code === 'string' && code !== '') return code;
      current = (current as { cause?: unknown }).cause;
    }
    return '';
  }

  async function countLike(
    table: typeof blogPostsTable,
    column: typeof blogPostsTable.slug,
    pattern: string,
  ): Promise<number> {
    const [row] = await getDb().select({ total: count() }).from(table).where(like(column, pattern));
    return Number(row?.total ?? 0);
  }

  afterAll(async () => {
    const db = getDb();
    // Teardown every fixture class, then prove each is clean.
    await db.delete(blogPostsTable).where(like(blogPostsTable.slug, `${tag}%`));
    await db.delete(pricingPlansTable).where(like(pricingPlansTable.slug, `${tag}%`));
    await db.delete(sessionsTable).where(eq(sessionsTable.userId, `${tag}-user`));
    await db.delete(usersTable).where(eq(usersTable.id, `${tag}-user`));
    await db.delete(adminUsersTable).where(eq(adminUsersTable.email, `${tag}@example.invalid`));
    await db.delete(siteSettingsTable).where(eq(siteSettingsTable.siteName, tag));

    expect(await countLike(blogPostsTable, blogPostsTable.slug, `${tag}%`)).toBe(0);
    const [pricing] = await db
      .select({ total: count() })
      .from(pricingPlansTable)
      .where(like(pricingPlansTable.slug, `${tag}%`));
    expect(Number(pricing?.total ?? 0)).toBe(0);
  });

  it('settings PATCH with an unknown column is rejected by the strict schema', async () => {
    const rejected = settingsPatch.safeParse({ siteName: 'OK', isAdmin: true });
    expect(rejected.success).toBe(false);

    // The allowlisted twin passes and writes through the same shape the
    // handler spreads into `.set()` — mass assignment has nowhere to hide.
    const parsed = settingsPatch.safeParse({ siteName: tag });
    expect(parsed.success).toBe(true);
    if (!parsed.success) throw new Error('unreachable');
    expect('isAdmin' in parsed.data).toBe(false);

    const [seeded] = await getDb()
      .insert(siteSettingsTable)
      .values({ siteName: 'seed-to-be-patched' })
      .returning({ id: siteSettingsTable.id });
    if (!seeded) throw new Error('Settings seed insert returned no row');
    try {
      const [updated] = await getDb()
        .update(siteSettingsTable)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(siteSettingsTable.id, seeded.id))
        .returning({ siteName: siteSettingsTable.siteName });
      expect(updated?.siteName).toBe(tag);
    } finally {
      await getDb().delete(siteSettingsTable).where(eq(siteSettingsTable.id, seeded.id));
    }
  });

  it('blog slug partial unique index: live duplicate blocked, reuse after soft delete allowed', async () => {
    const slug = `${tag}-slug`;
    const base = {
      slug,
      title: 'Probe post',
      excerpt: 'probe',
      content: 'probe body',
    };
    const [first] = await getDb().insert(blogPostsTable).values(base).returning({ id: blogPostsTable.id });
    if (!first) throw new Error('Blog seed insert returned no row');

    // Drizzle wraps the driver error ("Failed query: ..."), so the SQLSTATE is
    // asserted through the real `isUniqueViolation` helper, not the message.
    let duplicateError: unknown = null;
    try {
      await getDb().insert(blogPostsTable).values(base);
    } catch (e) {
      duplicateError = e;
    }
    expect(duplicateError).not.toBeNull();
    expect(isUniqueViolation(duplicateError)).toBe(true);

    await getDb()
      .update(blogPostsTable)
      .set({ deletedAt: new Date() })
      .where(eq(blogPostsTable.id, first.id));

    const [reused] = await getDb().insert(blogPostsTable).values(base).returning({ id: blogPostsTable.id });
    expect(reused?.id).toBeGreaterThan(first.id);
  });

  it('pricing CHECK constraint rejects negative prices at the DB level', async () => {
    // Same wrapping as above: walk the cause chain for SQLSTATE 23514.
    let checkError: unknown = null;
    try {
      await getDb().insert(pricingPlansTable).values({
        slug: `${tag}-plan`,
        nameEn: 'Probe',
        nameBn: 'প্রোব',
        tierSubtitleEn: 'probe',
        tierSubtitleBn: 'প্রোব',
        monthlyPrice: -1,
        annualPrice: 0,
        orderVolume: 'probe',
        usersIncluded: 'probe',
        showroomsIncluded: 'probe',
      });
    } catch (e) {
      checkError = e;
    }
    expect(checkError).not.toBeNull();
    expect(driverCode(checkError)).toBe('23514');
  });

  it('an expired Auth.js session fails the exact predicate auth() validates', async () => {
    const db = getDb();
    const email = `${tag}@example.invalid`;
    const userId = `${tag}-user`;
    const token = `${tag}-session-token`;

    await db.insert(adminUsersTable).values({ email, passwordHash: 'probe-not-a-real-hash' });
    await db.insert(usersTable).values({ id: userId, email });
    await db.insert(sessionsTable).values({
      sessionToken: token,
      userId,
      expires: new Date(Date.now() - 60_000),
    });

    // The join + `expires > now()` predicate from the `jwt` callback in auth.ts.
    async function liveSessionRow() {
      return db
        .select({
          email: usersTable.email,
          role: adminUsersTable.role,
          isActive: adminUsersTable.isActive,
        })
        .from(sessionsTable)
        .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
        .innerJoin(adminUsersTable, eq(adminUsersTable.email, usersTable.email))
        .where(and(eq(sessionsTable.sessionToken, token), gt(sessionsTable.expires, new Date())))
        .limit(1);
    }

    expect(await liveSessionRow()).toHaveLength(0);

    await db
      .update(sessionsTable)
      .set({ expires: new Date(Date.now() + 3_600_000) })
      .where(eq(sessionsTable.sessionToken, token));
    const [live] = await liveSessionRow();
    expect(live?.email).toBe(email);
  });

  it('slug routes enumerate from seeded rows: published listed, drafts excluded', async () => {
    const db = getDb();
    const publishedSlug = `${tag}-published`;
    const draftSlug = `${tag}-draft`;
    const base = { title: 't', excerpt: 'e', content: 'c' };
    await db.insert(blogPostsTable).values({ ...base, slug: publishedSlug, status: 'published', publishedAt: new Date() });
    await db.insert(blogPostsTable).values({ ...base, slug: draftSlug, status: 'draft' });

    // Same `BLOG_PUBLIC` predicates `getPublishedBlogPosts` reads through:
    // published AND not soft-deleted.
    const rows = await db
      .select({ slug: blogPostsTable.slug })
      .from(blogPostsTable)
      .where(and(eq(blogPostsTable.status, 'published'), isNull(blogPostsTable.deletedAt)));

    // Same enumeration `generateStaticParams` performs: one entry per locale.
    const slugs = new Set(rows.map((row) => row.slug));
    const entries = LOCALES.flatMap((locale) =>
      [...slugs].filter((slug) => slug.startsWith(tag)).map((slug) => ({ locale, slug })),
    );
    expect(entries).toContainEqual({ locale: 'en', slug: publishedSlug });
    expect(entries).toContainEqual({ locale: 'bn', slug: publishedSlug });
    expect(entries.some((entry) => entry.slug === draftSlug)).toBe(false);
  });
});
