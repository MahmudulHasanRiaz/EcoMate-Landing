import React, { useEffect, useState } from 'react';
import * as api from '@/src/services/api';
import type { MediaAsset } from '@/src/types/api';
import { moveGalleryItem } from '@/lib/blogMedia';
import { FieldError } from './AdminPanel';
import type { FieldErrors } from './fieldErrors';

interface BlogMediaFieldsProps {
  videoUrl: string;
  galleryUrls: string[];
  errors: FieldErrors;
  onVideoUrl: (value: string) => void;
  onGallery: (value: string[]) => void;
}

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white';

/**
 * Video URL + gallery manager for the blog editor.
 *
 * Gallery entries are plain URL strings (media-library paths or absolute
 * URLs). The library picker loads the media list lazily on first open so the
 * blog tab pays nothing when the operator never touches media.
 */
export function BlogMediaFields({ videoUrl, galleryUrls, errors, onVideoUrl, onGallery }: BlogMediaFieldsProps) {
  const [library, setLibrary] = useState<MediaAsset[] | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    if (!libraryOpen || library !== null) return;
    let cancelled = false;
    api
      .getMediaAssets({ limit: api.ADMIN_LIST_LIMIT })
      .then((assets) => {
        if (!cancelled) setLibrary(assets);
      })
      .catch(() => {
        if (!cancelled) setLibrary([]);
      });
    return () => {
      cancelled = true;
    };
  }, [libraryOpen, library]);

  const addUrl = (url: string): void => {
    const trimmed = url.trim();
    if (!trimmed || galleryUrls.includes(trimmed)) return;
    onGallery([...galleryUrls, trimmed]);
  };

  return (
    <div className="space-y-4 text-xs">
      <div>
        <label htmlFor="blog-videoUrl" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
          YouTube Video URL (optional — embeds below the hero)
        </label>
        <input
          id="blog-videoUrl"
          type="url"
          value={videoUrl}
          onChange={(e) => onVideoUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          aria-describedby={errors.videoUrl ? 'blog-videoUrl-error' : undefined}
          className={`${inputClass} font-mono`}
        />
        <FieldError id="blog-videoUrl-error" message={errors.videoUrl} />
      </div>

      <div>
        <span id="blog-gallery-label" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
          Gallery (optional — grid after the article body)
        </span>
        {galleryUrls.length === 0 ? (
          <p className="text-slate-500 dark:text-slate-400 mb-2">No gallery images. Add URLs below or pick from the library.</p>
        ) : (
          <ul className="space-y-2 mb-2" aria-labelledby="blog-gallery-label">
            {galleryUrls.map((url, index) => (
              <li
                key={`${index}-${url}`}
                className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-[11px]">{url}</span>
                <button
                  type="button"
                  onClick={() => onGallery(moveGalleryItem(galleryUrls, index, -1))}
                  disabled={index === 0}
                  aria-label={`Move image ${index + 1} up`}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold disabled:opacity-40 cursor-pointer"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onGallery(moveGalleryItem(galleryUrls, index, 1))}
                  disabled={index === galleryUrls.length - 1}
                  aria-label={`Move image ${index + 1} down`}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 font-bold disabled:opacity-40 cursor-pointer"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onGallery(galleryUrls.filter((_, i) => i !== index))}
                  aria-label={`Remove image ${index + 1}`}
                  className="px-2 py-1 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 font-semibold cursor-pointer"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        {errors.galleryUrls && <FieldError id="blog-galleryUrls-error" message={errors.galleryUrls} />}

        <div className="flex gap-2">
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://… or /media/…"
            aria-label="Gallery image URL to add"
            className={`${inputClass} font-mono flex-1`}
          />
          <button
            type="button"
            onClick={() => {
              addUrl(newUrl);
              setNewUrl('');
            }}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-slate-100 font-bold cursor-pointer shrink-0"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setLibraryOpen((open) => !open)}
            aria-expanded={libraryOpen}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 font-semibold cursor-pointer shrink-0"
          >
            {libraryOpen ? 'Hide library' : 'From library'}
          </button>
        </div>

        {libraryOpen && (
          <div className="mt-2 rounded-xl border border-slate-200 dark:border-white/10 p-3">
            {library === null ? (
              <p className="text-slate-500">Loading library…</p>
            ) : library.length === 0 ? (
              <p className="text-slate-500">Library is empty.</p>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {library.map((asset) => (
                  <li key={asset.id}>
                    <button
                      type="button"
                      disabled={galleryUrls.includes(asset.url)}
                      onClick={() => addUrl(asset.url)}
                      title={asset.url}
                      className="w-full truncate rounded-lg border border-slate-200 dark:border-white/10 px-2 py-1.5 text-left text-[11px] hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 cursor-pointer"
                    >
                      {asset.title || asset.key}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
