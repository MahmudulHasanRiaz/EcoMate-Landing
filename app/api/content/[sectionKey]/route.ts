/**
 * GET/PUT /api/content/[sectionKey] — one section payload per locale.
 *
 * `landing_content` is keyed on (section_key, locale). Multi-table writes in this app are
 * transactional (Task 3 §6); every path below that changes the row records its
 * `content_revisions` entry in the SAME transaction (Task 19 §2) — a content row without
 * its revision is untraceable history.
 *
 * ## Draft vs publish (Task 19 §3)
 *
 * The row is the live copy; drafts of a published section live only in `content_revisions`
 * until `POST .../publish` promotes them. Concretely:
 *
 * - no row yet → PUT creates it (draft or published) + revision v1;
 * - published row + changed copy → the copy is staged as a *draft revision* and the row
 *   is untouched, so the public page (which reads only `status = 'published'`) keeps
 *   serving the old copy until someone publishes;
 * - draft row + changed copy → the draft row itself is updated + a draft revision;
 * - identical copy → status-only flip (`publish`/`unpublish`) or a no-op.
 *
 * ## Optimistic locking (Task 19 §5)
 *
 * The editor sends the `version` it loaded as `expectedVersion`. The write is conditional
 * on the row still being at that version; zero rows updated (or a pre-read mismatch)
 * answers 409 with the current server row so the operator can see what changed and
 * re-apply. Calls without `expectedVersion` keep the legacy unconditional shape so older
 * admin bundles keep saving.
 */
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { landingContentTable } from '@/db/schema';
import { ADMIN_ONLY_ROLES, requireRole } from '@/lib/authz';
import { errorMessage, fail, logServerError, ok } from '@/lib/json';
import { recordAudit } from '@/lib/audit';
import { invalidateDomains } from '@/lib/revalidate';
import { landingContentKey, recordRevision } from '@/lib/revisions';
import { contentUpsert } from '@/lib/validation';

interface RouteContext {
  params: Promise<{ sectionKey: string }>;
}

export async function GET(req: Request, { params }: RouteContext) {
  try {
    const sectionKey = (await params).sectionKey;
    // Optional `?locale=en|bn`. Without it the handler keeps its original contract — the
    // first non-deleted row for the key — so an existing caller cannot change behaviour by
    // gaining a query string. The side-by-side editor (Task 15 §6) needs the two rows
    // separately, because the *merged* public payload this route used to be the only source
    // of already has English folded into the Bangla one.
    const requested = new URL(req.url).searchParams.get('locale');
    const locale = requested === 'en' || requested === 'bn' ? requested : null;

    const [row] = await getDb()
      .select()
      .from(landingContentTable)
      .where(and(
        eq(landingContentTable.sectionKey, sectionKey),
        // Public read (M-3): only the published copy is served. Draft rows and staged
        // draft revisions are visible exclusively through the admin-gated preview endpoint.
        eq(landingContentTable.status, 'published'),
        isNull(landingContentTable.deletedAt),
        ...(locale ? [eq(landingContentTable.locale, locale)] : []),
      ))
      .limit(1);
    if (!row) return fail('Section content not found', 404);
    return ok(row);
  } catch (e) {
    logServerError('GET /api/content/[sectionKey]', e);
    return fail(errorMessage(e));
  }
}

/** True when two jsonb payloads hold the same content (key order included). */
function payloadEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export async function PUT(req: Request, { params }: RouteContext) {
  // Content writes are operator writes, not just "a session exists": landing sections are
  // site customization under Decision 1, so this route requires ADMIN_ONLY_ROLES —
  // editors cannot rewrite the marketing site.
  const guard = await requireRole(ADMIN_ONLY_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const sectionKey = (await params).sectionKey;

    // NEVER spread the body into `.set()` / `.values()`: it is attacker-controlled and
    // would let a caller write id, version, deleted_at or another tenant's locale. The
    // section key travels in the URL, so it is merged with the body and validated as one
    // strict object — an unknown key or a malformed section key is a 400, not a new row.
    const body: unknown = await req.json().catch(() => null);
    const candidate =
      typeof body === 'object' && body !== null ? { ...(body as object), sectionKey } : null;
    const parsed = contentUpsert.safeParse(candidate);
    if (!parsed.success) {
      return fail('Validation failed', 400, { issues: parsed.error.issues });
    }
    const { locale, content, status, expectedVersion } = parsed.data;
    const key = landingContentKey(sectionKey, locale);

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

    // --- No row yet: create it as requested (draft or published) + revision v1 --------
    if (!current) {
      const created = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(landingContentTable)
          .values({ sectionKey, locale, content, status, version: 1 })
          .onConflictDoNothing({
            target: [landingContentTable.sectionKey, landingContentTable.locale],
          })
          .returning();
        if (!inserted) {
          // A concurrent create won the race; fall through to the update path below.
          return null;
        }
        await recordRevision(tx, {
          entity: 'landing_content',
          entityKey: key,
          payload: { locale, content },
          status,
          actorId: guard.actorId,
          note: 'create',
        });
        return inserted;
      });
      if (created) {
        // A freshly published section is live immediately; a draft is invisible to the
        // public read by construction, so there is nothing to invalidate for it.
        if (status === 'published') invalidateDomains('content', locale);
        return ok(created, 201);
      }
      // Lost the create race — re-read below as an update.
    }

    const row = current ?? (await db
      .select()
      .from(landingContentTable)
      .where(and(
        eq(landingContentTable.sectionKey, sectionKey),
        eq(landingContentTable.locale, locale),
        isNull(landingContentTable.deletedAt),
      ))
      .limit(1))[0];
    if (!row) return fail('Section content not found', 404);

    // --- Optimistic lock: the editor's base version must still be current -------------
    if (expectedVersion !== undefined && expectedVersion !== row.version) {
      return fail('Section was changed by someone else — reload to see their version', 409, {
        current: row,
        expectedVersion,
        actualVersion: row.version,
      });
    }

    // --- Identical copy: status-only flip or no-op ------------------------------------
    if (payloadEqual(content, row.content)) {
      if (status === row.status) return ok(row);
      const flipped = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(landingContentTable)
          .set({ status, version: row.version + 1, updatedAt: new Date() })
          .where(and(eq(landingContentTable.id, row.id), eq(landingContentTable.version, row.version)))
          .returning();
        if (!updated) return null;
        await recordRevision(tx, {
          entity: 'landing_content',
          entityKey: key,
          payload: { locale, content },
          status,
          actorId: guard.actorId,
          note: status === 'published' ? 'publish' : 'unpublish',
        });
        return updated;
      });
      if (!flipped) {
        const [fresh] = await db
          .select()
          .from(landingContentTable)
          .where(eq(landingContentTable.id, row.id))
          .limit(1);
        return fail('Section was changed by someone else — reload to see their version', 409, {
          current: fresh ?? row,
          actualVersion: fresh?.version ?? row.version + 1,
        });
      }
      if (status === 'published' || row.status === 'published') invalidateDomains('content', locale);
      if (status === 'published') {
        await recordAudit({
          actorId: guard.actorId,
          action: 'CONTENT_PUBLISH',
          target: `${sectionKey}:${locale}`,
        });
      }
      return ok(flipped);
    }

    // --- Changed copy on a published row: stage a draft, leave the live copy alone ----
    if (row.status === 'published') {
      const staged = await db.transaction(async (tx) => {
        // Re-check the version inside the transaction so a concurrent publish between the
        // read above and this write cannot stage a draft against a row that just moved.
        const [locked] = await tx
          .select({ id: landingContentTable.id, version: landingContentTable.version })
          .from(landingContentTable)
          .where(and(eq(landingContentTable.id, row.id), eq(landingContentTable.version, row.version)))
          .limit(1);
        if (!locked) throw new Error('VERSION_CONFLICT');
        return recordRevision(tx, {
          entity: 'landing_content',
          entityKey: key,
          payload: { locale, content },
          status: 'draft',
          actorId: guard.actorId,
          note: 'draft-edit',
        });
      }).catch(async (e: unknown) => {
        if (e instanceof Error && e.message === 'VERSION_CONFLICT') {
          const [fresh] = await db
            .select()
            .from(landingContentTable)
            .where(eq(landingContentTable.id, row.id))
            .limit(1);
          return { conflict: fresh ?? row } as const;
        }
        throw e;
      });
      if ('conflict' in staged) {
        return fail('Section was changed by someone else — reload to see their version', 409, {
          current: staged.conflict,
          actualVersion: staged.conflict.version,
        });
      }
      // No invalidation: the public row is byte-identical to before, so there is nothing
      // new to serve. The draft goes live only through `POST .../publish`.
      return ok({ staged: true, revisionVersion: staged.version, row });
    }

    // --- Changed copy on a draft row: update the draft itself -------------------------
    const updated = await db.transaction(async (tx) => {
      const [next] = await tx
        .update(landingContentTable)
        .set({
          content,
          status,
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
        payload: { locale, content },
        status,
        actorId: guard.actorId,
        note: status === 'published' ? 'publish' : 'draft-edit',
      });
      return next;
    });
    if (!updated) {
      const [fresh] = await db
        .select()
        .from(landingContentTable)
        .where(eq(landingContentTable.id, row.id))
        .limit(1);
      return fail('Section was changed by someone else — reload to see their version', 409, {
        current: fresh ?? row,
        actualVersion: fresh?.version ?? row.version + 1,
      });
    }
    if (status === 'published') {
      // A draft promoted to published through the editor is live immediately.
      invalidateDomains('content', locale);
      await recordAudit({
        actorId: guard.actorId,
        action: 'CONTENT_PUBLISH',
        target: `${sectionKey}:${locale}`,
      });
    }
    return ok(updated);
  } catch (e) {
    logServerError('PUT /api/content/[sectionKey]', e);
    return fail(errorMessage(e));
  }
}
