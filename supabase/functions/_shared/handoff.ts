/**
 * Signing in across ELUM apps that cannot share a cookie (such as *.netlify.app sites).
 * Accounts holds the session; an app that has none sends people to
 *   <accounts>/continue?to=<app>/auth/handoff&next=<path>
 * and Accounts sends them back with a one-time sign-in token in the URL fragment. The app trades
 * it for its own session (supabase.auth.verifyOtp). Plain TypeScript, tested with vitest.
 */

/** The ELUM apps that may receive a sign-in, as origins. Configured with ELUM_APP_ORIGINS. */
export const DEFAULT_APP_ORIGINS = ['https://elumwrite.netlify.app', 'https://elumtype.netlify.app', 'https://elummake.netlify.app', 'https://elumbrowse.netlify.app', 'https://elumstore.netlify.app', 'https://elumaccounts.netlify.app', 'https://eluminquire.netlify.app'];

/** ELUM's own domain: every https site on it is an ELUM app (write.elum.services, ...). */
export const FAMILY_DOMAIN = 'elum.services';

function isFamilyHost(url: URL): boolean {
  return url.protocol === 'https:' && (url.hostname === FAMILY_DOMAIN || url.hostname.endsWith(`.${FAMILY_DOMAIN}`));
}

export function parseOrigins(value: string | undefined): string[] {
  const list = (value ?? '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  return list.length ? list : DEFAULT_APP_ORIGINS;
}

/**
 * The handoff address, if `to` is the handoff page of an allowed app. Anything else is refused:
 * a token sent to the wrong site would sign a stranger in as you.
 */
export function handoffTarget(to: string, allowed: string[]): URL | null {
  let url: URL;
  try {
    url = new URL(to);
  } catch {
    return null;
  }
  if (url.username || url.password || url.hash) return null;
  const local = url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
  if (url.protocol !== 'https:' && !local) return null;
  if (!allowed.includes(url.origin) && !isFamilyHost(url)) return null;
  if (url.pathname !== '/auth/handoff') return null;
  return url;
}

/** A path inside the app to open after signing in, such as /d/<document id>. */
export function safePath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  return next.slice(0, 2000);
}

/** Where Accounts sends people back: the token rides in the fragment, which never reaches a server. */
export function handoffUrl(target: URL, tokenHash: string, next: string): string {
  const fragment = new URLSearchParams({ token_hash: tokenHash, type: 'email', next: safePath(next) });
  return `${target.origin}${target.pathname}#${fragment.toString()}`;
}

export function sixDigitCode(random: (n: number) => Uint32Array = (n) => crypto.getRandomValues(new Uint32Array(n))): string {
  return String(random(1)[0] % 1_000_000).padStart(6, '0');
}

export function cleanAddress(value: unknown): string | null {
  const a = String(value ?? '').trim().toLowerCase();
  return /^[^\s@<>(),;:"[\]]+@[^\s@<>(),;:"[\]]+\.[^\s@<>(),;:"[\]]+$/.test(a) && a.length <= 254 ? a : null;
}
