/**
 * Where every ELUM app lives. Each is its own site (elum<app>.netlify.app today), so they cannot
 * share a sign-in cookie; Accounts signs people in to the others with a one-time handoff.
 */
const env = import.meta.env;
const clean = (v: string | undefined, fallback: string) => (v?.trim() || fallback).replace(/\/+$/, '');

export const APPS = {
  write: { name: 'Write', url: clean(env.VITE_ELUM_WRITE_URL, 'https://elumwrite.netlify.app'), note: 'Documents' },
  type: { name: 'Type', url: clean(env.VITE_ELUM_TYPE_URL, 'https://elumtype.netlify.app'), note: 'Messages and email' },
  browse: { name: 'Browse', url: null, note: 'Coming soon' },
  make: { name: 'Make', url: null, note: 'Coming soon' },
  store: { name: 'Store', url: null, note: 'Coming soon' },
} as const;

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
