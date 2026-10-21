// Sends "Is this you signing in?" to the person's ELUM app devices. Called by the web page that is
// waiting for approval, with its own (pending) session. Each sign-in is pushed at most once.
// Needs secrets APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (.p8 contents), APNS_TOPIC (bundle id),
// optional APNS_SANDBOX=true, and FCM_SERVICE_ACCOUNT (the JSON). Without them it sends nothing.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
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

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data } = await admin.rpc('elum_push_targets', { p_sign_in: session });
  if (!data) return reply(200, { sent: 0 });
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
  return reply(200, { sent });
});
