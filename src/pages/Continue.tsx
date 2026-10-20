import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { api, errorMessage } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { AccountMark } from '../components/Brand';
import { FullPageLoader } from '../components/Loader';
import { appFor } from '../lib/apps';

/**
 * /continue?to=<app>/auth/handoff&next=<path>: an ELUM app with no session sends people here.
 * Signed in already, they go straight back, signed in there too. Otherwise they sign in first.
 *
 * With quiet=1 the app is only asking: signed out here (or waiting for approval), they go straight
 * back as they were, with #quiet=none, and never see a sign-in page.
 */
export function ContinuePage() {
  const [params] = useSearchParams();
  const { status } = useAuth();
  const navigate = useNavigate();
  const to = params.get('to') ?? '';
  const next = params.get('next') ?? '/';
  const app = appFor(to);
  const quiet = params.get('quiet') === '1';
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (quiet && status !== 'signed-in') {
      window.location.replace(quietAnswer(to, next));
      return;
    }
    if (status === 'signed-out') {
      navigate(`/signin?${new URLSearchParams({ to, next }).toString()}`, { replace: true });
      return;
    }
    api.handoff(to, next).then(
      (url) => window.location.replace(url),
      (e) => setError(errorMessage(e)),
    );
  }, [status, to, next, quiet, navigate]);

  if (!error) return <FullPageLoader label={app ? `Signing you in to ${app.name}` : 'Signing you in'} />;
  return (
    <div className="empty-state" style={{ minHeight: '100%', justifyContent: 'center' }}>
      <AccountMark size={72} />
      <h2>We could not sign you in there</h2>
      <p>{error}</p>
      <Link to="/" className="elum-btn elum-btn--primary">
        Go to your account
      </Link>
    </div>
  );
}

/**
 * Where a quiet check goes back to when the person is not signed in: the ELUM app's own handoff
 * page, saying so (#quiet=none). Anything that is not an ELUM app's handoff page stays here.
 */
export function quietAnswer(to: string, next: string): string {
  try {
    const url = new URL(to);
    if (appFor(to) && url.pathname === '/auth/handoff' && !url.username && !url.password) {
      return `${url.origin}/auth/handoff#${new URLSearchParams({ quiet: 'none', next }).toString()}`;
    }
  } catch {
    // Not an address.
  }
  return '/';
}

/**
 * /auth/handoff#token_hash=...: another ELUM app (Write, Type) sent someone here signed in.
 * The token signs them in on this site once; then they land on `next`.
 */
export function HandoffPage() {
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const tokenHash = fragment.get('token_hash');
    const next = fragment.get('next') ?? '/';
    // The token works once; take it out of the address bar and history straight away.
    history.replaceState(null, '', window.location.pathname);
    if (!tokenHash) {
      setError('This sign-in link is not complete. Sign in instead.');
      return;
    }
    api.completeHandoff(tokenHash).then(
      async () => {
        await refresh().catch(() => undefined);
        window.location.replace(next.startsWith('/') && !next.startsWith('//') ? next : '/');
      },
      (e) => setError(errorMessage(e)),
    );
  }, [refresh]);

  if (!error) return <FullPageLoader label="Signing you in" />;
  return (
    <div className="empty-state" style={{ minHeight: '100%', justifyContent: 'center' }}>
      <AccountMark size={72} />
      <h2>We could not sign you in</h2>
      <p>{error}</p>
      <Link to="/signin" className="elum-btn elum-btn--primary">
        Sign in
      </Link>
    </div>
  );
}

/** /signout?to=<app url>: an app signed out; sign out here too, then go back. */
export function SignOutPage() {
  const [params] = useSearchParams();
  const { signOut } = useAuth();
  useEffect(() => {
    const to = params.get('to') ?? '';
    void signOut().finally(() => window.location.replace(appFor(to) ? to : '/signin'));
  }, [params, signOut]);
  return <FullPageLoader label="Signing you out" />;
}
