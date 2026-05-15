# AI Task Board

Instructions and coordination for AI agents in this repository.
**Read `README_AGENTS.md` first. Claim your working scope in `LOCKS.md` before editing files.**

## Working Rules
- Update tasks' state, major changes and blockers to this file
- Read `README_AGENTS.md` before any backend commands.
- **Claim your file/area scope in `LOCKS.md` before starting work. Release when done.**
- If a lock conflict exists, pick a non-overlapping sub-task or wait.
- Do not break existing routes, auth, or admin flows.
- Prefer small, reversible edits; validate with `npm run build` in `frontend/` after frontend changes.
- Add blockers to `## Blockers` below rather than silently failing.

## Current State
Core site is production-stable as of 2026-04-14:
- **Auth**: login / register / profile / email-verify / password-change
- **CMS**: Publications, Events, Stories, Nhân vật, Submissions — all CRUD wired
- **Public pages**: all reading flows linked and styled
- **CMS Editor**: Hybrid block editor — drag/drop, history, autosave, `showDocumentTitle` prop

## Active Tasks

- 2026-04-25: Event CMS refactor (recurrence, attachments, calendar UI) — in-progress by `ag-ev1`. See `backend/app/models/publication.py`, `backend/app/api/admin.py`, `backend/app/schemas/schemas.py`, `frontend/src/pages/Admin/Events.jsx`, `frontend/src/components/Admin/CalendarView.jsx`, `frontend/src/components/Admin/SeriesEditor.jsx`.

## Blockers
_(none)_

## Recent Changes
 - 2026-05-07: Adjusted public frontend AI chat behavior in `MainLayout` to auto-mount and auto-open the AI chat widget on initial website load, while preserving persisted-open restoration and manual launcher flow.
 - 2026-05-06: Added flexible Contest system (`/cuoc-thi`) supporting unlimited custom contest types per subject with configurable rules, voting methods, submission limits, file upload, judging criteria, prizes, and per-contest settings. Backend: `Contest` model in `publication.py`, admin CRUD endpoints (`/admin/contests`), public endpoints (`/public/contests/{slug}/submissions`), `Submission.contest_id` FK. Frontend: `AdminContests` page, `ContestListPage`, `ContestDetailPage` with tabs (submissions/submit/rules), navbar top-level "Cuộc thi" link, admin sidebar entry. Runtime schema auto-migration for `contests` table and `submissions.contest_id` column.
 - 2026-05-06: Fixed admin comment deletion 500 for parent comments with multiple replies by hardening `/api/admin/comments/{comment_id}` to delete full descendant trees and clear dependent `comment_reactions`/`comment_mentions` rows before deleting comments, avoiding FK violations on legacy schemas.
 - 2026-05-06: Fixed backend admin/API 500s caused by legacy MySQL schema missing `submissions.rejection_reason`; added runtime schema compatibility auto-migration in `backend/app/db/session.py` and legacy bootstrap upgrade in `backend/app/db/init_db.py` to auto-add the column when absent.
 - 2026-05-05: Improved desktop public navbar dropdown usability in `MainLayout` by adding a delayed close grace window on mouse/blur leave (300ms with cancel-on-reenter), so brief trigger hovers still allow users to move into dropdown buttons without premature fade-out. Frontend build validation passed.
 - 2026-05-05: Tightened public post detail vertical rhythm by reducing bottom page padding specifically for `/posts/:id` (`page-shell-post-detail` override), and hardened backend AI short-description generation against Ollama cold-start timeouts by increasing default read timeout (`35s`) and attaching configurable `keep_alive` (`AI_SHORTDESC_KEEP_ALIVE`, default `20m`).
 - 2026-05-05: Navbar Chuyên môn was compacted in public `MainLayout`: top-level dropdown now focuses on subject groups only and each subject renders exactly 4 direct links (`an-pham`, `tai-lieu`, `vinh-danh`, `cuoc-thi`) while preserving existing route wiring; mobile menu mirrors the same structure.
 - 2026-05-05: Step-2 dependency split executed for production startup path: removed global `GoogleOAuthProvider` wrapper from app entry (`main.jsx`) and scoped OAuth provider to `Login`/`Register` route chunks, plus lazy-mounted `MediaLibraryModal` only when opened from `MediaLibraryProvider`; this moved heavy auth/admin dependencies off the initial public runtime path and reduced the primary app entry chunk from ~1.25MB to ~174KB (gzip ~333KB to ~54KB) in current build output.
 - 2026-05-05: Production performance optimization pass applied across startup/runtime/network: deferred AOS and Firebase analytics loading to idle/on-demand, lazy-loaded `AdminPostDesigner` and `NotificationPermissionPrompt`, moved push-notification Firebase messaging usage behind dynamic imports in notifications context/utilities, removed render-blocking Google Fonts requests from `index.html`, added `firebase`/`aos` manual chunks in Vite, and enabled FastAPI `GZipMiddleware` (`minimum_size=1024`, `compresslevel=5`). Frontend production build remains green.
 - 2026-05-05: Increased navigation intent flexibility for ambiguous chat requests in frontend `actionEngine`: added composite content-candidate scoring (query-title relevance, detail-route/entity boosts, year-token consistency, and hub-route penalties) to avoid false opens like `/doingu/staff` for title-based article queries; added early form-intent route-hint preference for tabbed routes (e.g. `/phanmon/van?tab=sang-tac`) so author-name input focus resolves on first turn.
 - 2026-05-05: Phase 1 mobile performance quick wins completed for public frontend stability on low-end/iPhone devices: staff cards now defer image loading by viewport proximity and reduce heavy motion/compositing; main layout enables low-spec visual fallback and reduces mobile menu blur cost; home hero background rendering was simplified to lower memory pressure. Frontend build validation passed.
 - 2026-05-05: Production performance pass (skip phased rollout) applied on public flow: removed `framer-motion` route/page runtime from `App` wrapper and public pages (`StoriesInspiring`, `EventsUpcoming`, `GioiThieuDoiNgu`) and replaced with lightweight CSS keyframe entry effects to reduce runtime observer overhead and initial JS pressure. Frontend build validation passed.
 - 2026-05-05: Continued production optimization: refactored `MainLayout` to remove `framer-motion` usage in header/menu/back-to-top flows and lazy-mounted `AiChatWidget` (with fallback launcher) so markdown/katex-heavy chat code is deferred until needed; added explicit `recharts` manual chunk in Vite. Build remains green; main bundle dropped from earlier ~1.70MB to ~1.57MB (gzip ~460KB to ~416KB).
 - 2026-05-05: Admin Panel reliability and performance audit: eliminated redundant API calls in `PostDesigner.jsx` submission logic; added CSV export to Admin Users and Submissions pages for data portability; corrected misleading dashboard chart labels to match backend metrics; refactored AI knowledge base synchronization into background threads to prevent UI blocking during content creation; standardized 409 Conflict responses for all engagement actions (votes/favorites) with synchronized state reconciliation in the frontend.
 - 2026-05-05: Stabilized Frontend UI and module loading: resolved z-index layering conflicts between Navbar/Dropdowns and Home Hero section (elevated to z-[4000+]); hardened React instance consistency in `vite.config.js` and standardized React imports in notification contexts to prevent `Invalid hook call` errors; fixed missing `apiClient` imports across multiple public pages; and resolved a critical `SyntaxError` in `main.jsx` by refactoring webpush debug helpers to dynamic imports and removing redundant render calls.