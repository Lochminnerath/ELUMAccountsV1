import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { EnsureCheck } from './EnsureCheck';
import { EnsureError, type Ensure, type EnsureAction } from './ensure';

/**
 * For actions that only check when something looks unusual (sending a form, signing in from a
 * busy address): when ELUM says a check is needed, `ask(action)` opens a small window with the
 * press-and-hold ring and resolves with the pass, or rejects if the person closes it.
 *
 *   const gate = useEnsureGate(ensure);
 *   try { await send(); } catch (e) { if (needsEnsure(e)) await send(await gate.ask('submit')); }
 *   return <>{form}{gate.element}</>;
 */
export function useEnsureGate(ensure: Ensure): { ask: (action: EnsureAction) => Promise<string>; element: ReactNode } {
  const [req, setReq] = useState<{ action: EnsureAction; resolve: (pass: string) => void; reject: (e: Error) => void } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const ask = useCallback((action: EnsureAction) => new Promise<string>((resolve, reject) => setReq({ action, resolve, reject })), []);
  const close = useCallback(() => {
    req?.reject(new EnsureError('The check was closed.', 'cancelled'));
    setReq(null);
  }, [req]);

  useEffect(() => {
    if (!req) return;
    box.current?.querySelector<HTMLButtonElement>('.ensure__ring')?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [req, close]);

  const element = req ? (
    <div className="ensure-gate" role="dialog" aria-modal="true" aria-labelledby="ensure-gate-title">
      <div className="ensure-gate__box" ref={box}>
        <h2 id="ensure-gate-title">One more step</h2>
        <p>There has been a lot of activity from your connection, so ELUM needs to check that a person is here before carrying on.</p>
        <EnsureCheck
          ensure={ensure}
          action={req.action}
          onPass={(pass) => {
            if (!pass) return;
            req.resolve(pass);
            setReq(null);
          }}
        />
        <button type="button" className="ensure-gate__close" onClick={close}>
          Not now
        </button>
      </div>
    </div>
  ) : null;
  return { ask, element };
}
