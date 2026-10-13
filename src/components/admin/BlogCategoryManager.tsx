'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderPlus,
  FolderTree,
  Edit2,
  Trash2,
  Plus,
  ChevronRight,
  Folder,
  Loader2,
  AlertCircle,
  Check,
} from 'lucide-react';
import * as api from '@/src/services/api';
import type { BlogCategory } from '@/src/types/api';
import { slugify } from '@/lib/slug';

export function BlogCategoryManager() {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Partial<BlogCategory> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [parentForNew, setParentForNew] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBlogCategories(true);
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Flattened list for parent selection in dropdown
  const flattenTree = (nodes: BlogCategory[], depth = 0): Array<{ id: number; name: string; depth: number }> => {
    const list: Array<{ id: number; name: string; depth: number }> = [];
    for (const node of nodes) {
      list.push({ id: node.id, name: node.name, depth });
      if (node.children && node.children.length > 0) {
        list.push(...flattenTree(node.children, depth + 1));
      }
    }
    return list;
  };

  const flatOptions = flattenTree(categories);

  const handleStartCreate = (parentId: number | null = null) => {
    setParentForNew(parentId);
    setEditingCategory({
      name: '',
      slug: '',
      description: '',
      parentId,
      sortOrder: 0,
    });
    setIsCreating(true);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editingCategory.name?.trim()) return;

    setSaving(true);
    setError(null);
    try {
      if (editingCategory.id) {
        await api.updateBlogCategory(editingCategory.id, {
          name: editingCategory.name.trim(),
          slug: editingCategory.slug?.trim() || slugify(editingCategory.name),
          description: editingCategory.description?.trim() || '',
          parentId: editingCategory.parentId ?? null,
          sortOrder: Number(editingCategory.sortOrder ?? 0),
        });
        setSuccess('Category updated successfully');
      } else {
        await api.createBlogCategory({
          name: editingCategory.name.trim(),
          slug: editingCategory.slug?.trim() || slugify(editingCategory.name),
          description: editingCategory.description?.trim() || '',
          parentId: editingCategory.parentId ?? null,
          sortOrder: Number(editingCategory.sortOrder ?? 0),
        });
        setSuccess('Category created successfully');
      }

      await loadCategories();
      setIsCreating(false);
      setEditingCategory(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category "${name}"? Any subcategories will be moved to the parent level.`)) {
      return;
    }
    setError(null);
    try {
      await api.deleteBlogCategory(id);
      await loadCategories();
      setSuccess(`Category "${name}" deleted`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category');
    }
  };

  const renderCategoryNode = (node: BlogCategory, depth = 0) => {
    return (
      <div key={node.id} className="space-y-1">
        <div
          className={`flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] hover:border-[#0f766e]/50 transition-colors ${
            depth > 0 ? 'ml-4 sm:ml-6' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {depth > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
            <Folder className="h-4 w-4 text-[#0f766e] dark:text-teal-300 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {node.name}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  /{node.slug}
                </span>
              </div>
              {node.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                  {node.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              title="Add sub-category"
              onClick={() => handleStartCreate(node.id)}
              className="p-1 rounded-md text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-slate-100 dark:hover:bg-white/5 text-xs inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              <span className="text-[10px] hidden sm:inline">Add Child</span>
            </button>
            <button
              type="button"
              title="Edit"
              onClick={() => {
                setEditingCategory(node);
                setIsCreating(true);
              }}
              className="p-1 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Delete"
              onClick={() => handleDelete(node.id, node.name)}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="space-y-1">
            {node.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-[#0f766e] dark:text-teal-300" />
            Blog Categories (Hierarchical Taxonomy)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Organize articles into root categories, sub-categories, and sub-sub-categories.
          </p>
        </div>

        {!isCreating && (
          <button
            type="button"
            onClick={() => handleStartCreate(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>New Root Category</span>
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

      {/* Category Creation / Edit Form */}
      {isCreating && editingCategory && (
        <form
          onSubmit={handleSave}
          className="p-4 rounded-xl border border-[#bfdcd7] dark:border-[#1f4f4a] bg-[#e6f2f0] dark:bg-[#12302e] space-y-3"
        >
          <div className="flex items-center justify-between border-b border-[#bfdcd7] dark:border-white/5 pb-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
              {editingCategory.id ? 'Edit Category' : 'Create Category'}
            </h4>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingCategory(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                value={editingCategory.name || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditingCategory({
                    ...editingCategory,
                    name: val,
                    slug: !editingCategory.id ? slugify(val) : editingCategory.slug,
                  });
                }}
                placeholder="e.g. Courier & Logistics"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Slug (URL identifier)
              </label>
              <input
                type="text"
                value={editingCategory.slug || ''}
                onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                placeholder="courier-logistics"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Parent Category (Hierarchy)
              </label>
              <select
                value={editingCategory.parentId ?? ''}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setEditingCategory({ ...editingCategory, parentId: val });
                }}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="">— None (Top-level Root Category) —</option>
                {flatOptions
                  .filter((item) => item.id !== editingCategory.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {'\u00A0\u00A0'.repeat(item.depth)}
                      {item.depth > 0 ? '↳ ' : ''}
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Sort Order
              </label>
              <input
                type="number"
                value={editingCategory.sortOrder ?? 0}
                onChange={(e) => setEditingCategory({ ...editingCategory, sortOrder: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={editingCategory.description || ''}
              onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
              placeholder="Brief description for SEO archive pages"
              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingCategory(null);
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              <span>Save Category</span>
            </button>
          </div>
        </form>
      )}

      {/* Tree view list */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-[#0f766e] dark:text-teal-300" />
          Loading categories…
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-10 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
          No categories created yet. Click &quot;New Root Category&quot; to begin.
        </div>
      ) : (
        <div className="space-y-2">
          {categories.map((root) => renderCategoryNode(root, 0))}
        </div>
      )}
    </div>
  );
}
