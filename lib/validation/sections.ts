import { z } from 'zod';

export const sectionUpdate = z.strictObject({
  titleEn: z.string().max(300).optional(),
  titleBn: z.string().max(300).optional(),
  subtitleEn: z.string().max(500).optional(),
  subtitleBn: z.string().max(500).optional(),
  eyebrowEn: z.string().max(200).optional(),
  eyebrowBn: z.string().max(200).optional(),
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isVisible: z.boolean().optional(),
  customConfig: z.record(z.string(), z.unknown()).optional(),
});
