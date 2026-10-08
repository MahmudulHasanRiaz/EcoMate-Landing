'use client';

/**
 * Case-study editor island (H-20).
 *
 * Create + edit share one form. The slug is optional: leaving it blank derives it from
 * the title (post-name permalink) with server-side uniqueness. Identity, narrative,
 * media, SEO and publish controls follow the blog editor's field order so operators
 * meet one consistent CMS vocabulary.
 */
import { useState } from 'react';
import type { CaseStudy } from '@/src/types/api';
import { FieldError } from '@/src/components/admin/AdminPanel';
import type { FieldErrors } from './fieldErrors';

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white';

export function CaseStudyEditor({
  initial,
  errors,
  saving,
  onSubmit,
  onCancel,
}: {
  initial: Partial<CaseStudy>;
  errors: FieldErrors;
  saving: boolean;
  onSubmit: (data: Partial<CaseStudy>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Partial<CaseStudy>>({ ...initial });
  const set = <K extends keyof CaseStudy>(key: K, value: CaseStudy[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...draft });
  };

  return (
    <form onSubmit={submit} className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          {initial.id ? 'Edit Case Study' : 'New Case Study'}
        </h3>
        <button type="button" onClick={onCancel} className="text-xs text-slate-600 hover:text-slate-900 dark:hover:text-white dark:text-slate-300">
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label htmlFor="cs-title" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Title *</label>
          <input id="cs-title" type="text" required value={draft.title ?? ''} onChange={(e) => set('title', e.target.value)} className={inputClass} />
          <FieldError id="cs-title-error" message={errors.title} />
        </div>
        <div>
          <label htmlFor="cs-slug" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">URL slug (blank = from title)</label>
          <input id="cs-slug" type="text" value={draft.slug ?? ''} onChange={(e) => set('slug', e.target.value)} placeholder="auto-generated when blank" className={`${inputClass} font-mono`} />
          <FieldError id="cs-slug-error" message={errors.slug} />
        </div>
        <div>
          <label htmlFor="cs-client" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Client *</label>
          <input id="cs-client" type="text" required value={draft.client ?? ''} onChange={(e) => set('client', e.target.value)} className={inputClass} />
          <FieldError id="cs-client-error" message={errors.client} />
        </div>
        <div>
          <label htmlFor="cs-businessType" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Business type</label>
          <input id="cs-businessType" type="text" value={draft.businessType ?? ''} onChange={(e) => set('businessType', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 text-xs">
        <div>
          <label htmlFor="cs-problem" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Problem overview *</label>
          <textarea id="cs-problem" rows={3} required value={draft.problemOverview ?? ''} onChange={(e) => set('problemOverview', e.target.value)} className={inputClass} />
          <FieldError id="cs-problem-error" message={errors.problemOverview} />
        </div>
        <div>
          <label htmlFor="cs-solution" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Solution implemented *</label>
          <textarea id="cs-solution" rows={3} required value={draft.solutionImplemented ?? ''} onChange={(e) => set('solutionImplemented', e.target.value)} className={inputClass} />
          <FieldError id="cs-solution-error" message={errors.solutionImplemented} />
        </div>
        <div>
          <label htmlFor="cs-outcome" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Quantified outcome *</label>
          <textarea id="cs-outcome" rows={2} required value={draft.quantifiedOutcome ?? ''} onChange={(e) => set('quantifiedOutcome', e.target.value)} className={inputClass} />
          <FieldError id="cs-outcome-error" message={errors.quantifiedOutcome} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div>
          <label htmlFor="cs-featuredImage" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Featured image URL</label>
          <input id="cs-featuredImage" type="text" value={draft.featuredImageUrl ?? ''} onChange={(e) => set('featuredImageUrl', e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="cs-videoUrl" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Video URL</label>
          <input id="cs-videoUrl" type="text" value={draft.videoUrl ?? ''} onChange={(e) => set('videoUrl', e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="cs-websiteUrl" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Website URL</label>
          <input id="cs-websiteUrl" type="text" value={draft.websiteUrl ?? ''} onChange={(e) => set('websiteUrl', e.target.value)} className={`${inputClass} font-mono`} />
        </div>
        <div>
          <label htmlFor="cs-seoTitle" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">SEO title</label>
          <input id="cs-seoTitle" type="text" value={draft.seoTitle ?? ''} onChange={(e) => set('seoTitle', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="cs-seoDescription" className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">SEO description</label>
          <input id="cs-seoDescription" type="text" value={draft.seoDescription ?? ''} onChange={(e) => set('seoDescription', e.target.value)} className={inputClass} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
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
          {saving ? 'Saving…' : initial.id ? 'Save Changes' : 'Create Case Study'}
        </button>
      </div>
    </form>
  );
}
