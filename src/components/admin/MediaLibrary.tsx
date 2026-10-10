'use client';

/**
 * Media library (Phase 3b Item 17, Decision 9) — usable by editors.
 *
 * Upload flow is presigned direct-to-R2 (`sign` → browser `PUT` → `confirm`): file
 * bytes never transit the Worker. When presign credentials are not provisioned the
 * sign endpoint answers 503 and the uploader falls back to the legacy multipart
 * route with an operator-visible notice — uploading never dead-ends.
 *
 * List / edit (title, alt text, category) / delete (with in-use 409 surfacing) /
 * copy-URL for content editors, plus text search and category filter. Thumbnails
 * render through the public `/media/<key>` proxy.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '@/src/services/api';
import type { MediaAsset } from '@/src/types/api';

const CATEGORIES = ['general', 'logo', 'hero', 'product_ui', 'customer_logo', 'og_image'] as const;
const ACCEPT = 'image/jpeg,image/png,image/webp';

function formatBytes(size: number | null | undefined): string {
  if (!size) return '—';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function errorText(err: unknown): string {
  const message = err instanceof Error && err.message ? err.message : '';
  // R2 is a deployment binding, not an operator mistake: say what to do instead
  // of surfacing the driver constant.
  if (/R2_NOT_BOUND|presign|direct upload not configured/i.test(message)) {
    return 'Uploads need R2 storage configured on this deployment — ask your deploy admin. Library browsing, metadata edits and URL copies still work.';
  }
  if (message) return message;
  return 'Something went wrong. Please try again.';
}

export function MediaLibrary() {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [editing, setEditing] = useState<MediaAsset | null>(null);
  const [editForm, setEditForm] = useState({ title: '', altText: '', category: 'general' });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setAssets(await api.getMediaAssets({ limit: api.ADMIN_LIST_LIMIT }));
    } catch (err) {
      setNotice({ kind: 'err', text: errorText(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Upload one file: presigned direct-to-R2, legacy fallback when unconfigured. */
  const uploadFile = useCallback(
    async (file: File) => {
      setBusy(`Uploading ${file.name}…`);
      setNotice(null);
      try {
        // Presigned path first — bytes go straight to R2.
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
          await api.confirmMediaUpload({
            key: signed.key,
            title: file.name.replace(/\.[^.]*$/, ''),
            altText: file.name.replace(/\.[^.]*$/, ''),
          });
          setNotice({ kind: 'ok', text: `${file.name} uploaded.` });
        } catch (signErr) {
          // 503 = presign not provisioned → legacy multipart path (bytes via Worker).
          const status = (signErr as { status?: number })?.status;
          if (status !== 503) throw signErr;
          await api.legacyUploadMedia(file, { title: file.name.replace(/\.[^.]*$/, '') });
          setNotice({ kind: 'ok', text: `${file.name} uploaded via standard upload (direct upload not configured).` });
        }
        await refresh();
      } catch (err) {
        setNotice({ kind: 'err', text: errorText(err) });
      } finally {
        setBusy(null);
        if (fileRef.current) fileRef.current.value = '';
      }
    },
    [refresh],
  );

  const removeAsset = useCallback(
    async (asset: MediaAsset) => {
      if (!window.confirm(`Delete "${asset.title}"? The R2 object is purged unless another asset shares its key.`)) return;
      setBusy(`Deleting ${asset.title}…`);
      try {
        await api.deleteMediaAsset(asset.id);
        setNotice({ kind: 'ok', text: `"${asset.title}" deleted.` });
        await refresh();
      } catch (err) {
        setNotice({ kind: 'err', text: errorText(err) });
      } finally {
        setBusy(null);
      }
    },
    [refresh],
  );

  const openEdit = useCallback((asset: MediaAsset) => {
    setEditing(asset);
    setEditForm({ title: asset.title, altText: asset.altText, category: asset.category });
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editing) return;
    setBusy('Saving…');
    try {
      await api.updateMediaAsset(editing.id, editForm);
      setEditing(null);
      setNotice({ kind: 'ok', text: 'Asset updated.' });
      await refresh();
    } catch (err) {
      setNotice({ kind: 'err', text: errorText(err) });
    } finally {
      setBusy(null);
    }
  }, [editing, editForm, refresh]);

  const copyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice({ kind: 'ok', text: 'URL copied to clipboard.' });
    } catch {
      setNotice({ kind: 'err', text: 'Copy failed — select the URL manually.' });
    }
  }, []);

  const visible = assets.filter((asset) => {
    if (category !== 'all' && asset.category !== category) return false;
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return asset.title.toLowerCase().includes(q) || asset.key.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Media Library</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            Direct-to-R2 uploads, resizable library grid, edit metadata, copy URLs into content.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadFile(file);
            }}
          />
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => fileRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-xs cursor-pointer"
          >
            {busy ?? 'Upload image'}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border ${
            notice.kind === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-300'
              : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or key…"
          className="flex-1 min-w-[180px] px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">Loading library…</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">No assets match. Upload the first image above.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((asset) => (
            <div key={asset.id} className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0E1B] shadow-xs overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={asset.url} alt={asset.altText} className="w-full h-40 object-cover bg-slate-100 dark:bg-black/30" loading="lazy" />
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 uppercase font-bold">{asset.category}</span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{formatBytes(asset.sizeBytes)}</span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">{asset.title}</h3>
                <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">{asset.key}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => void copyUrl(asset.url)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Copy URL
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(asset)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeAsset(asset)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Edit media asset">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0C0E1B] border border-slate-200 dark:border-white/10 p-5 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white">Edit asset</h3>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Title
              <input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                maxLength={200}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Alt text
              <textarea
                value={editForm.altText}
                onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })}
                maxLength={500}
                rows={2}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Category
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={busy !== null}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white cursor-pointer"
              >
                {busy ?? 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
