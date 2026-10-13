'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Edit2, Trash2, Search, Check, AlertCircle } from 'lucide-react';
import * as api from '@/src/services/api';
import type { BlogTag } from '@/src/types/api';
import { slugify } from '@/lib/slug';
import { AsyncButton, Skeleton, useAsyncAction } from '@/hooks/useAsyncAction';

export function BlogTagManager() {
  const [tags, setTags] = useState<BlogTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [editingTag, setEditingTag] = useState<Partial<BlogTag> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  // Shared async primitive (was ad-hoc `saving`): pending → disabled + spinner +
  // aria-busy, error → toast, settle → re-enable. Inline error/success banners stay.
  const mutation = useAsyncAction();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBlogTags();
      setTags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  const handleStartCreate = () => {
    setEditingTag({
      name: '',
      slug: '',
      description: '',
    });
    setIsCreating(true);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    // Captured before the async boundary: narrowing does not survive the closure.
    const draft = editingTag;
    const name = draft?.name?.trim();
    if (!draft || !name) return;

    setError(null);
    await mutation.run(async () => {
      try {
        if (draft.id) {
          await api.updateBlogTag(draft.id, {
            name,
            slug: draft.slug?.trim() || slugify(name),
            description: draft.description?.trim() || '',
          });
          setSuccess('Tag updated successfully');
        } else {
          await api.createBlogTag({
            name,
            slug: draft.slug?.trim() || slugify(name),
            description: draft.description?.trim() || '',
          });
          setSuccess('Tag created successfully');
        }

        await loadTags();
        setIsCreating(false);
        setEditingTag(null);
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save tag');
      }
    }, { errorPrefix: 'Failed to save tag' });
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Delete tag "${name}"?`)) return;
    setError(null);
    await mutation.run(async () => {
      try {
        await api.deleteBlogTag(id);
        await loadTags();
        setSuccess(`Tag "${name}" deleted`);
        setTimeout(() => setSuccess(null), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete tag');
      }
    }, { errorPrefix: 'Failed to delete tag' });
  };

  const filteredTags = tags.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="h-4 w-4 text-[#0f766e] dark:text-teal-300" />
            Blog Tags Taxonomy
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create topic keywords and search facets for AI crawlers and visitors.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={handleStartCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Tag</span>
          </button>
        )}
      </div>

      {success && (
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          {success}
        </div>
      )}

      {error && (
        <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
          {error}
        </div>
      )}

      {/* Tag Edit/Create Form */}
      {isCreating && editingTag && (
        <form
          onSubmit={handleSave}
          className="p-4 rounded-xl border border-[#bfdcd7] dark:border-[#1f4f4a] bg-[#e6f2f0] dark:bg-[#12302e] space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[#bfdcd7] dark:border-white/5 pb-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {editingTag.id ? 'Edit Tag' : 'Create Tag'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingTag(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tag Name *
              </label>
              <input
                type="text"
                required
                value={editingTag.name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingTag({
                    ...editingTag,
                    name: val,
                    slug: !editingTag.id ? slugify(val) : editingTag.slug,
                  });
                }}
                placeholder="e.g. Courier reconciliation"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Slug
              </label>
              <input
                type="text"
                value={editingTag.slug || ''}
                onChange={(e) => setEditingTag({ ...editingTag, slug: e.target.value })}
                placeholder="courier-reconciliation"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={editingTag.description || ''}
              onChange={(e) => setEditingTag({ ...editingTag, description: e.target.value })}
              placeholder="Topic description"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingTag(null);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <AsyncButton
              type="submit"
              loading={mutation.pending}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span>Save Tag</span>
            </AsyncButton>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter tags…"
          className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-[#0f766e]"
        />
      </div>

      {/* Tags Grid / Badges */}
      {loading ? (
        <div className="py-4" aria-busy="true" aria-label="Loading tags">
          <Skeleton lines={4} />
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
          No tags found. Click &quot;New Tag&quot; to add your first tag.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {filteredTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] hover:border-slate-300 dark:hover:border-white/20 transition-colors"
            >
              <div className="min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3 w-3 text-[#0f766e] dark:text-teal-300 shrink-0" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {tag.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block truncate">
                  #{tag.slug}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  title="Edit"
                  onClick={() => {
                    setEditingTag(tag);
                    setIsCreating(true);
                  }}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  <Edit2 className="h-3 w-3" />
                </button>
                <AsyncButton
                  title="Delete"
                  aria-label={`Delete tag ${tag.name}`}
                  loading={mutation.pending}
                  onClick={() => handleDelete(tag.id, tag.name)}
                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" />
                </AsyncButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
