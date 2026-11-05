import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, errorMessage } from '../api';
import { MIN_PASSWORD } from '../api/validation';
import { HiddenIcon, VisibleIcon } from '../components/icons/ElumIcons';
import '../security/Approvals.css';
import './pages.css';

/**
 * /password: the page the "Reset your ELUM password" email opens. The link signs this browser in,
 * and for the next 15 minutes a new password can be set here. Anywhere else it only points to
 * Security, where the link is sent.
 */
export function PasswordPage() {
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const allowed = api.canChangePassword();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(password);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const shell = (children: React.ReactNode) => (
    <div className="approval approval--page">
      <div className="approval__card">
        <img className="approval__logo approval__logo--light" src="/brand/logos/elum-lockup-horizontal.svg" alt="ELUM" width={126} height={40} />
        <img className="approval__logo approval__logo--dark" src="/brand/logos/elum-lockup-horizontal-reversed.svg" alt="" width={126} height={40} />
        {children}
        <p className="approval__hint approval__footer">Made by you. Runs without AI.</p>
      </div>
    </div>
  );

  if (done) {
    return shell(
      <>
        <span className="approval__disc approval__disc--done" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="44" height="44" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <h1 className="approval__title">Password changed</h1>
        <Link to="/" className="elum-btn elum-btn--primary">
          Go to your account
        </Link>
      </>,
    );
  }

  if (!allowed) {
    return shell(
      <>
        <h1 className="approval__title">Open the link from your email</h1>
        <p className="approval__text">To change your password, ask for a link on the Security page, then open it. The link works for one hour, and this page for 15 minutes after.</p>
        <Link to="/security" className="elum-btn elum-btn--primary">
          Go to Security
        </Link>
      </>,
    );
  }

  return shell(
    <>
      <p className="approval__eyebrow">Secure page · Password</p>
      <h1 className="approval__title">Choose a new password</h1>
      <form className="password-page__form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="p-new">New password</label>
          <div className="password-field">
            <input id="p-new" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="icon-btn password-field__reveal" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((v) => !v)}>
              {show ? <HiddenIcon size={18} strokeWidth={1.75} /> : <VisibleIcon size={18} strokeWidth={1.75} />}
            </button>
          </div>
          <span className="muted panel__hint">At least {MIN_PASSWORD} characters.</span>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="elum-btn elum-btn--primary" disabled={busy || password.length < MIN_PASSWORD}>
          Change password
        </button>
      </form>
    </>,
  );
}
