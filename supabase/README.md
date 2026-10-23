# ELUM Account on Supabase

Accounts shares the one ELUM Supabase project with Write and Type.

## Database

After the platform migrations (Write's `20261020000000_elum_platform.sql` and the two platform changes
in ELUMTypev1's `supabase/platform-changes/`), run:

- `migrations/20261022000000_elum_accounts.sql`: pictures and the private `avatars` bucket, circles,
  privacy, address codes, devices, activity and the functions the account pages call.

Every service asks `elum.allows(owner, viewer, what)` before showing a picture, listing someone in a
search or delivering a message, so a choice made here holds in Write and Type.

## Functions

```sh
supabase functions deploy account-handoff
supabase functions deploy account-address
supabase functions deploy account-delete --no-verify-jwt
supabase functions deploy passkey --no-verify-jwt
supabase secrets set ELUM_APP_ORIGINS=https://writebyelum.netlify.app,https://typebyelum.netlify.app,https://accountsbyelum.netlify.app \
  ACCOUNT_EMAIL_FROM="ELUM <account@elum.services>" APP_URL=https://accountsbyelum.netlify.app CRON_SECRET=<long random>
```

Remove deleted accounts from Auth once every service has cleaned up (daily):

```sql
select cron.schedule('account-delete', '17 3 * * *', $$
  select net.http_post(url := 'https://<ref>.functions.supabase.co/account-delete',
                       headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'))
$$);
```

Add `https://accountsbyelum.netlify.app` to Auth's Redirect URLs.

## Tests

`tests/run.sh` applies the copies in `platform/` (Write's migrations, the platform, and the platform
changes from Type) and then `migrations/`, and runs `accounts.test.sql` against plain Postgres.
