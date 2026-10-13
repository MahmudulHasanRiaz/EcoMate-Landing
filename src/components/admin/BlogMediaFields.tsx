import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Image as ImageIcon } from 'lucide-react';
import { moveGalleryItem } from '@/lib/blogMedia';
import { absoluteUrl } from '@/lib/seo';
import { FieldError } from './ui';
import { MediaPickerModal } from './MediaPickerModal';
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
 * Gallery entries are chosen directly from the Media Library with visual previews.
 */
export function BlogMediaFields({ videoUrl, galleryUrls, errors, onVideoUrl, onGallery }: BlogMediaFieldsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const addUrl = (url: string): void => {
    const trimmed = url.trim();
    if (!trimmed || galleryUrls.includes(trimmed)) return;
    onGallery([...galleryUrls, trimmed]);
  };

  return (
    <div className="space-y-4 text-xs">
      <div>
        <label htmlFor="blog-videoUrl" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
          Video URL (YouTube or Vimeo — embeds below the hero)
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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span id="blog-gallery-label" className="block text-slate-700 dark:text-slate-300 font-semibold">
              Article Image Gallery (optional)
            </span>
            <p className="text-[11px] text-slate-400">
              Interactive grid rendered after the article body.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 font-semibold text-xs hover:bg-indigo-100 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add from Media Library</span>
          </button>
        </div>

        {galleryUrls.length === 0 ? (
          <div
            onClick={() => setPickerOpen(true)}
            className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-indigo-500/80 bg-slate-50/50 dark:bg-black/20 transition-colors"
          >
            <ImageIcon className="h-6 w-6 text-slate-400 mb-1.5" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              No gallery images attached
            </p>
            <p className="text-[11px] text-slate-400">
              Click to browse or upload images from Media Library
            </p>
          </div>
        ) : (
          <ul className="space-y-2" aria-labelledby="blog-gallery-label">
            {galleryUrls.map((url, index) => (
              <li
                key={`${index}-${url}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/40 p-2"
              >
                <div className="h-10 w-14 shrink-0 rounded-lg overflow-hidden bg-slate-200 dark:bg-black/60 border border-slate-200 dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={absoluteUrl(url)}
                    alt={`Gallery ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  {url}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onGallery(moveGalleryItem(galleryUrls, index, -1))}
                    disabled={index === 0}
                    aria-label={`Move image ${index + 1} up`}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    title="Move up"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onGallery(moveGalleryItem(galleryUrls, index, 1))}
                    disabled={index === galleryUrls.length - 1}
                    aria-label={`Move image ${index + 1} down`}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                    title="Move down"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onGallery(galleryUrls.filter((_, i) => i !== index))}
                    aria-label={`Remove image ${index + 1}`}
                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {errors.galleryUrls && <FieldError id="blog-galleryUrls-error" message={errors.galleryUrls} />}
      </div>

      <MediaPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(selectedUrl) => {
          addUrl(selectedUrl);
          setPickerOpen(false);
        }}
        title="Select Gallery Image"
      />
    </div>
  );
}
