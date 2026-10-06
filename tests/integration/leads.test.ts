import { afterAll, expect, it } from 'vitest';
import { count, eq, like } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { leadActivitiesTable, leadsTable } from '@/db/schema';
import { recordLeadActivity } from '@/lib/leads';
import { integrationSuite, probeTag } from './setup';

integrationSuite('leads: insert + timeline atomicity (throwaway Postgres)', () => {
  const tag = probeTag('int-lead');

  async function leadCount(): Promise<number> {
    const [row] = await getDb()
      .select({ total: count() })
      .from(leadsTable)
      .where(like(leadsTable.name, `${tag}%`));
    return Number(row?.total ?? 0);
  }

  async function activityCountFor(leadId: number): Promise<number> {
    const [row] = await getDb()
      .select({ total: count() })
      .from(leadActivitiesTable)
      .where(eq(leadActivitiesTable.leadId, leadId));
    return Number(row?.total ?? 0);
  }

  afterAll(async () => {
    // Teardown: remove every fixture row, then prove the table is clean.
    const db = getDb();
    const doomed = await db
      .select({ id: leadsTable.id })
      .from(leadsTable)
      .where(like(leadsTable.name, `${tag}%`));
    for (const row of doomed) {
      // Lead delete cascades to lead_activities (schema FK onDelete cascade).
      await db.delete(leadsTable).where(eq(leadsTable.id, row.id));
    }
    expect(await leadCount()).toBe(0);
  });

  it('commits the lead row and its opening timeline row together', async () => {
    const name = `${tag}-ok`;
    const createdId = await getDb().transaction(async (tx) => {
      // Same two writes `POST /api/leads` performs: the row and the reason it
      // exists, in one transaction.
      const [lead] = await tx
        .insert(leadsTable)
        .values({
          name,
          phone: '+8801700000001',
          consentGiven: true,
          consentAt: new Date(),
          consentText: 'privacy-v1',
        })
        .returning({ id: leadsTable.id, status: leadsTable.status });
      if (!lead) throw new Error('Lead insert returned no row');
      await recordLeadActivity(tx, {
        leadId: lead.id,
        actorId: null,
        toStatus: lead.status,
        note: 'Lead captured from integration probe',
      });
      return lead.id;
    });

    expect(await activityCountFor(createdId)).toBe(1);
  });

  it('rolls back the lead row when the timeline write fails (atomicity, not presence)', async () => {
    const name = `${tag}-rollback`;
    await expect(
      getDb().transaction(async (tx) => {
        await tx.insert(leadsTable).values({
          name,
          phone: '+8801700000002',
          consentGiven: true,
          consentAt: new Date(),
          consentText: 'privacy-v1',
        });
        // Simulate the timeline write failing after the lead insert succeeded.
        throw new Error('probe-timeline-failure');
      }),
    ).rejects.toThrow('probe-timeline-failure');

    const [row] = await getDb()
      .select({ total: count() })
      .from(leadsTable)
      .where(eq(leadsTable.name, name));
    expect(Number(row?.total ?? 0)).toBe(0);
  });
});
