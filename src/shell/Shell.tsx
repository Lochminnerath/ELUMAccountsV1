import { Bell, CircleUser, House, KeyRound, LogOut, Mail, Megaphone, Moon, ShieldCheck, Sun, Trash2, Users, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router';
import { api } from '../api';
import { useAccount, useAuth } from '../auth/AuthProvider';
import { Avatar } from '../components/Avatar';
import { AccountLockup, AccountMark } from '../components/Brand';
import { Menu } from '../components/Menu';
import { useTheme } from '../theme/ThemeProvider';
import { ThemeToggle } from '../theme/ThemeToggle';
import { openWhatsNew } from '../whatsnew/WhatsNew';
import './shell.css';
import { ElumLauncher } from '../components/ElumLauncher';

const SECTIONS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Overview', icon: House },
  { to: '/profile', label: 'Profile', icon: CircleUser },
  { to: '/people', label: 'People', icon: Users },
  { to: '/privacy', label: 'Privacy', icon: ShieldCheck },
  { to: '/addresses', label: 'Addresses', icon: Mail },
  { to: '/security', label: 'Security', icon: KeyRound },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/delete', label: 'Delete account', icon: Trash2 },
];

/** The frame of every account page: app bar, section list, and the page (handoff 3.8). */
export function Shell({ children }: { children: ReactNode }) {
  const account = useAccount();
  const { signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-bar">
        <NavLink to="/" className="app-bar__brand" aria-label="ELUM Account, overview">
          <span className="app-bar__lockup">
            <AccountLockup height={28} />
          </span>
          <span className="app-bar__mark">
            <AccountMark size={30} />
          </span>
        </NavLink>
        <div className="app-bar__end">
          <ElumLauncher />
          <ThemeToggle />
          <Menu
            label="Account"
            placement="bottom-end"
            header={
              <div className="user-menu__header">
                <Avatar user={account} size={40} />
                <div>
                  <div className="user-menu__name">{account.name}</div>
                  <div className="user-menu__email">{account.email}</div>
                </div>
              </div>
            }
            items={[
              { label: theme === 'dark' ? 'Light mode' : 'Dark mode', icon: theme === 'dark' ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />, onSelect: toggle },
              { label: "What's new", icon: <Megaphone size={16} strokeWidth={1.75} />, onSelect: openWhatsNew },
              'separator',
              {
                label: 'Sign out',
                hint: api.mode === 'remote' ? 'On this device' : undefined,
                icon: <LogOut size={16} strokeWidth={1.75} />,
                onSelect: async () => {
                  await signOut();
                  navigate('/signin', { replace: true });
                },
              },
            ]}
            trigger={(props) => (
              <button type="button" className="user-menu__trigger" aria-label={`Account: ${account.name}`} {...props}>
                <Avatar user={account} size={34} />
              </button>
            )}
          />
        </div>
      </header>

      <nav className="sections" aria-label="Your account">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const active = s.to === '/' ? location.pathname === '/' : location.pathname.startsWith(s.to);
          return (
            <NavLink key={s.to} to={s.to} className="sections__item" data-active={active || undefined} data-danger={s.to === '/delete' || undefined} aria-current={active ? 'page' : undefined}>
              <Icon size={18} strokeWidth={1.75} />
              <span>{s.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <main id="main" className="shell__main">
        <div className="page">{children}</div>
      </main>
    </div>
  );
}
