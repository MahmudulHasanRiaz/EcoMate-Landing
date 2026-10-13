import { ExternalLink, Plus, Search, Trash2 } from 'lucide-react';
import type { BlogPost } from '../../../types/api';
import type { FieldErrors } from '../fieldErrors';
import { AsyncButton } from '@/hooks/useAsyncAction';
import { BlogPostEditor } from '../BlogPostEditor';
import { BlogCategoryManager } from '../BlogCategoryManager';
import { BlogTagManager } from '../BlogTagManager';
import { Card, EmptyState, PrimaryButton, Tag } from '../ui';

export interface BlogTabProps {
  blogPosts: BlogPost[];
  editingPost: Partial<BlogPost>;
  onEditingPostChange: React.Dispatch<React.SetStateAction<Partial<BlogPost>>>;
  blogErrors: FieldErrors;
  onBlogErrorsChange: (errors: FieldErrors) => void;
  isEditingBlog: boolean;
  onIsEditingBlogChange: (editing: boolean) => void;
  isBlogSaving: boolean;
  /** Shared panel mutation pending flag (AdminPanel `mutation.pending`). */
  mutating: boolean;
  blogSubTab: 'posts' | 'categories' | 'tags';
  onBlogSubTabChange: (tab: 'posts' | 'categories' | 'tags') => void;
  blogSearchQuery: string;
  onBlogSearchQueryChange: (query: string) => void;
  blogStatusFilter: string;
  onBlogStatusFilterChange: (filter: string) => void;
  onSaveBlogPost: (post: Partial<BlogPost>) => Promise<void>;
  onDeleteBlogPost: (id: number, title: string) => void;
}

export const BlogTab: React.FC<BlogTabProps> = ({
  blogPosts,
  editingPost,
  onEditingPostChange,
  blogErrors,
  onBlogErrorsChange,
  isEditingBlog,
  onIsEditingBlogChange,
  isBlogSaving,
  mutating,
  blogSubTab,
  onBlogSubTabChange,
  blogSearchQuery,
  onBlogSearchQueryChange,
  blogStatusFilter,
  onBlogStatusFilterChange,
  onSaveBlogPost,
  onDeleteBlogPost,
}) => {
  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {isEditingBlog ? (
        <BlogPostEditor
          post={editingPost}
          errors={blogErrors}
          onSave={onSaveBlogPost}
          onCancel={() => onIsEditingBlogChange(false)}
          saving={isBlogSaving}
        />
      ) : (
        <div className="space-y-5">
          {/* Sub-navigation bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#eceef1] dark:border-[#1e1e2a] pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#14171c] dark:text-[#ededf3]">
                Blog &amp; Knowledge Engine
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] dark:text-[#8e8ea4] mt-0.5">
                Publish high-authority guides optimized for 2026 AI search (Gemini, ChatGPT) and search engines.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="inline-flex overflow-hidden rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] p-0.5"
                role="group"
                aria-label="Blog section"
              >
                {(
                  [
                    { id: 'posts', label: `Articles (${blogPosts.length})` },
                    { id: 'categories', label: 'Categories & Tree' },
                    { id: 'tags', label: 'Tags' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={blogSubTab === tab.id}
                    onClick={() => onBlogSubTabChange(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      blogSubTab === tab.id
                        ? 'bg-[#e6f2f0] dark:bg-[#12302e] text-teal-700 dark:text-teal-300'
                        : 'text-[#566070] dark:text-[#a2a2b6] hover:text-[#14171c] dark:hover:text-[#ededf3]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {blogSubTab === 'posts' && (
                <PrimaryButton
                  type="button"
                  onClick={() => {
                    onEditingPostChange({
                      title: '',
                      slug: '',
                      excerpt: '',
                      content: '',
                      category: 'Operations & Fulfillment',
                      categoryId: null,
                      author: 'EcoMate Operations Research',
                      status: 'draft',
                      readTime: '5 min read',
                      tags: ['ecommerce', 'operations'],
                      featuredImageUrl: '',
                      videoUrl: '',
                      galleryUrls: [],
                      seoTitle: '',
                      seoDescription: '',
                      canonicalUrl: '',
                    });
                    onBlogErrorsChange({});
                    onIsEditingBlogChange(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Write Article</span>
                </PrimaryButton>
              )}
            </div>
          </div>

          {/* Sub-tab 1: Articles list */}
          {blogSubTab === 'posts' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-[11px] top-1/2 h-4 w-4 -translate-y-1/2 text-[#667085] dark:text-[#8e8ea4]" />
                  <input
                    type="text"
                    value={blogSearchQuery}
                    onChange={(e) => onBlogSearchQueryChange(e.target.value)}
                    placeholder="Search articles by title, slug, or category…"
                    className="w-full min-h-[34px] pl-[34px] pr-3 py-1.5 text-[13.5px] rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] placeholder-[#667085] dark:placeholder-[#8e8ea4]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={blogStatusFilter}
                    onChange={(e) => onBlogStatusFilterChange(e.target.value)}
                    className="min-h-[34px] px-3 py-1.5 text-[13.5px] rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] cursor-pointer"
                  >
                    <option value="all">All Statuses</option>
                    <option value="published">Published Live</option>
                    <option value="draft">Drafts</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Articles List */}
              {blogPosts.length === 0 ? (
                <EmptyState>No blog posts found. Click &quot;Write Article&quot; to publish your first post.</EmptyState>
              ) : (
                <div className="space-y-3">
                  {blogPosts
                    .filter((post) => {
                      const matchesStatus =
                        blogStatusFilter === 'all' || post.status === blogStatusFilter;
                      const matchesQuery =
                        !blogSearchQuery ||
                        post.title.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
                        post.slug.toLowerCase().includes(blogSearchQuery.toLowerCase()) ||
                        post.category.toLowerCase().includes(blogSearchQuery.toLowerCase());
                      return matchesStatus && matchesQuery;
                    })
                    .map((post) => (
                      <Card
                        key={post.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-[#b8bfc9] dark:hover:border-[#2a2a3a] transition-all"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          {post.featuredImageUrl ? (
                            <div className="relative h-14 w-20 shrink-0 rounded-md overflow-hidden border border-[#e4e7ec] dark:border-[#232331] bg-[#f4f6f8] dark:bg-white/[0.02]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={post.featuredImageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-14 w-20 shrink-0 rounded-md border border-[#bfdcd7] dark:border-[#1f4f4a] bg-[#e6f2f0] dark:bg-[#12302e] flex items-center justify-center text-teal-700 dark:text-teal-300 text-xs font-mono font-bold">
                              POST
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Tag>{post.category}</Tag>
                              <Tag tone={post.status === 'published' ? 'teal' : 'amber'}>
                                <span className="uppercase tracking-wide">{post.status}</span>
                              </Tag>
                              <span className="text-[11px] text-[#667085] dark:text-[#8e8ea4] font-mono">
                                /blog/{post.slug}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm sm:text-base text-[#14171c] dark:text-[#ededf3] truncate">
                              {post.title}
                            </h3>
                            <p className="text-xs text-[#667085] dark:text-[#8e8ea4] mt-0.5 line-clamp-1 max-w-2xl">
                              {post.excerpt}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {post.status === 'published' && (
                            <a
                              href={`/en/blog/${post.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#444b57] dark:text-[#b9b9cc] transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1c1c2c]"
                              title="Open live post"
                              aria-label={`Open live post ${post.title}`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              onEditingPostChange(post);
                              onBlogErrorsChange({});
                              onIsEditingBlogChange(true);
                            }}
                            className="min-h-[34px] px-3 py-1.5 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] text-[13.5px] font-medium text-[#1f242b] dark:text-[#e2e2ec] hover:bg-[#f1f3f5] dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <AsyncButton
                            onClick={() => onDeleteBlogPost(post.id, post.title)}
                            loading={mutating}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[#667085] dark:text-[#8e8ea4] hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title="Delete article"
                            aria-label={`Delete article ${post.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </AsyncButton>
                        </div>
                      </Card>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-tab 2: Categories manager */}
          {blogSubTab === 'categories' && <BlogCategoryManager />}

          {/* Sub-tab 3: Tags manager */}
          {blogSubTab === 'tags' && <BlogTagManager />}
        </div>
      )}
    </div>
  );
};
