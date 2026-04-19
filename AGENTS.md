# AI Task Board

Instructions and coordination for AI agents in this repository.
**Read `README_AGENTS.md` first. Claim your working scope in `LOCKS.md` before editing files.**

## Working Rules
- Update tasks' state, major changes and blockers to this file
- Read `README_IF_YOU_IS_LLM.md` before any backend commands.
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

## Blockers
_(none)_

## Recent Changes
- 2026-04-17: Fixed production 500 on contest like/vote flows when `submission_votes` table is missing: added runtime self-healing in public vote APIs to auto-create `submission_votes` and retry query/insert, plus regression test for missing-table recovery path.
- 2026-04-17: Hardened contest voting for submissions: introduced DB-backed `submission_votes` with unique `(submission_id, user_id)` enforcement, updated public vote API to block duplicate votes per account with conflict response, added endpoint to fetch current user's voted submissions, and updated Nhái Bén UI to disable already-voted items.
- 2026-04-17: Updated public navbar subject dropdowns (desktop + mobile) to include direct links to each subject landing page (`/phanmon/{slug}`), so users can access pages like `/phanmon/van` without going through content-type routes.
- 2026-04-16: Refactored frontend AI action engine to tool-first resolution (removed fragile hardcoded intent regex branches for element/topic routing); `search_content` now uses generic local element index + website content index + sitemap fallback so model tool-calls drive behavior while client focuses on deterministic open/scroll/highlight execution.