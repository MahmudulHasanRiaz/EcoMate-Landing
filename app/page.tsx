/**
 * Landing page — Server Component.
 *
 * The data read happens here, through the single cached helper (`lib/content.ts`), and the
 * assembled payload is handed to the interactive shell. If the read fails (no Hyperdrive
 * binding at build time, or Postgres unreachable at runtime) `getLandingContent` returns
 * `null` and the static `landingContent.en` object renders unchanged — the sales page must
 * still sell while the database is down (Task 20 §3).
 *
 * The locale toggle fetches `/api/content?locale=bn` client-side, so switching language
 * does not require a round trip through the page.
 */
import { getLandingContent } from '@/lib/content';
import { assembleLandingContent } from '@/lib/merge';
import { LandingShell } from '@/src/components/LandingShell';

export default async function Page() {
  const sections = await getLandingContent('en');
  return <LandingShell initialContent={assembleLandingContent('en', sections)} />;
}
