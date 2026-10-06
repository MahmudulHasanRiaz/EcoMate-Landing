import { beforeAll, describe, expect, it } from 'vitest';
import { count, eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { adminUsersTable, blogPostsTable, caseStudiesTable, pricingPlansTable } from '@/db/schema';
import {
  assertMediaNotInUse,
  assertNotLastSuperadmin,
  assertNotSelfDeactivate,
  assertSlugAvailable,
} from '@/lib/guard';

const hasTestDb = Boolean(process.env.DIRECT_URL_TEST);
if (!hasTestDb) {
  console.warn(
    '[guards] LOUD SKIP: DIRECT_URL_TEST is unset — DB-backed guard tests are skipped, pure guard tests still run.',
  );
}

beforeAll(() => {
  // Point the lazy client at the scratch database. Never the real one: these tests insert
  // and delete scratch rows (slug-collision proofs) and must not touch production data.
  if (process.env.DIRECT_URL_TEST) process.env.DIRECT_URL = process.env.DIRECT_URL_TEST;
});

describe('pure guards (no DB)', () => {
  it('blocks self-deactivation', () => {
    expect(assertNotSelfDeactivate(7, 7)).toEqual({
      ok: false,
      reason: 'You cannot deactivate your own account while signed in',
    });
  });

  it('allows deactivating someone else, and a null actor', () => {
    expect(assertNotSelfDeactivate(7, 8)).toEqual({ ok: true });
    expect(assertNotSelfDeactivate(null, 8)).toEqual({ ok: true });
  });
});

describe.skipIf(!hasTestDb)('DB-backed guards (scratch database only)', () => {
  it('last-superadmin cannot be deactivated, others can', async () => {
    const actives = await getDb()
      .select({ id: adminUsersTable.id })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.isActive, true));
    expect(actives.length).toBeGreaterThan(0);

    const superadmins = (
      await getDb()
        .select({ id: adminUsersTable.id, role: adminUsersTable.role })
        .from(adminUsersTable)
        .where(eq(adminUsersTable.isActive, true))
    ).filter((row) => row.role === 'superadmin');

    // A non-existent operator is never the last superadmin.
    expect(await assertNotLastSuperadmin(-1)).toEqual({ ok: true });

    if (superadmins.length === 1 && superadmins[0]) {
      expect(await assertNotLastSuperadmin(superadmins[0].id)).toEqual({
        ok: false,
        reason: 'Cannot remove the last active superadmin',
      });
    } else if (superadmins[0]) {
      expect(await assertNotLastSuperadmin(superadmins[0].id)).toEqual({ ok: true });
    }
  });

  it('fresh slugs are available across blog, case studies and pricing', async () => {
    const nonce = `t17-${Date.now().toString(36)}`;
    expect((await assertSlugAvailable('blog_posts', nonce)).ok).toBe(true);
    expect((await assertSlugAvailable('case_studies', nonce)).ok).toBe(true);
    expect((await assertSlugAvailable('pricing_plans', nonce)).ok).toBe(true);
  });

  it('slug collision is detected (scratch rows, removed afterwards)', async () => {
    const db = getDb();
    const slug = `t17-collide-${Date.now().toString(36)}`;

    const [plan] = await db
      .insert(pricingPlansTable)
      .values({
        slug,
        nameEn: 'Scratch',
        nameBn: 'Scratch',
        tierSubtitleEn: '',
        tierSubtitleBn: '',
        monthlyPrice: 0,
        annualPrice: 0,
        orderVolume: '',
        usersIncluded: '',
        showroomsIncluded: '',
      })
      .returning({ id: pricingPlansTable.id });
    try {
      expect(await assertSlugAvailable('pricing_plans', slug)).toEqual({
        ok: false,
        reason: 'A plan with that slug already exists',
      });
      // The row itself is excluded when checking its own edit.
      if (plan) expect(await assertSlugAvailable('pricing_plans', slug, plan.id)).toEqual({ ok: true });
    } finally {
      if (plan) await db.delete(pricingPlansTable).where(eq(pricingPlansTable.id, plan.id));
    }

    const [post] = await db
      .insert(blogPostsTable)
      .values({ slug, title: 'Scratch', excerpt: '', content: 'scratch' })
      .returning({ id: blogPostsTable.id });
    try {
      expect(await assertSlugAvailable('blog_posts', slug)).toEqual({
        ok: false,
        reason: 'A live post with that slug already exists',
      });
    } finally {
      if (post) await db.delete(blogPostsTable).where(eq(blogPostsTable.id, post.id));
    }

    const [study] = await db
      .insert(caseStudiesTable)
      .values({
        slug,
        title: 'Scratch',
        client: 'Scratch',
        businessType: 'Scratch',
        problemOverview: 'p',
        solutionImplemented: 's',
        quantifiedOutcome: 'q',
      })
      .returning({ id: caseStudiesTable.id });
    try {
      expect(await assertSlugAvailable('case_studies', slug)).toEqual({
        ok: false,
        reason: 'A case study with that slug already exists',
      });
    } finally {
      if (study) await db.delete(caseStudiesTable).where(eq(caseStudiesTable.id, study.id));
    }
  });

  it('an unreferenced key is not in use', async () => {
    const key = `media/t17-${Date.now().toString(36)}-unused.jpg`;
    expect(await assertMediaNotInUse(key)).toEqual({ ok: true });
  });

  it('count helper sanity: tables are reachable', async () => {
    const [row] = await getDb().select({ total: count() }).from(blogPostsTable);
    expect(Number(row?.total ?? 0)).toBeGreaterThanOrEqual(0);
  });
});
