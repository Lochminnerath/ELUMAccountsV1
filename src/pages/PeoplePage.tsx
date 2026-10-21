import { Search } from 'lucide-react';
import { RemovePersonIcon } from '../components/icons/ElumIcons';
import { InviteIcon } from '../components/icons/ElumIcons';
import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage, type Circle, type Person } from '../api';
import { useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { AccountMark } from '../components/Brand';
import { Loader } from '../components/Loader';
import { Menu } from '../components/Menu';
import { useToast } from '../components/Toast';
import './pages.css';

export const CIRCLES: { id: Circle; label: string; hint: string }[] = [
  { id: 'friends', label: 'Friends', hint: 'People you are close to.' },
  { id: 'family', label: 'Family', hint: 'The people you live with and grew up with.' },
  { id: 'work', label: 'Work', hint: 'Colleagues and the people you work with.' },
  { id: 'blocked', label: 'Blocked', hint: 'They cannot find you, see your picture or message you.' },
];

type Tab = Circle | 'all';

/** Your circles: Friends, Family, Work and Blocked. Everyone else is Unknown. */
export function PeoplePage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('all');
  const [people, setPeople] = useState<Person[] | null>(null);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setPeople(await api.people(tab === 'all' ? undefined : tab));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setFound([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      api.findPeople(query).then(
        (list) => !cancelled && setFound(list),
        () => undefined,
      );
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query]);

  const put = async (p: Person, circle: Circle | null) => {
    try {
      await api.setCircle(p.id, circle);
      toast(circle ? `${p.name} is in ${CIRCLES.find((c) => c.id === circle)!.label}` : `${p.name} is Unknown again`, { tone: 'success' });
      setFound((list) => list.map((x) => (x.id === p.id ? { ...x, circle } : x)));
      await Promise.all([load(), refresh()]);
    } catch (e) {
      toast(errorMessage(e), { tone: 'error' });
    }
  };

  const circleMenu = (p: Person) => (
    <Menu
      label={`Circle for ${p.name}`}
      placement="bottom-end"
      items={[
        ...CIRCLES.map((c) => ({ label: c.label, hint: c.hint, checked: p.circle === c.id, danger: c.id === 'blocked', onSelect: () => void put(p, c.id) })),
        ...(p.circle ? ['separator' as const, { label: 'Remove from circles', hint: 'They become Unknown', icon: <RemovePersonIcon size={16} strokeWidth={1.75} />, onSelect: () => void put(p, null) }] : []),
      ]}
      trigger={(props) => (
        <button type="button" className={p.circle ? 'chip chip--circle' : 'elum-btn elum-btn--secondary elum-btn--sm'} data-circle={p.circle ?? undefined} {...props}>
          {p.circle ? CIRCLES.find((c) => c.id === p.circle)!.label : (
            <>
              <InviteIcon size={16} strokeWidth={1.75} /> Add
            </>
          )}
        </button>
      )}
    />
  );

  const row = (p: Person) => (
    <li key={p.id} className="person-row">
      <Avatar user={p} size={44} />
      <span className="person-row__text">
        <span className="person-row__name">{p.name}</span>
        <span className="person-row__address">{p.address}</span>
      </span>
      {circleMenu(p)}
    </li>
  );

  return (
    <>
      <header className="page__head">
        <h1 className="page__title">People</h1>
        <p className="muted">Put people in circles, then choose under Privacy who may see your picture, find you and message you. Anyone not in a circle is Unknown.</p>
      </header>

      <section className="panel" aria-labelledby="pp-add">
        <h2 id="pp-add" className="panel__title">Add someone</h2>
        <div className="search-field">
          <Search size={18} strokeWidth={1.75} aria-hidden="true" />
          <input className="input" type="search" placeholder="Name or address" aria-label="Find people on ELUM" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {query.trim().length >= 2 && (
          <ul className="person-list">
            {found.length ? found.map(row) : <li className="muted panel__hint">Nobody found. Some people only let people they know find them.</li>}
          </ul>
        )}
      </section>

      <div className="chips" role="tablist" aria-label="Circles">
        {(['all', ...CIRCLES.map((c) => c.id)] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" className="chip" aria-selected={tab === t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === 'all' ? 'Everyone in your circles' : CIRCLES.find((c) => c.id === t)!.label}
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}
      {people === null ? (
        <Loader size={32} label="Loading people" />
      ) : people.length === 0 ? (
        <div className="empty-state">
          <AccountMark size={64} />
          <h2>{tab === 'all' ? 'No one in your circles yet' : `No one in ${CIRCLES.find((c) => c.id === tab)!.label}`}</h2>
          <p>{tab === 'blocked' ? 'People you block show up here. You can unblock them any time.' : 'Search above to add people you know.'}</p>
        </div>
      ) : (
        <ul className="person-list panel">{people.map(row)}</ul>
      )}
    </>
  );
}
