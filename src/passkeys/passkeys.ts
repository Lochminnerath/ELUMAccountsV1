/** Passkeys in this browser, and when to suggest making one. */

/**
 * Where passkeys work: ELUM Account's own addresses, its Netlify previews and localhost, as the
 * passkey function allows (supabase/functions/_shared/passkey.ts). A passkey belongs to the address
 * it was made on, so one made on a preview only works on that preview.
 */
// elumaccounts.netlify.app is Account's old address, kept while the site is renamed.
export const PASSKEY_ORIGINS = ['https://accountsbyelum.netlify.app', 'https://account.elum.services', 'https://elumaccounts.netlify.app'];

export function passkeySiteAllowed(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return true;
    if (url.protocol === 'https:' && /^[a-z0-9-]+--(accountsbyelum|elumaccounts)\.netlify\.app$/.test(url.hostname)) return true;
    return PASSKEY_ORIGINS.includes(url.origin);
  } catch {
    return false;
  }
}

/** True when this browser can make and use passkeys, on a site where they work. */
export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function' && passkeySiteAllowed(window.location.origin);
}

/** True when passkeys can be offered among the address field's suggestions (conditional UI). */
export async function passkeyAutofillSupported(): Promise<boolean> {
  if (!passkeysSupported()) return false;
  try {
    return (await PublicKeyCredential.isConditionalMediationAvailable?.()) === true;
  } catch {
    return false;
  }
}

const NOT_NOW_KEY = 'elum.account.passkey-not-now';

export interface OfferInput {
  supported: boolean;
  /** Null while not known yet. */
  hasPasskey: boolean | null | undefined;
  signInId: string | null;
  /** The sign-in for which "Not now" was chosen. */
  notNowFor: string | null;
}

/**
 * Whether to suggest making a passkey: on every sign-in without one, until there is one. "Not now"
 * lasts for that sign-in only. Someone who just signed in with a passkey has one, so is never asked.
 */
export function shouldOfferPasskey({ supported, hasPasskey, signInId, notNowFor }: OfferInput): boolean {
  if (!supported || hasPasskey !== false || !signInId) return false;
  return notNowFor !== signInId;
}

export function notNowFor(): string | null {
  try {
    return localStorage.getItem(NOT_NOW_KEY);
  } catch {
    return null;
  }
}

export function saveNotNow(signInId: string) {
  try {
    localStorage.setItem(NOT_NOW_KEY, signInId);
  } catch {
    // Asked again on the next visit, which is harmless.
  }
}
