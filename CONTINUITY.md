# Continuity Ledger (TSBIO)

## Goal (incl. success criteria):
- Implement **PHASE B — BUSINESS + CMS** starting from baseline `TSBIO_SRC_20260208_v27_A1_bannerAdmin_fix19.zip`.
- DoD per constitution: **no UI break, no auth break, no client direct DB writes, audit logs present, admin-first**.
- Each step outputs: source zip + DB snapshot/migration script + updated BASELINE.md + changelog.md.

## Constraints/Assumptions:
- **Pixel-lock UI**: only bind data / add logic / add API; no layout/style changes.
- **Auth lock**: do not touch login flows unless asked; admin guard stays server-side.
- **DB = source of truth**; Wallet/Token only via APIs; never update balances directly.
- Root admin: email `hlong295` (`dowithpi@gmail.com`) is root_admin; Pi `pi_hlong295` pending; must map same profile_id.

## Key decisions:
- Phase B starts with **B1 Product Management** enhancements required by V27 constitution:
  - product flags (combo/featured/flashsale/verified/archived)
  - WYSIWYG description (Tiptap) with **server-side sanitize**
  - keep soft delete (deleted_at) and stock fields from PhaseB migrations

## State:
- Baseline source loaded: `TSBIO_SRC_20260209_v28_PHASEB1_C3_media_fix21.zip`.
- Working branch output: **v30_fix23 (Save + redirect after create)**.
- Working branch output (this change): **v31_fix24 (Admin session keepalive + onAuthStateChange sync; no reload needed)**.

## Done:
- Phase A + Admin Core v1 (per prior baseline): Auth/Identity/Wallet/Ledger/Admin modules.
- Phase B scaffolding exists: /admin/products, /admin/categories, /admin/providers; /admin/content/news, /admin/content/rescue; /admin/media.
- B1: Product flags + WYSIWYG + server-side sanitize (v27_fix20).
- C3: Product media upload (<=10 images + 1 video) via server API + Storage path convention + audit log (v28_fix21).
- Fix: Admin session desync trên /admin (listen auth state + keepalive refresh) để không bị bật lại thông báo “cần đăng nhập email” khi vẫn đang login (v31_fix24).
- Fix: Admin session không bị “rớt quyền” giả khi chuyển tab trong /admin (token sync + keepalive tick) (v31_fix24).

## Now:
- Fix triệt để lỗi **Admin session**: đang thao tác /admin một lúc thì chuyển tab bị báo “Bạn cần đăng nhập email để dùng Admin.” dù header vẫn đăng nhập.

## Next:
- E1/E2 CMS hardening: draft/publish, SEO, categories (admin-managed).
- G1 Audit filters + restore actions.
- H1 Permission matrix (root/editor/provider/approval) + approval queue.

## Open questions (UNCONFIRMED if needed):
- Has user applied PhaseB SQL v21/v23 SAFE on the current Supabase project? (required for stock/deleted_at fields).
- Supabase Storage bucket `media` exists and public/private policy decided.

## Working set (files/ids/commands):
- Admin product pages: `app/admin/products/new/page.tsx`, `app/admin/products/[id]/page.tsx`
- Admin product APIs: `app/api/admin/products/route.ts`, `app/api/admin/products/[id]/route.ts`
- New components/libs: `components/admin/rich-text-editor.tsx`, `lib/sanitize.ts`
- DB migration: `baselines/database/TSBIO_DB_20260208_v27_phaseB1_products_flags_wysiwyg.sql`
- Product media API: `app/api/admin/products/[id]/media/route.ts`
- Product media UI: `components/admin/product-media.tsx` + hook-in `app/admin/products/[id]/page.tsx`
- DB migration: `baselines/database/TSBIO_DB_20260209_v28_phaseB1_product_media.sql`