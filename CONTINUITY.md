# Continuity Ledger (TSBIO)

## Goal (incl. success criteria):
- Follow **Hiến pháp kỹ thuật TSBIO V5 (FINAL LOCK)** and **Checklist V5**.
- Current target: **PHASE B → B1 Product + Media**
  - Upload media and **bind to product** (products.media jsonb[])
  - Enforce **≤10 images + ≤1 video**
  - Normalize **sort + primary** (first image is_primary; sequential display_order)
  - Validate file types + size
  - Cleanup: delete product media removes storage object
  - CDN-friendly storage settings (public bucket, long cacheControl)

## Constraints/Assumptions:
- Pixel-lock UI: do not change layout/colors/spacing; only bind data + add logic.
- Do not break auth/login; all guards server-side.
- Do not write DB directly from client.
- Root admin identities:
  - Email: `hlong295` (`dowithpi@gmail.com`) role=root_admin
  - Pi (pending until Pi-SDK stable): `pi_hlong295` (provider=pi) mapped to same profile_id.

## Key decisions:
- Media is stored **only** in `products.media` with paths under `media` bucket:
  - `products/{id}/images/*` and `products/{id}/video/*`
- Realtime upload uses `tmp/` then **commit** to product paths for atomic bind.
- Role compatibility: keep supporting role string `admin` (legacy) alongside V5 roles.

## State:
- Baseline source: `TSBIO_SRC_20260211_v63_MEDIA_DELETE_INP_FIX.zip`.

## Done:
- Admin/media upload works (library + delete).
- Product media APIs exist.

## Now:
- Fix + complete **product media binding** (new product create + commit route):
  - Align media draft state
  - Commit route stores consistent media objects (url, type, path, display_order, is_primary, thumbnail_url)
  - Enforce limits considering existing media
  - Normalize ordering + primary

## Next:
- Continue B1 remaining items if needed (more validation UX, orphan cleanup script).
- Then move to B2 Combo Engine.

## Open questions (UNCONFIRMED if needed):
- Storage policies for bucket `media`: is it public for all reads (intended), or do you require signed URLs later?

## Working set (files/ids/commands):
- Admin create product: `app/admin/products/new/page.tsx`
- Product media draft UI: `components/admin/product-media-draft.tsx`
- Tmp upload API: `app/api/admin/media/tmp-upload/route.ts`
- Product media commit API: `app/api/admin/products/[id]/media/commit/route.ts`
- Product media API (upload/remove): `app/api/admin/products/[id]/media/route.ts`
