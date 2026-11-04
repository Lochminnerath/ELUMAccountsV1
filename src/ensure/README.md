# ELUM Ensure (in the app)

ELUM's own "confirm you are a person" check. No third party, no AI, no cookies. The database side
is `supabase/migrations/20261104000000_elum_ensure.sql` in ELUM Account.

- `EnsureCheck`: the press-and-hold ring. Sign-up always shows it; it hands back a one-time pass.
- `useEnsureGate`: for actions that only check when activity is unusual. Catch an error that
  `needsEnsure(e)` recognises, `await gate.ask(action)` for a pass, and try again with it.
- `createEnsure(url, key)`: talks to `elum_ensure_*` with the public key. `previewEnsure()` for
  tests and preview mode.

The same folder is copied into every ELUM app that uses it; keep the copies the same.
