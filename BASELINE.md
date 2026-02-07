# TSBIO Baseline

Current Source: TSBIO_SRC_2026_02_07_v3.zip
Current DB: TSBIO_DB_2026_02_07_v3.sql

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
