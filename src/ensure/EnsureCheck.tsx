import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { Challenge, Ensure, EnsureAction } from './ensure';
import './ensure.css';
import { friendly } from '../lib/friendly';

/** How long the ring has to be held. Long enough to be deliberate, short enough not to annoy. */
const HOLD_MS = 1100;

type Step = 'loading' | 'ready' | 'holding' | 'checking' | 'done' | 'error';

/**
 * ELUM Ensure: "Press and hold to confirm you are a person." While the person holds the ring,
 * the browser finishes a small work puzzle in the background; letting go early starts the ring
 * again. When both are done, the answer and how the press went go to ELUM, and a one-time pass
 * comes back through onPass. Works with a mouse, a finger, or Space/Enter on the keyboard.
 */
export function EnsureCheck({
  ensure,
  action,
  onPass,
  compact = false,
}: {
  ensure: Ensure;
  action: EnsureAction;
  onPass: (pass: string | null) => void;
  compact?: boolean;
}) {
  const [step, setStep] = useState<Step>('loading');
  const [message, setMessage] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const ring = useRef<HTMLButtonElement>(null);
  const shown = useRef(Date.now());
  const challenge = useRef<Challenge | null>(null);
  const answer = useRef<Promise<string> | null>(null);
  const held = useRef({ start: 0, moves: 0, keys: false, frame: 0 });

  // A fresh challenge, solved in the background straight away.
  useEffect(() => {
    let live = true;
    setStep('loading');
    onPass(null);
    ensure
      .challenge(action)
      .then((c) => {
        if (!live) return;
        challenge.current = c;
        answer.current = ensure.solve(c);
        answer.current.catch(() => undefined);
        shown.current = Date.now();
        setStep('ready');
      })
      .catch((e: Error) => {
        if (!live) return;
        setMessage(e.message);
        setStep('error');
      });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensure, action, round]);

  const setFill = (v: number) => ring.current?.style.setProperty('--fill', v.toFixed(3));

  const finish = useCallback(async () => {
    const c = challenge.current;
    if (!c || !answer.current) return;
    setStep('checking');
    try {
      const nonce = await answer.current;
      const pass = await ensure.verify(c, nonce, {
        hold: Math.round(performance.now() - held.current.start),
        moves: held.current.moves,
        keys: held.current.keys,
        elapsed: Date.now() - shown.current,
      });
      setStep('done');
      setMessage(null);
      onPass(pass);
    } catch (e) {
      setMessage(friendly(e instanceof Error ? e.message : 'The check did not go through. Try it again.'));
      setStep('error');
    }
  }, [ensure, onPass]);

  const start = (keys: boolean) => {
    if (step !== 'ready') return;
    held.current = { start: performance.now(), moves: 0, keys, frame: 0 };
    setStep('holding');
    const tick = () => {
      const p = Math.min(1, (performance.now() - held.current.start) / HOLD_MS);
      setFill(p);
      if (p < 1) held.current.frame = requestAnimationFrame(tick);
      else void finish();
    };
    held.current.frame = requestAnimationFrame(tick);
  };
  const stop = () => {
    if (step !== 'holding') return;
    if (performance.now() - held.current.start >= HOLD_MS) return;
    cancelAnimationFrame(held.current.frame);
    setFill(0);
    setStep('ready');
  };
  useEffect(() => () => cancelAnimationFrame(held.current.frame), []);

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    start(false);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault();
      start(true);
    }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ' || e.key === 'Enter') stop();
  };

  const label =
    step === 'loading'
      ? 'Getting ready…'
      : step === 'holding'
        ? 'Keep holding…'
        : step === 'checking'
          ? 'Checking…'
          : step === 'done'
            ? 'Thanks, you are all set.'
            : step === 'error'
              ? message ?? 'The check did not go through.'
              : 'Press and hold to confirm you are a person';

  return (
    <div className={`ensure${compact ? ' ensure--compact' : ''}`} data-step={step}>
      <button
        ref={ring}
        type="button"
        className="ensure__ring"
        aria-label={step === 'done' ? 'Confirmed' : 'Press and hold to confirm you are a person'}
        aria-describedby="ensure-status"
        disabled={step === 'loading' || step === 'checking' || step === 'done'}
        onPointerDown={onPointerDown}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        onPointerMove={() => step === 'holding' && held.current.moves++}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle className="ensure__track" cx="24" cy="24" r="20" />
          <circle className="ensure__fill" cx="24" cy="24" r="20" pathLength={1} />
          <circle className="ensure__a" cx="28.5" cy="19.5" r="9" />
          <circle className="ensure__b" cx="19.5" cy="28.5" r="9" />
          <path className="ensure__tick" d="M17 24.5l4.6 4.6L31.5 19" />
        </svg>
      </button>
      <div className="ensure__copy">
        <p id="ensure-status" className="ensure__label" role="status" aria-live="polite">
          {label}
        </p>
        {step === 'error' ? (
          <button type="button" className="ensure__again" onClick={() => setRound((r) => r + 1)}>
            Try again
          </button>
        ) : (
          <p className="ensure__by">ELUM Ensure · no tracking, no AI</p>
        )}
      </div>
    </div>
  );
}
