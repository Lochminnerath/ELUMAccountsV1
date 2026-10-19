import { WarningIcon } from '../components/icons/ElumIcons';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { api, errorMessage } from '../api';
import { useAccount, useAuth } from '../auth/AuthProvider';
import { useToast } from '../components/Toast';
import './pages.css';

/** Deleting the account (handoff 3.7): every service removes what is yours, then the account goes. */
export function DeletePage() {
  const account = useAccount();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const matches = confirm.trim().toLowerCase() === account.email.toLowerCase();

  const remove = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.deleteAccount(confirm);
      await signOut().catch(() => undefined);
      toast('Your account is being deleted');
      navigate('/signin', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <>
      <header className="page__head">
        <h1 className="page__title">Delete account</h1>
        <p className="muted">This ends your ELUM account for every app. It cannot be undone.</p>
      </header>
      <form className="panel panel--danger" onSubmit={remove}>
        <h2 className="panel__title">
          <WarningIcon size={20} strokeWidth={1.75} aria-hidden="true" /> What happens
        </h2>
        <ul className="plain-list">
          <li>Documents you own in Write are deleted. Comments you left elsewhere stay, signed “Former member”.</li>
          <li>Your Type mailbox, drafts and settings are removed. Messages other people received stay with them.</li>
          <li>Your picture, circles and addresses go.</li>
          <li>Every device is signed out straight away.</li>
        </ul>
        <div className="field">
          <label htmlFor="d-confirm">Type {account.email} to confirm</label>
          <input id="d-confirm" className="input" autoComplete="off" spellCheck={false} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="panel__actions">
          <button type="submit" className="elum-btn elum-btn--danger" disabled={!matches || busy}>
            Delete my account
          </button>
        </div>
      </form>
    </>
  );
}
