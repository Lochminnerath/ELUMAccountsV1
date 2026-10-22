# Signing in once, for every ELUM app

## The problem

Write, Type and Accounts are separate sites: `elumwrite.netlify.app`, `elumtype.netlify.app` and
`elumaccounts.netlify.app`. A browser keeps each site's sign-in separately, and `netlify.app` is a
shared hosting domain, so these sites can never share a cookie. (Shared cookies only work when the apps
are subdomains of a domain you own, such as `write.elum.services` and `type.elum.services`.)

So "signed in" is not something one site can tell another directly. Nothing is stored in local cache
files; each site's session lives in that site's browser storage, and every session belongs to the same
ELUM account on the server.

## How it works: Accounts hands the sign-in over

Accounts is where people sign in. When an app has no session, it sends people there, and Accounts sends
them back signed in:

```
1. Open https://elumwrite.netlify.app/d/9f1c…           (a document link from an email or Type)
2. Write has no session → https://elumaccounts.netlify.app/continue
        ?to=https://elumwrite.netlify.app/auth/handoff&next=/d/9f1c…
3. Accounts: already signed in? (If not, sign in once.)
   It asks the account-handoff function for a one-time sign-in token for Write.
4. Back to https://elumwrite.netlify.app/auth/handoff#token_hash=…&next=/d/9f1c…
5. Write trades the token for its own session (supabase.auth.verifyOtp), removes it from the
   address bar, and opens /d/9f1c… If the person has access, the document opens. If not, Write
   says whose permission they need.
```

It works the other way too: "Your ELUM account" in Write or Type, the app switcher, and Type's
"Open in Write" cards all go through the same handoff, so every jump lands signed in.

### Apps inside Browse tabs

An app in a Browse tab is a frame, and browsers keep a frame's storage apart from the same site
opened on its own. So Browse, signed in, asks `account-handoff` for a one-time sign-in the first
time each app opens in a visit, and loads the app's `/auth/handoff` page with it. The app keeps
that sign-in inside Browse for the rest of the visit.

Why it is safe:

- The token is used once and expires; it rides in the URL fragment, which browsers never send to servers.
- `account-handoff` only sends tokens to the `/auth/handoff` page of the apps listed in `ELUM_APP_ORIGINS`.
- Every app still checks access itself: a document opens only for people it is shared with.

## Across devices

Each phone, computer and browser signs in once; after that, every ELUM app on that device opens
signed in, through the handoff above. Everything else follows the account, not the device: your
picture, name, language, circles, privacy, documents and messages are on the server, so they are
the same everywhere the moment you sign in. Security, in Accounts, lists every signed-in device and
can sign them all out. (Passkeys, planned, will make that one sign-in per device a tap.)

## Signing out

Signing out in an app ends that app's session and Accounts' session on this device
(`/signout?to=…`). "Sign out every other device" in Accounts ends the rest. Once the apps move to
subdomains of one domain, setting `VITE_ELUM_COOKIE_DOMAIN` in all of them makes sign-in and sign-out
fully shared without any handoff.

## Setting it up

1. Deploy `account-handoff` (keep JWT verification on). Set `ELUM_APP_ORIGINS` if the sites are not
   the netlify.app defaults (Write, Type, Make, Browse, Store and Accounts).
2. In every app (Write, Type, Accounts) set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Every app signs in through `https://elumaccounts.netlify.app` unless its `VITE_ELUM_ACCOUNT_URL`
   names another ELUM Account. Set it to `off` for an app's own sign-in pages only. Away from the
   apps' own sites (Netlify deploy previews, for example) the apps always use their own sign-in
   pages, because `account-handoff` only sends sign-ins to the sites it knows.
4. Supabase, Authentication, URL configuration: add every app's address to Redirect URLs.

## Passkeys

People can sign in to ELUM Account with a passkey: Face ID, Touch ID, a device PIN or a security
key. The browser keeps the private key (in iCloud Keychain, Google Password Manager or another password
manager, so it reaches the person's other devices); ELUM stores only the public key
(`elum.passkeys`, migration `20261031000000_passkeys.sql`).

```
1. Sign-in page: "Sign in with a passkey", or pick one from the address field's suggestions.
2. The passkey function (login-options) hands out a one-time challenge, good for five minutes.
3. The browser asks for Face ID / Touch ID / the PIN and signs the challenge.
4. passkey (login-verify) checks the signature against the stored public key, then makes a one-time
   sign-in token (a magic link that is never emailed) and returns it.
5. The page trades it for a session (supabase.auth.verifyOtp, type magiclink).
```

That sign-in counts as an email link, so "Approve new sign-ins" lets it straight in: a passkey proves
more than a password. After a password or email-link sign-in, people without a passkey are asked
once per sign-in whether they want to make one; Security lists, renames and removes them.

**A passkey belongs to the site address it was made on.** Passkeys made on
`elumaccounts.netlify.app` work only there. When ELUM Account moves to `account.elum.services`,
everyone makes new passkeys there from Security. The old ones stay listed and still count as having a
passkey, so remove them (or clear `elum.passkeys` at the move) to bring the "Sign in faster" suggestion back. The passkey function accepts
`https://elumaccounts.netlify.app`, `https://account.elum.services` and `http://localhost`.

Deploy it with `supabase functions deploy passkey --no-verify-jwt` (signing in has no session yet;
making a passkey checks the session itself).

## Nearby approvals

Browsers cannot look around a local network, so "nearby" means: the waiting sign-in comes from the
same public address as the signed-in device being asked (usually the same home or office network).
`elum_sign_in_requests()` marks those `nearby` and lists them first; the signed-in device asks about
them straight away with a "Nearby · on your network" badge. The right number still has to be
picked: nothing is approved by itself.
