/**
 * POST /api/content/[sectionKey]/publish — promote staged drafts to the live copy.
 *
 * Body: `{ locale: 'en' | 'bn' }`. The payload promoted is the latest *draft* revision for
 * the key when one exists, otherwise the row's own content (a never-published draft row
 * being flipped live). The promotion records a `published` revision with `note: 'publish'`
 * and invalidates the per-locale content tag (Task 15 §5: same-request `updateTag`) so the
 * change is live immediately — the admin sees their own publish on the next navigation.
 *
 * Forward-only like everything else in Task 19: publishing appends history, it never
 * rewrites it. Audited via `lib/audit.ts` (`CONTENT_PUBLISH`).
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db/client';
import { contentRevisionsTable, landingContentTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { recordAudit } from '@/lib/audit';
import { invalidateDomains } from '@/lib/revalidate';
import { landingContentKey, recordRevision } from '@/lib/revisions';

const publishBody = z.strictObject({
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
    const parsed = publishBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const { locale } = parsed.data;
    const key = landingContentKey(sectionKey, locale);

    const db = getDb();
    const [row] = await db
      .select()
      .from(landingContentTable)
      .where(and(
        eq(landingContentTable.sectionKey, sectionKey),
        eq(landingContentTable.locale, locale),
        isNull(landingContentTable.deletedAt),
      ))
      .limit(1);
    if (!row) return fail('Section content not found', 404);

    // The payload to promote: the latest draft revision when the editors staged one,
    // otherwise the row's own content (flipping a never-published draft live).
    const [latestDraft] = await db
      .select()
      .from(contentRevisionsTable)
      .where(and(
        eq(contentRevisionsTable.entity, 'landing_content'),
        eq(contentRevisionsTable.entityKey, key),
        eq(contentRevisionsTable.status, 'draft'),
      ))
      .orderBy(desc(contentRevisionsTable.version))
      .limit(1);
    const draftContent =
      latestDraft && typeof latestDraft.payload === 'object' && latestDraft.payload !== null
        ? (latestDraft.payload as { content?: unknown }).content
        : undefined;
    const payloadContent =
      draftContent !== undefined &&
      typeof draftContent === 'object' &&
      draftContent !== null &&
      !Array.isArray(draftContent)
        ? (draftContent as Record<string, unknown>)
        : null;
    if (payloadContent === null) {
      return fail('Latest draft revision holds no usable content payload', 422);
    }

    if (row.status === 'published' && !latestDraft) return ok(row);

    const published = await db.transaction(async (tx) => {
      const [next] = await tx
        .update(landingContentTable)
        .set({
          content: payloadContent,
          status: 'published',
          version: row.version + 1,
          updatedAt: new Date(),
          deletedAt: null,
        })
        .where(and(eq(landingContentTable.id, row.id), eq(landingContentTable.version, row.version)))
        .returning();
      if (!next) return null;
      await recordRevision(tx, {
        entity: 'landing_content',
        entityKey: key,
        payload: { locale, content: payloadContent },
        status: 'published',
        actorId: guard.actorId,
        note: 'publish',
      });
      return next;
    });
    if (!published) {
      // A concurrent edit landed between the read and the publish; the operator re-reads
      // and publishes again rather than silently clobbering it.
      const [fresh] = await db
        .select()
        .from(landingContentTable)
        .where(eq(landingContentTable.id, row.id))
        .limit(1);
      return fail('Section was changed by someone else — reload and publish again', 409, {
        current: fresh ?? row,
        actualVersion: fresh?.version ?? row.version + 1,
      });
    }

    invalidateDomains('content', locale);
    await recordAudit({
      actorId: guard.actorId,
      action: 'CONTENT_PUBLISH',
      target: `${sectionKey}:${locale}`,
    });
    return ok(published);
  } catch (e) {
    logServerError('POST /api/content/[sectionKey]/publish', e);
    return fail(errorMessage(e));
  }
}
