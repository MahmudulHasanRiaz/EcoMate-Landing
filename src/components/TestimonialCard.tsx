/**
 * Format-aware testimonial card (H-19/Decision 11).
 *
 * Renders one testimonial row in its own format: short/standard video (YouTube embed
 * or direct upload player), image card, or text card. Defensive throughout (CR-4/5/6
 * lesson): every optional field is guarded, unknown/legacy `format` values degrade to
 * the closest renderable shape, and nothing here throws — a half-filled admin draft
 * previews as a sparse card, never a crash.
 *
 * Server component (no interactivity): safe to render from admin islands today and
 * from a server-rendered public section later.
 */
import React from 'react';

export interface TestimonialCardData {
  clientName?: string | null;
  clientRole?: string | null;
  companyName?: string | null;
  quoteEn?: string | null;
  quoteBn?: string | null;
  logoUrl?: string | null;
  videoUrl?: string | null;
  videoDuration?: string | null;
  videoProvider?: string | null;
  imageUrl?: string | null;
  rating?: number | null;
  format?: string | null;
  metrics?: unknown;
}

const KNOWN_FORMATS = new Set(['video_short', 'video_standard', 'image', 'text']);

/** Resolve the renderable format: known enum as-is, legacy values by content, else text. */
export function resolveFormat(data: TestimonialCardData): 'video_short' | 'video_standard' | 'image' | 'text' {
  const raw = (data.format ?? '').trim();
  if (raw === 'video_short') return 'video_short';
  if (raw === 'video_standard' || raw === 'video_walkthrough') return 'video_standard';
  if (raw === 'image') return hasText(data.imageUrl) ? 'image' : 'text';
  if (raw === 'text' || !KNOWN_FORMATS.has(raw)) {
    // Unknown future/legacy value: video-capable rows still show their player.
    return hasText(data.videoUrl) ? 'video_standard' : 'text';
  }
  return 'text';
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

/** Only http(s) URLs ever reach an embed/player/img: anything else renders as plain text. */
function safeHttpUrl(value: unknown): string | null {
  if (!hasText(value)) return null;
  const trimmed = value.trim();
  return /^https?:\/\/[^\s]+$/i.test(trimmed) ? trimmed : null;
}

/** Extract the 11-char YouTube id from watch/embed/shorts/youtu.be URLs. Null when unparseable. */
export function youtubeId(url: string): string | null {
  const match =
    url.match(/[?&]v=([A-Za-z0-9_-]{11})/) ??
    url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ??
    url.match(/\/embed\/([A-Za-z0-9_-]{11})/) ??
    url.match(/\/shorts\/([A-Za-z0-9_-]{11})/);
  return match?.[1] ?? null;
}

function metricsOf(value: unknown): { label: string; stat: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (m): m is { label: string; stat: string } =>
        typeof m === 'object' &&
        m !== null &&
        typeof (m as { label?: unknown }).label === 'string' &&
        typeof (m as { stat?: unknown }).stat === 'string',
    )
    .slice(0, 6);
}

function Stars({ rating }: { rating: number | null | undefined }) {
  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return (
    <span aria-label={`Rated ${rating} out of 5`} className="text-amber-500 text-xs tracking-tight">
      {'★'.repeat(rating)}
      <span className="text-slate-300 dark:text-slate-600">{'★'.repeat(5 - rating)}</span>
    </span>
  );
}

function VideoPlayer({ data, short }: { data: TestimonialCardData; short: boolean }) {
  const url = safeHttpUrl(data.videoUrl);
  if (!url) return null;
  const provider = (data.videoProvider ?? 'youtube').trim();
  if (provider === 'upload') {
    return (
      <video
        controls
        preload="none"
        src={url}
        className={short ? 'aspect-[9/16] w-full max-w-55 rounded-xl bg-black' : 'aspect-video w-full rounded-xl bg-black'}
      />
    );
  }
  // Default (and unknown provider values): YouTube embed. An unparseable URL degrades
  // to an external link — never an iframe with an attacker-influenced src.
  const id = youtubeId(url);
  if (!id) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-xs text-indigo-700 dark:text-indigo-300 hover:underline font-semibold">
        Watch video interview ↗
      </a>
    );
  }
  return (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${id}`}
      title={hasText(data.clientName) ? `${data.clientName} video testimonial` : 'Video testimonial'}
      loading="lazy"
      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      className={short ? 'aspect-[9/16] w-full max-w-55 rounded-xl' : 'aspect-video w-full rounded-xl'}
    />
  );
}

export function TestimonialCard({
  data,
  locale = 'en',
}: {
  data: TestimonialCardData;
  locale?: 'en' | 'bn';
}) {
  const format = resolveFormat(data);
  const quote =
    locale === 'bn' && hasText(data.quoteBn)
      ? data.quoteBn
      : hasText(data.quoteEn)
        ? data.quoteEn
        : hasText(data.quoteBn)
          ? data.quoteBn
          : '';
  const metrics = metricsOf(data.metrics);
  const image = safeHttpUrl(data.imageUrl);
  const name = hasText(data.clientName) ? data.clientName.trim() : 'Verified client';
  const company = hasText(data.companyName) ? data.companyName.trim() : '';
  const role = hasText(data.clientRole) ? data.clientRole.trim() : '';

  return (
    <div className="p-5 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] flex flex-col justify-between shadow-xs">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-900 dark:text-white text-sm">
            {company || name}
          </span>
          {hasText(data.videoDuration) ? (
            <span className="text-[11px] font-mono text-indigo-700 dark:text-indigo-300">{data.videoDuration}</span>
          ) : (
            <Stars rating={data.rating} />
          )}
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {name}
          {role ? ` · ${role}` : ''}
        </p>

        {(format === 'video_short' || format === 'video_standard') && (
          <div className="mt-3">
            <VideoPlayer data={data} short={format === 'video_short'} />
          </div>
        )}
        {format === 'image' && image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={hasText(company) ? `${company} testimonial photo` : 'Client testimonial photo'} loading="lazy" className="mt-3 w-full rounded-xl object-cover" />
        )}
        {quote !== '' && (
          <blockquote className="mt-3 text-xs text-slate-700 dark:text-slate-300 italic">
            &ldquo;{quote}&rdquo;
          </blockquote>
        )}
      </div>

      {metrics.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-600 dark:text-slate-300">
          <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
            {metrics[0]?.stat} {metrics[0]?.label}
          </span>
        </div>
      )}
    </div>
  );
}
