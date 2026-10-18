/**
 * What changed in ELUM Account, newest first. Add a release at the top whenever an update ships: people
 * see it once, the next time they open ELUM Account, and can read every release again from the account
 * menu (What's new). Give each release a new id; the date is shown as written.
 */

export interface Release {
  /** Unique and never reused, such as 2026-10-18. */
  id: string;
  date: string;
  title: string;
  items: string[];
}

export const RELEASES: Release[] = [
  {
    id: '2026-10-18',
    date: '18 October 2026',
    title: "ELUM Account is live",
    items: [
      "One account for Write, Type and Make, kept safely in ELUM.",
      "Your profile, picture, password, people, privacy and notifications in one place.",
      "Sign in once here and you are signed in to every ELUM app.",
      "Clearer messages when signing up or signing in goes wrong.",
      "This What’s new panel, so you always know what changed.",
    ],
  },
];

/** The releases someone has not seen yet, given the last one they saw. New visitors see the latest. */
export function unseenReleases(releases: Release[], lastSeen: string | null): Release[] {
  if (!releases.length) return [];
  const at = lastSeen ? releases.findIndex((r) => r.id === lastSeen) : -1;
  return at === -1 ? releases.slice(0, 1) : releases.slice(0, at);
}
