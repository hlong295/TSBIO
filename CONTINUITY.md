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
- Baseline source received from user for this task: `TSBIO_SRC_20260211_v64_B1_PRODUCT_MEDIA_BIND_FIX.zip`.

## Done:
- Admin/media upload works (library + delete).
- Product media APIs exist.
- FIX (v66): Product form upload & library picker fixes
  - Fix tmp-upload response parsing (API returns `{ item: { path, url } }`) so progress + success now works.
  - Make file picker reliable by using an invisible `<input>` overlay inside the button (no programmatic `.click()` dependency).
  - "Chọn từ thư viện" now opens an **inline media library dialog** (not navigating to /admin/media) and can pick images/video.
  - Show thumbnails/URLs inside the existing Media box so admin can see what was uploaded/selected.

- FIX (v68): Video upload on Product Create via signed upload (avoid body-size limits)
  - Add API `POST /api/admin/media/tmp-sign-upload` to create signed upload URLs for TEMP paths under `tmp/{userId}/video/...`.
  - Update `components/admin/product-media-draft.tsx` to upload videos using signed URL (XHR PUT) with progress.
  - Keeps tmp-path semantics so existing commit step still moves tmp -> `products/{id}/...`.

## Now:
- Verify B1 on user env:
  - Upload image from device: progress + thumbnail OK
  - Upload video from device: signed upload to Storage (avoid host body-limit); should finish without JSON parse error
  - "Chọn từ thư viện" dialog: list + select OK; selected items show in Media box
  - Save commits into `products.media` via commit API

## Next:
- Continue B1 remaining items if needed (more validation UX, orphan cleanup script).
- Then move to B2 Combo Engine.

## Open questions (UNCONFIRMED if needed):
- Storage policies for bucket `media`: is it public for all reads (intended), or do you require signed URLs later?

## Working set (files/ids/commands):
- Admin create product: `app/admin/products/new/page.tsx`
- Product media draft UI: `components/admin/product-media-draft.tsx`
- Tmp upload API: `app/api/admin/media/tmp-upload/route.ts`
- Tmp signed upload API (video): `app/api/admin/media/tmp-sign-upload/route.ts`
- Product media commit API: `app/api/admin/products/[id]/media/commit/route.ts`
- Product media API (upload/remove): `app/api/admin/products/[id]/media/route.ts`
