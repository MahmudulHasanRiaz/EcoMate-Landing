'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Image as ImageIcon,
  Video,
  FolderTree,
  Tag as TagIcon,
  Globe,
  Clock,
  User,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  ExternalLink,
  Languages,
} from 'lucide-react';
import type { BlogPost, BlogCategory, BlogTag } from '@/src/types/api';
import * as api from '@/src/services/api';
import { slugify } from '@/lib/slug';
import { absoluteUrl } from '@/lib/seo';
import { moveGalleryItem } from '@/lib/blogMedia';
import { BlogVideoPlayer } from '@/src/components/blog/BlogVideoPlayer';
import { RichBlogEditor } from './RichBlogEditor';
import { MediaPickerModal } from './MediaPickerModal';
import { FieldError } from './AdminPanel';
import type { FieldErrors } from './fieldErrors';

interface BlogPostEditorProps {
  post: Partial<BlogPost>;
  errors: FieldErrors;
  onSave: (post: Partial<BlogPost>) => Promise<void>;
  onCancel: () => void;
  saving?: boolean;
}

export function BlogPostEditor({
  post: initialPost,
  errors,
  onSave,
  onCancel,
  saving = false,
}: BlogPostEditorProps) {
  const [activeLang, setActiveLang] = useState<'en' | 'bn'>('en');
  const [post, setPost] = useState<Partial<BlogPost>>({
    title: '',
    titleBn: '',
    slug: '',
    excerpt: '',
    excerptBn: '',
    content: '',
    contentBn: '',
    author: 'EcoMate Operations Research',
    category: 'Operations & Fulfillment',
    categoryId: null,
    tags: [],
    featuredImageUrl: '',
    videoUrl: '',
    galleryUrls: [],
    readTime: '5 min read',
    status: 'draft',
    seoTitle: '',
    seoTitleBn: '',
    seoDescription: '',
    seoDescriptionBn: '',
    canonicalUrl: '',
    ...initialPost,
  });

  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [availableTags, setAvailableTags] = useState<BlogTag[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [activeMediaTarget, setActiveMediaTarget] = useState<'featured' | 'gallery' | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getBlogCategories(true)
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch(() => {});

    api
      .getBlogTags()
      .then((data) => {
        if (!cancelled) setAvailableTags(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  // Flattened category tree for the select dropdown
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

  const flatCategories = flattenTree(categories);

  const handleTitleChange = (newTitle: string) => {
    const shouldUpdateSlug = !post.id || !post.slug;
    setPost((prev) => ({
      ...prev,
      title: newTitle,
      slug: shouldUpdateSlug ? slugify(newTitle) : prev.slug,
      seoTitle: prev.seoTitle ? prev.seoTitle : newTitle.slice(0, 70),
    }));
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, '');
    if (!trimmed) return;
    const currentTags = post.tags ?? [];
    if (!currentTags.includes(trimmed)) {
      setPost((prev) => ({ ...prev, tags: [...currentTags, trimmed] }));
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setPost((prev) => ({
      ...prev,
      tags: (prev.tags ?? []).filter((t) => t !== tagToRemove),
    }));
  };

  const handleMediaSelect = (url: string) => {
    if (activeMediaTarget === 'featured') {
      setPost((prev) => ({ ...prev, featuredImageUrl: url }));
    } else if (activeMediaTarget === 'gallery') {
      const currentGallery = post.galleryUrls ?? [];
      if (!currentGallery.includes(url)) {
        setPost((prev) => ({ ...prev, galleryUrls: [...currentGallery, url] }));
      }
    }
    setActiveMediaTarget(null);
  };

  const isPublished = post.status === 'published';

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {post.id ? 'Edit Article' : 'Write New Article'}
              </h2>
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${
                  post.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                }`}
              >
                {post.status ?? 'draft'}
              </span>
            </div>
            {post.slug && (
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                /blog/{post.slug}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {post.slug && post.status === 'published' && (
            <div className="flex items-center gap-1.5">
              <a
                href={`/en/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                title="View live English article"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Live (EN)</span>
              </a>
              <a
                href={`/bn/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                title="View live Bengali article"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Live (BN)</span>
              </a>
            </div>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void onSave(post)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {saving ? (
              <span>Saving…</span>
            ) : isPublished ? (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>Update Live Article</span>
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                <span>Save Article</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Grid: Left Column (Content) & Right Column (Taxonomy & SEO) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: 8 cols */}
        <div className="lg:col-span-8 space-y-5">
          {/* Language Switcher Tabs */}
          <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17]">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-indigo-500" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Content Language:
              </span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setActiveLang('en')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeLang === 'en'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🇬🇧</span>
                <span>English Content</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('bn')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeLang === 'bn'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>🇧🇩</span>
                <span>বাংলা কন্টেন্ট</span>
              </button>
            </div>
          </div>

          {/* Title & Slug */}
          <div className="space-y-3 p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17]">
            {activeLang === 'en' ? (
              <div>
                <label htmlFor="post-title" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Article Title (English) *
                </label>
                <input
                  id="post-title"
                  type="text"
                  required
                  value={post.title || ''}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="e.g. How High-Volume E-Commerce Brands Eliminate Courier COD Losses"
                  className="w-full px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                />
                <FieldError id="post-title-error" message={errors.title} />
              </div>
            ) : (
              <div>
                <label htmlFor="post-title-bn" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  আর্টিকেলের শিরোনাম (বাংলা)
                </label>
                <input
                  id="post-title-bn"
                  type="text"
                  value={post.titleBn || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPost((prev) => ({
                      ...prev,
                      titleBn: val,
                      seoTitleBn: prev.seoTitleBn ? prev.seoTitleBn : val.slice(0, 70),
                    }));
                  }}
                  placeholder="যেমন: ই-কমার্স বিজনেসে কুরিয়ার ক্যাশ অন ডেলিভারি (COD) ক্ষতি প্রতিরোধের আধুনিক কৌশল"
                  className="w-full px-3.5 py-2 text-sm font-semibold rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 font-bangla"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label htmlFor="post-slug" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL Slug *
                </label>
                <input
                  id="post-slug"
                  type="text"
                  required
                  value={post.slug || ''}
                  onChange={(e) => setPost({ ...post, slug: e.target.value })}
                  placeholder="e.g. eliminate-courier-cod-losses"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white font-mono"
                />
                <FieldError id="post-slug-error" message={errors.slug} />
              </div>

              <div>
                <label htmlFor="post-readTime" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Read Time
                </label>
                <input
                  id="post-readTime"
                  type="text"
                  value={post.readTime || ''}
                  onChange={(e) => setPost({ ...post, readTime: e.target.value })}
                  placeholder="5 min read"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              {activeLang === 'en' ? (
                <>
                  <label htmlFor="post-excerpt" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Excerpt / Executive Summary (English) *
                  </label>
                  <textarea
                    id="post-excerpt"
                    rows={2}
                    required
                    value={post.excerpt || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPost({
                        ...post,
                        excerpt: val,
                        seoDescription: post.seoDescription ? post.seoDescription : val.slice(0, 160),
                      });
                    }}
                    placeholder="A concise summary of the problem and practical solution. This appears on the archive card and search engine result snippets."
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 resize-none"
                  />
                  <FieldError id="post-excerpt-error" message={errors.excerpt} />
                </>
              ) : (
                <>
                  <label htmlFor="post-excerpt-bn" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    সারসংক্ষেপ / এক্সার্পট (বাংলা)
                  </label>
                  <textarea
                    id="post-excerpt-bn"
                    rows={2}
                    value={post.excerptBn || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPost({
                        ...post,
                        excerptBn: val,
                        seoDescriptionBn: post.seoDescriptionBn ? post.seoDescriptionBn : val.slice(0, 160),
                      });
                    }}
                    placeholder="আর্টিকেলের একটি সংক্ষিপ্ত ও আকর্ষণীয় সারসংক্ষেপ যা বাংলা ভার্সনের ব্লগ কার্ড ও সার্চ রেজাল্টে দেখা যাবে…"
                    className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500 resize-none font-bangla"
                  />
                </>
              )}
            </div>
          </div>

          {/* Featured Image (Main Thumbnail) */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-indigo-500" />
                Featured Thumbnail / Hero Image
              </label>
              <button
                type="button"
                onClick={() => setActiveMediaTarget('featured')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Select from Media Library</span>
              </button>
            </div>

            {post.featuredImageUrl ? (
              <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={absoluteUrl(post.featuredImageUrl)}
                  alt="Featured Preview"
                  className="w-full aspect-16/7 object-cover"
                />
                <div className="absolute top-2 right-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveMediaTarget('featured')}
                    className="px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-xs text-white text-[11px] font-medium hover:bg-black cursor-pointer"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => setPost({ ...post, featuredImageUrl: '' })}
                    className="p-1 rounded-md bg-rose-600/80 text-white hover:bg-rose-600 cursor-pointer"
                    title="Remove image"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setActiveMediaTarget('featured')}
                className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-lg hover:border-indigo-500 cursor-pointer bg-slate-50/50 dark:bg-white/[0.01] transition-colors"
              >
                <ImageIcon className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No featured image selected
                </p>
                <p className="text-[11px] text-slate-400">
                  Click to browse or upload from Media Library
                </p>
              </div>
            )}

            {errors.featuredImageUrl && (
              <FieldError id="post-featured-error" message={errors.featuredImageUrl} />
            )}
          </div>

          {/* Video Player Box */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Video className="h-4 w-4 text-red-500" />
                Featured Video (YouTube, Vimeo, or MP4)
              </label>
              <span className="text-[11px] text-slate-400">
                Ultra-clean responsive player directly below hero
              </span>
            </div>

            <input
              type="text"
              value={post.videoUrl || ''}
              onChange={(e) => setPost({ ...post, videoUrl: e.target.value })}
              placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/… or direct video URL"
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white font-mono"
            />
            <FieldError id="post-video-error" message={errors.videoUrl} />

            {post.videoUrl && (
              <div className="mt-3">
                <BlogVideoPlayer
                  videoUrl={post.videoUrl}
                  title={post.title || 'Video preview'}
                  poster={post.featuredImageUrl}
                />
              </div>
            )}
          </div>

          {/* Rich Content Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span>Article Body Content</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                  {activeLang === 'en' ? '🇬🇧 English' : '🇧🇩 বাংলা'}
                </span>
              </label>
              <span className="text-[11px] text-slate-400">
                Supports Markdown, Semantic HTML, Images &amp; Tables
              </span>
            </div>
            {activeLang === 'en' ? (
              <>
                <RichBlogEditor
                  value={post.content || ''}
                  onChange={(content) => setPost((prev) => ({ ...prev, content }))}
                  onReadTimeChange={(time) => setPost((prev) => ({ ...prev, readTime: time }))}
                  minHeight="420px"
                />
                <FieldError id="post-content-error" message={errors.content} />
              </>
            ) : (
              <RichBlogEditor
                value={post.contentBn || ''}
                onChange={(contentBn) => setPost((prev) => ({ ...prev, contentBn }))}
                minHeight="420px"
              />
            )}
          </div>

          {/* Image Gallery */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Article Image Gallery (Optional)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Secondary images rendered as an interactive grid with lightbox after the article body.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveMediaTarget('gallery')}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 hover:bg-indigo-100 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add from Media Library</span>
              </button>
            </div>

            {(!post.galleryUrls || post.galleryUrls.length === 0) ? (
              <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-lg">
                No gallery images added. Click &quot;Add from Media Library&quot; to attach images.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {post.galleryUrls.map((url, index) => (
                  <div
                    key={`${index}-${url}`}
                    className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40 aspect-4/3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={absoluteUrl(url)}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 transition-opacity">
                      <button
                        type="button"
                        onClick={() =>
                          setPost({
                            ...post,
                            galleryUrls: moveGalleryItem(post.galleryUrls ?? [], index, -1),
                          })
                        }
                        disabled={index === 0}
                        title="Move left"
                        className="p-1 rounded bg-white/20 text-white disabled:opacity-30 cursor-pointer"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPost({
                            ...post,
                            galleryUrls: (post.galleryUrls ?? []).filter((_, i) => i !== index),
                          })
                        }
                        title="Remove"
                        className="p-1 rounded bg-rose-600 text-white cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPost({
                            ...post,
                            galleryUrls: moveGalleryItem(post.galleryUrls ?? [], index, 1),
                          })
                        }
                        disabled={index === (post.galleryUrls?.length ?? 1) - 1}
                        title="Move right"
                        className="p-1 rounded bg-white/20 text-white disabled:opacity-30 cursor-pointer"
                      >
                        →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right column: 4 cols (Taxonomy, Meta & SEO) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Publishing & Author card */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Publishing &amp; Author
            </h4>

            <div>
              <label htmlFor="post-status" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Article Status
              </label>
              <select
                id="post-status"
                value={post.status || 'draft'}
                onChange={(e) => setPost({ ...post, status: e.target.value as BlogPost['status'] })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="draft">Draft (hidden from public)</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published (live)</option>
                <option value="archived">Archived (hidden, keeps history)</option>
              </select>
            </div>

            <div>
              <label htmlFor="post-author" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Author Byline
              </label>
              <input
                id="post-author"
                type="text"
                value={post.author || ''}
                onChange={(e) => setPost({ ...post, author: e.target.value })}
                placeholder="EcoMate Operations Research"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Hierarchical Category Selector */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <FolderTree className="h-3.5 w-3.5 text-indigo-500" />
              Category
            </h4>

            <div>
              <select
                id="post-category"
                value={post.categoryId ? String(post.categoryId) : ''}
                onChange={(e) => {
                  const catId = e.target.value ? Number(e.target.value) : null;
                  const selectedObj = flatCategories.find((c) => c.id === catId);
                  setPost({
                    ...post,
                    categoryId: catId,
                    category: selectedObj?.name || post.category || 'Operations & Fulfillment',
                  });
                }}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white cursor-pointer"
              >
                <option value="">— Select Category —</option>
                {flatCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {'\u00A0\u00A0'.repeat(cat.depth)}
                    {cat.depth > 0 ? '↳ ' : ''}
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Fallback category name input if custom */}
            <div>
              <label htmlFor="post-cat-name" className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                Display Category Name
              </label>
              <input
                id="post-cat-name"
                type="text"
                value={post.category || ''}
                onChange={(e) => setPost({ ...post, category: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Tags manager */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <TagIcon className="h-3.5 w-3.5 text-indigo-500" />
              Tags
            </h4>

            {/* Active tags badges */}
            <div className="flex flex-wrap gap-1.5 min-h-[32px]">
              {(post.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40 text-xs"
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-indigo-900 dark:hover:text-white cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Tag add input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="Type tag & press enter…"
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => handleAddTag(tagInput)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Available tag suggestions */}
            {availableTags.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                <p className="text-[10px] text-slate-400 mb-1">Click to add from existing tags:</p>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {availableTags
                    .filter((t) => !(post.tags ?? []).includes(t.name) && !(post.tags ?? []).includes(t.slug))
                    .slice(0, 15)
                    .map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleAddTag(t.slug || t.name)}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-white/5 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-600 dark:text-slate-400 hover:text-indigo-600 cursor-pointer"
                      >
                        +{t.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* 2026 AI Search & SEO Meta Box */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-indigo-500" />
                SEO &amp; Search Optimization
              </h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                {activeLang === 'en' ? '🇬🇧 EN Meta' : '🇧🇩 BN মেটা'}
              </span>
            </div>

            {activeLang === 'en' ? (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="post-seoTitle" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      SEO Meta Title (English)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {(post.seoTitle || post.title || '').length}/70
                    </span>
                  </div>
                  <input
                    id="post-seoTitle"
                    type="text"
                    maxLength={70}
                    value={post.seoTitle || ''}
                    onChange={(e) => setPost({ ...post, seoTitle: e.target.value })}
                    placeholder="Targeted title for Google & AI search bots"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="post-seoDesc" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      SEO Meta Description (English)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {(post.seoDescription || post.excerpt || '').length}/160
                    </span>
                  </div>
                  <textarea
                    id="post-seoDesc"
                    rows={3}
                    maxLength={200}
                    value={post.seoDescription || ''}
                    onChange={(e) => setPost({ ...post, seoDescription: e.target.value })}
                    placeholder="High-intent summary shown under search engine listings"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white resize-none"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="post-seoTitle-bn" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      এসইও মেটা টাইটেল (বাংলা)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {(post.seoTitleBn || post.titleBn || '').length}/70
                    </span>
                  </div>
                  <input
                    id="post-seoTitle-bn"
                    type="text"
                    maxLength={70}
                    value={post.seoTitleBn || ''}
                    onChange={(e) => setPost({ ...post, seoTitleBn: e.target.value })}
                    placeholder="গুগল ও সার্চ ইঞ্জিনের জন্য বাংলা মেটা শিরোনাম"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white font-bangla"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="post-seoDesc-bn" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      এসইও মেটা ডেসক্রিপশন (বাংলা)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      {(post.seoDescriptionBn || post.excerptBn || '').length}/160
                    </span>
                  </div>
                  <textarea
                    id="post-seoDesc-bn"
                    rows={3}
                    maxLength={200}
                    value={post.seoDescriptionBn || ''}
                    onChange={(e) => setPost({ ...post, seoDescriptionBn: e.target.value })}
                    placeholder="গুগল সার্চ ফলাফলে প্রদর্শনের জন্য বাংলা ডেসক্রিপশন"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white resize-none font-bangla"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="post-canonical" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Canonical URL (Optional)
              </label>
              <input
                id="post-canonical"
                type="url"
                value={post.canonicalUrl || ''}
                onChange={(e) => setPost({ ...post, canonicalUrl: e.target.value })}
                placeholder="https://ecomate.bd/en/blog/…"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-black/30 text-slate-900 dark:text-white font-mono"
              />
            </div>

            {/* Google / AI Snippet Preview */}
            <div className="mt-4 p-3 rounded-lg bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                Google / AI Search Preview ({activeLang === 'en' ? 'EN' : 'BN'})
              </span>
              <div className="text-[11px] text-slate-500 font-mono truncate">
                https://ecomate.bd › {activeLang} › blog › {post.slug || 'article-slug'}
              </div>
              <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate">
                {activeLang === 'en'
                  ? (post.seoTitle || post.title || 'Untitled Article')
                  : (post.seoTitleBn || post.titleBn || 'শিরোনামহীন আর্টিকেল')}
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {activeLang === 'en'
                  ? (post.seoDescription || post.excerpt || 'Article summary will appear here…')
                  : (post.seoDescriptionBn || post.excerptBn || 'বাংলা আর্টিকেলের সারসংক্ষেপ এখানে প্রদর্শিত হবে…')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={activeMediaTarget !== null}
        onClose={() => setActiveMediaTarget(null)}
        onSelect={handleMediaSelect}
        title={
          activeMediaTarget === 'featured'
            ? 'Select Featured Thumbnail'
            : 'Add Gallery Images'
        }
      />
    </div>
  );
}
