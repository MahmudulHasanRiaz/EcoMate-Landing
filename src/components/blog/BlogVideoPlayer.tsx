'use client';

import React from 'react';
import { parseBlogVideo } from '@/lib/blogMedia';
import { absoluteUrl } from '@/lib/seo';

interface BlogVideoPlayerProps {
  videoUrl: string;
  title: string;
  poster?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Ultra-clean, noise-free responsive video player component for all devices.
 * Supports YouTube (standard & nocookie), Vimeo, and direct HTML5 video streams (MP4/WebM/R2).
 */
export function BlogVideoPlayer({
  videoUrl,
  title,
  poster,
  className = '',
  ariaLabel = 'Video player',
}: BlogVideoPlayerProps) {
  const source = parseBlogVideo(videoUrl);

  if (!source) {
    return null;
  }

  const posterUrl = poster && poster.trim() ? absoluteUrl(poster.trim()) : undefined;

  return (
    <div
      className={`relative w-full aspect-video overflow-hidden rounded-xl bg-black border border-slate-200/80 dark:border-white/10 shadow-md dark:shadow-2xl transition-all ${className}`}
      style={{ aspectRatio: '16/9' }}
      aria-label={`${ariaLabel}: ${title}`}
    >
      {source.type === 'youtube' && (
        <iframe
          src={source.embedUrl}
          title={title}
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}

      {source.type === 'vimeo' && (
        <iframe
          src={source.embedUrl}
          title={title}
          loading="lazy"
          className="absolute inset-0 w-full h-full border-0"
          allow="autoplay; fullscreen; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      )}

      {source.type === 'direct' && (
        <video
          controls
          playsInline
          preload="metadata"
          poster={posterUrl}
          className="absolute inset-0 w-full h-full object-contain bg-black"
        >
          <source src={absoluteUrl(source.videoUrl)} />
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
}
