'use client';

/**
 * Format-aware testimonial form island (H-19).
 *
 * The format picker drives conditional fields: `video_short`/`video_standard` show the
 * video inputs, `image` shows the photo input, `text` shows the quotes. Identity fields
 * (client, company) and publish controls always show. Metrics edit as `stat | label`
 * lines (max 6). Server owns the real per-format enforcement (`formatRequirements`);
 * this form mirrors it client-side only to fail fast, never to allow less.
 */
import { useState } from 'react';
import type { Testimonial } from '@/src/types/api';
import { FieldError } from '@/src/components/admin/AdminPanel';
import type { FieldErrors } from './fieldErrors';

export type TestimonialDraft = Partial<Testimonial> & { metricsText?: string };

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white';

function metricsToText(metrics: { label: string; stat: string }[] | undefined): string {
  if (!Array.isArray(metrics)) return '';
  return metrics
    .filter((m) => typeof m?.stat === 'string' && typeof m?.label === 'string')
    .slice(0, 6)
    .map((m) => `${m.stat} | ${m.label}`)
    .join('\n');
}

function textToMetrics(text: string): { label: string; stat: string }[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .slice(0, 6)
    .map((line) => {
      const bar = line.indexOf('|');
      if (bar === -1) return { stat: line.slice(0, 120), label: '' };
      return { stat: line.slice(0, bar).trim().slice(0, 120), label: line.slice(bar + 1).trim().slice(0, 120) };
    })
    .filter((m) => m.stat !== '');
}

export function TestimonialForm({
  initial,
  errors,
  saving,
  onSubmit,
  onCancel,
}: {
  initial: TestimonialDraft;
  errors: FieldErrors;
  saving: boolean;
  onSubmit: (data: Partial<Testimonial>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<TestimonialDraft>({ ...initial });
  const set = <K extends keyof TestimonialDraft>(key: K, value: TestimonialDraft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const format = draft.format ?? 'text';
  const isVideo = format === 'video_short' || format === 'video_standard';
  const isImage = format === 'image';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const { metricsText, ...rest } = draft;
    onSubmit({ ...rest, metrics: textToMetrics(metricsText ?? '') });
  };

  return (
    <form onSubmit={submit} className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          {initial.id ? 'Edit Testimonial' : 'New Testimonial'}
        </h3>
        <button type="button" onClick={onCancel} className="text-xs text-slate-600 hover:text-slate-900 dark:hover:text-white dark:text-slate-300">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label htmlFor="tm-format" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Format</label>
          <select id="tm-format" value={format} onChange={(e) => set('format', e.target.value)} className={inputClass}>
            <option value="text">Text (+ logo)</option>
            <option value="image">Image testimonial</option>
            <option value="video_short">Video — short-form</option>
            <option value="video_standard">Video — standard / YouTube</option>
          </select>
          <FieldError id="tm-format-error" message={errors.format} />
        </div>
        <div>
          <label htmlFor="tm-clientName" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Client name *</label>
          <input id="tm-clientName" type="text" required value={draft.clientName ?? ''} onChange={(e) => set('clientName', e.target.value)} className={inputClass} />
          <FieldError id="tm-clientName-error" message={errors.clientName} />
        </div>
        <div>
          <label htmlFor="tm-companyName" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Company *</label>
          <input id="tm-companyName" type="text" required value={draft.companyName ?? ''} onChange={(e) => set('companyName', e.target.value)} className={inputClass} />
          <FieldError id="tm-companyName-error" message={errors.companyName} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label htmlFor="tm-clientRole" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Client role</label>
          <input id="tm-clientRole" type="text" value={draft.clientRole ?? ''} onChange={(e) => set('clientRole', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="tm-category" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Category</label>
          <input id="tm-category" type="text" value={draft.category ?? ''} onChange={(e) => set('category', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="tm-location" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Location</label>
          <input id="tm-location" type="text" value={draft.location ?? ''} onChange={(e) => set('location', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label htmlFor="tm-quoteEn" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Quote (English) *</label>
          <textarea id="tm-quoteEn" rows={3} required value={draft.quoteEn ?? ''} onChange={(e) => set('quoteEn', e.target.value)} className={inputClass} />
          <FieldError id="tm-quoteEn-error" message={errors.quoteEn} />
        </div>
        <div>
          <label htmlFor="tm-quoteBn" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Quote (Bangla)</label>
          <textarea id="tm-quoteBn" rows={3} value={draft.quoteBn ?? ''} onChange={(e) => set('quoteBn', e.target.value)} className={inputClass} />
        </div>
      </div>

      {isVideo && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="sm:col-span-2">
            <label htmlFor="tm-videoUrl" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Video URL *</label>
            <input id="tm-videoUrl" type="url" required={isVideo} value={draft.videoUrl ?? ''} onChange={(e) => set('videoUrl', e.target.value)} placeholder="https://www.youtube.com/watch?v=…" className={`${inputClass} font-mono`} />
            <FieldError id="tm-videoUrl-error" message={errors.videoUrl} />
          </div>
          <div>
            <label htmlFor="tm-videoProvider" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Provider</label>
            <select id="tm-videoProvider" value={draft.videoProvider ?? 'youtube'} onChange={(e) => set('videoProvider', e.target.value as 'youtube' | 'upload')} className={inputClass}>
              <option value="youtube">YouTube embed</option>
              <option value="upload">Direct upload (video tag)</option>
            </select>
          </div>
          <div>
            <label htmlFor="tm-videoDuration" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Duration label</label>
            <input id="tm-videoDuration" type="text" value={draft.videoDuration ?? ''} onChange={(e) => set('videoDuration', e.target.value)} placeholder="3:45 min" className={inputClass} />
          </div>
        </div>
      )}

      {isImage && (
        <div className="text-xs">
          <label htmlFor="tm-imageUrl" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Photo URL *</label>
          <input id="tm-imageUrl" type="url" required={isImage} value={draft.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} className={`${inputClass} font-mono`} />
          <FieldError id="tm-imageUrl-error" message={errors.imageUrl} />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label htmlFor="tm-websiteUrl" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Website URL</label>
          <input id="tm-websiteUrl" type="text" value={draft.websiteUrl ?? ''} onChange={(e) => set('websiteUrl', e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="tm-logoUrl" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Logo URL</label>
          <input id="tm-logoUrl" type="text" value={draft.logoUrl ?? ''} onChange={(e) => set('logoUrl', e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="tm-rating" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Rating</label>
          <select
            id="tm-rating"
            value={draft.rating == null ? '' : String(draft.rating)}
            onChange={(e) => set('rating', e.target.value === '' ? null : Number(e.target.value))}
            className={inputClass}
          >
            <option value="">No rating</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} star{n > 1 ? 's' : ''}</option>
            ))}
          </select>
          <FieldError id="tm-rating-error" message={errors.rating} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="sm:col-span-2">
          <label htmlFor="tm-metrics" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Metrics (one per line: stat | label)</label>
          <textarea id="tm-metrics" rows={2} value={draft.metricsText ?? metricsToText(draft.metrics)} onChange={(e) => set('metricsText', e.target.value)} placeholder="3.2x Faster | Daily Dispatch Speed" className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="tm-sortOrder" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Sort order</label>
          <input id="tm-sortOrder" type="number" min={0} max={10000} value={draft.sortOrder ?? 0} onChange={(e) => set('sortOrder', Number(e.target.value))} className={inputClass} />
          <label className="mt-2 flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
            <input type="checkbox" checked={draft.isPublished ?? false} onChange={(e) => set('isPublished', e.target.checked)} />
            Published
          </label>
        </div>
      </div>

      <div className="pt-2 flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs shadow-xs cursor-pointer">
          {saving ? 'Saving…' : initial.id ? 'Save Changes' : 'Create Testimonial'}
        </button>
      </div>
    </form>
  );
}

export { metricsToText, textToMetrics };
