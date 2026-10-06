import { z } from 'zod';

export const contentUpsert = z.strictObject({
  sectionKey: z.string().regex(/^[a-z][a-z0-9._-]{0,63}$/),
  locale: z.enum(['en', 'bn']),
  content: z.record(z.string(), z.unknown()),
  status: z.enum(['draft', 'published']),
  /**
   * Optimistic-locking token (Task 19 §5): the `version` the editor saw when it loaded the
   * row. When present the write is conditional on the row still being at that version and
   * a newer row answers 409; when absent the write keeps its legacy unconditional shape
   * so older admin bundles keep saving.
   */
  expectedVersion: z.number().int().min(1).optional(),
});

/** `POST .../restore` body: which historical version to re-apply as a new revision. */
export const contentRestore = z.strictObject({
  version: z.number().int().min(1),
});
