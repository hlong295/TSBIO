# Continuity Ledger (TSBIO)

## Goal (incl. success criteria):
- Follow checklist 1.checklisttrienkhaiv3.docx.
- Phase 0 — Baseline Lock:
  - Backup DB
  - Snapshot schema
  - Lock root 2 identity (email locked + pi placeholder pending)
  - Lock namespace (username rules)
  - Zip source baseline
  - Output a new baseline version (v3)

## Constraints/Assumptions:
- Do not change approved UI/layout/UX flows.
- Do not break Pi login; Pi login remains beta/pending SDK.
- Token/wallet/ledger operations must go through server APIs.
- Username namespace:
  - Email username: hlong295
  - Pi username: pi_hlong295
  - Case-insensitive (normalized lowercase).

## Key decisions:
- Use Supabase Auth for Email flow.
- Add server APIs using service role for provisioning profiles/identities/tsb_wallets.
- Client Supabase (anon) is used only for auth (signUp/signIn/reset/update password).

## State:
- Baseline code input: TSBIO_BASELINED_SRC_2026_02_07_v2.zip

## Done:
- Baseline folder structure exists: /baselines/source, /baselines/database, /baselines/logs
- Added scripts for Phase 0 baseline lock:
  - scripts/db/backup_db.sh
  - scripts/db/snapshot_schema.sh
  - scripts/zip_source_baseline.sh
- Updated BASELINE.md + Stage0 README + changelog
- Added /dang-ky, /quen-mat-khau, /cap-nhat-mat-khau pages (fix 404 on /dang-ky).
- Added API routes:
  - /api/auth/resolve-email (username -> email)
  - /api/auth/ensure-profile (post-login provisioning)
  - /api/auth/me (profile+wallet)
  - /api/auth/provision-signup (avoid orphans when email verification enabled)
- Updated auth-context to support EmailUser in parallel with PiUser.
- Updated tai-khoan dashboard to work with email user and show TSB wallet.

## Update (2026-02-06):
- Fix header overlap on auth pages by offsetting main content (AppHeader is fixed h-14).
- Remove specific example placeholders (hlong295/dowithpi@gmail.com) from register UI, use generic examples.
- Fix "No API key found in request" during email signup by providing runtime-injected public Supabase config:
  - app/layout.tsx injects window.__TSBIO_PUBLIC_ENV__ (Supabase URL + ANON key) beforeInteractive.
  - lib/supabase/client.ts falls back to window.__TSBIO_PUBLIC_ENV__ when NEXT_PUBLIC_* are not inlined.

## Now:
- Export a new source zip baseline v3 (deliverable to user).

## Next:
- Phase A (Core + Admin Core) per checklist.

## Open questions (UNCONFIRMED if needed):
- Root admin email account does not exist in auth.users yet on your DB (confirmed by your query).
- Whether Supabase email confirmation is enabled and redirect URL configured.

## Working set (files/ids/commands):
- Source: TSBIO_BASELINED_SRC_2026_02_07_v2.zip
- Output: TSBIO_BASELINED_SRC_2026_02_07_v3.zip
- Docs: db/stage0/docs/README_STAGE0.md
- Scripts: scripts/db/backup_db.sh, scripts/db/snapshot_schema.sh, scripts/zip_source_baseline.sh