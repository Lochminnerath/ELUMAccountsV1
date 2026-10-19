import { Laptop, Smartphone } from 'lucide-react';
import { HiddenIcon, VisibleIcon } from '../components/icons/ElumIcons';
import { SignOutIcon } from '../components/icons/ElumIcons';
import { useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage, type Activity, type Device, type SecuritySettings } from '../api';
import { MIN_PASSWORD } from '../api/validation';
import { Loader } from '../components/Loader';
import { useToast } from '../components/Toast';
import { formatFull, formatWhen } from '../lib/time';
import './pages.css';

const ACTIONS: Record<string, string> = {
  'account.created': 'Account created',
  'profile.updated': 'Profile changed',
  'profile.picture_changed': 'Picture changed',
  'privacy.changed': 'Privacy changed',
  'people.blocked': 'Someone blocked',
  'address.added': 'Address added',
  'address.removed': 'Address removed',
  'password.changed': 'Password changed',
  'sessions.revoked': 'Signed out of other devices',
  'sessions.revoked_one': 'Signed out of a device',
  'security.approvals_on': 'Sign-in approvals turned on',
  'security.approvals_off': 'Sign-in approvals turned off',
  'security.sign_in_approved': 'New sign-in approved',
  'security.sign_in_denied': 'New sign-in stopped',
};

/** A readable name for a browser's user agent: "Firefox on Linux", "Safari on iPhone". */
export function deviceName(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'A browser';
  const os = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac OS X/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : /Linux/.test(ua) ? 'Linux' : 'another system';
  return `${browser} on ${os}`;
}

/** Password, signed-in devices and recent activity (handoff 3.8). */
export function SecurityPage() {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [activity, setActivity] = useState<Activity[] | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);

  const load = () => {
    api.devices().then(setDevices, () => setDevices([]));
    api.activity().then(setActivity, () => setActivity([]));
    api.security().then(setSecurity, () => setSecurity(null));
  };
  useEffect(load, []);

  const change = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.changePassword(password);
      setPassword('');
      toast('Password changed. Use it next time you sign in.', { tone: 'success' });
      load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const setApprovals = async (on: boolean) => {
    try {
      setSecurity(await api.setSignInApprovals(on));
      toast(on ? 'New sign-ins now wait for your approval' : 'New sign-ins no longer need approval', { tone: 'success' });
      load();
    } catch (e) {
      toast(errorMessage(e), { tone: 'error' });
    }
  };

  const signOutDevice = async (d: Device) => {
    try {
      await api.signOutDevice(d.id);
      toast(`${deviceName(d.userAgent)} is signed out`, { tone: 'success' });
      load();
    } catch (e) {
      toast(errorMessage(e), { tone: 'error' });
    }
  };

  return (
    <>
      <header className="page__head">
        <h1 className="page__title">Security</h1>
        <p className="muted">Keep your account yours.</p>
      </header>

      <section className="panel security-approvals" aria-labelledby="s-approve">
        <div className="security-approvals__row">
          <span className="security-approvals__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
              <path d="M12 3l7 3v5.5c0 4.2-2.9 7.6-7 9.5-4.1-1.9-7-5.3-7-9.5V6l7-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M8.8 11.8l2.2 2.2 4.2-4.4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="security-approvals__text">
            <h2 id="s-approve" className="panel__title">Approve new sign-ins</h2>
            <p className="muted panel__hint">
              When someone signs in with your password on a new device, they get nothing until you approve it from a device that is already signed in. ELUM Type, this
              page and every ELUM app ask “Is this you signing in?”, and you pick the number the new device shows. A wrong number or “No, it's not me” signs them out.
            </p>
          </div>
          <input
            type="checkbox"
            className="switch"
            role="switch"
            aria-labelledby="s-approve"
            checked={!!security?.approveSignIns}
            disabled={!security}
            onChange={(e) => void setApprovals(e.target.checked)}
          />
        </div>
        {security?.approveSignIns && (
          <p className="security-approvals__note">
            The devices below are trusted. Sign out any you do not recognise. Lost every device? “Forgot password” on the sign-in page still gets you in: the email
            link counts as approval.
          </p>
        )}
      </section>

      <form className="panel" aria-labelledby="s-pass" onSubmit={change}>
        <h2 id="s-pass" className="panel__title">Change your password</h2>
        <div className="field">
          <label htmlFor="s-new">New password</label>
          <div className="password-field">
            <input id="s-new" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="icon-btn password-field__reveal" aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} onClick={() => setShow((v) => !v)}>
              {show ? <HiddenIcon size={18} strokeWidth={1.75} /> : <VisibleIcon size={18} strokeWidth={1.75} />}
            </button>
          </div>
          <span className="muted panel__hint">At least {MIN_PASSWORD} characters. Other devices stay signed in until you sign them out below.</span>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="panel__actions">
          <button type="submit" className="elum-btn elum-btn--primary" disabled={busy || password.length < MIN_PASSWORD}>
            Change password
          </button>
        </div>
      </form>

      <section className="panel" aria-labelledby="s-devices">
        <h2 id="s-devices" className="panel__title">Signed-in devices</h2>
        <p className="muted panel__hint">Each phone, computer and browser signs in once. After that, Write, Type and the rest open signed in.</p>
        {devices === null ? (
          <Loader size={28} label="Loading devices" />
        ) : (
          <ul className="device-list">
            {devices.map((d) => (
              <li key={d.id} className="device-row">
                {/iPhone|Android|iPad/.test(d.userAgent ?? '') ? <Smartphone size={20} strokeWidth={1.75} /> : <Laptop size={20} strokeWidth={1.75} />}
                <span className="device-row__text">
                  <span className="device-row__name">
                    {deviceName(d.userAgent)}
                    {d.current && <span className="badge">This device</span>}
                  </span>
                  <span className="device-row__meta" title={formatFull(d.lastActiveAt)}>
                    Active {formatWhen(d.lastActiveAt).toLowerCase()}
                    {d.ip ? ` · ${d.ip}` : ''}
                  </span>
                </span>
                {!d.current && (
                  <button type="button" className="elum-btn elum-btn--secondary elum-btn--sm device-row__out" onClick={() => void signOutDevice(d)}>
                    Sign out
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="panel__actions">
          <button
            type="button"
            className="elum-btn elum-btn--secondary"
            onClick={() =>
              api.signOutOtherDevices().then(
                () => {
                  toast('Every other device is signed out', { tone: 'success' });
                  load();
                },
                (e) => toast(errorMessage(e), { tone: 'error' }),
              )
            }
          >
            <SignOutIcon size={18} strokeWidth={1.75} />
            Sign out every other device
          </button>
        </div>
      </section>

      <section className="panel" aria-labelledby="s-activity">
        <h2 id="s-activity" className="panel__title">Recent activity</h2>
        {activity === null ? (
          <Loader size={28} label="Loading activity" />
        ) : activity.length === 0 ? (
          <p className="muted panel__hint">Nothing yet.</p>
        ) : (
          <ul className="activity-list">
            {activity.map((a, i) => (
              <li key={i} className="activity-row">
                <span>{ACTIONS[a.action] ?? a.action}</span>
                <time className="muted" dateTime={a.at} title={formatFull(a.at)}>
                  {formatWhen(a.at)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
