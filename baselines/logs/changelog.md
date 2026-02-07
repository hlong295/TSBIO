# TSBIO Change Log

## 2026-02-07 | v1

* Fix auth trigger
* Sync profile + wallet
* Add DB baseline
* Add baseline system structure



## 2026-02-07 | v2

* Add CONSTITUTION\_TSBIO.md (Full baseline constitution, incl. 2 root admin identities)



## 2026-02-07 | v3

* Phase 0 baseline lock completed in repo: added baseline folders + scripts

  * scripts/db/backup\_db.sh (full pg\_dump)
  * scripts/db/snapshot\_schema.sh (schema-only)
  * scripts/zip\_source\_baseline.sh (export source zip)

* Updated BASELINE.md + Stage0 README with the Phase 0 DoD



## 2026-02-07 | v4

* Phase A (Core + Admin Core)

  * A1: Added root-only guard + Orphan checker (API: /api/admin/orphans)
  * A2: Added wallet + ledger API endpoints (server-only) and rollback tool (admin)
  * A3: Added Admin Core v1 (new routes: /admin/\*) + admin APIs (users/identities/wallets/ledger/audit/rules)
  * DB scripts added under db/stageA/sql:

    * A1\_2\_root\_pi\_placeholder.sql
    * A2\_1\_tsb\_apply\_tx.sql

\## v4 — 2026-02-07 — Phase A Locked



\- A1: Email identity stable, root email locked, Pi pending placeholder

\- A2: Wallet + ledger core verified

\- A3: Admin core baseline

\- Database snapshot full + schema

\- Source snapshot




## v4 — 2026-02-07 — Phase A Locked

- A1: Email identity stable, root email locked, Pi pending
- A2: Wallet + ledger core verified
- A3: Admin core baseline
- Database snapshot: full + schema
- Source snapshot



## 2026-02-07 | v5

* Fix Admin access UX & guard

  * Add "Vào trang quản trị" button on account pages for admin only
  * Block non-admin from viewing /admin content (AdminShell redirects + FORBIDDEN_NOT_ROOT message)
