import { describe, expect, it } from 'vitest';
import { sha256, solve, zeroBits } from './sha256';

const hex = (b: Uint8Array) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

describe('ELUM Ensure work puzzle', () => {
  it('hashes like SHA-256', () => {
    expect(hex(sha256(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(hex(sha256('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(hex(sha256('a'.repeat(100)))).toBe('2816597888e4a0d3a36b82b83316ab32680eb8f00f8cd3b904d681246d285a0e');
  });

  it('counts leading zero bits', () => {
    expect(zeroBits(new Uint8Array([0, 0xff]))).toBe(8);
    expect(zeroBits(new Uint8Array([0x0f]))).toBe(4);
    expect(zeroBits(new Uint8Array([0x80]))).toBe(0);
  });

  it('finds an answer the database will accept', () => {
    const nonce = solve('salt-for-a-test', 10);
    expect(zeroBits(sha256(`salt-for-a-test:${nonce}`))).toBeGreaterThanOrEqual(10);
  });
});
