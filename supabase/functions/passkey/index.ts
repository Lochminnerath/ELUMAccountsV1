// Passkeys on the ELUM Account website: make one while signed in, and sign in with one.
//
//   POST { action: 'register-options' }                       (signed in) → { challengeId, options }
//   POST { action: 'register-verify', challengeId, response }  (signed in) → { id }
//   POST { action: 'login-options' }                                      → { challengeId, options }
//   POST { action: 'login-verify', challengeId, response }                → { tokenHash }
//
// The browser trades tokenHash for a session (supabase.auth.verifyOtp, type magiclink). That
// sign-in counts as an email link, which sign-in approvals treat as approved: a passkey proves more
// than a password. Passkeys belong to the site's hostname, so only ELUM Account's own addresses are
// allowed (_shared/passkey.ts). Deploy with --no-verify-jwt: signing in has no session yet; the
// register actions check the session themselves.

import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from 'npm:@simplewebauthn/server@13';
import { CORS, fail, fromDbError, ok } from '../_shared/http.ts';
import { clientIp, passkeyName, passkeySite } from '../_shared/passkey.ts';

const RP_NAME = 'ELUM Account';

type Credential = { id: string; transports: AuthenticatorTransportFuture[] };

const toB64url = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (value: string) => {
  const b = value.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b.padEnd(Math.ceil(b.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
};
const uuidBytes = (id: string) => Uint8Array.from(id.replace(/-/g, '').match(/../g)!.map((h) => parseInt(h, 16)));

function claims(jwt: string): Record<string, unknown> {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(Math.ceil(part.length / 4) * 4, '=')));
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return fail('invalid', 'Use POST.');
  const site = passkeySite(req.headers.get('Origin'));
  if (!site) return fail('forbidden', 'Passkeys work on the ELUM Account site only.');

  let body: { action?: string; challengeId?: string; response?: unknown; email?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return fail('invalid', 'Send the details as JSON.');
  }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  const takeChallenge = async (kind: 'register' | 'login') => {
    if (typeof body.challengeId !== 'string' || !/^[0-9a-f-]{36}$/i.test(body.challengeId)) return null;
    const { data } = await db.rpc('elum_passkey_take_challenge', { p_id: body.challengeId, p_kind: kind });
    const c = data as { challenge: string; accountId: string | null; rpId: string } | null;
    return c && c.rpId === site.rpId ? c : null;
  };

  // ---------------------------------------------------------------- signing in
  if (body.action === 'login-options' || body.action === 'login-verify') {
    const limit = await db.rpc('elum_take_rate_limit', { p_key: `passkey_login:${clientIp(req.headers)}`, p_limit: 40, p_window_seconds: 600 });
    if (limit.data !== true) return fail('rate_limited', 'Too many tries. Wait a few minutes and try again.');

    if (body.action === 'login-options') {
      // No email hint: listing an address's passkeys would tell anyone whether it has an account.
      const options = await generateAuthenticationOptions({ rpID: site.rpId, userVerification: 'preferred', allowCredentials: [] });
      const { data: id, error } = await db.rpc('elum_passkey_challenge', { p_kind: 'login', p_account: null, p_challenge: options.challenge, p_rp_id: site.rpId });
      if (error) return fromDbError(error);
      return ok({ challengeId: id, options });
    }

    const response = body.response as AuthenticationResponseJSON | undefined;
    const challenge = await takeChallenge('login');
    if (!challenge) return fail('invalid', 'That took too long. Try again.');
    if (!response || typeof response.id !== 'string') return fail('invalid', 'The passkey did not answer. Try again.');
    const { data: found } = await db.rpc('elum_passkey_lookup', { p_credential_id: response.id });
    const key = found as { accountId: string; publicKey: string; counter: number; transports: AuthenticatorTransportFuture[]; email: string | null } | null;
    if (!key?.email) return fail('unauthorized', 'We do not know that passkey. It may have been removed from your account.');
    let result;
    try {
      result = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge.challenge,
        expectedOrigin: site.origin,
        expectedRPID: site.rpId,
        credential: { id: response.id, publicKey: fromB64url(key.publicKey), counter: Number(key.counter), transports: key.transports },
        requireUserVerification: false,
      });
    } catch {
      return fail('unauthorized', 'That passkey did not work. Try again, or use your password.');
    }
    if (!result.verified) return fail('unauthorized', 'That passkey did not work. Try again, or use your password.');
    await db.rpc('elum_passkey_used', { p_credential_id: response.id, p_counter: result.authenticationInfo.newCounter });
    // A link that is never emailed: its token signs this person in once, here.
    const link = await db.auth.admin.generateLink({ type: 'magiclink', email: key.email });
    const tokenHash = link.data?.properties?.hashed_token;
    if (link.error || !tokenHash) return fail('server', 'We could not sign you in. Try again.');
    return ok({ tokenHash });
  }

  // ---------------------------------------------------------- making a passkey
  if (body.action !== 'register-options' && body.action !== 'register-verify') return fail('invalid', 'Unknown action.');
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: auth } = await db.auth.getUser(jwt);
  const user = auth.user;
  if (!user || claims(jwt).role !== 'authenticated') return fail('unauthorized', 'Sign in first, then make a passkey.');

  if (body.action === 'register-options') {
    const { data: existing } = await db.rpc('elum_passkey_credentials', { p_account: user.id, p_email: null });
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: site.rpId,
      userID: uuidBytes(user.id),
      userName: user.email ?? user.id,
      userDisplayName: String(user.user_metadata?.name ?? user.email ?? 'ELUM'),
      attestationType: 'none',
      excludeCredentials: (existing as Credential[] | null) ?? [],
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
    });
    const { data: id, error } = await db.rpc('elum_passkey_challenge', { p_kind: 'register', p_account: user.id, p_challenge: options.challenge, p_rp_id: site.rpId });
    if (error) return fromDbError(error);
    return ok({ challengeId: id, options });
  }

  const challenge = await takeChallenge('register');
  if (!challenge || challenge.accountId !== user.id) return fail('invalid', 'That took too long. Try again.');
  let result;
  try {
    result = await verifyRegistrationResponse({
      response: body.response as RegistrationResponseJSON,
      expectedChallenge: challenge.challenge,
      expectedOrigin: site.origin,
      expectedRPID: site.rpId,
      requireUserVerification: false,
    });
  } catch {
    return fail('invalid', 'We could not save that passkey. Try again.');
  }
  if (!result.verified || !result.registrationInfo) return fail('invalid', 'We could not save that passkey. Try again.');
  const { credential } = result.registrationInfo;
  const { data, error } = await db.rpc('elum_passkey_add', {
    p_account: user.id,
    p_credential_id: credential.id,
    p_public_key: toB64url(credential.publicKey),
    p_counter: credential.counter,
    p_transports: credential.transports ?? [],
    p_name: typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 80) : passkeyName(req.headers.get('User-Agent')),
  });
  if (error) return fromDbError(error);
  return ok(data);
});
