import { describe, expect, it } from 'vitest';
import { shouldOfferPasskey } from './passkeys';

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
