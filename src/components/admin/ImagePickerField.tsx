'use client';

import React, { useState } from 'react';
import { Image as ImageIcon, Trash2, RefreshCw, FolderOpen } from 'lucide-react';
import { absoluteUrl } from '@/lib/seo';
import { MediaPickerModal } from './MediaPickerModal';

interface ImagePickerFieldProps {
  id?: string;
  label: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
  error?: string;
  aspectRatio?: '16/9' | '4/3' | 'square' | 'auto';
  placeholder?: string;
  helperText?: string;
  modalTitle?: string;
  required?: boolean;
  className?: string;
}

/**
 * Reusable image picker field for the Admin Panel.
 *
 * Eliminates raw URL inputs and isolated link fields everywhere an image is needed.
 * Operators can select existing assets or upload new ones directly through
 * the Media Library modal, with instant visual thumbnail preview, replace, and clear actions.
 */
export function ImagePickerField({
  id,
  label,
  value,
  onChange,
  error,
  aspectRatio = 'auto',
  placeholder = 'Select from Media Library',
  helperText,
  modalTitle,
  required = false,
  className = '',
}: ImagePickerFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const aspectClass =
    aspectRatio === '16/9'
      ? 'aspect-16/9'
      : aspectRatio === '4/3'
        ? 'aspect-4/3'
        : aspectRatio === 'square'
          ? 'aspect-square max-w-[140px]'
          : 'max-h-40';

  const hasValue = Boolean(value && value.trim().length > 0);
  const cleanUrl = hasValue ? value!.trim() : '';

  return (
    <div className={`space-y-1.5 text-xs ${className}`}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block font-semibold text-slate-700 dark:text-slate-300"
        >
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
        {hasValue && (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 dark:text-teal-300 hover:underline cursor-pointer"
          >
            <FolderOpen className="h-3 w-3" />
            <span>Change</span>
          </button>
        )}
      </div>

      {hasValue ? (
        <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/40">
          <div className="flex items-center justify-center p-2 bg-slate-50/50 dark:bg-black/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={absoluteUrl(cleanUrl)}
              alt={label}
              className={`w-full object-contain rounded-lg ${aspectClass}`}
              loading="lazy"
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#0E121E] border-t border-slate-200/80 dark:border-white/5">
            <span
              className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-[280px]"
              title={cleanUrl}
            >
              {cleanUrl}
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Replace image"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Replace</span>
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1 p-1 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                title="Remove image"
                aria-label={`Remove ${label}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setIsModalOpen(true)}
          className={`flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
            error
              ? 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/10'
              : 'border-slate-200 dark:border-white/10 hover:border-[#0f766e]/60 hover:bg-[#e6f2f0] dark:hover:bg-[#12302e] bg-slate-50/50 dark:bg-black/20'
          }`}
        >
          <div className="h-9 w-9 rounded-full bg-[#e6f2f0] dark:bg-[#12302e] text-teal-700 dark:text-teal-300 flex items-center justify-center mb-2">
            <ImageIcon className="h-4.5 w-4.5" />
          </div>
          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs text-center">
            {placeholder}
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-0.5">
            Click to browse or upload from Media Library
          </p>
        </div>
      )}

      {helperText && !error && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {helperText}
        </p>
      )}

      {error && (
        <p id={id ? `${id}-error` : undefined} className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-1">
          {error}
        </p>
      )}

      <MediaPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={(selectedUrl) => {
          onChange(selectedUrl);
          setIsModalOpen(false);
        }}
        title={modalTitle || `Select ${label}`}
      />
    </div>
  );
}
