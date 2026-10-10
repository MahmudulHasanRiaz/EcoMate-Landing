/**
 * POST /api/content/[sectionKey]/restore — roll a section back to a historical version.
 *
 * Body: `{ locale: 'en' | 'bn', version: number }`. Reads that revision's payload and
 * applies it as a **new** revision (forward-only — history is never deleted, only
 * appended), which is what makes rollback safe to do twice and safe to undo: the version
 * being replaced is still in the table afterwards.
 *
 * A restore is an explicit operator decision ("put the old copy back"), so it applies
 * unconditionally rather than through optimistic locking — but it is audited
 * (`CONTENT_RESTORE` with the restored-from version in the target) and it invalidates
 * the per-locale content tag so the restored copy is live immediately.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { landingContentTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { recordAudit } from '@/lib/audit';
import { invalidateDomains } from '@/lib/revalidate';
import { getRevision, landingContentKey, recordRevision } from '@/lib/revisions';
import { contentRestore, stripUnknownKeys } from '@/lib/validation';

const restoreBody = contentRestore.extend({
  locale: z.enum(['en', 'bn']),
});

interface RouteContext {
  params: Promise<{ sectionKey: string }>;
}

export async function POST(req: Request, { params }: RouteContext) {
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const sectionKey = (await params).sectionKey;
    const parsed = restoreBody.safeParse(stripUnknownKeys(restoreBody, await req.json().catch(() => null)));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const { locale, version } = parsed.data;
    const key = landingContentKey(sectionKey, locale);

    const revision = await getRevision('landing_content', key, version);
    if (!revision) return fail('Revision not found', 404);
    const restoredContent =
      typeof revision.payload === 'object' && revision.payload !== null
        ? (revision.payload as { content?: unknown }).content
        : undefined;
    if (
      typeof restoredContent !== 'object' ||
      restoredContent === null ||
      Array.isArray(restoredContent)
    ) {
      return fail('Revision payload is not a content payload', 422);
    }

    const db = getDb();
    const [current] = await db
      .select()
      .from(landingContentTable)
      .where(and(
        eq(landingContentTable.sectionKey, sectionKey),
        eq(landingContentTable.locale, locale),
        isNull(landingContentTable.deletedAt),
      ))
      .limit(1);

    const applied = await db.transaction(async (tx) => {
      let next;
      if (current) {
        [next] = await tx
          .update(landingContentTable)
          .set({
            content: restoredContent as Record<string, unknown>,
            status: 'published',
            version: current.version + 1,
            updatedAt: new Date(),
            deletedAt: null,
          })
          .where(eq(landingContentTable.id, current.id))
          .returning();
      } else {
        [next] = await tx
          .insert(landingContentTable)
          .values({
            sectionKey,
            locale,
            content: restoredContent as Record<string, unknown>,
            status: 'published',
            version: 1,
          })
          .returning();
      }
      if (!next) return null;
      const { version: newVersion } = await recordRevision(tx, {
        entity: 'landing_content',
        entityKey: key,
        payload: { locale, content: restoredContent },
        status: 'published',
        actorId: guard.actorId,
        note: `restore:${version}`,
      });
      return { row: next, newVersion };
    });
    if (!applied) return fail('Section content not found', 404);

    invalidateDomains('content', locale);
    await recordAudit({
      actorId: guard.actorId,
      action: 'CONTENT_RESTORE',
      target: `${sectionKey}:${locale}#v${version}->v${applied.newVersion}`,
    });
    return ok({ ...applied.row, restoredFrom: version, revisionVersion: applied.newVersion });
  } catch (e) {
    logServerError('POST /api/content/[sectionKey]/restore', e);
    return fail(errorMessage(e));
  }
}
