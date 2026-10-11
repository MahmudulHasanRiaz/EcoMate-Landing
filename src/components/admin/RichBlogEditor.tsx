'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Eye,
  Columns,
  Edit3,
  Video,
  Clock,
  FileText,
} from 'lucide-react';
import { BlogContent } from '@/components/BlogContent';
import { MediaPickerModal } from './MediaPickerModal';

interface RichBlogEditorProps {
  value: string;
  onChange: (value: string) => void;
  onReadTimeChange?: (readTime: string) => void;
  minHeight?: string;
}

export function RichBlogEditor({
  value,
  onChange,
  onReadTimeChange,
  minHeight = '360px',
}: RichBlogEditorProps) {
  const [viewMode, setViewMode] = useState<'write' | 'split' | 'preview'>('write');
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Compute words and reading time
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const chars = value.length;
  const estimatedMins = Math.max(1, Math.ceil(words / 200));
  const readTimeStr = `${estimatedMins} min read`;

  useEffect(() => {
    if (onReadTimeChange && words > 0) {
      onReadTimeChange(readTimeStr);
    }
  }, [words, readTimeStr, onReadTimeChange]);

  const insertText = useCallback((before: string, after = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.substring(start, end) || defaultText;
    const replacement = `${before}${selected}${after}`;

    const newValue =
      textarea.value.substring(0, start) +
      replacement +
      textarea.value.substring(end);

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + before.length,
        start + before.length + selected.length,
      );
    }, 10);
  }, [onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      insertText('**', '**', 'bold text');
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      insertText('*', '*', 'italic text');
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      const url = prompt('Enter link URL (https://…):');
      if (url) {
        insertText('[', `](${url.trim()})`, 'link text');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      insertText('  ', '');
    }
  };

  const handleInsertMedia = (url: string) => {
    insertText(`\n![Image description](${url})\n`, '');
  };

  const handleInsertYoutube = () => {
    const url = prompt('Enter YouTube Video URL (e.g. https://www.youtube.com/watch?v=...):');
    if (!url) return;
    insertText(`\n[Watch Video on YouTube](${url.trim()})\n\n`, '');
  };

  const handleInsertLink = () => {
    const url = prompt('Enter URL (e.g. https://example.com):');
    if (!url) return;
    insertText('[', `](${url.trim()})`, 'link text');
  };

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0e17] overflow-hidden shadow-xs">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-1 p-2 border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-0.5">
          <button
            type="button"
            title="Heading 2 (Ctrl+2)"
            onClick={() => insertText('\n## ', '\n', 'Section Heading')}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Heading2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Heading 3 (Ctrl+3)"
            onClick={() => insertText('\n### ', '\n', 'Subsection Heading')}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Heading3 className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-1" />

          <button
            type="button"
            title="Bold (Ctrl+B)"
            onClick={() => insertText('**', '**', 'bold text')}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Italic (Ctrl+I)"
            onClick={() => insertText('*', '*', 'italic text')}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Quote"
            onClick={() => insertText('\n> ', '\n', 'Important insight or quote')}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Quote className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-1" />

          <button
            type="button"
            title="Bullet List"
            onClick={() => insertText('\n- ', '\n', 'List item')}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Numbered List"
            onClick={() => insertText('\n1. ', '\n', 'First item')}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ListOrdered className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Code Block"
            onClick={() => insertText('\n```\n', '\n```\n', '// code snippet')}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Code className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Horizontal Divider"
            onClick={() => insertText('\n---\n', '')}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Minus className="h-4 w-4" />
          </button>

          <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-1" />

          <button
            type="button"
            title="Insert Link (Ctrl+K)"
            onClick={handleInsertLink}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <LinkIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Insert Image from Media Library"
            onClick={() => setIsMediaPickerOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
          >
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Insert Image</span>
          </button>
          <button
            type="button"
            title="Insert YouTube Link"
            onClick={handleInsertYoutube}
            className="p-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Video className="h-4 w-4 text-red-500" />
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-slate-100 dark:bg-white/5">
          <button
            type="button"
            title="Editor Only"
            onClick={() => setViewMode('write')}
            className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
              viewMode === 'write'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Side-by-side Split View"
            onClick={() => setViewMode('split')}
            className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Columns className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Rendered Preview"
            onClick={() => setViewMode('preview')}
            className={`p-1 rounded-md text-xs transition-colors cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="relative flex-1">
        {viewMode === 'write' && (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Write your article in Markdown or clean HTML here… Use ## for headings, **bold** for emphasis, > for quotes."
            style={{ minHeight }}
            className="w-full p-4 font-mono text-xs sm:text-sm leading-relaxed bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden resize-y"
          />
        )}

        {viewMode === 'split' && (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-white/10">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your article in Markdown…"
              style={{ minHeight }}
              className="w-full p-4 font-mono text-xs sm:text-sm leading-relaxed bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden resize-y"
            />
            <div
              style={{ minHeight }}
              className="p-4 overflow-y-auto max-h-[600px] bg-slate-50/50 dark:bg-white/[0.01]"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-3">
                Live Preview
              </div>
              <BlogContent
                html={value}
                className="mk-prose prose prose-sm dark:prose-invert max-w-none"
              />
            </div>
          </div>
        )}

        {viewMode === 'preview' && (
          <div
            style={{ minHeight }}
            className="p-6 overflow-y-auto bg-slate-50/30 dark:bg-white/[0.01]"
          >
            <BlogContent
              html={value}
              className="mk-prose prose dark:prose-invert max-w-none"
            />
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.01] text-[11px] text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {words} words ({chars} chars)
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Est. read time: <strong className="text-slate-700 dark:text-slate-300">{readTimeStr}</strong>
          </span>
        </div>
        <div className="hidden sm:block text-[10px] text-slate-400">
          Markdown &amp; HTML supported • Auto-sanitized
        </div>
      </div>

      {/* Media Picker Modal */}
      <MediaPickerModal
        isOpen={isMediaPickerOpen}
        onClose={() => setIsMediaPickerOpen(false)}
        onSelect={handleInsertMedia}
        title="Insert Image into Content"
      />
    </div>
  );
}
