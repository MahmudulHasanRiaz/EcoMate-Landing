import { z } from 'zod';

const sitePath = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^\//, 'must be a site-absolute path starting with "/"');

const statusCode = z.union([z.literal(301), z.literal(302), z.literal(307), z.literal(308)]);

export const redirectCreate = z.strictObject({
  fromPath: sitePath,
  toPath: sitePath,
  statusCode: statusCode.optional(),
});

export const redirectUpdate = z.strictObject({
  id: z.number().int().positive(),
  fromPath: sitePath,
  toPath: sitePath,
  statusCode: statusCode.optional(),
});

export const redirectDelete = z.strictObject({
  id: z.number().int().positive(),
});
