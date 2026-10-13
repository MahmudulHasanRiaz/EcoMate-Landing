# Design: Admin UI redesign (artifact-faithful) + logo fix

Date: 2026-10-13
Status: approved (brainstorming), awaiting implementation plan
Source artifact: `Dashboard-html (1)/Main.dc.html` (REFERENCE MOCKUP — values replicated, never copied wholesale)
Scope: presentation layer only. Zero logic/API/data changes.

## 1. Problem

1. Admin UI (`src/components/admin/AdminPanel.tsx`, 2708 lines, single file) looks dated vs the approved artifact: flat indigo/slate styling, no explicit light mode, DB status card squatting in the sidebar, no user widget, lead CRM dense-but-unstructured.
2. Brand tile hardcodes `EM` on an indigo-purple gradient (`AdminPanel.tsx:961-963`) while the public site serves `site_settings.logo_url` (`Chrome.tsx:88-100`) with a built-in-mark fallback. Same platform, two identities.

## 2. Goals / non-goals

Goals:
- G1: Artifact fidelity for everything the artifact covers (shell, dashboard tab, leads tab, dialogs, toasts, user widget, status placement).
- G2: Remaining tabs (blog, media, landing sections, bilingual strings, pricing, testimonials, case studies, settings, users, operators, integrations, license queue) adjusted into the same token system — no orphan styling.
- G3: Admin brand tile calls the same logo the public site calls.
- G4: Explicit light/dark toggle, dark default preserved.
- G5: All existing handlers, queries, validation, and auth flows keep working byte-for-byte.

Non-goals:
- No new features, no new API routes, no schema/seed changes.
- No public-site visual changes (teal remap is admin-scope only).
- No `AdminPanel.tsx` logic refactor beyond the file split required to style per-tab components.

## 3. Approach (A: token-map + restyle in place)

Artifact CSS vars map to Tailwind `dark:` pairs (existing class-dark strategy kept):
- Accent teal: light `#0f766e` / dark `#2dd4bf` (replaces admin indigo; public untouched).
- Surfaces: light `#ffffff`/`#f5f6f8` / dark `#111118`/`#0a0a0f` (replaces `#090B14` family consistently).
- Radii 6–10px, 13–13.5px UI text, 26px H1, 28px KPI numerals, Geist + Geist Mono via `next/font` in `app/admin/layout.tsx`.
- Density: dashboard comfortable, leads compact (50px rows, 30px buttons, 12.5px meta) per artifact `#vw-leads` overrides.

## 4. Section 1 — Shell (`AdminShell.tsx`, new)

- Grid: 252px sticky sidebar + 1fr; topbar 56px sticky blur; content `max-width: 1180px`, 36px/32px/56px padding stack (`.app/.sb/.tb/.ct` values).
- Sidebar: brand block (34px tile → §7 logo rule; name + `PostgreSQL & Content Engine` sub kept); grouped nav (existing group labels, tab ids, icons, count badges, order — unchanged); active item tinted bg + 2px left bar + accent icon; bottom user widget REPLACES the DB status card (avatar initials, name, role; popup: Account & profile, Notifications, Back to Public Site, Sign out — all wired to existing actions; DB status moves to the Systems dropdown).
- Topbar: breadcrumb (`Operations / <Tab>`), env chip (`Self-Contained CMS & DB` kept); purge-all button + purge-public icon button wired to existing `purgeCache('all'|'landing')` + pending-state guard, confirm dialogs restyled to artifact `.dlg` look (same confirm-then-toast flow, no behavior change); theme toggle flips the document class + persists to localStorage (dark default preserved — same default the theme-init script applies); Systems dropdown shows existing health values (SQL repo, license portal).
- Responsive: <900px sidebar becomes off-canvas with overlay + hamburger (artifact `#nv` behavior); topbar wraps; purge label collapses to icon.

## 5. Section 2 — Dashboard tab (`DashboardTab.tsx`, extracted)

Artifact `vw-dash` 1:1: H1 `Operations & Marketing Hub` + existing sub copy; 5-KPI strip (existing 4 stats + overdue count promoted to 5th cell from the same `leads` array — no new fetch); recent-leads list (avatar initials, name, phone, volume tag, inline status select → existing status handler); right rail: content-health progress bars (existing section/testimonial/blog counts) + quick-actions list (existing tab-switch actions). Overdue worklist link kept.

## 6. Section 3 — Leads tab (`LeadsTab.tsx`, extracted)

Compact density verbatim: 4-KPI summary (same derivations), toolbar (search input, stage filter chips with counts, list/board toggle, Export CSV — all existing state), bulk-action bar (existing selection state), 8-column table (checkbox, lead/company, phone/email, volume, stage select, portal pill, CAPI pill, icon actions — existing handlers), board view (6 stage columns from existing status list), detail drawer (avatar header, stage select, contact rows with copy buttons, volume, notes, follow-up date, sync-status rows, activity timeline, footer Retry CAPI / Sync Portal / History — existing handlers), empty-state copy kept. Statuses also surface as header-adjacent chips per artifact; the per-row select remains the editor.

## 7. Logo rule (single source with public)

Admin brand tile: if `settings.logoUrl` (already in AdminPanel state) is non-empty → `<img src>` (same value `Chrome.tsx` renders); else built-in EcoMate mark on the teal tile (same fallback shape as public, initials derived from `siteName`). The `EM` hardcode and indigo-purple gradient are deleted. No new fetch — `settings` is already loaded by `loadData()`.

## 8. Section 4 — Remaining tabs + file split

Each remaining tab keeps its component logic and gets shell tokens only (`.cd` cards, `.tbr` toolbars, `.th/.rw` tables, `.bt/.ib` buttons, `.fi` inputs, `.dlg` dialogs, `.toast` toasts): blog + editors, media library + pickers, landing sections, bilingual strings, pricing, testimonials, case studies, settings form (incl. SEO toggle + cache card from the previous feature — restyled, not rewired), users/operators, integrations/license queue, setup page (structure only, no auth-flow change).
Split: `AdminPanel.tsx` → `AdminShell.tsx` (layout + nav + topbar + widget) + one component per tab with the tab's existing props/state lifted unchanged (state lives where it lives today; components receive values + setters). Shared bits (`FieldError`, status pill, avatar initials, confirm dialog, toast) go to `src/components/admin/ui.tsx`. Import paths update; no handler signatures change.

## 9. Testing

- `npm run lint` clean; `npm test` green (existing suites; new tests only where logic is touched — none expected).
- E2E admin smoke (extend existing admin spec or new `e2e/admin-redesign.spec.ts`): login → every tab renders without error → theme toggle flips class + persists → purge buttons open dialogs → drawer opens/closes. Light + dark screenshots eyeballed against the artifact.
- Manual fidelity pass on preview: sidebar, topbar, dashboard, leads list + board + drawer, dialogs, toasts, one representative remaining tab (settings), logo with and without `logoUrl` set.
- Before commit: `npm run build` once (admin layout font change), `.open-next/worker.js` check.

## 10. Rollout

Single PR to main (user chose all-tabs-at-once over phasing): branch → implement per-tab with per-commit slices → preview verify light/dark → merge. If preview review finds fidelity gaps, fix-forward on the branch (no partial merge — mixed old/new admin chrome is the failure mode phasing would have caused).
