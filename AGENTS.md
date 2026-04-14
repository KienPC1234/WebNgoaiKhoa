# AI Task Board

This file is a live instruction/reminder for AI bots working in this repository.
Update it at the start and end of each major task.

## Current Focus
- Redesign CMS system to production-grade:
  - Complete admin modules for Publications, Events, Stories, and Nhân vật
  - Stabilize frontend service layer for API/auth/error handling
  - Ensure all content pages are manageable from CMS
- Hotfix auth UX:
  - Việt hoá UI có dấu cho luồng tài khoản
  - Sửa trạng thái kẹt nút "Đang đăng nhập..." và ổn định gọi API login
- Upgrade Post Designer to production-grade:
  - Lưu metadata layout dạng JSON riêng
  - Tích hợp block editor kéo-thả cho bố cục bài viết
  - Thêm preset template và preview responsive desktop/mobile

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
- [x] Base page: `nhanvat/scale`
- [x] Base page: `nhanvat/staff`
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
- 2026-04-14: Fixed header navigation wrapping and restored visible login/register/profile actions across breakpoints, added full favicon + Apple touch icon + manifest tags from `frontend/public`, and revalidated frontend production build.
