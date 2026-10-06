import { z } from 'zod';

export const MENU_KEYS = ['main', 'footer'] as const;

const safeHref = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^(#|\/(?!\/)|https?:\/\/|mailto:|tel:)/, 'href must be a safe path, anchor or http(s) URL');

export const menuCreate = z.strictObject({
  key: z.enum(MENU_KEYS),
  locale: z.enum(['en', 'bn']).optional(),
  label: z.string().min(1).max(200),
  href: safeHref,
});

const menuItem = z.strictObject({
  label: z.string().min(1).max(200),
  href: safeHref,
  sortOrder: z.number().int().min(0).max(10_000).optional(),
  isVisible: z.boolean().optional(),
});

export const menuReplace = z.strictObject({
  key: z.enum(MENU_KEYS),
  locale: z.enum(['en', 'bn']).optional(),
  items: z.array(menuItem).max(100),
});
