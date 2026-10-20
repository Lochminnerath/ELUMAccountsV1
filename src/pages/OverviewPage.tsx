import { ArrowRight } from 'lucide-react';
import { VerifiedIcon } from '../components/icons/ElumIcons';
import { Link } from 'react-router';
import { useAccount } from '../auth/AuthProvider';
import { AppRing, RING_APPS } from '../components/AppRing';
import { Avatar } from '../components/Avatar';
import { ProductGlyph } from '../components/Brand';
import { APPS, type AppId } from '../lib/apps';
import { AUDIENCE_LABEL } from './PrivacyPage';
import './pages.css';

/** Who you are across ELUM, at a glance, with the way to each part (handoff 3.8). */
export function OverviewPage() {
  const a = useAccount();
  const typeAddress = a.addresses.find((x) => x.kind === 'type')?.address;
  const known = a.circles.friends + a.circles.family + a.circles.work;
  // The apps in the account light up their colour around the picture.
  const has = new Set(a.services.filter((s) => s.joined).map((s) => s.id));
  const missing = RING_APPS.filter((app) => !has.has(app.id)).length;
  return (
    <>
      <header className="hero">
        <AppRing has={has} size={88}>
          <Avatar user={a} size={88} />
        </AppRing>
        <div>
          <h1 className="hero__name">{a.name}</h1>
          <p className="hero__address">
            {typeAddress ?? a.email}
            {typeAddress && <VerifiedIcon size={16} strokeWidth={2} aria-label="ELUM address" />}
          </p>
          <p className="muted">One account for Write, Type and every ELUM app.</p>
          <p className="hero__ring-note">
            {missing === 0 ? (
              'Every ELUM app is in your account.'
            ) : (
              <>
                {RING_APPS.length - missing} of {RING_APPS.length} ELUM apps in your account.{' '}
                <a href="/go/store">Get more in Store</a>
              </>
            )}
          </p>
        </div>
      </header>

      <div className="cards">
        <Link to="/profile" className="card-link">
          <span className="card-link__title">Profile</span>
          <span className="card-link__body">{a.pictureUrl ? 'Picture, name and colour' : 'Add a picture'} · {a.locale ?? 'Language not set'}</span>
          <ArrowRight className="card-link__arrow" size={18} strokeWidth={1.75} />
        </Link>
        <Link to="/people" className="card-link">
          <span className="card-link__title">People</span>
          <span className="card-link__body">
            {a.circles.friends} friends · {a.circles.family} family · {a.circles.work} work{a.circles.blocked ? ` · ${a.circles.blocked} blocked` : ''}
          </span>
          <ArrowRight className="card-link__arrow" size={18} strokeWidth={1.75} />
        </Link>
        <Link to="/privacy" className="card-link">
          <span className="card-link__title">Privacy</span>
          <span className="card-link__body">
            Picture: {AUDIENCE_LABEL[a.privacy.picture].toLowerCase()} · Messages: {AUDIENCE_LABEL[a.privacy.messages].toLowerCase()}
          </span>
          <ArrowRight className="card-link__arrow" size={18} strokeWidth={1.75} />
        </Link>
        <Link to="/addresses" className="card-link">
          <span className="card-link__title">Addresses</span>
          <span className="card-link__body">
            {a.addresses.length} {a.addresses.length === 1 ? 'address' : 'addresses'}
            {a.pendingAddresses.length ? ` · ${a.pendingAddresses.length} waiting for a code` : ''}
          </span>
          <ArrowRight className="card-link__arrow" size={18} strokeWidth={1.75} />
        </Link>
        <Link to="/security" className="card-link">
          <span className="card-link__title">Security</span>
          <span className="card-link__body">Password, signed-in devices, recent activity</span>
          <ArrowRight className="card-link__arrow" size={18} strokeWidth={1.75} />
        </Link>
        <Link to="/notifications" className="card-link">
          <span className="card-link__title">Notifications</span>
          <span className="card-link__body">What reaches you, in the apps and outside them</span>
          <ArrowRight className="card-link__arrow" size={18} strokeWidth={1.75} />
        </Link>
      </div>

      <section className="panel" aria-labelledby="apps">
        <h2 id="apps" className="panel__title">Your ELUM apps</h2>
        <ul className="apps">
          {a.services.map((s) => {
            const app = APPS[s.id as AppId];
            const open = app?.url && (s.status === 'active' || s.status === 'beta');
            return (
              <li key={s.id} className="apps__item" data-planned={!open || undefined}>
                <span className="switcher__glyph">
                  <ProductGlyph product={s.id as 'write'} size={22} />
                </span>
                <span className="apps__text">
                  <span className="apps__name">{s.name}</span>
                  <span className="apps__note">{open ? (s.joined ? 'In your account' : 'Not added yet') : 'Coming soon'}</span>
                </span>
                {open && (
                  <a className="elum-btn elum-btn--secondary elum-btn--sm" href={`/go/${s.id}`}>
                    Open
                  </a>
                )}
              </li>
            );
          })}
        </ul>
        {known === 0 && <p className="muted panel__hint">Tip: add the people you work and live with under People, then choose who may reach you.</p>}
      </section>
    </>
  );
}
