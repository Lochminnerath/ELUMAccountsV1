import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api, errorMessage, isApiError, type Passkey } from '../api';
import { Skeleton } from '../components/Skeleton';
import { useToast } from '../components/Toast';
import { formatFull, formatWhen } from '../lib/time';
import { PASSKEYS_CHANGED } from './PasskeyOffer';
import { PasskeyIcon } from './PasskeyIcon';
import { passkeysSupported } from './passkeys';
import './Passkeys.css';

/** Security > Passkeys: the ones saved on the account, and making a new one on this device. */
export function PasskeysPanel({ onChange }: { onChange?: () => void }) {
  const toast = useToast();
  const [list, setList] = useState<Passkey[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const supported = passkeysSupported();

  const load = useCallback(() => {
    api.passkeys().then(setList, () => setList([]));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener(PASSKEYS_CHANGED, load);
    return () => window.removeEventListener(PASSKEYS_CHANGED, load);
  }, [load]);

  const changed = () => {
    load();
    onChange?.();
  };

  const add = async () => {
    setBusy(true);
    try {
      await api.addPasskey();
      toast('Passkey saved. Next time, sign in with a glance or a touch.', { tone: 'success' });
      changed();
    } catch (e) {
      if (!isApiError(e, 'cancelled')) toast(errorMessage(e), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const rename = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      await api.renamePasskey(editing.id, editing.name);
      setEditing(null);
      changed();
    } catch (err) {
      toast(errorMessage(err), { tone: 'error' });
    }
  };

  const remove = async (p: Passkey) => {
    if (!window.confirm(`Remove “${p.name}”? You will not be able to sign in with it any more.`)) return;
    try {
      await api.removePasskey(p.id);
      toast(`${p.name} is removed`, { tone: 'success' });
      changed();
    } catch (e) {
      toast(errorMessage(e), { tone: 'error' });
    }
  };

  return (
    <section className="panel" aria-labelledby="s-passkeys">
      <h2 id="s-passkeys" className="panel__title">Passkeys</h2>
      <p className="muted panel__hint">
        Sign in with Face ID, Touch ID or your device PIN instead of your password. A passkey is saved in your iCloud Keychain or password manager, so it works on
        your other devices too, and nobody can trick you into giving it away.
      </p>
      {list === null ? (
        <div className="passkey-list" aria-busy="true">
          <Skeleton lines={2} label="Loading passkeys" />
        </div>
      ) : list.length === 0 ? null : (
        <ul className="passkey-list stagger">
          {list.map((p) => (
            <li key={p.id} className="passkey-row">
              <span className="passkey-row__icon">
                <PasskeyIcon size={20} />
              </span>
              {editing?.id === p.id ? (
                <form className="passkey-row__edit" onSubmit={rename}>
                  <input
                    className="input"
                    aria-label="Passkey name"
                    value={editing.name}
                    maxLength={80}
                    autoFocus
                    onChange={(e) => setEditing({ id: p.id, name: e.target.value })}
                  />
                  <button type="submit" className="elum-btn elum-btn--primary elum-btn--sm" disabled={!editing.name.trim()}>
                    Save
                  </button>
                  <button type="button" className="elum-btn elum-btn--quiet elum-btn--sm" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="passkey-row__text">
                    <span className="passkey-row__name">{p.name}</span>
                    <span className="passkey-row__meta" title={formatFull(p.lastUsedAt ?? p.createdAt)}>
                      {p.lastUsedAt ? `Last used ${formatWhen(p.lastUsedAt).toLowerCase()}` : `Added ${formatWhen(p.createdAt).toLowerCase()}`}
                    </span>
                  </span>
                  <span className="passkey-row__actions">
                    <button type="button" className="elum-btn elum-btn--quiet elum-btn--sm" onClick={() => setEditing({ id: p.id, name: p.name })}>
                      Rename
                    </button>
                    <button type="button" className="elum-btn elum-btn--secondary elum-btn--sm" onClick={() => void remove(p)}>
                      Remove
                    </button>
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="panel__actions">
        {supported ? (
          <button type="button" className="elum-btn elum-btn--primary" disabled={busy} onClick={() => void add()}>
            <PasskeyIcon size={18} />
            {list?.length ? 'Add another passkey' : 'Create a passkey'}
          </button>
        ) : (
          <p className="muted panel__hint">This browser cannot make passkeys. Try Safari, Chrome, Edge or Firefox on a recent device.</p>
        )}
      </div>
    </section>
  );
}
