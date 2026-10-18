# ELUM Account

One place to manage your ELUM account, for Write, Type and every ELUM app. Hosted at
`https://elumaccounts.netlify.app` (later `account.elum.services`).

- **Profile:** picture (cropped to a square in your browser), name, colour, language and time zone.
- **People:** put people in Friends, Family, Work or Blocked. Everyone else is Unknown.
- **Privacy:** choose who can see your picture, find you by name, and message you in Type: everyone,
  people you know, friends and family, family only, or nobody. Blocked people never can.
- **Addresses:** your sign-in address, your Type address, and added addresses confirmed by a code.
- **Security:** change your password, see signed-in devices, sign out every other device, recent activity.
- **Notifications:** for each kind, in the apps' bell and by email or Type.
- **Delete account:** every service removes what is yours, then the account goes.
- **Signing in to the other apps:** see [docs/SIGN-IN.md](docs/SIGN-IN.md).

Accounts uses the ELUM design system with its own colour, **leaf** (`#94c858`, deep `#4a6f1c`,
dark deep `#b8e48c`), and its own mark: a head and shoulders made of glass discs, lit where they meet.
`scripts/brand.py` draws the logos.

## Run it

```sh
npm install
npm run dev        # http://localhost:5175, preview mode (everything stays in this browser)
```

To use the ELUM platform, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to the same values as
Write and Type (see `.env.example`). Setup of the database and functions: [supabase/README.md](supabase/README.md).

## Checks

```sh
npm run typecheck
npm test           # app and edge-function helpers
npm run test:db    # database access rules, against Postgres (needs psql)
npm run build
```
