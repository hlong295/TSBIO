# Continuity Ledger (TSBIO)

## Goal (incl. success criteria):
- Stage 1 (Auth + Account) for TSBIO v2.
- Email auth: Register, Login (email or username), Reset password, Verify email (Supabase), Profile sync.
- No orphan users; identities(provider=email) linked; wallet ensured.

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
- Baseline code input: tsbio_fix_pi_sdk_like_dowithpi_v6_STAGE0PATCH01.zip

## Done:
- Added Supabase integration (client + admin server helpers) with env-based keys.
- Added /dang-ky, /quen-mat-khau, /cap-nhat-mat-khau pages (fix 404 on /dang-ky).
- Added API routes:
  - /api/auth/resolve-email (username -> email)
  - /api/auth/ensure-profile (post-login provisioning)
  - /api/auth/me (profile+wallet)
  - /api/auth/provision-signup (avoid orphans when email verification enabled)
- Updated auth-context to support EmailUser in parallel with PiUser.
- Updated tai-khoan dashboard to work with email user and show TSB wallet.

## Now:
- Verify build passes locally.
- Ensure Supabase env keys are configured.

## Next:
- Confirm DB RLS/policies allow service role provisioning and wallet upserts.
- Implement Account edit profile fields (without UI changes) if required.

## Open questions (UNCONFIRMED if needed):
- Root admin email account does not exist in auth.users yet on your DB (confirmed by your query).
- Whether Supabase email confirmation is enabled and redirect URL configured.

## Working set (files/ids/commands):
- Source: tsbio_fix_pi_sdk_like_dowithpi_v6_STAGE0PATCH01.zip
- Output: tsbio_fix_pi_sdk_like_dowithpi_v6_STAGE1PATCH01.zip (to be generated)