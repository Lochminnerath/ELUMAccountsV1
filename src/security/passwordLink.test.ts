import { describe, expect, it } from 'vitest';
import { cameFromPasswordLink } from './passwordLink';

const token = (claims: object) => `x.${btoa(JSON.stringify(claims)).replace(/=+$/, '')}.y`;
const now = 1_800_000_000_000;

describe('cameFromPasswordLink', () => {
  it('accepts a recent sign-in from the emailed link', () => {
    expect(cameFromPasswordLink(token({ amr: [{ method: 'recovery', timestamp: now / 1000 - 60 }] }), now)).toBe(true);
  });
  it('refuses a password sign-in', () => {
    expect(cameFromPasswordLink(token({ amr: [{ method: 'password', timestamp: now / 1000 - 60 }] }), now)).toBe(false);
  });
  it('refuses a link used more than 15 minutes ago', () => {
    expect(cameFromPasswordLink(token({ amr: [{ method: 'recovery', timestamp: now / 1000 - 16 * 60 }] }), now)).toBe(false);
  });
  it('refuses no token or a broken one', () => {
    expect(cameFromPasswordLink(null, now)).toBe(false);
    expect(cameFromPasswordLink('not-a-token', now)).toBe(false);
  });
});
