import { useEffect, useRef, useState } from 'react';
import { api, errorMessage, isApiError } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../components/Toast';
import { notNowFor, passkeysSupported, saveNotNow, shouldOfferPasskey } from './passkeys';
import { PasskeyIcon } from './PasskeyIcon';
import './Passkeys.css';

export const PASSKEYS_CHANGED = 'elum:passkeys-changed';

/**
 * After a sign-in with a password or an email link, suggests making a passkey: every sign-in until
 * there is one. "Not now" hides it for this sign-in only.
 */
export function PasskeyOffer() {
  const { status } = useAuth();
  const toast = useToast();
  const [signInId, setSignInId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (status !== 'signed-in' || !passkeysSupported()) return;
    let live = true;
    let timer = 0;
    void Promise.all([api.security(), api.signInId()]).then(
      ([security, id]) => {
        if (!live || !shouldOfferPasskey({ supported: true, hasPasskey: security.hasPasskey, signInId: id, notNowFor: notNowFor() })) return;
        setSignInId(id);
        // Wait for any other window (What's new, an approval) to close first.
        const show = () => {
          if (!live) return;
          if (document.querySelector('dialog[open]')) timer = window.setTimeout(show, 1500);
          else setOpen(true);
        };
        timer = window.setTimeout(show, 900);
      },
      () => undefined,
    );
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [status]);

  useEffect(() => {
    const dialog = ref.current;
    if (open && dialog && !dialog.open) dialog.showModal();
  }, [open]);

  const notNow = () => {
    if (signInId) saveNotNow(signInId);
    setOpen(false);
  };

  const create = async () => {
    setBusy(true);
    try {
      await api.addPasskey();
      setOpen(false);
      window.dispatchEvent(new Event(PASSKEYS_CHANGED));
      toast('Passkey saved. Next time, sign in with a glance or a touch.', { tone: 'success' });
    } catch (e) {
      if (!isApiError(e, 'cancelled')) toast(errorMessage(e), { tone: 'error' });
    } finally {
      setBusy(false);
    }
  };

  if (!open || status !== 'signed-in') return null;
  return (
    <dialog
      ref={ref}
      className="passkey-offer"
      aria-labelledby="passkey-offer-title"
      aria-describedby="passkey-offer-text"
      onCancel={(e) => {
        e.preventDefault();
        notNow();
      }}
    >
      <div className="passkey-offer__art" aria-hidden="true">
        <span className="passkey-offer__halo" />
        <span className="passkey-offer__disc">
          <PasskeyIcon size={40} />
        </span>
      </div>
      <h2 id="passkey-offer-title" className="passkey-offer__title">
        Sign in faster with a passkey
      </h2>
      <p id="passkey-offer-text" className="passkey-offer__text">
        Use Face ID, Touch ID or your device PIN. It's saved in your iCloud Keychain or password manager, so it works on your other devices too.
      </p>
      <ul className="passkey-offer__points">
        <li>No password to type or forget</li>
        <li>Nobody can trick you into giving it away</li>
      </ul>
      <div className="passkey-offer__actions">
        <button type="button" className="elum-btn elum-btn--primary elum-btn--block" disabled={busy} onClick={() => void create()} autoFocus>
          Create a passkey
        </button>
        <button type="button" className="elum-btn elum-btn--quiet elum-btn--block" disabled={busy} onClick={notNow}>
          Not now
        </button>
      </div>
    </dialog>
  );
}
