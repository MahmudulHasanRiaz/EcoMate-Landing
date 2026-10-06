/**
 * Content revisions (Task 19 §2).
 *
 * Same contract as `lib/leads.ts` → `recordLeadActivity`: the revision insert runs inside
 * the SAME transaction as the content write, because a content row without its revision is
 * untraceable history — the one thing this table exists to make impossible. If the revision
 * insert fails, the content change rolls back with it.
 *
 * `version` is per `(entity, entity_key)`: `max(version)+1` computed inside the
 * transaction, so two domains never share a sequence and concurrent writers to *different*
 * keys never block each other. Concurrent writers to the *same* key both read the same max
 * and one of them violates nothing — versions may collide only if two transactions commit
 * the same number, which the content routes prevent with optimistic locking on the live row
 * (`landing_content.version`) before they ever get here.
 */
import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { contentRevisionsTable } from '@/db/schema';

/** The content domains that keep forward-only history. */
export const REVISION_ENTITIES = [
  'landing_content',
  'blog_post',
  'pricing_plan',
  'case_study',
  'testimonial',
  'site_settings',
] as const;

export type RevisionEntity = (typeof REVISION_ENTITIES)[number];

export function isRevisionEntity(value: unknown): value is RevisionEntity {
  return (
    typeof value === 'string' &&
    (REVISION_ENTITIES as readonly string[]).includes(value)
  );
}

/** Landing-content key: the row is per (section, locale), so the revision key is too. */
export function landingContentKey(sectionKey: string, locale: string): string {
  return `${sectionKey}:${locale}`;
}

export interface RevisionInput {
  entity: RevisionEntity;
  entityKey: string;
  /** The full payload that reproduces this version (landing: `{ locale, content }`). */
  payload: Record<string, unknown>;
  status: 'draft' | 'published';
  /** From the live session, never the request body. `null` for system-initiated events. */
  actorId: number | null;
  note?: string;
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0];

/**
 * Append one revision and return its version number.
 *
 * MUST be called with the transaction of the content write, not `getDb()` — a revision
 * written outside the content transaction can commit while the content write rolls back
 * (or vice versa), which is exactly the untraceable-history state this module forbids.
 */
export async function recordRevision(tx: Tx, input: RevisionInput): Promise<{ version: number }> {
  const [current] = await tx
    .select({ maxVersion: sql<number | null>`max(${contentRevisionsTable.version})` })
    .from(contentRevisionsTable)
    .where(
      and(
        eq(contentRevisionsTable.entity, input.entity),
        eq(contentRevisionsTable.entityKey, input.entityKey),
      ),
    );
  const version = Number(current?.maxVersion ?? 0) + 1;
  await tx.insert(contentRevisionsTable).values({
    entity: input.entity,
    entityKey: input.entityKey,
    version,
    payload: input.payload,
    status: input.status,
    actorId: input.actorId,
    note: (input.note ?? '').slice(0, 2000),
  });
  return { version };
}

/** One key's history, newest first — what the restore endpoint lists. */
export async function listRevisions(entity: RevisionEntity, entityKey: string, limit = 20) {
  return getDb()
    .select()
    .from(contentRevisionsTable)
    .where(
      and(
        eq(contentRevisionsTable.entity, entity),
        eq(contentRevisionsTable.entityKey, entityKey),
      ),
    )
    .orderBy(desc(contentRevisionsTable.version))
    .limit(limit);
}

/** A single revision by version — what the restore endpoint applies. */
export async function getRevision(entity: RevisionEntity, entityKey: string, version: number) {
  const [row] = await getDb()
    .select()
    .from(contentRevisionsTable)
    .where(
      and(
        eq(contentRevisionsTable.entity, entity),
        eq(contentRevisionsTable.entityKey, entityKey),
        eq(contentRevisionsTable.version, version),
      ),
    )
    .limit(1);
  return row ?? null;
}
