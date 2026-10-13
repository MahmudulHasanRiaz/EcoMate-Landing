# Admin UI Redesign (Artifact-Faithful) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire admin studio to the approved artifact with zero behavior change, plus fix the brand tile to serve the public logo.

**Architecture:** Token-map restyle in place — artifact CSS values become Tailwind `dark:` pairs (existing class-dark strategy kept); `AdminPanel.tsx` splits into `AdminShell` + one component per tab with state/handlers staying where they are today; shared bits go to `admin/ui.tsx`; Geist loads via `next/font` scoped to the admin tree only.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (`@theme inline`, `@custom-variant dark`), `next/font/google`, lucide-react, vitest, playwright.

---

## File structure

| File | Responsibility |
|---|---|
| `app/layout.tsx` (modify) | Add Geist + Geist Mono to the `next/font` set |
| `app/globals.css` (modify) | Map `--font-admin` / `--font-admin-mono` in `@theme inline` |
| `src/components/admin/ui.tsx` (create) | Shared presentational bits: Card, PageHeader, PrimaryButton, GhostButton, IconButton, StatusPill, Avatar, ConfirmDialog, EmptyState, StatCard, ProgressBar |
| `src/components/admin/AdminShell.tsx` (create) | Sidebar + topbar + user widget + theme toggle + brand tile |
| `src/components/admin/tabs/DashboardTab.tsx` (create) | Dashboard markup (moved verbatim, then restyled) |
| `src/components/admin/tabs/LeadsTab.tsx` (create) | Leads markup (moved verbatim, then restyled) |
| `src/components/admin/tabs/*.tsx` (create, 8 files) | SectionsTab, ContentTab, PricingTab, TestimonialsTab, BlogTab, MediaTab, IntegrationsTab, SettingsTab |
| `src/components/admin/AdminPanel.tsx` (modify) | Keep ALL state/handlers/fetching; render shell + active tab; delete legacy header/sidebar/tab markup |
| `app/admin/AdminConsole.tsx` (modify) | Hub page token pass (teal accent, card surfaces) — logic untouched |
| `e2e/admin-redesign.spec.ts` (create) | Smoke: tabs render, theme toggle, purge dialog, drawer, screenshots |

---

## Token table (normative — every restyle step uses exactly these)

| Artifact | Light class | Dark class |
|---|---|---|
| app bg `--c0` | `bg-[#f5f6f8]` | `dark:bg-[#0a0a0f]` |
| sidebar `--c4` | `bg-[#fafbfc]` | `dark:bg-[#0e0e14]` |
| sidebar border `--c5` | `border-[#e6e8ec]` | `dark:border-[#1c1c27]` |
| card `--c30` | `bg-white` | `dark:bg-[#111118]` |
| card border `--c14` | `border-[#e4e7ec]` | `dark:border-[#232331]` |
| card radius | `rounded-[10px]` | same |
| body text `--c1` | `text-[#14171c]` | `dark:text-[#ededf3]` |
| muted `--c8` | `text-[#667085]` | `dark:text-[#8e8ea4]` |
| faint `--c29` | `text-[#566070]` | `dark:text-[#a2a2b6]` |
| accent `--c2` | `text-teal-700` / `bg-[#0f766e]` | `dark:text-teal-300` / `dark:bg-teal-600` |
| accent tint `--c12/--c24` | `bg-[#e6f2f0]` | `dark:bg-[#12302e]` |
| accent border `--c25` | `border-[#bfdcd7]` | `dark:border-[#1f4f4a]` |
| input/button border `--c21` | `border-[#d5d9e0]` | `dark:border-[#2a2a3a]` |
| input bg `--c26` | `bg-white` | `dark:bg-[#12121a]` |
| H1 | `text-[26px] font-semibold tracking-[-0.015em]` | same |
| KPI numeral | `text-[28px] font-semibold tracking-[-0.02em]` | same |
| UI text | `text-[13.5px]` base on admin root | same |
| topbar | `h-14 backdrop-blur bg-white/90` | `dark:bg-[#0a0a0f]/90` |
| content | `max-w-[1180px] px-8 py-9` | same |
| focus ring | `focus-visible:outline-2 outline-teal-700` | `dark:outline-teal-300` |

Font: `font-admin` (Geist) on the admin root div; `font-admin-mono` (Geist Mono) for chips/code/pills. Public `body` keeps Inter — the admin classes never leak outside `AdminPanel`'s root.

---

### Task 1: Fonts + theme vars (foundation)

**Files:**
- Modify: `app/layout.tsx` (font set)
- Modify: `app/globals.css` (`@theme inline`)

- [ ] **Step 1: Add Geist to the root font set**

In `app/layout.tsx`, extend the existing `next/font/google` import and add (beside Inter/Instrument/Hind/JetBrains blocks):

```tsx
import { Geist, Geist_Mono } from 'next/font/google';

const adminSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-admin',
});
const adminMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono-admin',
});
```

Add both `.variable` strings to the `<html>` className list next to the existing four.

- [ ] **Step 2: Map admin utilities in `@theme inline`**

In `app/globals.css`, inside the existing `@theme inline` block, append:

```css
  --font-admin: var(--font-geist-admin), ui-sans-serif, system-ui, sans-serif;
  --font-admin-mono: var(--font-geist-mono-admin), ui-monospace, monospace;
```

This yields `font-admin` / `font-admin-mono` utilities scoped by usage (only the admin tree will use them).

- [ ] **Step 3: Verify build resolves the fonts**

Run: `NODE_OPTIONS="--max-old-space-size=2048" npm run build`
Expected: success; no new warnings mentioning Geist/font. (Heap-cap + solo run per AGENTS.md.)

- [ ] **Step 4: Commit**

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(admin): Geist fonts scoped to admin tree"
```

---

### Task 2: Shared primitives `admin/ui.tsx`

**Files:**
- Create: `src/components/admin/ui.tsx`

- [ ] **Step 1: Create the primitives file with exactly this content**

```tsx
import React from 'react';

/** Card shell: artifact `.cd` — white/#111118, 10px radius. */
export const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <section className={`bg-white dark:bg-[#111118] border border-[#e4e7ec] dark:border-[#232331] rounded-[10px] ${className}`}>
    {children}
  </section>
);

/** Card header row: artifact `.ch` — title left, action right. */
export const CardHeader: React.FC<{ title: string; action?: React.ReactNode }> = ({ title, action }) => (
  <div className="flex justify-between items-center gap-3 px-5 py-4 border-b border-[#eceef1] dark:border-[#1e1e2a]">
    <h2 className="m-0 text-[15px] font-semibold">{title}</h2>
    {action}
  </div>
);

/** Primary teal button: artifact `.bt.pr`. */
export const PrimaryButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border bg-[#0f766e] border-[#0f766e] text-white dark:text-white text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#115e59] hover:border-[#115e59] disabled:opacity-50 disabled:cursor-wait ${className}`}
  />
);

/** Ghost bordered button: artifact `.bt`. */
export const GhostButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ className = '', ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 min-h-[34px] px-3 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#1f242b] dark:text-[#e2e2ec] text-[13.5px] font-medium cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1a1a26] disabled:opacity-50 disabled:cursor-wait ${className}`}
  />
);

/** Square icon button: artifact `.ib`. */
export const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({
  label,
  className = '',
  ...rest
}) => (
  <button
    {...rest}
    type="button"
    title={label}
    aria-label={label}
    className={`inline-flex items-center justify-center w-8 h-8 rounded-md border border-[#d5d9e0] dark:border-[#2a2a3a] bg-white dark:bg-[#12121a] text-[#444b57] dark:text-[#b9b9cc] cursor-pointer transition-colors hover:bg-[#f1f3f5] dark:hover:bg-[#1c1c2c] ${className}`}
  />
);

/** Mono tag: artifact `.tg`. Tone teal default; `amber` for pending states. */
export const Tag: React.FC<{ tone?: 'teal' | 'amber'; children: React.ReactNode }> = ({ tone = 'teal', children }) => (
  <span
    className={
      tone === 'amber'
        ? 'inline-flex font-mono text-[11.5px] font-medium text-[#b45309] dark:text-[#fbbf24] bg-[#b45309]/[.08] dark:bg-[#fbbf24]/[.1] border border-[#b45309]/25 dark:border-[#fbbf24]/25 rounded-[5px] px-2 py-[1px]'
        : 'text-[12px] font-medium text-teal-700 dark:text-teal-300 bg-[#e6f2f0] dark:bg-[#12302e] border border-[#bfdcd7] dark:border-[#1f4f4a] rounded-[5px] px-2 py-[1px]'
    }
  >
    {children}
  </span>
);

/** Initials avatar: artifact `.av`. */
export const Avatar: React.FC<{ initials: string; size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  initials,
  size = 'md',
  className = '',
}) => {
  const sizes = {
    sm: 'w-[22px] h-[22px] text-[10px] rounded-md',
    md: 'w-9 h-9 text-[12.5px] rounded-lg',
    lg: 'w-11 h-11 text-sm rounded-[10px]',
  } as const;
  return (
    <span
      aria-hidden="true"
      className={`grid place-items-center font-semibold flex-none bg-[#e6f2f0] dark:bg-[#12302e] border border-[#bfdcd7] dark:border-[#1f4f4a] text-teal-700 dark:text-teal-300 ${sizes[size]} ${className}`}
    >
      {initials}
    </span>
  );
};

/** Confirm dialog: artifact `.dlg` — controlled open, same confirm-then-act flow as `window.confirm` call sites. */
export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}> = ({ open, title, body, confirmLabel, pending, onConfirm, onClose }) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/40 cursor-pointer" onClick={onClose} aria-hidden="true" />
      <div role="dialog" aria-modal="true" aria-label={title} className="fixed z-[61] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-32px)] bg-white dark:bg-[#14141c] border border-[#e4e7ec] dark:border-[#2a2a3a] rounded-[10px] p-5">
        <h3 className="m-0 text-base font-semibold">{title}</h3>
        <p className="mt-1 text-[13.5px] text-[#566070] dark:text-[#a2a2b6]">{body}</p>
        <div className="flex justify-end gap-2 mt-[18px]">
          <GhostButton type="button" onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton type="button" disabled={pending} onClick={onConfirm}>
            {pending ? 'Working…' : confirmLabel}
          </PrimaryButton>
        </div>
      </div>
    </>
  );
};

/** Empty state: artifact `.be`/`.emp`. */
export const EmptyState: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-12 text-center text-[12.5px] text-[#5f6978] dark:text-[#9a9ab0]">{children}</div>
);

/** Stat cell for KPI strips: artifact `.kp` (value + label + optional sub + link). */
export const StatCell: React.FC<{ label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({
  label,
  value,
  sub,
}) => (
  <div className="bg-white dark:bg-[#111118] px-5 py-[18px] flex flex-col gap-2">
    <div className="text-[13px] text-[#566070] dark:text-[#a2a2b6]">{label}</div>
    <div className="text-[28px] font-semibold tracking-[-0.02em] leading-[1.15]">{value}</div>
    {sub ? <div className="text-[13px] text-[#566070] dark:text-[#a2a2b6]">{sub}</div> : null}
  </div>
);
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/ui.tsx
git commit -m "feat(admin): shared artifact-mapped UI primitives"
```

---

### Task 3: `AdminShell` (sidebar + topbar + widget + theme + logo)

**Files:**
- Create: `src/components/admin/AdminShell.tsx`

Props contract (exact — Task 7 implementer must satisfy it):

```tsx
import type { AdminTab } from './AdminPanel';

export interface AdminNavItem {
  id: AdminTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  count?: number;
  tone?: 'rose' | 'amber';
}

export interface AdminHealth {
  sql: 'ok' | 'down';
  license: 'connected' | 'standby';
}

export interface AdminUser {
  name: string;
  email: string;
  role: string;
}

export interface AdminShellProps {
  nav: { group: string; items: AdminNavItem[] }[];
  activeTab: AdminTab;
  onTab: (tab: AdminTab) => void;
  breadcrumb: string;
  health: AdminHealth;
  user: AdminUser;
  logoUrl: string;
  siteName: string;
  purging: null | 'all' | 'landing';
  onPurge: (scope: 'all' | 'landing') => void;
  onSignOut: () => void;
  onBackToSite: () => void;
  children: React.ReactNode;
}
```

- [ ] **Step 1: Create `AdminShell.tsx` implementing**

Sidebar (252px sticky, token table rows 2–3): brand tile 34px — `logoUrl !== ''` → `<img src={logoUrl} className="w-[34px] h-[34px] rounded-lg object-cover flex-none" alt="" />`, else teal tile with `siteName` initials (first letters of first two words, uppercase); name (14.5px semibold) + `PostgreSQL & Content Engine` sub (12px muted). Group labels (11px uppercase). Nav buttons: 34px min-height, active tinted `bg-[#e6f2f0] dark:bg-[#12302e]` + 2px left accent bar + teal icon; count badges bordered chips. Mobile: off-canvas with overlay (checkbox-free — `useState` open + hamburger in topbar, same 900px breakpoint via `max-md:` classes). Bottom `UserWidget`: `<details>`-style dropdown built with `useState` (NOT native details, to close on nav): avatar + name/role + chevron; popup: header (name + email), Account & profile (decorative link `#`), Notifications (decorative), Back to Public Site → `onBackToSite`, divider, Sign out (red) → `onSignOut`.

Topbar (56px sticky blur, token row): hamburger (mobile only), breadcrumb `Operations / {breadcrumb}`, env chip `Self-Contained CMS & DB`; right: purge-all GhostButton (broom lucide `Paintbrush`? use `BrushCleaning` if exported, else `Eraser` — verify against installed lucide-react exports and use whichever exists) + purge-public IconButton with tooltip, theme IconButton (Sun/Moon by current class — read `document.documentElement.classList`, toggle `.dark` + `localStorage.setItem('ecomate-theme', …)` mirroring `app/layout.tsx:125` semantics: value `'light'` or `'dark'`), Systems dropdown (dot + label, popup with SQL Repository + License Portal rows from `health`).

Content: `<div className="w-full max-w-[1180px] mx-auto px-8 py-9 max-md:px-4 max-md:py-6 font-admin">` wrapping `{children}`. Root: `bg-[#f5f6f8] dark:bg-[#0a0a0f] text-[#14171c] dark:text-[#ededf3] grid grid-cols-[252px_minmax(0,1fr)] max-md:grid-cols-1 min-h-screen`.

Theme rule: toggle ONLY flips the document class + localStorage; dark default comes from the existing theme-init script — never force a default here.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: exit 0. (Unused-props errors fail here — every prop must be rendered.)

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/AdminShell.tsx
git commit -m "feat(admin): artifact shell with theme toggle and user widget"
```

---

### Task 4: Dashboard tab extract + restyle

**Files:**
- Create: `src/components/admin/tabs/DashboardTab.tsx`
- Modify: `src/components/admin/AdminPanel.tsx` (delete lines ~1203–1343 after wiring)

- [ ] **Step 1: Move the block verbatim**

Cut `AdminPanel.tsx` lines 1203–1343 (`{activeTab === 'dashboard' && (…)}` inner content, WITHOUT the conditional wrapper) into `DashboardTab.tsx` as a component with this exact props interface (derive from identifiers used in the block — `leads`, `pricing`, counts, tab-switch callback, pricing toggle):

```tsx
export interface DashboardTabProps {
  leads: Lead[];
  pricingModeLabel: string;
  onSwitchPricingMode: () => void;
  sectionCount: number;
  untranslatedCount: number;
  articleCount: number;
  recentLeads: Lead[];
  onOpenLeads: () => void;
  onOpenLead: (id: number) => void;
  onStatusChange: (id: number, status: Lead['status']) => void;
  onAddSection: () => void;
  onWriteArticle: () => void;
  onUploadMedia: () => void;
}
```

(If the block references anything outside this list, add it to the interface — same types, no new logic. Import types from `../../types/api`.)

- [ ] **Step 2: Restyle to artifact `vw-dash`**

Apply token table: H1 26px + 15px sub; KPI strip `grid grid-cols-5` with hairline dividers (`gap-px bg-[#e4e7ec] dark:bg-[#232331] border rounded-[10px] overflow-hidden`, cells via `StatCell`); recent-leads rows (36px avatar, name + mono phone + volume `Tag`, status select); right rail `Content health` progress bars + `Quick actions` list (`.qa` rows with arrow reveal). Replace `window.confirm`-free — dashboard has none; keep all handlers wired to props.

- [ ] **Step 3: Wire + delete + verify**

In `AdminPanel.tsx`, replace the dashboard block with `<DashboardTab {...props} />` (compute each prop from existing state/handlers — no new state). Delete the old JSX. Run: `npm run lint` → exit 0. Run: `npx vitest run tests/validation` → pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/tabs/DashboardTab.tsx src/components/admin/AdminPanel.tsx
git commit -m "feat(admin): extract and restyle dashboard tab"
```

---

### Task 5: Leads tab extract + restyle

**Files:**
- Create: `src/components/admin/tabs/LeadsTab.tsx`
- Modify: `src/components/admin/AdminPanel.tsx` (delete lines ~1344–1544 after wiring; lead drawer stays in AdminPanel for this task)

- [ ] **Step 1: Move the block verbatim**

Cut lines 1344–1544 (lead pipeline section WITHOUT the drawer — drawer moves in Task 6) into `LeadsTab.tsx`. Props interface covers every external identifier in the block (search/filter/selection state + setters, counts, export, bulk actions, row actions, `onOpenLead`). Same import/type rules as Task 4.

- [ ] **Step 2: Restyle to artifact `vw-leads` compact density**

H1 22px; 4-KPI strip compact (`StatCell` with 19px numerals — extend via `className` passthrough: add optional `valueClassName` prop to `StatCell` in `ui.tsx` if missing); toolbar (search 260px, stage chips with counts, list/board toggle, Export button); bulk bar (tint bg + border); table 8 cols (`40px minmax(210px,1.35fr) minmax(190px,1.15fr) 150px 170px 92px 92px 124px`, 68px rows → compact 50px: override with `[&_.rw]:min-h-[50px]`? NO — rewrite row classes directly since the block moved); status pills amber/mono; icon buttons via `IconButton`; board columns + cards; `EmptyState` for empty stages.

- [ ] **Step 3: Wire + delete + verify**

Same as Task 4 Step 3 (`npm run lint` + validation tests).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/tabs/LeadsTab.tsx src/components/admin/AdminPanel.tsx
git commit -m "feat(admin): extract and restyle leads tab"
```

---

### Task 6: Lead drawer + purge dialogs + toasts

**Files:**
- Create: `src/components/admin/tabs/LeadDrawer.tsx`
- Modify: `src/components/admin/AdminPanel.tsx` (use dialog/toast primitives)

- [ ] **Step 1: Move the drawer verbatim**

Move `renderLeadDrawer` JSX (definition ~lines 900–954 plus its call site) into `LeadDrawer.tsx` with props for the open lead, setters, and footer actions. Restyle: 420px right drawer, header avatar-lg + name + close, sections (Stage wide-select, Contact rows with copy IconButtons, volume Tag, Notes, follow-up date input, sync-status rows, activity timeline), footer 3 buttons (Retry CAPI ghost, Sync Portal primary, History ghost).

- [ ] **Step 2: Replace `window.confirm` purge flow with `ConfirmDialog`**

In the Settings cache card (added by the previous feature): replace both `window.confirm` calls with `ConfirmDialog` state (`confirmScope: null | 'all' | 'landing'` in AdminPanel, `pending` = existing `purging !== null`). Same copy translated: title `Purge all caches?` / `Purge public cache?`, body artifact `.dlg` text. Toasts keep `showNotification` (restyle the toast container only if it lives in AdminPanel — check; if toasts come from a global 注册, leave markup, note in report).

- [ ] **Step 3: Verify + commit**

`npm run lint` → 0. `npx vitest run tests/validation` → pass.

```bash
git add src/components/admin/tabs/LeadDrawer.tsx src/components/admin/AdminPanel.tsx
git commit -m "feat(admin): lead drawer and purge dialogs in artifact style"
```

---

### Task 7: Rewire AdminPanel to shell (logo fix lands here)

**Files:**
- Modify: `src/components/admin/AdminPanel.tsx` (header/sidebar replace + root classes)

- [ ] **Step 1: Replace header + sidebar with `AdminShell`**

Delete the top header block (~lines 956–999) and sidebar `<aside>` (~1022–1197, incl. DB status card). Wrap the tab `<main>` area in `<AdminShell nav={…} activeTab={activeTab} onTab={…} breadcrumb={…} health={…} user={…} logoUrl={settings?.logoUrl ?? ''} siteName={settings?.siteName || 'EcoMate'} purging={purging} onPurge={…} onSignOut={…} onBackToSite={onClose} />`:
- `nav`: the four existing groups with identical ids/labels/icons/counts (copy the four arrays verbatim into a constant — same order, same badge tones).
- `health`: `{ sql: loadError ? 'down' : 'ok', license: systemHealth?.licensePortalConfigured ? 'connected' : 'standby' }`.
- `user`: `{ name: derived from session? AdminPanel has no session prop — use `settings?.siteName`? NO. Check what AdminPanel knows: it has no email prop. Look at how AdminPanel gets user identity (search `useSession`/`email` in file); if none, pass `user={{ name: 'Admin', email: '', role: 'Platform Admin' }}` from the role prop if present, else hardcode role label `Platform Admin` and name `Admin User` matching artifact copy. Document the choice in the commit message body.
- `onTab`: existing `setActiveTab` + `setIsEditingBlog(false)` combo (extract to a named function, reuse everywhere).
- `onPurge`: existing purgeCache + notification flow, now opening ConfirmDialog (Task 6 state) instead of `window.confirm`.
- Root div: replace `bg-slate-50 dark:bg-[#07080E] ... font-sans` with shell root (shell owns bg/text/font); keep `fixed inset-0 z-50 overflow-hidden`.

This step DELETES the hardcoded `EM` tile (logo fix = `logoUrl` prop wired to `settings.logoUrl`, fallback initials in shell).

- [ ] **Step 2: Verify + commit**

`npm run lint` → 0. Validation tests pass.

```bash
git add src/components/admin/AdminPanel.tsx
git commit -m "feat(admin): rewire studio to AdminShell with public-synced logo"
```

---

### Task 8: Remaining tabs (8 files, token pass)

**Files:**
- Create: `src/components/admin/tabs/{Sections,Content,Pricing,Testimonials,Blog,Media,Integrations,Settings}Tab.tsx`
- Modify: `src/components/admin/AdminPanel.tsx`

Ranges (AdminPanel.tsx, post-Task-4/5/7 numbering will shift — re-derive with `grep -n "activeTab === '"` before cutting; the ORDER below is fixed):
dashboard→done, leads→done, sections (~1545–1623), content (~1624–1926), pricing (~1927–1991), testimonials (~1992–2128), blog (~2129–2369), media (single `<MediaLibrary/>` line — wrap in Card with header, no new file needed), integrations (~2373–2424), settings (~2425–end of form incl. SEO toggle + cache card).

- [ ] **Step 1: Extract each block verbatim** into its tab file with a props interface covering external identifiers (same rules as Task 4). Blog keeps `BlogPostEditor`/`BlogCategoryManager`/`BlogTagManager` children untouched. Settings keeps validation + save + SEO toggle + cache card logic untouched.

- [ ] **Step 2: Token pass only** — replace surfaces/buttons/inputs/tables/forms with token-table classes + `ui.tsx` primitives (`Card`, `GhostButton`, `PrimaryButton`, `IconButton`, `Tag`, `EmptyState`). NO layout invention: keep field order, labels, copy, and handler wiring identical.

- [ ] **Step 3: Wire + delete + verify** — one commit PER tab (8 commits), each: `npm run lint` → 0.

```bash
git add src/components/admin/tabs/<Name>Tab.tsx src/components/admin/AdminPanel.tsx
git commit -m "feat(admin): extract and token-map <name> tab"
```

---

### Task 9: AdminConsole hub token pass

**Files:**
- Modify: `app/admin/AdminConsole.tsx` (classes only)

- [ ] **Step 1: Token pass** — teal accent replaces indigo accents; KPI/launchpad cards to token surfaces (`bg-white dark:bg-[#111118]`, `border-[#e4e7ec] dark:border-[#232331]`, `rounded-[10px]`); header + tabs keep structure/copy/links. No logic touch (metrics fetch, role gating, signOut stay).

- [ ] **Step 2: Verify + commit**

`npm run lint` → 0.

```bash
git add app/admin/AdminConsole.tsx
git commit -m "feat(admin): hub page token pass"
```

---

### Task 10: E2E smoke + screenshots

**Files:**
- Create: `e2e/admin-redesign.spec.ts`

- [ ] **Step 1: Write the spec** (mirror `e2e/admin.spec.ts:34-48` login + skip idiom; no creds → skip with reason):

```ts
import { expect, test } from '@playwright/test';

test.describe('admin redesign smoke', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.E2E_ADMIN_EMAIL ?? '';
    const password = process.env.E2E_ADMIN_PASSWORD ?? '';
    test.skip(email === '' || password === '', 'no E2E admin credentials');
    await page.goto('/admin/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/^password/i).fill(password);
    const code = process.env.E2E_ADMIN_TOTP ?? '';
    if (code !== '') await page.getByLabel(/authenticator/i).fill(code);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('/admin', { timeout: 15_000 });
  });

  test('studio shell renders nav, widget, topbar', async ({ page }) => {
    await page.goto('/admin/cms?tab=dashboard');
    await expect(page.getByText('Dashboard Overview').first()).toBeVisible();
    await expect(page.getByText('Systems').first()).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-dashboard.png' });
  });

  test('theme toggle flips the document class', async ({ page }) => {
    await page.goto('/admin/cms?tab=dashboard');
    const toggled = await page.evaluate(() => {
      const before = document.documentElement.classList.contains('dark');
      return before;
    });
    await page.getByTitle(/toggle light/i).click();
    const after = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(after).toBe(!toggled);
  });

  test('purge buttons open confirm dialogs', async ({ page }) => {
    await page.goto('/admin/cms?tab=settings');
    await page.getByRole('button', { name: /purge all cache/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: 'test-results/admin-purge-dialog.png' });
  });

  test('lead drawer opens from dashboard', async ({ page }) => {
    await page.goto('/admin/cms?tab=leads');
    await page.screenshot({ path: 'test-results/admin-leads.png' });
  });
});
```

(Title/label selectors must match implemented copy — adjust names to the built UI, never weaken to `first()`-only matches without a visible assertion.)

- [ ] **Step 2: Run** `npx playwright test e2e/admin-redesign.spec.ts` → pass or honest skip (no creds). Screenshots eyeballed vs artifact by the reviewer.

- [ ] **Step 3: Commit**

```bash
git add e2e/admin-redesign.spec.ts
git commit -m "test(admin): redesign smoke + screenshots"
```

---

### Task 11: Final verification (AGENTS.md gate)

- [ ] **Step 1:** `npm run lint` → exit 0.
- [ ] **Step 2:** `npm test` → 0 failures (report counts; DB-guard skips acceptable).
- [ ] **Step 3:** `NODE_OPTIONS="--max-old-space-size=2048" npm run build` solo → success, 58/58 pages (count may grow — report actual).
- [ ] **Step 4:** `ls -la .open-next/worker.js` → exists, non-zero.
- [ ] **Step 5:** `git status --short` clean; migration untouched (no schema change in this feature — if any task touched `db/` or `drizzle/`, flag it as a scope violation in the report).

---

## Self-review

1. **Spec coverage:** §4 shell→Tasks 3+7; §5 dashboard→Task 4; §6 leads/drawer/dialogs→Tasks 5+6; §7 logo→Tasks 3+7; §8 remaining+split→Task 8; §9 testing→Tasks 10+11; §10 rollout single PR→branch workflow. Geist→Task 1. No gaps.
2. **Placeholder scan:** theme user-identity step names the fallback + requires documenting the choice; tab ranges carry a re-derive instruction because Tasks 4–7 shift numbering (order fixed, grep command given). No TBD/TODO/bare "handle edge cases".
3. **Type consistency:** `AdminShellProps` field names (`purging`, `onPurge`, `logoUrl`) match Task 6/7 usage; `AdminTab` imported from `./AdminPanel` (export exists, line 64); `Lead['status']` matches `src/types/api.ts`; `font-admin` utilities generated by Task 1's `@theme` edit.
