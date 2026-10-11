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
import { youtubeVideoId, youtubeEmbedUrl } from '@/lib/contact';

/** Absolute URL for rendering (relative media paths resolve same-origin). */
export function absoluteMediaUrl(url: string, origin: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `${origin.replace(/\/$/, '')}${trimmed}`;
  return '';
}

export type BlogVideoSource =
  | { type: 'youtube'; embedUrl: string }
  | { type: 'vimeo'; embedUrl: string }
  | { type: 'direct'; videoUrl: string };

/** Extract YouTube ID, Vimeo ID or direct video stream for the clean video player. */
export function parseBlogVideo(url: string | null | undefined): BlogVideoSource | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1. YouTube (standard, shorts, embed, youtu.be)
  const ytId = youtubeVideoId(trimmed);
  if (ytId) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`,
    };
  }

  // 2. Vimeo
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/|player\.vimeo\.com\/video\/)(\d+)/);
  if (vimeoMatch?.[1]) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?title=0&byline=0&portrait=0`,
    };
  }

  // 3. Direct video file (mp4, webm, ogg, mov or same-origin /media/ path)
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed) || trimmed.startsWith('/media/')) {
    return {
      type: 'direct',
      videoUrl: trimmed,
    };
  }

  return null;
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
    hasVideo: parseBlogVideo(post.videoUrl) !== null,
    gallery: blogGalleryUrls(post.galleryUrls),
  };
}
