/**
 * Blog media rules (single source of truth for hero / video / gallery).
 *
 * - Hero: `featuredImageUrl` always; empty renders the gradient placeholder.
 * - Video: when `videoUrl` holds a YouTube link, a responsive 16:9
 *   privacy-enhanced (`youtube-nocookie`) embed renders directly BELOW the
 *   hero, before the article body. Anything else renders no video block.
 * - Gallery: when `galleryUrls` is non-empty, a grid renders AFTER the
 *   article body with a dependency-free lightbox on click.
 * - Both set: video first (below hero), gallery after the body.
 * - `featuredImageUrl` stays THE hero/OG image in every combination.
 */
import { youtubeEmbedUrl } from '@/lib/contact';

/** Absolute URL for rendering (relative media paths resolve same-origin). */
export function absoluteMediaUrl(url: string, origin: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `${origin.replace(/\/$/, '')}${trimmed}`;
  return '';
}

/** The video embed URL for a post, or `null` when no video block renders. */
export function blogVideoEmbed(videoUrl: string): string | null {
  return youtubeEmbedUrl(videoUrl);
}

/** The gallery URLs for a post, cleaned: blanks and whitespace dropped. */
export function blogGalleryUrls(galleryUrls: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of galleryUrls) {
    const trimmed = url.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Reorder one gallery entry for the admin manager (out-of-range is a no-op). */
export function moveGalleryItem(list: readonly string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return [...list];
  }
  const out = [...list];
  const [item] = out.splice(index, 1);
  out.splice(target, 0, item as string);
  return out;
}

/** Render order for a post: video block sits below the hero, gallery after the body. */
export function blogMediaLayout(post: { videoUrl: string; galleryUrls: readonly string[] }): {
  hasVideo: boolean;
  gallery: string[];
} {
  return {
    hasVideo: blogVideoEmbed(post.videoUrl) !== null,
    gallery: blogGalleryUrls(post.galleryUrls),
  };
}
