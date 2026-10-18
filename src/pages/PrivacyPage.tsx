import { useState } from 'react';
import { api, errorMessage, type Audience, type Privacy } from '../api';
import { useAccount, useAuth } from '../auth/AuthProvider';
import { useToast } from '../components/Toast';
import './pages.css';

export const AUDIENCE_LABEL: Record<Audience, string> = {
  everyone: 'Everyone',
  known: 'People you know',
  close: 'Friends and family',
  family: 'Family only',
  nobody: 'Nobody',
};

const AUDIENCE_HINT: Record<Audience, string> = {
  everyone: 'Anyone with an ELUM account, including Unknown people.',
  known: 'Your Friends, Family and Work.',
  close: 'Your Friends and Family.',
  family: 'Only the people in Family.',
  nobody: 'No one but you.',
};

const ROWS: { key: keyof Privacy; title: string; body: string }[] = [
  { key: 'picture', title: 'Who can see your picture', body: 'Everyone else sees your initials.' },
  { key: 'findable', title: 'Who can find you by name', body: 'In Write sharing, Type contacts and people search. Anyone who already has your address can still write to it.' },
  { key: 'messages', title: 'Who can message you in Type', body: 'Messages from anyone else are not delivered. Email from outside ELUM follows Type’s spam rules.' },
];

/** Who may see, find and reach you. Blocked people never may (handoff 11: who can find whom). */
export function PrivacyPage() {
  const account = useAccount();
  const { setAccount } = useAuth();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const change = async (key: keyof Privacy, value: Audience) => {
    setError(null);
    try {
      const privacy = await api.setPrivacy({ [key]: value });
      setAccount({ ...account, privacy });
      toast('Saved', { tone: 'success' });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <>
      <header className="page__head">
        <h1 className="page__title">Privacy</h1>
        <p className="muted">
          People are Friends, Family, Work or Blocked when you put them there under People. Everyone else is Unknown. These choices hold in every ELUM app.
        </p>
      </header>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {ROWS.map((row) => (
        <section key={row.key} className="panel" aria-labelledby={`pr-${row.key}`}>
          <h2 id={`pr-${row.key}`} className="panel__title">
            {row.title}
          </h2>
          <p className="muted panel__hint">{row.body}</p>
          <div className="audiences" role="radiogroup" aria-labelledby={`pr-${row.key}`}>
            {(Object.keys(AUDIENCE_LABEL) as Audience[]).map((a) => (
              <label key={a} className="audience" data-checked={account.privacy[row.key] === a || undefined}>
                <input type="radio" name={row.key} value={a} checked={account.privacy[row.key] === a} onChange={() => void change(row.key, a)} />
                <span className="audience__title">{AUDIENCE_LABEL[a]}</span>
                <span className="audience__hint">{AUDIENCE_HINT[a]}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
