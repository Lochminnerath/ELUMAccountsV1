import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api';
import { APPS } from '../lib/apps';
import { ELUM_APPS } from '../lib/platform';
import { Launcher } from './Launcher';

/**
 * The ELUM launcher for ELUM Account. Apps open through /go, which signs you in to them; apps not
 * on this account yet open their page in ELUM Store.
 */
export function ElumLauncher() {
  const navigate = useNavigate();
  const [added, setAdded] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    api.elumApps?.().then(
      (apps) => live && setAdded(apps),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);
  const apps = ELUM_APPS.map((a) => (a.id === 'account' ? { ...a, url: '/' } : a));
  return (
    <Launcher
      apps={apps}
      current="account"
      added={added}
      onOpen={(url) => {
        const app = Object.entries(APPS).find(([, a]) => a.url === url)?.[0];
        if (app) navigate(`/go/${app}`);
        else window.location.assign(url);
      }}
    />
  );
}
