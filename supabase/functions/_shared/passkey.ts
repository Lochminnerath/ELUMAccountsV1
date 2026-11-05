/**
 * Where passkeys may be made and used. A passkey belongs to one site (its relying party).
 * On ELUM's own domain that site is elum.space itself, so one passkey works on every ELUM app
 * (account.elum.space, write.elum.space, ...). Elsewhere only ELUM Account's own addresses are
 * allowed, and a passkey belongs to that exact address. Plain TypeScript, tested with vitest.
 */

/** ELUM's own domain: the passkey site for every app on it. */
export const PASSKEY_DOMAIN = 'elum.space';

// Account's Netlify addresses. elumaccounts.netlify.app is its old one, kept while the site is renamed.
export const PASSKEY_ORIGINS = ['https://accountbyelum.netlify.app', 'https://accountsbyelum.netlify.app', 'https://elumaccounts.netlify.app'];

const onElumDomain = (url: URL) => url.protocol === 'https:' && (url.hostname === PASSKEY_DOMAIN || url.hostname.endsWith(`.${PASSKEY_DOMAIN}`));

/** Netlify previews of ELUM Account (deploy-preview-6--accountsbyelum.netlify.app). Their passkeys are their own. */
export const isAccountPreview = (url: URL) => url.protocol === 'https:' && /^[a-z0-9-]+--(accountbyelum|accountsbyelum|elumaccounts)\.netlify\.app$/.test(url.hostname);

/** The site a passkey request comes from, if passkeys work there: its origin, and the passkey site (rpID). */
export function passkeySite(origin: string | null | undefined, allowed: string[] = PASSKEY_ORIGINS): { origin: string; rpId: string } | null {
  let url: URL;
  try {
    url = new URL(origin ?? '');
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  if (onElumDomain(url)) return { origin: url.origin, rpId: PASSKEY_DOMAIN };
  const local = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (!local && (url.protocol !== 'https:' || !(allowed.includes(url.origin) || isAccountPreview(url)))) return null;
  return { origin: url.origin, rpId: url.hostname };
}

/** A name for a new passkey from the browser it was made in: "iPhone", "Mac", "Windows". */
export function passkeyName(ua: string | null | undefined): string {
  const u = ua ?? '';
  if (/iPhone/.test(u)) return 'iPhone';
  if (/iPad/.test(u)) return 'iPad';
  if (/Android/.test(u)) return 'Android phone';
  if (/Mac OS X|Macintosh/.test(u)) return 'Mac';
  if (/Windows/.test(u)) return 'Windows computer';
  if (/CrOS/.test(u)) return 'Chromebook';
  if (/Linux/.test(u)) return 'Linux computer';
  return 'Passkey';
}

/** The caller's address, for rate limits: the first one the proxy saw. */
export function clientIp(headers: Headers): string {
  return (headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
}
