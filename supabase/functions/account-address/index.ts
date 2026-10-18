// Emails a 6-digit code to an address someone wants to add to their ELUM account. They enter it
// on the account page (public.elum_confirm_address), and the address becomes theirs.
//
//   POST { address } with the session → { data: { sent: true } }
//
// Secrets: BREVO_API_KEY, ACCOUNT_EMAIL_FROM (such as "ELUM <account@elum.services>"), and
// APP_URL (where Accounts is hosted, for images in the email).

import { createClient } from 'npm:@supabase/supabase-js@2';
import { addressCodeEmail } from '../_shared/email.ts';
import { cleanAddress, sixDigitCode } from '../_shared/handoff.ts';
import { CORS, fail, fromDbError, ok } from '../_shared/http.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('invalid', 'Use POST.');
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await db.auth.getUser(jwt);
  if (!auth.user) return fail('unauthorized', 'Your session has ended. Sign in again.');

  let address: string | null = null;
  try {
    address = cleanAddress(((await req.json()) as { address?: string }).address);
  } catch {
    address = null;
  }
  if (!address) return fail('invalid', 'Enter a valid email address.');

  const limit = await db.rpc('elum_take_rate_limit', { p_key: `address-code:${auth.user.id}`, p_limit: 10, p_window_seconds: 3600 });
  if (limit.data !== true) return fail('rate_limited', 'You asked for a lot of codes. Try again in an hour.');

  const code = sixDigitCode();
  const stored = await db.rpc('elum_address_code_start', { p_account: auth.user.id, p_address: address, p_code: code });
  if (stored.error) return fromDbError(stored.error);

  const key = Deno.env.get('BREVO_API_KEY');
  const from = Deno.env.get('ACCOUNT_EMAIL_FROM');
  const appUrl = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');
  if (!key || !from || !appUrl) return fail('server', 'Email is not set up yet, so we cannot send the code.');
  const { data: profile } = await db.from('profiles').select('name').eq('id', auth.user.id).single<{ name: string }>();
  const email = addressCodeEmail({ code, address, name: profile?.name ?? 'there' }, { assetBase: appUrl });
  const sender = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: sender ? { name: sender[1] || 'ELUM', email: sender[2] } : { name: 'ELUM', email: from.trim() },
      to: [{ email: address }],
      subject: email.subject,
      htmlContent: email.html,
      textContent: email.text,
      tags: ['account-address'],
    }),
  });
  return res.ok ? ok({ sent: true }) : fail('server', 'We could not send the code. Try again in a minute.');
});
