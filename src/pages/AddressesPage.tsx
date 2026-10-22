import { AtSign, Plus } from 'lucide-react';
import { VerifiedIcon } from '../components/icons/ElumIcons';
import { DeleteIcon } from '../components/icons/ElumIcons';
import { useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api';
import { LocalAccountApi } from '../api/local/LocalAccountApi';
import { isEmail } from '../api/validation';
import { useAccount, useAuth } from '../auth/AuthProvider';
import { useToast } from '../components/Toast';
import './pages.css';

const KIND: Record<string, string> = { login: 'Signs you in', type: 'Your ELUM Type address', alias: 'Added address' };

/** Every address that reaches your account (handoff 3.3): add one with a code, remove added ones. */
export function AddressesPage() {
  const account = useAccount();
  const { refresh } = useAuth();
  const toast = useToast();
  const [address, setAddress] = useState('');
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async (e: FormEvent) => {
    e.preventDefault();
    if (!isEmail(address)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.startAddress(address);
      const local = api instanceof LocalAccountApi ? api.lastCode : null;
      toast(local ? `Not connected to ELUM, so here is the code: ${local.code}` : `We sent a code to ${address}`, { tone: 'success', duration: 9000 });
      setAddress('');
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (a: string) => {
    try {
      await api.confirmAddress(a, codes[a] ?? '');
      toast(`${a} is on your account`, { tone: 'success' });
      await refresh();
    } catch (err) {
      toast(errorMessage(err), { tone: 'error', cause: err, code: 'addresses-failed' });
    }
  };

  return (
    <>
      <header className="page__head">
        <h1 className="page__title">Addresses</h1>
        <p className="muted">Shares, invites and messages sent to any of these reach you. Added addresses also help you get back in.</p>
      </header>

      <ul className="panel address-list">
        {account.addresses.map((a) => (
          <li key={a.address} className="address-row">
            <AtSign size={18} strokeWidth={1.75} aria-hidden="true" />
            <span className="address-row__text">
              <span className="address-row__address mono">{a.address}</span>
              <span className="address-row__kind">
                {KIND[a.kind]}
                {a.verified && (
                  <>
                    {' · '}
                    <VerifiedIcon size={14} strokeWidth={2} aria-hidden="true" /> confirmed
                  </>
                )}
              </span>
            </span>
            {a.kind === 'alias' && (
              <button
                type="button"
                className="icon-btn icon-btn--round"
                aria-label={`Remove ${a.address}`}
                data-tip="Remove"
                onClick={() =>
                  api.removeAddress(a.address).then(
                    () => refresh(),
                    (e) => toast(errorMessage(e), { tone: 'error', cause: e, code: 'addresses-failed' }),
                  )
                }
              >
                <DeleteIcon size={18} strokeWidth={1.75} />
              </button>
            )}
          </li>
        ))}
      </ul>

      {account.pendingAddresses.map((a) => (
        <form
          key={a}
          className="panel panel--notice"
          onSubmit={(e) => {
            e.preventDefault();
            void confirm(a);
          }}
        >
          <h2 className="panel__title">Confirm {a}</h2>
          <p className="muted panel__hint">Enter the 6-digit code we sent there. It works for 30 minutes.</p>
          <div className="field-inline">
            <input
              className="input mono code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              aria-label={`Code for ${a}`}
              value={codes[a] ?? ''}
              onChange={(e) => setCodes((c) => ({ ...c, [a]: e.target.value.replace(/\D/g, '') }))}
            />
            <button type="submit" className="elum-btn elum-btn--primary" disabled={(codes[a] ?? '').length !== 6}>
              Confirm
            </button>
            <button type="button" className="elum-btn elum-btn--quiet" onClick={() => api.startAddress(a).then(() => toast('We sent a new code'), (e) => toast(errorMessage(e), { tone: 'error', cause: e, code: 'addresses-failed' }))}>
              Send a new code
            </button>
          </div>
        </form>
      ))}

      <form className="panel" aria-labelledby="ad-add" onSubmit={start}>
        <h2 id="ad-add" className="panel__title">Add an address</h2>
        <div className="field-inline">
          <input className="input" type="email" inputMode="email" placeholder="name@example.com" aria-label="Address to add" value={address} onChange={(e) => setAddress(e.target.value)} />
          <button type="submit" className="elum-btn elum-btn--primary" disabled={busy || !address}>
            <Plus size={18} strokeWidth={1.75} />
            Send code
          </button>
        </div>
        {error && <p className="form-error">{error}</p>}
        {!account.addresses.some((a) => a.kind === 'type') && (
          <p className="muted panel__hint">An address on {api.typeDomain}, for email in Type, comes with a Type account. Adding one to an account like yours is coming soon.</p>
        )}
      </form>
    </>
  );
}
