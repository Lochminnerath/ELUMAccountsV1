import { useNavigate } from 'react-router';
import { APPS } from '../lib/apps';
import { Launcher, type LauncherApp } from './Launcher';

/** The ELUM launcher for ELUM Account. Apps open through /go, which signs you in to them. */
const LAUNCHER_APPS: LauncherApp[] = [
  { id: 'write', name: 'Write', note: 'Documents', url: APPS.write.url, color: '#f59a52' },
  { id: 'type', name: 'Type', note: 'Mail', url: APPS.type.url, color: '#3fc4a0' },
  { id: 'make', name: 'Make', note: 'Slides and posts', url: APPS.make.url, color: '#ec7fa9' },
  { id: 'account', name: 'Account', note: 'You, everywhere', url: '/', color: '#94c858' },
  { id: 'browse', name: 'Browse', note: 'Search', url: null, color: '#9b84ee' },
  { id: 'store', name: 'Store', note: 'Apps and more', url: null, color: '#e9b949' },
];

export function ElumLauncher() {
  const navigate = useNavigate();
  return <Launcher apps={LAUNCHER_APPS} current="account" onOpen={(app) => navigate(`/go/${app.id}`)} />;
}
