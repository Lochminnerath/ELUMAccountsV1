// Deletes ELUM accounts (handoff 3.7).
//
//   POST { confirm: "<the account's email>" } with the session: marks the account deleted, emits
//   elum.account.deleted so every service removes what is theirs, and signs it out everywhere.
//   POST with "Authorization: Bearer <CRON_SECRET>" (pg_cron, daily): removes accounts from Auth
//   once every service has finished cleaning up. The profile goes with them.
//
// Secrets: CRON_SECRET. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
// Deploy with --no-verify-jwt (the cron call has no user session; user calls are checked here).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { CORS, fail, fromDbError, hasSecret, ok } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('invalid', 'Use POST.');
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  if (hasSecret(req, Deno.env.get('CRON_SECRET'))) {
    const { data, error } = await db.rpc('elum_deletions_done');
    if (error) return fromDbError(error);
    let removed = 0;
    for (const id of (data ?? []) as string[]) {
      const { error: e } = await db.auth.admin.deleteUser(id);
      if (!e) removed++;
    }
    return ok({ removed });
  }

  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth.user;
  if (!user) return fail('unauthorized', 'Your session has ended. Sign in again.');
  let confirm = '';
  try {
    confirm = String(((await req.json()) as { confirm?: string }).confirm ?? '').trim().toLowerCase();
  } catch {
    confirm = '';
  }
  if (!user.email || confirm !== user.email.toLowerCase()) return fail('invalid', 'Type your sign-in address exactly to confirm.');

  const marked = await db.rpc('elum_mark_deleted', { p_account: user.id });
  if (marked.error) return fromDbError(marked.error);
  // No new sign-ins, and every device signed out.
  await db.auth.admin.updateUserById(user.id, { ban_duration: '876000h' });
  await db.auth.admin.signOut(jwt, 'global');
  return ok({ deleted: true });
});
