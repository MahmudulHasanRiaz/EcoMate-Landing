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
  // Meta CAPI two-mode (H-1/Decision 14, admin-only surface): mode switch, the lead
  // status that triggers the full event in validated mode ('' = unconfigured), and the
  // lightweight submit-time event name (Meta custom-event charset).
  metaCapiMode: z.enum(['instant', 'validated']).optional(),
  metaLeadStatusTrigger: z
    .union([
      z.enum(['New', 'Contacted', 'Qualified', 'Demo Scheduled', 'Won', 'Lost']),
      z.literal(''),
    ])
    .optional(),
  metaInstantEventName: z
    .string()
    .regex(/^[A-Za-z0-9_]{1,40}$/)
    .optional(),
});
