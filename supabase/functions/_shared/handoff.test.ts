import { describe, expect, it } from 'vitest';
import { cleanAddress, handoffTarget, handoffUrl, parseOrigins, safePath, sixDigitCode } from './handoff';

const allowed = parseOrigins(undefined);

describe('handoff targets', () => {
  it('allow only the handoff page of an ELUM app', () => {
    expect(handoffTarget('https://writebyelum.netlify.app/auth/handoff', allowed)?.origin).toBe('https://writebyelum.netlify.app');
    expect(handoffTarget('https://writebyelum.netlify.app/d/123', allowed)).toBeNull();
    expect(handoffTarget('https://evil.example/auth/handoff', allowed)).toBeNull();
    expect(handoffTarget('https://writebyelum.netlify.app.evil.example/auth/handoff', allowed)).toBeNull();
    expect(handoffTarget('http://writebyelum.netlify.app/auth/handoff', allowed)).toBeNull();
    expect(handoffTarget('https://user:pass@writebyelum.netlify.app/auth/handoff', allowed)).toBeNull();
    expect(handoffTarget('javascript:alert(1)', allowed)).toBeNull();
  });
  it('signs people in to every ELUM app, ELUM Store and Browse included', () => {
    for (const app of ['browsebyelum', 'storebyelum', 'makebyelum', 'typebyelum', 'inquirebyelum', 'accountsbyelum']) {
      expect(handoffTarget(`https://${app}.netlify.app/auth/handoff`, allowed)?.origin).toBe(`https://${app}.netlify.app`);
    }
  });
  it('accepts every ELUM app on elum.services, and nothing that only looks like it', () => {
    expect(handoffTarget('https://type.elum.services/auth/handoff', allowed)?.origin).toBe('https://type.elum.services');
    expect(handoffTarget('https://write.elum.services/auth/handoff', [])).not.toBeNull();
    expect(handoffTarget('https://elum.services.evil.example/auth/handoff', allowed)).toBeNull();
    expect(handoffTarget('https://evilelum.services/auth/handoff', allowed)).toBeNull();
    expect(handoffTarget('http://type.elum.services/auth/handoff', allowed)).toBeNull();
  });
  it('can add sites, including local development, and never drops the built-in apps', () => {
    const list = parseOrigins('http://localhost:5173/, https://write.elum.services');
    expect(handoffTarget('http://localhost:5173/auth/handoff', list)).not.toBeNull();
    expect(handoffTarget('https://writebyelum.netlify.app/auth/handoff', list)).not.toBeNull();
    expect(handoffTarget('https://elsewhere.netlify.app/auth/handoff', list)).toBeNull();
  });
  it('carries the token in the fragment and keeps paths local', () => {
    const url = handoffUrl(new URL('https://writebyelum.netlify.app/auth/handoff'), 'abc', '/d/9f1c');
    expect(url).toBe('https://writebyelum.netlify.app/auth/handoff#token_hash=abc&type=email&next=%2Fd%2F9f1c');
    expect(safePath('//evil.example')).toBe('/');
    expect(safePath('https://evil.example')).toBe('/');
    expect(safePath('/t/1?x=2')).toBe('/t/1?x=2');
  });
});

it('codes and addresses', () => {
  expect(sixDigitCode(() => new Uint32Array([7]))).toBe('000007');
  expect(cleanAddress(' Ada@Example.org ')).toBe('ada@example.org');
  expect(cleanAddress('nope')).toBeNull();
});
