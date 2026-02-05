# Continuity Ledger (compaction-safe)

## Goal (incl. success criteria):
- Align `tsbio_v4_final_ui` baseline source code with **"Hiến pháp kỹ thuật"** (TSBIO Platform V1→V3) without breaking:
  - UI (no visual/layout changes)
  - Pi SDK login flow on Pi Browser/App Studio
- Produce a clean baseline ZIP that we will use for the next checklist steps.

## Constraints/Assumptions:
- **Do not change UI/UX** (classNames/layout/assets). Only adjust logic and add route aliases.
- Do not break Pi SDK auth; keep existing backend endpoints from `lib/system-config.ts`.
- Finance/token engines are **future phases**; current baseline focuses on correct auth identity handling + route map alignment.
- UNCONFIRMED: backend login response schema (best-effort parsing implemented).

## Key decisions:
- Keep the existing Vietnamese routes as-is for current UI.
- Add canonical route aliases per constitution:
  - `/market` → reuse `/nong-san`
  - `/cases` → reuse `/cuu-vuon`
  - `/news` → reuse `/tin-tuc`
- Fix Pi identity plumbing so UI receives real `uid/username` whenever available.
- Root admin identity convention: Pi username `hlong295` ⇒ `role: "admin"`.

## State:
- Baseline source: `tsbio_v4_final_ui.zip` (uploaded by user)
- Baseline constitution doc: `hienphapkt.txt` (uploaded by user)

## Done:
- Added best-effort extraction of Pi `uid/username` from Pi SDK and/or backend login response.
- Removed hard-coded placeholder identity in Pi login success callback.
- Added canonical route aliases: `/market`, `/cases`, `/news`.
- Added this Continuity Ledger file to the repo root.

## Now:
- Package updated repo into a new baseline ZIP for user.

## Next:
- Implement the next checklist steps (Identity/Profiles, Store/Market, Token TSB, Fee engine, etc.) while keeping:
  - UI as view layer
  - Logic via API boundaries
  - Money via ledger

## Open questions (UNCONFIRMED if needed):
- UNCONFIRMED: backend `/v1/login` JSON response shape (we parse `{user:{uid,username}}` or `{uid,username}` if present).

## Working set (files/ids/commands):
- `hooks/use-pi-network-authentication.ts`
- `components/pi-authentication-card.tsx`
- `app/tai-khoan/page.tsx`
- `app/market/page.tsx`, `app/cases/page.tsx`, `app/news/page.tsx`
- `CONTINUITY.md`
