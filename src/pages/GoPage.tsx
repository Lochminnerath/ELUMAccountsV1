import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, errorMessage } from '../api';
import { AccountMark } from '../components/Brand';
import { FullPageLoader } from '../components/Loader';
import { APPS, type AppId } from '../lib/apps';
import { SupportLinks } from '../components/SupportLink';

/** /go/<app>: opens another ELUM app, already signed in. */
export function GoPage() {
  const { app } = useParams<{ app: string }>();
  const target = APPS[app as AppId];
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!target?.url) {
      setError('That ELUM app is not open yet.');
      return;
    }
    if (api.mode === 'local') {
      window.location.assign(target.url);
      return;
    }
    api.handoff(`${target.url}/auth/handoff`, '/').then(
      (url) => window.location.assign(url),
      // Signing in there may not be possible yet (an older version of the app): open it plainly.
      (e) => (target.url ? window.location.assign(target.url) : setError(errorMessage(e))),
    );
  }, [target]);

  if (!error) return <FullPageLoader label={target ? `Opening ${target.name}` : 'Opening'} />;
  return (
    <div className="empty-state" style={{ minHeight: '100%', justifyContent: 'center' }}>
      <AccountMark size={72} />
      <h2>We could not open that</h2>
      <p>{error}</p>
      <Link to="/" className="elum-btn elum-btn--primary">
        Back to your account
      </Link>
      <SupportLinks app="account" code="open-failed" message={error} />
    </div>
  );
}
