/// <reference lib="webworker" />
import { solve } from './sha256';

/** Solves ELUM Ensure's work puzzle off the main thread, so the page never stutters. */
self.onmessage = (e: MessageEvent<{ salt: string; bits: number }>) => {
  const { salt, bits } = e.data;
  const nonce = solve(salt, bits, (tried) => self.postMessage({ tried }));
  self.postMessage({ nonce });
};
