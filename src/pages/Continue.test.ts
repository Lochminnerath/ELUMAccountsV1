import { describe, expect, it } from 'vitest';
import { quietAnswer } from './Continue';

describe('a quiet sign-in check', () => {
  it('sends someone who is not signed in back to the ELUM app, as they were', () => {
    expect(quietAnswer('https://elumbrowse.netlify.app/auth/handoff', '/search?q=fox')).toBe(
      'https://elumbrowse.netlify.app/auth/handoff#quiet=none&next=%2Fsearch%3Fq%3Dfox',
    );
    expect(quietAnswer('https://elumstore.netlify.app/auth/handoff', '/apps/make')).toMatch(/^https:\/\/elumstore\.netlify\.app\/auth\/handoff#quiet=none/);
  });

  it('never sends anyone anywhere but an ELUM app’s handoff page', () => {
    expect(quietAnswer('https://evil.example/auth/handoff', '/')).toBe('/');
    expect(quietAnswer('https://elumbrowse.netlify.app/somewhere', '/')).toBe('/');
    expect(quietAnswer('https://user:pw@elumbrowse.netlify.app/auth/handoff', '/')).toBe('/');
    expect(quietAnswer('javascript:alert(1)', '/')).toBe('/');
    expect(quietAnswer('', '/')).toBe('/');
  });
});
