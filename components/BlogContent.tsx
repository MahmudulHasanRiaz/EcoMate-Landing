/**
 * The single render path for CMS-authored blog HTML.
 *
 * `sanitizeHtml` runs immediately before `dangerouslySetInnerHTML`, so untrusted markup
 * never reaches the DOM unfiltered — including content written when the admin API was
 * buggier, or restored from an old revision. Any future blog surface must render through
 * this component rather than re-implementing the injection.
 */
import { sanitizeHtml } from '@/lib/sanitize';

export function BlogContent({ html, className }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}
