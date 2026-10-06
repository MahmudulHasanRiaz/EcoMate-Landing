import { z } from 'zod';

export const contentUpsert = z.strictObject({
  sectionKey: z.string().regex(/^[a-z][a-z0-9._-]{0,63}$/),
  locale: z.enum(['en', 'bn']),
  content: z.record(z.string(), z.unknown()),
  status: z.enum(['draft', 'published']),
});
