# Continuity Ledger (TSBIO)

## Goal (incl. success criteria):
- Follow checklist 1.checklisttrienkhaiv3.docx.
- Complete Phase A (Core + Admin Core):
  - A1 Auth+Identity (root lock, placeholder pi, orphan checker)
  - A2 Wallet+Ledger (server APIs + rollback tool)
  - A3 Admin Core v1 (users/identities/wallets/ledger/audit/rules)
  - Output a new baseline version (v4) with db/stageA SQL + admin module.

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
- Baseline code input: tsbio_adminfix_v5.zip

## Done:
- v5: Admin access button (account) + /admin guard (AdminShell) implemented.
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

## Done:
- v5: Admin access button (account) + /admin guard (AdminShell) implemented.
- Phase A code changes added (Admin Core v1 + server APIs + db/stageA SQL).
- Updated changelog, BASELINE.md, and created DB snapshot file TSBIO_DB_2026_02_07_v4.sql (v3 + stageA SQL scripts).

## Now:
- Fix root admin role bridge so account page can show Admin button reliably.

## Next:
- Re-login root email (or Sign out → Sign in) to let /api/auth/ensure-profile auto-upgrade role to root_admin.
- Verify /tai-khoan shows "Vào trang quản trị" and /admin blocks non-admin.

## Open questions (UNCONFIRMED if needed):
- Root admin email account does not exist in auth.users yet on your DB (confirmed by your query).
- Whether Supabase email confirmation is enabled and redirect URL configured.

## Working set (files/ids/commands):
- Source: TSBIO_BASELINED_SRC_2026_02_07_v2.zip
- Output: TSBIO_SRC_2026_02_07_v4.zip (repo baselines/source)
- Docs: db/stage0/docs/README_STAGE0.md
- DB scripts: db/stageA/sql/A1_2_root_pi_placeholder.sql, db/stageA/sql/A2_1_tsb_apply_tx.sql
- Scripts: scripts/db/backup_db.sh, scripts/db/snapshot_schema.sh, scripts/zip_source_baseline.sh
## Update — Phase A Locked (2026-02-07)

Done:
- Phase A DB snapshot (full + schema)
- Wallet & ledger core verified
- Identity baseline locked

Now:
- Preparing Phase B

Next:
- Implement Phase B modules

## Update — v6 (2026-02-07)

Done:
- Root email lock enforced in /api/auth/ensure-profile (dowithpi@gmail.com → hlong295, role root_admin).

Now:
- Build and publish source zip v6.


## Update — v9 (2026-02-07)

Done:
- Auth core hardening to stop random logout / stuck state:
  - Canonical host set to **tsbio.life (no www)** via middleware redirect to avoid split-origin sessions.
  - auth-context now always derives a basic EmailUser from Supabase session first (never force logout if /api/auth/me fails transiently).
  - logout clears supabase-js localStorage keys to avoid sticky auth.

Now:
- Validate A1 "Email auth stable" on production (no auto-logout, /admin recognizes session, no need to clear cookies).

Next:
- Continue Phase A checklist: A1 profile sync + identity link verifications, then A2 wallet/ledger rollback tool, then A3 admin pages completeness.
