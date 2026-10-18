import { Camera, Check, Trash2 } from 'lucide-react';
import { useRef, useState, type FormEvent } from 'react';
import { api, errorMessage } from '../api';
import { useAccount, useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { Loader } from '../components/Loader';
import { useToast } from '../components/Toast';
import { COLORS } from '../api/local/LocalAccountApi';
import { deviceLanguage, deviceTimeZone, LANGUAGES, timeZones } from '../lib/locale';
import { squarePicture } from '../lib/picture';
import './pages.css';

const COLOR_NAMES: Record<string, string> = {
  '#f59a52': 'Apricot',
  '#3fc4a0': 'Mint',
  '#9b84ee': 'Violet',
  '#ec7fa9': 'Rose',
  '#e9b949': 'Gold',
  '#7093f8': 'ELUM blue',
};

/** Picture, name, colour, language and time zone: how you appear in every ELUM app. */
export function ProfilePage() {
  const account = useAccount();
  const { setAccount } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(account.name);
  const [locale, setLocale] = useState(account.locale ?? deviceLanguage());
  const [timeZone, setTimeZone] = useState(account.timeZone ?? deviceTimeZone());
  const [busy, setBusy] = useState<'picture' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const zones = timeZones();

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('save');
    setError(null);
    try {
      setAccount(await api.updateProfile({ name, locale, timeZone }));
      toast('Saved. Every ELUM app uses this now.', { tone: 'success' });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const choosePicture = async (file: File) => {
    setBusy('picture');
    setError(null);
    try {
      setAccount(await api.setPicture(await squarePicture(file)));
      toast('Picture updated', { tone: 'success' });
    } catch (err) {
      setError(err instanceof Error && !('code' in err) ? err.message : errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <header className="page__head">
        <h1 className="page__title">Profile</h1>
        <p className="muted">How you appear in Write, Type and every ELUM app.</p>
      </header>

      <section className="panel" aria-labelledby="p-picture">
        <h2 id="p-picture" className="panel__title">Profile picture</h2>
        <div className="picture-row">
          <div className="picture-row__avatar">
            <Avatar user={account} size={112} />
            {busy === 'picture' && (
              <span className="picture-row__busy">
                <Loader size={32} label="Uploading" />
              </span>
            )}
          </div>
          <div className="picture-row__actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void choosePicture(f);
              }}
            />
            <button type="button" className="elum-btn elum-btn--secondary" disabled={!!busy} onClick={() => fileRef.current?.click()}>
              <Camera size={18} strokeWidth={1.75} />
              {account.pictureUrl ? 'Change picture' : 'Add a picture'}
            </button>
            {account.pictureUrl && (
              <button
                type="button"
                className="elum-btn elum-btn--quiet"
                disabled={!!busy}
                onClick={() => api.removePicture().then(setAccount, (e) => setError(errorMessage(e)))}
              >
                <Trash2 size={18} strokeWidth={1.75} />
                Remove
              </button>
            )}
            <p className="muted panel__hint">
              We crop it to a square in your browser. Who can see it is up to you, under Privacy. Without a picture, people see your initials.
            </p>
          </div>
        </div>
      </section>

      <form className="panel" aria-labelledby="p-details" onSubmit={save}>
        <h2 id="p-details" className="panel__title">Details</h2>
        <div className="field">
          <label htmlFor="p-name">Name</label>
          <input id="p-name" className="input" value={name} maxLength={80} autoComplete="name" onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="p-lang">Language</label>
            <select id="p-lang" className="select select--lg" value={locale} onChange={(e) => setLocale(e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name}
                </option>
              ))}
            </select>
            <span className="muted panel__hint">Dates, times and numbers follow it in every app.</span>
          </div>
          <div className="field">
            <label htmlFor="p-tz">Time zone</label>
            <select id="p-tz" className="select select--lg" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="panel__actions">
          <button type="submit" className="elum-btn elum-btn--primary" disabled={busy === 'save' || !name.trim()}>
            {busy === 'save' ? <Loader size={18} brand label="Saving" /> : null}
            Save
          </button>
        </div>
      </form>

      <section className="panel" aria-labelledby="p-colour">
        <h2 id="p-colour" className="panel__title">Colour</h2>
        <p className="muted panel__hint">Your initials sit on this colour when there is no picture.</p>
        <div className="swatches" role="radiogroup" aria-label="Colour">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={account.color === c}
              aria-label={COLOR_NAMES[c]}
              data-tip={COLOR_NAMES[c]}
              className="swatch"
              style={{ background: c }}
              onClick={() => api.updateProfile({ color: c }).then(setAccount, (e) => setError(errorMessage(e)))}
            >
              {account.color === c && <Check size={18} strokeWidth={2.5} />}
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
