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
   the three netlify.app defaults.
2. In every app (Write, Type, Accounts) set the same `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In Write and Type set `VITE_ELUM_ACCOUNT_URL=https://elumaccounts.netlify.app`. That switches them to
   signing in through Accounts. Without it they keep their own sign-in pages.
4. Supabase, Authentication, URL configuration: add every app's address to Redirect URLs.
