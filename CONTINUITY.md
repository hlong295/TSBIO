# Continuity Ledger

- Goal (incl. success criteria):
  - Make TSBIO Pi-user login behave like DoWithPi (smooth Pi Browser auth) without changing UI.
  - Avoid sandbox/testnet logic; production-style Pi.init + Pi.authenticate minimal scopes.

- Constraints/Assumptions:
  - Do not change UI / layout / styling.
  - Pi login must only be attempted inside Pi Browser (prevent Chrome postMessage errors).
  - TSBIO is currently tested on tsbio.life and tsbio.vercel.app.

- Key decisions:
  - Replaced complex Pi auth hook with DoWithPi-style pattern: no sandbox, no retries, no injection logic.
  - Hard guard: do not call Pi.init/authenticate outside Pi Browser.

- State:
  - Code patched in hooks/use-pi-network-authentication.ts.

- Done:
  - Removed duplicate isPiBrowser definitions and sandbox logic.
  - Implemented DoWithPi-style Pi.init({version:"2.0"}) and Pi.authenticate(["username"]).

- Now:
  - Package updated source as a new zip for deployment testing.

- Next:
  - If Pi Browser still reports SDK missing, verify Pi Browser UA contains 'PiBrowser' and that window.Pi exists.
  - If SDK exists but login hangs, confirm domain is registered in Pi Developer Portal and opened via Pi Browser Develop.

- Open questions (UNCONFIRMED if needed):
  - Whether window.Pi is injected on current Pi Browser environment for tsbio.life.

- Working set (files/ids/commands):
  - hooks/use-pi-network-authentication.ts (replaced)
  - /mnt/data/tsbio_v5.zip (input)
  - /mnt/data/do-with-pi-vb_sNv0MoMAbkB.zip (reference)
