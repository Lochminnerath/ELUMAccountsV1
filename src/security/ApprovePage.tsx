import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { api } from '../api';
import { linkSignIn, answerLinkSignIn, type LinkSignIn } from './approvals';
import './Approvals.css';

const sb = api.mode === 'remote' ? (api as unknown as { sb: SupabaseClient }).sb : null;

/** The token from /approve#<token>, taken out of the address bar and history straight away. */
function takeToken(): string {
  const token = window.location.hash.slice(1);
  if (token) history.replaceState(null, '', window.location.pathname);
  return token;
}

type Done = 'approved' | 'denied' | 'wrong';

/**
 * /approve#<token>: the secure page the "Is this you signing in?" email opens. It shows the device
 * that is signing in and three numbers. The number that device shows approves it; any other, or
 * "No, it is not me", stops it and signs it out. No ELUM sign-in is needed here: the link itself,
 * sent only to the account's own addresses, is the proof.
 */
export function ApprovePage() {
  const [token] = useState(takeToken);
  const [info, setInfo] = useState<LinkSignIn | null>(null);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sb) {
      setInfo({ status: 'missing' });
      return;
    }
    linkSignIn(sb, token).then(setInfo, () => setInfo({ status: 'missing' }));
  }, [token]);

  const answer = async (number: number | null) => {
    if (!sb) return;
    setBusy(true);
    setError(null);
    try {
      const result = await answerLinkSignIn(sb, token, number);
      setDone(result === 'approved' ? 'approved' : number === null ? 'denied' : 'wrong');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="approval approval--page" aria-live="polite">
      <div className="approval__card">
        <img className="approval__logo approval__logo--light" src="/brand/logos/elum-lockup-horizontal.svg" alt="ELUM" width={126} height={40} />
        <img className="approval__logo approval__logo--dark" src="/brand/logos/elum-lockup-horizontal-reversed.svg" alt="" width={126} height={40} />
        {children}
        <p className="approval__hint approval__footer">Made by you. Runs without AI.</p>
      </div>
    </div>
  );

  const stop = (
    <span className="approval__disc approval__disc--stop" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="40" height="40">
        <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    </span>
  );

  if (done === 'approved') {
    return shell(
      <>
        <span className="approval__disc approval__disc--done" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="approval__title">Approved</h1>
        <p className="approval__text">{info?.device ?? 'The other device'} signs in by itself in a moment. You can close this page.</p>
      </>,
    );
  }
  if (done) {
    return shell(
      <>
        {stop}
        <h1 className="approval__title">{done === 'denied' ? 'We stopped that sign-in' : 'That was not the number'}</h1>
        <p className="approval__text">
          {done === 'denied'
            ? 'That device is signed out and gets no access. If it was not you, someone knows your password, so change it now.'
            : 'So we stopped that sign-in and signed that device out. If it was you, sign in again there and pick the number it shows.'}
        </p>
        <a className="elum-btn elum-btn--primary" href="/security">
          Go to Security
        </a>
      </>,
    );
  }

  if (!info) {
    return shell(
      <p className="approval__waiting">
        <span className="approval__dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        Opening the sign-in
      </p>,
    );
  }

  if (info.status !== 'pending' || !info.numbers) {
    const copy = {
      approved: ['This sign-in is already approved', 'Nothing more to do here.'],
      denied: ['This sign-in was stopped', 'That device was signed out. If it was you, sign in again there.'],
      expired: ['This sign-in waited too long', 'A sign-in waits ten minutes. Sign in again on the other device and use the new email.'],
      missing: ['This link does not work', 'It may be incomplete or from an older email. Use the newest one, or sign in again on the other device.'],
      pending: ['This link does not work', 'Use the newest email, or sign in again on the other device.'],
    }[info.status];
    return shell(
      <>
        {stop}
        <h1 className="approval__title">{copy[0]}</h1>
        <p className="approval__text">{copy[1]}</p>
      </>,
    );
  }

  const when = info.at ? new Date(info.at).toLocaleString(undefined, { weekday: 'long', hour: 'numeric', minute: '2-digit' }) : null;
  return shell(
    <>
      <p className="approval__eyebrow">Secure page · Approve new sign-ins</p>
      <h1 className="approval__title">Is this you signing in?</h1>
      <dl className="approval__facts">
        <div>
          <dt>Device</dt>
          <dd>{info.device}</dd>
        </div>
        {info.ip && (
          <div>
            <dt>Internet address</dt>
            <dd>{info.ip}</dd>
          </div>
        )}
        {when && (
          <div>
            <dt>When</dt>
            <dd>{when}</dd>
          </div>
        )}
      </dl>
      <p className="approval__text">Click the number showing on that device.</p>
      <div className="approval-prompt__numbers" role="group" aria-label="The number on the device that is signing in">
        {info.numbers.map((n) => (
          <button key={n} type="button" className="approval-prompt__number" disabled={busy} onClick={() => void answer(n)}>
            {n}
          </button>
        ))}
      </div>
      {error && (
        <p className="approval__error" role="alert">
          {error}
        </p>
      )}
      <button type="button" className="elum-btn elum-btn--secondary approval-prompt__deny" disabled={busy} onClick={() => void answer(null)}>
        No, it is not me
      </button>
      <p className="approval__hint">Not sure? Choose “No, it is not me”. A wrong number also stops the sign-in.</p>
    </>,
  );
}
