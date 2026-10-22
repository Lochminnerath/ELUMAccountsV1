import { describe, expect, it } from 'vitest';
import { passkeySiteAllowed, shouldOfferPasskey } from './passkeys';

const base = { supported: true, hasPasskey: false, signInId: 's1', notNowFor: null };

describe('suggesting a passkey', () => {
  it('asks on a sign-in without one', () => {
    expect(shouldOfferPasskey(base)).toBe(true);
  });
  it('never asks once there is a passkey', () => {
    expect(shouldOfferPasskey({ ...base, hasPasskey: true })).toBe(false);
  });
  it('waits until it knows', () => {
    expect(shouldOfferPasskey({ ...base, hasPasskey: null })).toBe(false);
    expect(shouldOfferPasskey({ ...base, signInId: null })).toBe(false);
  });
  it('“Not now” lasts for that sign-in only', () => {
    expect(shouldOfferPasskey({ ...base, notNowFor: 's1' })).toBe(false);
    expect(shouldOfferPasskey({ ...base, signInId: 's2', notNowFor: 's1' })).toBe(true);
  });
  it('stays quiet where passkeys do not work', () => {
    expect(shouldOfferPasskey({ ...base, supported: false })).toBe(false);
  });
});

describe('where passkeys are offered', () => {
  it('only on ELUM Account itself and localhost, never on deploy previews', () => {
    expect(passkeySiteAllowed('https://elumaccounts.netlify.app')).toBe(true);
    expect(passkeySiteAllowed('https://account.elum.services')).toBe(true);
    expect(passkeySiteAllowed('http://localhost:5173')).toBe(true);
    expect(passkeySiteAllowed('https://deploy-preview-5--elumaccounts.netlify.app')).toBe(false);
    expect(passkeySiteAllowed('https://elumaccounts.netlify.app.evil.example')).toBe(false);
  });
});
