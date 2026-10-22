/** Passkeys in this browser, and when to suggest making one. */

/** True when this browser can make and use passkeys at all. */
export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
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
