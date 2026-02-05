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
- Upgraded Next.js to patched version (mitigates Vercel CVE warning).
- Removed deprecated `eslint` key from next.config.mjs (Next 16 warning).
- Added Pi auth fallback: local API `/api/auth/pi` (role=admin for ROOT Pi UID).
- Added Pi auth timeout (12s) to avoid infinite loading; surfaces actionable error so user can tap Retry (user gesture).

## Now:
- Verify Pi Browser login on `tsbio.vercel.app` triggers Pi popup; if it times out, tap “Thử lại” once to force user-gesture flow.
- Prepare Supabase DB sync phase (profiles/identities/wallet) after login is stable.

## Next:
- Implement real Supabase sync in `/api/auth/pi` (create/link profile + identity + wallet) per TSBIO schema.
- Add root-admin policy checks (server-side) for admin panel routes.
- Investigate Pi App Studio pinet.com 404 (likely platform-side).

## Open questions (UNCONFIRMED if needed):
- UNCONFIRMED: backend `/v1/login` JSON response shape (we parse `{user:{uid,username}}` or `{uid,username}` if present).

## Working set (files/ids/commands):
- hooks/use-pi-network-authentication.ts
- app/api/auth/pi/route.ts
- next.config.mjs
- ROOT_PI_UID=ce691dfb-749a-4074-a221-53360ca3c64a

## Open questions (UNCONFIRMED):
- Is Pi SDK popup blocked by Pi Browser requiring explicit tap every time on iOS?
- Does TSBIO need `sandbox=true` in Pi.init for App Studio testnet auth, or only for payments?
