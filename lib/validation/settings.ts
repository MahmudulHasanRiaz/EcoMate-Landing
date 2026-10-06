import { z } from 'zod';
const optionalUrl = z.union([z.url(), z.literal('')]);

export const settingsPatch = z.strictObject({
  siteName: z.string().min(1).max(120).optional(),
  tagline: z.string().min(1).max(300).optional(),
  logoUrl: optionalUrl.optional(),
  faviconUrl: optionalUrl.optional(),
  defaultLocale: z.enum(['en', 'bn']).optional(),
  supportPhone: z.string().min(6).max(32).optional(),
  supportEmail: z.union([z.email(), z.literal('')]).optional(),
  whatsappNumber: z.string().regex(/^\d{6,20}$/).optional(),
  messengerUrl: optionalUrl.optional(),
  address: z.string().max(300).optional(),
  isPricingVisible: z.boolean().optional(),
  seoTitle: z.string().max(70).optional(),
  seoDescription: z.string().max(200).optional(),
});
