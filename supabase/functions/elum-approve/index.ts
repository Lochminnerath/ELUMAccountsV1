// The ELUM app approves or denies a waiting sign-in by signing its challenge with the device key
// it made behind Face ID / Touch ID / fingerprint. We check the signature against the public key
// from elum.devices. Message signed (UTF-8): "elum-sign-in:v1:<signInId>:<challenge>:<decision>".
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0));

// iOS and Android give DER signatures; WebCrypto wants raw r||s.
function rawSignature(sig: Uint8Array): Uint8Array {
  if (sig.length === 64) return sig;
  if (sig[0] !== 0x30) throw new Error('signature');
  let i = 2;
  const part = () => {
    if (sig[i++] !== 0x02) throw new Error('signature');
    const len = sig[i++];
    let v = sig.slice(i, i + len);
    i += len;
    while (v.length > 32 && v[0] === 0) v = v.slice(1);
    const out = new Uint8Array(32);
    out.set(v, 32 - v.length);
    return out;
  };
  const r = part();
  const s = part();
  const out = new Uint8Array(64);
  out.set(r);
  out.set(s, 32);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'Use POST.' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: who } = await admin.auth.getUser(token);
  const me = who.user?.id;
  if (!me) return reply(401, { error: 'Sign in to the ELUM app first.' });

  let body: { signInId?: string; deviceId?: string; decision?: string; signature?: string };
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'Send JSON.' });
  }
  const { signInId, deviceId, decision, signature } = body;
  if (!signInId || !deviceId || !signature || (decision !== 'approve' && decision !== 'deny')) {
    return reply(400, { error: 'Send signInId, deviceId, decision ("approve" or "deny") and signature.' });
  }

  const { data: found } = await admin.rpc('elum_device_sign_in', { p_account: me, p_device: deviceId, p_sign_in: signInId });
  if (!found) return reply(404, { error: 'That sign-in or this device is no longer in your account.' });
  if (found.status !== 'pending') return reply(409, { status: found.status, error: 'That sign-in is no longer waiting.' });

  let ok = false;
  try {
    const key = await crypto.subtle.importKey('spki', b64(found.publicKey) as BufferSource, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const message = new TextEncoder().encode(`elum-sign-in:v1:${signInId}:${found.challenge}:${decision}`);
    ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, rawSignature(b64(signature)) as BufferSource, message);
  } catch {
    ok = false;
  }
  if (!ok) return reply(403, { error: 'The signature did not match this device.' });

  const { data: status, error } = await admin.rpc('elum_device_decide', { p_account: me, p_device: deviceId, p_sign_in: signInId, p_approve: decision === 'approve' });
  if (error) return reply(500, { error: 'Could not save that. Try again.' });
  return reply(200, { status });
});
