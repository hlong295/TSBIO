# TSBIO Change Log

## 2026-02-07 | v1
- Fix auth trigger
- Sync profile + wallet
- Add DB baseline
- Add baseline system structure


## 2026-02-07 | v2
- Add CONSTITUTION_TSBIO.md (Full baseline constitution, incl. 2 root admin identities)


## 2026-02-07 | v3
- Phase 0 baseline lock completed in repo: added baseline folders + scripts
  - scripts/db/backup_db.sh (full pg_dump)
  - scripts/db/snapshot_schema.sh (schema-only)
  - scripts/zip_source_baseline.sh (export source zip)
- Updated BASELINE.md + Stage0 README with the Phase 0 DoD


## 2026-02-07 | v4
- Phase A (Core + Admin Core)
  - A1: Added root-only guard + Orphan checker (API: /api/admin/orphans)
  - A2: Added wallet + ledger API endpoints (server-only) and rollback tool (admin)
  - A3: Added Admin Core v1 (new routes: /admin/*) + admin APIs (users/identities/wallets/ledger/audit/rules)
  - DB scripts added under db/stageA/sql:
    - A1_2_root_pi_placeholder.sql
    - A2_1_tsb_apply_tx.sql
