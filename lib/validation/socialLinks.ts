import { z } from 'zod';

export const SOCIAL_PLATFORMS = [
  'facebook',
  'youtube',
  'linkedin',
  'tiktok',
  'instagram',
  'x',
  'whatsapp',
] as const;

const safeUrl = z
  .string()
  .max(2048)
  .regex(/^(https?:\/\/|\/|$)/i, 'url must be http(s) or root-relative');

export const socialLinkCreate = z.strictObject({
  platform: z.enum(SOCIAL_PLATFORMS),
  url: safeUrl.optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isVisible: z.boolean().optional(),
});

export const socialLinkUpdate = z.strictObject({
  id: z.number().int().positive(),
  platform: z.enum(SOCIAL_PLATFORMS).optional(),
  url: safeUrl.optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isVisible: z.boolean().optional(),
});
