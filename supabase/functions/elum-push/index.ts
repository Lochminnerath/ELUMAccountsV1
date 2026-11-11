// Sends "Is this you signing in?" to the person's ELUM app devices, and emails a link to the
// approval page (ELUM Account /approve) to every confirmed address on the account. Called by the web
// page that is waiting for approval, with its own (pending) session. Each sign-in is pushed at most
// once and emailed at most once.
// The email needs BREVO_API_KEY and ACCOUNT_EMAIL_FROM; optional ACCOUNT_URL defaults to
// https://account.elum.space.
// Needs secrets APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (.p8 contents), APNS_TOPIC (bundle id),
// optional APNS_SANDBOX=true, and FCM_SERVICE_ACCOUNT (the JSON). Without them it sends nothing.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { signInLinkEmail, signInNoticeEmail } from '../_shared/email.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const b64url = (b: Uint8Array | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function signJwt(header: object, claims: object, pem: string, alg: 'ES256' | 'RS256') {
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der as BufferSource,
    alg === 'ES256' ? { name: 'ECDSA', namedCurve: 'P-256' } : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const sig = await crypto.subtle.sign(alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : 'RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(input));
  return `${input}.${b64url(new Uint8Array(sig))}`;
}

async function apns(token: string, payload: Record<string, string>, title: string, body: string) {
  const keyId = Deno.env.get('APNS_KEY_ID'), team = Deno.env.get('APNS_TEAM_ID'), pem = Deno.env.get('APNS_PRIVATE_KEY'), topic = Deno.env.get('APNS_TOPIC');
  if (!keyId || !team || !pem || !topic) return false;
  const jwt = await signJwt({ alg: 'ES256', kid: keyId }, { iss: team, iat: Math.floor(Date.now() / 1000) }, pem, 'ES256');
  const host = Deno.env.get('APNS_SANDBOX') === 'true' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
  const res = await fetch(`https://${host}/3/device/${token}`, {
    method: 'POST',
    headers: { authorization: `bearer ${jwt}`, 'apns-topic': topic, 'apns-push-type': 'alert', 'apns-priority': '10', 'apns-expiration': '0' },
    body: JSON.stringify({ aps: { alert: { title, body }, sound: 'default', category: 'ELUM_SIGN_IN', 'interruption-level': 'time-sensitive' }, ...payload }),
  });
  return res.ok;
}

async function fcm(token: string, payload: Record<string, string>, title: string, body: string) {
  const raw = Deno.env.get('FCM_SERVICE_ACCOUNT');
  if (!raw) return false;
  const sa = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt({ alg: 'RS256', typ: 'JWT' },
    { iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 },
    sa.private_key, 'RS256');
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${assertion}`,
  }).then((r) => r.json());
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST', headers: { authorization: `Bearer ${tok.access_token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ message: { token, data: { ...payload, title, body }, android: { priority: 'high', ttl: '600s' } } }),
  });
  return res.ok;
}

const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');

/** When it happened, for the email: "on 5 November at 14:02 UTC". */
const when = (iso: string) =>
  'on ' + new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' })
    .format(new Date(iso)) + ' UTC';

/** Emails the approval link once. Never throws: a failed email must not block the push. */
async function emailLink(admin: SupabaseClient, jwt: string, session: string): Promise<number> {
  try {
    const key = Deno.env.get('BREVO_API_KEY');
    const from = Deno.env.get('ACCOUNT_EMAIL_FROM');
    if (!key || !from) return 0;
    // The session must be real and the caller's own: Supabase checks the token.
    const { data: auth } = await admin.auth.getUser(jwt);
    if (!auth.user) return 0;

    const raw = crypto.getRandomValues(new Uint8Array(32));
    const token = btoa(String.fromCharCode(...raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const hash = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)));
    const { data } = await admin.rpc('elum_sign_in_email_start', { p_sign_in: session, p_account: auth.user.id, p_link_hash: hash });
    const to = (data?.addresses ?? []) as string[];
    if (!data || to.length === 0) return 0;

    const accountUrl = (Deno.env.get('ACCOUNT_URL') || 'https://account.elum.space').replace(/\/+$/, '');
    const details = { name: data.name || 'there', device: data.device, place: data.ip ? `the internet address ${data.ip}` : null, when: when(data.at) };
    const email = signInLinkEmail({ ...details, url: `${accountUrl}/approve#${token}` }, { assetBase: accountUrl });
    // ELUM Type mailboxes get the news without the link: someone inside the mailbox must never be
    // able to approve a sign-in to the account it belongs to.
    const notice = signInNoticeEmail({ ...details, accountUrl }, { assetBase: accountUrl });
    const { data: typeDomain } = await admin.rpc('type_domain');
    const inside = (address: string) => typeof typeDomain === 'string' && typeDomain.length > 0 && address.toLowerCase().endsWith(`@${typeDomain.toLowerCase()}`);
    const sender = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    let sent = 0;
    // One email per address, so nobody sees the others.
    for (const address of to) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          sender: sender ? { name: sender[1] || 'ELUM', email: sender[2] } : { name: 'ELUM', email: from.trim() },
          to: [{ email: address }],
          subject: (inside(address) ? notice : email).subject,
          htmlContent: (inside(address) ? notice : email).html,
          textContent: (inside(address) ? notice : email).text,
          tags: [inside(address) ? 'sign-in-notice' : 'sign-in-approval'],
        }),
      });
      if (res.ok) sent++;
    }
    return sent;
  } catch {
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let session: string | undefined;
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    session = JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '='))).session_id;
  } catch {
    session = undefined;
  }
  if (!session) return reply(401, { error: 'Sign in first.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const emailed = await emailLink(admin, token, session);
  const { data } = await admin.rpc('elum_push_targets', { p_sign_in: session });
  if (!data) return reply(200, { sent: 0, emailed });
  const title = 'Is this you signing in?';
  const body = `${data.device} is waiting for you to approve it.`;
  const payload = { type: 'elum.sign_in', signInId: data.signInId };
  let sent = 0;
  for (const t of data.targets as { provider: string; token: string }[]) {
    try {
      if (await (t.provider === 'apns' ? apns : fcm)(t.token, payload, title, body)) sent++;
    } catch {
      // One bad token must not stop the others.
    }
  }
  return reply(200, { sent, emailed });
});
