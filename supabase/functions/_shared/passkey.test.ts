import { describe, expect, it } from 'vitest';
import { clientIp, passkeyName, passkeySite } from './passkey';

describe('passkey sites', () => {
  it('allow only ELUM Account, with its hostname as the passkey site', () => {
    expect(passkeySite('https://elumaccounts.netlify.app')).toEqual({ origin: 'https://elumaccounts.netlify.app', rpId: 'elumaccounts.netlify.app' });
    expect(passkeySite('https://account.elum.services')?.rpId).toBe('account.elum.services');
    expect(passkeySite('http://localhost:5175')?.rpId).toBe('localhost');
  });
  it('refuse everything else', () => {
    expect(passkeySite('https://elumwrite.netlify.app')).toBeNull();
    expect(passkeySite('https://write.elum.services')).toBeNull();
    expect(passkeySite('http://elumaccounts.netlify.app')).toBeNull();
    expect(passkeySite('https://elumaccounts.netlify.app.evil.example')).toBeNull();
    expect(passkeySite('https://elumaccounts.netlify.app/path')).toBeNull();
    expect(passkeySite(null)).toBeNull();
    expect(passkeySite('null')).toBeNull();
  });
});

it('names passkeys and finds the caller', () => {
  expect(passkeyName('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)')).toBe('iPhone');
  expect(passkeyName('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)')).toBe('Mac');
  expect(passkeyName(null)).toBe('Passkey');
  expect(clientIp(new Headers({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' }))).toBe('203.0.113.1');
});
