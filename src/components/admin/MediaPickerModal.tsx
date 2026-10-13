'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Search, Image as ImageIcon, Check, Loader2, RefreshCw } from 'lucide-react';
import * as api from '@/src/services/api';
import type { MediaAsset } from '@/src/types/api';
import { absoluteUrl } from '@/lib/seo';

interface MediaPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, asset?: MediaAsset) => void;
  title?: string;
  allowedCategories?: string[];
}

const CATEGORIES = ['all', 'general', 'hero', 'product_ui', 'customer_logo', 'og_image'] as const;

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelect,
  title = 'Select Media Asset',
}: MediaPickerModalProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMediaAssets({ limit: api.ADMIN_LIST_LIMIT });
      setAssets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load media assets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void loadAssets();
    }
  }, [isOpen, loadAssets]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      let createdUrl = '';
      try {
        const signed = await api.signMediaUpload({
          filename: file.name,
          contentType: file.type,
          size: file.size,
          title: file.name.replace(/\.[^.]*$/, ''),
          altText: file.name.replace(/\.[^.]*$/, ''),
        });
        const put = await fetch(signed.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': signed.contentType },
          body: file,
        });
        if (!put.ok) throw new Error(`Direct upload failed (HTTP ${put.status})`);
        const confirmed = await api.confirmMediaUpload({
          key: signed.key,
          title: file.name.replace(/\.[^.]*$/, ''),
          altText: file.name.replace(/\.[^.]*$/, ''),
        });
        createdUrl = confirmed.url;
      } catch (signErr) {
        const status = (signErr as { status?: number })?.status;
        if (status !== 503) throw signErr;
        const legacy = await api.legacyUploadMedia(file, { title: file.name.replace(/\.[^.]*$/, '') });
        createdUrl = legacy.url;
      }

      await loadAssets();
      setActiveTab('library');
      if (createdUrl) {
        onSelect(createdUrl);
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesCat = selectedCategory === 'all' || asset.category === selectedCategory;
    const matchesQuery =
      !search ||
      asset.title.toLowerCase().includes(search.toLowerCase()) ||
      asset.url.toLowerCase().includes(search.toLowerCase()) ||
      (asset.altText && asset.altText.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesQuery;
  });

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-[#0f766e] dark:text-teal-300" />
            <h3 id="media-picker-title" className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-100 dark:bg-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'library'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Media Library
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Upload New
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close media picker"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {activeTab === 'upload' ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-white/[0.02]">
              <Upload className="h-10 w-10 text-[#0f766e] dark:text-teal-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                Upload image to R2 Storage
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm text-center mb-4">
                Supported formats: JPEG, PNG, WebP. File will be added to your media library and auto-selected.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileUpload(file);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    Browse Files
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search & Category Filter */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title or filename…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-[#0f766e]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-black/30 text-slate-900 dark:text-white focus:outline-hidden focus:border-[#0f766e] cursor-pointer"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? 'All Categories' : cat}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void loadAssets()}
                    title="Refresh media"
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Grid of assets */}
              {loading && assets.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-xs text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#0f766e] dark:text-teal-300" />
                  Loading assets…
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center py-16 text-xs text-slate-500 dark:text-slate-400">
                  No media assets found. Upload images or clear filters.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => {
                        onSelect(asset.url, asset);
                        onClose();
                      }}
                      className="group relative flex flex-col rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] overflow-hidden text-left hover:border-[#0f766e] dark:hover:border-[#0f766e] transition-all cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-[#0f766e]"
                    >
                      <div className="relative aspect-4/3 w-full bg-slate-100 dark:bg-black/40 overflow-hidden flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={absoluteUrl(asset.url)}
                          alt={asset.altText || asset.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-[#0f766e]/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-[#0f766e] text-[11px] font-bold shadow-xs">
                            <Check className="h-3 w-3" /> Select
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                          {asset.title}
                        </p>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">
                          {asset.url}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-xs text-slate-500 dark:text-slate-400">
          <span>{filteredAssets.length} asset(s) available</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
