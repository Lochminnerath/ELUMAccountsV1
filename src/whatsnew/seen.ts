import type { SupabaseClient } from '@supabase/supabase-js';
import type { Release } from './releases';

/**
 * Which release someone saw last, kept on their account (Supabase Auth user metadata) so a new
 * browser, device or preview does not show it again, with this browser's storage as a cache.
 * The same file works in every ELUM app: only APP_KEY changes.
 */

export const APP_KEY = 'account';
/** Flat, because user metadata merges top-level keys only. */
export const METADATA_KEY = `whatsnew_${APP_KEY}`;
const CACHE_KEY = `elum.${APP_KEY}.whats-new`;

/**
 * What to do given the last release seen. Nothing recorded (a new account, or one that never saw
 * a tour): record the latest quietly and show nothing. Otherwise show every newer release.
 */
export function whatsNewPlan(releases: Release[], lastSeen: string | null | undefined): { show: Release[]; record: string | null } {
  const latest = releases[0]?.id;
  if (!latest) return { show: [], record: null };
  if (!lastSeen) return { show: [], record: latest };
  const at = releases.findIndex((r) => r.id === lastSeen);
  if (at >= 0) return { show: releases.slice(0, at), record: null };
  // Unknown: seen in a newer version of the app (ids start with the date), or long gone.
  return { show: [], record: lastSeen > latest ? null : latest };
}

export interface SeenStore {
  read(): Promise<string | null>;
  write(id: string): Promise<void>;
}

function cached(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

/** The account's record when signed in to Supabase, else this browser's. */
export function seenStore(sb: SupabaseClient | null): SeenStore {
  return {
    async read() {
      if (sb) {
        const { data } = await sb.auth.getUser().catch(() => ({ data: { user: null } }));
        const value = data.user?.user_metadata?.[METADATA_KEY];
        if (typeof value === 'string' && value) return value;
      }
      return cached();
    },
    async write(id) {
      try {
        localStorage.setItem(CACHE_KEY, id);
      } catch {
        // The account keeps it anyway.
      }
      if (sb) await sb.auth.updateUser({ data: { [METADATA_KEY]: id } }).catch(() => undefined);
    },
  };
}
