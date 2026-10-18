import { useEffect, useState } from 'react';
import { api, errorMessage, type NotificationSetting } from '../api';
import { useAccount } from '../auth/AuthProvider';
import { ProductGlyph } from '../components/Brand';
import { Loader } from '../components/Loader';
import { useToast } from '../components/Toast';
import './pages.css';

/** For each kind of notification: in the apps' bell, and by email or Type (handoff 3.8). */
export function NotificationsPage() {
  const account = useAccount();
  const toast = useToast();
  const [list, setList] = useState<NotificationSetting[] | null>(null);
  const outside = account.accountType === 'type' ? 'In your Type inbox' : `By email to ${account.email}`;

  useEffect(() => {
    api.notificationSettings().then(setList, (e) => toast(errorMessage(e), { tone: 'error' }));
  }, [toast]);

  const set = async (n: NotificationSetting, change: Partial<Pick<NotificationSetting, 'inApp' | 'outside'>>) => {
    const next = { ...n, ...change };
    setList((l) => l?.map((x) => (x.type === n.type ? next : x)) ?? null);
    try {
      await api.setNotification(n.type, next.inApp, next.outside);
    } catch (e) {
      setList((l) => l?.map((x) => (x.type === n.type ? n : x)) ?? null);
      toast(errorMessage(e), { tone: 'error' });
    }
  };

  return (
    <>
      <header className="page__head">
        <h1 className="page__title">Notifications</h1>
        <p className="muted">The bell in every ELUM app shows these. Choose which also reach you outside the apps.</p>
      </header>
      {list === null ? (
        <Loader size={32} label="Loading" />
      ) : (
        <div className="panel">
          <div className="notice-table" role="table" aria-label="Notifications">
            <div className="notice-table__head" role="row">
              <span role="columnheader">Notification</span>
              <span role="columnheader">In the apps</span>
              <span role="columnheader">{outside}</span>
            </div>
            {list.map((n) => (
              <div key={n.type} className="notice-table__row" role="row">
                <span role="cell" className="notice-table__what">
                  <ProductGlyph product={n.service as 'write'} size={18} />
                  <span>
                    <span className="notice-table__desc">{n.description.split('. Payload')[0].replace(/\.$/, '')}</span>
                    <span className="muted notice-table__service">{n.serviceName}</span>
                  </span>
                </span>
                <span role="cell">
                  <input type="checkbox" className="switch" role="switch" aria-label={`${n.description} in the apps`} checked={n.inApp} onChange={(e) => void set(n, { inApp: e.target.checked })} />
                </span>
                <span role="cell">
                  <input type="checkbox" className="switch" role="switch" aria-label={`${n.description}: ${outside}`} checked={n.outside} onChange={(e) => void set(n, { outside: e.target.checked })} />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
