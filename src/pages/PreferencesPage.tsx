import { useEffect, useState } from 'react';
import { api, errorMessage, type Preferences } from '../api';
import { Loader } from '../components/Loader';
import { useToast } from '../components/Toast';
import { applyPreferences } from '../lib/preferences';
import './pages.css';

type Choice<K extends keyof Preferences> = { value: Preferences[K]; label: string; note?: string };

const TIME: Choice<'timeFormat'>[] = [
  { value: 'auto', label: 'Like my language' },
  { value: '12h', label: '12 hour', note: '3:42 PM' },
  { value: '24h', label: '24 hour', note: '15:42' },
];
const START: Choice<'startApp'>[] = [
  { value: 'account', label: 'ELUM Account' },
  { value: 'write', label: 'Write' },
  { value: 'type', label: 'Type' },
  { value: 'make', label: 'Make' },
];
const MOTION: Choice<'motion'>[] = [
  { value: 'system', label: 'Like my device' },
  { value: 'reduce', label: 'Less motion', note: 'No sliding or bouncing' },
  { value: 'full', label: 'Full motion' },
];

/** How ELUM looks and behaves for you: clock, where to start, motion. */
export function PreferencesPage() {
  const toast = useToast();
  const [prefs, setPrefs] = useState<Preferences | null>(null);

  useEffect(() => {
    api.preferences().then(setPrefs, (e) => toast(errorMessage(e), { tone: 'error' }));
  }, [toast]);

  const change = async (next: Partial<Preferences>) => {
    if (!prefs) return;
    const before = prefs;
    setPrefs({ ...prefs, ...next });
    try {
      const saved = await api.setPreferences(next);
      setPrefs(saved);
      applyPreferences(saved);
    } catch (e) {
      setPrefs(before);
      toast(errorMessage(e), { tone: 'error' });
    }
  };

  const group = <K extends keyof Preferences>(key: K, title: string, hint: string, choices: Choice<K>[]) => (
    <section className="panel" aria-labelledby={`pf-${key}`}>
      <h2 id={`pf-${key}`} className="panel__title">
        {title}
      </h2>
      <p className="muted panel__hint">{hint}</p>
      <div className="audiences" role="radiogroup" aria-labelledby={`pf-${key}`}>
        {choices.map((c) => (
          <label key={c.value} className="audience" data-checked={prefs?.[key] === c.value || undefined}>
            <input type="radio" name={key} value={c.value} checked={prefs?.[key] === c.value} onChange={() => void change({ [key]: c.value } as Partial<Preferences>)} />
            <span className="audience__title">{c.label}</span>
            {c.note && <span className="audience__hint">{c.note}</span>}
          </label>
        ))}
      </div>
    </section>
  );

  return (
    <>
      <header className="page__head">
        <h1 className="page__title">Preferences</h1>
        <p className="muted">How ELUM looks and behaves for you, on every device you sign in to.</p>
      </header>
      {!prefs ? (
        <Loader size={28} label="Loading preferences" />
      ) : (
        <>
          {group('startApp', 'Open after signing in', 'Where signing in here takes you, when you did not come from an app.', START)}
          {group('timeFormat', 'Clock', 'How times show in your account, such as when a device was last active.', TIME)}
          {group('motion', 'Motion', 'Animations in your account, such as panels sliding in.', MOTION)}
        </>
      )}
    </>
  );
}
