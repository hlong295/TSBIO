# Continuity Ledger (compaction-safe)

## Goal (incl. success criteria):
- Produce **TSBIO V5** that logs in with Pi SDK **the same way as dowithpi** (production pattern), without breaking UI.
- Success criteria:
  - Pi login popup opens reliably in Pi Browser when domain is valid in Pi Dev Portal.
  - No sandbox / no retries / no injected SDK script.
  - UI 100% unchanged.

## Constraints/Assumptions:
- **Do not change UI/UX** (classNames/layout/assets).
- Copy Pi auth pattern from dowithpi.
- **Production-only**: remove sandbox completely.
- No retry logic.
- No SDK injection (do not load `https://sdk.minepi.com/pi-sdk.js` from the app; rely on Pi Browser-injected SDK).

## Key decisions:
- Implement a clean, minimal PiAuth hook (init once + authenticate) like dowithpi.
- Force `sandbox: false` in `Pi.init`.
- Keep the same public hook API so existing UI components stay unchanged.

## State:
- Working baseline source: `tsbio_v5.zip` (uploaded by user)
- Reference: `do-with-pi-vb_sNv0MoMAbkB.zip` (dowithpi working Pi auth)

## Done:
- Rewrote `hooks/use-pi-network-authentication.ts` to match dowithpi pattern:
  - init once when `window.Pi` exists
  - `Pi.init({ version: "2.0", sandbox: false })`
  - `Pi.authenticate(["username"])` with no retries
  - pushes result into existing `AuthProvider.login` (UI untouched)
- Removed Pi SDK injection from `app/layout.tsx`.

## Now:
- Package and deliver ZIP `tsbio_fix_pi_sdk_like_dowithpi_v5.zip`.
- Validate in Pi Browser after domain is properly verified in Pi Dev Portal (domain mismatch will still block auth even if code is correct).

## Next:
- If Pi login still hangs on a verified domain, capture Pi Browser console/network logs and compare with dowithpi.

## Open questions (UNCONFIRMED if needed):
- UNCONFIRMED: backend `/v1/login` JSON response shape (we parse `{user:{uid,username}}` or `{uid,username}` if present).

## Working set (files/ids/commands):
- hooks/use-pi-network-authentication.ts
- app/layout.tsx

## Open questions (UNCONFIRMED):
- Is Pi SDK popup blocked by Pi Browser requiring explicit tap every time on iOS?
- Does TSBIO need `sandbox=true` in Pi.init for App Studio testnet auth, or only for payments?
