import type { Art } from './scenes';

/**
 * What changed in ELUM Account, newest first. Add a release at the top whenever an update ships: people
 * get a short animated tour of it the next time they open ELUM Account, and can replay every release
 * from the account menu (What's new). Give each release a new id; the date is shown as written.
 *
 * Each feature is one step of the tour. `art` picks its animated picture (see scenes.tsx):
 * mark, share, devices, layers, check or spark.
 */

export interface Feature {
  title: string;
  text: string;
  art: Art;
}

export interface Release {
  /** Unique and never reused, such as 2026-10-18. */
  id: string;
  date: string;
  title: string;
  /** One or two sentences under the title on the opening step. */
  intro: string;
  features: Feature[];
}

export const APP_NAME = 'ELUM Account';

export const RELEASES: Release[] = [
  {
    id: '2026-10-19',
    date: '19 October 2026',
    title: "A fresh coat for ELUM Account",
    intro: "Small touches that make your account feel at home with the rest of ELUM.",
    features: [
      {
        title: 'Move between apps',
        text: 'Open the ELUM apps window from the dots at the top of the page, and jump to Write, Type, Make or your account in one click.',
        art: 'spark',
      },
      {
        title: "The right icon, everywhere",
        text: "Browsers now show the ELUM Account icon in your tabs and bookmarks, matching Write, Type and Make.",
        art: 'mark',
      },
      {
        title: "Updates, told properly",
        text: "This tour. You will see one like it after each update, and can replay them any time from your account menu.",
        art: 'spark',
      },
    ],
  },
  {
    id: '2026-10-18',
    date: '18 October 2026',
    title: "ELUM Account is live",
    intro: "One place for everything about you, across every ELUM app.",
    features: [
      {
        title: "One account, every app",
        text: "Write, Type and Make all use the same ELUM account, on every device you sign in to.",
        art: 'devices',
      },
      {
        title: "All of you in one place",
        text: "Your profile, picture, password, people, privacy and notifications live here.",
        art: 'layers',
      },
      {
        title: "Sign in once",
        text: "Sign in here and you are signed in to every ELUM app.",
        art: 'check',
      },
      {
        title: "You choose who sees what",
        text: "Decide who may see your picture, find you and message you: everyone, people you know, or no one.",
        art: 'share',
      },
    ],
  },
];

/** The releases someone has not seen yet, given the last one they saw. New visitors see the latest. */
export function unseenReleases(releases: Release[], lastSeen: string | null): Release[] {
  if (!releases.length) return [];
  const at = lastSeen ? releases.findIndex((r) => r.id === lastSeen) : -1;
  return at === -1 ? releases.slice(0, 1) : releases.slice(0, at);
}

export interface Step {
  key: string;
  eyebrow: string;
  title: string;
  text: string;
  art: Art;
}

/** The tour for some releases: each opens with its title, then one step per feature. */
export function tourSteps(releases: Release[]): Step[] {
  return releases.flatMap((r) => [
    { key: `${r.id}:intro`, eyebrow: `New in ${APP_NAME} · ${r.date}`, title: r.title, text: r.intro, art: 'mark' as const },
    ...r.features.map((f, i) => ({ key: `${r.id}:${i}`, eyebrow: r.title, title: f.title, text: f.text, art: f.art })),
  ]);
}
