import { z } from 'zod';
// Re-exported so validation call sites share the one canonical implementation in
// `lib/leads.ts` (JS side of the SQL expression in `findRecentLeadByPhone`). The schema
// below strips spaces for *shape* validation only; digit-canonicalisation for dedupe
// comparison stays in `normalisePhone` and must not be duplicated here.
export { normalisePhone } from '@/lib/leads';

const strippedPhone = z.preprocess(
  (value) => (typeof value === 'string' ? value.replace(/ /g, '') : value),
  z.string().regex(/^[+0-9][0-9 \-()]{7,19}$/),
);

const emailOrEmpty = z.union([z.email(), z.literal('')]);

export const leadCreate = z.strictObject({
  name: z.string().min(1).max(120),
  phone: strippedPhone,
  email: emailOrEmpty.optional(),
  dailyVolume: z.string().max(200).optional(),
  note: z.string().max(2000).optional(),
  source: z.string().max(120).optional(),
  utmSource: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  consentGiven: z.literal(true),
  consentText: z.string().max(120).optional(),
  turnstileToken: z.string().max(2048).optional(),
  eventId: z.string().max(80).optional(),
  fbp: z.string().max(200).optional(),
  fbc: z.string().max(200).optional(),
});

export const leadUpdate = z.strictObject({
  status: z.enum(['New', 'Contacted', 'Qualified', 'Demo Scheduled', 'Won', 'Lost']).optional(),
  assignedToId: z.union([z.number().int().positive(), z.null()]).optional(),
  followUpAt: z.union([z.iso.datetime(), z.null()]).optional(),
  internalNotes: z.string().max(5000).optional(),
  note: z.string().max(2000).optional(),
});
