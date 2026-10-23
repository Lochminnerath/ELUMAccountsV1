// Gives a signed-in person a one-time sign-in for another ELUM app (see _shared/handoff.ts).
//
//   POST { to: "https://writebyelum.netlify.app/auth/handoff", next: "/d/<id>" } with the session
//   → { data: { url } }: send the browser there. The app trades the token for its own session.
//
// Secrets: ELUM_APP_ORIGINS, comma-separated origins allowed to receive a sign-in (defaults to the
// Write, Type and Accounts sites on netlify.app). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// provided by Supabase. Keep JWT verification on (the default) when deploying.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { handoffTarget, handoffUrl, parseOrigins, safePath } from '../_shared/handoff.ts';
import { CORS, fail, ok } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('invalid', 'Use POST.');
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth.user;
  if (!user?.email) return fail('unauthorized', 'Your session has ended. Sign in again.');

  let body: { to?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid', 'Send the details as JSON.');
  }
  const target = handoffTarget(String(body.to ?? ''), parseOrigins(Deno.env.get('ELUM_APP_ORIGINS')));
  if (!target) return fail('forbidden', 'That site is not an ELUM app.');

  const limit = await db.rpc('elum_take_rate_limit', { p_key: `handoff:${user.id}`, p_limit: 60, p_window_seconds: 3600 });
  if (limit.data !== true) return fail('rate_limited', 'Too many sign-ins in the last hour. Try again later.');

  // A magic link that is never emailed: its token signs this person in once, on that app.
  const link = await db.auth.admin.generateLink({ type: 'magiclink', email: user.email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) return fail('server', 'We could not sign you in there. Try again.');
  return ok({ url: handoffUrl(target, tokenHash, safePath(body.next)) });
});
