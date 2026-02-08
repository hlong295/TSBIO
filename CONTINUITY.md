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
- Baseline source loaded: `TSBIO_SRC_20260208_v27_A1_bannerAdmin_fix19.zip`.
- Working branch output (this change): **v27_fix20 (Phase B1 flags + WYSIWYG)**.

## Done:
- Phase A + Admin Core v1 (per prior baseline): Auth/Identity/Wallet/Ledger/Admin modules.
- Phase B scaffolding exists: /admin/products, /admin/categories, /admin/providers; /admin/content/news, /admin/content/rescue; /admin/media.

## Now:
- Implement B1 upgrade:
  - Add product flags in admin create/edit and API payloads.
  - Replace product description textarea with Tiptap WYSIWYG (paste Word/Docs ok).
  - Sanitize HTML on server before writing to `products.description`.
  - Add DB safe migration script for flag columns.

## Next:
- C3 Media limits (10 images + 1 video) with UI + API guard.
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