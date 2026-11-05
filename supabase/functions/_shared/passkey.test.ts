import { describe, expect, it } from 'vitest';
import { clientIp, passkeyName, passkeySite } from './passkey';

describe('passkey sites', () => {
  it('use elum.space itself as the passkey site for every ELUM app on it', () => {
    expect(passkeySite('https://account.elum.space')).toEqual({ origin: 'https://account.elum.space', rpId: 'elum.space' });
    expect(passkeySite('https://write.elum.space')).toEqual({ origin: 'https://write.elum.space', rpId: 'elum.space' });
    expect(passkeySite('https://elum.space')?.rpId).toBe('elum.space');
  });
  it('allow ELUM Account on Netlify, with its hostname as the passkey site', () => {
    expect(passkeySite('https://accountbyelum.netlify.app')).toEqual({ origin: 'https://accountbyelum.netlify.app', rpId: 'accountbyelum.netlify.app' });
    expect(passkeySite('https://accountsbyelum.netlify.app')?.rpId).toBe('accountsbyelum.netlify.app');
    expect(passkeySite('http://localhost:5175')?.rpId).toBe('localhost');
  });
  it('refuse everything else', () => {
    expect(passkeySite('https://writebyelum.netlify.app')).toBeNull();
    expect(passkeySite('http://write.elum.space')).toBeNull();
    expect(passkeySite('https://elum.space.evil.example')).toBeNull();
    expect(passkeySite('https://evilelum.space')).toBeNull();
    expect(passkeySite('http://accountsbyelum.netlify.app')).toBeNull();
    expect(passkeySite('https://accountsbyelum.netlify.app.evil.example')).toBeNull();
    expect(passkeySite('https://accountsbyelum.netlify.app/path')).toBeNull();
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
