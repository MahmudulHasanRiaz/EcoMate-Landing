import { defineConfig } from 'drizzle-kit';

// No `dotenv` import: Next loads `.env.local` automatically for the app, and drizzle-kit
// reads `DIRECT_URL` from the shell that runs it (`DIRECT_URL=... npm run db:generate`).
// The direct (port 5432) URL is used for migrations; the pooled Hyperdrive URL is bound
// in Cloudflare and never lives in this repo.
export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_URL || '',
  },
});
