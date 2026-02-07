# TSBIO Baseline

Current Source: TSBIO_SRC_2026_02_07_v6.zip
Current DB: TSBIO_DB_2026_02_07_v4.sql

Last update: 2026-02-07

## Baseline folders (required)
- /baselines/source
- /baselines/database
- /baselines/logs

## Phase 0 — Baseline Lock (DoD)
1) DB backup created (pg_dump) → /baselines/database/
2) Schema snapshot created → /baselines/database/
3) Root admin (2 identities) locked (email locked + pi placeholder pending) → db/stage0/sql/
4) Namespace username locked (lowercase + unique + block pi_ prefix) → db/stage0/sql/
5) Source zip exported → /baselines/source/

## Phase A — Core + Admin Core (DoD)
### A1 — Auth + Identity
- Email auth remains stable (no UI changes)
- Profile sync via /api/auth/ensure-profile
- Identity link email maintained
- Root guard enforced server-side for admin APIs
- Root pi placeholder SQL provided (db/stageA/sql/A1_2_root_pi_placeholder.sql)
- Orphan checker API: /api/admin/orphans

### A2 — Wallet + Ledger
- User wallet API: /api/tsb/wallet
- User ledger API: /api/tsb/ledger
- Balance engine DB function provided: db/stageA/sql/A2_1_tsb_apply_tx.sql
- Rollback tool (admin): /api/admin/ledger/rollback

### A3 — Admin Core v1
- Admin pages: /admin, /admin/users, /admin/identities, /admin/wallets, /admin/ledger, /admin/audit, /admin/rules, /admin/orphans
- Admin APIs: /api/admin/users, /api/admin/identities, /api/admin/wallets, /api/admin/ledger, /api/admin/audit, /api/admin/rules

## Current Baseline — v6 (2026-02-07)

- Phase: A completed
- DB: TSBIO_DB_20260207_v4_full.dump
- Schema: TSBIO_DB_20260207_v4_schema.sql
- Source: TSBIO_SRC_20260207_v6.zip
- Root: hlong295 (email), pi_hlong295 (pending)


### A3.x — Admin Access Guard
- Account pages show "Vào trang quản trị" button only for admin (role = root_admin/admin).
- /admin UI blocks non-admin and redirects away (AdminShell guard).

### A1.x — Root Email Lock (Auth → Profile)
- /api/auth/ensure-profile enforces root email lock:
  - Email: dowithpi@gmail.com
  - Username: hlong295
  - Role: root_admin (auto-upgrade if older profile existed)
