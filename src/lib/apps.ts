/**
 * Where every ELUM app lives. Each is its own site (elum<app>.netlify.app today), so they cannot
 * share a sign-in cookie; Accounts signs people in to the others with a one-time handoff.
 */
const env = import.meta.env;
const clean = (v: string | undefined, fallback: string) => (v?.trim() || fallback).replace(/\/+$/, '');

export const APPS = {
  write: { name: 'Write', url: clean(env.VITE_ELUM_WRITE_URL, 'https://elumwrite.netlify.app'), note: 'Documents' },
  type: { name: 'Type', url: clean(env.VITE_ELUM_TYPE_URL, 'https://elumtype.netlify.app'), note: 'Messages and email' },
  browse: { name: 'Browse', url: clean(env.VITE_ELUM_BROWSE_URL, 'https://elumbrowse.netlify.app'), note: 'Search the web' },
  make: { name: 'Make', url: clean(env.VITE_ELUM_MAKE_URL, 'https://elummake.netlify.app'), note: 'Slides and posts' },
  store: { name: 'Store', url: clean(env.VITE_ELUM_STORE_URL, 'https://elumstore.netlify.app'), note: 'Apps and more' },
  inquire: { name: 'Inquire', url: clean(env.VITE_ELUM_INQUIRE_URL, 'https://inquire.elum.services'), note: 'Forms' },
} as const;

/** The ELUM home, the public front door. It is not an app you sign in to, so it opens plainly. */
export const HOME_URL = clean(env.VITE_ELUM_HOME_URL, 'https://elum.services');
export type AppId = keyof typeof APPS;

/** The ELUM app whose /auth/handoff page this is, or null when `to` is not one of them. */
export function appFor(to: string): { id: AppId; name: string } | null {
  try {
    const origin = new URL(to).origin;
    for (const [id, app] of Object.entries(APPS)) if (app.url && new URL(app.url).origin === origin) return { id: id as AppId, name: app.name };
  } catch {
    // Not a URL.
  }
  return null;
}
