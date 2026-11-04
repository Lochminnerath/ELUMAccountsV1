import { solve } from './sha256';

/**
 * ELUM Ensure, from an app's side: ask whether a check is needed, get a challenge, solve its work
 * puzzle in the background, and trade the answer (with how the press went) for a one-time pass.
 * It talks to the ELUM database's elum_ensure_* functions with the public key only, so it works
 * signed out. Copy this folder into any ELUM app and give it the project's address and key.
 */
export type EnsureAction = 'sign_up' | 'sign_in' | 'submit' | 'send' | 'reset' | 'upload' | 'share';

export interface Challenge {
  id: string;
  salt: string;
  bits: number;
  level: number;
  expiresAt: string;
}

export interface Signals {
  /** How long the ring was held, in milliseconds. */
  hold: number;
  /** Pointer movements while holding. */
  moves: number;
  /** Held with the keyboard (Space or Enter). */
  keys: boolean;
  /** Milliseconds from showing the check to finishing it. */
  elapsed: number;
}

export interface Ensure {
  needed(action: EnsureAction): Promise<{ needed: boolean; level: number }>;
  challenge(action: EnsureAction): Promise<Challenge>;
  /** Solves the puzzle, off the main thread where the browser allows it. */
  solve(c: Challenge, onProgress?: (tried: number) => void): Promise<string>;
  verify(c: Challenge, nonce: string, signals: Signals): Promise<string>;
  /** Notes something that happened, such as a failed sign-in, so unusual activity is noticed. */
  report(action: EnsureAction, detail: 'failed' | 'succeeded' | 'blocked'): Promise<void>;
}

export class EnsureError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function solveInWorker(c: Challenge, onProgress?: (tried: number) => void): Promise<string> {
  if (typeof Worker === 'undefined') return Promise.resolve(solve(c.salt, c.bits, onProgress));
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./solver.worker.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(solve(c.salt, c.bits, onProgress));
      return;
    }
    worker.onmessage = (e: MessageEvent<{ nonce?: string; tried?: number }>) => {
      if (e.data.nonce !== undefined) {
        worker.terminate();
        resolve(e.data.nonce);
      } else if (e.data.tried !== undefined) onProgress?.(e.data.tried);
    };
    worker.onerror = () => {
      worker.terminate();
      try {
        resolve(solve(c.salt, c.bits, onProgress));
      } catch (err) {
        reject(err);
      }
    };
    worker.postMessage({ salt: c.salt, bits: c.bits });
  });
}

/** ELUM Ensure on the ELUM database. */
export function createEnsure(url: string, key: string): Ensure {
  const call = async <T>(fn: string, args: Record<string, unknown>): Promise<T> => {
    let res: Response;
    try {
      res = await fetch(`${url.replace(/\/+$/, '')}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify(args),
      });
    } catch {
      throw new EnsureError('ELUM could not be reached. Check your connection and try again.', 'offline');
    }
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      const code = (body as { code?: string } | null)?.code;
      const message = (body as { message?: string } | null)?.message;
      throw new EnsureError(code?.startsWith('PT') && message ? message : 'The check did not go through. Try it again.', code);
    }
    return body as T;
  };
  return {
    needed: (action) => call('elum_ensure_needed', { p_action: action }),
    challenge: (action) => call('elum_ensure_challenge', { p_action: action }),
    solve: solveInWorker,
    verify: async (c, nonce, signals) => (await call<{ pass: string }>('elum_ensure_verify', { p_id: c.id, p_nonce: nonce, p_signals: signals })).pass,
    report: (action, detail) => call('elum_ensure_report', { p_action: action, p_detail: detail }),
  };
}

/** For preview mode and tests: the same steps, with no server. */
export function previewEnsure(): Ensure {
  return {
    needed: async (action) => ({ needed: action === 'sign_up', level: 0 }),
    challenge: async () => ({ id: 'preview', salt: 'preview', bits: 8, level: 0, expiresAt: new Date(Date.now() + 180000).toISOString() }),
    solve: async (c) => solve(c.salt, c.bits),
    verify: async () => 'p'.repeat(64),
    report: async () => undefined,
  };
}

/** An ELUM API error that says a check is needed first (elum.ensure_guard raises PT428). */
export const needsEnsure = (e: unknown) => {
  const x = e as { code?: string; message?: string; status?: number } | null;
  return !!x && (x.code === 'PT428' || x.status === 428 || x.message === 'ensure_required');
};
