# AI Task Board

This file is a live instruction/reminder for AI bots working in this repository.
Update it at the start and end of each major task. Use concise, informative words.
Remember to cleanup unnecessary logs and tasks after complete.

## Current Focus
- Redesign CMS system to production-grade:
  - Complete admin modules for Publications, Events, Stories, and Nhân vật
  - Stabilize frontend service layer for API/auth/error handling
  - Ensure all content pages are manageable from CMS
- Complete public reading flow:
  - Mở trang đọc chi tiết cho Publications (toàn văn)
  - Mở trang đọc chi tiết cho Stories truyền cảm hứng
  - Liên kết đầy đủ từ các danh sách/card liên quan

## Working Rules For Bots
- Read `README_IF_YOU_IS_LLM.md` before backend commands.
- Do not break existing routes and admin flow.
- Prefer small, reversible edits.
- Validate changed features with a quick run/test when possible.
- If blocked by environment, log the blocker under `Blockers`.

## Task Status
- [x] Site rename and slogan update
- [x] Navbar redesign and icon polish
- [x] Admin credential login verification
- [x] Events page calendar table
- [x] Auth route migration to `/login`
- [x] Register/Profile/Password features
- [x] Email verification flow
- [x] Production CMS route/service hardening
- [ ] Complete admin content modules end-to-end

## Next Steps
1. Add richer validation and toast-based error handling for CMS forms.
2. Add pagination/filter/search for admin lists (Publications, Events, Stories).
3. Optimize frontend chunk splitting for production bundle size.

## Blockers
- None currently.

## Update Log
- 2026-04-14: Created `AGENTS.md` and set current focus to Nhân vật pages.
- 2026-04-14: Started implementing calendar table for `/events/upcoming`.
- 2026-04-14: Completed calendar table view on `/events/upcoming` with day selection and event highlighting.
- 2026-04-14: Started auth route migration and user account feature implementation.
- 2026-04-14: Completed `/login` migration with register/profile/password and email verification flow.
- 2026-04-14: Started full user-auth hardening with OTP verification, SMTP/recaptcha integration, and frontend UX refresh.
- 2026-04-14: Started CMS production-grade hardening and full content-module completion.
- 2026-04-14: Added centralized frontend `apiClient` + `cmsService`, refactored Admin CMS modules (Dashboard/Publications/Events/Stories/Nhân vật) to shared services, and validated frontend production build.
- 2026-04-14: Started auth UI Vietnamese-diacritics pass and login loading-state hotfix.
- 2026-04-14: Completed auth backend hotfix by cleaning duplicated `auth.py` content, restored OTP/recaptcha/unsubscribe flow integrity, and revalidated with backend tests + frontend build.
- 2026-04-14: Completed auth UI Vietnamese-diacritics pass, added reCAPTCHA timeout fail-safe in login/register/verify flows, fixed DB init migration indentation issue, and revalidated login API (HTTP 200) + frontend build.
- 2026-04-14: Grouped Admin CMS navigation into `/admin/cms` dropdown (Stories/Nhân vật/Submissions), added backend endpoint `/api/admin/events/upcoming` for upcoming event management, and upgraded Publications CMS with a visual section designer for richer post layout/image composition.
- 2026-04-14: Completed Cloudflare Tunnel readiness hardening: configurable CORS/trusted hosts/forwarded headers on backend, frontend WS base URL override, and added tunnel config example for HTTPS + WSS proxy flow.
- 2026-04-14: Started production-grade Post Designer upgrade (JSON layout metadata + drag-drop block editor + preset templates + responsive preview).
- 2026-04-14: Completed production-grade Post Designer upgrade with publication `layout_metadata` JSON persistence, drag-drop section editor, preset templates (Tin tức/Phóng sự/Vinh danh/Tài liệu), and desktop/mobile preview in CMS.
- 2026-04-14: Rolled out SweetAlert2 for global toast/dialog UX, replaced all native alert/confirm usages across current pages, and revalidated frontend production build.
- 2026-04-14: Moved Post Designer to dedicated routes (`/admin/publications/new`, `/admin/publications/:publicationId/edit`), integrated `@dnd-kit` for specialized drag-drop sorting, added grid-merge controls (col/row span), and introduced per-block animation/hover effect customization.
- 2026-04-14: Started public full-reading flow completion for posts and inspiring stories.
- 2026-04-14: Completed public full-reading flow with new detail pages for publications and inspiring stories, added public story-by-id endpoint, and linked cards/lists (Home/Subject Hub/Honors/Stories) to detail routes.
- 2026-04-14: Fixed header navigation wrapping and restored visible login/register/profile actions across breakpoints, added full favicon + Apple touch icon + manifest tags from `frontend/public`, and revalidated frontend production build.
- 2026-04-14: Started full frontend visual redesign pass (new design system, rebuilt main nav desktop/mobile, and admin shell polish).
- 2026-04-14: Completed full frontend visual redesign baseline: refreshed global design tokens/typography/background, rebuilt public nav for desktop/mobile, polished admin shell responsiveness, and validated frontend production build.
- 2026-04-14: Started frontend optimization phase 2 (route lazy-loading/code-splitting + CKEditor rollout for admin long-form fields).
dung- 2026-04-14: Completed frontend optimization phase 2 with route lazy-loading/code-splitting, shared RichTextEditor component rollout across admin long-form fields (Stories/Events/Nhân vật/Post Designer), and public HTML render compatibility updates for stories/events/publication detail pages.
- 2026-04-14: Completed public-page design consistency QA pass by normalizing HTML excerpt rendering on Home/Subject Hub/Honors and revalidating frontend production build.
- 2026-04-14: Completed story-as-post CMS unification in `/admin/publications` (merged list + shared editor routing), added admin story-by-id fetch + `stories.layout_metadata` persistence, and fixed public row/column span rendering parity for publication and story detail pages.
- 2026-04-14: Started brand-focused nav and Home hero refresh to ensure visible logo/icon, persistent slogan, and stronger “Tổ xã hội” identity.
- 2026-04-14: Completed brand-focused nav + Home hero refresh with always-visible “Tổ xã hội” identity, favicon-based icon usage in header/footer/mobile menu, and persistent slogan “Deep learning with love” tied to FPT Education school-year context.
- 2026-04-14: Started Aceternity-inspired UI unification pass for public web (shared effects/components + nav/home refresh).
- 2026-04-14: Completed Aceternity-inspired UI unification baseline with reusable effects components (Spotlight/GridBackground/TextGenerate/ShimmerButton) and rollout on main nav + Home hero while preserving existing routing/auth/CMS flows.
- 2026-04-14: Started production-grade Hybrid CMS Editor framework task (spec-first architecture + modular skeleton under `frontend/src/cms-editor`).
- 2026-04-14: Completed Hybrid CMS Editor baseline with core model/schema/registry/validation/versioning, editor interaction scaffolding (state/history/autosave/commands/inspector), renderer parity skeleton, and admin playground route `/admin/cms-editor`; frontend build revalidated.
- 2026-04-14: Started frontend hotfix for WebSocket notification connection fallback handling and Inter font normalization for Vietnamese rendering.
- 2026-04-14: Started nested drag-drop enhancement for Hybrid CMS Editor canvas with parent/child move support and cycle-safe constraints.
- 2026-04-14: Completed nested drag-drop enhancement for Hybrid CMS Editor: recursive drop zones across root/children, reducer-level anti-cycle guard, and move index normalization; frontend build revalidated.
- 2026-04-14: Completed frontend hotfix for WebSocket notification fallback (only connect when WS config/local env, exponential reconnect) and switched global typography to Inter for stable Vietnamese rendering.
- 2026-04-14: Started Home hero visual polish pass to reduce clutter, improve hierarchy, and strengthen brand messaging clarity.
- 2026-04-14: Completed Home hero visual polish with cleaner layout composition, refreshed CTA emphasis, new stats row, and frontend production build revalidation.
- 2026-04-14: Started table-canvas interaction upgrade (cell selection + merge/split + column resize) and Post Designer table-block integration.
- 2026-04-14: Completed table-canvas interaction upgrade with shared `TableCanvasEditor/TableReadonlyView`, integrated into Hybrid CMS table block and Post Designer (`+ Table` block), with public detail rendering parity for table blocks.
- 2026-04-14: Started CMS-editor local UX redesign toward WordPress-like block layout editing (inline block editing, grid-based sizing, click-to-inspect workflow).
- 2026-04-14: Completed CMS-editor local UX redesign with WordPress-like inline block editing, dedicated link/document/iframe blocks, direct grid span controls (merge/split/resize), and click-to-inspect property flow.
- 2026-04-14: Started minimalist CMS-editor pass: remove verbose block UI/buttons on canvas, move block content editing fully to right panel, and keep preview directly in grid canvas.
- 2026-04-14: Completed minimalist CMS-editor pass with preview-only canvas blocks (no inline action buttons), right-panel content editing by block type, and removal of separate right-panel preview.
- 2026-04-14: Started CMS-editor block capability clarity pass (add delete action in inspector, and convert generic text-based blocks to type-specific behavior/forms).
- 2026-04-14: Completed CMS-editor block capability clarity pass with delete action in inspector and type-specific forms/preview behavior for list/grid/related-posts/toc/columns/section/sidebar.
- 2026-04-14: Started CMS-editor drag-drop rebuild pass to replace overlapping drop handlers with explicit drop slots (before/right/inside).
- 2026-04-14: Completed CMS-editor drag-drop rebuild with explicit drop slots for before/right/inside placements and stabilized child-list insertion behavior.
- 2026-04-14: Added explicit drop-slot labels (Before/After/Right/Inside), widened right-drop target for same-row placement, and enabled `Del` shortcut to remove selected block outside input fields.
- 2026-04-14: Started hotfix for CMS-editor `Right` drop crash caused by `walkBlocks` accessing removed array indices during reducer traversal.
- 2026-04-14: Completed hotfix for CMS-editor `Right` drop crash by hardening `walkBlocks` against in-loop mutations (`splice`/replace), preventing `next[i]` undefined runtime errors.
- 2026-04-14: Started deep-dive hotfix for `Right` drop no-op behavior (drop accepted but blocks not aligning side-by-side).
- 2026-04-14: Completed `Right` drop behavior upgrade: when needed, auto-adjust target/source `colSpan` before move to prioritize same-row right placement in 12-column canvas.
- 2026-04-14: Added `dataTransfer` fallback (`text/plain`) for CMS-editor drag source IDs to prevent silent drop no-op on browsers that ignore custom MIME types.
- 2026-04-14: Started CMS-editor same-row drag/drop reliability pass by reworking canvas placement constraints and evaluating grid-layout library fallback options.
- 2026-04-14: Completed same-row drag/drop reliability hotfix by removing canvas row-lock constraints that blocked upward reflow; validated with frontend production build and documented library-vs-legacy editor migration options.
- 2026-04-14: Started full migration to replace legacy Post Designer editor/render pipeline with the new CMS Editor document model.
- 2026-04-14: Completed Post Designer/render migration to CMS Editor document model with legacy metadata compatibility conversion and public renderer unification.
- 2026-04-14: Started hotfix batch for production runtime errors (CKEditor v42 compatibility + missing lazy route module), plus Home hero and navigation dropdown redesign polish.